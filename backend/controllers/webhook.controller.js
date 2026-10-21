import { verifyWebhookSignature } from '../services/razorpay.service.js';
import { User, Payment } from '../models/index.js';

/**
 * Handles incoming Razorpay Webhook Events for Subscriptions and Payments
 * Endpoint: POST /api/payments/razorpay/webhook
 */
export const handleRazorpayWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature) {
    return res.status(400).json({ success: false, message: 'Missing X-Razorpay-Signature header' });
  }

  // Verify Webhook Signature using raw body Buffer or String
  let rawBody = req.body;
  if (typeof rawBody !== 'string' && !Buffer.isBuffer(rawBody)) {
    rawBody = JSON.stringify(req.body);
  }

  const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
  if (!isValid) {
    console.error('[Razorpay Webhook Error] Invalid webhook signature detected.');
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  let event;
  try {
    event = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf8'));
  } catch (parseErr) {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }

  const eventType = event.event;
  const eventId = event.id || `${eventType}_${Date.now()}`;
  const payload = event.payload || {};

  console.log(`[Razorpay Webhook] Received Event: ${eventType} (ID: ${eventId})`);

  try {
    // 1. Check Webhook Idempotency (prevent duplicate event processing)
    if (event.id) {
      const alreadyProcessed = await Payment.findOne({ where: { event_id: event.id } });
      if (alreadyProcessed) {
        console.log(`[Razorpay Webhook] Event ${event.id} already processed. Skipping.`);
        return res.status(200).json({ success: true, message: 'Event already processed' });
      }
    }

    // 2. Handle Subscription Events
    if (eventType.startsWith('subscription.')) {
      const subEntity = payload.subscription?.entity || payload.payment?.entity;
      if (!subEntity) {
        return res.status(200).json({ success: true, message: 'No subscription entity in payload' });
      }

      const subscriptionId = subEntity.id || subEntity.subscription_id;
      const subStatus = subEntity.status; // 'active', 'authenticated', 'pending', 'halted', 'cancelled', 'completed', 'paused'

      // Locate User via subscription ID or metadata notes
      let user = null;
      if (subEntity.notes?.user_id) {
        user = await User.findByPk(subEntity.notes.user_id);
      }
      if (!user && subscriptionId) {
        user = await User.findOne({ where: { razorpay_subscription_id: subscriptionId } });
      }

      if (!user) {
        console.warn(`[Razorpay Webhook] User not found for subscription ${subscriptionId}`);
        return res.status(200).json({ success: true, message: 'Subscription acknowledged (User not linked)' });
      }

      const currentStart = subEntity.current_start ? new Date(subEntity.current_start * 1000) : new Date();
      const currentEnd = subEntity.current_end ? new Date(subEntity.current_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Handle Event Types
      switch (eventType) {
        case 'subscription.authenticated':
        case 'subscription.activated': {
          user.subscription_status = 'active';
          user.plan = 'paid';
          user.current_period_start = currentStart;
          user.current_period_end = currentEnd;
          user.subscription_expires_at = currentEnd;
          user.cancelled_at = null;
          await user.save();
          console.log(`[Razorpay Webhook] User ${user.id} subscription activated!`);
          break;
        }

        case 'subscription.charged': {
          const paymentEntity = payload.payment?.entity || {};
          const paymentAmount = (paymentEntity.amount || subEntity.plan_amount || 0) / 100;

          // Record new recurring payment invoice
          await Payment.create({
            user_id: user.id,
            amount: paymentAmount,
            currency: paymentEntity.currency || 'INR',
            status: 'paid',
            plan_name: 'Premium Monthly Vault',
            payment_method: paymentEntity.method ? paymentEntity.method.toUpperCase() : 'RAZORPAY_AUTOPAY',
            payment_type: 'subscription',
            razorpay_subscription_id: subscriptionId,
            razorpay_payment_id: paymentEntity.id || null,
            razorpay_invoice_id: paymentEntity.invoice_id || null,
            event_id: eventId,
            expiry_date: currentEnd,
          });

          user.subscription_status = 'active';
          user.plan = 'paid';
          user.current_period_start = currentStart;
          user.current_period_end = currentEnd;
          user.subscription_expires_at = currentEnd;
          await user.save();
          console.log(`[Razorpay Webhook] User ${user.id} subscription charged successfully! Period extended to ${currentEnd}`);
          break;
        }

        case 'subscription.cancelled': {
          user.subscription_status = 'cancelled';
          user.cancelled_at = new Date();
          // Retain access until end of current billing period
          if (subEntity.current_end) {
            user.current_period_end = currentEnd;
            user.subscription_expires_at = currentEnd;
          }
          await user.save();
          console.log(`[Razorpay Webhook] User ${user.id} subscription cancelled. Active until ${currentEnd}`);
          break;
        }

        case 'subscription.paused': {
          user.subscription_status = 'paused';
          await user.save();
          break;
        }

        case 'subscription.resumed': {
          user.subscription_status = 'active';
          user.plan = 'paid';
          user.cancelled_at = null;
          await user.save();
          break;
        }

        case 'subscription.completed':
        case 'subscription.expired': {
          user.subscription_status = 'expired';
          user.plan = 'free';
          await user.save();
          break;
        }

        case 'subscription.pending':
        case 'subscription.halted': {
          user.subscription_status = subStatus === 'halted' ? 'payment_failed' : 'pending';
          await user.save();
          break;
        }

        default:
          console.log(`[Razorpay Webhook] Unhandled subscription event: ${eventType}`);
      }
    }

    // 3. Handle Generic Payment Failure
    if (eventType === 'payment.failed') {
      const paymentEntity = payload.payment?.entity || {};
      console.warn(`[Razorpay Webhook] Payment failed for ID ${paymentEntity.id}:`, paymentEntity.error_description);

      if (paymentEntity.subscription_id) {
        const user = await User.findOne({ where: { razorpay_subscription_id: paymentEntity.subscription_id } });
        if (user) {
          user.subscription_status = 'payment_failed';
          await user.save();
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('[Razorpay Webhook Processing Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  handleRazorpayWebhook,
};
