import { validateInputDate } from "./validateInputDate";
import { pushMsg } from "../utils/sendLineMsg";
import { getRemainingHh } from "../repositories/happyHour";
import { client, pool } from "../handlers/handleIncomingMessage";
import { validhhAmts, validHhTypes } from "../configs/constants";
import { UserMetaData } from "../types/interface";

export async function validateHhRequest(
  userMetaData: UserMetaData,
  commandArr: string[]
): Promise<boolean> {
  const hhType = commandArr[1]; // "เพิ่ม", "ใช้"
  const hhAmt = commandArr[2]; // 1h,2h,...,40h
  const leaveType = "hh";
  const leaveStartDate = commandArr[3];
  const leaveAmount = commandArr[4];
  const leaveKey = "key";

  if (!validHhTypes.includes(hhType)) {
    // "เพิ่ม", "ใช้"
    const replyMessage = `⚠️ ประเภท hh '${hhType}' ไม่มีในระบบ\
    \n✅ ตัวเลือกที่มี '${validHhTypes.join(", ")}'`;
    await pushMsg(client, userMetaData.replyToken, replyMessage);
    return false;
  }

  if (!validhhAmts.includes(hhAmt)) {
    // 1h,2h,...,40h
    const replyMessage = `⚠️ จำนวน hh '${hhAmt}' ไม่มีในระบบ\
    \n✅ ตัวเลือกที่มี '1h,2h,...,40h'`;
    await pushMsg(client, userMetaData.replyToken, replyMessage);
    return false;
  }

  // Validate if remaining HH is enough
  const remainHh = await getRemainingHh(pool, userMetaData.username);
  if (hhType == "ใช้" && parseInt(hhAmt) > remainHh) {
    const replyMessage = `⚠️ จำนวน HH ไม่เพียงพอ\
    \n😫 เรียกใช้ ${hhAmt}\
    \n💩 คงเหลือ ${remainHh}h`;
    await pushMsg(client, userMetaData.replyToken, replyMessage);
    return false;
  }

  if (
    !(await validateInputDate(
      userMetaData,
      leaveType,
      leaveStartDate,
      leaveAmount,
      leaveKey
    ))
  )
    return false;

  return true;
}
