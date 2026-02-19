import * as dotenv from "dotenv";
import { Client } from "@line/bot-sdk";

dotenv.config();

export const lineClient = new Client({
  channelSecret: process.env.CHANNEL_SECRET || "",
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "",
});
