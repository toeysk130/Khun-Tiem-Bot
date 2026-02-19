import { validateInputDate } from "./validateInputDate";
import { replyMessage } from "../utils/sendLineMsg";
import { getRemainingHh } from "../repositories/happyHour";
import { lineClient } from "../configs/lineClient";
import { pool } from "../configs/database";
import { validhhAmts, validHhTypes } from "../configs/constants";
import { UserMetaData } from "../types/interface";

export async function validateHhRequest(
  userMetaData: UserMetaData,
  commandArr: string[],
): Promise<boolean> {
  const hhType = commandArr[1];
  const hhAmt = commandArr[2];
  const leaveStartDate = commandArr[3];
  const leaveAmount = commandArr[4];

  if (!validHhTypes.includes(hhType)) {
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `⚠️ ประเภท hh '${hhType}' ไม่มีในระบบ\
    \n✅ ตัวเลือกที่มี '${validHhTypes.join(", ")}'`,
    );
    return false;
  }

  if (!validhhAmts.includes(hhAmt)) {
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `⚠️ จำนวน hh '${hhAmt}' ไม่มีในระบบ\
    \n✅ ตัวเลือกที่มี '1h,2h,...,40h'`,
    );
    return false;
  }

  const remainHh = await getRemainingHh(pool, userMetaData.username);
  if (hhType === "ใช้" && parseInt(hhAmt) > remainHh) {
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `⚠️ จำนวน HH ไม่เพียงพอ\
    \n😫 เรียกใช้ ${hhAmt}\
    \n💩 คงเหลือ ${remainHh}h`,
    );
    return false;
  }

  if (
    !(await validateInputDate(
      userMetaData,
      "hh",
      leaveStartDate,
      leaveAmount,
      "key",
    ))
  )
    return false;

  return true;
}
