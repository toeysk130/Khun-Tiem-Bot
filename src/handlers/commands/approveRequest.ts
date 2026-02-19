import { UserMetaData } from "../../types/interface";
import { replyMessage } from "../../utils/sendLineMsg";
import { lineClient } from "../../configs/lineClient";
import { pool } from "../../configs/database";
import { checkIfIdExist } from "../../repositories/leaveScheduleRepository";
import { approveLeaveRequests } from "../../services/leaveService";

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
      `⚠️ Invalid usage of the "approve" command. You must provide one or more IDs to approve. Example: "approve 8" or "approve 3,4,8,10"`,
    );
  }

  const ids = commandArr[1]
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((id) => !isNaN(id));

  if (ids.length === 0) {
    return replyMessage(
      lineClient,
      userMetaData.replyToken,
      "⚠️ No valid IDs provided. Please provide one or more valid numeric IDs.",
    );
  }

  try {
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

    const msg = await approveLeaveRequests(pool, ids);
    return replyMessage(lineClient, userMetaData.replyToken, msg);
  } catch (error) {
    console.error("Error approving IDs:", error);
    return replyMessage(
      lineClient,
      userMetaData.replyToken,
      `❌ An error occurred while approving the IDs. Please try again later.`,
    );
  }
}
