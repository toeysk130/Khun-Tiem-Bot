import { Client, FlexMessage, Message } from "@line/bot-sdk";

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

export async function replyFlexMessage(
  client: Client,
  replyToken: string,
  flexMessage: FlexMessage,
) {
  await client.replyMessage(replyToken, flexMessage);
}

export async function replyMessages(
  client: Client,
  replyToken: string,
  messages: Message[],
) {
  await client.replyMessage(replyToken, messages);
}

// Alias for backward compatibility
export const pushMsg = replyMessage;
