import {
  daysColor,
  keywordMappings,
  validUpcaseMonths,
} from "../../configs/constants";
import { pool } from "../../configs/database";
import { lineClient } from "../../configs/lineClient";
import { getNotApproveHHLists } from "../../repositories/happyHour";
import {
  getLeaveScheduleByMember,
  getLeavesByDateRange,
  getLeavesByMonth,
  getLeavesToday,
  getWaitingApproval,
} from "../../repositories/leaveScheduleRepository";
import { getNotApprovedHh } from "../../repositories/leaveScheduleRepository";
import {
  formatLeaveDetail,
  formatLeaveDetailWithKey,
} from "../../services/leaveService";
import { ILeaveSchedule, UserMetaData } from "../../types/interface";
import {
  buildMonthlyCarousel,
  buildPersonalReportBubble,
  buildSummaryBubble,
  buildTodayReportBubble,
  buildWeeklyReportBubble,
} from "../../utils/flexMessage";
import { replyFlexMessage, replyMessage } from "../../utils/sendLineMsg";
import {
  getColorEmoji,
  getCurrentDateString,
  getCurrentWeekDate,
  getDisplayLeaveDate,
  getNextWeektDateString,
} from "../../utils/utils";

function getCurrentYear(): number {
  return new Date().getFullYear();
}

export async function handleReportCommand(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  if (commandArr.length < 2 || commandArr.length > 3) {
    return replyMessage(
      lineClient,
      userMetaData.replyToken,
      `⚠️ Invalid usage of the "รายงาน" command. Example: "รายงาน วันนี้", "รายงาน ของฉัน", "รายงาน ของฉัน ทั้งหมด"`,
    );
  }

  const reportType = commandArr[1];
  const showAll = commandArr[2] === "ทั้งหมด";
  const year = showAll ? undefined : getCurrentYear();

  switch (reportType) {
    case "วันนี้":
      await handleTodayReport(userMetaData.replyToken);
      break;
    case "ของฉัน":
      await handleMyReport(userMetaData, userMetaData.replyToken, year);
      break;
    case "วีคนี้":
    case "วีคหน้า":
      await handleWeeklyReport(userMetaData.replyToken, reportType);
      break;
    case "เดือนนี้":
      await handleMonthlyReport(userMetaData.replyToken);
      break;
    default:
      await replyMessage(
        lineClient,
        userMetaData.replyToken,
        `⛔ ตัวเลือก '${reportType}' ไม่มีในระบบ. Available options: "ของฉัน", "วันนี้", "วีคนี้", "วีคหน้า", "เดือนนี้"\n💡 เพิ่ม "ทั้งหมด" หลังคำสั่ง เพื่อดูย้อนหลัง เช่น: "รายงาน ของฉัน ทั้งหมด"`,
      );
      break;
  }
}

export async function handleOtherReport(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  try {
    const targetName = commandArr[1];
    const showAll = commandArr[2] === "ทั้งหมด";
    const year = showAll ? undefined : getCurrentYear();
    await showMyList(targetName, userMetaData.replyToken, year);
  } catch (error) {
    console.error("Error fetching user's report:", error);
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `❌ An error occurred while fetching your report. Please try again later.`,
    );
  }
}

export async function handleWarningReport(userMetaData: UserMetaData) {
  try {
    const leaveDetails = await getWaitingApproval(pool, "");
    const notApproveHHLists = await getNotApproveHHLists(pool);

    const msg =
      `✏️ รายการที่รอการ Approve [ทั้งหมด]\n\n` +
      leaveDetails.map((detail) => formatLeaveDetail(detail)).join("\n") +
      "\n\n❤️ HH ที่รอการ Approve\n\n" +
      notApproveHHLists
        .map(
          (hh) =>
            `🙅‍♂️ <${hh.id}> ${hh.member} ${hh.hours}h ${
              hh.description ? `(${hh.description})` : ""
            }`,
        )
        .join("\n");

    await replyMessage(lineClient, userMetaData.replyToken, msg);
  } catch (error) {
    console.error("Error fetching warning report:", error);
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `❌ An error occurred while fetching your report. Please try again later.`,
    );
  }
}

// ── Private helpers ──

async function handleTodayReport(replyToken: string) {
  try {
    const leaveDetails = await getLeavesToday(pool, getCurrentDateString());
    const flexMsg = buildTodayReportBubble(leaveDetails);
    await replyFlexMessage(lineClient, replyToken, flexMsg);
  } catch (error) {
    console.error("Error fetching today's report:", error);
    await replyMessage(
      lineClient,
      replyToken,
      `❌ An error occurred while generating today's report. Please try again later.`,
    );
  }
}

