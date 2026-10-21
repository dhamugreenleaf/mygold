import crypto from 'crypto';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

let instance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

/**
 * Creates a Razorpay order
 * @param {number} amount - Amount in INR
 * @param {string} receiptId - Internal reference ID (e.g., payment table ID)
 * @returns {Promise<Object>} Razorpay Order Object
 */
export const createOrder = async (amount, receiptId) => {
  if (!instance) {
    throw new Error('Razorpay is not configured on the server.');
  }

  const options = {
    amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
    currency: 'INR',
    receipt: receiptId.toString(),
  };

  try {
    const order = await instance.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay Order Creation Failed:', error);
    throw new Error('Failed to create payment order with Razorpay.');
  }
};

/**
 * Verifies the Razorpay payment signature
 * @param {string} orderId 
 * @param {string} paymentId 
 * @param {string} signature 
 * @returns {boolean} true if valid
 */
export const verifySignature = (orderId, paymentId, signature) => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay secret key is missing.');
  }

  const text = `${orderId}|${paymentId}`;
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest('hex');

  return generatedSignature === signature;
};

export const getRazorpayInstance = () => {
  if (!instance && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return instance;
};

// In-memory cache for plan IDs by amount
const planCache = new Map([
  [10, 'plan_TRBtIfE1vJQg4M'],
  [199, 'plan_TRBqmknEWwy2KE'],
]);

/**
 * Creates or retrieves a monthly Razorpay plan matching the specified price
 * @param {number} amount - Amount in INR
 * @param {string} planName 
 * @returns {Promise<Object>} Razorpay Plan Object
 */
export const getOrCreateMonthlyPlan = async (amount, planName = 'Premium Monthly Vault') => {
  const rzp = getRazorpayInstance();
  if (!rzp) {
    throw new Error('Razorpay is not configured on the server.');
  }

  const numAmount = Number(amount) || 10;
  const targetPaise = Math.round(numAmount * 100);

  // 1. Check in-memory cache
  if (planCache.has(numAmount)) {
    return { id: planCache.get(numAmount), amount: targetPaise };
  }

  // 2. If configured in environment and matching
  if (process.env.RAZORPAY_PREMIUM_MONTHLY_PLAN_ID && Number(process.env.PREMIUM_PLAN_PRICE) === numAmount) {
    planCache.set(numAmount, process.env.RAZORPAY_PREMIUM_MONTHLY_PLAN_ID);
    return { id: process.env.RAZORPAY_PREMIUM_MONTHLY_PLAN_ID, amount: targetPaise };
  }

  // 3. Create a new plan for this dynamic price in Razorpay
  try {
    const plan = await rzp.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: `${planName} (₹${numAmount}/mo)`,
        amount: targetPaise, // amount in paise
        currency: 'INR',
        description: `Monthly Premium Vault Subscription (₹${numAmount}/month)`,
      },
      notes: {
        service: 'gold_live_track_vault',
        amount_inr: String(numAmount),
      },
    });

    if (plan && plan.id) {
      planCache.set(numAmount, plan.id);
    }
    return plan;
  } catch (error) {
    console.error('Razorpay Plan Creation Failed:', error?.error || error);
    throw new Error('Failed to create or retrieve Razorpay subscription plan.');
  }
};

/**
 * Creates a Razorpay Subscription
 * @param {string} planId - Razorpay Plan ID
 * @param {number} totalCount - Number of billing cycles (e.g. 120 = 10 years recurring)
 * @param {Object} notes - Custom metadata notes
 * @returns {Promise<Object>} Razorpay Subscription Object
 */
export const createRazorpaySubscription = async (planId, totalCount = 120, notes = {}) => {
  const rzp = getRazorpayInstance();
  if (!rzp) {
    throw new Error('Razorpay is not configured on the server.');
  }

  try {
    const subscription = await rzp.subscriptions.create({
      plan_id: planId,
      total_count: totalCount,
      quantity: 1,
      customer_notify: 1,
      notes,
    });
    return subscription;
  } catch (error) {
    console.error('Razorpay Subscription Creation Failed:', error?.error || error);
    throw new Error(error?.error?.description || 'Failed to create subscription with Razorpay.');
  }
};

