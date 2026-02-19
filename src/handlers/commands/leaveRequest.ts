import { pool } from "../../configs/database";
import { lineClient } from "../../configs/lineClient";
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
  } catch (error) {
    console.error("Error adding leave request:", error);
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      "😥 เกิดข้อผิดพลาดขณะแจ้งลา กรุณาลองใหม่",
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
  } catch (error) {
    console.error("Error adding NC leave request:", error);
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      "😥 เกิดข้อผิดพลาดขณะแจ้งลา กรุณาลองใหม่",
    );
  }
}
