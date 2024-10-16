import { checkIfMyIdExist, updateKeyStatus } from "../../API/leaveScheduleAPI";
import { validKeyStatus } from "../../configs/constants";
import { UserMetaData } from "../../types/interface";
import { pushMsg } from "../../utils/sendLineMsg";
import { client, pool } from "../handleIncomingMessage";

export async function handleUpdateRequest(
  commandArr: string[],
  userMetaData: UserMetaData
) {
  console.log("called handleUpdateRequest()", userMetaData);
  // Validate the command format (hh <subcommand> <params>)
  if (commandArr.length < 2) {
    return pushMsg(
      client,
      userMetaData.replyToken,
      `⚠️ การใช้คำสั่ง "อัปเดต" ไม่ถูกต้อง ตัวอย่าง: "อัปเดต 123 key"`
    );
  }
  const id = commandArr[1];
  const status = commandArr[2];

  // validation
  if (!validKeyStatus.includes(status)) {
    await pushMsg(
      client,
      userMetaData.replyToken,
      `⚠️ ประเภทการคีย์ '${status}' ไม่มีในระบบ\
    \n✅ ตัวเลือกที่มี ${validKeyStatus.join(" ")}`
    );
    return;
  }

  if (!(await checkIfMyIdExist(pool, userMetaData.username, id))) {
    const replyMessage = `⛔ ไม่มี ID:${id} ที่เป็นของ '${userMetaData.username}'`;
    await pushMsg(client, userMetaData.replyToken, replyMessage);
    return;
  }

  await updateKeyStatus(pool, client, userMetaData.replyToken, id, status);
}
