import * as dotenv from "dotenv";
import pg from "pg";
import { Client, TextEventMessage, WebhookEvent } from "@line/bot-sdk";
import { getMemberDetails } from "../API/leaveScheduleAPI";
import { validBotCommands } from "../config/config";
import { pushMsg } from "../utils/sendLineMsg";
import { commandDispatcher } from "./commandDispatcher";
import { UserMetaData } from "../config/interface";

dotenv.config();

export const pool = new pg.Pool();
export const client = new Client({
  channelSecret: process.env.CHANNEL_SECRET || "",
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "",
});

// --
export async function handleIncomingMessage(
  event: WebhookEvent,
  userMetadata: UserMetaData
) {
  console.log(" called handleIncomingMessage");
  if (event.type !== "message" || event.message.type !== "text") return;

  const textMessage = event.message as TextEventMessage;
  const receivedText = textMessage.text.trim().toLowerCase();
  const replyToken = event.replyToken;

  const commandArr = receivedText.split(" ");
  const command = commandArr[0];

  // Check list for valid commands if not then return to prevent exceed resource used
  if (!validBotCommands.includes(command)) return;

  // Query DB to get username
  const member = await getMemberDetails(pool, userMetadata.userId);
  const isMemberExist = typeof member !== "undefined";

  userMetadata.username = member.name;
  userMetadata.isAdmin = member.is_admin;

  console.log(userMetadata);

  // If user is not registered yet and tries a command that requires membership, ignore the request.
  if (!isMemberExist && command !== "สมัคร") {
    const replyMessage = `You need to register first. Use "สมัคร" followed by your name.`;
    await pushMsg(client, replyToken, replyMessage);
    return;
  }

  await commandDispatcher(userMetadata, command, commandArr, replyToken);
}
