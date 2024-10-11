import * as dotenv from "dotenv";
import bodyParser from "body-parser";
import express from "express";
import { webhookRouter } from "./routes/webhook";

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

// Webhook Route
app.use("/webhook", webhookRouter);

// Start Cron Jobs (if needed)
// setupCronJobs();

// Start the server
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
