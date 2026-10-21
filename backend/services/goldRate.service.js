import { fetchGoldRatesFromLiveChennai, PROVIDER_INFO as LIVE_CHENNAI_PROVIDER_INFO } from '../providers/liveChennaiGoldRate.provider.js';

export const PROVIDER_INFO = LIVE_CHENNAI_PROVIDER_INFO;

export const SUPPORTED_LOCATIONS = [
  { id: 'chennai', city: 'Chennai', state: 'Tamil Nadu', country: 'India', label: 'Chennai, Tamil Nadu (LiveChennai)' },
  { id: 'coimbatore', city: 'Coimbatore', state: 'Tamil Nadu', country: 'India', label: 'Coimbatore, Tamil Nadu' },
  { id: 'all_india', city: 'Pan-India', state: 'India', country: 'India', label: 'Pan-India Market' },
];

/**
 * Fetch Live Chennai gold and silver rates (Primary Provider)
 */
export const getLatestGoldRates = async (locationParam = {}) => {
  try {
    const rateResult = await fetchGoldRatesFromLiveChennai();
    const normalizedCity = locationParam.city || 'Chennai';
    const normalizedState = locationParam.state || 'Tamil Nadu';
    const normalizedCountry = locationParam.country || 'India';

    return {
      ...rateResult,
      location: {
        city: normalizedCity,
        state: normalizedState,
        country: normalizedCountry,
      },
    };
  } catch (err) {
    console.error('[BULLION_SERVICE] LiveChennai provider failed:', err.message);
    throw err;
  }
};

/**
 * Map helper for purchase & health services
 */
export const getLatestGoldRatesMap = async (locationParam = {}) => {
  const data = await getLatestGoldRates(locationParam);
  return {
    '24K': data.rate24K,
    '22K': data.rate22K,
    '18K': data.rate18K,
    silver: data.silverRate,
    silverRate: data.silverRate,
    '999': data.silver?.['999'] || data.silverRate,
    '925': data.silver?.['925'] || Number((data.silverRate * 0.925).toFixed(2)),
    '916': data.silver?.['916'] || Number((data.silverRate * 0.916).toFixed(2)),
    '900': data.silver?.['900'] || Number((data.silverRate * 0.900).toFixed(2)),
    gold: data.gold,
    silverPurities: data.silver,
    rates: data.rates,
    ratesMeta: data.ratesMeta,
    rate24K: data.rate24K,
    rate22K: data.rate22K,
    rate18K: data.rate18K,
    source: data.source,
    sourceUpdate: data.sourceUpdate,
    date: data.date,
    rateType: data.rateType,
    location: data.location,
    disclaimer: data.disclaimer,
    updatedAt: data.updatedAt,
    last_updated: data.updatedAt,
    isStale: data.isStale,
    isUnavailable: data.isUnavailable,
    status: data.status,
  };
};

/**
 * Overview helper for portfolio service
 */
export const getGoldRatesOverview = async (locationParam = {}) => {
  return await getLatestGoldRates(locationParam);
};

/**
 * Supported locations helper
 */
export const getSupportedLocations = () => {
  return {
    locations: SUPPORTED_LOCATIONS,
    defaultLocation: SUPPORTED_LOCATIONS[0],
  };
};

export default {
  PROVIDER_INFO,
  SUPPORTED_LOCATIONS,
  getLatestGoldRates,
  getLatestGoldRatesMap,
  getGoldRatesOverview,
  getSupportedLocations,
};