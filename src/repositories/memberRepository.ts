import { IMember } from "../types/interface";
import pg from "pg";

export async function getMemberByUid(
  pool: pg.Pool,
  userId: string,
): Promise<IMember> {
  const query = `SELECT * FROM member WHERE uid = $1;`;
  const { rows } = await pool.query(query, [userId]);
  return rows[0] as IMember;
}

export async function insertMember(
  pool: pg.Pool,
  userId: string,
  userName: string,
): Promise<void> {
  const query = `INSERT INTO member (uid, name) VALUES ($1, $2);`;
  await pool.query(query, [userId, userName]);
}

export async function deleteMemberByName(
  pool: pg.Pool,
  name: string,
): Promise<boolean> {
  const result = await pool.query(`DELETE FROM member WHERE name = $1`, [name]);
  return (result.rowCount ?? 0) > 0;
}

export async function getAllMemberNames(pool: pg.Pool): Promise<string[]> {
  const { rows } = await pool.query(`SELECT name FROM member ORDER BY name`);
  return rows.map((r: { name: string }) => r.name);
}
