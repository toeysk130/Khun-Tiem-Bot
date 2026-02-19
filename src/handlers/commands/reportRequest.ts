import { replyMessage } from "../../utils/sendLineMsg";
import { lineClient } from "../../configs/lineClient";
import { pool } from "../../configs/database";
import {
  getLeavesToday,
  getLeaveScheduleByMember,
  getLeavesByDateRange,
  getWaitingApproval,
  getLeavesByMonth,
} from "../../repositories/leaveScheduleRepository";
import { getNotApprovedHh } from "../../repositories/leaveScheduleRepository";
import { getNotApproveHHLists } from "../../repositories/happyHour";
import {
  getCurrentDateString,
  getCurrentWeekDate,
  getNextWeektDateString,
  getColorEmoji,
  getDisplayLeaveDate,
} from "../../utils/utils";
import { UserMetaData, ILeaveSchedule } from "../../types/interface";
import {
  daysColor,
  validUpcaseMonths,
  keywordMappings,
} from "../../configs/constants";
import {
  formatLeaveDetail,
  formatLeaveDetailWithKey,
} from "../../services/leaveService";

export async function handleReportCommand(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  if (commandArr.length !== 2) {
    return replyMessage(
      lineClient,
      userMetaData.replyToken,
      `⚠️ Invalid usage of the "รายงาน" command. Example: "รายงาน วันนี้", "รายงาน วีคนี้", "รายงาน ของฉัน", "รายงาน เดือนนี้"`,
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
    case "เดือนนี้":
      await handleMonthlyReport(userMetaData.replyToken);
      break;
    default:
      await replyMessage(
        lineClient,
        userMetaData.replyToken,
        `⛔ ตัวเลือก '${reportType}' ไม่มีในระบบ. Available options: "ของฉัน", "วันนี้", "วีคนี้", "วีคหน้า", "เดือนนี้"`,
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
    await showMyList(targetName, userMetaData.replyToken);
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
    const msg =
      "✏️ คนที่ลาวันนี้\n___________\n" +
      "🟢 approve แล้ว\n🟡 key & no approve\n🔴 ยังไม่ approve\n___________\n" +
      leaveDetails
        .map(
          (detail) =>
            `${getColorEmoji(detail.is_approve, detail.status)}<${
              detail.id
            }> ${detail.member} ${detail.leave_type} ${getDisplayLeaveDate(
              detail.leave_start_dt,
              detail.leave_end_dt,
            )} ${detail.period_detail} ${detail.status} ${
              detail.description ? `(${detail.description})` : ""
            }`,
        )
        .join("\n");

    await replyMessage(lineClient, replyToken, msg);
  } catch (error) {
    console.error("Error fetching today's report:", error);
    await replyMessage(
      lineClient,
      replyToken,
      `❌ An error occurred while generating today's report. Please try again later.`,
    );
  }
}

async function handleMyReport(userMetaData: UserMetaData, replyToken: string) {
  try {
    await showMyList(userMetaData.username, replyToken);
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
    await replyMessage(
      lineClient,
      replyToken,
      await buildWeeklyReport(reportType),
    );
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

    if (leaveDetails.length === 0) {
      await replyMessage(
        lineClient,
        replyToken,
        `📊 สรุปเดือน ${monthName} ${year}\n\nไม่มีรายการลาในเดือนนี้`,
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

    let msg = `📊 สรุปเดือน ${monthName} ${year}\n___________\n`;
    msg += `📋 รวมทั้งหมด ${leaveDetails.length} รายการ\n___________\n\n`;

    for (const [member, leaves] of Object.entries(memberMap)) {
      const totalDays = leaves.reduce((sum, l) => sum + l.leave_period, 0);
      msg += `👤 ${member} (${totalDays} วัน)\n`;
      leaves.forEach((detail) => {
        msg += `  ${getColorEmoji(detail.is_approve, detail.status)} ${
          detail.leave_type
        } ${getDisplayLeaveDate(detail.leave_start_dt, detail.leave_end_dt)} ${
          detail.period_detail
        }\n`;
      });
      msg += "\n";
    }

    await replyMessage(lineClient, replyToken, msg);
  } catch (error) {
    console.error("Error fetching monthly report:", error);
    await replyMessage(
      lineClient,
      replyToken,
      `❌ An error occurred while generating the monthly report. Please try again later.`,
    );
  }
}

async function showMyList(member: string, replyToken: string) {
  const [leaveDetails, hhDetails] = await Promise.all([
    getLeaveScheduleByMember(pool, member),
    getNotApprovedHh(pool, member),
  ]);

  const { notApprvHh, remainingHh, notApproveHHLists } = hhDetails;

  const formattedLeaveDetails = leaveDetails
    .map((detail) => formatLeaveDetailWithKey(detail))
    .join("\n");

  const formattedHHDetails = notApproveHHLists
    .map(
      (hh) =>
        `🙅‍♂️ <${hh.id}> ${hh.member} ${hh.hours}h ${
          hh.description ? `(${hh.description})` : ""
        }`,
    )
    .join("\n");

  const msg =
    `✏️ รายการทั้งหมดของ ${member}\n___________\n` +
    `🙅‍♂️ hh ที่รอ approve ${notApprvHh} hours\n` +
    `❤️ hh คงเหลือ ${remainingHh} hours\n___________\n` +
    formattedLeaveDetails +
    "\n___________\n" +
    "❤️ HH ที่รอการ Approve\n" +
    formattedHHDetails;

  await replyMessage(lineClient, replyToken, msg);
}

export async function buildWeeklyReport(reportType: string) {
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

  let dayMembersMap: { [key: string]: string[] } = {};

  function formatDate(date: string): string {
    const parts = date.split("-");
    const day = parts[2];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const month = validUpcaseMonths[monthIndex];
    return `${day}${month}`;
  }

  let resultString = `😶‍🌫️ ใครลาบ้าง ${
    reportType === "วีคนี้" ? "สัปดาห์นี้" : "สัปดาห์หน้า"
  }\n\n`;

  currentWeekDates.forEach((weekDate, index) => {
    dayMembersMap[weekDate.day] = [];
    const formattedDate = formatDate(weekDate.date);

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

    resultString += `${daysColor[index]}${formattedDate}(${weekDate.day}) : ${
      dayMembersMap[weekDate.day].join(", ") || ""
    }\n`;
  });

  return resultString;
}
