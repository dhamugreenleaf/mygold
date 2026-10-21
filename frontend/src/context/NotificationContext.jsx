import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  getNotificationStatus,
  sendTestPushNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  clearAllNotificationsApi,
} from '../services/api';
import {
  enablePushNotifications,
  disablePushNotifications,
  isPushNotificationSupported,
  getNotificationPermission,
  isDeviceSubscribed,
} from '../utils/notification';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({
  notificationsEnabled: false,
  deviceSubscribed: false,
  permission: 'default',
  isSupported: false,
  loading: false,
  testing: false,
  notifications: [],
  unreadCount: 0,
  loadingNotifications: false,
  toggleNotifications: async () => {},
  enableOnDevice: async () => {},
  sendTestAlert: async () => {},
  refreshStatus: async () => {},
  loadNotifications: async () => {},
  markAllAsRead: async () => {},
  markOneAsRead: async () => {},
  clearAll: async () => {},
});

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    user?.notifications_enabled !== false
  );
  const [deviceSubscribed, setDeviceSubscribed] = useState(false);
  const [permission, setPermission] = useState(() => getNotificationPermission());
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  
  // In-app Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const isSupported = isPushNotificationSupported();

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingNotifications(true);
      const res = await fetchNotifications();
      if (res?.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err?.message);
    } finally {
      setLoadingNotifications(false);
    }
  }, [isAuthenticated]);

  const refreshStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setPermission(getNotificationPermission());
      const isSub = await isDeviceSubscribed();
      setDeviceSubscribed(isSub);

      const res = await getNotificationStatus();
      if (res?.data) {
        setNotificationsEnabled(res.data.notifications_enabled !== false);
      }
    } catch (err) {
      console.warn('Failed to fetch notification status:', err?.message);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshStatus();
      loadNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setDeviceSubscribed(false);
    }
  }, [isAuthenticated, refreshStatus, loadNotifications]);

  const enableOnDevice = async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported on this browser/device.');
      return false;
    }
    try {
      setLoading(true);
      await enablePushNotifications();
      setNotificationsEnabled(true);
      setDeviceSubscribed(true);
      setPermission(getNotificationPermission());
      toast.success('🔔 Notifications activated on this phone/device!');
      return true;
    } catch (err) {
      setPermission(getNotificationPermission());
      const errMsg = err?.message || 'Could not enable notifications.';
      toast.error(errMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleNotifications = async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported on this browser/device.');
      return;
    }

    try {
      setLoading(true);
      // If this device is not yet subscribed or notifications are disabled, turn ON
      if (!deviceSubscribed || !notificationsEnabled) {
        await enablePushNotifications();
        setNotificationsEnabled(true);
        setDeviceSubscribed(true);
        setPermission(getNotificationPermission());
        toast.success('🔔 Daily MyGold Updates enabled on this device!');
      } else {
        // Turning OFF
        await disablePushNotifications();
        setNotificationsEnabled(false);
        setDeviceSubscribed(false);
        setPermission(getNotificationPermission());
        toast.success('🔕 Daily MyGold Updates disabled.');
      }
    } catch (err) {
      setPermission(getNotificationPermission());
      const errMsg = err?.message || 'Could not update notification setting.';
      toast.error(errMsg);
      if (errMsg.includes('blocked') || errMsg.includes('denied')) {
        setNotificationsEnabled(false);
        setDeviceSubscribed(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    if (notifications.length === 0 || unreadCount === 0) return;
    
    // Immediate optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
      toast.success('All notifications marked as read.');
    } catch (err) {
      // Revert if error
      loadNotifications();
      toast.error(err?.response?.data?.message || 'Failed to mark notifications as read.');
    }
  };

  const markOneAsRead = async (id) => {
    // Immediate optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await markNotificationRead(id);
    } catch (err) {
      console.warn('Failed to mark notification as read:', err?.message);
    }
  };

  const clearAll = async () => {
    if (notifications.length === 0) return;

    // Immediate optimistic update
    setNotifications([]);
    setUnreadCount(0);

    try {
      await clearAllNotificationsApi();
      toast.success('All notifications cleared.');
    } catch (err) {
      loadNotifications();
      toast.error(err?.response?.data?.message || 'Failed to clear notifications.');
    }
  };

  const sendTestAlert = async () => {
    try {
      setTesting(true);

      // If device is not yet subscribed, automatically register it first
      const isSub = await isDeviceSubscribed();
      if (!isSub && isSupported) {
        await enablePushNotifications();
        setNotificationsEnabled(true);
        setDeviceSubscribed(true);
        setPermission(getNotificationPermission());
      }

      const res = await sendTestPushNotification();
      toast.success(res?.message || '🔔 Test push notification sent! Check your notification bar.');
      loadNotifications();
    } catch (err) {
      // If backend returned 404 (subscription not found), retry after subscribing
      if (err?.response?.status === 404 && isSupported) {
        try {
          await enablePushNotifications();
          setNotificationsEnabled(true);
          setDeviceSubscribed(true);
          setPermission(getNotificationPermission());
          const retryRes = await sendTestPushNotification();
          toast.success(retryRes?.message || '🔔 Test push notification sent! Check your notification bar.');
          loadNotifications();
          return;
        } catch (retryErr) {
          // ignore retry failure and report original error
        }
      }
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to send test notification.';
      toast.error(errMsg);
    } finally {
      setTesting(false);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notificationsEnabled,
        deviceSubscribed,
        permission,
        isSupported,
        loading,
        testing,
        notifications,
        unreadCount,
        loadingNotifications,
        toggleNotifications,
        enableOnDevice,
        sendTestAlert,
        refreshStatus,
        loadNotifications,
        markAllAsRead,
        markOneAsRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);

export default NotificationContext;
