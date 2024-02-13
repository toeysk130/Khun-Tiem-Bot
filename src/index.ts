import * as dotenv from "dotenv";
import cron from "node-cron";
import bodyParser from "body-parser";
import express from "express";
import { WebhookEvent } from "@line/bot-sdk";
import { handleIncomingMessage } from "./handlers/handleIncomingMessage";
import { pushMessage } from "./API/pushMessage";

// Setup
dotenv.config();
const app = express();
const port = process.env.PORT || 3333;

app.use(bodyParser.json());
app.use(bodyParser.raw({ type: "application/vnd.custom-type" }));
app.use(bodyParser.text({ type: "text/html" }));

// ------

app.post("/webhook", async (req, res) => {
  const events: WebhookEvent[] = req.body.events;

  if (req.body.events.length === 0) return res.sendStatus(200);

  // Get GroupID
  const userId = req.body.events[0].source.userId;
  const groupId = req.body.events[0].source.groupId;

  if (
    groupId !== undefined &&
    [process.env.GROUP_ID, process.env.GROUP_ID_ADMIN].includes(groupId)
  ) {
    for (const event of events) {
      if (event.type === "message") {
        handleIncomingMessage(event);
      }
    }
    // Allow Only Admin ID to access personal bot chat
  } else if ([process.env.ADMIN_ID].includes(userId)) {
    for (const event of events) {
      if (event.type === "message") {
        handleIncomingMessage(event);
      }
    }
  }
  res.sendStatus(200);
});

// Schedule the task to run at 9:30 AM every Monday to Friday
// cron.schedule("30 2 * * 1-5", pushMessage);

app.listen(port, async () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
