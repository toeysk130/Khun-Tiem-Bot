import * as dotenv from "dotenv";
import bodyParser from "body-parser";
import express from "express";
import { webhookRouter } from "./routes/webhook";
import { setupCronJobs } from "./cron/cronJobs";
import { pushWeeklyMessage } from "./cron/pushMessage";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3333;

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.raw({ type: "application/vnd.custom-type" }));
app.use(bodyParser.text({ type: "text/html" }));

// Routes
app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get("/cron", async (req, res) => {
  try {
    // Call the function that pushes the weekly message
    await pushWeeklyMessage();

    // Send a response to acknowledge the request
    res.status(200).send("Weekly message sent successfully.");
  } catch (error) {
    console.error("Error during weekly message push:", error);
    res.status(500).send("Error sending weekly message.");
  }
});

// Webhook Route
app.use("/webhook", webhookRouter);

// Start Cron Jobs
setupCronJobs();

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
