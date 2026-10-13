import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import authService from '../services/authService';
import {
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
  setOnUnauthorizedCallback,
} from '../api/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Restore authenticated session on app launch
  const restoreSession = useCallback(async () => {
    try {
      const storedToken = await getStoredToken();
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Check cached user first for faster display
      const cachedUser = await getStoredUser();
      if (cachedUser) {
        setUser(cachedUser);
      }

      // Validate token against backend /auth/me
      const res = await authService.getCurrentUser();
      if (res?.data?.user) {
        const verifiedUser = res.data.user;
        setUser(verifiedUser);
        setToken(storedToken);
        setIsAuthenticated(true);
        await setStoredUser(verifiedUser);
      } else {
        throw new Error('Invalid user payload');
      }
    } catch {
      // Token is expired, invalid, or server rejected authentication
      await removeStoredToken();
      await removeStoredUser();
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
    });
    restoreSession();
  }, [restoreSession]);

  /**
   * Log in user with username and password
   */
  const login = useCallback(async (username, password) => {
    const res = await authService.login(username, password);
    const receivedToken = res?.data?.token;
    const receivedUser = res?.data?.user;

    if (!receivedToken) {
      throw new Error('Authentication token not received from server');
    }

    await setStoredToken(receivedToken);
    if (receivedUser) {
      await setStoredUser(receivedUser);
    }

    setToken(receivedToken);
    setUser(receivedUser || null);
    setIsAuthenticated(true);

    return res.data;
  }, []);

  /**
   * Register user (verifies OTP and auto-logs in if token is returned)
   */
  const register = useCallback(async (registrationData) => {
    const res = await authService.register(registrationData);
    const receivedToken = res?.data?.token;
    const receivedUser = res?.data?.user;

    // Follow real backend behavior: only authenticate if backend returns token
    if (receivedToken) {
      await setStoredToken(receivedToken);
      if (receivedUser) {
        await setStoredUser(receivedUser);
      }
      setToken(receivedToken);
      setUser(receivedUser || null);
      setIsAuthenticated(true);
    }

    return res.data;
  }, []);

  /**
   * Log out user, invalidate backend session, and clear local state
   */
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      await removeStoredToken();
      await removeStoredUser();
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  /**
   * Request registration OTP
   */
  const requestRegisterOtp = useCallback(async (username, mobile) => {
    return await authService.requestRegisterOtp(username, mobile);
  }, []);

  /**
   * Refresh current user profile from /auth/me and sync to state + storage
   */
  const refreshUser = useCallback(async () => {
    try {
      const res = await authService.getCurrentUser();
      const verifiedUser = res?.data?.user;
      if (verifiedUser) {
        setUser(verifiedUser);
        await setStoredUser(verifiedUser);
        return verifiedUser;
      }
    } catch {
      // Keep existing state on transient network failures
    }
    return null;
  }, []);

  /**
   * Directly update user in React state and AsyncStorage when new user data is returned
   */
  const updateUser = useCallback(async (newUserData) => {
    if (newUserData) {
      setUser((prev) => {
        const updated = { ...(prev || {}), ...newUserData };
        setStoredUser(updated);
        return updated;
      });
    }
  }, []);

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    requestRegisterOtp,
    logout,
    refreshUser,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
