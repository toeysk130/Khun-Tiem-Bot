import { validBotCommands } from "../configs/constants";
import { pool } from "../configs/database";
import { lineClient } from "../configs/lineClient";
import { getMemberByUid } from "../repositories/memberRepository";
import {
  handleConversation,
  hasActiveSession,
} from "../services/conversationService";
import { chatWithAI } from "../services/openaiService";
import { UserMetaData } from "../types/interface";
import { replyMessage } from "../utils/sendLineMsg";
import { commandDispatcher } from "./commandDispatcher";
import { TextEventMessage, WebhookEvent } from "@line/bot-sdk";

export { pool, lineClient };

export async function handleIncomingMessage(
  event: WebhookEvent,
  userMetadata: UserMetaData,
) {
  if (event.type !== "message" || event.message.type !== "text") return;

  const textMessage = event.message as TextEventMessage;
  const receivedText = textMessage.text.trim().toLowerCase();
  const replyToken = event.replyToken;

  const commandArr = receivedText.split(" ");
  const command = commandArr[0];

  // ── 1. Active conversation session → continue AI chat ──
  if (hasActiveSession(userMetadata.userId)) {
    userMetadata.replyToken = replyToken;
    const member = await getMemberByUid(pool, userMetadata.userId);
    if (member) {
      userMetadata.username = member.name;
      userMetadata.isAdmin = member.is_admin;
    }
    await handleConversation(userMetadata.userId, receivedText, userMetadata);
    return;
  }

  // ── 2. "ขุนเทียม" prefix → AI conversation ──
  // Supports: "ขุนเทียม ข้อความ", "ขุนเทียม...ข้อความ", and "ขุนเทียม" alone
  if (receivedText.startsWith("ขุนเทียม")) {
    const member = await getMemberByUid(pool, userMetadata.userId);
    if (!member) return;
    userMetadata.username = member.name;
    userMetadata.isAdmin = member.is_admin;
    userMetadata.replyToken = replyToken;

    // Strip "ขุนเทียม" prefix and any leading whitespace/punctuation
    const afterPrefix = receivedText.slice("ขุนเทียม".length).trim();
    if (afterPrefix.length > 0) {
      await handleConversation(userMetadata.userId, afterPrefix, userMetadata);
    } else {
      // Just "ขุนเทียม" alone — greet
      const greeting = await chatWithAI(
        "ผู้ใช้เรียกชื่อคุณ ช่วยทักทายและบอกว่าสามารถช่วยอะไรได้บ้าง",
      );
      await replyMessage(lineClient, replyToken, `🤖 ${greeting}`);
    }
    return;
  }

  // ── 3. Structured command → normal dispatcher ──
  if (validBotCommands.includes(command)) {
    const member = await getMemberByUid(pool, userMetadata.userId);
    const isMemberExist = !!member;

    if (isMemberExist) {
      userMetadata.username = member.name;
      userMetadata.isAdmin = member.is_admin;
      userMetadata.replyToken = replyToken;
    } else if (command !== "สมัคร") {
      const replyMsg =
        'You need to register first. Use "สมัคร" followed by your name.';
      await replyMessage(lineClient, replyToken, replyMsg);
      return;
    }

    await commandDispatcher(userMetadata, command, commandArr);
    return;
  }

  // ── 4. Unrecognized message from registered member → AI fallback ──
  // The bot will try to understand what the user wants and suggest the correct command
  const member = await getMemberByUid(pool, userMetadata.userId);
  if (!member) return; // ignore messages from unregistered users

  userMetadata.username = member.name;
  userMetadata.isAdmin = member.is_admin;
  userMetadata.replyToken = replyToken;

  const aiReply = await chatWithAI(
    `ผู้ใช้ "${userMetadata.username}" พิมพ์ว่า: "${receivedText}"\nช่วยดูว่าเขาพยายามทำอะไร ถ้าเกี่ยวกับคำสั่งของ Bot ให้แนะนำคำสั่งที่ถูกต้อง ถ้าไม่เกี่ยวก็ตอบตามปกติ`,
  );
  await replyMessage(lineClient, replyToken, `🤖 ${aiReply}`);
}
