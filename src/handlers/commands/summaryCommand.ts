import { UserMetaData } from "../../types/interface";
import { replyMessage } from "../../utils/sendLineMsg";
import { lineClient } from "../../configs/lineClient";
import { pool } from "../../configs/database";
import {
  getAllMembersSummary,
  getLeaveSummaryByMember,
} from "../../repositories/leaveScheduleRepository";
import { getAllRemainingHh } from "../../repositories/happyHour";

export async function handleSummaryCommand(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  try {
    if (commandArr.length === 1) {
      // "สรุป" alone → show summary for current user
      await showMySummary(userMetaData);
    } else if (commandArr[1] === "ทั้งหมด" && userMetaData.isAdmin) {
      // "สรุป ทั้งหมด" (admin only) → show all members summary
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

  let msg = `📈 สรุปวันลาของ ${userMetaData.username}\n___________\n`;

  let totalDays = 0;
  summary.forEach((row: any) => {
    const days = parseFloat(row.total_days) || 0;
    totalDays += days;
    msg += `📋 ${row.leave_type}: ${days} วัน (${row.total_requests} ครั้ง)\n`;
  });

  msg += `___________\n📊 รวมทั้งหมด: ${totalDays} วัน`;

  await replyMessage(lineClient, userMetaData.replyToken, msg);
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
  const memberMap: {
    [key: string]: { type: string; days: number; count: number }[];
  } = {};
  allSummary.forEach((row: any) => {
    if (!memberMap[row.member]) {
      memberMap[row.member] = [];
    }
    memberMap[row.member].push({
      type: row.leave_type,
      days: parseFloat(row.total_days) || 0,
      count: parseInt(row.total_requests) || 0,
    });
  });

  // HH map
  const hhMap: { [key: string]: number } = {};
  allHh.forEach((hh) => {
    hhMap[hh.member] = hh.remaining;
  });

  let msg = `📈 สรุปวันลาทั้งทีม\n___________\n`;

  for (const [member, types] of Object.entries(memberMap)) {
    const totalDays = types.reduce((sum, t) => sum + t.days, 0);
    const hhRemaining = hhMap[member] ?? 0;
    msg += `\n👤 ${member} (รวม ${totalDays} วัน, HH: ${hhRemaining}h)\n`;
    types.forEach((t) => {
      msg += `  📋 ${t.type}: ${t.days} วัน\n`;
    });
  }

  await replyMessage(lineClient, userMetaData.replyToken, msg);
}
