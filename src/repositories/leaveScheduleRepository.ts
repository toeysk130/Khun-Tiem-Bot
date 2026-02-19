import pg from "pg";
import { LEAVE_SCHEDULE_COLUMNS } from "../configs/constants";
import { ILeaveSchedule } from "../types/interface";
import {
  getMyNotApproveHHLists,
  getNotApprvHh,
  getRemainingHh,
} from "./happyHour";

// ── Query helpers ──

export async function getLeaveScheduleByMember(
  pool: pg.Pool,
  member: string,
  year?: number,
) {
  const yearFilter = year
    ? ` AND EXTRACT(YEAR FROM leave_start_dt::date) = ${year}`
    : "";
  const { rows } = await pool.query(
    `SELECT ${LEAVE_SCHEDULE_COLUMNS} FROM leave_schedule 
       WHERE member = $1${yearFilter}
       ORDER BY leave_start_dt DESC`,
    [member],
  );
  return rows as ILeaveSchedule[];
}

export async function getLeavesToday(pool: pg.Pool, currentDate: string) {
  const { rows } = await pool.query(
    `SELECT ${LEAVE_SCHEDULE_COLUMNS}
    FROM leave_schedule 
    WHERE leave_start_dt <= $1 AND $1 <= leave_end_dt
    ORDER BY leave_start_dt`,
    [currentDate],
  );
  return rows as ILeaveSchedule[];
}

export async function getLeavesByDateRange(
  pool: pg.Pool,
  startDate: string,
  endDate: string,
) {
  const { rows } = await pool.query(
    `SELECT ${LEAVE_SCHEDULE_COLUMNS}
    FROM leave_schedule 
    WHERE leave_start_dt BETWEEN $1 AND $2 
      OR leave_end_dt BETWEEN $1 AND $2    
    ORDER BY leave_start_dt`,
    [startDate, endDate],
  );
  return rows as ILeaveSchedule[];
}

export async function getWaitingApproval(pool: pg.Pool, optionStatus: string) {
  const query =
    optionStatus !== ""
      ? `SELECT ${LEAVE_SCHEDULE_COLUMNS} FROM leave_schedule WHERE is_approve = false AND status = $1 ORDER BY leave_start_dt`
      : `SELECT ${LEAVE_SCHEDULE_COLUMNS} FROM leave_schedule WHERE is_approve = false ORDER BY leave_start_dt`;
  const params = optionStatus !== "" ? [optionStatus] : [];
  const { rows } = await pool.query(query, params);
  return rows as ILeaveSchedule[];
}

export async function getAllWaitingApproval(pool: pg.Pool) {
  const { rows } = await pool.query(
    `SELECT ${LEAVE_SCHEDULE_COLUMNS}
    FROM leave_schedule 
    WHERE is_approve = false
    ORDER BY leave_start_dt`,
  );
  return rows as ILeaveSchedule[];
}

export async function getLeavesByMonth(
  pool: pg.Pool,
  monthStart: string,
  monthEnd: string,
) {
  const { rows } = await pool.query(
    `SELECT ${LEAVE_SCHEDULE_COLUMNS}
    FROM leave_schedule 
    WHERE (leave_start_dt BETWEEN $1 AND $2 OR leave_end_dt BETWEEN $1 AND $2)
    ORDER BY leave_start_dt`,
    [monthStart, monthEnd],
  );
  return rows as ILeaveSchedule[];
}

// ── Insert / Update ──

export async function insertLeaveSchedule(
  pool: pg.Pool,
  values: any[],
): Promise<number> {
  const query = `INSERT INTO leave_schedule 
    (datetime, member, leave_type, leave_start_dt, leave_end_dt, leave_period, period_detail, status, description) 
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;`;
  const { rows } = await pool.query(query, values);
  return rows[0].id;
}

export async function insertLeaveScheduleWithApproval(
  pool: pg.Pool,
  values: any[],
): Promise<number> {
  const query = `INSERT INTO leave_schedule 
    (datetime, member, leave_type, leave_start_dt, leave_end_dt, leave_period, period_detail, status, description, is_approve) 
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id;`;
  const { rows } = await pool.query(query, values);
  return rows[0].id;
}

export async function updateApproveFlag(pool: pg.Pool, ids: number[]) {
  const query = `
    UPDATE leave_schedule
    SET is_approve = true
    WHERE ID = ANY($1::int[]);
  `;
  await pool.query(query, [ids]);
}

export async function updateKeyStatus(pool: pg.Pool, id: string, key: string) {
  if (key === "cer" || key === "nocer") {
    await pool.query(
      `UPDATE leave_schedule SET medical_cert = $1 WHERE ID = $2;`,
      [key === "cer", id],
    );
  } else {
    await pool.query(`UPDATE leave_schedule SET status = $1 WHERE ID = $2;`, [
      key,
      id,
    ]);
  }
}

export async function getLeaveById(pool: pg.Pool, id: string) {
  const { rows } = await pool.query(
    `SELECT ${LEAVE_SCHEDULE_COLUMNS} FROM leave_schedule WHERE id = $1`,
    [id],
  );
  return rows[0] as ILeaveSchedule;
}

