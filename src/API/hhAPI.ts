import pg from "pg";
import { Client } from "@line/bot-sdk";
import { getCurrentTimestamp } from "../utils/utils";
import { IAllRemaiHH, IHappyHour } from "../config/interface";
import { pushMsg } from "../utils/sendLineMsg";

export async function addHhRecord(
  pool: pg.Pool,
  client: Client,
  replyToken: string,
  member: string,
  type: string,
  hour: number,
  description: string
) {
  const updateQuery = `INSERT INTO happy_hour (datetime, member, type, hours, description, is_approve) VALUES ($1, $2, $3, $4, $5, $6);`;
  const values = [
    getCurrentTimestamp(),
    member,
    type,
    hour,
    description,
    false,
  ];

  try {
    await pool.query(updateQuery, values);
  } catch (error) {
    console.error(error);
    await pushMsg(
      client,
      replyToken,
      `😥 Failed to request new hh for '${member}'`
    );
  }

  // Getting new update data
  const notApprvHh = await getNotApprvHh(pool, member);
  const remaining = await getRemainingHh(pool, member);

  await client.replyMessage(replyToken, {
    type: "text",
    text: `❤️ สร้าง Request hh สำหรับ ${member} สำเร็จ\
    \n🙅‍♂️ ที่ยังไม่ Approve: ${notApprvHh} hours\
    \n🙆‍♂️ ที่ Approve: ${remaining} hours`,
  });
}

export async function delHhRecord(
  pool: pg.Pool,
  member: string,
  hour: number,
  description: string
) {
  const updateQuery = `INSERT INTO happy_hour (datetime, member, type, hours, description, is_approve) VALUES ($1, $2, $3, $4, $5, $6);`;
  const values = [
    getCurrentTimestamp(),
    member,
    "ใช้",
    hour,
    description,
    true, // is_approve always 'true' when using hh
  ];

  await pool.query(updateQuery, values);
}

export async function getNotApprvHh(pool: pg.Pool, member: string) {
  // Getting new update data
  const selectQuery = `
  SELECT
      SUM(hours) AS total_hours
  FROM
      happy_hour
  WHERE
      "member" = '${member}' and 
      "is_approve" is false and
      "type" = 'เพิ่ม'
      ;
  `;
  const { rows } = await pool.query(selectQuery);
  const total_hours = rows[0].total_hours == null ? 0 : rows[0].total_hours;
  return total_hours;
}

export async function getRemainingHh(pool: pg.Pool, member: string) {
  // Getting new update data
  const selectQuery = `
    SELECT
      SUM(CASE WHEN "type" = 'เพิ่ม' THEN "hours" ELSE 0 END) AS total_add,
      SUM(CASE WHEN "type" = 'ใช้' THEN "hours" ELSE 0 END) AS total_del
  FROM
      happy_hour
  WHERE
      "member" = '${member}' and is_approve is true;
  `;
  const { rows } = await pool.query(selectQuery);
  const happyHour = rows[0];
  const remaining = happyHour.total_add - happyHour.total_del;
  return remaining;
}

export async function getAllRemainingHh(pool: pg.Pool) {
  // Getting new update data
  const selectQuery = `
  SELECT
  "member",
  SUM(CASE WHEN "type" = 'เพิ่ม' THEN "hours" ELSE 0 END) AS total_add,
  SUM(CASE WHEN "type" = 'ใช้' THEN "hours" ELSE 0 END) AS total_del,
  SUM(CASE WHEN "type" = 'เพิ่ม' THEN "hours" ELSE 0 END) -
  SUM(CASE WHEN "type" = 'ใช้' THEN "hours" ELSE 0 END) AS remaining
FROM
  happy_hour
GROUP BY
  "member"
ORDER BY remaining DESC
  ;
  `;
  const { rows } = await pool.query(selectQuery);
  const remainings = rows as IAllRemaiHH[];
  return remainings;
}

export async function checkIfHhIdExist(
  pool: pg.Pool,
  id: string
): Promise<boolean> {
  const query = `SELECT Count(1) as total FROM happy_hour WHERE id = ${id};`;
  const { rows } = await pool.query(query);
  return rows[0].total > 0;
}

export async function updateHhApproveFlag(
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
      UPDATE happy_hour
      SET is_approve = true
      WHERE ID IN (${idList});
    `;
    await pool.query(query);

    const replyMessage = `✅ Approve request IDs: ${ids.join(
      ", "
    )} successfully`;
    await pushMsg(client, replyToken, replyMessage);
  } catch (error) {
    console.error(error);
  }
}

export async function getNotApproveHHLists(
  pool: pg.Pool
): Promise<IHappyHour[]> {
  const { rows } = await pool.query(
    `SELECT *
    FROM happy_hour
    where is_approve = false
    order by datetime`
  );
  const notApproveHHLists = rows as IHappyHour[];
  return notApproveHHLists;
}

export async function getMyNotApproveHHLists(
  pool: pg.Pool,
  member: string
): Promise<IHappyHour[]> {
  const { rows } = await pool.query(
    `SELECT *
    FROM happy_hour
    where is_approve = false and
    member = '${member}'
    order by datetime`
  );
  const notApproveHHLists = rows as IHappyHour[];
  return notApproveHHLists;
}
