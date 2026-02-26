import { keywordMappings } from "../configs/constants";
import { delHhRecord, getRemainingHh } from "../repositories/happyHour";
import {
  getLeaveById,
  insertLeaveSchedule,
  insertLeaveScheduleWithApproval,
  updateApproveFlag as repoUpdateApproveFlag,
  updateKeyStatus as repoUpdateKeyStatus,
} from "../repositories/leaveScheduleRepository";
import { ILeaveSchedule, UserMetaData } from "../types/interface";
import { buildResultBubble } from "../utils/flexMessage";
import {
  convertDatetimeToDDMMYY,
  getColorEmoji,
  getCurrentTimestamp,
  getDisplayLeaveDate,
  getFormatLeaveDate,
} from "../utils/utils";
import { FlexMessage } from "@line/bot-sdk";
import pg from "pg";

// ── Leave Request ──

export async function addNewLeaveRequest(
  pool: pg.Pool,
  userMetaData: UserMetaData,
  commandArr: string[],
): Promise<FlexMessage> {
  const [, leaveType, leaveStartDate, leaveAmount, leaveKey, ...descriptions] =
    commandArr;
  const description = descriptions.join(" ").trim();

  if (!leaveType || !leaveStartDate || !leaveAmount || !leaveKey) {
    throw new Error("Missing required fields in the leave request.");
  }

  const {
    formattedLeaveStartDate,
    formattedLeaveEndDate,
    formattedLeaveAmount,
  } = getFormatLeaveDate(leaveStartDate, leaveAmount);

  const values = [
    getCurrentTimestamp(),
    userMetaData.username,
    leaveType,
    formattedLeaveStartDate,
    formattedLeaveEndDate,
    formattedLeaveAmount,
    leaveAmount,
    leaveKey,
    description,
  ];

  await insertLeaveSchedule(pool, values);
  return buildResultBubble("success", `แจ้งลาสำเร็จ`, [
    { label: "👤 ชื่อ", value: userMetaData.username },
    { label: "📄 ประเภท", value: leaveType },
    {
      label: "📅 วันที่",
      value: `${leaveStartDate.toUpperCase()} (${leaveAmount})`,
    },
    { label: "⏰ จำนวน", value: leaveAmount },
    { label: "🔑 Key", value: leaveKey },
    ...(description ? [{ label: "📝 เหตุผล", value: description }] : []),
  ]);
}

export async function addNewNcLeaveRequest(
  pool: pg.Pool,
  userMetaData: UserMetaData,
  commandArr: string[],
): Promise<FlexMessage> {
  const leaveType = commandArr[1];
  const leaveStartDate = commandArr[2];
  const leaveAmount = commandArr[3];
  const description = commandArr.slice(4).join(" ");

  const {
    formattedLeaveStartDate,
    formattedLeaveEndDate,
    formattedLeaveAmount,
  } = getFormatLeaveDate(leaveStartDate, leaveAmount);

  const values = [
    getCurrentTimestamp(),
    userMetaData.username,
    leaveType,
    formattedLeaveStartDate,
    formattedLeaveEndDate,
    formattedLeaveAmount,
    leaveAmount,
    "key",
    description,
    true,
  ];

  await insertLeaveScheduleWithApproval(pool, values);
  return buildResultBubble("success", `แจ้งลาสำเร็จ (NC)`, [
    { label: "👤 ชื่อ", value: userMetaData.username },
    { label: "📄 ประเภท", value: leaveType },
    {
      label: "📅 วันที่",
      value: `${leaveStartDate.toUpperCase()} (${leaveAmount})`,
    },
    { label: "⏰ จำนวน", value: leaveAmount },
    ...(description ? [{ label: "📝 เหตุผล", value: description }] : []),
  ]);
}