export async function deleteLeaveById(pool: pg.Pool, id: string) {
  await pool.query(`DELETE FROM leave_schedule WHERE id = $1`, [id]);
}

// ── Existence checks ──

export async function checkIfIdExist(
  pool: pg.Pool,
  id: string,
): Promise<boolean> {
  const query = `SELECT Count(1) as total FROM leave_schedule WHERE id = $1;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0].total > 0;
}

export async function checkIfMyIdExist(
  pool: pg.Pool,
  member: string,
  id: string,
): Promise<boolean> {
  const query = `SELECT Count(1) as total FROM leave_schedule WHERE member = $1 AND id = $2;`;
  const { rows } = await pool.query(query, [member, id]);
  return rows[0].total > 0;
}

export async function getIsLeaveDuplicate(
  pool: pg.Pool,
  member: string,
  startDate: string,
  endDate: string,
) {
  const query = `SELECT id FROM leave_schedule
  WHERE member = $1 AND leave_start_dt = $2 AND leave_end_dt = $3`;
  const { rows } = await pool.query(query, [member, startDate, endDate]);
  return rows.length > 0 ? rows[0].id : 0;
}

// ── Aggregated queries ──

export async function getNotApprovedHh(pool: pg.Pool, member: string) {
  const notApprvHh = await getNotApprvHh(pool, member);
  const remainingHh = await getRemainingHh(pool, member);
  const notApproveHHLists = await getMyNotApproveHHLists(pool, member);
  return { notApprvHh, remainingHh, notApproveHHLists };
}

export async function getLeaveSummaryByMember(
  pool: pg.Pool,
  member: string,
  year?: number,
) {
  const yearFilter = year
    ? ` AND EXTRACT(YEAR FROM leave_start_dt::date) = ${year}`
    : "";
  const query = `
    SELECT leave_type, 
      SUM(leave_period) AS total_days,
      COUNT(*) AS total_requests
    FROM leave_schedule
    WHERE member = $1${yearFilter}
    GROUP BY leave_type
    ORDER BY leave_type
  `;
  const { rows } = await pool.query(query, [member]);
  return rows;
}

export async function getAllMembersSummary(pool: pg.Pool, year?: number) {
  const yearFilter = year
    ? ` WHERE EXTRACT(YEAR FROM leave_start_dt::date) = ${year}`
    : "";
  const query = `
    SELECT member, leave_type, 
      SUM(leave_period) AS total_days,
      COUNT(*) AS total_requests
    FROM leave_schedule${yearFilter}
    GROUP BY member, leave_type
    ORDER BY member, leave_type
  `;
  const { rows } = await pool.query(query);
  return rows;
}

// ── Monthly stats for fun statistics ──

export async function getMonthlyStats(
  pool: pg.Pool,
  year: number,
  month: number,
) {
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const totalRes = await pool.query(
    `SELECT COUNT(*) as total, COALESCE(SUM(leave_period), 0) as total_days
     FROM leave_schedule WHERE leave_start_dt BETWEEN $1 AND $2`,
    [monthStart, monthEnd],
  );
  const total = parseInt(totalRes.rows[0].total) || 0;
  const totalDays = parseFloat(totalRes.rows[0].total_days) || 0;

  const topLeaverRes = await pool.query(
    `SELECT member, SUM(leave_period) as days
     FROM leave_schedule WHERE leave_start_dt BETWEEN $1 AND $2
     GROUP BY member ORDER BY days DESC LIMIT 1`,
    [monthStart, monthEnd],
  );
  const topLeaver =
    topLeaverRes.rows.length > 0
      ? {
          name: topLeaverRes.rows[0].member,
          days: parseFloat(topLeaverRes.rows[0].days) || 0,
        }
      : null;

  const popularTypeRes = await pool.query(
    `SELECT leave_type, COUNT(*) as cnt
     FROM leave_schedule WHERE leave_start_dt BETWEEN $1 AND $2
     GROUP BY leave_type ORDER BY cnt DESC LIMIT 1`,
    [monthStart, monthEnd],
  );
  const mostPopularType =
    popularTypeRes.rows.length > 0
      ? {
          type: popularTypeRes.rows[0].leave_type,
          count: parseInt(popularTypeRes.rows[0].cnt) || 0,
        }
      : null;

  const busiestDayRes = await pool.query(
    `SELECT TO_CHAR(leave_start_dt::date, 'Day') as day_name, COUNT(*) as cnt
     FROM leave_schedule WHERE leave_start_dt BETWEEN $1 AND $2
     GROUP BY day_name ORDER BY cnt DESC LIMIT 1`,
    [monthStart, monthEnd],
  );
  const busiestDay =
    busiestDayRes.rows.length > 0
      ? {
          day: (busiestDayRes.rows[0].day_name || "").trim(),
          count: parseInt(busiestDayRes.rows[0].cnt) || 0,
        }
      : null;

  const membersRes = await pool.query(`SELECT COUNT(*) as total FROM member`);
  const totalMembers = parseInt(membersRes.rows[0].total) || 0;

  return {
    total,
    totalDays,
    topLeaver,
    mostPopularType,
    busiestDay,
    totalMembers,
  };
}
