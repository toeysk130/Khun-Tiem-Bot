import { pool } from "../configs/database";
import { buildWeeklyReportData } from "../handlers/commands/reportRequest";
import { getNotApproveHHLists } from "../repositories/happyHour";
import {
  getAllWaitingApproval,
  getLeavesToday,
} from "../repositories/leaveScheduleRepository";
import { generateDailyGreeting } from "../services/openaiService";
import {
  buildCronReminderBubble,
  buildCronWeeklyCarousel,
} from "../utils/flexMessage";
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

  // 1. Weekly leave report (day rows)
  const { dayRows } = await buildWeeklyReportData("วีคนี้");

  // 2. Wait approve list
  const waitingLeaves = await getAllWaitingApproval(pool);

  // 3. HH wait approve
  const notApproveHHLists = await getNotApproveHHLists(pool);

  // Build single Flex Carousel combining all sections
  const flexMsg = buildCronWeeklyCarousel(
    dayRows,
    waitingLeaves,
    notApproveHHLists,
  );

  await axiosInstance
    .post("", {
      to: GROUP_ID,
      messages: [flexMsg],
    })
    .then((response) => console.log("Weekly report sent:", response.data))
    .catch((error) => console.error("Error sending weekly report:", error));
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

  // Build single Flex bubble with leave list + AI greeting
  const flexMsg = buildCronReminderBubble(leavesTomorrow, aiGreeting);

  await axiosInstance
    .post("", { to: GROUP_ID, messages: [flexMsg] })
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
