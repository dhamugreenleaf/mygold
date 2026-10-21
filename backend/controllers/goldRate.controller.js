import {
  getLatestGoldRates,
  getSupportedLocations,
} from '../services/goldRate.service.js';

/**
 * Controller to fetch live bullion rates (location-aware)
 * GET /api/rates or GET /api/gold-rates/live or GET /api/gold-rates
 */
export const getGoldRates = async (req, res, next) => {
  try {
    const city = req.query.city || (req.user && req.user.preferred_city) || 'Pan-India';
    const state = req.query.state || (req.user && req.user.preferred_state) || 'India';
    const country = req.query.country || (req.user && req.user.preferred_country) || 'India';

    const ratesData = await getLatestGoldRates({ city, state, country });

    return res.status(200).json({
      success: true,
      status: 'success',
      data: ratesData,
    });
  } catch (error) {
    console.error('[BULLION_CONTROLLER] Error fetching rates:', error);
    next(error);
  }
};

/**
 * Controller to fetch gold only rates (24K, 22K, 18K)
 * GET /api/rates/gold
 */
export const getGoldOnlyRates = async (req, res, next) => {
  try {
    const city = req.query.city || (req.user && req.user.preferred_city) || 'Pan-India';
    const state = req.query.state || (req.user && req.user.preferred_state) || 'India';
    const country = req.query.country || (req.user && req.user.preferred_country) || 'India';

    const ratesData = await getLatestGoldRates({ city, state, country });

    return res.status(200).json({
      success: true,
      data: {
        metal: 'GOLD',
        currency: ratesData.currency,
        source: ratesData.source,
        updatedAt: ratesData.updatedAt,
        sourceUpdate: ratesData.sourceUpdate,
        rates: ratesData.gold,
        ratesDetailed: {
          '24K': ratesData.rates['24K'],
          '22K': ratesData.rates['22K'],
          '18K': ratesData.rates['18K'],
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch silver only rates (999, 925, 916, 900)
 * GET /api/rates/silver
 */
export const getSilverOnlyRates = async (req, res, next) => {
  try {
    const city = req.query.city || (req.user && req.user.preferred_city) || 'Pan-India';
    const state = req.query.state || (req.user && req.user.preferred_state) || 'India';
    const country = req.query.country || (req.user && req.user.preferred_country) || 'India';

    const ratesData = await getLatestGoldRates({ city, state, country });

    return res.status(200).json({
      success: true,
      data: {
        metal: 'SILVER',
        currency: ratesData.currency,
        source: ratesData.source,
        updatedAt: ratesData.updatedAt,
        sourceUpdate: ratesData.sourceUpdate,
        rates: ratesData.silver,
        ratesDetailed: {
          '999': ratesData.rates['999'],
          '925': ratesData.rates['925'],
          '916': ratesData.rates['916'],
          '900': ratesData.rates['900'],
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch supported locations list
 * GET /api/gold-rates/locations or GET /api/rates/locations
 */
export const getLocations = (req, res) => {
  try {
    const locationsData = getSupportedLocations();
    return res.status(200).json({
      success: true,
      status: 'success',
      data: locationsData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve supported locations.',
    });
  }
};

export default {
  getGoldRates,
  getGoldOnlyRates,
  getSilverOnlyRates,
  getLocations,
};