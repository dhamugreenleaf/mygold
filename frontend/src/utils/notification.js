import {
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  toggleDailyNotifications,
} from '../services/api';

/**
 * Convert URL-safe base64 string to Uint8Array for Web Push applicationServerKey
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the current browser environment supports Service Worker and Push Notifications
 */
export function isPushNotificationSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current browser notification permission state
 */
export function getNotificationPermission() {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/**
 * Check if the current browser device has an active push subscription
 */
export async function isDeviceSubscribed() {
  if (!isPushNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (e) {
    return false;
  }
}

/**
 * Subscribe the current browser to Web Push Notifications and sync with backend
 */
export async function enablePushNotifications() {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported by your current browser.');
  }

  // 1. Request notification permission if not yet granted
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      if (permission === 'denied') {
        throw new Error('Notification permission was blocked in browser settings. Please allow notifications in site settings.');
      }
      throw new Error('Notification permission was dismissed.');
    }
  }

  // 2. Fetch VAPID Public Key from backend or env
  let vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    const res = await getVapidPublicKey();
    vapidKey = res.data?.publicKey;
  }

  if (!vapidKey) {
    throw new Error('VAPID public key unavailable.');
  }

  const convertedVapidKey = urlBase64ToUint8Array(vapidKey);

  // 3. Ensure service worker is registered and active
  if ('serviceWorker' in navigator) {
    const existing = await navigator.serviceWorker.getRegistration();
    if (!existing) {
      await navigator.serviceWorker.register('/sw.js');
    }
  }
  const registration = await navigator.serviceWorker.ready;

  // 4. Subscribe with PushManager
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });
  }

  // 5. Send subscription payload to backend
  const subJSON = subscription.toJSON();
  await subscribeToPush(subJSON);

  // 6. Update user notification preference flag
  await toggleDailyNotifications(true);

  return { success: true, subscription: subJSON };
}

/**
 * Disable Web Push Notifications and update backend preference
 */
export async function disablePushNotifications() {
  try {
    if (isPushNotificationSupported()) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint).catch(() => {});
        await subscription.unsubscribe().catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Push unregister note:', err.message);
  }

  // Update user notification preference flag on backend
  await toggleDailyNotifications(false);
  return { success: true };
}

export default {
  urlBase64ToUint8Array,
  isPushNotificationSupported,
  getNotificationPermission,
  isDeviceSubscribed,
  enablePushNotifications,
  disablePushNotifications,
};
