import express from 'express';
import {
  getGoldRates,
  getGoldOnlyRates,
  getSilverOnlyRates,
  getLocations,
} from '../controllers/goldRate.controller.js';

const router = express.Router();

// Supported Locations for Bullion Rate Reference
router.get('/locations', getLocations);

// Specific metal rate endpoints
router.get('/gold', getGoldOnlyRates);
router.get('/silver', getSilverOnlyRates);

// Live unified Rates endpoint (/live & root /)
router.get('/live', getGoldRates);
router.get('/', getGoldRates);

export default router;
