import { TextEventMessage, WebhookEvent } from "@line/bot-sdk";
import { getMemberByUid } from "../repositories/memberRepository";
import { replyMessage } from "../utils/sendLineMsg";
import { commandDispatcher } from "./commandDispatcher";
import { UserMetaData } from "../types/interface";
import { validBotCommands } from "../configs/constants";
import { pool } from "../configs/database";
import { lineClient } from "../configs/lineClient";

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

  // Check list for valid commands if not then return to prevent exceed resource used
  if (!validBotCommands.includes(command)) return;

  // Fetch user details from the database
  const member = await getMemberByUid(pool, userMetadata.userId);
  const isMemberExist = !!member;

  // If user exists, assign metadata
  if (isMemberExist) {
    userMetadata.username = member.name;
    userMetadata.isAdmin = member.is_admin;
    userMetadata.replyToken = replyToken;
  } else if (command !== "สมัคร") {
    const replyMsg = `You need to register first. Use "สมัคร" followed by your name.`;
    await replyMessage(lineClient, replyToken, replyMsg);
    return;
  }

  // Dispatch command based on user metadata and the command type
  await commandDispatcher(userMetadata, command, commandArr);
}
