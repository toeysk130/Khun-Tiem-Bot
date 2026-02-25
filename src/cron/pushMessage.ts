import { pool } from "../configs/database";
import { buildWeeklyReportData } from "../handlers/commands/reportRequest";
import { getNotApproveHHLists } from "../repositories/happyHour";
import {
  getAllWaitingApproval,
  getLeavesToday,
} from "../repositories/leaveScheduleRepository";
import { generateDailyGreeting } from "../services/openaiService";
import { getColorEmoji, getDisplayLeaveDate } from "../utils/utils";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

const LINE_API_URL = "https://api.line.me/v2/bot/message/push";

function createAxiosInstance() {
  const LINE_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN || "";
  return axios.create({
    baseURL: LINE_API_URL,
    headers: {
      Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
}

export async function pushWeeklyMessage() {
  const GROUP_ID = process.env.GROUP_ID || "";
  const axiosInstance = createAxiosInstance();
  const pushMessages: any[] = [];

  // 1. Weekly leave report
  const { textMsg, leaveCount } = await buildWeeklyReportData("วีคนี้");
  if (leaveCount > 0) {
    pushMessages.push({ type: "text", text: textMsg });
  }

  // 2. Wait approve list
  const waitingLeaves = await getAllWaitingApproval(pool);
  if (waitingLeaves.length > 0) {
    const waitApproveMsg =
      "✏️ รายการที่รอการ Approve\n\n" +
      waitingLeaves
        .map(
          (detail) =>
            `${getColorEmoji(detail.is_approve, detail.status)}<${detail.id}> ${
              detail.member
            } ${detail.leave_type} ${getDisplayLeaveDate(
              detail.leave_start_dt,
              detail.leave_end_dt,
            )} ${detail.period_detail} ${detail.status}`,
        )
        .join("\n");
    pushMessages.push({ type: "text", text: waitApproveMsg });
  }

  // 3. HH wait approve
  const notApproveHHLists = await getNotApproveHHLists(pool);
  if (notApproveHHLists.length > 0) {
    const waitApproveHh =
      "❤️ HH ที่รอการ Approve\n\n" +
      notApproveHHLists
        .map(
          (hh) =>
            `🙅‍♂️ <${hh.id}> ${hh.member} ${hh.hours}h ${
              hh.description ? `(${hh.description})` : ""
            }`,
        )
        .join("\n");

    pushMessages.push({ type: "text", text: waitApproveHh });
  }

  if (pushMessages.length > 0) {
    await axiosInstance
      .post("", {
        to: GROUP_ID,
        messages: pushMessages,
      })
      .then((response) => console.log("Weekly report sent:", response.data))
      .catch((error) => console.error("Error sending weekly report:", error));
  } else {
    console.log(
      "No messages to push for weekly report (no leaves, no wait approve).",
    );
  }
}

export async function pushNextWeekReport() {
  const GROUP_ID = process.env.GROUP_ID || "";
  const axiosInstance = createAxiosInstance();

  try {
    const { flexMsg, leaveCount } = await buildWeeklyReportData("วีคหน้า");

    if (leaveCount > 0) {
      await axiosInstance.post("", {
        to: GROUP_ID,
        messages: [flexMsg],
      });
      console.log("Next week report sent successfully.");
    } else {
      console.log("No next week leaves, skipping push.");
    }
  } catch (error) {
    console.error("Error sending next week report:", error);
  }
}

export async function pushReminderMessage() {
  const GROUP_ID = process.env.GROUP_ID || "";
  const axiosInstance = createAxiosInstance();

  // Calculate tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const leavesTomorrow = await getLeavesToday(pool, tomorrowStr);

  // Build leave context for AI
  const leaveContext = leavesTomorrow.map((l) => ({
    member: l.member,
    leaveType: l.leave_type,
    period: l.period_detail,
  }));

  // Generate AI greeting (always, even with no leaves)
  const aiGreeting = await generateDailyGreeting(leaveContext);

  if (leavesTomorrow.length === 0) {
    // No one on leave — just skip sending to save push messages
    console.log("No leaves tomorrow, skipping reminder and AI greeting.");
    return;
  }

  // Has leaves — send reminder + AI message
  const memberList = leavesTomorrow
    .map((l) => `  • ${l.member} — ${l.leave_type} ${l.period_detail}`)
    .join("\n");

  const reminderMsg = `🔔 เตือน! พรุ่งนี้มีคนลา ${leavesTomorrow.length} คน\n\n${memberList}`;

  // Combine: reminder + AI greeting
  const fullMsg = aiGreeting
    ? `${reminderMsg}\n\n🤖 ขุนเทียมบอก:\n${aiGreeting}`
    : reminderMsg;

  await axiosInstance
    .post("", { to: GROUP_ID, messages: [{ type: "text", text: fullMsg }] })
    .then((response) => console.log("Reminder sent:", response.data))
    .catch((error) => console.error("Error sending reminder:", error));
}

export async function pushSingleMessage(message: string, to?: string) {
  const targetId = to || process.env.GROUP_ID || "";
  const axiosInstance = createAxiosInstance();

  axiosInstance
    .post("", { to: targetId, messages: [{ type: "text", text: message }] })
    .then((response) => console.log("Message sent:", response.data))
    .catch((error) => console.error("Error sending message:", error));
}

export async function pushFlexMessage(flexMessage: any, to?: string) {
  const targetId = to || process.env.GROUP_ID || "";
  const axiosInstance = createAxiosInstance();

  axiosInstance
    .post("", { to: targetId, messages: [flexMessage] })
    .then((response) => console.log("Flex Message pushed:", response.data))
    .catch((error) => console.error("Error pushing flex message:", error));
}
