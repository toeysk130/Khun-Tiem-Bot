import { Client } from "@line/bot-sdk";
import pg from "pg";
import { ncTypes, validLeaveTypes } from "../configs/config";
import { validateInputDate } from "./validateCommon";
import { pushMsg } from "../utils/sendLineMsg";

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
      leaveType,
      leaveStartDate,
      leaveAmount,
      leaveKey
    ))
  )
    return false;

  return true;
}