/**
 * Verifies Razorpay Subscription Payment Signature
 * For Subscriptions, text = payment_id + '|' + subscription_id
 * @param {Object} params - { subscriptionId, paymentId, signature }
 * @returns {boolean} true if valid
 */
export const verifySubscriptionSignature = ({ subscriptionId, paymentId, signature }) => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay secret key is missing.');
  }
  if (!subscriptionId || !paymentId || !signature) {
    return false;
  }

  const text = `${paymentId}|${subscriptionId}`;
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest('hex');

  return generatedSignature === signature;
};

/**
 * Pauses a Razorpay Subscription
 * @param {string} subscriptionId 
 * @param {string} pauseAt - 'now' | 'cycle_end' (default 'now')
 * @returns {Promise<Object>}
 */
export const pauseRazorpaySubscription = async (subscriptionId, pauseAt = 'now') => {
  const rzp = getRazorpayInstance();
  if (!rzp) {
    throw new Error('Razorpay is not configured on the server.');
  }

  try {
    const response = await rzp.subscriptions.pause(subscriptionId, { pause_at: pauseAt });
    return response;
  } catch (error) {
    console.error('Razorpay Subscription Pause Failed:', error?.error || error);
    throw new Error(error?.error?.description || 'Failed to pause Razorpay subscription.');
  }
};

/**
 * Resumes a paused Razorpay Subscription
 * @param {string} subscriptionId 
 * @param {string} resumeAt - 'now' (default 'now')
 * @returns {Promise<Object>}
 */
export const resumeRazorpaySubscription = async (subscriptionId, resumeAt = 'now') => {
  const rzp = getRazorpayInstance();
  if (!rzp) {
    throw new Error('Razorpay is not configured on the server.');
  }

  try {
    const response = await rzp.subscriptions.resume(subscriptionId, { resume_at: resumeAt });
    return response;
  } catch (error) {
    console.error('Razorpay Subscription Resume Failed:', error?.error || error);
    throw new Error(error?.error?.description || 'Failed to resume Razorpay subscription.');
  }
};

/**
 * Cancels a Razorpay Subscription
 * @param {string} subscriptionId 
 * @param {boolean} cancelAtCycleEnd - If true, cancels at end of current billing cycle
 * @returns {Promise<Object>}
 */
export const cancelRazorpaySubscription = async (subscriptionId, cancelAtCycleEnd = true) => {
  const rzp = getRazorpayInstance();
  if (!rzp) {
    throw new Error('Razorpay is not configured on the server.');
  }

  try {
    const response = await rzp.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
    return response;
  } catch (error) {
    console.error('Razorpay Subscription Cancellation Failed:', error?.error || error);
    throw new Error(error?.error?.description || 'Failed to cancel Razorpay subscription.');
  }
};

/**
 * Fetches Razorpay Subscription details
 * @param {string} subscriptionId 
 * @returns {Promise<Object>}
 */
export const fetchRazorpaySubscription = async (subscriptionId) => {
  const rzp = getRazorpayInstance();
  if (!rzp) {
    throw new Error('Razorpay is not configured on the server.');
  }

  try {
    const subscription = await rzp.subscriptions.fetch(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Razorpay Fetch Subscription Failed:', error?.error || error);
    throw new Error('Failed to fetch subscription from Razorpay.');
  }
};

/**
 * Verifies Webhook Signature
 * @param {string|Buffer} rawBody 
 * @param {string} signature 
 * @param {string} webhookSecret 
 * @returns {boolean}
 */
export const verifyWebhookSignature = (rawBody, signature, webhookSecret) => {
  const secret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not configured.');
    return false;
  }
  if (!signature) {
    return false;
  }

  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return generatedSignature === signature;
};

export default {
  createOrder,
  verifySignature,
  getRazorpayInstance,
  getOrCreateMonthlyPlan,
  createRazorpaySubscription,
  verifySubscriptionSignature,
  pauseRazorpaySubscription,
  resumeRazorpaySubscription,
  cancelRazorpaySubscription,
  fetchRazorpaySubscription,
  verifyWebhookSignature,
};
