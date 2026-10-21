import path from 'path';
import fs from 'fs';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { GoldPurchase, PurchaseDocument } from '../models/index.js';
import { getLatestGoldRatesMap } from './goldRate.service.js';
import { calculatePurchaseDetails, calculatePortfolioSummary } from '../utils/calculations.js';
import { storePurchaseDocument, removePurchaseFilesFromDisk } from './document.service.js';
import { checkUserEntitlement, incrementFreeEntryUsage } from './entitlement.service.js';

export const getAllPurchasesWithMetrics = async (userId, locationParam = {}, filters = {}) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const currentRates = await getLatestGoldRatesMap(locationParam);

  const whereClause = { user_id: userId };

  // Asset Type Filter ('GOLD' | 'SILVER')
  if (filters.assetType && filters.assetType.toUpperCase() !== 'ALL') {
    whereClause.asset_type = filters.assetType.toUpperCase();
  }

  // Purity Filter
  if (filters.purity && filters.purity.toUpperCase() !== 'ALL') {
    whereClause.gold_purity = filters.purity.toUpperCase();
  }

  // Search keyword in item name
  if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
    whereClause.gold_name = {
      [Op.like]: `%${filters.search.trim()}%`,
    };
  }

  const rawPurchases = await GoldPurchase.findAll({
    where: whereClause,
    include: [
      {
        model: PurchaseDocument,
        as: 'documents',
      },
    ],
    order: [['purchase_date', 'DESC'], ['id', 'DESC']],
  });

  const purchases = rawPurchases.map((p) => {
    const raw = p.toJSON();
    return calculatePurchaseDetails(raw, currentRates);
  });

  // Calculate full portfolio summary (also fetch all purchases if filtered so summary is global if needed, or summary of current filtered set)
  let allPurchasesForSummary = purchases;
  if (filters.assetType && filters.assetType.toUpperCase() !== 'ALL') {
    const allRaw = await GoldPurchase.findAll({
      where: { user_id: userId },
      include: [{ model: PurchaseDocument, as: 'documents' }],
    });
    allPurchasesForSummary = allRaw.map((p) => calculatePurchaseDetails(p.toJSON(), currentRates));
  }

  const summary = calculatePortfolioSummary(allPurchasesForSummary);

  return {
    summary,
    purchases,
    gold_rates: currentRates,
    reference_location: currentRates.location,
    source: currentRates.source,
    disclaimer: currentRates.disclaimer,
  };
};

export const getPurchaseById = async (userId, id, locationParam = {}) => {
  if (!userId || !id) {
    return null;
  }

  const currentRates = await getLatestGoldRatesMap(locationParam);
  const purchase = await GoldPurchase.findOne({
    where: {
      id,
      user_id: userId,
    },
    include: [
      {
        model: PurchaseDocument,
        as: 'documents',
      },
    ],
  });

  if (!purchase) {
    return null;
  }

  return calculatePurchaseDetails(purchase.toJSON(), currentRates);
};

