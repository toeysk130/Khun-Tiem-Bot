import { validBotCommands } from "../configs/constants";
import { pool } from "../configs/database";
import { lineClient } from "../configs/lineClient";
import { getMemberByUid } from "../repositories/memberRepository";
import {
  handleConversation,
  hasActiveSession,
} from "../services/conversationService";
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
  // (auto-detect by userId, no prefix needed)
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

  // ── 2. "ขุนเทียม" prefix → try AI conversation for natural language ──
  // Only triggers GPT when user explicitly says "ขุนเทียม ..."
  if (command === "ขุนเทียม" && commandArr.length > 1) {
    const member = await getMemberByUid(pool, userMetadata.userId);
    if (!member) return;
    userMetadata.username = member.name;
    userMetadata.isAdmin = member.is_admin;
    userMetadata.replyToken = replyToken;

    // Strip "ขุนเทียม" prefix and send the actual content to AI
    const naturalText = commandArr.slice(1).join(" ");
    await handleConversation(userMetadata.userId, naturalText, userMetadata);
    return;
  }

  // ── 3. Structured command → normal dispatcher ──
  if (!validBotCommands.includes(command)) return;

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
}
