import cron from "node-cron";
import { pushWeeklyMessage } from "./pushMessage";

export const setupCronJobs = () => {
  // Schedule the task to run at 9:30 AM every Monday to Friday
  cron.schedule("0 2 * * 1", pushWeeklyMessage);
  console.log("Scheduled cron job for pushMessage");
};
