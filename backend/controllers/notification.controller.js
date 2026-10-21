import {
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
  toggleUserNotification,
  getUserNotificationStatus,
  sendPushToSubscription,
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  clearAllNotifications,
} from '../services/notification.service.js';
import { PushSubscription } from '../models/index.js';

export const getVapidKey = async (req, res) => {
  try {
    const key = getVapidPublicKey();
    return res.status(200).json({
      success: true,
      data: { publicKey: key },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve VAPID key.',
      error: error.message,
    });
  }
};

export const getStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await getUserNotificationStatus(userId);
    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notification status.',
      error: error.message,
    });
  }
};

export const subscribe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscription } = req.body;
    const userAgent = req.headers['user-agent'] || '';

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Valid subscription object is required.',
      });
    }

    const saved = await saveSubscription(userId, subscription, userAgent);

    return res.status(200).json({
      success: true,
      message: 'Push subscription registered successfully.',
      data: { id: saved.id },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to save push subscription.',
      error: error.message,
    });
  }
};

export const unsubscribe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { endpoint } = req.body;

    await removeSubscription(userId, endpoint);

    return res.status(200).json({
      success: true,
      message: 'Push subscription removed successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to remove push subscription.',
      error: error.message,
    });
  }
};

export const toggle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { enabled } = req.body;

    const result = await toggleUserNotification(userId, enabled);

    return res.status(200).json({
      success: true,
      message: `Notifications ${result.notifications_enabled ? 'enabled' : 'disabled'} successfully.`,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle notification setting.',
      error: error.message,
    });
  }
};

export const testNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const activeSub = await PushSubscription.findOne({
      where: { user_id: userId, is_active: true },
    });

    if (!activeSub) {
      return res.status(404).json({
        success: false,
        message: 'No active push subscription found for this device.',
      });
    }

    const sendRes = await sendPushToSubscription(activeSub, {
      title: '✨ MyGold Notification Test',
      body: 'Notifications are working perfectly on this device!',
      url: '/profile',
    });

    return res.status(200).json({
      success: sendRes.success,
      message: sendRes.success ? 'Test notification sent.' : 'Failed to send test notification.',
      error: sendRes.error,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error sending test notification.',
      error: error.message,
    });
  }
};

/**
 * Get in-app notifications for the authenticated user
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await getUserNotifications(userId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load notifications.',
      error: error.message,
    });
  }
};

/**
 * Mark all notifications as read for the authenticated user
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await markAllNotificationsAsRead(userId);
    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read.',
      error: error.message,
    });
  }
};

/**
 * Mark a single notification as read
 */
export const markOneAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await markNotificationAsRead(userId, id);
    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update notification.',
      error: error.message,
    });
  }
};

/**
 * Clear all notifications for the authenticated user
 */
export const clearAll = async (req, res) => {
  try {
    const userId = req.user.id;
    await clearAllNotifications(userId);
    return res.status(200).json({
      success: true,
      message: 'All notifications cleared successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to clear notifications.',
      error: error.message,
    });
  }
};

export default {
  getVapidKey,
  getStatus,
  subscribe,
  unsubscribe,
  toggle,
  testNotification,
  getNotifications,
  markAllAsRead,
  markOneAsRead,
  clearAll,
};
