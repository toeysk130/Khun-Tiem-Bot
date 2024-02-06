import { Client } from "@line/bot-sdk";
import pg from "pg";
import { ncTypes, validLeaveTypes } from "../config/config";
import { pushMsg } from "../API/leaveScheduleAPI";
import { validateInputDate } from "./validateCommon";

export async function validateLeaveRequest(
  pool: pg.Pool,
  client: Client,
  member: string,
  commandArr: string[],
  commandLen: number,
  replyToken: string
): Promise<boolean> {
  const command = commandArr[0];
  const leaveType = commandArr[1];
  const leaveStartDate = commandArr[2];
  const leaveAmount = commandArr[3];
  const leaveKey = command == "nc" ? "key" : commandArr[4];

  if (command == "แจ้งลา" && !validLeaveTypes.includes(leaveType)) {
    const replyMessage = `⚠️ ประเภทวันลา '${leaveType}' ไม่มีในระบบ\
      \n✅ ตัวเลือกที่มี ${validLeaveTypes.join(" ")}`;
    await pushMsg(client, replyToken, replyMessage);
    return false;
  }

  if (command == "nc" && !ncTypes.includes(leaveType)) {
    const replyMessage = `⚠️ ประเภทวันลา '${leaveType}' ไม่มีในระบบ\
      \n✅ ตัวเลือกที่มี ${validLeaveTypes.join(" ")}`;
    await pushMsg(client, replyToken, replyMessage);
    return false;
  }

  if (
    !(await validateInputDate(
      pool,
      client,
      replyToken,
      member,
      leaveStartDate,
      leaveAmount,
      leaveKey
    ))
  )
    return false;

  return true;
}
