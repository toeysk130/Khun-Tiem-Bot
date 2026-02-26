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
import {
  saveChatMessage,
  getChatMessageById,
} from "../repositories/chatMessageRepository";

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

  // 0. Save incoming message to DB
  await saveChatMessage({
    lineUserId: userMetadata.userId,
    messageId: textMessage.id,
    quoteToken: textMessage.quoteToken || null,
    textContent: receivedText,
    senderRole: "user",
  });

  // Check if user quoted an old message
  let quotedText: string | null = null;
  if (textMessage.quotedMessageId) {
    const quotedMsg = await getChatMessageById(textMessage.quotedMessageId);
    if (quotedMsg && quotedMsg.textContent) {
      quotedText = quotedMsg.textContent;
    }
  }

  // ── 1. Active conversation session → continue AI chat ──
  if (hasActiveSession(userMetadata.userId)) {
    userMetadata.replyToken = replyToken;
    const member = await getMemberByUid(pool, userMetadata.userId);
    if (member) {
      userMetadata.username = member.name;
      userMetadata.isAdmin = member.is_admin;
    }
    await handleConversation(
      userMetadata.userId,
      receivedText,
      userMetadata,
      quotedText,
      textMessage.quoteToken,
    );
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
      await handleConversation(
        userMetadata.userId,
        afterPrefix,
        userMetadata,
        quotedText,
        textMessage.quoteToken,
      );
    } else {
      // Just "ขุนเทียม" alone — greet
      let prompt =
        "ผู้ใช้เรียกชื่อคุณ ช่วยทักทายและบอกว่าสามารถช่วยอะไรได้บ้าง";
      if (quotedText)
        prompt += `\n(ผู้ใช้ได้ตอบกลับข้อความเดิมของคุณว่า: "${quotedText}")`;

      const greeting = await chatWithAI(prompt);
      await replyMessage(
        lineClient,
        replyToken,
        `🤖 ${greeting}`,
        textMessage.quoteToken,
      );
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

  // ── 4. Unrecognized message from registered member ──
  // Do nothing to save tokens if it's not a command and not prefixed with "ขุนเทียม"
}
