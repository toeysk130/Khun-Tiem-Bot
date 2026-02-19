import { validKeyStatus } from "../../configs/constants";
import { UserMetaData } from "../../types/interface";
import { replyMessage } from "../../utils/sendLineMsg";
import { lineClient } from "../../configs/lineClient";
import { pool } from "../../configs/database";
import { checkIfMyIdExist } from "../../repositories/leaveScheduleRepository";
import { updateKeyStatusAndGetDetail } from "../../services/leaveService";

export async function handleUpdateRequest(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  if (commandArr.length < 3) {
    return replyMessage(
      lineClient,
      userMetaData.replyToken,
      `⚠️ การใช้คำสั่ง "อัปเดต" ไม่ถูกต้อง ตัวอย่าง: "อัปเดต 123 key"`,
    );
  }

  const id = commandArr[1];
  const status = commandArr[2];

  if (!validKeyStatus.includes(status)) {
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `⚠️ ประเภทการคีย์ '${status}' ไม่มีในระบบ\
    \n✅ ตัวเลือกที่มี ${validKeyStatus.join(" ")}`,
    );
    return;
  }

  if (!(await checkIfMyIdExist(pool, userMetaData.username, id))) {
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `⛔ ไม่มี ID:${id} ที่เป็นของ '${userMetaData.username}'`,
    );
    return;
  }

  try {
    const msg = await updateKeyStatusAndGetDetail(pool, id, status);
    await replyMessage(lineClient, userMetaData.replyToken, msg);
  } catch (error) {
    console.error("Error updating request:", error);
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `❌ เกิดข้อผิดพลาดขณะอัปเดต กรุณาลองใหม่อีกครั้ง`,
    );
  }
}
