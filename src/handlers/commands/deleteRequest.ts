import { UserMetaData } from "../../types/interface";
import { replyMessage } from "../../utils/sendLineMsg";
import { lineClient } from "../../configs/lineClient";
import { pool } from "../../configs/database";
import {
  checkIfMyIdExist,
  checkIfIdExist,
  deleteLeaveById,
  getLeaveById,
} from "../../repositories/leaveScheduleRepository";
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
    // Get leave details before deleting for confirmation message
    const detail = await getLeaveById(pool, id);
    await deleteLeaveById(pool, id);

    const msg = `🗑️ ลบรายการ <${id}> สำเร็จ\n${detail.member} ${
      detail.leave_type
    } ${getDisplayLeaveDate(detail.leave_start_dt, detail.leave_end_dt)} ${
      detail.period_detail
    }`;
    await replyMessage(lineClient, userMetaData.replyToken, msg);
  } catch (error) {
    console.error("Error deleting leave request:", error);
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `❌ เกิดข้อผิดพลาดขณะลบรายการ กรุณาลองใหม่อีกครั้ง`,
    );
  }
}
