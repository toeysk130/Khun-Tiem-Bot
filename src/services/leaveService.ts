import pg from "pg";
import { ILeaveSchedule, UserMetaData } from "../types/interface";
import { keywordMappings } from "../configs/constants";
import {
  convertDatetimeToDDMMYY,
  getColorEmoji,
  getCurrentTimestamp,
  getDisplayLeaveDate,
  getFormatLeaveDate,
} from "../utils/utils";
import {
  insertLeaveSchedule,
  insertLeaveScheduleWithApproval,
  getLeaveById,
  updateKeyStatus as repoUpdateKeyStatus,
  updateApproveFlag as repoUpdateApproveFlag,
} from "../repositories/leaveScheduleRepository";
import { delHhRecord, getRemainingHh } from "../repositories/happyHour";

// ── Leave Request ──

export async function addNewLeaveRequest(
  pool: pg.Pool,
  userMetaData: UserMetaData,
  commandArr: string[],
): Promise<string> {
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
  return `🥰 Added new leave request for ${userMetaData.username} successfully`;
}

export async function addNewNcLeaveRequest(
  pool: pg.Pool,
  userMetaData: UserMetaData,
  commandArr: string[],
): Promise<string> {
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
  return `🥰 Added new leave request for ${userMetaData.username} successfully`;
}

export async function addNewHhLeaveRequest(
  pool: pg.Pool,
  username: string,
  commandArr: string[],
): Promise<string> {
  const hhAmt = commandArr[2];
  const leaveStartDate = commandArr[3];
  const leaveAmount = commandArr[4];
  const description = commandArr.slice(5).join(" ");

  const {
    formattedLeaveStartDate,
    formattedLeaveEndDate,
    formattedLeaveAmount,
  } = getFormatLeaveDate(leaveStartDate, leaveAmount);

  const values = [
    getCurrentTimestamp(),
    username,
    "hh",
    formattedLeaveStartDate,
    formattedLeaveEndDate,
    formattedLeaveAmount,
    leaveAmount,
    "key",
    description,
    true,
  ];

  await insertLeaveScheduleWithApproval(pool, values);
  await delHhRecord(pool, username, parseInt(hhAmt), description);

  const remaining = await getRemainingHh(pool, username);
  return `❤️‍🔥 ใช้ hh สำหรับ ${username} สำเร็จ คงเหลือ: ${remaining} hours`;
}

// ── Update / Approve ──

export async function updateKeyStatusAndGetDetail(
  pool: pg.Pool,
  id: string,
  key: string,
): Promise<string> {
  await repoUpdateKeyStatus(pool, id, key);

  const leaveDetail = await getLeaveById(pool, id);
  const medCerDetail =
    leaveDetail.leave_type === "ลาป่วย" && leaveDetail.medical_cert
      ? keywordMappings["cer"]
      : "";
  const leaveDetailText = `🚀 ข้อมูลล่าสุด: <${id}> ${leaveDetail.member} ${
    leaveDetail.leave_type
  } ${
    leaveDetail.leave_start_dt === leaveDetail.leave_end_dt
      ? convertDatetimeToDDMMYY(leaveDetail.leave_start_dt)
      : convertDatetimeToDDMMYY(leaveDetail.leave_start_dt) +
        "-" +
        convertDatetimeToDDMMYY(leaveDetail.leave_end_dt)
  } ${leaveDetail.period_detail} ${leaveDetail.status} ${medCerDetail ?? null}`;

  return `✅ Update ID:${id} to '${key} ${medCerDetail ?? null}'\n${leaveDetailText}`;
}

export async function approveLeaveRequests(
  pool: pg.Pool,
  ids: number[],
): Promise<string> {
  await repoUpdateApproveFlag(pool, ids);
  return `✅ Approve request IDs: ${ids.join(", ")} successfully`;
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
