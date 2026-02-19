import { pool } from "../../configs/database";
import { lineClient } from "../../configs/lineClient";
import {
  checkIfIdExist,
  checkIfMyIdExist,
  deleteLeaveById,
  getLeaveById,
} from "../../repositories/leaveScheduleRepository";
import { UserMetaData } from "../../types/interface";
import {
  buildDeleteConfirmBubble,
  buildResultBubble,
} from "../../utils/flexMessage";
import { replyFlexMessage, replyMessage } from "../../utils/sendLineMsg";
import { getDisplayLeaveDate } from "../../utils/utils";

export async function handleDeleteRequest(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  if (commandArr.length !== 2) {
    return replyMessage(
      lineClient,
      userMetaData.replyToken,
      `⚠️ การใช้คำสั่ง "ลบ" ไม่ถูกต้อง ตัวอย่าง: "ลบ 123"`,
    );
  }

  const id = commandArr[1];

  // Admin can delete anyone's record, normal users can only delete their own
  if (userMetaData.isAdmin) {
    const exists = await checkIfIdExist(pool, id);
    if (!exists) {
      return replyMessage(
        lineClient,
        userMetaData.replyToken,
        `⛔ ไม่มี ID:${id} ในระบบ`,
      );
    }
  } else {
    const exists = await checkIfMyIdExist(pool, userMetaData.username, id);
    if (!exists) {
      return replyMessage(
        lineClient,
        userMetaData.replyToken,
        `⛔ ไม่มี ID:${id} ที่เป็นของ '${userMetaData.username}'`,
      );
    }
  }

  try {
    // Show confirm dialog instead of deleting immediately
    const detail = await getLeaveById(pool, id);
    const dateDisplay = getDisplayLeaveDate(
      detail.leave_start_dt,
      detail.leave_end_dt,
    );
    const confirmFlex = buildDeleteConfirmBubble(
      id,
      detail.member,
      detail.leave_type,
      dateDisplay,
      detail.period_detail,
    );
    await replyFlexMessage(lineClient, userMetaData.replyToken, confirmFlex);
  } catch (error) {
    console.error("Error in delete request:", error);
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง`,
    );
  }
}

// Called from postback handler when user confirms deletion
export async function executeDelete(replyToken: string, id: string) {
  try {
    const detail = await getLeaveById(pool, id);
    await deleteLeaveById(pool, id);

    const flex = buildResultBubble("success", `ลบรายการ <${id}> สำเร็จ`, [
      { label: "👤 ชื่อ", value: detail.member },
      { label: "📄 ประเภท", value: detail.leave_type },
      {
        label: "📅 วันที่",
        value: getDisplayLeaveDate(detail.leave_start_dt, detail.leave_end_dt),
      },
      { label: "⏰ ช่วง", value: detail.period_detail },
    ]);
    await replyFlexMessage(lineClient, replyToken, flex);
  } catch (error) {
    console.error("Error executing delete:", error);
    await replyMessage(
      lineClient,
      replyToken,
      `❌ เกิดข้อผิดพลาดขณะลบรายการ กรุณาลองใหม่อีกครั้ง`,
    );
  }
}
