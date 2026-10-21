import axios from 'axios';
import * as cheerio from 'cheerio';

const LIVE_CHENNAI_URL = 'https://www.livechennai.com/gold_silverrate.asp';
const REQUEST_TIMEOUT_MS = 10000;
const CACHE_DURATION_MS = 60 * 1000; // 60 seconds cache for near-realtime updates

// In-memory cache
let cachedData = null;
let lastFetchTime = 0;

export const PROVIDER_INFO = {
  name: 'LiveChennai',
  fullName: 'LiveChennai Gold & Silver Rates (Chennai Retail Market)',
  endpoint: LIVE_CHENNAI_URL,
  market: 'Chennai',
  rateType: 'Chennai Bullion Market Rate',
  coverage: 'Chennai (Tamil Nadu, INR)',
};

/**
 * Calculates Silver purity rates based on reference 999 Fine Silver rate
 */
export const calculateSilverPurities = (rate999) => {
  const base999 = Number(rate999) || 260.0;
  return {
    '999': base999, // 99.9% Fine Silver
    '925': Number((base999 * (92.5 / 99.9)).toFixed(2)), // 92.5% Sterling Silver
    '916': Number((base999 * (91.6 / 99.9)).toFixed(2)), // 91.6% Silver
    '900': Number((base999 * (90.0 / 99.9)).toFixed(2)), // 90.0% Coin Silver
  };
};

/**
 * Calculates Gold purity rates including 18K derived from 24K
 */
export const calculateGoldPurities = (rate24K, rate22K) => {
  const base24 = Number(rate24K) || 15513;
  const base22 = Number(rate22K) || 14220;
  return {
    '24K': base24,
    '22K': base22,
    '18K': Number((base24 * 0.75).toFixed(2)),
  };
};

/**
 * Parses LiveChennai HTML to extract:
 * 1. 24K Pure Gold (1g, 8g)
 * 2. 22K Standard Gold (1g, 8g)
 * 3. Silver (1g)
 * 4. Actual Source Update Timestamp
 * 5. History table
 */
