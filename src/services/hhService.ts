import { Pool } from "pg";
import { Client } from "@line/bot-sdk";
import { pushMsg } from "../utils/sendLineMsg";
import {
  getNotApprvHh,
  getRemainingHh,
  insertHhRecord,
  updateHhApproveFlagRepo,
} from "../repositories/happyHour";

// Add new happy hour record and handle messaging
export async function addHhRecord(
  pool: Pool,
  client: Client,
  replyToken: string,
  member: string,
  type: string,
  hour: number,
  description: string
) {
  try {
    // Add the happy hour record
    await insertHhRecord(pool, member, type, hour, description);

    // Get unapproved and remaining hours
    const notApprvHh = await getNotApprvHh(pool, member);
    const remaining = await getRemainingHh(pool, member);

    // Send the success message back to the user
    await client.replyMessage(replyToken, {
      type: "text",
      text: `❤️ สร้าง Request hh สำหรับ ${member} สำเร็จ\
      \n🙅‍♂️ ที่ยังไม่ Approve: ${notApprvHh} hours\
      \n🙆‍♂️ ที่ Approve: ${remaining} hours`,
    });
  } catch (error) {
    console.error("Error adding HH record:", error);
    await pushMsg(
      client,
      replyToken,
      `😥 Failed to request new hh for '${member}'`
    );
  }
}

// Approve happy hour records by IDs
export async function updateHhApproveFlag(
  pool: Pool,
  client: Client,
  replyToken: string,
  ids: number[]
) {
  try {
    // Update approval status
    await updateHhApproveFlagRepo(pool, ids);

    // Send success message;
    await pushMsg(
      client,
      replyToken,
      `✅ Approve request IDs: ${ids.join(", ")} successfully`
    );
  } catch (error) {
    console.error("Error updating HH approval status:", error);
    await pushMsg(client, replyToken, `❌ Failed to approve HH records.`);
  }
}
