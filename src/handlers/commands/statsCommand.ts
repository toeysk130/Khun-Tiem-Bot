import { validUpcaseMonths } from "../../configs/constants";
import { pool } from "../../configs/database";
import { lineClient } from "../../configs/lineClient";
import { getMonthlyStats } from "../../repositories/leaveScheduleRepository";
import { UserMetaData } from "../../types/interface";
import { buildMonthlyStatsBubble } from "../../utils/flexMessage";
import { replyFlexMessage, replyMessage } from "../../utils/sendLineMsg";

export async function handleStatsCommand(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-based

    // Previous month
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const [currentStats, prevStats] = await Promise.all([
      getMonthlyStats(pool, currentYear, currentMonth),
      getMonthlyStats(pool, prevYear, prevMonth),
    ]);

    const monthName = validUpcaseMonths[currentMonth - 1];
    const prevMonthName = validUpcaseMonths[prevMonth - 1];

    const flexMsg = buildMonthlyStatsBubble(
      monthName,
      currentStats,
      prevStats,
      prevMonthName,
    );

    await replyFlexMessage(lineClient, userMetaData.replyToken, flexMsg);
  } catch (error) {
    console.error("Error in stats command:", error);
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง`,
    );
  }
}
