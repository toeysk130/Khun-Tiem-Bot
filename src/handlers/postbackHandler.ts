import { lineClient } from "../configs/lineClient";
import { replyMessage } from "../utils/sendLineMsg";
import { executeDelete } from "./commands/deleteRequest";
import { PostbackEvent } from "@line/bot-sdk";

export async function handlePostbackEvent(event: PostbackEvent) {
  const replyToken = event.replyToken;
  const data = event.postback.data;

  // Parse postback data (format: "action=xxx&id=yyy")
  const params = new URLSearchParams(data);
  const action = params.get("action");
  const id = params.get("id");

  switch (action) {
    case "delete":
      if (id) {
        await executeDelete(replyToken, id);
      }
      break;

    case "cancel_delete":
      await replyMessage(lineClient, replyToken, "❌ ยกเลิกการลบเรียบร้อย");
      break;

    default:
      console.warn(`Unknown postback action: ${action}`);
      break;
  }
}
