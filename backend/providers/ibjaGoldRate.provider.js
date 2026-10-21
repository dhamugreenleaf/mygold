import axios from 'axios';

// Official IBJA (India Bullion and Jewellers Association) Rates API Configuration
const IBJA_PROD_URL = 'https://ibjarates.com/API/GoldRates/';
const IBJA_UAT_URL = 'https://uat.ibjarates.com/API/GoldRates/';
const REQUEST_TIMEOUT_MS = 10000;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes cache for session-based publication

// In-memory cache for IBJA benchmark rates
let cachedIbjaData = null;
let lastFetchTime = 0;
let lastSuccessfulUpdate = null;

/**
 * Provider Metadata
 */
export const PROVIDER_INFO = {
  name: 'IBJA',
  fullName: 'India Bullion and Jewellers Association',
  endpoint: 'https://ibjarates.com/API/GoldRates/',
  market: 'India',
  rateType: 'India Market Benchmark (Excl. GST & Making Charges)',
  sessions: ['AM', 'PM'],
  coverage: 'Pan-India Benchmark (INR)',
};

/**
 * Format local date as YYYY-MM-DD
 */
const getFormattedDate = (date = new Date()) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Safely parse numeric value
 */
const parseNumericRate = (val) => {
  if (val === null || val === undefined) return null;
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(num) || num <= 0 ? null : num;
};

/**
 * Fetch official benchmark rates from IBJA API
 */
