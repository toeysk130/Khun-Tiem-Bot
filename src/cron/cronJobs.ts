import cron from "node-cron";
import { pushMessage } from "../API/pushMessage";

export const setupCronJobs = () => {
  // Schedule the task to run at 9:30 AM every Monday to Friday
  cron.schedule("30 2 * * 1-5", pushMessage);
  console.log("Scheduled cron job for pushMessage");
};
