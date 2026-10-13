import api from '../api/api';

/**
 * Profile Service
 * Communicates with backend endpoints for user profile, authentication,
 * subscription lifecycle management, and notification settings.
 * Uses the existing centralized Axios instance.
 */

/**
 * Get latest profile and user account details
 * @returns {Promise<{ success: boolean, data: { user: object } }>}
 */
export const getProfile = async () => {
  try {
    const res = await api.get('/auth/me');
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch user profile';
    throw new Error(message);
  }
};

/**
 * Request OTP to update profile username or email
 * @param {object} payload
 * @param {string} payload.username
 * @param {string} [payload.email]
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const requestProfileUpdateOtp = async ({ username, email }) => {
  try {
    const res = await api.post('/users/profile/update/request', {
      username: String(username).trim(),
      email: email ? String(email).trim() : undefined,
    });
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to request profile update OTP';
    throw new Error(message);
  }
};

/**
 * Verify OTP to finalize profile update
 * @param {string} otp 6-digit verification code
 * @returns {Promise<{ success: boolean, message: string, data: { user: object } }>}
 */
export const verifyProfileUpdateOtp = async (otp) => {
  try {
    const res = await api.post('/users/profile/update/verify', {
      otp: String(otp).trim(),
    });
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to verify profile update OTP';
    throw new Error(message);
  }
};

/**
 * Request OTP to change registered mobile number
 * @param {string} newMobile 10-digit mobile number
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const requestChangeMobileOtp = async (newMobile) => {
  try {
    const res = await api.post('/auth/mobile/change/request-otp', {
      newMobile: String(newMobile).trim(),
    });
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to request mobile change OTP';
    throw new Error(message);
  }
};

/**
 * Verify OTP to change registered mobile number
 * @param {string} newMobile 10-digit mobile number
 * @param {string} otp 6-digit verification code
 * @returns {Promise<{ success: boolean, message: string, data: { user: object } }>}
 */
export const verifyChangeMobileOtp = async (newMobile, otp) => {
  try {
    const res = await api.post('/auth/mobile/change/verify-otp', {
      newMobile: String(newMobile).trim(),
      otp: String(otp).trim(),
    });
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to verify mobile change OTP';
    throw new Error(message);
  }
};

/**
 * Get subscription entitlement status and billing cycle details
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export const getSubscriptionStatus = async () => {
  try {
    const res = await api.get('/subscription/status');
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch subscription status';
    throw new Error(message);
  }
};

/**
 * Pause active monthly subscription AutoPay
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export const pauseSubscription = async () => {
  try {
    const res = await api.post('/subscription/pause');
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to pause subscription';
    throw new Error(message);
  }
};

/**
 * Resume paused monthly subscription AutoPay
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export const resumeSubscription = async () => {
  try {
    const res = await api.post('/subscription/resume');
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to resume subscription';
    throw new Error(message);
  }
};

/**
 * Cancel monthly subscription AutoPay (access valid till billing end)
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export const cancelSubscription = async () => {
  try {
    const res = await api.post('/subscription/cancel');
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to cancel subscription';
    throw new Error(message);
  }
};

/**
 * Get push notification status and user preferences
 * @returns {Promise<{ success: boolean, data: { notifications_enabled: boolean, subscribed: boolean } }>}
 */
export const getNotificationStatus = async () => {
  try {
    const res = await api.get('/notifications/status');
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch notification status';
    throw new Error(message);
  }
};

/**
 * Toggle push notification preference (daily rates / portfolio updates)
 * @param {boolean} enabled
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export const toggleNotificationPreference = async (enabled) => {
  try {
    const res = await api.put('/notifications/toggle', { enabled: Boolean(enabled) });
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to toggle notifications';
    throw new Error(message);
  }
};

/**
 * Send test push notification (if supported safely by backend)
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const sendTestNotification = async () => {
  try {
    const res = await api.post('/notifications/test');
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to send test notification';
    throw new Error(message);
  }
};

export default {
  getProfile,
  requestProfileUpdateOtp,
  verifyProfileUpdateOtp,
  requestChangeMobileOtp,
  verifyChangeMobileOtp,
  getSubscriptionStatus,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  getNotificationStatus,
  toggleNotificationPreference,
  sendTestNotification,
};
