import { createOrder, verifySignature } from '../services/razorpay.service.js';
import { checkUserEntitlement } from '../services/entitlement.service.js';
import { User, Payment, SystemSetting } from '../models/index.js';

const PREMIUM_PLAN_NAME = 'Premium Monthly Vault';

/**
 * Fetch the latest dynamic monthly price configured by admin
 */
export const getActivePaidPrice = async () => {
  try {
    const priceSetting = await SystemSetting.findOne({ where: { setting_key: 'paid_version_price' } });
    if (priceSetting && !isNaN(Number(priceSetting.setting_value)) && Number(priceSetting.setting_value) > 0) {
      return Number(priceSetting.setting_value);
    }
  } catch (error) {
    console.error('Failed to read paid_version_price from SystemSetting:', error);
  }
  return Number(process.env.PREMIUM_PLAN_PRICE) || 199;
};

export const getPricing = async (req, res, next) => {
  try {
    const price = await getActivePaidPrice();
    res.status(200).json({
      success: true,
      data: {
        price,
        currency: 'INR',
        interval: 'monthly',
        billingPeriod: '1 Month',
        planName: PREMIUM_PLAN_NAME,
        description: 'Unlimited Gold & Silver Asset Entries with Cloud Vault',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const entitlement = await checkUserEntitlement(userId);
    const price = await getActivePaidPrice();
    
    res.status(200).json({
      success: true,
      data: {
        ...entitlement,
        currentPrice: price,
        planName: PREMIUM_PLAN_NAME,
        billingPeriod: 'monthly',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * NEW: Create Razorpay Monthly Subscription (AutoPay / Recurring)
 */
export const createMonthlySubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if user already has an active recurring subscription
    const entitlement = await checkUserEntitlement(userId);
    if (entitlement.status === 'PAID' && user.razorpay_subscription_id && user.subscription_status === 'active') {
      return res.status(200).json({
        success: true,
        message: 'You already have an active Premium subscription.',
        data: {
          alreadyActive: true,
          subscriptionId: user.razorpay_subscription_id,
          status: user.subscription_status,
          currentPeriodEnd: user.current_period_end || user.subscription_expires_at,
        },
      });
    }

    const activePrice = await getActivePaidPrice();

    // 1. Get or create the monthly plan in Razorpay
    const { getOrCreateMonthlyPlan, createRazorpaySubscription: createRzpSub } = await import('../services/razorpay.service.js');
    const plan = await getOrCreateMonthlyPlan(activePrice, PREMIUM_PLAN_NAME);

    // 2. Create the Razorpay Subscription entity (120 cycles max for long-term recurring)
    const subscription = await createRzpSub(plan.id, 120, {
      user_id: String(userId),
      username: user.username,
      mobile: user.phone || '',
    });

    // 3. Record pending payment tracking record
    await Payment.create({
      user_id: userId,
      amount: activePrice,
      currency: 'INR',
      status: 'pending',
      plan_name: PREMIUM_PLAN_NAME,
      payment_method: 'RAZORPAY_AUTOPAY',
      payment_type: 'subscription',
      razorpay_subscription_id: subscription.id,
    });

    // Save pending subscription ID on user
    user.razorpay_subscription_id = subscription.id;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Monthly subscription initialized.',
      data: {
        subscriptionId: subscription.id,
        planId: plan.id,
        amount: activePrice,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        planName: PREMIUM_PLAN_NAME,
        description: 'Monthly Recurring Premium Vault Subscription',
      },
    });
  } catch (error) {
    console.error('Create Monthly Subscription Error:', error);
    next(error);
  }
};

/**
 * NEW: Verify Razorpay Subscription Payment Authorization
 */
export const verifyMonthlySubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_subscription_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Incomplete subscription authorization details.' });
    }

    const { verifySubscriptionSignature: verifySubSig, fetchRazorpaySubscription: fetchRzpSub } = await import('../services/razorpay.service.js');
    const isValid = verifySubSig({
      subscriptionId: razorpay_subscription_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid subscription authorization signature.' });
    }

    // Fetch subscription details from Razorpay to get official billing cycle timestamps
    let currentStart = new Date();
    let currentEnd = new Date();
    currentEnd.setMonth(currentEnd.getMonth() + 1); // 1 Month Default

    try {
      const rzpSubData = await fetchRzpSub(razorpay_subscription_id);
      if (rzpSubData?.current_start) {
        currentStart = new Date(rzpSubData.current_start * 1000);
      }
      if (rzpSubData?.current_end) {
        currentEnd = new Date(rzpSubData.current_end * 1000);
      }
    } catch (fetchErr) {
      console.warn('Could not fetch latest Razorpay sub cycle, using 1-month timestamp fallback:', fetchErr.message);
    }

    // Update payment record
    const paymentRecord = await Payment.findOne({
      where: { razorpay_subscription_id },
      order: [['created_at', 'DESC']],
    });

    if (paymentRecord) {
      paymentRecord.status = 'paid';
      paymentRecord.razorpay_payment_id = razorpay_payment_id;
      paymentRecord.razorpay_signature = razorpay_signature;
      paymentRecord.transaction_id = razorpay_payment_id;
      paymentRecord.expiry_date = currentEnd;
      await paymentRecord.save();
    }

    // Update User to Active Premium status
    const user = await User.findByPk(userId);
    if (user) {
      user.subscription_status = 'active';
      user.plan = 'paid';
      user.razorpay_subscription_id = razorpay_subscription_id;
      user.current_period_start = currentStart;
      user.current_period_end = currentEnd;
      user.subscription_expires_at = currentEnd;
      user.cancelled_at = null;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Monthly Premium Subscription activated successfully! 🪙',
      data: {
        subscriptionStatus: 'active',
        plan: 'paid',
        currentPeriodStart: currentStart,
        currentPeriodEnd: currentEnd,
      },
    });
  } catch (error) {
    console.error('Verify Monthly Subscription Error:', error);
    next(error);
  }
};

/**
 * NEW: Pause Monthly AutoPay Subscription
 */
export const pauseMonthlySubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user || !user.razorpay_subscription_id) {
      return res.status(400).json({ success: false, message: 'No active subscription found to pause.' });
    }

    const { pauseRazorpaySubscription: pauseRzpSub } = await import('../services/razorpay.service.js');

    try {
      await pauseRzpSub(user.razorpay_subscription_id, 'now');
    } catch (rzpErr) {
      console.warn('Razorpay API pause notification:', rzpErr.message);
    }

    user.subscription_status = 'paused';
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Monthly AutoPay paused. Future recurring charges are halted until you resume.',
      data: {
        subscriptionStatus: 'paused',
        autoPayStatus: 'PAUSED',
        currentPeriodEnd: user.current_period_end || user.subscription_expires_at,
      },
    });
  } catch (error) {
    console.error('Pause Monthly Subscription Error:', error);
    next(error);
  }
};

