import { pool } from "../../configs/database";
import { lineClient } from "../../configs/lineClient";
import {
  checkIfIdExist,
  getAllWaitingApproval,
} from "../../repositories/leaveScheduleRepository";
import { approveLeaveRequests } from "../../services/leaveService";
import { UserMetaData } from "../../types/interface";
import { replyFlexMessage, replyMessage } from "../../utils/sendLineMsg";

export async function handleApproveCommand(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  // Only Admins are allowed to use this command
  if (!userMetaData.isAdmin) {
    return replyMessage(
      lineClient,
      userMetaData.replyToken,
      "😡 ไม่ใช่ Admin มัน Approve ไม่ได้!",
    );
  }

  if (commandArr.length !== 2) {
    return replyMessage(
      lineClient,
      userMetaData.replyToken,
      '⚠️ ตัวอย่าง: "approve 8" หรือ "approve 3,4,8" หรือ "approve all"',
    );
  }

  try {
    let ids: number[];

    if (commandArr[1].toLowerCase() === "all") {
      // Approve ALL pending leave requests
      const pendingList = await getAllWaitingApproval(pool);
      if (pendingList.length === 0) {
        return replyMessage(
          lineClient,
          userMetaData.replyToken,
          "✅ ไม่มีรายการวันลาที่รอ Approve แล้ว",
        );
      }
      ids = pendingList.map((leave) => leave.id);
    } else {
      ids = commandArr[1]
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((id) => !isNaN(id));
    }

    if (ids.length === 0) {
      return replyMessage(
        lineClient,
        userMetaData.replyToken,
        "⚠️ กรุณาระบุ ID ที่ถูกต้อง เช่น approve 3,4,8",
      );
    }

    for (const id of ids) {
      const exists = await checkIfIdExist(pool, id.toString());
      if (!exists) {
        return replyMessage(
          lineClient,
          userMetaData.replyToken,
          `⛔ ไม่มี ID:${id} ในระบบ`,
        );
      }
    }

    const flexMsg = await approveLeaveRequests(pool, ids);
    return replyFlexMessage(lineClient, userMetaData.replyToken, flexMsg);
  } catch (error) {
    console.error("Error approving IDs:", error);
    return replyMessage(
      lineClient,
      userMetaData.replyToken,
      "❌ เกิดข้อผิดพลาดขณะ Approve กรุณาลองใหม่",
    );
  }
}
