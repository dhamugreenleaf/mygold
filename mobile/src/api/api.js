import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

/**
 * Centralized API & Storage Keys Configuration
 */
export const AUTH_TOKEN_KEY = 'aurum_token';
export const AUTH_USER_KEY = 'aurum_user';

export const getApiBaseUrl = () => {
  // 1. Web browser: Use current host
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:5010/api`;
  }

  // 2. Dynamic host detection from Metro bundle scriptURL in development
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return `http://${match[1]}:5010/api`;
      }
    }
  } catch (err) {
    // Fall back to platform defaults
  }

  // 3. Use Expo public environment variable if defined
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 4. Android fallback: Wi-Fi host machine IP
  if (Platform.OS === 'android') {
    return 'http://10.60.41.164:5010/api';
  }

  return 'http://localhost:5010/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Request Interceptor: Attach stored JWT Bearer token and dynamic baseURL to all outgoing requests
 */
api.interceptors.request.use(
  async (config) => {
    try {
      config.baseURL = getApiBaseUrl();

      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Proceed without token if storage is temporarily unavailable
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let onUnauthorizedCallback = null;

export const setOnUnauthorizedCallback = (callback) => {
  onUnauthorizedCallback = callback;
};

/**
 * Response Interceptor: Handle 401 Unauthorized globally for expired/invalid tokens
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthUrl =
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/forgot-password') ||
        url.includes('/auth/forgot-username');

      if (!isAuthUrl) {
        await removeStoredToken();
        await removeStoredUser();
        if (typeof onUnauthorizedCallback === 'function') {
          onUnauthorizedCallback();
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Storage helpers for authentication data
 */
export const getStoredToken = async () => {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = async (token) => {
  try {
    if (token) {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  } catch {
    // Silent catch
  }
};

export const removeStoredToken = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Silent catch
  }
};

export const getStoredUser = async () => {
  try {
    const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = async (user) => {
  try {
    if (user) {
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    }
  } catch {
    // Silent catch
  }
};

export const removeStoredUser = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // Silent catch
  }
};

export default api;
