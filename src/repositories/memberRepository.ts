import pg from "pg";
import { IMember } from "../types/interface";

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
