import { lineClient } from "../../configs/lineClient";
import {
  AIMode,
  chatWithAI,
  getAIMode,
  setAIMode,
} from "../../services/openaiService";
import { UserMetaData } from "../../types/interface";
import { replyMessage } from "../../utils/sendLineMsg";

const VALID_MODES: AIMode[] = ["สุภาพ", "ก้าวร้าว"];

const MODE_EMOJIS: Record<AIMode, string> = {
  สุภาพ: "😊",
  ก้าวร้าว: "😈",
};

export async function handleModeCommand(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  if (commandArr.length < 2) {
    const current = getAIMode();
    return replyMessage(
      lineClient,
      userMetaData.replyToken,
      `${MODE_EMOJIS[current]} โหมดปัจจุบัน: ${current}\n\nเปลี่ยนโหมดได้:\n• โหมด สุภาพ 😊\n• โหมด ก้าวร้าว 😈`,
    );
  }

  const requestedMode = commandArr[1] as AIMode;

  if (!VALID_MODES.includes(requestedMode)) {
    return replyMessage(
      lineClient,
      userMetaData.replyToken,
      `⚠️ โหมดไม่ถูกต้อง เลือกได้: สุภาพ หรือ ก้าวร้าว`,
    );
  }

  setAIMode(requestedMode);

  // Let AI announce the mode change in its new personality
  const announcement = await chatWithAI(
    `คุณเพิ่งถูกเปลี่ยนเป็นโหมด "${requestedMode}" แนะนำตัวใหม่ให้ทุกคนรู้จักหน่อยว่าตอนนี้คุณเป็นแบบไหน พูดสั้นๆ 1-2 บรรทัด`,
  );

  await replyMessage(
    lineClient,
    userMetaData.replyToken,
    `${MODE_EMOJIS[requestedMode]} เปลี่ยนเป็นโหมด "${requestedMode}" แล้ว!\n\n${announcement}`,
  );
}
