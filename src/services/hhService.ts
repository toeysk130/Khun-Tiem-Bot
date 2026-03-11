import {
  deleteHhById,
  getHhById,
  getNotApprvHh,
  getRemainingHh,
  insertHhRecord,
  updateHhApproveFlagRepo,
} from "../repositories/happyHour";
import { buildResultBubble } from "../utils/flexMessage";
import { replyFlexMessage, replyMessage } from "../utils/sendLineMsg";
import { Client } from "@line/bot-sdk";
import { Pool } from "pg";

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

    const flex = buildResultBubble("hh", `HH สำหรับ ${member}`, [
      { label: "📝 ประเภท", value: `${type} ${hour}h` },
      { label: "📋 เหตุผล", value: description || "-" },
      { label: "🙅‍♂️ รอ Approve", value: `${notApprvHh}h`, color: "#F39C12" },
      { label: "🙆‍♂️ Approved", value: `${remaining}h`, color: "#27AE60" },
    ]);
    await replyFlexMessage(client, replyToken, flex);
  } catch (error) {
    console.error("Error adding HH record:", error);
    await replyMessage(
      client,
      replyToken,
      "😥 เกิดข้อผิดพลาดขณะเพิ่ม Happy Hour กรุณาลองใหม่",
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
    const flex = buildResultBubble("success", "อนุมัติ Happy Hour", [
      { label: "🔢 IDs", value: ids.join(", ") },
      { label: "📊 จำนวน", value: `${ids.length} รายการ` },
    ]);
    await replyFlexMessage(client, replyToken, flex);
  } catch (error) {
    console.error("Error updating HH approval status:", error);
    await replyMessage(client, replyToken, "❌ เกิดข้อผิดพลาดขณะอนุมัติ HH");
  }
}

export async function deleteHhRecord(
  pool: Pool,
  client: Client,
  replyToken: string,
  id: string,
) {
  try {
    const record = await getHhById(pool, id);
    await deleteHhById(pool, id);

    const remaining = await getRemainingHh(pool, record.member);

    const flex = buildResultBubble("success", `ลบ HH <${id}> สำเร็จ`, [
      { label: "👤 ชื่อ", value: record.member },
      { label: "📝 ประเภท", value: `${record.type} ${record.hours}h` },
      { label: "📋 เหตุผล", value: record.description || "-" },
      { label: "❤️ HH คงเหลือ", value: `${remaining}h`, color: "#27AE60" },
    ]);
    await replyFlexMessage(client, replyToken, flex);
  } catch (error) {
    console.error("Error deleting HH record:", error);
    await replyMessage(
      client,
      replyToken,
      "❌ เกิดข้อผิดพลาดขณะลบ Happy Hour กรุณาลองใหม่",
    );
  }
}
