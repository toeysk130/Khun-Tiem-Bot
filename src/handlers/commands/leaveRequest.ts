import { pool } from "../../configs/database";
import { lineClient } from "../../configs/lineClient";
import { pushFlexMessage } from "../../cron/pushMessage";
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
): Promise<boolean> {
  const isValidRequest = await validateLeaveRequest(userMetaData, commandArr);
  if (!isValidRequest) return false;

  try {
    const flexMsg = await addNewLeaveRequest(pool, userMetaData, commandArr);
    await replyFlexMessage(lineClient, userMetaData.replyToken, flexMsg);

    // Forward to group if requested from personal chat
    if (userMetaData.chatType !== "GROUP") {
      await pushFlexMessage(flexMsg);
    }
    return true;
  } catch (error) {
    console.error("Error adding leave request:", error);
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      "😥 เกิดข้อผิดพลาดขณะแจ้งลา กรุณาลองใหม่",
    );
    return false;
  }
}

export async function handleNcLeaveRequest(
  commandArr: string[],
  userMetaData: UserMetaData,
): Promise<boolean> {
  const isValidRequest = await validateLeaveRequest(userMetaData, commandArr);
  if (!isValidRequest) return false;

  try {
    const flexMsg = await addNewNcLeaveRequest(pool, userMetaData, commandArr);
    await replyFlexMessage(lineClient, userMetaData.replyToken, flexMsg);

    // Forward to group if requested from personal chat
    if (userMetaData.chatType !== "GROUP") {
      await pushFlexMessage(flexMsg);
    }
    return true;
  } catch (error) {
    console.error("Error adding NC leave request:", error);
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      "😥 เกิดข้อผิดพลาดขณะแจ้งลา กรุณาลองใหม่",
    );
    return false;
  }
}
