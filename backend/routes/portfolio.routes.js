import express from 'express';
import { getPortfolio } from '../controllers/portfolio.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Enforce JWT authentication on portfolio route
router.get('/', authenticate, getPortfolio);
router.get('/overview', authenticate, getPortfolio);

export default router;
