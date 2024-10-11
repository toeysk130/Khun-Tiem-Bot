import { Client } from "@line/bot-sdk";
import pg from "pg";
import { ILeaveSchedule, IMember } from "../configs/interface";
import {
  LeaveAmountMap,
  keywordMappings,
  monthAbbreviations,
} from "../configs/config";
import {
  convertDatetimeToDDMMM,
  getColorEmoji,
  getCurrentDateString,
  getCurrentTimestamp,
  getDisplayLeaveDate,
  getFormatLeaveDate,
} from "../utils/utils";
import { pushMsg } from "../utils/sendLineMsg";
import { callQuery } from "../utils/query";
import {
  delHhRecord,
  getAllRemainingHh,
  getMyNotApproveHHLists,
  getNotApproveHHLists,
  getNotApprvHh,
  getRemainingHh,
} from "../repositories/happyHour";

const LEAVE_SCHEDULE_COLUMNS = `id, datetime, member, leave_type, medical_cert, status, leave_start_dt::text, leave_end_dt::text, leave_period, period_detail, is_approve, description`;

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
  const [, leaveType, leaveStartDate, leaveAmount, leaveKey, ...descriptions] =
    commandArr;
  const description = descriptions.join(" ");

  const {
    formattedLeaveStartDate,
    formattedLeaveEndDate,
    formattedLeaveAmount,
  } = getFormatLeaveDate(leaveStartDate, leaveAmount);

  const formattedDateTime = getCurrentTimestamp();
  const query = `INSERT INTO leave_schedule (datetime, member, leave_type, leave_start_dt, leave_end_dt, leave_period, period_detail, status, description) \
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`;

  const values = [
    formattedDateTime,
    member.name,
    leaveType,
    formattedLeaveStartDate,
    formattedLeaveEndDate,
    formattedLeaveAmount,
    leaveAmount,
    leaveKey,
    description,
  ];
  const successMsg = `🥰 Added new leave request for ${member.name} successfully`;
  const failMsg = `😥 Failed to add new leave request for ${member.name}`;
  await callQuery(pool, client, replyToken, query, values, successMsg, failMsg);
}

export async function addNewNcLeaveRequest(
  pool: pg.Pool,
  client: Client,
  replyToken: string,
  member: IMember,
  commandArr: string[]
) {
  const leaveKey = "key";
  const isApprove = true;
  const leaveType = commandArr[1];
  const leaveStartDate = commandArr[2];
  const leaveAmount = commandArr[3];
  const description = commandArr.slice(4).join(" ");

  const {
    formattedLeaveStartDate,
    formattedLeaveEndDate,
    formattedLeaveAmount,
  } = getFormatLeaveDate(leaveStartDate, leaveAmount);

  const formattedDateTime = getCurrentTimestamp();
  const query = `INSERT INTO leave_schedule (datetime, member, leave_type, leave_start_dt, leave_end_dt, leave_period, period_detail, status, description, is_approve) \
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`;

  const values = [
    formattedDateTime,
    member.name,
    leaveType,
    formattedLeaveStartDate,
    formattedLeaveEndDate,
    formattedLeaveAmount,
    leaveAmount,
    leaveKey,
    description,
    isApprove,
  ];
  const successMsg = `🥰 Added new leave request for ${member.name} successfully`;
  const failMsg = `😥 Failed to add new leave request for ${member.name}`;
  await callQuery(pool, client, replyToken, query, values, successMsg, failMsg);
}

