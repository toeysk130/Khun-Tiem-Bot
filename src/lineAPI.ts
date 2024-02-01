import { Client } from "@line/bot-sdk";
import pg from "pg";
import { IHappyHour, ILeaveSchedule, IMember } from "./interface";
import { LeaveAmountMap, monthAbbreviations } from "./config";
import { convertDatetimeToDDMMM, getCurrentDateString } from "./utils";

export async function pushMsg(client: Client, replyToken: string, msg: string) {
  await client.replyMessage(replyToken, {
    type: "text",
    text: msg,
  });
}

export async function getMemberDetails(
  pool: pg.Pool,
  userId: string
): Promise<IMember> {
  const query = `SELECT * FROM member WHERE uid = '${userId}';`;
  const { rows } = await pool.query(query);

  const member = rows[0] as IMember;

  return member;
}

export async function registerNewMember(
  pool: pg.Pool,
  client: Client,
  replyToken: string,
  userId: string,
  userName: string
) {
  const query = `INSERT INTO member (uid, name) VALUES ($1, $2);`;
  const values = [userId, userName];
  const successMsg = `🥰 Added new member '${userName}' successfully`;
  const failMsg = `😥 Failed to add new member '${userName}'`;
  await callQuery(pool, client, replyToken, query, values, successMsg, failMsg);
}

export async function addNewLeaveRequest(
  pool: pg.Pool,
  client: Client,
  replyToken: string,
  member: IMember,
  commandArr: string[]
) {
  const leaveType = commandArr[1];
  const leaveStartDate = commandArr[2];
  const leaveAmount = commandArr[3];
  const leaveKey = commandArr[4];

  let formattedLeaveStartDate = "";
  let formattedLeaveEndDate = "";
  let formattedLeaveAmount = 0;

  // ลาภายในวันเดียว
  if (leaveStartDate.length == 5) {
    const month = leaveStartDate.slice(-3);
    // Parse the date strings manually
    const firstDay = parseInt(leaveStartDate.slice(0, 2));
    const firstMonth = monthAbbreviations[leaveStartDate.slice(2, 5)];
    const firstYear = new Date().getUTCFullYear();
    formattedLeaveStartDate = new Date(
      Date.UTC(firstYear, firstMonth, firstDay)
    ).toISOString();
    formattedLeaveEndDate = formattedLeaveStartDate;
    formattedLeaveAmount = LeaveAmountMap[leaveAmount];
  }

  // ลาหลายวัน
  if (leaveStartDate.length == 11) {
    const dates = leaveStartDate.split("-");
    const startDate = dates[0];
    const endDate = dates[1];

    // Parse the date strings manually
    const firstDay = parseInt(startDate.slice(0, 2));
    const firstMonth = monthAbbreviations[startDate.slice(2, 5)];
    const firstYear = new Date().getUTCFullYear();

    const secondDay = parseInt(endDate.slice(0, 2));
    const secondMonth = monthAbbreviations[endDate.slice(2, 5)];
    const secondYear = new Date().getUTCFullYear();

    formattedLeaveStartDate = new Date(
      Date.UTC(firstYear, firstMonth, firstDay)
    ).toISOString();
    formattedLeaveEndDate = new Date(
      Date.UTC(secondYear, secondMonth, secondDay)
    ).toISOString();
    formattedLeaveAmount = LeaveAmountMap[leaveAmount];
  }

  const currentDateTime = new Date();
  const formattedDateTime = currentDateTime.toISOString();
  const query = `INSERT INTO leave_schedule (datetime, member, leave_type, leave_start_dt, leave_end_dt, leave_period, period_detail, status) \
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`;

  const values = [
    formattedDateTime,
    member.name,
    leaveType,
    formattedLeaveStartDate,
    formattedLeaveEndDate,
    formattedLeaveAmount,
    leaveAmount,
    leaveKey,
  ];
  const successMsg = `🥰 Added new leave request for ${member.name} successfully`;
  const failMsg = `😥 Failed to add new leave request for ${member.name}`;
  await callQuery(pool, client, replyToken, query, values, successMsg, failMsg);
}

