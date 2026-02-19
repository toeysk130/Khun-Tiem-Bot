import { pool } from "../../configs/database";
import { lineClient } from "../../configs/lineClient";
import { deleteMemberByName } from "../../repositories/memberRepository";
import { UserMetaData } from "../../types/interface";
import { replyMessage } from "../../utils/sendLineMsg";

export async function handleDeleteMemberCommand(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  // Admin only — secret command
  if (!userMetaData.isAdmin) {
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      "⛔ คำสั่งนี้สำหรับ Admin เท่านั้น",
    );
    return;
  }

  // ลบสมาชิก <ชื่อ>
  if (commandArr.length < 2) {
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      "⚠️ กรุณาระบุชื่อสมาชิก\nตัวอย่าง: ลบสมาชิก สมชาย",
    );
    return;
  }

  const memberName = commandArr.slice(1).join(" ");

  try {
    const deleted = await deleteMemberByName(pool, memberName);

    if (deleted) {
      await replyMessage(
        lineClient,
        userMetaData.replyToken,
        `✅ ลบสมาชิก "${memberName}" เรียบร้อยแล้ว`,
      );
    } else {
      await replyMessage(
        lineClient,
        userMetaData.replyToken,
        `⚠️ ไม่พบสมาชิกชื่อ "${memberName}"`,
      );
    }
  } catch (error) {
    console.error("Error deleting member:", error);
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      "❌ เกิดข้อผิดพลาด กรุณาลองใหม่",
    );
  }
}
