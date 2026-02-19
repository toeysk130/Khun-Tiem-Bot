import { Client } from "@line/bot-sdk";

export async function replyMessage(
  client: Client,
  replyToken: string,
  msg: string,
) {
  await client.replyMessage(replyToken, {
    type: "text",
    text: msg,
  });
}

// Alias for backward compatibility during migration
export const pushMsg = replyMessage;
