import { addNewLeaveRequest } from "../../API/leaveScheduleAPI";
import { validateLeaveRequest } from "../../validation/validateLeaveReq";
import { client, pool } from "../handleIncomingMessage";

export async function handleLeaveRequest(
  commandArr: string[],
  member: any,
  replyToken: string
) {
  const isValidRequest = await validateLeaveRequest(
    pool,
    client,
    member.name,
    commandArr,
    commandArr.length,
    replyToken
  );

  if (!isValidRequest) return;

  await addNewLeaveRequest(pool, client, replyToken, member, commandArr);
}
