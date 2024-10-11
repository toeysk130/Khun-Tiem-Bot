import { checkIfIdExist, updateApproveFlag } from "../../API/leaveScheduleAPI";
import { UserMetaData } from "../../configs/interface";
import { pushMsg } from "../../utils/sendLineMsg";
import { client, pool } from "../handleIncomingMessage";

export async function handleApproveCommand(
  commandArr: string[],
  userMetaData: UserMetaData,
  replyToken: string
) {
  // Only Admins are allowed to use this command
  if (!userMetaData.isAdmin) {
    return pushMsg(client, replyToken, "😡 ไม่ใช่ Admin มัน Approve ไม่ได้!");
  }

  // Validate that the command has the correct format (approve <id, ids>)
  if (commandArr.length !== 2) {
    return pushMsg(
      client,
      replyToken,
      `⚠️ Invalid usage of the "approve" command. You must provide one or more IDs to approve. Example: "approve 8" or "approve 3,4,8,10"`
    );
  }

  // Extract IDs and validate that they are numbers
  const ids = commandArr[1]
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((id) => !isNaN(id)); // Filter out invalid numbers

  if (ids.length === 0) {
    return pushMsg(
      client,
      replyToken,
      "⚠️ No valid IDs provided. Please provide one or more valid numeric IDs."
    );
  }

  try {
    // Check that each ID exists in the database
    for (const id of ids) {
      const exists = await checkIfIdExist(pool, id.toString());
      if (!exists) {
        return pushMsg(client, replyToken, `⛔ ไม่มี ID:${id} ในระบบ`);
      }
    }

    // If all IDs are valid, update their approval flags
    await updateApproveFlag(pool, client, replyToken, ids);
    return pushMsg(
      client,
      replyToken,
      `✅ The following IDs have been successfully approved: ${ids.join(", ")}`
    );
  } catch (error) {
    console.error("Error approving IDs:", error);
    return pushMsg(
      client,
      replyToken,
      `❌ An error occurred while approving the IDs. Please try again later.`
    );
  }
}
