import express, { Request, Response } from "express";
import { WebhookEvent } from "@line/bot-sdk";
import { handleIncomingMessage } from "../handlers/handleIncomingMessage";
import { UserMetaData } from "../configs/interface";

export const webhookRouter = express.Router();

// This route handles incoming messages from the LINE webhook
webhookRouter.post("/", async (req: Request, res: Response) => {
  const events: WebhookEvent[] = req.body.events;

  // If no events in the request, return immediately with 200 OK status
  if (events.length === 0) {
    return res.sendStatus(200);
  }

  const userId = events[0].source.userId || "";
  const groupId = (events[0].source as { groupId?: string }).groupId || "";
  // Determine the type of chat: "GROUP" if both userId and groupId exist, otherwise it's "PERSONAL" (direct message).
  const chatType = userId && groupId ? "GROUP" : "PERSONAL";

  const userMetadata: UserMetaData = {
    chatType,
    userId,
    groupId,
    username: "",
    isAdmin: false,
    replyToken: "",
  };

  // Handle Personal Messages (Direct Messages)
  if (chatType === "PERSONAL" || [process.env.ADMIN_ID].includes(userId)) {
    for (const event of events) {
      if (event.type === "message") {
        await handleIncomingMessage(event, userMetadata);
      }
    }
  }

  // Handle Group Messages, and check if the group ID is valid
  else if (
    chatType === "GROUP" &&
    [process.env.GROUP_ID, process.env.GROUP_ID_ADMIN].includes(groupId)
  ) {
    for (const event of events) {
      if (event.type === "message") {
        await handleIncomingMessage(event, userMetadata);
      }
    }
  }

  // Send 200 OK status after processing
  res.sendStatus(200);
});
