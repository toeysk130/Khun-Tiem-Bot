import { pool } from "../../configs/database";
import { buildWeeklyReportData } from "./reportRequest";
import { getNotApproveHHLists } from "../../repositories/happyHour";
import {
  getAllWaitingApproval,
  getLeavesToday,
} from "../../repositories/leaveScheduleRepository";
import { generateDailyGreeting } from "../../services/openaiService";
import {
  buildCronReminderBubble,
  buildCronWeeklyCarousel,
} from "../../utils/flexMessage";
import { replyFlexMessage, replyMessage } from "../../utils/sendLineMsg";
import { UserMetaData } from "../../types/interface";
import { lineClient } from "../../configs/lineClient";

const HELP_TEXT =
  "🕐 คำสั่ง cron (Admin only)\n\n" +
  "  cron weekly    — ทดสอบ Weekly Report\n" +
  "  cron reminder  — ทดสอบ Daily Reminder\n" +
  "  cron nextweek  — ทดสอบ Next Week Report\n" +
  "  cron lottie    — ทดสอบ Celebration APNG Animation (POC)";

export async function handleCronCommand(
  commandArr: string[],
  userMetadata: UserMetaData,
): Promise<boolean> {
  if (!userMetadata.isAdmin) {
    await replyMessage(
      lineClient,
      userMetadata.replyToken,
      "❌ คำสั่งนี้ใช้ได้เฉพาะ Admin เท่านั้น",
    );
    return false;
  }

  const subCmd = commandArr[1]?.toLowerCase();

  switch (subCmd) {
    case "weekly": {
      const { dayRows } = await buildWeeklyReportData("วีคนี้");
      const waitingLeaves = await getAllWaitingApproval(pool);
      const hhList = await getNotApproveHHLists(pool);
      const flex = buildCronWeeklyCarousel(dayRows, waitingLeaves, hhList);
      await replyFlexMessage(lineClient, userMetadata.replyToken, flex);
      break;
    }
    case "reminder": {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      const leaves = await getLeavesToday(pool, tomorrowStr);

      if (leaves.length === 0) {
        await replyMessage(
          lineClient,
          userMetadata.replyToken,
          "ℹ️ พรุ่งนี้ไม่มีใครลา — ปกติจะไม่ส่งข้อความ",
        );
        break;
      }

      const leaveContext = leaves.map((l) => ({
        member: l.member,
        leaveType: l.leave_type,
        period: l.period_detail,
      }));
      const aiGreeting = await generateDailyGreeting(leaveContext);
      const flex = buildCronReminderBubble(leaves, aiGreeting);
      await replyFlexMessage(lineClient, userMetadata.replyToken, flex);
      break;
    }
    case "nextweek": {
      const { flexMsg, leaveCount } = await buildWeeklyReportData("วีคหน้า");
      if (leaveCount === 0) {
        await replyMessage(
          lineClient,
          userMetadata.replyToken,
          "ℹ️ สัปดาห์หน้าไม่มีใครลา — ปกติจะไม่ส่งข้อความ",
        );
        break;
      }
      await replyFlexMessage(lineClient, userMetadata.replyToken, flexMsg);
      break;
    }
    case "lottie": {
      // POC: Animated APNG celebrating "no leaves tomorrow"
      // LINE Flex Message image component supports animated APNG via animated:true
      const GITHUB_RAW =
        "https://raw.githubusercontent.com/toeysk130/Khun-Tiem-Bot/main";
      const flexMsg: any = {
        type: "flex",
        altText: "🎉 ไม่มีใครลาพรุ่งนี้!",
        contents: {
          type: "bubble",
          size: "mega",
          hero: {
            type: "image",
            url: `${GITHUB_RAW}/assets/celebration.png`,
            size: "full",
            aspectRatio: "1:1",
            aspectMode: "cover",
            animated: true,
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🎉 ไม่มีใครลาพรุ่งนี้!",
                weight: "bold",
                size: "xl",
                color: "#1B2838",
                align: "center",
              },
              {
                type: "text",
                text: "เยี่ยมมากเลย! พรุ่งนี้ไม่มีใครลาเลยสักคน ✨",
                size: "sm",
                color: "#6C7A89",
                align: "center",
                margin: "sm",
              },
            ],
            paddingAll: "20px",
            backgroundColor: "#FAFBFC",
          },
        },
      };
      await replyFlexMessage(lineClient, userMetadata.replyToken, flexMsg);
      break;
    }
    default:
      await replyMessage(lineClient, userMetadata.replyToken, HELP_TEXT);
      break;
  }

  return true;
}
