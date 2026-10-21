import cron from 'node-cron';
import {
  sendMorningDailyNotification,
  sendAfternoonDailyNotification,
  sendEveningDailyNotification,
} from '../services/notification.service.js';

let isInitialized = false;

/**
 * Initialize daily scheduled notification jobs with Asia/Kolkata timezone.
 * Idempotent: Can only be initialized once per process lifecycle to prevent duplicates.
 */
export const initDailyNotificationCron = () => {
  if (isInitialized) {
    console.log('[Cron] Daily notification cron already initialized. Skipping duplicate registration.');
    return;
  }

  isInitialized = true;
  const cronOptions = {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  };

  // 1. Morning Notification: 9:00 AM IST
  cron.schedule('0 9 * * *', async () => {
    console.log('[Cron Trigger] Executing 9:00 AM IST Morning Rate Notification...');
    try {
      await sendMorningDailyNotification();
    } catch (err) {
      console.error('[Cron Error] Morning notification failed:', err.message);
    }
  }, cronOptions);

  // 2. Afternoon Notification: 1:00 PM IST (13:00)
  cron.schedule('0 13 * * *', async () => {
    console.log('[Cron Trigger] Executing 1:00 PM IST Afternoon Asset Profit/Loss Notification...');
    try {
      await sendAfternoonDailyNotification();
    } catch (err) {
      console.error('[Cron Error] Afternoon notification failed:', err.message);
    }
  }, cronOptions);

  // 3. Evening Notification: 6:30 PM IST (18:30)
  cron.schedule('30 18 * * *', async () => {
    console.log('[Cron Trigger] Executing 6:30 PM IST Evening Rate Notification...');
    try {
      await sendEveningDailyNotification();
    } catch (err) {
      console.error('[Cron Error] Evening notification failed:', err.message);
    }
  }, cronOptions);

  console.log('⏰ [Cron] Daily notification schedules registered (9:00 AM, 1:00 PM, 6:30 PM IST).');
};

export default initDailyNotificationCron;
