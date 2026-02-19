import {
  addNewLeaveRequest,
  addNewNcLeaveRequest,
} from "../../services/leaveService";
import { pushSingleMessage } from "../../cron/pushMessage";
import { UserMetaData } from "../../types/interface";
import { validateLeaveRequest } from "../../validations/validateLeaveReq";
import { replyMessage } from "../../utils/sendLineMsg";
import { lineClient } from "../../configs/lineClient";
import { pool } from "../../configs/database";

export async function handleLeaveRequest(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  const isValidRequest = await validateLeaveRequest(userMetaData, commandArr);
  if (!isValidRequest) return;

  try {
    const msg = await addNewLeaveRequest(pool, userMetaData, commandArr);
    await replyMessage(lineClient, userMetaData.replyToken, msg);

    if (userMetaData.chatType === "PERSONAL") {
      await pushSingleMessage(
        `🥰 Added new leave request for ${userMetaData.username} successfully`,
      );
    }
  } catch (error) {
    console.error("Error adding leave request:", error);
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `😥 An error occurred while processing the leave request for ${userMetaData.username}`,
    );
  }
}

export async function handleNcLeaveRequest(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  const isValidRequest = await validateLeaveRequest(userMetaData, commandArr);
  if (!isValidRequest) return;

  try {
    const msg = await addNewNcLeaveRequest(pool, userMetaData, commandArr);
    await replyMessage(lineClient, userMetaData.replyToken, msg);

    if (userMetaData.chatType === "PERSONAL") {
      await pushSingleMessage(
        `🥰 Added new leave request for ${userMetaData.username} successfully`,
      );
    }
  } catch (error) {
    console.error("Error adding NC leave request:", error);
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `😥 An error occurred while processing the leave request for ${userMetaData.username}`,
    );
  }
}
