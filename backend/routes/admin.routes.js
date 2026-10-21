import express from 'express';
import {
  getStats,
  listUsers,
  getUser,
  changeUserStatus,
  changeUserPlan,
  deleteUser,
  getPricing,
  changePricing,
  listAuditLogs,
  listMetalRates,
  changeMetalRate,
} from '../controllers/admin.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Enforce both JWT Authentication and Administrator Role Verification
router.use(authenticate, requireAdmin);

// Dashboard overview statistics
router.get('/dashboard', getStats);

// User management endpoints
router.get('/users', listUsers);
router.get('/users/:id', getUser);
router.patch('/users/:id/status', changeUserStatus);
router.patch('/users/:id/plan', changeUserPlan);
router.delete('/users/:id', deleteUser);

// Pricing configuration endpoints
router.get('/pricing', getPricing);
router.patch('/pricing', changePricing);

// Metal rates management endpoints
router.get('/rates', listMetalRates);
router.put('/rates', changeMetalRate);

// Administrative audit logs
router.get('/audit-logs', listAuditLogs);

export default router;