export const parseLiveChennaiHtml = (htmlContent) => {
  if (!htmlContent || typeof htmlContent !== 'string') {
    throw new Error('Empty or invalid HTML received from LiveChennai.');
  }

  const $ = cheerio.load(htmlContent);

  // 1. Extract Source Update Timestamp
  let sourceUpdate = null;
  const updateMatch = htmlContent.match(/Chennai\s+Gold\s+Rate\s+Last\s+Update\s+Time:\s*([0-9\/:APMapm\s]+)/i)
    || htmlContent.match(/Last\s+Update\s+Time:\s*([0-9\/:APMapm\s]+)/i);
  if (updateMatch) {
    sourceUpdate = updateMatch[1].trim();
  }

  // 2. Extract Silver Rate from today's summary table
  let silverRatePerGram = null;
  $('table.today-gold-rate tr').each((_, tr) => {
    const row = $(tr).find('th, td').map((__, cell) => $(cell).text().trim().replace(/\s+/g, ' ')).get();
    if (row.length >= 3 && (row[0].includes('/') || row[0].includes('-'))) {
      const silverText = row[2];
      const match = silverText.match(/^([0-9,]+(?:\.[0-9]+)?)/);
      if (match) {
        silverRatePerGram = parseFloat(match[1].replace(/,/g, ''));
      }
    }
  });

  // Fallback regex for silver if table structure slightly shifted
  if (!silverRatePerGram) {
    const silverMatch = htmlContent.match(/Silver\s+1\s*Gm[\s\S]*?([0-9,]+(?:\.[0-9]+)?)/i);
    if (silverMatch) {
      silverRatePerGram = parseFloat(silverMatch[1].replace(/,/g, ''));
    }
  }

  // 3. Extract 24K & 22K Gold Rates from the main table
  let latestEntry = null;
  const history = [];

  $('table.gold-rates, table').each((_, tbl) => {
    const tableText = $(tbl).text();
    if (tableText.includes('Pure Gold') && tableText.includes('Standard Gold') && tableText.includes('1 Gm')) {
      $(tbl).find('tbody tr, tr').each((_, tr) => {
        const cells = $(tr).find('td').map((__, td) => $(td).text().trim().replace(/\s+/g, ' ')).get();
        if (cells.length >= 5) {
          const dateStr = cells[0];
          const rate24k_1g = parseFloat(cells[1].replace(/,/g, ''));
          const rate24k_8g = parseFloat(cells[2].replace(/,/g, ''));
          const rate22k_1g = parseFloat(cells[3].replace(/,/g, ''));
          const rate22k_8g = parseFloat(cells[4].replace(/,/g, ''));

          if (dateStr && !isNaN(rate24k_1g) && rate24k_1g > 0 && !isNaN(rate22k_1g) && rate22k_1g > 0) {
            const entry = {
              date: dateStr,
              rate24K: rate24k_1g,
              rate24K_8g: rate24k_8g,
              rate22K: rate22k_1g,
              rate22K_8g: rate22k_8g,
            };
            if (!latestEntry) {
              latestEntry = entry;
            }
            history.push(entry);
          }
        }
      });
    }
  });

  if (!latestEntry) {
    throw new Error('Failed to parse 24K / 22K rate rows from LiveChennai table.');
  }

  const rate24K = latestEntry.rate24K;
  const rate24K_8g = latestEntry.rate24K_8g || Number((rate24K * 8).toFixed(2));
  const rate22K = latestEntry.rate22K;
  const rate22K_8g = latestEntry.rate22K_8g || Number((rate22K * 8).toFixed(2));
  const rate18K = Number((rate24K * 0.75).toFixed(2));
  const silverRate = silverRatePerGram || 260.0;

  const silverPurities = calculateSilverPurities(silverRate);
  const goldPurities = calculateGoldPurities(rate24K, rate22K);

  return {
    source: 'LiveChennai',
    market: 'Chennai',
    currency: 'INR',
    rateType: 'Chennai Bullion Market Rate',
    date: latestEntry.date,
    sourceUpdate: sourceUpdate || latestEntry.date,
    updatedAt: new Date().toISOString(),
    rate24K,
    rate22K,
    rate18K,
    silverRate,
    gold: {
      '24K': rate24K,
      '22K': rate22K,
      '18K': rate18K,
    },
    silver: silverPurities,
    rates: {
      '24K': {
        pricePerGram: rate24K,
        pricePer8Gram: rate24K_8g,
        pricePer10Gram: Number((rate24K * 10).toFixed(2)),
        purity: '99.9% Pure Gold (24K)',
        metal: 'GOLD',
      },
      '22K': {
        pricePerGram: rate22K,
        pricePer8Gram: rate22K_8g,
        pricePer10Gram: Number((rate22K * 10).toFixed(2)),
        purity: '91.6% Standard Gold (22K)',
        metal: 'GOLD',
      },
      '18K': {
        pricePerGram: rate18K,
        pricePer8Gram: Number((rate18K * 8).toFixed(2)),
        pricePer10Gram: Number((rate18K * 10).toFixed(2)),
        purity: '75.0% Standard Gold (18K)',
        metal: 'GOLD',
      },
      'Silver': {
        pricePerGram: silverRate,
        pricePer10Gram: Number((silverRate * 10).toFixed(2)),
        pricePerKg: Number((silverRate * 1000).toFixed(2)),
        purity: '99.9% Fine Silver (999)',
        metal: 'SILVER',
      },
      '999': {
        pricePerGram: silverPurities['999'],
        pricePer10Gram: Number((silverPurities['999'] * 10).toFixed(2)),
        pricePerKg: Number((silverPurities['999'] * 1000).toFixed(2)),
        purity: '99.9% Fine Silver',
        metal: 'SILVER',
      },
      '925': {
        pricePerGram: silverPurities['925'],
        pricePer10Gram: Number((silverPurities['925'] * 10).toFixed(2)),
        pricePerKg: Number((silverPurities['925'] * 1000).toFixed(2)),
        purity: '92.5% Sterling Silver',
        metal: 'SILVER',
      },
      '916': {
        pricePerGram: silverPurities['916'],
        pricePer10Gram: Number((silverPurities['916'] * 10).toFixed(2)),
        pricePerKg: Number((silverPurities['916'] * 1000).toFixed(2)),
        purity: '91.6% Standard Silver',
        metal: 'SILVER',
      },
      '900': {
        pricePerGram: silverPurities['900'],
        pricePer10Gram: Number((silverPurities['900'] * 10).toFixed(2)),
        pricePerKg: Number((silverPurities['900'] * 1000).toFixed(2)),
        purity: '90.0% Coin Silver',
        metal: 'SILVER',
      },
    },
    ratesMeta: {
      '24K': {
        purity: '99.9% Pure Gold (24K)',
        label: 'Pure Gold (24K), 1 Gram',
        source: 'LiveChennai',
        metal: 'GOLD',
      },
      '22K': {
        purity: '91.6% Standard Gold (22K)',
        label: 'Standard Gold (22K), 1 Gram',
        source: 'LiveChennai',
        metal: 'GOLD',
      },
      '18K': {
        purity: '75.0% Standard Gold (18K)',
        label: 'Standard Gold (18K), 1 Gram',
        source: 'LiveChennai',
        metal: 'GOLD',
      },
      '999': {
        purity: '99.9% Fine Silver (999)',
        label: 'Fine Silver (999), 1 Gram',
        source: 'LiveChennai',
        metal: 'SILVER',
      },
      '925': {
        purity: '92.5% Sterling Silver (925)',
        label: 'Sterling Silver (925), 1 Gram',
        source: 'LiveChennai',
        metal: 'SILVER',
      },
      '916': {
        purity: '91.6% Silver (916)',
        label: 'Standard Silver (916), 1 Gram',
        source: 'LiveChennai',
        metal: 'SILVER',
      },
      '900': {
        purity: '90.0% Coin Silver (900)',
        label: 'Coin Silver (900), 1 Gram',
        source: 'LiveChennai',
        metal: 'SILVER',
      },
    },
    history,
    location: {
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
    },
    disclaimer: 'Chennai gold & silver retail market rate sourced directly from LiveChennai. Excludes GST and individual showroom making charges.',
    status: 'LIVE',
    isStale: false,
    isUnavailable: false,
  };
};

