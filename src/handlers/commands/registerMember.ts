import { insertMember } from "../../repositories/memberRepository";
import { UserMetaData } from "../../types/interface";
import { replyMessage } from "../../utils/sendLineMsg";
import { lineClient } from "../../configs/lineClient";
import { pool } from "../../configs/database";

export async function handleRegisterCommand(userMetaData: UserMetaData) {
  if (userMetaData.username) {
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `User ${userMetaData.username} มีอยู่ในระบบแล้วครับ`,
    );
  } else {
    try {
      await insertMember(pool, userMetaData.userId, userMetaData.username);
      await replyMessage(
        lineClient,
        userMetaData.replyToken,
        `🥰 Added new member successfully`,
      );
    } catch (error) {
      console.error("Error registering member:", error);
      await replyMessage(
        lineClient,
        userMetaData.replyToken,
        `😥 Failed to add new member`,
      );
    }
  }
}