export const fetchGoldRatesFromIbja = async () => {
  const now = Date.now();

  // Return cached benchmark if within 30-minute freshness window
  if (cachedIbjaData && (now - lastFetchTime < CACHE_DURATION_MS)) {
    return {
      ...cachedIbjaData,
      isStale: false,
    };
  }

  const accessToken = process.env.IBJA_ACCESS_TOKEN || process.env.IBJA_API_KEY;
  const apiUrl = process.env.IBJA_ENV === 'uat' ? IBJA_UAT_URL : IBJA_PROD_URL;

  if (!accessToken) {
    console.warn('[IBJA_PROVIDER] IBJA_ACCESS_TOKEN is not configured in backend/.env.');
    if (cachedIbjaData) {
      console.log('[IBJA_PROVIDER] Serving last successful cached IBJA benchmark rate. Status: RATE_DELAYED');
      return {
        ...cachedIbjaData,
        isStale: true,
        status: 'RATE_DELAYED',
      };
    }

    const unavailError = new Error(
      'Official IBJA API access token (IBJA_ACCESS_TOKEN) is not configured in backend/.env. Please configure a valid IBJA ACCESS_TOKEN from www.indiagoldratesapi.com.'
    );
    unavailError.isUnavailable = true;
    unavailError.status = 'RATE_UNAVAILABLE';
    unavailError.requiredConfig = 'IBJA_ACCESS_TOKEN';
    throw unavailError;
  }

  console.log('[IBJA_PROVIDER] Fetching official India market benchmark rates from IBJA API...');

  try {
    const todayStr = getFormattedDate();
    const response = await axios.get(apiUrl, {
      params: {
        ACCESS_TOKEN: accessToken,
        START_DATE: todayStr,
        END_DATE: todayStr,
      },
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Accept: 'application/json',
      },
    });

    const responseData = response.data;

    // Handle invalid token responses
    if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].status === 'Invalid') {
      throw new Error(`IBJA API Error: ${responseData[0].message || 'Invalid Access Token'}`);
    }

    if (responseData?.status === 'error' || responseData?.status === 'Invalid') {
      throw new Error(`IBJA API Error: ${responseData.message || 'Authentication / Query failed'}`);
    }

    // Extract rates array or record
    let records = [];
    if (Array.isArray(responseData)) {
      records = responseData;
    } else if (Array.isArray(responseData?.data)) {
      records = responseData.data;
    } else if (responseData?.data && typeof responseData.data === 'object') {
      records = [responseData.data];
    } else if (typeof responseData === 'object') {
      records = [responseData];
    }

    if (records.length === 0) {
      throw new Error('No rate entries returned by IBJA API for the current session.');
    }

    // Get the most recent session entry (PM session preferred if available, otherwise AM)
    const latestEntry = records[records.length - 1];

    const rate10g_24K = parseNumericRate(
      latestEntry.gold_999 ?? latestEntry.Gold_999 ?? latestEntry.rate_999 ?? latestEntry['999'] ?? latestEntry.gold_24k
    );
    const rate10g_22K = parseNumericRate(
      latestEntry.gold_916 ?? latestEntry.Gold_916 ?? latestEntry.rate_916 ?? latestEntry['916'] ?? latestEntry.gold_22k
    );
    let rate10g_18K = parseNumericRate(
      latestEntry.gold_750 ?? latestEntry.Gold_750 ?? latestEntry.rate_750 ?? latestEntry['750'] ?? latestEntry.gold_18k
    );

    if (!rate10g_24K || !rate10g_22K) {
      throw new Error('Incomplete IBJA 999/916 rate values received from API.');
    }

    if (!rate10g_18K) {
      rate10g_18K = Number((rate10g_24K * 0.75).toFixed(2));
    }

    // Convert per 10g to per gram (pricePerGram = pricePer10Gram / 10)
    const pricePerGram_24K = Number((rate10g_24K / 10).toFixed(2));
    const pricePerGram_22K = Number((rate10g_22K / 10).toFixed(2));
    const pricePerGram_18K = Number((rate10g_18K / 10).toFixed(2));

    const session = latestEntry.session || latestEntry.Session || (new Date().getHours() >= 17 ? 'PM' : 'AM');
    const updatedAt = latestEntry.date || latestEntry.timestamp
      ? new Date(latestEntry.date || latestEntry.timestamp).toISOString()
      : new Date().toISOString();

    lastSuccessfulUpdate = updatedAt;

    const result = {
      source: PROVIDER_INFO.name,
      market: PROVIDER_INFO.market,
      currency: 'INR',
      rateType: PROVIDER_INFO.rateType,
      session,
      rates: {
        '24K': {
          pricePerGram: pricePerGram_24K,
          pricePer10Gram: rate10g_24K,
          fineness: 999,
        },
        '22K': {
          pricePerGram: pricePerGram_22K,
          pricePer10Gram: rate10g_22K,
          fineness: 916,
        },
        '18K': {
          pricePerGram: pricePerGram_18K,
          pricePer10Gram: rate10g_18K,
          fineness: 750,
        },
      },
      ratesMeta: {
        '24K': {
          fineness: 999,
          purity: '99.9% Fine Gold (999)',
          benchmark: 'IBJA India Market Benchmark',
        },
        '22K': {
          fineness: 916,
          purity: '91.6% Standard (916)',
          benchmark: 'IBJA Hallmark Benchmark',
        },
        '18K': {
          fineness: 750,
          purity: '75.0% Standard (750)',
          benchmark: 'IBJA India Benchmark',
        },
      },
      updatedAt,
      lastSuccessfulUpdate,
      status: 'LATEST_MARKET_RATE',
      isStale: false,
      isUnavailable: false,
      disclaimer:
        'IBJA benchmark rate. Excludes GST and jewellery making charges. Actual retail and buyback prices may vary by seller and location.',
    };

    cachedIbjaData = result;
    lastFetchTime = now;

    console.log(
      `[IBJA_PROVIDER] Official IBJA benchmark rates fetched: 24K(999)=₹${pricePerGram_24K}/g (₹${rate10g_24K}/10g), 22K(916)=₹${pricePerGram_22K}/g (₹${rate10g_22K}/10g), 18K(750)=₹${pricePerGram_18K}/g (Session: ${session})`
    );

    return result;
  } catch (error) {
    console.error('[IBJA_PROVIDER] Error communicating with IBJA API:', error.message);

    if (cachedIbjaData) {
      console.log('[IBJA_PROVIDER] Serving last successful cached IBJA benchmark. Status: RATE_DELAYED');
      return {
        ...cachedIbjaData,
        isStale: true,
        status: 'RATE_DELAYED',
      };
    }

    const unavailError = new Error(
      error.message || 'Official IBJA India market benchmark rate temporarily unavailable'
    );
    unavailError.isUnavailable = true;
    unavailError.status = 'RATE_UNAVAILABLE';
    throw unavailError;
  }
};

export default {
  PROVIDER_INFO,
  fetchGoldRatesFromIbja,
};
