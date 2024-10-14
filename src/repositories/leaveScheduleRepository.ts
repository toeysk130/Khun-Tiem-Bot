import { LEAVE_SCHEDULE_COLUMNS } from "../configs/constants";
import { ILeaveSchedule } from "../types/interface";
import {
  getMyNotApproveHHLists,
  getNotApprvHh,
  getRemainingHh,
} from "./happyHour";
import pg from "pg";

export async function getLeaveScheduleByMember(pool: pg.Pool, member: string) {
  const { rows } = await pool.query(
    `SELECT ${LEAVE_SCHEDULE_COLUMNS} FROM leave_schedule 
       WHERE member = $1 
       ORDER BY leave_start_dt`,
    [member]
  );
  return rows as ILeaveSchedule[];
}

export async function getNotApprovedHh(pool: pg.Pool, member: string) {
  const notApprvHh = await getNotApprvHh(pool, member);
  const remainingHh = await getRemainingHh(pool, member);
  const notApproveHHLists = await getMyNotApproveHHLists(pool, member);

  return { notApprvHh, remainingHh, notApproveHHLists };
}