async function handleMyReport(
  userMetaData: UserMetaData,
  replyToken: string,
  year?: number,
) {
  try {
    await showMyList(userMetaData.username, replyToken, year);
  } catch (error) {
    console.error("Error fetching user's report:", error);
    await replyMessage(
      lineClient,
      replyToken,
      `❌ An error occurred while fetching your report. Please try again later.`,
    );
  }
}

async function handleWeeklyReport(replyToken: string, reportType: string) {
  try {
    const { flexMsg } = await buildWeeklyReportData(reportType);
    await replyFlexMessage(lineClient, replyToken, flexMsg);
  } catch (error) {
    console.error(`Error fetching ${reportType} report:`, error);
    await replyMessage(
      lineClient,
      replyToken,
      `❌ An error occurred while generating the weekly report. Please try again later.`,
    );
  }
}

async function handleMonthlyReport(replyToken: string) {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;

    const leaveDetails = await getLeavesByMonth(pool, monthStart, monthEnd);
    const monthName = validUpcaseMonths[month];
    const monthTitle = `สรุปเดือน ${monthName} ${year}`;

    if (leaveDetails.length === 0) {
      await replyMessage(
        lineClient,
        replyToken,
        `📊 ${monthTitle}\n\nไม่มีรายการลาในเดือนนี้`,
      );
      return;
    }

    // Group by member
    const memberMap: { [key: string]: ILeaveSchedule[] } = {};
    leaveDetails.forEach((detail) => {
      if (!memberMap[detail.member]) {
        memberMap[detail.member] = [];
      }
      memberMap[detail.member].push(detail);
    });

    const memberData = Object.entries(memberMap).map(([member, leaves]) => ({
      member,
      leaves,
      totalDays: leaves.reduce((sum, l) => sum + l.leave_period, 0),
    }));

    const flexMsg = buildMonthlyCarousel(monthTitle, memberData);
    await replyFlexMessage(lineClient, replyToken, flexMsg);
  } catch (error) {
    console.error("Error fetching monthly report:", error);
    await replyMessage(
      lineClient,
      replyToken,
      `❌ An error occurred while generating the monthly report. Please try again later.`,
    );
  }
}

async function showMyList(member: string, replyToken: string, year?: number) {
  const yearLabel = year ? `ปี ${year}` : "ทั้งหมด";
  const [leaveDetails, hhDetails] = await Promise.all([
    getLeaveScheduleByMember(pool, member, year),
    getNotApprovedHh(pool, member),
  ]);

  const { notApprvHh, remainingHh, notApproveHHLists } = hhDetails;

  const flexMsg = buildPersonalReportBubble(
    member,
    leaveDetails,
    {
      notApproved: notApprvHh,
      remaining: remainingHh,
      pendingHH: notApproveHHLists.map((hh) => ({
        id: hh.id,
        hours: hh.hours,
        description: hh.description || "",
      })),
    },
    yearLabel,
  );

  await replyFlexMessage(lineClient, replyToken, flexMsg);
}

// ── Exported for cron/pushMessage ──

export async function buildWeeklyReportData(reportType: string) {
  const currentWeekDates =
    reportType === "วีคนี้"
      ? getCurrentWeekDate(new Date(getCurrentDateString()))
      : getCurrentWeekDate(new Date(getNextWeektDateString()));

  const currentWeekStartDate = currentWeekDates[0].date;
  const currentWeekEndDate = currentWeekDates[currentWeekDates.length - 1].date;

  const leaveListThisWeeks = await getLeavesByDateRange(
    pool,
    currentWeekStartDate,
    currentWeekEndDate,
  );

  const title =
    reportType === "วีคนี้" ? "ใครลาบ้าง สัปดาห์นี้" : "ใครลาบ้าง สัปดาห์หน้า";

  const dayRows = currentWeekDates.map((weekDate) => {
    const members: string[] = [];
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
        members.push(leaveStr);
      }
    });

    return { day: weekDate.day, date: weekDate.date, members };
  });

  const flexMsg = buildWeeklyReportBubble(title, dayRows);

  // Also build text version for push messages
  let textMsg = `😶‍🌫️ ${title}\n\n`;
  dayRows.forEach((row, index) => {
    const formattedDate = row.date.split("-").slice(1).join("");
    textMsg += `${daysColor[index]}${formattedDate}(${row.day}) : ${
      row.members.join(", ") || ""
    }\n`;
  });

  return { flexMsg, textMsg };
}

// Keep backward compat for pushMessage.ts
export async function buildWeeklyReport(reportType: string) {
  const { textMsg } = await buildWeeklyReportData(reportType);
  return textMsg;
}
