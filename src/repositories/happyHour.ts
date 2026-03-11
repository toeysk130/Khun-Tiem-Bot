import { IAllRemaiHH, IHappyHour } from "../types/interface";
import { getCurrentTimestamp } from "../utils/utils";
import { Pool } from "pg";

// Add new happy hour record
export async function insertHhRecord(
  pool: Pool,
  member: string,
  type: string,
  hour: number,
  description: string,
) {
  const query = `
    INSERT INTO happy_hour (datetime, member, type, hours, description, is_approve)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  const values = [
    getCurrentTimestamp(),
    member,
    type,
    hour,
    description,
    false,
  ];

  await pool.query(query, values);
}

// Delete happy hour record (when using hours)
export async function delHhRecord(
  pool: Pool,
  member: string,
  hour: number,
  description: string,
) {
  const query = `
    INSERT INTO happy_hour (datetime, member, type, hours, description, is_approve)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  const values = [
    getCurrentTimestamp(),
    member,
    "ใช้", // 'ใช้' means 'use' in Thai
    hour,
    description,
    true, // 'is_approve' is true when hours are used
  ];

  await pool.query(query, values);
}

// Reverse HH usage — delete the 'ใช้' deduction record to restore hours
export async function reverseHhUsage(
  pool: Pool,
  member: string,
  description: string,
) {
  // Delete the most recent matching 'ใช้' record for this member
  const query = `
    DELETE FROM happy_hour
    WHERE id = (
      SELECT id FROM happy_hour
      WHERE member = $1 AND type = 'ใช้' AND description = $2
      ORDER BY datetime DESC
      LIMIT 1
    )
  `;
  await pool.query(query, [member, description]);
}

// Get unapproved happy hours
export async function getNotApprvHh(pool: Pool, member: string) {
  const query = `
    SELECT SUM(hours) AS total_hours
    FROM happy_hour
    WHERE member = $1 AND is_approve = false AND type = 'เพิ่ม'
  `;
  const { rows } = await pool.query(query, [member]);
  return rows[0].total_hours || 0;
}

// Get remaining approved happy hours
export async function getRemainingHh(pool: Pool, member: string) {
  const query = `
    SELECT
      SUM(CASE WHEN type = 'เพิ่ม' THEN hours ELSE 0 END) AS total_add,
      SUM(CASE WHEN type = 'ใช้' THEN hours ELSE 0 END) AS total_del
    FROM happy_hour
    WHERE member = $1 AND is_approve = true
  `;
  const { rows } = await pool.query(query, [member]);
  const happyHour = rows[0];
  return happyHour.total_add - happyHour.total_del;
}

// Get all remaining happy hours for all members
export async function getAllRemainingHh(pool: Pool) {
  const query = `
    SELECT member,
      SUM(CASE WHEN type = 'เพิ่ม' THEN hours ELSE 0 END) AS total_add,
      SUM(CASE WHEN type = 'ใช้' THEN hours ELSE 0 END) AS total_del,
      SUM(CASE WHEN type = 'เพิ่ม' THEN hours ELSE 0 END) -
      SUM(CASE WHEN type = 'ใช้' THEN hours ELSE 0 END) AS remaining
    FROM happy_hour
    WHERE is_approve = true
    GROUP BY member
    ORDER BY remaining DESC
  `;
  const { rows } = await pool.query(query);
  return rows as IAllRemaiHH[];
}

// Get all pending (unapproved) happy hours per member
export async function getAllPendingHh(pool: Pool) {
  const query = `
    SELECT member, SUM(hours) AS pending
    FROM happy_hour
    WHERE is_approve = false AND type = 'เพิ่ม'
    GROUP BY member
  `;
  const { rows } = await pool.query(query);
  const map: { [key: string]: number } = {};
  rows.forEach((r: any) => {
    map[r.member] = parseFloat(r.pending) || 0;
  });
  return map;
}

// Check if a happy hour ID exists
export async function checkIfHhIdExist(
  pool: Pool,
  id: string,
): Promise<boolean> {
  const query = `SELECT COUNT(1) as total FROM happy_hour WHERE id = $1`;
  const { rows } = await pool.query(query, [id]);
  return rows[0].total > 0;
}

// Update happy hour approval status
export async function updateHhApproveFlagRepo(pool: Pool, ids: number[]) {
  const query = `
    UPDATE happy_hour
    SET is_approve = true
    WHERE ID = ANY($1::int[])
  `;
  await pool.query(query, [ids]);
}

// Get a list of not approved happy hour requests
export async function getNotApproveHHLists(pool: Pool): Promise<IHappyHour[]> {
  const query = `
    SELECT * FROM happy_hour WHERE is_approve = false ORDER BY datetime
  `;
  const { rows } = await pool.query(query);
  return rows as IHappyHour[];
}

// Get a user's not approved happy hour requests
export async function getMyNotApproveHHLists(
  pool: Pool,
  member: string,
): Promise<IHappyHour[]> {
  const query = `
    SELECT * FROM happy_hour WHERE is_approve = false AND member = $1 ORDER BY datetime
  `;
  const { rows } = await pool.query(query, [member]);
  return rows as IHappyHour[];
}

// Get a single happy hour record by ID
export async function getHhById(pool: Pool, id: string): Promise<IHappyHour> {
  const query = `SELECT * FROM happy_hour WHERE id = $1`;
  const { rows } = await pool.query(query, [id]);
  return rows[0] as IHappyHour;
}

// Delete a happy hour record by ID
export async function deleteHhById(pool: Pool, id: string) {
  const query = `DELETE FROM happy_hour WHERE id = $1`;
  await pool.query(query, [id]);
}

// Check if a happy hour ID exists and belongs to a specific member
export async function checkIfMyHhIdExist(
  pool: Pool,
  member: string,
  id: string,
): Promise<boolean> {
  const query = `SELECT COUNT(1) as total FROM happy_hour WHERE id = $1 AND member = $2`;
  const { rows } = await pool.query(query, [id, member]);
  return rows[0].total > 0;
}