export async function callQuery(
  pool: pg.Pool,
  client: Client,
  replyToken: string,
  query: string,
  value: any[],
  successMsg: string,
  failMsg: string
) {
  try {
    await pool.query(query, value);
    await client.replyMessage(replyToken, {
      type: "text",
      text: successMsg,
    });
  } catch (error) {
    console.error("Error inserting data:", error);
    await client.replyMessage(replyToken, {
      type: "text",
      text: failMsg,
    });
  }
}

export async function showWaitApprove(
  pool: pg.Pool,
  client: Client,
  replyToken: string
) {
  const { rows } = await pool.query(
    `SELECT 
      id,
      datetime, 
      member, 
      leave_type,
      medical_cert,
      status,
      leave_start_dt::text,
      leave_end_dt::text,
      leave_period,
      period_detail,
      is_approve
    FROM leave_schedule 
    where is_approve = false
    order by leave_start_dt`
  );
  const leaveDetails = rows as ILeaveSchedule[];

  const replyMessage =
    "✏️ รายการที่รอ Approve\n" +
    "🔴<id>\n" +
    leaveDetails
      .map((detail) => {
        return `🔴<${detail.id}> ${detail.member} ${detail.leave_type} ${
          detail.leave_start_dt == detail.leave_end_dt
            ? convertDatetimeToDDMMM(detail.leave_start_dt)
            : convertDatetimeToDDMMM(detail.leave_start_dt) +
              "-" +
              convertDatetimeToDDMMM(detail.leave_end_dt)
        } ${detail.period_detail} ${detail.status}`;
      })
      .join("\n");

  await pushMsg(client, replyToken, replyMessage);
}

export async function showTable(
  pool: pg.Pool,
  client: Client,
  replyToken: string,
  tableName: string
) {
  // List all rows
  let replyMessage = "";
  const { rows } = await pool.query(`SELECT * FROM ${tableName}`);

  if (tableName == "member") {
    const members: IMember[] = rows as IMember[];

    replyMessage =
      "👉name, isAdmin\n" +
      members
        .map((member) => {
          return `👉${member.name}, ${member.is_admin}`;
        })
        .join("\n");
  } else if (tableName == "happy_hour") {
    const hhs: IHappyHour[] = rows as IHappyHour[];

    replyMessage =
      "👉id, name, type, hour, appvr\n" +
      hhs
        .map((hh) => {
          return `👉${hh.id}, ${hh.member}, ${hh.type}, ${hh.hour}, ${hh.approver}`;
        })
        .join("\n");
  }

  await pushMsg(client, replyToken, replyMessage);
}

export async function updateApproveFlag(
  pool: pg.Pool,
  client: Client,
  replyToken: string,
  id: number
) {
  const query = `
    UPDATE leave_schedule
    SET is_approve = true
    WHERE ID = ${id};
  `;
  await pool.query(query);
  const replyMessage = `✅ Approve request ID: ${id} successfully`;
  await pushMsg(client, replyToken, replyMessage);
}

export async function showListToday(
  pool: pg.Pool,
  client: Client,
  replyToken: string
) {
  const currentDate = getCurrentDateString();

  const { rows } = await pool.query(
    `SELECT 
      id,
      datetime, 
      member, 
      leave_type,
      medical_cert,
      status,
      leave_start_dt::text,
      leave_end_dt::text,
      leave_period,
      period_detail,
      is_approve
    FROM leave_schedule 
    where leave_start_dt <= '${currentDate}' and '${currentDate}' <= leave_end_dt
    order by leave_start_dt`
  );
  const leaveDetails = rows as ILeaveSchedule[];

  const replyMessage =
    "✏️ ใครแจ้งลาวันนี้\n\n" +
    leaveDetails
      .map((detail) => {
        return `${detail.is_approve ? "🟢" : "🔴"}<${detail.id}> ${
          detail.member
        } ${detail.leave_type} ${
          detail.leave_start_dt == detail.leave_end_dt
            ? convertDatetimeToDDMMM(detail.leave_start_dt)
            : convertDatetimeToDDMMM(detail.leave_start_dt) +
              "-" +
              convertDatetimeToDDMMM(detail.leave_end_dt)
        } ${detail.period_detail} ${detail.status}`;
      })
      .join("\n");

  await pushMsg(client, replyToken, replyMessage);
}
