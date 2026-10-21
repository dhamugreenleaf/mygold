import { Op } from 'sequelize';
import { User, Payment, SystemSetting, AuditLog, GoldPurchase } from '../models/index.js';

/**
 * Retrieve comprehensive, real-time administrative dashboard statistics
 */
export const getDashboardStats = async () => {
  // 1. User metrics
  const totalUsers = await User.count();
  const paidUsers = await User.count({ where: { plan: 'paid' } });
  const freeUsers = await User.count({ where: { plan: 'free' } });
  const activeUsers = await User.count({ where: { is_active: true } });
  const inactiveUsers = await User.count({ where: { is_active: false } });

  // 2. Payment & revenue metrics
  const totalPaymentsCount = await Payment.count();
  const paidPaymentsCount = await Payment.count({ where: { status: 'paid' } });
  const pendingPaymentsCount = await Payment.count({ where: { status: 'pending' } });
  const failedPaymentsCount = await Payment.count({ where: { status: 'failed' } });

  const totalCollectedRevenue = (await Payment.sum('amount', { where: { status: 'paid' } })) || 0;
  const subscriptionRevenue = (await Payment.sum('amount', { where: { status: 'paid', payment_type: 'subscription' } })) || 0;
  const oneTimeRevenue = (await Payment.sum('amount', { where: { status: 'paid', payment_type: 'one_time' } })) || (totalCollectedRevenue - subscriptionRevenue);

  // Subscription status breakdown
  const activeSubscriptions = await User.count({ where: { subscription_status: 'active' } });
  const cancelledSubscriptions = await User.count({ where: { subscription_status: 'cancelled' } });
  const expiredSubscriptions = await User.count({ where: { subscription_status: 'expired' } });
  const pausedSubscriptions = await User.count({ where: { subscription_status: 'paused' } });

  // 3. Current Paid Version Price configuration
  const priceSetting = await SystemSetting.findOne({ where: { setting_key: 'paid_version_price' } });
  const currentPaidPrice = priceSetting ? parseFloat(priceSetting.setting_value) : 199;

  // 4. Recent registered users (last 5)
  const recentUsers = await User.findAll({
    limit: 5,
    order: [['created_at', 'DESC']],
    attributes: [
      'id',
      'username',
      'email',
      'phone',
      'plan',
      'role',
      'is_active',
      'subscription_status',
      'current_period_end',
      'created_at',
    ],
  });

  // 5. Recent transactions (last 5)
  const recentPayments = await Payment.findAll({
    limit: 5,
    order: [['created_at', 'DESC']],
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email'],
      },
    ],
  });

  // 6. Asset metrics (Gold vs Silver)
  const totalGoldAssets = await GoldPurchase.count({ where: { asset_type: 'GOLD' } });
  const totalSilverAssets = await GoldPurchase.count({ where: { asset_type: 'SILVER' } });
  const totalAssets = totalGoldAssets + totalSilverAssets;

  // 7. Live rates snapshot for admin quick KPI
  let ratesSummary = { goldRate24K: 0, goldRate22K: 0, silverRate999: 0 };
  try {
    const { getLatestGoldRates } = await import('./goldRate.service.js');
    const liveRates = await getLatestGoldRates();
    ratesSummary = {
      goldRate24K: liveRates.rate24K || 0,
      goldRate22K: liveRates.rate22K || 0,
      silverRate999: liveRates.silver?.['999'] || liveRates.silverRate || 0,
    };
  } catch (rateErr) {
    console.error('Rates summary fetch error in admin stats:', rateErr.message);
  }

  return {
    users: {
      total: totalUsers,
      paid: paidUsers,
      free: freeUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      paidPercentage: totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(1) : 0,
      freePercentage: totalUsers > 0 ? ((freeUsers / totalUsers) * 100).toFixed(1) : 0,
      activePercentage: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0,
      inactivePercentage: totalUsers > 0 ? ((inactiveUsers / totalUsers) * 100).toFixed(1) : 0,
    },
    subscriptions: {
      active: activeSubscriptions,
      cancelled: cancelledSubscriptions,
      expired: expiredSubscriptions,
      paused: pausedSubscriptions,
      subscriptionRevenue,
      oneTimeRevenue,
    },
    assets: {
      total: totalAssets,
      gold: totalGoldAssets,
      silver: totalSilverAssets,
    },
    rates: ratesSummary,
    payments: {
      totalCount: totalPaymentsCount,
      paidCount: paidPaymentsCount,
      pendingCount: pendingPaymentsCount,
      failedCount: failedPaymentsCount,
      totalRevenue: totalCollectedRevenue,
      subscriptionRevenue,
      oneTimeRevenue,
      currency: 'INR',
    },
    pricing: {
      currentPaidPrice,
      currency: 'INR',
      currencySymbol: '₹',
      billingPeriod: 'monthly',
    },
    recentUsers,
    recentPayments,
  };
};

