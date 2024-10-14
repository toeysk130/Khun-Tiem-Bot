import { pushMsg } from "../../utils/sendLineMsg";
import { client, pool } from "../handleIncomingMessage";
import {
  showListThisWeek,
  showListToday,
  showMyList,
  showWaitApprove,
} from "../../API/leaveScheduleAPI";
import {
  getCurrentDateString,
  getCurrentWeekDate,
  getNextWeektDateString,
} from "../../utils/utils";
import { UserMetaData } from "../../types/interface";
import { daysColor, validUpcaseMonths } from "../../configs/constants";

export async function handleReportCommand(
  commandArr: string[],
  userMetaData: UserMetaData
) {
  if (commandArr.length !== 2) {
    return pushMsg(
      client,
      userMetaData.replyToken,
      `⚠️ Invalid usage of the "รายงาน" command. Example: "รายงาน วันนี้", "รายงาน วีคนี้", "รายงาน ของฉัน"`
    );
  }

  const reportType = commandArr[1];

  switch (reportType) {
    case "วันนี้":
      await handleTodayReport(userMetaData.replyToken);
      break;
    case "ของฉัน":
      await handleMyReport(userMetaData, userMetaData.replyToken);
      break;
    case "วีคนี้":
    case "วีคหน้า":
      await handleWeeklyReport(userMetaData.replyToken, reportType);
      break;
    default:
      await pushMsg(
        client,
        userMetaData.replyToken,
        `⛔ ตัวเลือก '${reportType}' ไม่มีในระบบ. Available options: "ของฉัน", "วันนี้", "วีคนี้", "วีคหน้า"`
      );
      break;
  }
}

export async function handleOtherReport(
  commandArr: string[],
  userMetaData: UserMetaData
) {
  try {
    userMetaData.username = commandArr[1]; // Inject target username into user meta obj
    await showMyList(
      pool,
      client,
      userMetaData.username,
      userMetaData.replyToken
    );
  } catch (error) {
    console.error("Error fetching user's report:", error);
    await pushMsg(
      client,
      userMetaData.replyToken,
      `❌ An error occurred while fetching your report. Please try again later.`
    );
  }
}

export async function handleWarningReport(userMetaData: UserMetaData) {
  try {
    await showWaitApprove(pool, client, userMetaData.replyToken, "");
  } catch (error) {
    console.error("Error fetching user's report:", error);
    await pushMsg(
      client,
      userMetaData.replyToken,
      `❌ An error occurred while fetching your report. Please try again later.`
    );
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
async function handleWeeklyReport(replyToken: string, reportType: string) {
  try {
    // Send the result
    await pushMsg(client, replyToken, await buildWeeklyReport(reportType));
  } catch (error) {
    console.error(`Error fetching ${reportType} report:`, error);
    await pushMsg(
      client,
      replyToken,
      `❌ An error occurred while generating the weekly report. Please try again later.`
    );
  }
}

export async function buildWeeklyReport(reportType: string) {
  // Get dates for this week or next week
  const currentWeekDates =
    reportType === "วีคนี้"
      ? getCurrentWeekDate(new Date(getCurrentDateString()))
      : getCurrentWeekDate(new Date(getNextWeektDateString()));

  const currentWeekStartDate = currentWeekDates[0].date;
  const currentWeekEndDate = currentWeekDates[currentWeekDates.length - 1].date;

  // Fetch leave details for the week
  const leaveListThisWeeks = await showListThisWeek(
    pool,
    currentWeekStartDate,
    currentWeekEndDate
  );

  // Initialize an object to accumulate members for each day
  let dayMembersMap: { [key: string]: string[] } = {};

  // Function to format date as DDMMM (e.g., 29JAN)
  function formatDate(date: string): string {
    const parts = date.split("-");
    const day = parts[2];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const month = validUpcaseMonths[monthIndex];
    return `${day}${month}`;
  }

  // Prepare the result string with formatted dates
  let resultString = `😶‍🌫️ ใครลาบ้าง ${
    reportType === "วีคนี้" ? "สัปดาห์นี้" : "สัปดาห์หน้า"
  }\n\n`;

  currentWeekDates.forEach((weekDate, index) => {
    // Initialize members array for each day
    dayMembersMap[weekDate.day] = [];

    // Format date
    const formattedDate = formatDate(weekDate.date);

    // Populate members for each day
    leaveListThisWeeks.forEach((leave) => {
      if (
        weekDate.date >= leave.leave_start_dt &&
        weekDate.date <= leave.leave_end_dt
      ) {
        const leaveStr = `${leave.member} (${leave.leave_type}${
          leave.period_detail.startsWith("ครึ่ง")
            ? `-${leave.period_detail}`
            : ``
        })`;

        dayMembersMap[weekDate.day].push(leaveStr);
      }
    });

    // Append to result string
    resultString += `${daysColor[index]}${formattedDate}(${weekDate.day}) : ${
      dayMembersMap[weekDate.day].join(", ") || ""
    }\n`;
  });

  return resultString;
}
