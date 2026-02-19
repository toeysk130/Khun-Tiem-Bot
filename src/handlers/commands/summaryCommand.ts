import { UserMetaData } from "../../types/interface";
import { replyMessage, replyFlexMessage } from "../../utils/sendLineMsg";
import { lineClient } from "../../configs/lineClient";
import { pool } from "../../configs/database";
import {
  getAllMembersSummary,
  getLeaveSummaryByMember,
} from "../../repositories/leaveScheduleRepository";
import { getAllRemainingHh } from "../../repositories/happyHour";
import {
  buildSummaryBubble,
  buildTeamSummaryCarousel,
} from "../../utils/flexMessage";

function getCurrentYear(): number {
  return new Date().getFullYear();
}

export async function handleSummaryCommand(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  try {
    // สรุป → current year, สรุป ทั้งหมด → all, สรุป ย้อนหลัง → all (admin team view)
    const lastArg = commandArr[commandArr.length - 1];
    const showAll = lastArg === "ทั้งหมด";

    if (commandArr.length === 1 || (commandArr.length === 2 && showAll)) {
      // Personal summary
      const year = showAll ? undefined : getCurrentYear();
      await showMySummary(userMetaData, year);
    } else if (
      commandArr[1] === "ทีม" ||
      (commandArr[1] === "ทั้งหมด" && !showAll)
    ) {
      // Admin: team summary — "สรุป ทีม" or "สรุป ทีม ทั้งหมด"
      if (!userMetaData.isAdmin) {
        return replyMessage(
          lineClient,
          userMetaData.replyToken,
          `⛔ คำสั่ง "สรุป ทีม" สำหรับ Admin เท่านั้น`,
        );
      }
      const year2 = showAll ? undefined : getCurrentYear();
      await showAllSummary(userMetaData, year2);
    } else {
      await replyMessage(
        lineClient,
        userMetaData.replyToken,
        `⚠️ การใช้คำสั่ง "สรุป" ไม่ถูกต้อง\nตัวอย่าง: "สรุป" หรือ "สรุป ทั้งหมด" (ดูย้อนหลัง)\n"สรุป ทีม" (admin) หรือ "สรุป ทีม ทั้งหมด"`,
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

async function showMySummary(userMetaData: UserMetaData, year?: number) {
  const yearLabel = year ? `ปี ${year}` : "ทั้งหมด";
  const summary = await getLeaveSummaryByMember(
    pool,
    userMetaData.username,
    year,
  );

  if (summary.length === 0) {
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `📈 สรุปวันลาของ ${userMetaData.username} (${yearLabel})\n\nยังไม่มีรายการวันลา`,
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
    `${userMetaData.username} (${yearLabel})`,
    summaryRows,
    totalDays,
  );
  await replyFlexMessage(lineClient, userMetaData.replyToken, flexMsg);
}

async function showAllSummary(userMetaData: UserMetaData, year?: number) {
  const yearLabel = year ? `ปี ${year}` : "ทั้งหมด";

  const [allSummary, allHh] = await Promise.all([
    getAllMembersSummary(pool, year),
    getAllRemainingHh(pool),
  ]);

  if (allSummary.length === 0) {
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `📈 สรุปวันลาทั้งทีม (${yearLabel})\n\nยังไม่มีรายการวันลา`,
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
