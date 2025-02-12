import * as dotenv from "dotenv";
import pg from "pg";
import { Client, TextEventMessage, WebhookEvent } from "@line/bot-sdk";
import { getMemberDetails } from "../API/leaveScheduleAPI";
import { pushMsg } from "../utils/sendLineMsg";
import { commandDispatcher } from "./commandDispatcher";
import { UserMetaData } from "../types/interface";
import { validBotCommands } from "../configs/constants";

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
  console.log(
    ":::::::::::::::::::::::::::::::::::::: called handleIncomingMessage"
  );
  if (event.type !== "message" || event.message.type !== "text") return;

  const textMessage = event.message as TextEventMessage;
  const receivedText = textMessage.text.trim().toLowerCase();
  const replyToken = event.replyToken;

  const commandArr = receivedText.split(" ");
  const command = commandArr[0];

  // Check list for valid commands if not then return to prevent exceed resource used
  if (!validBotCommands.includes(command)) return;

  // Fetch user details from the database
  const member = await getMemberDetails(pool, userMetadata.userId);
  const isMemberExist = !!member;

  // If user exists, assign metadata
  if (isMemberExist) {
    userMetadata.username = member.name;
    userMetadata.isAdmin = member.is_admin;
    userMetadata.replyToken = replyToken;
  } else if (command !== "สมัคร") {
    // If user is not registered and is trying a non-registration command
    const replyMessage = `You need to register first. Use "สมัคร" followed by your name.`;
    await pushMsg(client, replyToken, replyMessage);
    return;
  }

  console.log("User Metadata: ", userMetadata);
  console.log("receivedText:", receivedText);

  // Dispatch command based on user metadata and the command type
  await commandDispatcher(userMetadata, command, commandArr);
}
