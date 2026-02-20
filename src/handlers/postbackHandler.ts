import { pool } from "../configs/database";
import { lineClient } from "../configs/lineClient";
import { getMemberByUid } from "../repositories/memberRepository";
import { UserMetaData } from "../types/interface";
import {
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
      await replyMessage(lineClient, replyToken, "❌ ยกเลิกการลบเรียบร้อย");
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

    case "leave_period": {
      // User selected period → ask about key
      const leaveType2 = params.get("type")!;
      const date2 = params.get("date")!;
      const period = params.get("period")!;
      const flex = buildLeaveKeyPickerBubble(leaveType2, date2, period);
      await replyFlexMessage(lineClient, replyToken, flex);
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

    default:
      console.warn(`Unknown postback action: ${action}`);
      break;
  }
}
