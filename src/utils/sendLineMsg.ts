import { Client } from "@line/bot-sdk";

export async function pushMsg(client: Client, replyToken: string, msg: string) {
  await client.replyMessage(replyToken, {
    type: "text",
    text: msg,
  });
}
