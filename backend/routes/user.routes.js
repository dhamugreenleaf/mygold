import express from 'express';
import { updatePreferences, getMe, requestProfileUpdateOtp, verifyProfileUpdateOtp } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Enforce JWT authentication
router.use(authenticate);

router.get('/profile', getMe);
router.post('/profile/update/request', requestProfileUpdateOtp);
router.post('/profile/update/verify', verifyProfileUpdateOtp);
router.patch('/preferences', updatePreferences);

export default router;