export const createPurchase = async (userId, purchaseData, files = {}) => {
  if (!userId) {
    const err = new Error('Authentication required.');
    err.statusCode = 401;
    throw err;
  }

  const rawAssetType = (purchaseData.assetType ?? purchaseData.asset_type ?? 'GOLD').toString().trim().toUpperCase();
  const assetType = rawAssetType === 'SILVER' ? 'SILVER' : 'GOLD';

  const rawName = purchaseData.itemName ?? purchaseData.item_name ?? purchaseData.goldName ?? purchaseData.gold_name;
  const rawPurity = purchaseData.purity ?? purchaseData.goldPurity ?? purchaseData.gold_purity;
  const rawWeight = purchaseData.weight;
  const rawDate = purchaseData.purchaseDate ?? purchaseData.purchase_date;
  const rawRate = purchaseData.purchaseRate ?? purchaseData.purchase_rate;
  const rawAmount = purchaseData.totalAmountPaid ?? purchaseData.total_amount_paid ?? purchaseData.purchaseAmount ?? purchaseData.purchase_amount ?? purchaseData.amountPaid ?? purchaseData.amount_paid;

  // Optional Invoice Details
  const rawGoldValue = purchaseData.goldValue ?? purchaseData.gold_value;
  const rawMakingCharges = purchaseData.makingCharges ?? purchaseData.making_charges;
  const rawWastage = purchaseData.wastage;
  const rawGst = purchaseData.gst;
  const rawOtherCharges = purchaseData.otherCharges ?? purchaseData.other_charges;
  const rawTotalInvoiceAmount = purchaseData.totalInvoiceAmount ?? purchaseData.total_invoice_amount;

  // A. Item Name Validation
  const assetLabel = assetType === 'SILVER' ? 'Silver' : 'Gold';
  if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
    const err = new Error(`Please enter the ${assetLabel.toLowerCase()} item name.`);
    err.statusCode = 400;
    throw err;
  }

  const trimmedName = rawName.trim();
  if (trimmedName.length < 2) {
    const err = new Error(`${assetLabel} item name must be at least 2 characters.`);
    err.statusCode = 400;
    throw err;
  }
  if (trimmedName.length > 100) {
    const err = new Error(`${assetLabel} item name cannot exceed 100 characters.`);
    err.statusCode = 400;
    throw err;
  }

  // B. Purity Validation
  let cleanPurity = (rawPurity || '').toString().trim().toUpperCase();
  cleanPurity = cleanPurity.replace(/SILVER|GOLD/gi, '').trim();

  if (assetType === 'GOLD') {
    if (!cleanPurity) cleanPurity = '22K';
    const validGoldPurities = ['24K', '22K', '18K'];
    if (!validGoldPurities.includes(cleanPurity)) {
      const err = new Error('Invalid Gold purity standard. Must be 24K, 22K, or 18K.');
      err.statusCode = 400;
      throw err;
    }
  } else if (assetType === 'SILVER') {
    if (!cleanPurity) cleanPurity = '999';
    const validSilverPurities = ['999', '925', '916', '900'];
    if (!validSilverPurities.includes(cleanPurity)) {
      const err = new Error('Invalid Silver purity standard. Must be 999, 925, 916, or 900.');
      err.statusCode = 400;
      throw err;
    }
  }

  // C. Weight Validation
  if (rawWeight === undefined || rawWeight === null || rawWeight === '') {
    const err = new Error(`Please enter the ${assetLabel.toLowerCase()} weight.`);
    err.statusCode = 400;
    throw err;
  }

  const parsedWeight = typeof rawWeight === 'number' ? rawWeight : parseFloat(rawWeight);
  if (isNaN(parsedWeight) || (typeof rawWeight === 'string' && isNaN(Number(rawWeight)))) {
    const err = new Error('Please enter a valid weight in grams.');
    err.statusCode = 400;
    throw err;
  }

  if (parsedWeight <= 0) {
    const err = new Error('Weight must be greater than 0.');
    err.statusCode = 400;
    throw err;
  }

  if (parsedWeight > 500000) {
    const err = new Error('Weight cannot exceed 500,000 grams.');
    err.statusCode = 400;
    throw err;
  }

  // Max 3 decimal places for weight
  const weightStr = rawWeight.toString();
  if (weightStr.includes('.')) {
    const decimals = weightStr.split('.')[1] || '';
    if (decimals.length > 3) {
      const err = new Error('Weight can have up to 3 decimal places.');
      err.statusCode = 400;
      throw err;
    }
  }

  // D. Purchase Date Validation
  if (!rawDate) {
    const err = new Error('Please select the acquisition date.');
    err.statusCode = 400;
    throw err;
  }

  const dateStr = typeof rawDate === 'string' && rawDate.includes('T')
    ? rawDate.split('T')[0]
    : rawDate.toString().trim();

  let normalizedDate = dateStr;
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('-');
    normalizedDate = `${y}-${m}-${d}`;
  }

  const inputDate = new Date(normalizedDate);
  if (isNaN(inputDate.getTime())) {
    const err = new Error('Please select a valid acquisition date.');
    err.statusCode = 400;
    throw err;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (inputDate > today) {
    const err = new Error('Acquisition date cannot be in the future.');
    err.statusCode = 400;
    throw err;
  }

  // E. Total Amount Paid / Purchase Rate Validation
  let parsedAmount = null;
  let parsedRate = null;

  if (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') {
    parsedAmount = typeof rawAmount === 'number' ? rawAmount : parseFloat(rawAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      const err = new Error('Please enter a valid total amount paid.');
      err.statusCode = 400;
      throw err;
    }
    if (parsedAmount > 1000000000) {
      const err = new Error('Total amount paid cannot exceed ₹100,00,00,000.');
      err.statusCode = 400;
      throw err;
    }
    parsedAmount = Number(parsedAmount.toFixed(2));
  }

  if (rawRate !== undefined && rawRate !== null && rawRate !== '') {
    parsedRate = typeof rawRate === 'number' ? rawRate : parseFloat(rawRate);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      const err = new Error('Please enter a valid purchase rate.');
      err.statusCode = 400;
      throw err;
    }
    parsedRate = Number(parsedRate.toFixed(2));
  }

  // If amount is provided but rate isn't, calculate rate = amount / weight
  if (parsedAmount !== null && parsedRate === null && parsedWeight > 0) {
    parsedRate = Number((parsedAmount / parsedWeight).toFixed(2));
  }
  // If rate is provided but amount isn't, calculate amount = rate * weight
  if (parsedAmount === null && parsedRate !== null && parsedWeight > 0) {
    parsedAmount = Number((parsedRate * parsedWeight).toFixed(2));
  }

  if (parsedAmount === null && parsedRate === null) {
    const err = new Error('Please enter the total amount paid.');
    err.statusCode = 400;
    throw err;
  }

  // Parse optional invoice fields safely
  const parseOptionalFloat = (val) => {
    if (val === undefined || val === null || val === '') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : Number(num.toFixed(2));
  };

  const parsedGoldValue = parseOptionalFloat(rawGoldValue);
  const parsedMakingCharges = parseOptionalFloat(rawMakingCharges);
  const parsedWastage = parseOptionalFloat(rawWastage);
  const parsedGst = parseOptionalFloat(rawGst);
  const parsedOtherCharges = parseOptionalFloat(rawOtherCharges);
  const parsedTotalInvoiceAmount = parseOptionalFloat(rawTotalInvoiceAmount);

  // ENTITLEMENT CHECK
  const entitlement = await checkUserEntitlement(userId);
  if (!entitlement.canCreate) {
    const err = new Error('PAYMENT_REQUIRED');
    err.statusCode = 402;
    err.code = 'FREE_LIMIT_REACHED';
    throw err;
  }

  // Execute database creation within a Transaction
  const transaction = await sequelize.transaction();

  let createdPurchaseId = null;

  try {
    const newRecord = await GoldPurchase.create(
      {
        user_id: userId,
        asset_type: assetType,
        gold_name: trimmedName,
        gold_purity: cleanPurity,
        weight: parsedWeight,
        purchase_date: normalizedDate,
        purchase_rate: parsedRate,
        purchase_amount: parsedAmount,
        gold_value: parsedGoldValue,
        making_charges: parsedMakingCharges,
        wastage: parsedWastage,
        gst: parsedGst,
        other_charges: parsedOtherCharges,
        total_invoice_amount: parsedTotalInvoiceAmount,
      },
      { transaction }
    );

    createdPurchaseId = newRecord.id;

    // Increment free entry usage
    await incrementFreeEntryUsage(userId, transaction);

    const savedDocuments = {};

    // 1. Process Invoice if uploaded
    const invoiceFile = files.invoice?.[0] || files.invoice_image?.[0];
    if (invoiceFile) {
      const invoiceDoc = await storePurchaseDocument(
        userId,
        newRecord.id,
        invoiceFile,
        'INVOICE',
        transaction
      );
      savedDocuments.invoice = {
        id: invoiceDoc.id,
        originalName: invoiceDoc.original_name,
      };
    }

    // 2. Process Jewellery Photo if uploaded
    const jewelFile = files.jewelleryPhoto?.[0] || files.jewellery_image?.[0];
    if (jewelFile) {
      const jewelDoc = await storePurchaseDocument(
        userId,
        newRecord.id,
        jewelFile,
        'JEWELLERY_PHOTO',
        transaction
      );
      savedDocuments.jewelleryPhoto = {
        id: jewelDoc.id,
        originalName: jewelDoc.original_name,
      };
    }

    await transaction.commit();

    return {
      id: newRecord.id,
      assetType: newRecord.asset_type,
      goldName: newRecord.gold_name,
      itemName: newRecord.gold_name,
      goldPurity: newRecord.gold_purity,
      purity: newRecord.gold_purity,
      weight: newRecord.weight,
      purchaseDate: newRecord.purchase_date,
      purchaseRate: newRecord.purchase_rate,
      purchaseAmount: newRecord.purchase_amount,
      purchaseValue: newRecord.purchase_amount,
      amountPaid: newRecord.purchase_amount,
      goldValue: newRecord.gold_value,
      makingCharges: newRecord.making_charges,
      wastage: newRecord.wastage,
      gst: newRecord.gst,
      otherCharges: newRecord.other_charges,
      totalInvoiceAmount: newRecord.total_invoice_amount,
      documents: savedDocuments,
    };
  } catch (error) {
    await transaction.rollback();

    // Clean up any files that may have been moved
    if (createdPurchaseId) {
      removePurchaseFilesFromDisk(userId, createdPurchaseId);
    }

    // Clean up temporary staged files
    if (files) {
      Object.values(files).flat().forEach((f) => {
        if (f?.path && fs.existsSync(f.path)) {
          try {
            fs.unlinkSync(f.path);
          } catch (e) {}
        }
      });
    }

    throw error;
  }
};

