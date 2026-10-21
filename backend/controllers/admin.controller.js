import {
  getDashboardStats,
  getUsers,
  getUserDetails,
  updateUserStatus,
  updateUserPlan,
  deleteUserById,
  getPricingSettings,
  updatePricingSetting,
  getAuditLogs,
} from '../services/admin.service.js';

export const getStats = async (req, res, next) => {
  try {
    const stats = await getDashboardStats();
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      search,
      version,
      status,
      payment_status,
      date_range,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getUsers({
      page,
      limit,
      search,
      version,
      status,
      payment_status,
      date_range,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const details = await getUserDetails(id);

    return res.status(200).json({
      success: true,
      data: details,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to fetch user details.',
    });
  }
};

export const changeUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { is_active, isActive } = req.body;
    if (is_active === undefined && isActive !== undefined) is_active = isActive;
    if (typeof is_active === 'object' && is_active !== null && 'is_active' in is_active) {
      is_active = is_active.is_active;
    }
    if (is_active === 'true' || is_active === 1 || is_active === '1') is_active = true;
    if (is_active === 'false' || is_active === 0 || is_active === '0') is_active = false;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_active (boolean) field is required.',
      });
    }

    const updatedUser = await updateUserStatus(req.user.id, id, is_active);

    return res.status(200).json({
      success: true,
      message: `User status changed to ${is_active ? 'Active' : 'Inactive'} successfully.`,
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    const status = error.statusCode || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to update user status.',
    });
  }
};

export const changeUserPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan, amount, paymentMethod, transactionId } = req.body;

    if (!plan || !['free', 'paid'].includes(plan.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Plan must be either "free" or "paid".',
      });
    }

    const result = await updateUserPlan(req.user.id, id, {
      plan: plan.toLowerCase(),
      amount,
      paymentMethod,
      transactionId,
    });

    return res.status(200).json({
      success: true,
      message: `User plan updated to ${plan.toUpperCase()} successfully.`,
      data: result,
    });
  } catch (error) {
    const status = error.statusCode || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to update user plan.',
    });
  }
};

export const getPricing = async (req, res, next) => {
  try {
    const pricing = await getPricingSettings();
    return res.status(200).json({
      success: true,
      data: pricing,
    });
  } catch (error) {
    next(error);
  }
};

export const changePricing = async (req, res, next) => {
  try {
    let raw = req.body?.price;
    if (typeof raw === 'object' && raw !== null && raw.price !== undefined) {
      raw = raw.price;
    }
    const numericPrice = parseFloat(raw);

    if (raw === undefined || raw === null || isNaN(numericPrice) || numericPrice < 1) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid price (₹1 or greater).',
      });
    }

    const result = await updatePricingSetting(req.user.id, numericPrice);

    return res.status(200).json({
      success: true,
      message: `Paid version price updated from ₹${result.oldPrice} to ₹${result.price}.`,
      data: result,
    });
  } catch (error) {
    const status = error.statusCode || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to update pricing.',
    });
  }
};

export const listAuditLogs = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const logs = await getAuditLogs({ limit });

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

export const listMetalRates = async (req, res, next) => {
  try {
    const { getAdminMetalRates } = await import('../services/admin.service.js');
    const rates = await getAdminMetalRates();
    return res.status(200).json({
      success: true,
      data: rates,
    });
  } catch (error) {
    next(error);
  }
};

export const changeMetalRate = async (req, res, next) => {
  try {
    const { metal, purity, rate, reason } = req.body;
    const { updateAdminMetalRate } = await import('../services/admin.service.js');
    const result = await updateAdminMetalRate(req.user.id, { metal, purity, rate, reason });

    return res.status(200).json({
      success: true,
      message: `Manual calibration recorded for ${result.metal} ${result.purity} at ₹${result.ratePerGram}/g.`,
      data: result,
    });
  } catch (error) {
    const status = error.statusCode || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to update metal rate.',
    });
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteUserById(req.user.id, id);

    return res.status(200).json({
      success: true,
      message: `User account '${deleted.username}' was permanently deleted.`,
      data: deleted,
    });
  } catch (error) {
    const status = error.statusCode || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to delete user.',
    });
  }
};

export default {
  getStats,
  listUsers,
  getUser,
  changeUserStatus,
  changeUserPlan,
  deleteUser,
  getPricing,
  changePricing,
  listAuditLogs,
  listMetalRates,
  changeMetalRate,
};
