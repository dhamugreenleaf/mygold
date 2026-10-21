import {
  getAllPurchasesWithMetrics,
  getPurchaseById,
  createPurchase,
  updatePurchaseById,
  deletePurchaseById,
} from '../services/purchase.service.js';

export const getPurchases = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const city = req.query.city || (req.user && req.user.preferred_city) || 'Coimbatore';
    const state = req.query.state || (req.user && req.user.preferred_state) || 'Tamil Nadu';
    const country = req.query.country || (req.user && req.user.preferred_country) || 'India';

    const filters = {
      assetType: req.query.assetType || req.query.asset_type || 'ALL',
      purity: req.query.purity || 'ALL',
      search: req.query.search || '',
    };

    const data = await getAllPurchasesWithMetrics(userId, { city, state, country }, filters);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchase = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const city = req.query.city || (req.user && req.user.preferred_city) || 'Coimbatore';
    const state = req.query.state || (req.user && req.user.preferred_state) || 'Tamil Nadu';
    const country = req.query.country || (req.user && req.user.preferred_country) || 'India';

    const purchase = await getPurchaseById(userId, id, { city, state, country });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: `Physical asset record with ID ${id} not found.`,
      });
    }

    res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
};

export const addPurchase = async (req, res) => {
  try {
    const userId = req.user.id;
    const payload = { ...req.body };
    const files = req.files || {};

    const created = await createPurchase(userId, payload, files);

    return res.status(201).json({
      success: true,
      message: `${created.assetType === 'SILVER' ? 'Silver' : 'Gold'} asset added successfully.`,
      data: created,
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to add asset.',
    });
  }
};

export const updatePurchase = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const payload = { ...req.body };
    const files = req.files || {};

    const updated = await updatePurchaseById(userId, id, payload, files);

    return res.status(200).json({
      success: true,
      message: 'Asset updated successfully.',
      data: updated,
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update asset.',
    });
  }
};

export const deletePurchase = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const deleted = await deletePurchaseById(userId, id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Asset record with ID ${id} not found.`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Asset removed successfully from vault.',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getPurchases,
  getPurchase,
  addPurchase,
  updatePurchase,
  deletePurchase,
};
