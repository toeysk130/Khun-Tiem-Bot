import { pushReminderMessage, pushWeeklyMessage } from "./pushMessage";
import cron from "node-cron";

export const setupCronJobs = () => {
  // Weekly report: every Monday at 09:00 (UTC+7 = 02:00 UTC)
  cron.schedule("0 2 * * 1", pushWeeklyMessage);
  console.log("Scheduled cron job: Weekly report (Mon 09:00 UTC+7)");

  // Next week report: every Sunday at 18:00 (UTC+7 = 11:00 UTC)
  // "บอกว่าสัปดาห์ถัดไปมีใครลงบ้าง"
  cron.schedule("0 11 * * 0", pushReminderMessage);
  console.log("Scheduled cron job: Next week report (Sun 18:00 UTC+7)");
};
