import { pool } from "../configs/database";
import { buildWeeklyReport } from "../handlers/commands/reportRequest";
import { getNotApproveHHLists } from "../repositories/happyHour";
import {
  getAllWaitingApproval,
  getLeavesToday,
} from "../repositories/leaveScheduleRepository";
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

  // 1. Weekly leave report
  const leaveListThisWeeks = await buildWeeklyReport("วีคนี้");
  await axiosInstance
    .post("", {
      to: GROUP_ID,
      messages: [{ type: "text", text: leaveListThisWeeks }],
    })
    .then((response) => console.log("Weekly report sent:", response.data))
    .catch((error) => console.error("Error sending weekly report:", error));

  // 2. Wait approve list
  const waitingLeaves = await getAllWaitingApproval(pool);
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

  await axiosInstance
    .post("", {
      to: GROUP_ID,
      messages: [{ type: "text", text: waitApproveMsg }],
    })
    .then((response) => console.log("Wait approve list sent:", response.data))
    .catch((error) => console.error("Error sending wait approve list:", error));

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

    await axiosInstance
      .post("", {
        to: GROUP_ID,
        messages: [{ type: "text", text: waitApproveHh }],
      })
      .then((response) => console.log("HH wait approve sent:", response.data))
      .catch((error) => console.error("Error sending HH wait approve:", error));
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

  if (leavesTomorrow.length === 0) return; // No notification needed

  const memberList = leavesTomorrow
    .map((l) => `  • ${l.member} — ${l.leave_type} ${l.period_detail}`)
    .join("\n");

  const msg = `🔔 เตือน! พรุ่งนี้มีคนลา ${leavesTomorrow.length} คน\n\n${memberList}`;

  await axiosInstance
    .post("", { to: GROUP_ID, messages: [{ type: "text", text: msg }] })
    .then((response) => console.log("Reminder sent:", response.data))
    .catch((error) => console.error("Error sending reminder:", error));
}

export async function pushSingleMessage(message: string) {
  const GROUP_ID = process.env.GROUP_ID || "";
  const axiosInstance = createAxiosInstance();

  axiosInstance
    .post("", { to: GROUP_ID, messages: [{ type: "text", text: message }] })
    .then((response) => console.log("Message sent:", response.data))
    .catch((error) => console.error("Error sending message:", error));
}
