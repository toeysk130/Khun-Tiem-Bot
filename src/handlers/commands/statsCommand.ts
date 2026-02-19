import { validUpcaseMonths } from "../../configs/constants";
import { pool } from "../../configs/database";
import { lineClient } from "../../configs/lineClient";
import { getMonthlyStats } from "../../repositories/leaveScheduleRepository";
import { summarizeData } from "../../services/openaiService";
import { UserMetaData } from "../../types/interface";
import { buildMonthlyStatsBubble } from "../../utils/flexMessage";
import { replyMessages } from "../../utils/sendLineMsg";
import { Message } from "@line/bot-sdk";

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

    // Build data context for AI
    const dataContext = `สถิติเดือน ${monthName}:
- จำนวนรายการลา: ${currentStats.total} รายการ (${currentStats.totalDays} วัน)
- สมาชิกทั้งหมด: ${currentStats.totalMembers} คน
- แชมป์ลามากสุด: ${currentStats.topLeaver ? `${currentStats.topLeaver.name} (${currentStats.topLeaver.days} วัน)` : "ไม่มี"}
- ประเภทยอดฮิต: ${currentStats.mostPopularType ? `${currentStats.mostPopularType.type} (${currentStats.mostPopularType.count} ครั้ง)` : "ไม่มี"}
- เดือนก่อน (${prevMonthName}): ${prevStats.total} รายการ (${prevStats.totalDays} วัน)
ช่วยวิเคราะห์เปรียบเทียบสถิติให้หน่อย`;

    // Send Flex first, then AI summary
    const messages: Message[] = [flexMsg];

    const aiSummary = await summarizeData(dataContext);
    if (aiSummary) {
      messages.push({
        type: "text",
        text: `🤖 ขุนเทียมวิเคราะห์:\n${aiSummary}`,
      });
    }

    await replyMessages(lineClient, userMetaData.replyToken, messages);
  } catch (error) {
    console.error("Error in stats command:", error);
    await replyMessages(lineClient, userMetaData.replyToken, [
      {
        type: "text",
        text: "❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      },
    ]);
  }
}