export async function addNewHhLeaveRequest(
  pool: pg.Pool,
  client: Client,
  replyToken: string,
  username: string,
  commandArr: string[]
) {
  const leaveType = "hh";
  const leaveKey = "key";
  const isApprove = true;
  const hhAmt = commandArr[2];
  const leaveStartDate = commandArr[3];
  const leaveAmount = commandArr[4];
  const description = commandArr.slice(5).join(" ");

  const {
    formattedLeaveStartDate,
    formattedLeaveEndDate,
    formattedLeaveAmount,
  } = getFormatLeaveDate(leaveStartDate, leaveAmount);

  const formattedDateTime = getCurrentTimestamp();
  const query = `INSERT INTO leave_schedule (datetime, member, leave_type, leave_start_dt, leave_end_dt, leave_period, period_detail, status, description, is_approve) \
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`;

  const values = [
    formattedDateTime,
    username,
    leaveType,
    formattedLeaveStartDate,
    formattedLeaveEndDate,
    formattedLeaveAmount,
    leaveAmount,
    leaveKey,
    description,
    isApprove,
  ];

  try {
    await pool.query(query, values);
    await delHhRecord(pool, username, parseInt(hhAmt), description);
  } catch (error) {
    console.error(error);
    await pushMsg(
      client,
      replyToken,
      `😥 Failed to add new leave request for ${username}`
    );
  }
  const remaining = await getRemainingHh(pool, username);
  await pushMsg(
    client,
    replyToken,
    `❤️‍🔥 ใช้ hh สำหรับ ${username} สำเร็จ คงเหลือ: ${remaining} hours`
  );
}
export async function showWaitApprove(
  pool: pg.Pool,
  client: Client,
  replyToken: string,
  optionStatus: string
) {
  const { rows } = await pool.query(
    `SELECT ${LEAVE_SCHEDULE_COLUMNS}
    FROM leave_schedule 
    where is_approve = false
    ${optionStatus !== "" ? `and status = '${optionStatus}'` : ""}
    order by leave_start_dt`
  );
  const leaveDetails = rows as ILeaveSchedule[];
  const notApproveHHLists = await getNotApproveHHLists(pool);

  const replyMessage =
    `✏️ รายการที่ยังรอ Approve ${
      optionStatus == "" ? "[ทั้งหมด]" : `[${optionStatus}]`
    }\n\n` +
    leaveDetails
      .map((detail) => {
        const medCerDetail =
          detail.leave_type == "ลาป่วย"
            ? detail.medical_cert
              ? "(" + keywordMappings["cer"] + " 📜)"
              : "(" + keywordMappings["nocer"] + ")"
            : "";

        return `${getColorEmoji(detail.is_approve, detail.status)}<${
          detail.id
        }> [${detail.status}] ${detail.member} ${
          detail.leave_type
        } ${getDisplayLeaveDate(detail.leave_start_dt, detail.leave_end_dt)} ${
          detail.period_detail
        } ${detail.status} ${medCerDetail ?? null}${
          detail.description == null || detail.description == ""
            ? ""
            : `(${detail.description})`
        }`;
      })
      .join("\n") +
    "\n\n❤️ HH ที่รอการ Approve\n\n" +
    notApproveHHLists
      .map((hh) => {
        return `🙅‍♂️ <${hh.id}> ${hh.member} ${hh.hours}h ${
          hh.description == null || hh.description == ""
            ? ""
            : `(${hh.description})`
        }`;
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
  if (tableName == "member") {
    const { rows } = await pool.query(`SELECT * FROM ${tableName}`);
    const members: IMember[] = rows as IMember[];

    const replyMessage = members
      .map((member) => {
        return `${member.name} ${member.is_admin ? "(admin)" : ""}`;
      })
      .join("\n");
    pushMsg(client, replyToken, replyMessage);
  } else if (tableName == "happy_hour") {
    const allRemainingHhs = await getAllRemainingHh(pool);
    const replyMessage =
      "❤️ ยอด HH คงเหลือแต่ละคน \n" +
      allRemainingHhs
        .map((detail) => {
          return `- ${detail.member}: ${detail.remaining}h`;
        })
        .join("\n");
    pushMsg(client, replyToken, replyMessage);
  }
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
    "🟢 approve แล้ว\n🟡 key & no approve\n🔴 ยังไม่ approve\n___________\n" +
    leaveDetails
      .map((detail) => {
        return `${getColorEmoji(detail.is_approve, detail.status)}<${
          detail.id
        }> ${detail.member} ${detail.leave_type} ${getDisplayLeaveDate(
          detail.leave_start_dt,
          detail.leave_end_dt
        )} ${detail.period_detail} ${detail.status} ${
          detail.description == null || detail.description == ""
            ? ""
            : `(${detail.description})`
        }`;
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
    where leave_start_dt between  '${startDate}' and '${endDate}' 
	  or leave_end_dt between  '${startDate}' and '${endDate}'    
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
  console.log("getIsLeaveDuplicate");
  console.log("startDate", startDate);
  console.log("endDate", endDate);
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

  // Get HH details
  const notApprvHh = await getNotApprvHh(pool, member);
  const remainingHh = await getRemainingHh(pool, member);
  const notApproveHHLists = await getMyNotApproveHHLists(pool, member);

  const replyMessage =
    `✏️ รายการทั้งหมดของ ${member}\n___________\
    \n🙅‍♂️ hh ที่รอ approve ${notApprvHh} hours\
    \n❤️ hh คงเหลือ ${remainingHh} hours\
    \n___________\n` +
    leaveDetails
      .map((detail) => {
        const medCerDetail =
          detail.leave_type == "ลาป่วย"
            ? detail.medical_cert
              ? "(" + keywordMappings["cer"] + " 📜)"
              : "(" + keywordMappings["nocer"] + ")"
            : "";

        return `${getColorEmoji(detail.is_approve, detail.status)}${
          detail.status == "key" ? "🔑" : "🔒"
        }<${detail.id}> ${detail.member} ${
          detail.leave_type
        } ${getDisplayLeaveDate(detail.leave_start_dt, detail.leave_end_dt)} ${
          detail.period_detail
        } ${detail.status} ${medCerDetail ?? null}${
          detail.description == null || detail.description == ""
            ? ""
            : `(${detail.description})`
        }`;
      })
      .join("\n") +
    "\n___________\n" +
    "❤️ HH ที่รอการ Approve\n" +
    notApproveHHLists
      .map((hh) => {
        return `🙅‍♂️ <${hh.id}> ${hh.member} ${hh.hours}h ${
          hh.description == null || hh.description == ""
            ? ""
            : `(${hh.description})`
        }`;
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
  // check if update on either Medical certificate or Key, No-Key on calendar
  let query: string;

  if (key === "cer" || key === "nocer") {
    query = `
      UPDATE leave_schedule
      SET medical_cert = ${key === "cer"}
      WHERE ID = ${id};
    `;
  } else {
    query = `
      UPDATE leave_schedule
      SET status = '${key}'
      WHERE ID = ${id};
    `;
  }

  await pool.query(query);

  // Get new details after update
  const { rows } = await pool.query(
    `SELECT ${LEAVE_SCHEDULE_COLUMNS}
    FROM leave_schedule 
    where id=${id}`
  );
  const leaveDetail = rows[0] as ILeaveSchedule;
  const medCerDetail =
    leaveDetail.leave_type == "ลาป่วย" && leaveDetail.medical_cert
      ? keywordMappings["cer"]
      : "";
  const leaveDetailText = `🚀 ข้อมูลล่าสุด: <${id}> ${leaveDetail.member} ${
    leaveDetail.leave_type
  } ${
    leaveDetail.leave_start_dt == leaveDetail.leave_end_dt
      ? convertDatetimeToDDMMM(leaveDetail.leave_start_dt)
      : convertDatetimeToDDMMM(leaveDetail.leave_start_dt) +
        "-" +
        convertDatetimeToDDMMM(leaveDetail.leave_end_dt)
  } ${leaveDetail.period_detail} ${leaveDetail.status} ${medCerDetail ?? null}
        `;

  const replyMessage = `✅ Update ID:${id} to '${key} ${
    medCerDetail ?? null
  }'\n${leaveDetailText}`;

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
    "🟢 approve แล้ว\n🟡 key & no approve\n🔴 ยังไม่ approve\n___________\n" +
    leaveDetails
      .map((detail) => {
        return `${getColorEmoji(detail.is_approve, detail.status)}<${
          detail.id
        }> ${detail.member} ${detail.leave_type} ${getDisplayLeaveDate(
          detail.leave_start_dt,
          detail.leave_end_dt
        )} ${detail.period_detail} ${detail.status}`;
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
        return `${getColorEmoji(detail.is_approve, detail.status)}<${
          detail.id
        }> ${detail.member} ${detail.leave_type} ${getDisplayLeaveDate(
          detail.leave_start_dt,
          detail.leave_end_dt
        )} ${detail.period_detail} ${detail.status}`;
      })
      .join("\n");

  return replyMessage;
}
