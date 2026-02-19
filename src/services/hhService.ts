import { Pool } from "pg";
import { Client } from "@line/bot-sdk";
import { replyMessage } from "../utils/sendLineMsg";
import {
  getNotApprvHh,
  getRemainingHh,
  insertHhRecord,
  updateHhApproveFlagRepo,
} from "../repositories/happyHour";

export async function addHhRecord(
  pool: Pool,
  client: Client,
  replyToken: string,
  member: string,
  type: string,
  hour: number,
  description: string,
) {
  try {
    await insertHhRecord(pool, member, type, hour, description);

    const notApprvHh = await getNotApprvHh(pool, member);
    const remaining = await getRemainingHh(pool, member);

    await client.replyMessage(replyToken, {
      type: "text",
      text: `❤️ สร้าง Request hh สำหรับ ${member} สำเร็จ\
      \n🙅‍♂️ ที่ยังไม่ Approve: ${notApprvHh} hours\
      \n🙆‍♂️ ที่ Approve: ${remaining} hours`,
    });
  } catch (error) {
    console.error("Error adding HH record:", error);
    await replyMessage(
      client,
      replyToken,
      `😥 Failed to request new hh for '${member}'`,
    );
  }
}

export async function updateHhApproveFlag(
  pool: Pool,
  client: Client,
  replyToken: string,
  ids: number[],
) {
  try {
    await updateHhApproveFlagRepo(pool, ids);
    await replyMessage(
      client,
      replyToken,
      `✅ Approve request IDs: ${ids.join(", ")} successfully`,
    );
  } catch (error) {
    console.error("Error updating HH approval status:", error);
    await replyMessage(client, replyToken, `❌ Failed to approve HH records.`);
  }
}
