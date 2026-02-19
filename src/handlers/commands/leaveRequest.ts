import { pool } from "../../configs/database";
import { lineClient } from "../../configs/lineClient";
import { pushSingleMessage } from "../../cron/pushMessage";
import {
  addNewLeaveRequest,
  addNewNcLeaveRequest,
} from "../../services/leaveService";
import { UserMetaData } from "../../types/interface";
import { replyFlexMessage, replyMessage } from "../../utils/sendLineMsg";
import { validateLeaveRequest } from "../../validations/validateLeaveReq";

export async function handleLeaveRequest(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  const isValidRequest = await validateLeaveRequest(userMetaData, commandArr);
  if (!isValidRequest) return;

  try {
    const flexMsg = await addNewLeaveRequest(pool, userMetaData, commandArr);
    await replyFlexMessage(lineClient, userMetaData.replyToken, flexMsg);

    if (userMetaData.chatType === "PERSONAL") {
      await pushSingleMessage(
        `🥰 Added new leave request for ${userMetaData.username} successfully`,
        userMetaData.userId,
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
    const flexMsg = await addNewNcLeaveRequest(pool, userMetaData, commandArr);
    await replyFlexMessage(lineClient, userMetaData.replyToken, flexMsg);

    if (userMetaData.chatType === "PERSONAL") {
      await pushSingleMessage(
        `🥰 Added new leave request for ${userMetaData.username} successfully`,
        userMetaData.userId,
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
