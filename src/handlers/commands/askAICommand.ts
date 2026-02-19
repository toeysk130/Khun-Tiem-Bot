import { lineClient } from "../../configs/lineClient";
import { chatWithAI } from "../../services/openaiService";
import { UserMetaData } from "../../types/interface";
import { replyMessage } from "../../utils/sendLineMsg";

export async function handleAskAICommand(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  const question = commandArr.slice(1).join(" ");

  if (!question) {
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      "🤖 ถามอะไรก็ได้นะ!\nตัวอย่าง: ขุนเทียม วันนี้อากาศดีไหม",
    );
    return;
  }

  try {
    const aiReply = await chatWithAI(question);
    await replyMessage(lineClient, userMetaData.replyToken, aiReply);
  } catch (error) {
    console.error("Error in AI command:", error);
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      "❌ ขุนเทียมเชื่อมต่อ AI ไม่ได้ ลองใหม่อีกทีนะ",
    );
  }
}
