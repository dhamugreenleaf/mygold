import api from '../api/api';

/**
 * Authentication Service
 * Communicates directly with the existing MyGold backend auth endpoints:
 * - POST /auth/login
 * - POST /auth/register/request-otp
 * - POST /auth/register/verify-otp
 * - GET  /auth/me
 * - POST /auth/logout
 */

/**
 * Login with username and password
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<{ success: boolean, message: string, data: { user: object, token: string } }>}
 */
export const login = async (username, password) => {
  try {
    const res = await api.post('/auth/login', {
      username: String(username).trim(),
      password,
    });
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Login failed';
    throw new Error(message);
  }
};

/**
 * Request OTP for registration
 * @param {string} username 
 * @param {string} mobile 
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const requestRegisterOtp = async (username, mobile) => {
  try {
    const res = await api.post('/auth/register/request-otp', {
      username: String(username).trim(),
      mobile: String(mobile).trim(),
    });
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to request registration OTP';
    throw new Error(message);
  }
};

/**
 * Complete registration by verifying OTP
 * @param {object} registrationData
 * @param {string} registrationData.username
 * @param {string} registrationData.email
 * @param {string} registrationData.password
 * @param {string} registrationData.mobile
 * @param {string} registrationData.otp
 * @returns {Promise<{ success: boolean, message: string, data: { user: object, token: string } }>}
 */
export const register = async ({ username, email, password, mobile, otp }) => {
  try {
    const res = await api.post('/auth/register/verify-otp', {
      username: String(username).trim(),
      email: email ? String(email).trim() : undefined,
      password,
      mobile: String(mobile).trim(),
      otp: String(otp).trim(),
    });
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Registration failed';
    throw new Error(message);
  }
};

/**
 * Fetch and validate currently authenticated user session
 * @returns {Promise<{ success: boolean, data: { user: object } }>}
 */
export const getCurrentUser = async () => {
  try {
    const res = await api.get('/auth/me');
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch current user';
    throw new Error(message);
  }
};

/**
 * Invalidate server-side session (stateless backend response)
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const logout = async () => {
  try {
    await api.post('/auth/logout');
    return res.data;
  } catch {
    // If network fails, local storage cleanup still occurs
    return { success: true };
  }
};

/**
 * Request OTP for password reset
 * @param {string} username 
 * @param {string} mobile 10-digit mobile number
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const requestForgotPasswordOtp = async (username, mobile) => {
  try {
    const res = await api.post('/auth/forgot-password/request', {
      username: String(username).trim(),
      mobile: String(mobile).trim(),
    });
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to request password reset OTP';
    throw new Error(message);
  }
};

/**
 * Verify OTP for password reset
 * @param {string} username 
 * @param {string} mobile 
 * @param {string} otp 6-digit verification code
 * @returns {Promise<{ success: boolean, message: string, data: { resetToken: string } }>}
 */
export const verifyForgotPasswordOtp = async (username, mobile, otp) => {
  try {
    const res = await api.post('/auth/forgot-password/verify', {
      username: String(username).trim(),
      mobile: String(mobile).trim(),
      otp: String(otp).trim(),
    });
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to verify OTP';
    throw new Error(message);
  }
};

/**
 * Reset password using temporary reset token
 * @param {string} resetToken 
 * @param {string} newPassword 
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const resetPassword = async (resetToken, newPassword) => {
  try {
    const res = await api.post('/auth/forgot-password/reset', {
      resetToken: String(resetToken).trim(),
      newPassword,
    });
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to reset password';
    throw new Error(message);
  }
};

/**
 * Request OTP for username recovery
 * @param {string} mobile 10-digit mobile number
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const requestForgotUsernameOtp = async (mobile) => {
  try {
    const res = await api.post('/auth/forgot-username/request-otp', {
      mobile: String(mobile).trim(),
    });
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to request username recovery OTP';
    throw new Error(message);
  }
};

/**
 * Verify OTP for username recovery
 * @param {string} mobile 
 * @param {string} otp 6-digit verification code
 * @returns {Promise<{ success: boolean, message: string, data: { username: string } }>}
 */
export const verifyForgotUsernameOtp = async (mobile, otp) => {
  try {
    const res = await api.post('/auth/forgot-username/verify-otp', {
      mobile: String(mobile).trim(),
      otp: String(otp).trim(),
    });
    return res.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to verify OTP';
    throw new Error(message);
  }
};

export default {
  login,
  requestRegisterOtp,
  register,
  getCurrentUser,
  logout,
  requestForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword,
  requestForgotUsernameOtp,
  verifyForgotUsernameOtp,
};
