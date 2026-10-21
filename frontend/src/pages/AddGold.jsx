import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { addPurchase, getEntitlementStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../utils/formatters';
import { 
  FiCheckCircle, 
  FiImage, 
  FiFileText, 
  FiX, 
  FiChevronDown, 
  FiChevronUp, 
  FiHelpCircle,
  FiAward
} from 'react-icons/fi';

export const AddGold = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language, isTamil } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [assetType, setAssetType] = useState('GOLD');
  const [showOptionalInvoice, setShowOptionalInvoice] = useState(false);

  const todayString = new Date().toLocaleDateString('en-CA');

  const [formData, setFormData] = useState({
    itemName: '',
    purity: '22K',
    weight: '',
    totalAmountPaid: '',
    purchaseDate: todayString,
    // Optional Invoice details
    goldValue: '',
    makingCharges: '',
    wastage: '',
    gst: '',
    otherCharges: '',
    totalInvoiceAmount: '',
  });

  const handleAssetTypeChange = (newType) => {
    if (newType === assetType) return;
    setAssetType(newType);
    setFormData((prev) => ({
      ...prev,
      itemName: '',
      purity: newType === 'SILVER' ? '999' : '22K',
      weight: '',
      totalAmountPaid: '',
    }));
    setTouched({});
    setErrors({});
  };

  const currentSuggestions = assetType === 'GOLD' 
    ? (isTamil 
        ? ['தங்க செயின்', 'தங்க காசு', 'தங்க மோதிரம்', 'தங்க வளையல்', 'தங்க நெக்லஸ்', 'தங்க பிஸ்கட்'] 
        : ['Gold Chain', 'Gold Coin', 'Gold Ring', 'Gold Bangle', 'Gold Necklace', 'Gold Bar'])
    : (isTamil 
        ? ['வெள்ளி காசு', 'வெள்ளி கொலுசு', 'வெள்ளி பாத்திரம்', 'வெள்ளி கட்டி', 'வெள்ளி விளக்கு'] 
        : ['Silver Coin', 'Silver Anklet', 'Silver Utensil', 'Silver Bar', 'Silver Lamp']);

  const [jewelleryFile, setJewelleryFile] = useState(null);
  const [jewelleryPreview, setJewelleryPreview] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState(null);

  const jewelleryInputRef = useRef(null);
  const invoiceInputRef = useRef(null);

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [entitlement, setEntitlement] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    checkEntitlement();
  }, []);

  const checkEntitlement = async () => {
    try {
      const res = await getEntitlementStatus();
      if (res && res.data) {
        setEntitlement(res.data);
        if (!res.data.canCreate) {
          setShowUpgradeModal(true);
        }
      }
    } catch (error) {
      console.error('Failed to check entitlement:', error);
    }
  };

  const sanitizeDecimalInput = (rawVal, maxDecimals = 3) => {
    if (!rawVal) return '';
    let sanitized = rawVal.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = `${parts[0]}.${parts.slice(1).join('')}`;
    }
    const [whole, decimal] = sanitized.split('.');
    if (decimal !== undefined) {
      return `${whole}.${decimal.slice(0, maxDecimals)}`;
    }
    return sanitized;
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'itemName':
        if (!value || !value.trim()) return t('nameRequired');
        return null;
      case 'weight': {
        if (!value || value === '') return t('weightRequired');
        const num = parseFloat(value);
        if (isNaN(num) || num <= 0) return t('weightInvalid');
        return null;
      }
      case 'totalAmountPaid': {
        if (!value || value === '') return t('amountRequired');
        const num = parseFloat(value);
        if (isNaN(num) || num <= 0) return t('amountInvalid');
        return null;
      }
      case 'purchaseDate': {
        if (!value) return t('dateRequired');
        const d = new Date(value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (d > today) return t('futureDateError');
        return null;
      }
      default:
        return null;
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const errorMsg = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  const handleTextChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'weight') finalValue = sanitizeDecimalInput(value, 3);
    if (['totalAmountPaid', 'goldValue', 'makingCharges', 'wastage', 'gst', 'otherCharges', 'totalInvoiceAmount'].includes(name)) {
      finalValue = sanitizeDecimalInput(value, 2);
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (touched[name]) {
      const errorMsg = validateField(name, finalValue);
      setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    }
  };

  const handleFileChange = (e, setFile, setPreview) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(isTamil ? 'கோப்பு அளவு 5MB-க்கு குறைவாக இருக்க வேண்டும்' : 'File size must be under 5MB');
      return;
    }

    setFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Re-verify entitlement before submission
    if (entitlement && !entitlement.canCreate) {
      setShowUpgradeModal(true);
      return;
    }

    const newErrors = {};
    ['itemName', 'weight', 'totalAmountPaid', 'purchaseDate'].forEach((key) => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });

    setTouched({ itemName: true, weight: true, totalAmountPaid: true, purchaseDate: true });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(isTamil ? 'தயவுசெய்து தேவையான விவரங்களை உள்ளிடவும்.' : 'Please fill all required fields correctly.');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(isTamil ? 'நகை சேமிக்கப்படுகிறது...' : 'Saving asset to vault...');

    try {
      const dataPayload = new FormData();
      dataPayload.append('asset_type', assetType);
      dataPayload.append('assetType', assetType);
      dataPayload.append('gold_name', formData.itemName.trim());
      dataPayload.append('itemName', formData.itemName.trim());
      dataPayload.append('gold_purity', formData.purity);
      dataPayload.append('purity', formData.purity);
      dataPayload.append('weight', parseFloat(formData.weight));
      dataPayload.append('purchase_date', formData.purchaseDate);
      dataPayload.append('total_amount_paid', parseFloat(formData.totalAmountPaid));
      dataPayload.append('totalAmountPaid', parseFloat(formData.totalAmountPaid));
      dataPayload.append('purchase_amount', parseFloat(formData.totalAmountPaid));

      // Optional fields
      if (formData.goldValue) dataPayload.append('gold_value', parseFloat(formData.goldValue));
      if (formData.makingCharges) dataPayload.append('making_charges', parseFloat(formData.makingCharges));
      if (formData.wastage) dataPayload.append('wastage', parseFloat(formData.wastage));
      if (formData.gst) dataPayload.append('gst', parseFloat(formData.gst));
      if (formData.otherCharges) dataPayload.append('other_charges', parseFloat(formData.otherCharges));
      if (formData.totalInvoiceAmount) dataPayload.append('total_invoice_amount', parseFloat(formData.totalInvoiceAmount));

      if (invoiceFile) dataPayload.append('invoice', invoiceFile);
      if (jewelleryFile) dataPayload.append('jewelleryPhoto', jewelleryFile);

      await addPurchase(dataPayload);
      toast.success(t('assetSavedSuccess'), { id: toastId });
      navigate('/my-gold');
    } catch (err) {
      if (err.response?.data?.code === 'FREE_LIMIT_REACHED' || err.response?.status === 402) {
        toast.dismiss(toastId);
        setShowUpgradeModal(true);
      } else {
        toast.error(err.response?.data?.message || (isTamil ? 'சேமிக்க முடியவில்லை.' : 'Failed to add asset.'), { id: toastId });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isPaid = entitlement?.status === 'PAID' || user?.plan === 'paid' || user?.subscription_status === 'active' || user?.role === 'admin';
  const entriesCount = entitlement?.entriesUsed ?? (user?.free_entries_used || 0);

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-28 px-3 sm:px-4 animate-fade-in">
      {/* 10-Entry Limit Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--bg-card)] dark:bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto text-2xl font-heading">
              👑
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white font-heading">
              {t('freeLimitReached')}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t('freeLimitDesc')}
            </p>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => navigate('/upgrade')}
                className="w-full py-3.5 rounded-xl bg-gold-metallic text-slate-950 font-black text-sm shadow-md font-heading cursor-pointer hover:bg-gold-metallic-hover transition-colors"
              >
                {t('upgradeMonthlyBtn')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpgradeModal(false);
                  navigate('/my-gold');
                }}
                className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-300 font-semibold"
              >
                {t('returnToDashboard')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with Free Usage Tracker */}
      <div className="flex items-center justify-between pt-2">
        <div>
          {isPaid ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-metallic text-slate-950 font-black text-[11px] font-heading shadow-xs">
              <span>👑 {t('premiumVault')}</span>
              <span className="text-[10px] opacity-80">• Active</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold text-[11px] font-heading">
              <span>{entriesCount} / 10 {isTamil ? 'இலவச பதிவுகள்' : 'Free Entries Used'}</span>
            </span>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading text-right">
          {t('addAssetTitle')}
        </h1>
      </div>

      {/* Metal Switcher Tab */}
      <div className="flex gap-1.5 p-1.5 rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200/70 dark:from-slate-900/90 dark:to-[#0a0f1d] border border-slate-200 dark:border-slate-800 shadow-inner">
        <button
          type="button"
          onClick={() => handleAssetTypeChange('GOLD')}
          className={`flex-1 min-h-[48px] py-3 text-xs sm:text-sm font-black rounded-xl transition-all duration-200 cursor-pointer font-heading flex items-center justify-center active:scale-95 ${
            assetType === 'GOLD' 
              ? 'bg-amber-500 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 border border-amber-300 ring-1 ring-amber-400/40 scale-[1.01]' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
          }`}
        >
          {t('goldTab')}
        </button>
        <button
          type="button"
          onClick={() => handleAssetTypeChange('SILVER')}
          className={`flex-1 min-h-[48px] py-3 text-xs sm:text-sm font-black rounded-xl transition-all duration-200 cursor-pointer font-heading flex items-center justify-center active:scale-95 ${
            assetType === 'SILVER' 
              ? 'bg-slate-200 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-950 shadow-md shadow-slate-400/30 border border-slate-100 ring-1 ring-slate-300/50 scale-[1.01]' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
          }`}
        >
          {t('silverTab')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        
        {/* Main Required Details Card */}
        <div className="bg-[var(--bg-card)] dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            {t('assetDetailsSection')}
          </h2>
          
          {/* 1. Item Name ("What did you buy?") */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('whatDidYouBuy')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="itemName"
              value={formData.itemName}
              onChange={handleTextChange}
              onBlur={handleBlur}
              placeholder={t('itemNamePlaceholder')}
              className={`w-full px-4 min-h-[48px] py-3 bg-white dark:bg-slate-950 border rounded-xl text-base font-medium focus:border-amber-500 outline-none transition-all ${
                errors.itemName ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200 dark:border-slate-800'
              }`}
            />
            {errors.itemName && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.itemName}</p>}
            
            {/* Quick Suggestions Pills */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {currentSuggestions.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleTextChange({ target: { name: 'itemName', value: label } })}
                  className="px-3 min-h-[36px] text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer flex items-center"
                >
                  + {label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Purity Standard */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('purityStandard')} <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(assetType === 'GOLD' ? ['24K', '22K', '18K'] : ['999', '925', '916', '900']).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, purity: p }))}
                  className={`flex-1 min-w-[70px] min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all border cursor-pointer font-heading flex items-center justify-center ${
                    formData.purity === p 
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 shadow-xs' 
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {p} {assetType === 'GOLD' ? (p === '22K' ? (isTamil ? '(ஆபரணம்)' : '(Standard)') : '') : ''}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Weight & 4. Total Amount Paid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Weight */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {assetType === 'GOLD' ? t('goldWeight') : t('silverWeight')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="weight"
                  inputMode="decimal"
                  value={formData.weight}
                  onChange={handleTextChange}
                  onBlur={handleBlur}
                  placeholder={t('weightPlaceholder')}
                  className={`w-full pl-4 pr-12 py-3.5 bg-white dark:bg-slate-950 border rounded-xl text-base font-bold tabular-nums focus:border-amber-500 outline-none transition-all ${
                    errors.weight ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200 dark:border-slate-800'
                  }`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  {isTamil ? 'கிராம்' : 'grams'}
                </span>
              </div>
              {errors.weight && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.weight}</p>}
            </div>

            {/* Total Amount Paid (PRIMARY FIELD) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('howMuchDidYouPay')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-600 dark:text-amber-400 pointer-events-none">
                  ₹
                </span>
                <input
                  type="text"
                  name="totalAmountPaid"
                  inputMode="decimal"
                  value={formData.totalAmountPaid}
                  onChange={handleTextChange}
                  onBlur={handleBlur}
                  placeholder="0.00"
                  className={`w-full pl-8 pr-4 py-3.5 bg-white dark:bg-slate-950 border rounded-xl text-base font-bold tabular-nums focus:border-amber-500 outline-none transition-all ${
                    errors.totalAmountPaid ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200 dark:border-slate-800'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {t('amountPaidHelper')}
              </p>
              {errors.totalAmountPaid && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.totalAmountPaid}</p>}
            </div>
          </div>

          {/* 5. Acquisition Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('acquisitionDate')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              name="purchaseDate"
              max={todayString}
              value={formData.purchaseDate}
              onChange={handleTextChange}
              onBlur={handleBlur}
              className="w-full px-4 py-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:border-amber-500 outline-none transition-all"
            />
            {errors.purchaseDate && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.purchaseDate}</p>}
          </div>
        </div>

        {/* 6. Optional Invoice Details Accordion */}
        <div className="bg-[var(--bg-card)] dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOptionalInvoice(!showOptionalInvoice)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {t('optionalInvoiceHeader')}
              </span>
            </div>
            <div className="text-slate-400">
              {showOptionalInvoice ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
            </div>
          </button>

          {showOptionalInvoice && (
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-800/80 animate-fade-in">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                {t('optionalDetailsHint')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {t('goldValue')} (₹)
                  </label>
                  <input
                    type="text"
                    name="goldValue"
                    inputMode="decimal"
                    value={formData.goldValue}
                    onChange={handleTextChange}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold tabular-nums focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {t('makingCharges')} (₹)
                  </label>
                  <input
                    type="text"
                    name="makingCharges"
                    inputMode="decimal"
                    value={formData.makingCharges}
                    onChange={handleTextChange}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold tabular-nums focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {t('wastage')} (₹)
                  </label>
                  <input
                    type="text"
                    name="wastage"
                    inputMode="decimal"
                    value={formData.wastage}
                    onChange={handleTextChange}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold tabular-nums focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {t('gst')} (₹)
                  </label>
                  <input
                    type="text"
                    name="gst"
                    inputMode="decimal"
                    value={formData.gst}
                    onChange={handleTextChange}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold tabular-nums focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {t('otherCharges')} (₹)
                  </label>
                  <input
                    type="text"
                    name="otherCharges"
                    inputMode="decimal"
                    value={formData.otherCharges}
                    onChange={handleTextChange}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold tabular-nums focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {t('totalInvoiceAmount')} (₹)
                  </label>
                  <input
                    type="text"
                    name="totalInvoiceAmount"
                    inputMode="decimal"
                    value={formData.totalInvoiceAmount}
                    onChange={handleTextChange}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold tabular-nums focus:border-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 7. Documents and Photos */}
        <div className="bg-[var(--bg-card)] dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            {t('documentsSection')}
          </h2>
          
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                {t('invoiceDoc')}
              </span>
              <span className="text-[10px] text-slate-500">
                {invoiceFile ? invoiceFile.name : (isTamil ? 'பில் புகைப்படம் அல்லது PDF' : 'Bill receipt photo or PDF')}
              </span>
            </div>
            <input 
              type="file" 
              ref={invoiceInputRef} 
              onChange={(e) => handleFileChange(e, setInvoiceFile, setInvoicePreview)} 
              className="hidden" 
              accept=".pdf,image/*" 
            />
            <button 
              type="button" 
              onClick={() => invoiceInputRef.current?.click()} 
              className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
            >
              {invoiceFile ? (isTamil ? 'மாற்றுக' : 'Change') : t('uploadBtn')}
            </button>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-800/80">
            <div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                {t('jewelleryPhoto')}
              </span>
              <span className="text-[10px] text-slate-500">
                {jewelleryFile ? jewelleryFile.name : (isTamil ? 'நகையின் புகைப்படம்' : 'Jewellery ornament image')}
              </span>
            </div>
            <input 
              type="file" 
              ref={jewelleryInputRef} 
              onChange={(e) => handleFileChange(e, setJewelleryFile, setJewelleryPreview)} 
              className="hidden" 
              accept="image/*" 
            />
            <button 
              type="button" 
              onClick={() => jewelleryInputRef.current?.click()} 
              className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
            >
              {jewelleryFile ? (isTamil ? 'மாற்றுக' : 'Change') : t('uploadBtn')}
            </button>
          </div>
        </div>

        {/* Advisory Note */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic text-center px-2">
          {t('resaleAdvisoryNote')}
        </p>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 font-black text-sm shadow-md font-heading cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {submitting ? t('savingAssetBtn') : t('saveAssetBtn')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddGold;