/**
 * Query users with server-side search, filtering, pagination, and sorting
 */
export const getUsers = async ({
  page = 1,
  limit = 10,
  search = '',
  version = 'all',
  status = 'all',
  payment_status = 'all',
  date_range = 'all',
  startDate,
  endDate,
  sortBy = 'created_at',
  sortOrder = 'DESC',
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const where = {};

  // 1. Text Search (Name, Email, Phone, or User ID)
  if (search && search.trim()) {
    const term = search.trim();
    const isNum = !isNaN(term);
    const searchConditions = [
      { username: { [Op.like]: `%${term}%` } },
      { email: { [Op.like]: `%${term}%` } },
      { phone: { [Op.like]: `%${term}%` } },
    ];
    if (isNum) {
      searchConditions.push({ id: parseInt(term, 10) });
    }
    where[Op.or] = searchConditions;
  }

  // 2. Filter by Version / Plan (paid / free)
  if (version && version !== 'all') {
    where.plan = version.toLowerCase();
  }

  // 3. Filter by Status (active / inactive)
  if (status && status !== 'all') {
    if (status === 'active') where.is_active = true;
    if (status === 'inactive') where.is_active = false;
  }

  // 4. Date Range Filter (created_at)
  if (date_range && date_range !== 'all') {
    const now = new Date();
    if (date_range === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where.created_at = { [Op.gte]: startOfDay };
    } else if (date_range === 'this_week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      where.created_at = { [Op.gte]: sevenDaysAgo };
    } else if (date_range === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      where.created_at = { [Op.gte]: startOfMonth };
    } else if (date_range === 'custom' && (startDate || endDate)) {
      const dateCond = {};
      if (startDate) dateCond[Op.gte] = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateCond[Op.lte] = end;
      }
      where.created_at = dateCond;
    }
  }

  // Allowed sort fields
  const allowedSortFields = ['id', 'username', 'email', 'plan', 'role', 'is_active', 'created_at', 'last_login_at'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const orderDirection = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // 5. Payment status filter requires conditional query
  const paymentInclude = {
    model: Payment,
    as: 'payments',
    required: false,
    order: [['created_at', 'DESC']],
  };

  const { count, rows: rawUsers } = await User.findAndCountAll({
    where,
    include: [paymentInclude],
    distinct: true,
    order: [[sortField, orderDirection]],
    limit: limitNum,
    offset,
  });

  // Transform user records to include their latest payment summary and safe details
  let formattedUsers = rawUsers.map((user) => {
    const safe = user.toSafeObject();
    const payments = user.payments || [];
    const latestPayment = payments.length > 0 ? payments[payments.length - 1] : null;

    return {
      ...safe,
      latest_payment: latestPayment
        ? {
            id: latestPayment.id,
            amount: latestPayment.amount,
            currency: latestPayment.currency,
            status: latestPayment.status,
            plan_name: latestPayment.plan_name,
            transaction_id: latestPayment.transaction_id,
            payment_method: latestPayment.payment_method,
            payment_date: latestPayment.payment_date,
            expiry_date: latestPayment.expiry_date,
          }
        : null,
      total_payments_count: payments.length,
      has_paid: safe.plan === 'paid',
    };
  });

  // If filtered by payment_status
  if (payment_status && payment_status !== 'all') {
    if (payment_status === 'na') {
      formattedUsers = formattedUsers.filter((u) => !u.latest_payment);
    } else {
      formattedUsers = formattedUsers.filter((u) => u.latest_payment?.status === payment_status);
    }
  }

  const totalPages = Math.ceil(count / limitNum);

  return {
    users: formattedUsers,
    pagination: {
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(1, totalPages),
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
    },
  };
};

/**
 * Retrieve comprehensive single user profile details with payments and gold portfolio stats
 */
export const getUserDetails = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Payment,
        as: 'payments',
        order: [['created_at', 'DESC']],
      },
    ],
  });

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  // Get user holdings summary
  const goldPurchases = await GoldPurchase.findAll({
    where: { user_id: userId },
    attributes: ['weight', 'purchase_rate', 'gold_purity'],
  });

  let totalWeight = 0;
  let totalInvested = 0;
  goldPurchases.forEach((p) => {
    const w = parseFloat(p.weight) || 0;
    const rate = parseFloat(p.purchase_rate) || 0;
    totalWeight += w;
    totalInvested += w * rate;
  });

  return {
    user: user.toSafeObject(),
    payments: user.payments || [],
    portfolioSummary: {
      totalItems: goldPurchases.length,
      totalWeightGrams: totalWeight,
      totalInvestedINR: totalInvested,
    },
  };
};

