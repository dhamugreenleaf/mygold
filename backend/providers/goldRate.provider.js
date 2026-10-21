import axios from 'axios';

// GoldPrice.dev Live Carat API Endpoint (Live Spot Bullion Benchmark in INR)
const GOLD_PRICE_API_URL = 'https://api.goldprice.dev/v1/carat';
const REQUEST_TIMEOUT_MS = 8000;
const CACHE_DURATION_MS = 60 * 1000; // 60 seconds cache for near-realtime fresh rates

// In-memory cache for live rates
let cachedRateData = null;
let lastFetchTime = 0;
let lastSuccessfulUpdate = null;

/**
 * Provider Metadata
 */
export const PROVIDER_INFO = {
  name: 'GoldPrice.dev Live Spot Bullion API',
  endpoint: 'https://api.goldprice.dev/v1/carat?currency=INR',
  rateType: 'Live Spot Bullion Benchmark',
  supportsRegionalCities: false,
  coverage: 'India (INR)',
};

/**
 * Fetch live rates from GoldPrice.dev with 60s cache and graceful fallback
 */
export const fetchGoldRatesFromProvider = async () => {
  const now = Date.now();

  // Return valid cached rates if within 60-second freshness window
  if (cachedRateData && (now - lastFetchTime < CACHE_DURATION_MS)) {
    return {
      ...cachedRateData,
      isStale: false,
      status: 'LIVE',
    };
  }

  console.log('[GOLD_RATE] Fetching live GoldPrice.dev rates...');

  try {
    const headers = {
      Accept: 'application/json',
    };

    // Attach server-side API key if configured (never logged or sent to client)
    if (process.env.GOLDPRICE_API_KEY) {
      headers['x-api-key'] = process.env.GOLDPRICE_API_KEY;
    }

    const response = await axios.get(GOLD_PRICE_API_URL, {
      params: { currency: 'INR' },
      timeout: REQUEST_TIMEOUT_MS,
      headers,
    });

    const apiData = response.data;

    // Strict Data Validation
    if (!apiData || typeof apiData !== 'object') {
      throw new Error('Malformed or empty payload from gold price provider.');
    }

    const raw24k = parseFloat(apiData.price_gram_24k);
    const raw22k = parseFloat(apiData.price_gram_22k);
    const raw18k = apiData.price_gram_18k ? parseFloat(apiData.price_gram_18k) : null;

    if (isNaN(raw24k) || raw24k <= 0 || isNaN(raw22k) || raw22k <= 0) {
      throw new Error('Invalid or non-positive 24K/22K rates returned by provider.');
    }

    const rate24K = Number(raw24k.toFixed(2));
    const rate22K = Number(raw22k.toFixed(2));
    const is18KDerived = raw18k === null || isNaN(raw18k) || raw18k <= 0;
    const rate18K = is18KDerived
      ? Number((rate24K * 0.75).toFixed(2))
      : Number(raw18k.toFixed(2));

    const timestamp = apiData.timestamp
      ? new Date(apiData.timestamp).toISOString()
      : new Date().toISOString();

    lastSuccessfulUpdate = timestamp;

    const result = {
      currency: 'INR',
      unit: 'gram',
      source: PROVIDER_INFO.name,
      rateType: PROVIDER_INFO.rateType,
      rates: {
        '24K': {
          pricePerGram: rate24K,
          pricePer10Gram: Number((rate24K * 10).toFixed(2)),
        },
        '22K': {
          pricePerGram: rate22K,
          pricePer10Gram: Number((rate22K * 10).toFixed(2)),
        },
        '18K': {
          pricePerGram: rate18K,
          pricePer10Gram: Number((rate18K * 10).toFixed(2)),
        },
      },
      ratesMeta: {
        '24K': {
          purity: '99.9% Fine Gold (999.9)',
          isDerived: false,
        },
        '22K': {
          purity: '91.6% Standard (916)',
          isDerived: false,
        },
        '18K': {
          purity: '75.0% Standard (750)',
          isDerived: is18KDerived,
          note: is18KDerived ? 'Purity-adjusted spot rate (24K × 0.75)' : 'Live spot bullion rate',
        },
      },
      updatedAt: timestamp,
      lastSuccessfulUpdate,
      status: 'LIVE',
      isStale: false,
      isUnavailable: false,
      disclaimer: 'Estimated portfolio value based on live spot bullion rates. Actual jewellery, dealer, and buyback prices may vary due to purity testing, dealer margins, taxes, making charges, wastage, and individual jeweller policies.',
    };

    // Update in-memory cache
    cachedRateData = result;
    lastFetchTime = now;

    console.log(`[GOLD_RATE] Live rates received successfully: 24K=₹${rate24K}/g, 22K=₹${rate22K}/g, 18K=₹${rate18K}/g (Updated: ${timestamp})`);

    return result;
  } catch (error) {
    console.error('[GOLD_RATE] GoldPrice.dev request failed:', error.message);

    // If previous cached rate exists, return it with STALE / RATE_DELAYED flag
    if (cachedRateData) {
      console.log('[GOLD_RATE] Using last successful rate. Status: RATE_DELAYED');
      return {
        ...cachedRateData,
        isStale: true,
        status: 'RATE_DELAYED',
      };
    }

    // No previous rate available - flag as unavailable
    const unavailError = new Error('Live gold rate temporarily unavailable');
    unavailError.isUnavailable = true;
    unavailError.status = 'RATE_UNAVAILABLE';
    throw unavailError;
  }
};

export default {
  PROVIDER_INFO,
  fetchGoldRatesFromProvider,
};
