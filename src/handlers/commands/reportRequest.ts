import { pushMsg } from "../../utils/sendLineMsg";
import { UserMetaData } from "../../configs/interface";
import { client, pool } from "../handleIncomingMessage";
import {
  showListThisWeek,
  showListToday,
  showMyList,
} from "../../API/leaveScheduleAPI";
import {
  getCurrentDateString,
  getCurrentWeekDate,
  getNextWeektDateString,
} from "../../utils/utils";

export async function handleReportCommand(
  commandArr: string[],
  userMetaData: UserMetaData,
  replyToken: string
) {
  if (commandArr.length !== 2) {
    // Ex. "รายงาน วันนี้", "รายงาน วีคนี้", "รายงาน ของฉัน"
    return pushMsg(
      client,
      replyToken,
      `⚠️ Invalid usage of the "รายงาน" command. Example: "รายงาน วันนี้", "รายงาน วีคนี้", "รายงาน ของฉัน"`
    );
  }

  const reportType = commandArr[1];

  switch (reportType) {
    case "วันนี้":
      await handleTodayReport(replyToken);
      break;
    case "ของฉัน":
      await handleMyReport(userMetaData, replyToken);
      break;
    case "วีคนี้":
      await handleWeeklyReport(replyToken, "this_week");
      break;
    case "วีคหน้า":
      await handleWeeklyReport(replyToken, "next_week");
      break;
    default:
      await pushMsg(
        client,
        replyToken,
        `⛔ ตัวเลือก '${reportType}' ไม่มีในระบบ. Available options: "ของฉัน", "วันนี้", "วีคนี้", "วีคหน้า"`
      );
      break;
  }
}

async function handleTodayReport(replyToken: string) {
  try {
    await showListToday(pool, client, replyToken);
  } catch (error) {
    console.error("Error fetching today's report:", error);
    await pushMsg(
      client,
      replyToken,
      `❌ An error occurred while generating today's report. Please try again later.`
    );
  }
}

async function handleMyReport(userMetaData: UserMetaData, replyToken: string) {
  try {
    await showMyList(pool, client, userMetaData.username, replyToken);
  } catch (error) {
    console.error("Error fetching user's report:", error);
    await pushMsg(
      client,
      replyToken,
      `❌ An error occurred while fetching your report. Please try again later.`
    );
  }
}

async function handleWeeklyReport(
  replyToken: string,
  weekType: "this_week" | "next_week"
) {
  try {
    const currentWeekDates =
      weekType === "this_week"
        ? getCurrentWeekDate(new Date(getCurrentDateString()))
        : getCurrentWeekDate(new Date(getNextWeektDateString()));

    const currentWeekStartDate = currentWeekDates[0].date;
    const currentWeekEndDate =
      currentWeekDates[currentWeekDates.length - 1].date;

    await showListThisWeek(pool, currentWeekStartDate, currentWeekEndDate);
  } catch (error) {
    console.error(`Error fetching ${weekType} report:`, error);
    await pushMsg(
      client,
      replyToken,
      `❌ An error occurred while generating the weekly report. Please try again later.`
    );
  }
}
