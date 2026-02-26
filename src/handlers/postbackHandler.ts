import { pool } from "../configs/database";
import { lineClient } from "../configs/lineClient";
import { getMemberByUid } from "../repositories/memberRepository";
import { UserMetaData } from "../types/interface";
import {
  buildHhHoursPickerBubble,
  buildLeaveDaysPickerBubble,
  buildLeaveKeyPickerBubble,
  buildLeavePeriodPickerBubble,
} from "../utils/flexMessage";
import { replyFlexMessage, replyMessage } from "../utils/sendLineMsg";
import { commandDispatcher } from "./commandDispatcher";
import { executeDelete } from "./commands/deleteRequest";
import { PostbackEvent } from "@line/bot-sdk";

// Convert ISO date (2026-02-20) to bot format (20FEB26)
function isoToLeaveDate(iso: string): string {
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const [yyyy, mm, dd] = iso.split("-");
  const monthIdx = parseInt(mm) - 1;
  const yy = yyyy.slice(-2);
  return `${dd}${months[monthIdx]}${yy}`;
}

export async function handlePostbackEvent(event: PostbackEvent) {
  const replyToken = event.replyToken;
  const data = event.postback.data;

  // Parse postback data (format: "action=xxx&id=yyy")
  const params = new URLSearchParams(data);
  const action = params.get("action");
  const id = params.get("id");

  switch (action) {
    case "delete":
      if (id) {
        await executeDelete(replyToken, id);
      }
      break;

    case "cancel_delete":
      if (event.source.type !== "group") {
        await replyMessage(lineClient, replyToken, "❌ ยกเลิกการลบเรียบร้อย");
      }
      break;

    case "leave_cancel":
      if (event.source.type !== "group") {
        await replyMessage(
          lineClient,
          replyToken,
          "❌ ยกเลิกการแจ้งลาเรียบร้อย",
        );
      }
      break;

    // ── Date Picker Flow ──

    case "leave_date": {
      // User selected leave type + date from datetimepicker
      const leaveType = params.get("type")!;
      const isoDate = (event.postback.params as { date?: string })?.date;
      if (!isoDate) {
        await replyMessage(lineClient, replyToken, "⚠️ ไม่ได้เลือกวันที่");
        break;
      }
      const dateStr = isoToLeaveDate(isoDate);
      const flex = buildLeavePeriodPickerBubble(leaveType, dateStr);
      await replyFlexMessage(lineClient, replyToken, flex);
      break;
    }

    case "leave_end_date": {
      // User picked end date for multi-day leave
      const leaveTypeEnd = params.get("type")!;
      const startDate = params.get("start")!;
      const isoEndDate = (event.postback.params as { date?: string })?.date;
      if (!isoEndDate) {
        await replyMessage(lineClient, replyToken, "⚠️ ไม่ได้เลือกวันสิ้นสุด");
        break;
      }
      const endDateStr = isoToLeaveDate(isoEndDate);
      const flex = buildLeaveDaysPickerBubble(
        leaveTypeEnd,
        startDate,
        endDateStr,
      );
      await replyFlexMessage(lineClient, replyToken, flex);
      break;
    }

    case "leave_period": {
      // User selected period → route based on type
      const leaveType2 = params.get("type")!;
      const date2 = params.get("date")!;
      const period = params.get("period")!;

      if (leaveType2 === "hh") {
        // HH flow → ask for hours
        const flex = buildHhHoursPickerBubble(date2, period);
        await replyFlexMessage(lineClient, replyToken, flex);
      } else {
        // Normal leave → ask about key
        const flex = buildLeaveKeyPickerBubble(leaveType2, date2, period);
        await replyFlexMessage(lineClient, replyToken, flex);
      }
      break;
    }

    case "leave_range_days": {
      // Multi-day leave — user selected number of actual days
      const rangeType = params.get("type")!;
      const rangeDate = params.get("date")!; // e.g. "20FEB26-24FEB26"
      const rangePeriod = params.get("period")!; // e.g. "3วัน"

      if (rangeType === "hh") {
        const flex = buildHhHoursPickerBubble(rangeDate, rangePeriod);
        await replyFlexMessage(lineClient, replyToken, flex);
      } else {
        const flex = buildLeaveKeyPickerBubble(
          rangeType,
          rangeDate,
          rangePeriod,
        );
        await replyFlexMessage(lineClient, replyToken, flex);
      }
      break;
    }

    case "leave_confirm": {
      // User selected key → execute the leave command
      const leaveType3 = params.get("type")!;
      const date3 = params.get("date")!;
      const period3 = params.get("period")!;
      const key3 = params.get("key")!;

      // Build the command string
      const command = `แจ้งลา ${leaveType3} ${date3} ${period3} ${key3}`;
      const commandArr = command.split(" ");

      // Get user metadata
      const userId = event.source.userId;
      if (!userId) {
        await replyMessage(lineClient, replyToken, "⚠️ ไม่พบข้อมูลผู้ใช้");
        break;
      }

      const member = await getMemberByUid(pool, userId);
      if (!member) {
        await replyMessage(
          lineClient,
          replyToken,
          "⚠️ ยังไม่ได้สมัครใช้งาน กรุณาพิมพ์ สมัคร <ชื่อ>",
        );
        break;
      }

      const groupId =
        event.source.type === "group" ? (event.source as any).groupId : "";

      const userMetadata: UserMetaData = {
        replyToken,
        username: member.name,
        isAdmin: member.is_admin,
        chatType: event.source.type === "group" ? "GROUP" : "PERSONAL",
        userId,
        groupId,
      };

      await commandDispatcher(userMetadata, "แจ้งลา", commandArr, true);
      break;
    }

    case "hh_confirm": {
      // HH flow — user selected hours → execute hh ใช้ command
      const hhDate = params.get("date")!;
      const hhPeriod = params.get("period")!;
      const hhHours = params.get("hours")!;

      const hhCommand = `hh ใช้ ${hhHours}h ${hhDate} ${hhPeriod} แจ้งลาง่าย`;
      const hhCommandArr = hhCommand.split(" ");

      const hhUserId = event.source.userId;
      if (!hhUserId) {
        await replyMessage(lineClient, replyToken, "⚠️ ไม่พบข้อมูลผู้ใช้");
        break;
      }

      const hhMember = await getMemberByUid(pool, hhUserId);
      if (!hhMember) {
        await replyMessage(
          lineClient,
          replyToken,
          "⚠️ ยังไม่ได้สมัครใช้งาน กรุณาพิมพ์ สมัคร <ชื่อ>",
        );
        break;
      }

      const hhGroupId =
        event.source.type === "group" ? (event.source as any).groupId : "";

      const hhUserMeta: UserMetaData = {
        replyToken,
        username: hhMember.name,
        isAdmin: hhMember.is_admin,
        chatType: event.source.type === "group" ? "GROUP" : "PERSONAL",
        userId: hhUserId,
        groupId: hhGroupId,
      };

      await commandDispatcher(hhUserMeta, "hh", hhCommandArr, true);
      break;
    }

    default:
      console.warn(`Unknown postback action: ${action}`);
      break;
  }
}
