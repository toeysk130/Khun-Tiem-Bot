import { pool } from "../../configs/database";
import { lineClient } from "../../configs/lineClient";
import { getAllRemainingHh } from "../../repositories/happyHour";
import {
  getAllMembersSummary,
  getLeaveSummaryByMember,
} from "../../repositories/leaveScheduleRepository";
import { UserMetaData } from "../../types/interface";
import {
  buildSummaryBubble,
  buildTeamSummaryCarousel,
} from "../../utils/flexMessage";
import { replyFlexMessage, replyMessage } from "../../utils/sendLineMsg";

export async function handleSummaryCommand(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  try {
    if (commandArr.length === 1) {
      await showMySummary(userMetaData);
    } else if (commandArr[1] === "ทั้งหมด" && userMetaData.isAdmin) {
      await showAllSummary(userMetaData);
    } else {
      await replyMessage(
        lineClient,
        userMetaData.replyToken,
        `⚠️ การใช้คำสั่ง "สรุป" ไม่ถูกต้อง\nตัวอย่าง: "สรุป" หรือ "สรุป ทั้งหมด" (admin)`,
      );
    }
  } catch (error) {
    console.error("Error in summary command:", error);
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง`,
    );
  }
}

async function showMySummary(userMetaData: UserMetaData) {
  const summary = await getLeaveSummaryByMember(pool, userMetaData.username);

  if (summary.length === 0) {
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `📈 สรุปวันลาของ ${userMetaData.username}\n\nยังไม่มีรายการวันลา`,
    );
    return;
  }

  const summaryRows = summary.map((row: any) => ({
    type: row.leave_type,
    days: parseFloat(row.total_days) || 0,
    count: parseInt(row.total_requests) || 0,
  }));

  const totalDays = summaryRows.reduce((sum, r) => sum + r.days, 0);

  const flexMsg = buildSummaryBubble(
    userMetaData.username,
    summaryRows,
    totalDays,
  );
  await replyFlexMessage(lineClient, userMetaData.replyToken, flexMsg);
}

async function showAllSummary(userMetaData: UserMetaData) {
  const [allSummary, allHh] = await Promise.all([
    getAllMembersSummary(pool),
    getAllRemainingHh(pool),
  ]);

  if (allSummary.length === 0) {
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `📈 สรุปวันลาทั้งทีม\n\nยังไม่มีรายการวันลา`,
    );
    return;
  }

  // Group by member
  const memberMap: { [key: string]: { type: string; days: number }[] } = {};
  allSummary.forEach((row: any) => {
    if (!memberMap[row.member]) {
      memberMap[row.member] = [];
    }
    memberMap[row.member].push({
      type: row.leave_type,
      days: parseFloat(row.total_days) || 0,
    });
  });

  // HH map
  const hhMap: { [key: string]: number } = {};
  allHh.forEach((hh) => {
    hhMap[hh.member] = hh.remaining;
  });

  const memberSummaries = Object.entries(memberMap).map(([member, types]) => ({
    member,
    types,
    totalDays: types.reduce((sum, t) => sum + t.days, 0),
    hhRemaining: hhMap[member] ?? 0,
  }));

  const flexMsg = buildTeamSummaryCarousel(memberSummaries);
  await replyFlexMessage(lineClient, userMetaData.replyToken, flexMsg);
}
