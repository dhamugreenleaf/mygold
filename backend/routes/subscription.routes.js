import express from 'express';
import {
  getStatus,
  getPricing,
  createMonthlySubscription,
  verifyMonthlySubscription,
  pauseMonthlySubscription,
  resumeMonthlySubscription,
  cancelMonthlySubscription,
  createSubscriptionOrder,
  verifySubscriptionPayment,
} from '../controllers/subscription.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Publicly readable pricing endpoint
router.get('/pricing', getPricing);

// Authenticated customer endpoints
router.use(authenticate);

// Status
router.get('/status', getStatus);

// NEW: Monthly AutoPay Subscription Endpoints
router.post('/create-monthly', createMonthlySubscription);
router.post('/verify-monthly', verifyMonthlySubscription);
router.post('/pause', pauseMonthlySubscription);
router.post('/resume', resumeMonthlySubscription);
router.post('/cancel', cancelMonthlySubscription);

// EXISTING: One-Time Order Payment Endpoints (Preserved)
router.post('/create-order', createSubscriptionOrder);
router.post('/verify-payment', verifySubscriptionPayment);

export default router;
