import { Client } from "@line/bot-sdk";
import pg from "pg";
import { validateInputDate } from "./validateCommon";

export async function validateHhRequest(
  pool: pg.Pool,
  client: Client,
  replyToken: string,
  member: string,
  commandArr: string[]
): Promise<boolean> {
  const leaveStartDate = commandArr[3];
  const leaveAmount = commandArr[4];
  const leaveKey = "key";

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