/**
 * Fetch LiveChennai market rates with caching and stale fallback
 */
export const fetchGoldRatesFromLiveChennai = async () => {
  const now = Date.now();

  // Return cached rates if within freshness window
  if (cachedData && (now - lastFetchTime < CACHE_DURATION_MS)) {
    return {
      ...cachedData,
      isStale: false,
      status: 'LIVE',
    };
  }

  console.log('[LIVE_CHENNAI] Fetching live market rates from LiveChennai.com...');

  try {
    const response = await axios.get(LIVE_CHENNAI_URL, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const parsed = parseLiveChennaiHtml(response.data);

    cachedData = parsed;
    lastFetchTime = now;

    console.log(
      `[LIVE_CHENNAI] Successfully parsed Chennai rates: 24K=₹${parsed.rate24K}/g, 22K=₹${parsed.rate22K}/g, 18K=₹${parsed.rate18K}/g, Silver 999=₹${parsed.silverRate}/g, 925=₹${parsed.silver['925']}/g (Updated: ${parsed.sourceUpdate})`
    );

    return parsed;
  } catch (error) {
    console.error('[LIVE_CHENNAI] Fetch error:', error.message);

    // If cache exists, serve last known rate with RATE DELAYED
    if (cachedData) {
      console.log('[LIVE_CHENNAI] Using last successful LiveChennai cache. Status: RATE_DELAYED');
      return {
        ...cachedData,
        isStale: true,
        status: 'RATE_DELAYED',
      };
    }

    const unavailError = new Error('LiveChennai rates temporarily unavailable: ' + error.message);
    unavailError.isUnavailable = true;
    unavailError.status = 'RATE_UNAVAILABLE';
    throw unavailError;
  }
};

export default {
  PROVIDER_INFO,
  calculateSilverPurities,
  calculateGoldPurities,
  parseLiveChennaiHtml,
  fetchGoldRatesFromLiveChennai,
};
