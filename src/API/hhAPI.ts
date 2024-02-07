import pg from "pg";
import { Client } from "@line/bot-sdk";
import { getCurrentTimestamp } from "../utils/utils";
import { IAllRemaiHH } from "../config/interface";

export async function addHhRecord(
  pool: pg.Pool,
  client: Client,
  replyToken: string,
  member: string,
  type: string,
  hour: number,
  description: string
) {
  const updateQuery = `INSERT INTO happy_hour (datetime, member, type, hours, description) VALUES ($1, $2, $3, $4, $5);`;
  const values = [getCurrentTimestamp(), member, type, hour, description];

  try {
    await pool.query(updateQuery, values);
  } catch (error) {
    console.error("Error inserting data:", error);
    await client.replyMessage(replyToken, {
      type: "text",
      text: `😥 Failed to add new hh for '${member}'`,
    });
  }

  // Getting new update data
  const remaining = await getRemainingHh(pool, member);

  await client.replyMessage(replyToken, {
    type: "text",
    text: `❤️ เพิ่ม hh สำหรับ ${member} สำเร็จ คงเหลือ: ${remaining} hours`,
  });
}

export async function delHhRecord(
  pool: pg.Pool,
  member: string,
  hour: number,
  description: string
) {
  const updateQuery = `INSERT INTO happy_hour (datetime, member, type, hours, description) VALUES ($1, $2, $3, $4, $5);`;
  const values = [getCurrentTimestamp(), member, "ใช้", hour, description];

  await pool.query(updateQuery, values);
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
