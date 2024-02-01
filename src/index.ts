import bodyParser from "body-parser";
import express from "express";
import { WebhookEvent } from "@line/bot-sdk";
import * as dotenv from "dotenv";
import { handleIncomingMessage } from "./handleIncomingMessage";
import cron from "node-cron";
import { pushMessage } from "./pushMessage";

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

  for (const event of events) {
    if (event.type === "message") {
      handleIncomingMessage(event);
    }
  }
  res.sendStatus(200);
});

// Schedule the task to run at 9:30 AM every Monday to Friday
cron.schedule("30 9 * * 1-5", pushMessage);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
