import bodyParser from "body-parser";
import express from "express";
import { WebhookEvent } from "@line/bot-sdk";
import * as dotenv from "dotenv";
import { handleIncomingMessage } from "./handlers/handleIncomingMessage";
import cron from "node-cron";
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
  console.log(req.body.events[0].source);
  const events: WebhookEvent[] = req.body.events;

  // Get GroupID
  const userId = req.body.events[0].source.userId;
  const groupId = req.body.events[0].source.groupId;

  if (
    groupId !== undefined &&
    [
      "Ce79a461bc372cf44eaddb5a01f6fef7e",
      "Ca904965536ee624589ac5c164fd34c88",
    ].includes(groupId)
  ) {
    for (const event of events) {
      if (event.type === "message") {
        handleIncomingMessage(event);
      }
    }
  } else if (
    [
      "Uf4e4f7069ba55bd6242f6ea09b27c346",
      "U9802c8e71544d60ece2056b2405fd894",
    ].includes(userId)
  ) {
    for (const event of events) {
      if (event.type === "message") {
        handleIncomingMessage(event);
      }
    }
  }
  res.sendStatus(200);
});

// Schedule the task to run at 9:30 AM every Monday to Friday
cron.schedule("30 2 * * 1-5", pushMessage);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
