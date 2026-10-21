import express from 'express';
import {
  getHealth,
  getLiveness,
  getReadiness,
  getDetailedHealth,
} from '../controllers/health.controller.js';

import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/health or /health - Standard health check
router.get('/', getHealth);

// GET /api/health/live or /health/live - Liveness probe
router.get('/live', getLiveness);

// GET /api/health/ready or /health/ready - Readiness probe (checks DB)
router.get('/ready', getReadiness);

// GET /api/health/details or /health/details - Full system telemetry
router.get('/details', authenticate, requireAdmin, getDetailedHealth);

export default router;
