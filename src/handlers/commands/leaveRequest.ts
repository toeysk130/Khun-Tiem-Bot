import {
  addNewLeaveRequest,
  addNewNcLeaveRequest,
} from "../../API/leaveScheduleAPI";
import { pushSingleMessage } from "../../cron/pushMessage";
import { UserMetaData } from "../../types/interface";
import { validateLeaveRequest } from "../../validations/validateLeaveReq";

export async function handleLeaveRequest(
  commandArr: string[],
  userMetaData: UserMetaData
) {
  const isValidRequest = await validateLeaveRequest(userMetaData, commandArr);

  if (!isValidRequest) return;

  await addNewLeaveRequest(userMetaData, commandArr);

  if (userMetaData.chatType == "PERSONAL")
    await pushSingleMessage(
      `🥰 Added new leave request for ${userMetaData.username} successfully`
    );
}

export async function handleNcLeaveRequest(
  commandArr: string[],
  userMetaData: UserMetaData
) {
  const isValidRequest = await validateLeaveRequest(userMetaData, commandArr);

  if (!isValidRequest) return;

  console.log("commandArr", commandArr);

  await addNewNcLeaveRequest(userMetaData, commandArr);

  if (userMetaData.chatType == "PERSONAL")
    await pushSingleMessage(
      `🥰 Added new leave request for ${userMetaData.username} successfully`
    );
}
