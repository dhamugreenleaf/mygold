import webpush from 'web-push';
import { User, PushSubscription, Notification } from '../models/index.js';
import { getLatestGoldRates } from './goldRate.service.js';
import { getAllPurchasesWithMetrics } from './purchase.service.js';

// Configure Web Push with VAPID Credentials
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@mygold.greenleafagencies.com';
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BAIVCWF8sQd0FW_ShJbTeo7HyxA_EW_J9gdz2veIPX91Y20wJPHybTxFIHpw2F81QOuo3zuxYKIkCaIf9G3K7nM';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'IORN6Rzv51Xg5yDAO4Pjtz1CDBRK9IyFG3r4oxuGy50';

try {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} catch (vapidErr) {
  console.warn('[Push Notification] VAPID initialization note:', vapidErr.message);
}

export const getVapidPublicKey = () => {
  return vapidPublicKey;
};

export const getTodayDateIST = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
};

/**
 * Save or update a Push Subscription for a user
 */
export const saveSubscription = async (userId, subscriptionData, userAgent = '') => {
  if (!userId || !subscriptionData || !subscriptionData.endpoint) {
    throw new Error('User ID and valid subscription endpoint are required.');
  }

  const endpoint = subscriptionData.endpoint;
  const p256dh = subscriptionData.keys?.p256dh || '';
  const auth = subscriptionData.keys?.auth || '';

  if (!p256dh || !auth) {
    throw new Error('Push subscription keys (p256dh and auth) are required.');
  }

  let sub = await PushSubscription.findOne({ where: { endpoint } });

  if (sub) {
    sub.user_id = userId;
    sub.p256dh = p256dh;
    sub.auth = auth;
    sub.user_agent = userAgent;
    sub.is_active = true;
    await sub.save();
  } else {
    sub = await PushSubscription.create({
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
      is_active: true,
    });
  }

  return sub;
};

/**
 * Unsubscribe / Deactivate a Push Subscription
 */
export const removeSubscription = async (userId, endpoint = null) => {
  if (!userId) return false;

  if (endpoint) {
    await PushSubscription.destroy({ where: { user_id: userId, endpoint } });
  } else {
    await PushSubscription.destroy({ where: { user_id: userId } });
  }
  return true;
};

/**
 * Toggle user notification preference ON/OFF
 */
export const toggleUserNotification = async (userId, enabled) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found.');

  user.notifications_enabled = !!enabled;
  await user.save();

  return { notifications_enabled: user.notifications_enabled };
};

/**
 * Get user notification preference & subscription status
 */
export const getUserNotificationStatus = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found.');

  const activeSubCount = await PushSubscription.count({
    where: { user_id: userId, is_active: true },
  });

  return {
    notifications_enabled: user.notifications_enabled !== false,
    has_active_subscription: activeSubCount > 0,
  };
};

/**
 * Send Web Push notification to a specific subscription
 */
export const sendPushToSubscription = async (subscription, payload) => {
  const pushConfig = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  const payloadString = JSON.stringify({
    title: payload.title || 'MyGold Update',
    body: payload.body || 'Check your bullion rates and assets on MyGold.',
    icon: payload.icon || '/favicon.svg',
    badge: payload.badge || '/favicon.svg',
    url: payload.url || '/',
    data: {
      url: payload.url || '/',
      timestamp: Date.now(),
      ...payload.data,
    },
  });

  try {
    await webpush.sendNotification(pushConfig, payloadString);
    return { success: true };
  } catch (error) {
    // If subscription is 404 or 410 (Gone/Unregistered), deactivate it cleanly
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.log(`[Push Notification] Deactivating expired subscription ID: ${subscription.id}`);
      subscription.is_active = false;
      await subscription.save().catch(() => {});
    } else {
      console.error(`[Push Notification Error] Sub ID ${subscription.id}:`, error.message);
    }
    return { success: false, error: error.message };
  }
};

/**
 * 1. Morning Notification: 9:00 AM IST
 * Title: 🌅 Morning Gold Rate
 * Content: Chennai live reference rates are updated. Check today's gold & silver prices on MyGold.
 */
