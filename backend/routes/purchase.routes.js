import express from 'express';
import {
  getPurchases,
  getPurchase,
  addPurchase,
  updatePurchase,
  deletePurchase,
} from '../controllers/purchase.controller.js';
import { getInvoice, getJewelleryPhoto } from '../controllers/document.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = express.Router();

// Enforce JWT authentication on all purchase routes
router.use(authenticate);

router.get('/', getPurchases);
router.get('/:id', getPurchase);

// Multipart purchase deposit with files
router.post(
  '/',
  upload.fields([
    { name: 'invoice', maxCount: 1 },
    { name: 'jewelleryPhoto', maxCount: 1 },
    { name: 'invoice_image', maxCount: 1 },
    { name: 'jewellery_image', maxCount: 1 },
  ]),
  addPurchase
);

// Update asset record
router.put(
  '/:id',
  upload.fields([
    { name: 'invoice', maxCount: 1 },
    { name: 'jewelleryPhoto', maxCount: 1 },
    { name: 'invoice_image', maxCount: 1 },
    { name: 'jewellery_image', maxCount: 1 },
  ]),
  updatePurchase
);

router.delete('/:id', deletePurchase);

// Secure authenticated document streaming routes
router.get('/:id/invoice', getInvoice);
router.get('/:id/jewellery-photo', getJewelleryPhoto);

export default router;