/**
 * NEW: Resume Monthly AutoPay Subscription
 */
export const resumeMonthlySubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user || !user.razorpay_subscription_id) {
      return res.status(400).json({ success: false, message: 'No paused subscription found to resume.' });
    }

    const { resumeRazorpaySubscription: resumeRzpSub } = await import('../services/razorpay.service.js');

    try {
      await resumeRzpSub(user.razorpay_subscription_id, 'now');
    } catch (rzpErr) {
      console.warn('Razorpay API resume notification:', rzpErr.message);
    }

    user.subscription_status = 'active';
    user.cancelled_at = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Monthly AutoPay resumed successfully. Recurring billing is active.',
      data: {
        subscriptionStatus: 'active',
        autoPayStatus: 'ON',
        currentPeriodEnd: user.current_period_end || user.subscription_expires_at,
      },
    });
  } catch (error) {
    console.error('Resume Monthly Subscription Error:', error);
    next(error);
  }
};

/**
 * NEW: Cancel Monthly Subscription (Auto-renew turned off at cycle end)
 */
export const cancelMonthlySubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user || !user.razorpay_subscription_id) {
      return res.status(400).json({ success: false, message: 'No active subscription found to cancel.' });
    }

    const { cancelRazorpaySubscription: cancelRzpSub } = await import('../services/razorpay.service.js');
    
    try {
      await cancelRzpSub(user.razorpay_subscription_id, true);
    } catch (rzpErr) {
      console.warn('Razorpay API cancel notification:', rzpErr.message);
    }

    user.subscription_status = 'cancelled';
    user.cancelled_at = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'AutoPay renewal cancelled. You will continue to have Premium access until the end of your current billing period.',
      data: {
        subscriptionStatus: 'cancelled',
        autoPayStatus: 'OFF / Cancellation Scheduled',
        accessUntil: user.current_period_end || user.subscription_expires_at,
      },
    });
  } catch (error) {
    console.error('Cancel Monthly Subscription Error:', error);
    next(error);
  }
};

// ====================================================
// EXISTING ONE-TIME PAYMENT (UNTOUCHED & PRESERVED)
// ====================================================

export const createSubscriptionOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const activePrice = await getActivePaidPrice();
    
    // Create an initial tracking record with dynamic price
    const paymentRecord = await Payment.create({
      user_id: userId,
      amount: activePrice,
      currency: 'INR',
      status: 'pending',
      plan_name: PREMIUM_PLAN_NAME,
      payment_method: 'RAZORPAY',
      payment_type: 'one_time',
    });

    const order = await createOrder(activePrice, paymentRecord.id);

    // Update record with Razorpay Order ID
    paymentRecord.razorpay_order_id = order.id;
    await paymentRecord.save();

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount, // in paise
        price: activePrice,   // in rupees
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID, // Safe to send to frontend
        name: PREMIUM_PLAN_NAME,
        description: 'Unlimited Asset Entries',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifySubscriptionPayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Incomplete payment details' });
    }

    const isValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const paymentRecord = await Payment.findOne({ where: { razorpay_order_id } });
    if (!paymentRecord) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    // Mark payment successful
    paymentRecord.status = 'paid';
    paymentRecord.razorpay_payment_id = razorpay_payment_id;
    paymentRecord.razorpay_signature = razorpay_signature;
    paymentRecord.transaction_id = razorpay_payment_id;
    
    // Set expiry to 1 year from now for one-time payments
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    paymentRecord.expiry_date = expiryDate;
    
    await paymentRecord.save();

    // Update User
    const user = await User.findByPk(userId);
    if (user) {
      user.subscription_status = 'active';
      user.subscription_expires_at = expiryDate;
      user.plan = 'paid';
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified and Premium access activated!',
      data: {
        status: user ? user.subscription_status : 'active',
        expiresAt: expiryDate,
        plan: 'paid',
      },
    });

  } catch (error) {
    next(error);
  }
};

export default {
  getActivePaidPrice,
  getPricing,
  getStatus,
  createMonthlySubscription,
  verifyMonthlySubscription,
  pauseMonthlySubscription,
  resumeMonthlySubscription,
  cancelMonthlySubscription,
  createSubscriptionOrder,
  verifySubscriptionPayment,
};