export const sendMorningDailyNotification = async () => {
  const todayIST = getTodayDateIST();
  console.log(`[Notification Scheduler] Starting Morning Rate Dispatch for ${todayIST}...`);

  try {
    let rate24KFormatted = '';
    try {
      const rates = await getLatestGoldRates();
      if (rates?.rate24K) {
        rate24KFormatted = ` (24K: ₹${Number(rates.rate24K).toLocaleString('en-IN')}/g)`;
      }
    } catch (e) {
      console.warn('[Notification Scheduler] Could not fetch live rate for morning notification:', e.message);
    }

    const title = '🌅 Morning Gold Rate';
    const body = `Chennai live reference rates are updated${rate24KFormatted}. Check today's gold & silver prices on MyGold.`;
    const url = '/gold-rates';

    // 1. Create In-App Notification record for ALL active users
    const activeUsers = await User.findAll({
      where: {
        is_active: true,
        notifications_enabled: true,
      },
    });

    for (const u of activeUsers) {
      await createInAppNotification(u.id, {
        title,
        message: body,
        type: 'rate',
        url,
      }).catch(() => {});
    }

    // 2. Dispatch Web Push to active device subscriptions
    const subscriptions = await PushSubscription.findAll({
      where: {
        is_active: true,
      },
      include: [
        {
          model: User,
          as: 'user',
          where: {
            is_active: true,
            notifications_enabled: true,
          },
        },
      ],
    });

    let sentCount = 0;
    for (const sub of subscriptions) {
      if (sub.last_morning_sent_date === todayIST) continue; // Idempotent check

      const res = await sendPushToSubscription(sub, { title, body, url });
      if (res.success) {
        sub.last_morning_sent_date = todayIST;
        await sub.save().catch(() => {});
        sentCount++;
      }
    }

    console.log(`[Notification Scheduler] Morning dispatch completed. Push sent: ${sentCount}, In-app created: ${activeUsers.length}`);
    return { success: true, count: sentCount, inAppCount: activeUsers.length };
  } catch (error) {
    console.error('[Notification Scheduler Error] Morning notification failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * 2. Afternoon Notification: 1:00 PM IST
 * Title: 📊 Your Gold Update
 * Content: Estimated profit/loss or asset guidance
 */
export const sendAfternoonDailyNotification = async () => {
  const todayIST = getTodayDateIST();
  console.log(`[Notification Scheduler] Starting Afternoon Asset Dispatch for ${todayIST}...`);

  try {
    // 1. Create In-App Notification record for ALL active users
    const activeUsers = await User.findAll({
      where: {
        is_active: true,
        notifications_enabled: true,
      },
    });

    for (const u of activeUsers) {
      let userBody = "Add your gold or silver assets to start tracking their estimated value.";
      try {
        const metrics = await getAllPurchasesWithMetrics(u.id);
        const purchases = metrics?.purchases || [];
        const summary = metrics?.summary;

        if (purchases.length > 0 && summary) {
          const profitLoss = Math.round(Number(summary.total_profit_loss) || 0);
          if (profitLoss >= 0) {
            userBody = `Your tracked gold assets are currently estimated at +₹${profitLoss.toLocaleString('en-IN')} profit. Check MyGold for details.`;
          } else {
            userBody = `Your tracked gold assets are currently estimated at -₹${Math.abs(profitLoss).toLocaleString('en-IN')}. Check MyGold for details.`;
          }
        }
      } catch (err) {}

      await createInAppNotification(u.id, {
        title: '📊 Your Gold Update',
        message: userBody,
        type: 'portfolio',
        url: '/my-gold',
      }).catch(() => {});
    }

    // 2. Dispatch Web Push
    const subscriptions = await PushSubscription.findAll({
      where: {
        is_active: true,
      },
      include: [
        {
          model: User,
          as: 'user',
          where: {
            is_active: true,
            notifications_enabled: true,
          },
        },
      ],
    });

    let sentCount = 0;
    for (const sub of subscriptions) {
      if (sub.last_afternoon_sent_date === todayIST) continue; // Idempotent check

      let body = "Add your gold or silver assets to start tracking their estimated value.";
      try {
        const metrics = await getAllPurchasesWithMetrics(sub.user_id);
        const purchases = metrics?.purchases || [];
        const summary = metrics?.summary;

        if (purchases.length > 0 && summary) {
          const profitLoss = Math.round(Number(summary.total_profit_loss) || 0);
          if (profitLoss >= 0) {
            body = `Your tracked gold assets are currently estimated at +₹${profitLoss.toLocaleString('en-IN')} profit. Check MyGold for details.`;
          } else {
            body = `Your tracked gold assets are currently estimated at -₹${Math.abs(profitLoss).toLocaleString('en-IN')}. Check MyGold for details.`;
          }
        }
      } catch (err) {
        console.warn(`[Notification Scheduler] User ${sub.user_id} metrics calculation note:`, err.message);
      }

      const title = '📊 Your Gold Update';
      const url = '/my-gold';

      const res = await sendPushToSubscription(sub, { title, body, url });
      if (res.success) {
        sub.last_afternoon_sent_date = todayIST;
        await sub.save().catch(() => {});
        sentCount++;
      }
    }

    console.log(`[Notification Scheduler] Afternoon dispatch completed. Sent: ${sentCount}`);
    return { success: true, count: sentCount };
  } catch (error) {
    console.error('[Notification Scheduler Error] Afternoon notification failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * 3. Evening Notification: 6:30 PM IST
 * Title: 🌆 Evening Gold Rate
 * Content: Today's Chennai gold & silver reference rates have been updated. Check the latest rates on MyGold.
 */
export const sendEveningDailyNotification = async () => {
  const todayIST = getTodayDateIST();
  console.log(`[Notification Scheduler] Starting Evening Rate Dispatch for ${todayIST}...`);

  try {
    const title = '🌆 Evening Gold Rate';
    const body = "Today's Chennai gold & silver reference rates have been updated. Check the latest rates on MyGold.";
    const url = '/gold-rates';

    // 1. Create In-App Notification for ALL active users
    const activeUsers = await User.findAll({
      where: {
        is_active: true,
        notifications_enabled: true,
      },
    });

    for (const u of activeUsers) {
      await createInAppNotification(u.id, {
        title,
        message: body,
        type: 'rate',
        url,
      }).catch(() => {});
    }

    // 2. Dispatch Web Push
    const subscriptions = await PushSubscription.findAll({
      where: {
        is_active: true,
      },
      include: [
        {
          model: User,
          as: 'user',
          where: {
            is_active: true,
            notifications_enabled: true,
          },
        },
      ],
    });

    let sentCount = 0;
    for (const sub of subscriptions) {
      if (sub.last_evening_sent_date === todayIST) continue; // Idempotent check

      const res = await sendPushToSubscription(sub, { title, body, url });
      if (res.success) {
        sub.last_evening_sent_date = todayIST;
        await sub.save().catch(() => {});
        sentCount++;
      }
    }

    console.log(`[Notification Scheduler] Evening dispatch completed. Sent: ${sentCount}`);
    return { success: true, count: sentCount };
  } catch (error) {
    console.error('[Notification Scheduler Error] Evening notification failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Create an in-app notification for a specific user
 */
export const createInAppNotification = async (userId, { title, message, type = 'system', url = '/' }) => {
  if (!userId || !title || !message) return null;
  return await Notification.create({
    user_id: userId,
    title,
    message,
    type,
    url,
    is_read: false,
  });
};

/**
 * Retrieve user's in-app notification history and unread count
 */
export const getUserNotifications = async (userId, limit = 50) => {
  if (!userId) throw new Error('User ID is required.');

  const notifications = await Notification.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    limit,
  });

  const unreadCount = await Notification.count({
    where: { user_id: userId, is_read: false },
  });

  return {
    notifications,
    unread_count: unreadCount,
    total_count: notifications.length,
  };
};

/**
 * Mark all notifications as read for a specific user
 */
export const markAllNotificationsAsRead = async (userId) => {
  if (!userId) throw new Error('User ID is required.');

  await Notification.update(
    { is_read: true },
    { where: { user_id: userId, is_read: false } }
  );

  return { success: true };
};

/**
 * Mark single notification as read
 */
export const markNotificationAsRead = async (userId, notificationId) => {
  if (!userId || !notificationId) throw new Error('User ID and Notification ID are required.');

  await Notification.update(
    { is_read: true },
    { where: { id: notificationId, user_id: userId } }
  );

  return { success: true };
};

/**
 * Clear all notifications for a specific user
 */
export const clearAllNotifications = async (userId) => {
  if (!userId) throw new Error('User ID is required.');

  await Notification.destroy({
    where: { user_id: userId },
  });

  return { success: true };
};

export default {
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
  toggleUserNotification,
  getUserNotificationStatus,
  sendPushToSubscription,
  sendMorningDailyNotification,
  sendAfternoonDailyNotification,
  sendEveningDailyNotification,
  createInAppNotification,
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  clearAllNotifications,
};
