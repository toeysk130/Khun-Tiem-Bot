import {
  leaveReqExampleMsg,
  ncTypes,
  validLeaveTypes,
} from "../configs/constants";
import { validateInputDate } from "./validateInputDate";
import { replyMessage } from "../utils/sendLineMsg";
import { lineClient } from "../configs/lineClient";
import { UserMetaData } from "../types/interface";

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
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `⚠️ ประเภทวันลา '${leaveType}' ไม่มีในระบบ\
      \n✅ ตัวเลือกที่มี ${validTypes.join(" ")}\
      \n${leaveReqExampleMsg}`,
    );
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
