import { User, GoldPurchase } from '../models/index.js';

export const FREE_ASSET_ENTRY_LIMIT = 10;

/**
 * Counts all valid combined Gold and Silver asset records created by the user
 * @param {number} userId 
 * @returns {Promise<number>}
 */
export const getCombinedAssetEntryCount = async (userId) => {
  if (!userId) return 0;
  const count = await GoldPurchase.count({
    where: { user_id: userId },
  });
  return count;
};

/**
 * Validates whether user currently possesses an active paid subscription or admin privileges
 * @param {number|Object} userOrId 
 * @returns {Promise<boolean>}
 */
export const hasActivePremiumSubscription = async (userOrId) => {
  let user = userOrId;
  if (typeof userOrId === 'number' || typeof userOrId === 'string') {
    user = await User.findByPk(userOrId);
  }
  if (!user) return false;

  // Admin always has full access
  if (user.role === 'admin') return true;

  const now = new Date();

  // 1. Check current_period_end from Razorpay Subscription
  if (user.current_period_end) {
    const periodEnd = new Date(user.current_period_end);
    if (periodEnd > now && (user.subscription_status === 'active' || user.subscription_status === 'cancelled')) {
      return true;
    }
  }

  // 2. Check subscription_expires_at fallback
  if (user.subscription_expires_at) {
    const expiry = new Date(user.subscription_expires_at);
    if (expiry > now && (user.subscription_status === 'active' || user.subscription_status === 'cancelled' || user.plan === 'paid')) {
      return true;
    }
  }

  // 3. Fallback active status check
  if (user.subscription_status === 'active' || user.plan === 'paid') {
    return true;
  }

  return false;
};

/**
 * Checks if a user is entitled to create a new asset entry (Gold or Silver).
 * Rules:
 * - 0 to 10 combined entries: FREE
 * - 11th entry onward: Requires ACTIVE Monthly Premium Subscription
 * @param {number} userId 
 * @returns {Promise<Object>}
 */
export const checkUserEntitlement = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const combinedEntries = await getCombinedAssetEntryCount(userId);
  const isPremiumActive = await hasActivePremiumSubscription(user);

  // If user has active paid subscription or admin, unlimited entries allowed
  if (isPremiumActive) {
    return {
      canCreate: true,
      reason: 'ACTIVE_SUBSCRIPTION',
      entriesUsed: combinedEntries,
      remainingFree: 0,
      status: 'PAID',
      subscriptionStatus: user.subscription_status || 'active',
      currentPeriodEnd: user.current_period_end || user.subscription_expires_at || null,
      isCancelled: !!user.cancelled_at,
    };
  }

  // Free plan check: 0-9 entries allow 10th entry
  if (combinedEntries < FREE_ASSET_ENTRY_LIMIT) {
    return {
      canCreate: true,
      reason: 'FREE_TIER_AVAILABLE',
      entriesUsed: combinedEntries,
      remainingFree: FREE_ASSET_ENTRY_LIMIT - combinedEntries,
      status: 'FREE',
      subscriptionStatus: user.subscription_status || 'free',
    };
  }

  // Limit reached (10 or more entries) without an active subscription
  return {
    canCreate: false,
    reason: 'FREE_LIMIT_REACHED',
    entriesUsed: combinedEntries,
    remainingFree: 0,
    status: 'PAYMENT_REQUIRED',
    subscriptionStatus: user.subscription_status || 'free',
  };
};

/**
 * Increments the user free entry counter safely within a transaction
 * @param {number} userId 
 * @param {Object} transaction - Sequelize transaction object
 */
export const incrementFreeEntryUsage = async (userId, transaction) => {
  const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!user) {
    throw new Error('User not found for entitlement increment');
  }

  const actualCount = await GoldPurchase.count({
    where: { user_id: userId },
    transaction,
  });

  user.free_entries_used = actualCount;
  await user.save({ transaction });
};

export default {
  FREE_ASSET_ENTRY_LIMIT,
  getCombinedAssetEntryCount,
  hasActivePremiumSubscription,
  checkUserEntitlement,
  incrementFreeEntryUsage,
};