export async function addNewHhLeaveRequest(
  pool: pg.Pool,
  username: string,
  commandArr: string[],
): Promise<FlexMessage> {
  const hhAmt = commandArr[2];
  const leaveStartDate = commandArr[3];
  const leaveAmount = commandArr[4];
  const description = commandArr.slice(5).join(" ");

  const {
    formattedLeaveStartDate,
    formattedLeaveEndDate,
    formattedLeaveAmount,
  } = getFormatLeaveDate(leaveStartDate, leaveAmount);

  const hhHours = hhAmt.toLowerCase().endsWith("h") ? hhAmt : `${hhAmt}h`;
  const periodDetail = `${leaveAmount} ${hhHours}`;

  const values = [
    getCurrentTimestamp(),
    username,
    "hh",
    formattedLeaveStartDate,
    formattedLeaveEndDate,
    formattedLeaveAmount,
    periodDetail,
    "key",
    description,
    true,
  ];

  await insertLeaveScheduleWithApproval(pool, values);
  await delHhRecord(pool, username, parseInt(hhAmt), description);

  const remaining = await getRemainingHh(pool, username);

  return buildResultBubble("hh", `ใช้ HH สำหรับ ${username}`, [
    { label: "⏰ ใช้", value: hhHours },
    {
      label: "📅 วันที่",
      value: `${leaveStartDate.toUpperCase()} (${leaveAmount} ${hhHours})`,
    },
    { label: "❤️ คงเหลือ", value: `${remaining}h`, color: "#27AE60" },
    ...(description ? [{ label: "📝 เหตุผล", value: description }] : []),
  ]);
}

// ── Update / Approve ──

export async function updateKeyStatusAndGetDetail(
  pool: pg.Pool,
  id: string,
  key: string,
): Promise<FlexMessage> {
  await repoUpdateKeyStatus(pool, id, key);

  const leaveDetail = await getLeaveById(pool, id);
  const dateDisplay =
    leaveDetail.leave_start_dt === leaveDetail.leave_end_dt
      ? convertDatetimeToDDMMYY(leaveDetail.leave_start_dt)
      : `${convertDatetimeToDDMMYY(leaveDetail.leave_start_dt)}-${convertDatetimeToDDMMYY(leaveDetail.leave_end_dt)}`;

  return buildResultBubble("info", `อัปเดต <${id}> สำเร็จ`, [
    { label: "👤 ชื่อ", value: leaveDetail.member },
    { label: "📄 ประเภท", value: leaveDetail.leave_type },
    { label: "📅 วันที่", value: dateDisplay },
    { label: "⏰ ช่วง", value: leaveDetail.period_detail },
    { label: "🔑 สถานะ", value: key },
  ]);
}

export async function approveLeaveRequests(
  pool: pg.Pool,
  ids: number[],
): Promise<FlexMessage> {
  await repoUpdateApproveFlag(pool, ids);
  return buildResultBubble("success", "อนุมัติวันลาสำเร็จ", [
    { label: "🔢 IDs", value: ids.join(", ") },
    { label: "📊 จำนวน", value: `${ids.length} รายการ` },
  ]);
}

// ── Formatters (for message building) ──

export function formatLeaveDetail(detail: ILeaveSchedule): string {
  const medCerDetail =
    detail.leave_type === "ลาป่วย"
      ? detail.medical_cert
        ? `(${keywordMappings["cer"]} 📜)`
        : `(${keywordMappings["nocer"]})`
      : "";

  return `${getColorEmoji(detail.is_approve, detail.status)}<${detail.id}> ${
    detail.member
  } ${detail.leave_type} ${getDisplayLeaveDate(
    detail.leave_start_dt,
    detail.leave_end_dt,
  )} ${detail.period_detail} ${detail.status} ${medCerDetail}${
    detail.description ? `(${detail.description})` : ""
  }`;
}

export function formatLeaveDetailWithKey(detail: ILeaveSchedule): string {
  const medCerDetail =
    detail.leave_type === "ลาป่วย"
      ? detail.medical_cert
        ? `(${keywordMappings["cer"]} 📜)`
        : `(${keywordMappings["nocer"]})`
      : "";

  return `${getColorEmoji(detail.is_approve, detail.status)}${
    detail.status === "key" ? "🔑" : "🔒"
  }<${detail.id}> ${detail.member} ${
    detail.leave_type
  } ${getDisplayLeaveDate(detail.leave_start_dt, detail.leave_end_dt)} ${
    detail.period_detail
  } ${detail.status} ${medCerDetail}${
    detail.description ? `(${detail.description})` : ""
  }`;
}
