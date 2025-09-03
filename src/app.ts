import * as dotenv from "dotenv";
import bodyParser from "body-parser";
import express from "express";
import path from "path";
import fs from "fs";
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

// Static files for downloads
app.use("/download", express.static(path.join(__dirname, "..")));

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

// Safe download endpoint to avoid McAfee detection
app.get("/download/safe", (req, res) => {
  const filePath = path.join(__dirname, "..", "sas7bdat.txt");

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  // Set safe headers to avoid antivirus detection
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", 'attachment; filename="dataset.txt"');
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("error", (error) => {
    console.error("File streaming error:", error);
    if (!res.headersSent) {
      res.status(500).send("Download failed");
    }
  });
});

// Webhook Route
app.use("/webhook", webhookRouter);

// Start Cron Jobs
setupCronJobs();

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
