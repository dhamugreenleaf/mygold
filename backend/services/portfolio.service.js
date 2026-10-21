import { getAllPurchasesWithMetrics } from './purchase.service.js';
import { getGoldRatesOverview } from './goldRate.service.js';

export const getPortfolioOverview = async (userId, locationParam = {}) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const { summary, purchases, reference_location, source, disclaimer } =
    await getAllPurchasesWithMetrics(userId, locationParam);

  const ratesOverview = await getGoldRatesOverview(locationParam);
  const recentPurchases = purchases.slice(0, 3);

  return {
    summary,
    today_rates: {
      location: ratesOverview.location ?? null,
      rate22K: ratesOverview.rate22K,
      rate24K: ratesOverview.rate24K,
      rate18K: ratesOverview.rate18K,
      silverRate: ratesOverview.silverRate,
      gold: ratesOverview.gold,
      silver: ratesOverview.silver,
      rates: ratesOverview.rates,
      updatedAt: ratesOverview.updatedAt,
      last_updated: ratesOverview.updatedAt,
      source: ratesOverview.source,
      sourceUpdate: ratesOverview.sourceUpdate,
      rateType: ratesOverview.rateType,
      ratesMeta: ratesOverview.ratesMeta,
      disclaimer: ratesOverview.disclaimer,
      isStale: ratesOverview.isStale,
      isUnavailable: ratesOverview.isUnavailable,
    },
    reference_location: reference_location ?? null,
    source,
    disclaimer,
    recent_purchases: recentPurchases,
    purchases,
  };
};

export default {
  getPortfolioOverview,
};
