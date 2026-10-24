import express from 'express';
import { logout, getMe, updatePreferences } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public auth endpoints
router.post('/logout', logout);

// Protected auth endpoints
router.get('/me', authenticate, getMe);
router.patch('/preferences', authenticate, updatePreferences);

// ============================================
// NEW OTP AUTH FLOW
// ============================================

import {
  requestRegisterOtp,
  verifyRegisterOtp,
  login,
  requestForgotUsernameOtp,
  verifyForgotUsernameOtp,
  verifyForgotUsernameMsg91,
  requestForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword,
  requestChangeMobileOtp,
  verifyChangeMobileOtp,
  verifyRegisterMsg91,
  verifyForgotMsg91,
  loginWithMsg91,
} from '../controllers/auth.controller.js';

// Registration
router.post('/register/request-otp', requestRegisterOtp);
router.post('/register/verify-otp', verifyRegisterOtp);
router.post('/register/verify-msg91', verifyRegisterMsg91);

// Login
router.post('/login', login);
router.post('/login-msg91', loginWithMsg91);

// Forgot Username
router.post('/forgot-username/request-otp', requestForgotUsernameOtp);
router.post('/forgot-username/verify-otp', verifyForgotUsernameOtp);
router.post('/forgot-username/verify-msg91', verifyForgotUsernameMsg91);

// Forgot Password
router.post('/forgot-password/request', requestForgotPasswordOtp);
router.post('/forgot-password/verify', verifyForgotPasswordOtp);
router.post('/forgot-password/verify-msg91', verifyForgotMsg91);
router.post('/forgot-password/reset', resetPassword);

// Change Mobile (Protected)
router.post('/mobile/change/request-otp', authenticate, requestChangeMobileOtp);
router.post('/mobile/change/verify-otp', authenticate, verifyChangeMobileOtp);

export default router;
