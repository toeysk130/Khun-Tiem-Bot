import { pushReminderMessage, pushWeeklyMessage } from "./pushMessage";
import cron from "node-cron";

export const setupCronJobs = () => {
  // Weekly report: every Monday at 09:00 (UTC+7 = 02:00 UTC)
  cron.schedule("0 2 * * 1", pushWeeklyMessage);
  console.log("Scheduled cron job: Weekly report (Mon 09:00 UTC+7)");

  // Daily reminder: every day at 18:00 (UTC+7 = 11:00 UTC)
  // "พรุ่งนี้มีใครลาบ้าง" — sends evening before
  cron.schedule("0 11 * * 0-4", pushReminderMessage);
  console.log("Scheduled cron job: Leave reminder (Sun-Thu 18:00 UTC+7)");
};
