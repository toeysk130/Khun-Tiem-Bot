import {
  leaveReqExampleMsg,
  ncTypes,
  validLeaveTypes,
} from "../configs/constants";
import { lineClient } from "../configs/lineClient";
import { enhanceErrorWithAI } from "../services/openaiService";
import { UserMetaData } from "../types/interface";
import { replyMessage } from "../utils/sendLineMsg";
import { validateInputDate } from "./validateInputDate";

export async function validateLeaveRequest(
  userMetaData: UserMetaData,
  commandArr: string[],
): Promise<boolean> {
  const command = commandArr[0];
  const leaveType = commandArr[1];
  const leaveDatePeriod = commandArr[2].toUpperCase();
  const leaveAmount = commandArr[3];
  const leaveKey = command === "nc" ? "key" : commandArr[4];

  // Prompt for usage example
  if (command === "แจ้งลา" && commandArr.length === 1) {
    await replyMessage(lineClient, userMetaData.replyToken, leaveReqExampleMsg);
    return false;
  }

  const isValidCommand =
    (command === "แจ้งลา" && validLeaveTypes.includes(leaveType)) ||
    (command === "nc" && ncTypes.includes(leaveType));

  if (!isValidCommand) {
    const validTypes = command === "แจ้งลา" ? validLeaveTypes : ncTypes;
    const baseError = `⚠️ ประเภทวันลา '${leaveType}' ไม่มีในระบบ\
      \n✅ ตัวเลือกที่มี ${validTypes.join(" ")}\
      \n${leaveReqExampleMsg}`;
    const userInput = commandArr.join(" ");
    const enhanced = await enhanceErrorWithAI(userInput, baseError);
    await replyMessage(lineClient, userMetaData.replyToken, enhanced);
    return false;
  }

  const isValidDate = await validateInputDate(
    userMetaData,
    leaveType,
    leaveDatePeriod,
    leaveAmount,
    leaveKey,
  );

  if (!isValidDate) return false;

  return true;
}
