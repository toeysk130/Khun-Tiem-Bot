import { pool } from "../../configs/database";
import { lineClient } from "../../configs/lineClient";
import { UserMetaData } from "../../types/interface";
import { buildFunStatsBubble } from "../../utils/flexMessage";
import { replyFlexMessage, replyMessage } from "../../utils/sendLineMsg";

export async function handleStatsCommand(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  try {
    // Total leaves
    const totalLeavesRes = await pool.query(
      `SELECT COUNT(*) as total FROM leave_schedule`,
    );
    const totalLeaves = parseInt(totalLeavesRes.rows[0].total) || 0;

    // Total members
    const totalMembersRes = await pool.query(
      `SELECT COUNT(*) as total FROM member`,
    );
    const totalMembers = parseInt(totalMembersRes.rows[0].total) || 0;

    // Top leaver
    const topLeaverRes = await pool.query(
      `SELECT member, SUM(leave_period) as total_days 
       FROM leave_schedule 
       GROUP BY member 
       ORDER BY total_days DESC 
       LIMIT 1`,
    );
    const topLeaver =
      topLeaverRes.rows.length > 0
        ? {
            name: topLeaverRes.rows[0].member,
            days: parseFloat(topLeaverRes.rows[0].total_days) || 0,
          }
        : null;

    // Most popular leave type
    const popularTypeRes = await pool.query(
      `SELECT leave_type, COUNT(*) as cnt 
       FROM leave_schedule 
       GROUP BY leave_type 
       ORDER BY cnt DESC 
       LIMIT 1`,
    );
    const mostPopularType =
      popularTypeRes.rows.length > 0
        ? {
            type: popularTypeRes.rows[0].leave_type,
            count: parseInt(popularTypeRes.rows[0].cnt) || 0,
          }
        : null;

    // Busiest day of week
    const busiestDayRes = await pool.query(
      `SELECT TO_CHAR(leave_start_dt::date, 'Day') as day_name, COUNT(*) as cnt 
       FROM leave_schedule 
       GROUP BY day_name 
       ORDER BY cnt DESC 
       LIMIT 1`,
    );
    const busiestDay =
      busiestDayRes.rows.length > 0
        ? {
            day: (busiestDayRes.rows[0].day_name || "").trim(),
            count: parseInt(busiestDayRes.rows[0].cnt) || 0,
          }
        : null;

    // Average leaves per person
    const avgLeavesPerPerson =
      totalMembers > 0 ? Math.round((totalLeaves / totalMembers) * 10) / 10 : 0;

    const flexMsg = buildFunStatsBubble({
      totalLeaves,
      totalMembers,
      topLeaver,
      mostPopularType,
      busiestDay,
      avgLeavesPerPerson,
    });

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
