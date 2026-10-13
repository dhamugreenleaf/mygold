import api from '../api/api';

/**
 * In-App Notification Service
 * Connects to user in-app notification inbox APIs:
 * - GET    /notifications
 * - PUT    /notifications/:id/read
 * - PUT    /notifications/read-all
 * - DELETE /notifications
 */

/**
 * Fetch in-app notifications and unread count
 * @returns {Promise<{ success: boolean, data: { notifications: Array, unread_count: number } }>}
 */
export const getNotifications = async () => {
  try {
    const res = await api.get('/notifications');
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch notifications';
    throw new Error(message);
  }
};

/**
 * Mark a single notification as read
 * @param {string|number} id
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const markNotificationAsRead = async (id) => {
  try {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to update notification';
    throw new Error(message);
  }
};

/**
 * Mark all notifications as read for current user
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const res = await api.put('/notifications/read-all');
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to mark notifications as read';
    throw new Error(message);
  }
};

/**
 * Clear all notifications for current user
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const clearAllNotifications = async () => {
  try {
    const res = await api.delete('/notifications');
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to clear notifications';
    throw new Error(message);
  }
};

export default {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
};
