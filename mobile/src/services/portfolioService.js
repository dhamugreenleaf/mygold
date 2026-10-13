import api, { getApiBaseUrl } from '../api/api';

/**
 * Portfolio & Purchases Service for MyGold Mobile
 * Connects to GET /portfolio, GET /rates, /subscription/status, and /purchases CRUD endpoints
 */

export const getPortfolio = async (params = {}) => {
  const response = await api.get('/portfolio', { params });
  return response.data;
};

export const getRates = async (params = {}) => {
  const response = await api.get('/rates', { params });
  return response.data;
};

export const getPurchases = async (params = {}) => {
  const response = await api.get('/purchases', { params });
  return response.data;
};

export const getPurchase = async (id, params = {}) => {
  const response = await api.get(`/purchases/${id}`, { params });
  return response.data;
};

export const createPurchase = async (purchaseData) => {
  const isFormData = typeof FormData !== 'undefined' && purchaseData instanceof FormData;
  const response = await api.post('/purchases', purchaseData, {
    headers: isFormData
      ? { 'Content-Type': 'multipart/form-data' }
      : { 'Content-Type': 'application/json' },
  });
  return response.data;
};

export const addPurchase = createPurchase;

export const updatePurchase = async (id, purchaseData) => {
  const isFormData = typeof FormData !== 'undefined' && purchaseData instanceof FormData;
  const response = await api.put(`/purchases/${id}`, purchaseData, {
    headers: isFormData
      ? { 'Content-Type': 'multipart/form-data' }
      : { 'Content-Type': 'application/json' },
  });
  return response.data;
};

export const deletePurchase = async (id) => {
  const response = await api.delete(`/purchases/${id}`);
  return response.data;
};

export const getEntitlementStatus = async () => {
  const response = await api.get('/subscription/status');
  return response.data;
};

/**
 * URL helpers for authenticated document & photo downloads/views
 */
export const getInvoiceUrl = (id, token = null) => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/purchases/${id}/invoice`;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
};

export const getJewelleryPhotoUrl = (id, token = null) => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/purchases/${id}/jewellery-photo`;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
};

export default {
  getPortfolio,
  getRates,
  getPurchases,
  getPurchase,
  createPurchase,
  addPurchase,
  updatePurchase,
  deletePurchase,
  getEntitlementStatus,
  getInvoiceUrl,
  getJewelleryPhotoUrl,
};
