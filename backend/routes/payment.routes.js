import express from 'express';
import { handleRazorpayWebhook } from '../controllers/webhook.controller.js';

const router = express.Router();

// Webhook endpoint (Raw body parser configured in server.js)
router.post('/razorpay/webhook', handleRazorpayWebhook);

export default router;