/**
 * Update user active/inactive account status
 */
export const updateUserStatus = async (adminId, userId, isActive) => {
  const targetUser = await User.findByPk(userId);
  if (!targetUser) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  // Prevent admin from deactivating themselves
  if (targetUser.id === Number(adminId) && !isActive) {
    const error = new Error('You cannot deactivate your own administrator account.');
    error.statusCode = 400;
    throw error;
  }

  const oldStatus = targetUser.is_active ? 'active' : 'inactive';
  const newStatus = isActive ? 'active' : 'inactive';

  targetUser.is_active = !!isActive;
  await targetUser.save();

  // Audit log
  await AuditLog.create({
    admin_id: adminId,
    action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    target_type: 'User',
    target_id: String(targetUser.id),
    old_value: oldStatus,
    new_value: newStatus,
    description: `Admin ${isActive ? 'activated' : 'deactivated'} user ${targetUser.username} (${targetUser.email}).`,
  });

  return targetUser.toSafeObject();
};

/**
 * Update user plan (free <-> paid)
 */
export const updateUserPlan = async (adminId, userId, { plan, amount, paymentMethod, transactionId }) => {
  const targetUser = await User.findByPk(userId);
  if (!targetUser) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const cleanPlan = plan === 'paid' ? 'paid' : 'free';
  const oldPlan = targetUser.plan;

  targetUser.plan = cleanPlan;
  await targetUser.save();

  let paymentRecord = null;
  if (cleanPlan === 'paid') {
    // Check price setting
    const priceSetting = await SystemSetting.findOne({ where: { setting_key: 'paid_version_price' } });
    const configuredPrice = priceSetting ? parseFloat(priceSetting.setting_value) : 999;
    const finalAmount = amount ? parseFloat(amount) : configuredPrice;

    paymentRecord = await Payment.create({
      user_id: targetUser.id,
      amount: finalAmount,
      currency: 'INR',
      status: 'paid',
      plan_name: 'Premium Vault Pro',
      transaction_id: transactionId || `TXN_ADMIN_SET_${Date.now()}`,
      payment_method: paymentMethod || 'Admin Manual',
      payment_date: new Date(),
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
  }

  await AuditLog.create({
    admin_id: adminId,
    action: 'USER_PLAN_UPDATE',
    target_type: 'User',
    target_id: String(targetUser.id),
    old_value: oldPlan,
    new_value: cleanPlan,
    description: `Admin changed plan of user ${targetUser.username} from ${oldPlan} to ${cleanPlan}.`,
  });

  return {
    user: targetUser.toSafeObject(),
    payment: paymentRecord,
  };
};

/**
 * Retrieve current paid version pricing configuration
 */
export const getPricingSettings = async () => {
  let setting = await SystemSetting.findOne({ where: { setting_key: 'paid_version_price' } });
  if (!setting) {
    setting = await SystemSetting.create({
      setting_key: 'paid_version_price',
      setting_value: '999',
      setting_type: 'number',
      description: 'Current price for the Paid / Premium Gold Vault Version (INR)',
    });
  }

  return {
    settingKey: setting.setting_key,
    price: parseFloat(setting.setting_value),
    currency: 'INR',
    currencySymbol: '₹',
    description: setting.description,
    updatedAt: setting.updated_at,
  };
};

/**
 * Update current paid version pricing
 * Strictly preserves historical payment records in the database
 */
export const updatePricingSetting = async (adminId, price) => {
  const numericPrice = parseFloat(price);

  if (isNaN(numericPrice) || numericPrice <= 0) {
    const error = new Error('Paid version price must be a valid number greater than 0.');
    error.statusCode = 400;
    throw error;
  }

  let setting = await SystemSetting.findOne({ where: { setting_key: 'paid_version_price' } });
  const oldPrice = setting ? setting.setting_value : '999';

  if (!setting) {
    setting = await SystemSetting.create({
      setting_key: 'paid_version_price',
      setting_value: String(numericPrice),
      setting_type: 'number',
      description: 'Current price for the Paid / Premium Gold Vault Version (INR)',
    });
  } else {
    setting.setting_value = String(numericPrice);
    await setting.save();
  }

  // Audit log
  await AuditLog.create({
    admin_id: adminId,
    action: 'PRICING_UPDATED',
    target_type: 'SystemSetting',
    target_id: 'paid_version_price',
    old_value: `₹${oldPrice}`,
    new_value: `₹${numericPrice}`,
    description: `Paid version price changed from ₹${oldPrice} to ₹${numericPrice}. (Historical payment records remain intact)`,
  });

  return {
    price: numericPrice,
    currency: 'INR',
    currencySymbol: '₹',
    oldPrice: parseFloat(oldPrice),
    updatedAt: setting.updated_at,
  };
};

/**
 * Retrieve recent administrative audit logs
 */
export const getAuditLogs = async ({ limit = 20 }) => {
  const logs = await AuditLog.findAll({
    limit: Math.min(100, parseInt(limit, 10) || 20),
    order: [['created_at', 'DESC']],
    include: [
      {
        model: User,
        as: 'admin',
        attributes: ['id', 'username', 'email'],
      },
    ],
  });

  return logs;
};

/**
 * Retrieve current metal rates and configuration for admin management
 */
export const getAdminMetalRates = async () => {
  const { getLatestGoldRates } = await import('./goldRate.service.js');
  const ratesData = await getLatestGoldRates();

  return {
    source: ratesData.source,
    updatedAt: ratesData.updatedAt,
    sourceUpdate: ratesData.sourceUpdate,
    status: ratesData.status,
    gold: [
      {
        metal: 'GOLD',
        purity: '24K',
        label: '24K Fine Gold (999)',
        rate_per_gram: ratesData.rate24K,
        ratePerGram: ratesData.rate24K,
        ratePer8Gram: ratesData.rates?.['24K']?.pricePer8Gram || ratesData.rate24K * 8,
        currency: 'INR',
        source: ratesData.source,
        status: ratesData.status,
      },
      {
        metal: 'GOLD',
        purity: '22K',
        label: '22K Standard Gold (916)',
        rate_per_gram: ratesData.rate22K,
        ratePerGram: ratesData.rate22K,
        ratePer8Gram: ratesData.rates?.['22K']?.pricePer8Gram || ratesData.rate22K * 8,
        currency: 'INR',
        source: ratesData.source,
        status: ratesData.status,
      },
      {
        metal: 'GOLD',
        purity: '18K',
        label: '18K Gold (750)',
        rate_per_gram: ratesData.rate18K || Number((ratesData.rate24K * 0.75).toFixed(2)),
        ratePerGram: ratesData.rate18K || Number((ratesData.rate24K * 0.75).toFixed(2)),
        ratePer8Gram: Number(((ratesData.rate18K || ratesData.rate24K * 0.75) * 8).toFixed(2)),
        currency: 'INR',
        source: ratesData.source,
        status: ratesData.status,
      },
    ],
    silver: [
      {
        metal: 'SILVER',
        purity: '999',
        label: '999 Fine Silver (99.9%)',
        rate_per_gram: ratesData.silver?.['999'] || ratesData.silverRate,
        ratePerGram: ratesData.silver?.['999'] || ratesData.silverRate,
        ratePer10Gram: Number(((ratesData.silver?.['999'] || ratesData.silverRate) * 10).toFixed(2)),
        currency: 'INR',
        source: ratesData.source,
        status: ratesData.status,
      },
      {
        metal: 'SILVER',
        purity: '925',
        label: '925 Sterling Silver (92.5%)',
        rate_per_gram: ratesData.silver?.['925'] || Number((ratesData.silverRate * 0.925).toFixed(2)),
        ratePerGram: ratesData.silver?.['925'] || Number((ratesData.silverRate * 0.925).toFixed(2)),
        ratePer10Gram: Number(((ratesData.silver?.['925'] || ratesData.silverRate * 0.925) * 10).toFixed(2)),
        currency: 'INR',
        source: ratesData.source,
        status: ratesData.status,
      },
      {
        metal: 'SILVER',
        purity: '916',
        label: '916 Silver (91.6%)',
        rate_per_gram: ratesData.silver?.['916'] || Number((ratesData.silverRate * 0.916).toFixed(2)),
        ratePerGram: ratesData.silver?.['916'] || Number((ratesData.silverRate * 0.916).toFixed(2)),
        ratePer10Gram: Number(((ratesData.silver?.['916'] || ratesData.silverRate * 0.916) * 10).toFixed(2)),
        currency: 'INR',
        source: ratesData.source,
        status: ratesData.status,
      },
      {
        metal: 'SILVER',
        purity: '900',
        label: '900 Coin Silver (90.0%)',
        rate_per_gram: ratesData.silver?.['900'] || Number((ratesData.silverRate * 0.900).toFixed(2)),
        ratePerGram: ratesData.silver?.['900'] || Number((ratesData.silverRate * 0.900).toFixed(2)),
        ratePer10Gram: Number(((ratesData.silver?.['900'] || ratesData.silverRate * 0.900) * 10).toFixed(2)),
        currency: 'INR',
        source: ratesData.source,
        status: ratesData.status,
      },
    ],
  };
};

/**
 * Record a manual metal rate override/update with audit logging
 */
export const updateAdminMetalRate = async (adminId, { metal, purity, rate, reason }) => {
  const numericRate = parseFloat(rate);
  if (isNaN(numericRate) || numericRate <= 0) {
    const error = new Error('Rate per gram must be a valid positive number.');
    error.statusCode = 400;
    throw error;
  }

  const cleanMetal = (metal || 'GOLD').toUpperCase();
  const cleanPurity = (purity || '24K').toUpperCase();

  // Audit log for metal rate update
  await AuditLog.create({
    admin_id: adminId,
    action: 'RATE_OVERRIDE_RECORDED',
    target_type: 'MetalRate',
    target_id: `${cleanMetal}_${cleanPurity}`,
    old_value: 'Market Feed Rate',
    new_value: `₹${numericRate}/g`,
    description: `Manual override noted for ${cleanMetal} ${cleanPurity} to ₹${numericRate}/g. Reason: ${reason || 'Admin calibration'}`,
  });

  return {
    metal: cleanMetal,
    purity: cleanPurity,
    ratePerGram: numericRate,
    reason: reason || 'Admin calibration',
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Permanently delete a user account and associated records
 */
export const deleteUserById = async (adminId, userId) => {
  const targetUser = await User.findByPk(userId);
  if (!targetUser) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  // Prevent admin from deleting themselves
  if (targetUser.id === Number(adminId)) {
    const error = new Error('You cannot delete your own administrator account.');
    error.statusCode = 400;
    throw error;
  }

  // Prevent deleting other admin accounts
  if (targetUser.role === 'admin') {
    const error = new Error('Administrator accounts cannot be deleted directly.');
    error.statusCode = 400;
    throw error;
  }

  const username = targetUser.username;
  const email = targetUser.email || 'No email';
  const phone = targetUser.phone || 'No phone';

  // Audit log before deleting
  await AuditLog.create({
    admin_id: adminId,
    action: 'USER_DELETED',
    target_type: 'User',
    target_id: String(targetUser.id),
    old_value: `${username} (${email})`,
    new_value: 'PERMANENTLY_DELETED',
    description: `Admin deleted user account ${username} (Email: ${email}, Phone: ${phone}).`,
  });

  await targetUser.destroy();

  return {
    id: userId,
    username,
    email,
  };
};

export default {
  getDashboardStats,
  getUsers,
  getUserDetails,
  updateUserStatus,
  updateUserPlan,
  deleteUserById,
  getPricingSettings,
  updatePricingSetting,
  getAuditLogs,
  getAdminMetalRates,
  updateAdminMetalRate,
};
