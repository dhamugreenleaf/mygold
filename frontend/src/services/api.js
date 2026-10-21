import axios from 'axios';

const getApiBaseUrl = () => {
  // If production environment variable is explicitly set and not in DEV mode
  if (!import.meta.env.DEV && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  if (import.meta.env.DEV) {
    if (typeof window !== 'undefined' && window.location.hostname) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5010/api';
      }
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname)) {
        return `${window.location.protocol}//${window.location.hostname}:5010/api`;
      }
    }
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5010/api';
  }

  // Production: use current domain origin /api or production domain fallback
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/api`;
  }
  return 'https://mygold.greenleafagencies.com/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

// Request Interceptor: Attach JWT Bearer Token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aurum_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthUrl = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/register');
      if (!isAuthUrl) {
        localStorage.removeItem('aurum_token');
        localStorage.removeItem('aurum_user');
        // Dispatch custom event so AuthContext can sync state immediately
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

// ==========================================
// Authentication & User Preference APIs
// ==========================================

export const requestRegisterOtp = async (username, mobile) => {
  const res = await api.post('/auth/register/request-otp', { username, mobile });
  return res.data;
};

export const verifyRegisterOtp = async (username, email, password, mobile, otp) => {
  const res = await api.post('/auth/register/verify-otp', { username, email, password, mobile, otp });
  return res.data;
};

export const verifyRegisterMsg91 = async (payload) => {
  const res = await api.post('/auth/register/verify-msg91', payload);
  return res.data;
};

export const verifyForgotMsg91 = async (payload) => {
  const res = await api.post('/auth/forgot-password/verify-msg91', payload);
  return res.data;
};

export const loginWithMsg91 = async (mobile, accessToken) => {
  const res = await api.post('/auth/login-msg91', { mobile, accessToken });
  return res.data;
};

export const login = async (username, password) => {
  const res = await api.post('/auth/login', { username, password });
  return res.data;
};

export const requestForgotUsernameOtp = async (mobile) => {
  const res = await api.post('/auth/forgot-username/request-otp', { mobile });
  return res.data;
};

export const verifyForgotUsernameOtp = async (mobile, otp) => {
  const res = await api.post('/auth/forgot-username/verify-otp', { mobile, otp });
  return res.data;
};

export const requestForgotPasswordOtp = async (username, mobile) => {
  const res = await api.post('/auth/forgot-password/request', { username, mobile });
  return res.data;
};

export const verifyForgotPasswordOtp = async (username, mobile, otp) => {
  const res = await api.post('/auth/forgot-password/verify', { username, mobile, otp });
  return res.data;
};

export const resetPassword = async (resetToken, newPassword) => {
  const res = await api.post('/auth/forgot-password/reset', { resetToken, newPassword });
  return res.data;
};

export const requestChangeMobileOtp = async (newMobile) => {
  const res = await api.post('/auth/mobile/change/request-otp', { newMobile });
  return res.data;
};

export const verifyChangeMobileOtp = async (newMobile, otp) => {
  const res = await api.post('/auth/mobile/change/verify-otp', { newMobile, otp });
  return res.data;
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (e) {
    // silent catch
  } finally {
    localStorage.removeItem('aurum_token');
    localStorage.removeItem('aurum_user');
  }
};

export const getMe = async () => {
  const res = await api.get('/auth/me');
  return res.data;
};

export const updateUserPreferences = async ({ city, state, country }) => {
  const res = await api.patch('/users/preferences', { city, state, country });
  return res.data;
};

export const requestProfileUpdateOtp = async ({ username, email }) => {
  const res = await api.post('/users/profile/update/request', { username, email });
  return res.data;
};

export const verifyProfileUpdateOtp = async (otp) => {
  const res = await api.post('/users/profile/update/verify', { otp });
  return res.data;
};

// ==========================================
// Bullion Rates APIs (Gold & Silver)
// ==========================================

export const getHealth = async () => {
  const res = await api.get('/health');
  return res.data;
};

export const getHealthLive = async () => {
  const res = await api.get('/health/live');
  return res.data;
};

export const getHealthReady = async () => {
  const res = await api.get('/health/ready');
  return res.data;
};

export const getHealthDetails = async () => {
  const res = await api.get('/health/details');
  return res.data;
};

export const getRates = async (params = {}) => {
  const res = await api.get('/rates', { params });
  return res.data;
};

export const getGoldLive = async (params = {}) => {
  const res = await api.get('/gold/live', { params });
  return res.data;
};

export const getGoldRates = async (params = {}) => {
  const res = await api.get('/rates', { params });
  return res.data;
};

export const getGoldRatesOnly = async (params = {}) => {
  const res = await api.get('/rates/gold', { params });
  return res.data;
};

export const getSilverRatesOnly = async (params = {}) => {
  const res = await api.get('/rates/silver', { params });
  return res.data;
};

export const getSupportedLocations = async () => {
  const res = await api.get('/rates/locations');
  return res.data;
};

// ==========================================
// Physical Assets & Purchases APIs (Gold & Silver)
// ==========================================

export const getPurchases = async (params = {}) => {
  const res = await api.get('/purchases', { params });
  return res.data;
};

export const getPurchase = async (id, params = {}) => {
  const res = await api.get(`/purchases/${id}`, { params });
  return res.data;
};

export const addPurchase = async (purchaseData) => {
  const isFormData = purchaseData instanceof FormData;
  const res = await api.post('/purchases', purchaseData, {
    headers: isFormData
      ? { 'Content-Type': 'multipart/form-data' }
      : { 'Content-Type': 'application/json' },
  });
  return res.data;
};

export const updatePurchase = async (id, purchaseData) => {
  const isFormData = purchaseData instanceof FormData;
  const res = await api.put(`/purchases/${id}`, purchaseData, {
    headers: isFormData
      ? { 'Content-Type': 'multipart/form-data' }
      : { 'Content-Type': 'application/json' },
  });
  return res.data;
};

export const deletePurchase = async (id) => {
  const res = await api.delete(`/purchases/${id}`);
  return res.data;
};

// Asset aliases
export const getAssets = getPurchases;
export const getAsset = getPurchase;
export const addAsset = addPurchase;
export const updateAsset = updatePurchase;
export const deleteAsset = deletePurchase;

export const getPortfolio = async (params = {}) => {
  const res = await api.get('/portfolio', { params });
  return res.data;
};

// ==========================================
// Subscription & Razorpay APIs
// ==========================================

export const getSubscriptionPricing = async () => {
  const res = await api.get('/subscription/pricing');
  return res.data;
};

export const getEntitlementStatus = async () => {
  const res = await api.get('/subscription/status');
  return res.data;
};

// NEW: Monthly AutoPay Subscription APIs
export const createMonthlySubscription = async () => {
  const res = await api.post('/subscription/create-monthly');
  return res.data;
};

export const verifyMonthlySubscription = async (authData) => {
  const res = await api.post('/subscription/verify-monthly', authData);
  return res.data;
};

export const cancelMonthlySubscription = async () => {
  const res = await api.post('/subscription/cancel');
  return res.data;
};

export const pauseMonthlySubscription = async () => {
  const res = await api.post('/subscription/pause');
  return res.data;
};

export const resumeMonthlySubscription = async () => {
  const res = await api.post('/subscription/resume');
  return res.data;
};

// EXISTING: One-Time Order Payment APIs (Preserved)
export const createSubscriptionOrder = async () => {
  const res = await api.post('/subscription/create-order');
  return res.data;
};

export const verifySubscriptionPayment = async (paymentData) => {
  const res = await api.post('/subscription/verify-payment', paymentData);
  return res.data;
};

// ==========================================
// Secure Document Fetching
// ==========================================

export const fetchSecureDocumentBlob = async (endpointUrl) => {
  // Strip duplicate '/api' prefix since baseURL already points to '/api'
  let normalizedUrl = endpointUrl;
  if (normalizedUrl.startsWith('/api/')) {
    normalizedUrl = normalizedUrl.replace(/^\/api/, '');
  }

  const res = await api.get(normalizedUrl, {
    responseType: 'blob',
  });

  return {
    blobUrl: URL.createObjectURL(res.data),
    contentType: res.headers['content-type'],
  };
};

// ==========================================
// Admin Panel Management APIs
// ==========================================

export const getAdminDashboard = async () => {
  const res = await api.get('/admin/dashboard');
  return res.data;
};

export const getAdminUsers = async (params = {}) => {
  const res = await api.get('/admin/users', { params });
  return res.data;
};

export const getAdminUser = async (id) => {
  const res = await api.get(`/admin/users/${id}`);
  return res.data;
};

export const updateAdminUserStatus = async (id, statusOrPayload) => {
  const isActive =
    typeof statusOrPayload === 'object' && statusOrPayload !== null
      ? statusOrPayload.is_active
      : statusOrPayload;
  const res = await api.patch(`/admin/users/${id}/status`, { is_active: Boolean(isActive) });
  return res.data;
};

export const updateAdminUserPlan = async (id, planData) => {
  const res = await api.patch(`/admin/users/${id}/plan`, planData);
  return res.data;
};

export const deleteAdminUser = async (id) => {
  const res = await api.delete(`/admin/users/${id}`);
  return res.data;
};

export const getAdminPricing = async () => {
  const res = await api.get('/admin/pricing');
  return res.data;
};

export const updateAdminPricing = async (priceOrPayload) => {
  const payload =
    typeof priceOrPayload === 'object' && priceOrPayload !== null && 'price' in priceOrPayload
      ? priceOrPayload
      : { price: priceOrPayload };
  const res = await api.patch('/admin/pricing', payload);
  return res.data;
};

export const getAdminMetalRates = async () => {
  const res = await api.get('/admin/rates');
  return res.data;
};

export const updateAdminMetalRate = async (ratePayload) => {
  const res = await api.put('/admin/rates', ratePayload);
  return res.data;
};

export const getAdminAuditLogs = async (params = {}) => {
  const res = await api.get('/admin/audit-logs', { params });
  return res.data;
};

// ================================================================
// Notification API Endpoints
// ================================================================
export const getVapidPublicKey = async () => {
  const res = await api.get('/notifications/vapid-public-key');
  return res.data;
};

export const getNotificationStatus = async () => {
  const res = await api.get('/notifications/status');
  return res.data;
};

export const subscribeToPush = async (subscription) => {
  const res = await api.post('/notifications/subscribe', { subscription });
  return res.data;
};

export const unsubscribeFromPush = async (endpoint) => {
  const res = await api.post('/notifications/unsubscribe', { endpoint });
  return res.data;
};

export const toggleDailyNotifications = async (enabled) => {
  const res = await api.put('/notifications/toggle', { enabled });
  return res.data;
};

export const sendTestPushNotification = async () => {
  const res = await api.post('/notifications/test');
  return res.data;
};

export const fetchNotifications = async () => {
  const res = await api.get('/notifications');
  return res.data;
};

export const markAllNotificationsRead = async () => {
  const res = await api.put('/notifications/read-all');
  return res.data;
};

export const markNotificationRead = async (id) => {
  const res = await api.put(`/notifications/${id}/read`);
  return res.data;
};

export const clearAllNotificationsApi = async () => {
  const res = await api.delete('/notifications');
  return res.data;
};

export default api;

