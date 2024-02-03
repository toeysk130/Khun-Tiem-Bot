import { Client } from "@line/bot-sdk";
import pg from "pg";
import { IHappyHour, ILeaveSchedule, IMember } from "./interface";
import { LeaveAmountMap, monthAbbreviations } from "./config";
import { convertDatetimeToDDMMM, getCurrentDateString } from "./utils";

const LEAVE_SCHEDULE_COLUMNS = `id, datetime, member, leave_type, medical_cert, status, leave_start_dt::text, leave_end_dt::text, leave_period, period_detail, is_approve`;

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
  replyToken: string,
  optionStatus: string
) {
  console.log(optionStatus);
  const { rows } = await pool.query(
    `SELECT ${LEAVE_SCHEDULE_COLUMNS}
    FROM leave_schedule 
    where is_approve = false
    ${optionStatus !== "" ? `and status = '${optionStatus}'` : ""}
    order by leave_start_dt`
  );
  const leaveDetails = rows as ILeaveSchedule[];

  const replyMessage =
    `✏️ รายการที่ยังรอ Approve ${
      optionStatus == "" ? "[ทั้งหมด]" : `[${optionStatus}]`
    }\n\n` +
    leaveDetails
      .map((detail) => {
        return `🔴<${detail.id}> [${detail.status}] ${detail.member} ${
          detail.leave_type
        } ${
          detail.leave_start_dt == detail.leave_end_dt
            ? convertDatetimeToDDMMM(detail.leave_start_dt)
            : convertDatetimeToDDMMM(detail.leave_start_dt) +
              "-" +
              convertDatetimeToDDMMM(detail.leave_end_dt)
        } ${detail.period_detail}`;
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

    replyMessage = members
      .map((member) => {
        return `${member.name} ${member.is_admin ? "(admin)" : ""}`;
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
  ids: number[]
) {
  if (ids.length === 0) {
    console.log("No IDs provided for update.");
    return;
  }

  try {
    const idList = ids.join(","); // Convert the array of IDs to a comma-separated string
    const query = `
      UPDATE leave_schedule
      SET is_approve = true
      WHERE ID IN (${idList});
    `;
    await pool.query(query);

    const replyMessage = `✅ Approve request IDs: ${ids.join(
      ", "
    )} successfully`;
    await pushMsg(client, replyToken, replyMessage);
  } catch (error) {
    console.error("Error updating records:", error);
  }
}
export async function showListToday(
  pool: pg.Pool,
  client: Client,
  replyToken: string
) {
  const currentDate = getCurrentDateString();

  const { rows } = await pool.query(
    `SELECT ${LEAVE_SCHEDULE_COLUMNS}
    FROM leave_schedule 
    where leave_start_dt <= '${currentDate}' and '${currentDate}' <= leave_end_dt
    order by leave_start_dt`
  );
  const leaveDetails = rows as ILeaveSchedule[];
  const replyMessage =
    "✏️ คนที่ลาวันนี้\n___________\n" +
    "🟢 approve แล้ว\n🔴 ยังไม่ approve\n___________\n" +
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

export async function showListThisWeek(
  pool: pg.Pool,
  startDate: string,
  endDate: string
) {
  const { rows } = await pool.query(
    `SELECT ${LEAVE_SCHEDULE_COLUMNS}
    FROM leave_schedule 
    where leave_start_dt >= '${startDate}' and leave_start_dt <= '${endDate}'
    order by leave_start_dt`
  );
  const leaveDetails = rows as ILeaveSchedule[];
  return leaveDetails;
}

export async function getIsLeaveDuplicate(
  pool: pg.Pool,
  member: string,
  startDate: string,
  endDate: string
) {
  const query = `SELECT id FROM leave_schedule
  WHERE member = '${member}' and
  leave_start_dt = '${startDate}' and leave_end_dt = '${endDate}'
  `;
  const { rows } = await pool.query(query);
  return rows.length > 0 ? rows[0].id : 0;
}

export async function showMyList(
  pool: pg.Pool,
  client: Client,
  member: string,
  replyToken: string
) {
  const { rows } = await pool.query(
    `SELECT ${LEAVE_SCHEDULE_COLUMNS}
    FROM leave_schedule 
    WHERE member = '${member}'
    order by leave_start_dt`
  );
  const leaveDetails = rows as ILeaveSchedule[];
  const replyMessage =
    `✏️ รายการทั้งหมดของ ${member}\n___________\n` +
    "🟢 approve แล้ว\n🔴 ยังไม่ approve\n___________\n" +
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

export async function checkIfIdExist(
  pool: pg.Pool,
  id: string
): Promise<boolean> {
  const query = `SELECT Count(1) as total FROM leave_schedule WHERE id = ${id};`;
  const { rows } = await pool.query(query);
  return rows[0].total > 0;
}

export async function checkIfMyIdExist(
  pool: pg.Pool,
  member: string,
  id: string
): Promise<boolean> {
  const query = `SELECT Count(1) as total FROM leave_schedule WHERE member = '${member}' and id = ${id};`;
  const { rows } = await pool.query(query);
  return rows[0].total > 0;
}

export async function updateKeyStatus(
  pool: pg.Pool,
  client: Client,
  replyToken: string,
  id: string,
  key: string
) {
  const query = `
    UPDATE leave_schedule
    SET status = '${key}'
    WHERE ID = ${id};
  `;
  await pool.query(query);

  // Get new details after update
  const { rows } = await pool.query(
    `SELECT ${LEAVE_SCHEDULE_COLUMNS}
    FROM leave_schedule 
    where id=${id}`
  );
  const leaveDetail = rows[0] as ILeaveSchedule;
  const leaveDetailText = `ข้อมูลล่าสุด: <${id}> ${leaveDetail.member} ${
    leaveDetail.leave_type
  } ${
    leaveDetail.leave_start_dt == leaveDetail.leave_end_dt
      ? convertDatetimeToDDMMM(leaveDetail.leave_start_dt)
      : convertDatetimeToDDMMM(leaveDetail.leave_start_dt) +
        "-" +
        convertDatetimeToDDMMM(leaveDetail.leave_end_dt)
  } ${leaveDetail.period_detail} ${leaveDetail.status}
        `;

  const replyMessage = `✅ Update ID:${id} to '${key}'\n${leaveDetailText}`;
  await pushMsg(client, replyToken, replyMessage);
}

export async function getListToday(pool: pg.Pool) {
  const currentDate = getCurrentDateString();

  const { rows } = await pool.query(
    `SELECT ${LEAVE_SCHEDULE_COLUMNS}
    FROM leave_schedule 
    where leave_start_dt <= '${currentDate}' and '${currentDate}' <= leave_end_dt
    order by leave_start_dt`
  );
  const leaveDetails = rows as ILeaveSchedule[];
  const replyMessage =
    "✏️ คนที่ลาวันนี้\n___________\n" +
    "🟢 approve แล้ว\n🔴 ยังไม่ approve\n___________\n" +
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

  return replyMessage;
}

export async function getWaitApprove(pool: pg.Pool) {
  const { rows } = await pool.query(
    `SELECT ${LEAVE_SCHEDULE_COLUMNS}
    FROM leave_schedule 
    where is_approve = false
    order by leave_start_dt`
  );
  const leaveDetails = rows as ILeaveSchedule[];

  const replyMessage =
    "✏️ รายการที่ยังรอ Approve\n\n" +
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

  return replyMessage;
}
