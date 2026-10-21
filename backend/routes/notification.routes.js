import express from 'express';
import {
  getVapidKey,
  getStatus,
  subscribe,
  unsubscribe,
  toggle,
  testNotification,
  getNotifications,
  markAllAsRead,
  markOneAsRead,
  clearAll,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public: Get VAPID public key
router.get('/vapid-public-key', getVapidKey);

// Protected routes (Require login)
router.get('/', authenticate, getNotifications);
router.put('/read-all', authenticate, markAllAsRead);
router.put('/:id/read', authenticate, markOneAsRead);
router.delete('/', authenticate, clearAll);

router.get('/status', authenticate, getStatus);
router.post('/subscribe', authenticate, subscribe);
router.post('/unsubscribe', authenticate, unsubscribe);
router.put('/toggle', authenticate, toggle);
router.post('/test', authenticate, testNotification);

export default router;
