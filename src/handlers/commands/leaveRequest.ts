import { addNewLeaveRequest } from "../../API/leaveScheduleAPI";
import { pushSingleMessage } from "../../cron/pushMessage";
import { UserMetaData } from "../../types/interface";
import { validateLeaveRequest } from "../../validations/validateLeaveReq";
import { client } from "../handleIncomingMessage";

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