export const updatePurchaseById = async (userId, id, payload, files = {}) => {
  const purchase = await GoldPurchase.findOne({
    where: {
      id,
      user_id: userId,
    },
  });

  if (!purchase) {
    const error = new Error('Asset not found');
    error.statusCode = 404;
    throw error;
  }

  const {
    assetType: rawAssetType,
    asset_type,
    metalType,
    itemName: rawName,
    goldName,
    item_name,
    goldPurity: rawPurity,
    purity,
    gold_purity,
    weight: rawWeight,
    purchaseDate: rawDate,
    purchase_date,
    purchaseRate: rawRate,
    purchase_rate,
    totalAmountPaid,
    total_amount_paid,
    purchaseAmount: rawPurchaseAmount,
    purchase_amount,
    goldValue: rawGoldValue,
    gold_value,
    makingCharges: rawMakingCharges,
    making_charges,
    wastage: rawWastage,
    gst: rawGst,
    otherCharges: rawOtherCharges,
    other_charges,
    totalInvoiceAmount: rawTotalInvoiceAmount,
    total_invoice_amount,
  } = payload;

  const assetType = ((rawAssetType || asset_type || metalType || purchase.asset_type || 'GOLD') + '').toUpperCase() === 'SILVER' ? 'SILVER' : 'GOLD';
  const trimmedName = (rawName || goldName || item_name || purchase.gold_name || '').trim();
  const cleanPurity = (rawPurity || purity || gold_purity || purchase.gold_purity || '22K').toUpperCase().trim();
  const parsedWeight = parseFloat(rawWeight ?? purchase.weight);
  
  if (isNaN(parsedWeight) || parsedWeight <= 0) {
    const error = new Error('Please enter a valid weight in grams.');
    error.statusCode = 400;
    throw error;
  }

  let normalizedDate = purchase.purchase_date;
  if (rawDate || purchase_date) {
    const dateObj = new Date(rawDate || purchase_date);
    if (!isNaN(dateObj.getTime())) {
      normalizedDate = dateObj.toISOString().split('T')[0];
    }
  }

  let parsedAmount = null;
  const rawAmountInput = totalAmountPaid ?? total_amount_paid ?? rawPurchaseAmount ?? purchase_amount;
  if (rawAmountInput !== undefined && rawAmountInput !== null && rawAmountInput !== '') {
    const num = parseFloat(rawAmountInput);
    if (!isNaN(num) && num > 0) {
      parsedAmount = Number(num.toFixed(2));
    }
  }

  let parsedRate = null;
  const rateInput = rawRate ?? purchase_rate;
  if (rateInput !== undefined && rateInput !== null && rateInput !== '') {
    const num = parseFloat(rateInput);
    if (!isNaN(num) && num > 0) {
      parsedRate = Number(num.toFixed(2));
    }
  }

  if (!parsedAmount && parsedRate && parsedWeight > 0) {
    parsedAmount = Number((parsedWeight * parsedRate).toFixed(2));
  }
  if (!parsedRate && parsedAmount && parsedWeight > 0) {
    parsedRate = Number((parsedAmount / parsedWeight).toFixed(2));
  }

  const parseOptionalFloat = (val, fallback = null) => {
    if (val === undefined) return fallback;
    if (val === null || val === '') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : Number(num.toFixed(2));
  };

  const parsedGoldValue = parseOptionalFloat(rawGoldValue ?? gold_value, purchase.gold_value);
  const parsedMakingCharges = parseOptionalFloat(rawMakingCharges ?? making_charges, purchase.making_charges);
  const parsedWastage = parseOptionalFloat(rawWastage, purchase.wastage);
  const parsedGst = parseOptionalFloat(rawGst, purchase.gst);
  const parsedOtherCharges = parseOptionalFloat(rawOtherCharges ?? other_charges, purchase.other_charges);
  const parsedTotalInvoiceAmount = parseOptionalFloat(rawTotalInvoiceAmount ?? total_invoice_amount, purchase.total_invoice_amount);

  const transaction = await sequelize.transaction();

  try {
    await purchase.update(
      {
        asset_type: assetType,
        gold_name: trimmedName,
        gold_purity: cleanPurity,
        weight: parsedWeight,
        purchase_date: normalizedDate,
        purchase_rate: parsedRate,
        purchase_amount: parsedAmount,
        gold_value: parsedGoldValue,
        making_charges: parsedMakingCharges,
        wastage: parsedWastage,
        gst: parsedGst,
        other_charges: parsedOtherCharges,
        total_invoice_amount: parsedTotalInvoiceAmount,
      },
      { transaction }
    );

    // Process new files if uploaded
    const invoiceFile = files?.invoice?.[0] || files?.invoice_image?.[0];
    if (invoiceFile) {
      await storePurchaseDocument(userId, purchase.id, invoiceFile, 'INVOICE', transaction);
    }

    const jewelFile = files?.jewelleryPhoto?.[0] || files?.jewellery_image?.[0];
    if (jewelFile) {
      await storePurchaseDocument(userId, purchase.id, jewelFile, 'JEWELLERY_PHOTO', transaction);
    }

    await transaction.commit();
    return purchase;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const deletePurchaseById = async (userId, id) => {
  const purchase = await GoldPurchase.findOne({
    where: {
      id,
      user_id: userId,
    },
  });

  if (!purchase) {
    return false;
  }

  // Remove files from disk first
  removePurchaseFilesFromDisk(userId, id);

  // Delete purchase from DB
  await purchase.destroy();
  return true;
};

export default {
  getAllPurchasesWithMetrics,
  getPurchaseById,
  createPurchase,
  updatePurchaseById,
  deletePurchaseById,
};
