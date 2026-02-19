import { handleIncomingMessage } from "../handlers/handleIncomingMessage";
import { handlePostbackEvent } from "../handlers/postbackHandler";
import { commandQueue } from "../queue/commandQueue";
import { UserMetaData } from "../types/interface";
import { WebhookEvent } from "@line/bot-sdk";
import express, { Request, Response } from "express";

export const webhookRouter = express.Router();

webhookRouter.post("/", async (req: Request, res: Response) => {
  const events: WebhookEvent[] = req.body.events;

  if (events.length === 0) {
    return res.sendStatus(200);
  }

  // Respond 200 OK immediately to prevent LINE timeout
  res.sendStatus(200);

  const userId = events[0].source.userId || "";
  const groupId = (events[0].source as { groupId?: string }).groupId || "";
  const chatType = userId && groupId ? "GROUP" : "PERSONAL";

  const userMetadata: UserMetaData = {
    chatType,
    userId,
    groupId,
    username: "",
    isAdmin: false,
    replyToken: "",
  };

  // Handle Personal Messages
  if (chatType === "PERSONAL" || [process.env.ADMIN_ID].includes(userId)) {
    for (const event of events) {
      if (event.type === "message") {
        commandQueue
          .enqueue(async () => {
            await handleIncomingMessage(event, { ...userMetadata });
          })
          .catch((error) => {
            console.error("Error processing queued command:", error);
          });
      } else if (event.type === "postback") {
        commandQueue
          .enqueue(async () => {
            await handlePostbackEvent(event);
          })
          .catch((error) => {
            console.error("Error processing postback:", error);
          });
      }
    }
  }

  // Handle Group Messages
  else if (
    chatType === "GROUP" &&
    [process.env.GROUP_ID, process.env.GROUP_ID_ADMIN].includes(groupId)
  ) {
    for (const event of events) {
      if (event.type === "message") {
        commandQueue
          .enqueue(async () => {
            await handleIncomingMessage(event, { ...userMetadata });
          })
          .catch((error) => {
            console.error("Error processing queued command:", error);
          });
      } else if (event.type === "postback") {
        commandQueue
          .enqueue(async () => {
            await handlePostbackEvent(event);
          })
          .catch((error) => {
            console.error("Error processing postback:", error);
          });
      }
    }
  }
});
