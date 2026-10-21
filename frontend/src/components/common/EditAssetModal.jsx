import React, { useState, useEffect } from 'react';
import { updatePurchase } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { 
  FiX, 
  FiEdit2, 
  FiCalendar, 
  FiUpload, 
  FiFileText, 
  FiImage, 
  FiChevronDown, 
  FiChevronUp,
  FiCheck
} from 'react-icons/fi';
import { GiGoldBar } from 'react-icons/gi';

export const EditAssetModal = ({ isOpen, onClose, purchase, onUpdated }) => {
  const { t, isTamil } = useLanguage();

  const [assetType, setAssetType] = useState('GOLD');
  const [itemName, setItemName] = useState('');
  const [purity, setPurity] = useState('22K');
  const [weight, setWeight] = useState('');
  const [totalAmountPaid, setTotalAmountPaid] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');

  // Optional Invoice Details
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [goldValue, setGoldValue] = useState('');
  const [makingCharges, setMakingCharges] = useState('');
  const [wastage, setWastage] = useState('');
  const [gst, setGst] = useState('');
  const [otherCharges, setOtherCharges] = useState('');
  const [totalInvoiceAmount, setTotalInvoiceAmount] = useState('');

  // Files
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [jewelFile, setJewelFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (purchase && isOpen) {
      const isSilver = (purchase.asset_type || '').toUpperCase() === 'SILVER';
      setAssetType(isSilver ? 'SILVER' : 'GOLD');
      setItemName(purchase.gold_name || purchase.item_name || '');
      setPurity(purchase.gold_purity || purchase.purity || (isSilver ? '999' : '22K'));
      setWeight(purchase.weight ? String(purchase.weight) : '');
      
      const amt = purchase.purchase_amount ?? purchase.amount_paid ?? (purchase.purchase_rate && purchase.weight ? (purchase.weight * purchase.purchase_rate).toFixed(2) : '');
      setTotalAmountPaid(amt ? String(amt) : '');
      
      if (purchase.purchase_date) {
        try {
          const d = new Date(purchase.purchase_date);
          if (!isNaN(d.getTime())) {
            setPurchaseDate(d.toISOString().split('T')[0]);
          } else {
            setPurchaseDate(purchase.purchase_date);
          }
        } catch {
          setPurchaseDate(purchase.purchase_date);
        }
      } else {
        setPurchaseDate(new Date().toISOString().split('T')[0]);
      }

      setGoldValue(purchase.gold_value ? String(purchase.gold_value) : '');
      setMakingCharges(purchase.making_charges ? String(purchase.making_charges) : '');
      setWastage(purchase.wastage ? String(purchase.wastage) : '');
      setGst(purchase.gst ? String(purchase.gst) : '');
      setOtherCharges(purchase.other_charges ? String(purchase.other_charges) : '');
      setTotalInvoiceAmount(purchase.total_invoice_amount ? String(purchase.total_invoice_amount) : '');
      
      if (purchase.gold_value || purchase.making_charges || purchase.wastage || purchase.gst || purchase.other_charges || purchase.total_invoice_amount) {
        setShowOptionalDetails(true);
      }
      
      setInvoiceFile(null);
      setJewelFile(null);
    }
  }, [purchase, isOpen]);

  if (!isOpen || !purchase) return null;

  const goldPurities = [
    { value: '24K', label: '24K (99.9%)' },
    { value: '22K', label: '22K (91.6%)' },
    { value: '18K', label: '18K (75.0%)' },
  ];

  const silverPurities = [
    { value: '999', label: '999 (99.9%)' },
    { value: '925', label: '925 (92.5%)' },
    { value: '916', label: '916 (91.6%)' },
    { value: '900', label: '900 (90.0%)' },
  ];

  const handleAssetTypeChange = (type) => {
    setAssetType(type);
    if (type === 'SILVER') {
      if (!['999', '925', '916', '900'].includes(purity)) {
        setPurity('999');
      }
    } else {
      if (!['24K', '22K', '18K'].includes(purity)) {
        setPurity('22K');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanName = itemName.trim();
    if (!cleanName) {
      toast.error(isTamil ? 'நகையின் பெயரை உள்ளிடவும்.' : 'Please enter the item name.');
      return;
    }

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      toast.error(isTamil ? 'சரியான எடையை உள்ளிடவும்.' : 'Please enter a valid weight in grams.');
      return;
    }

    const parsedAmount = parseFloat(totalAmountPaid);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error(isTamil ? 'நீங்கள் செலுத்திய மொத்த தொகையை உள்ளிடவும்.' : 'Please enter the total amount paid.');
      return;
    }

    if (!purchaseDate) {
      toast.error(isTamil ? 'வாங்கிய தேதியைத் தேர்ந்தெடுக்கவும்.' : 'Please select the purchase date.');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('assetType', assetType);
      formData.append('itemName', cleanName);
      formData.append('purity', purity);
      formData.append('weight', parsedWeight);
      formData.append('totalAmountPaid', parsedAmount);
      formData.append('purchaseDate', purchaseDate);

      if (goldValue) formData.append('goldValue', goldValue);
      if (makingCharges) formData.append('makingCharges', makingCharges);
      if (wastage) formData.append('wastage', wastage);
      if (gst) formData.append('gst', gst);
      if (otherCharges) formData.append('otherCharges', otherCharges);
      if (totalInvoiceAmount) formData.append('totalInvoiceAmount', totalInvoiceAmount);

      if (invoiceFile) {
        formData.append('invoice', invoiceFile);
      }
      if (jewelFile) {
        formData.append('jewelleryPhoto', jewelFile);
      }

      await updatePurchase(purchase.id, formData);
      toast.success(t('editAssetSuccess'));
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || (isTamil ? 'புதுப்பிக்க முடியவில்லை.' : 'Failed to update asset.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-amber-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FiEdit2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-950 dark:text-white font-heading">
                {t('editModalTitle')}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {purchase.gold_name || purchase.item_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Metal Type Switcher */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleAssetTypeChange('GOLD')}
              className={`flex-1 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-heading ${
                assetType === 'GOLD'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <span>🥇</span>
              <span>{t('goldAsset')}</span>
            </button>
            <button
              type="button"
              onClick={() => handleAssetTypeChange('SILVER')}
              className={`flex-1 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-heading ${
                assetType === 'SILVER'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <span>🥈</span>
              <span>{t('silverAsset')}</span>
            </button>
          </div>

          {/* Item Name */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              {t('itemNameField')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder={isTamil ? 'உதா: தங்க சங்கிலி, நாணயம்' : 'e.g. Gold Chain, Coin'}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-950 dark:text-white focus:border-amber-500 outline-none"
              required
            />
          </div>

          {/* Purity & Weight Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Purity */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                {t('purityField')} <span className="text-rose-500">*</span>
              </label>
              <select
                value={purity}
                onChange={(e) => setPurity(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-950 dark:text-white focus:border-amber-500 outline-none cursor-pointer"
              >
                {(assetType === 'GOLD' ? goldPurities : silverPurities).map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Weight */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                {t('weightField')} (g) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="8.00"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-950 dark:text-white focus:border-amber-500 outline-none tabular-nums"
                required
              />
            </div>
          </div>

          {/* Primary Field: Total Amount Paid */}
          <div className="space-y-1 p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30">
            <label className="block text-xs font-black text-amber-900 dark:text-amber-200">
              {t('howMuchDidYouPay')} <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              {t('amountPaidHelper')}
            </p>
            <div className="relative mt-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-600 dark:text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={totalAmountPaid}
                onChange={(e) => setTotalAmountPaid(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3.5 py-2.5 bg-white dark:bg-slate-950 border border-amber-500/40 rounded-xl text-base font-black text-slate-950 dark:text-white focus:border-amber-500 outline-none tabular-nums"
                required
              />
            </div>
          </div>

          {/* Purchase Date */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              {t('acquisitionDate')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-950 dark:text-white focus:border-amber-500 outline-none cursor-pointer"
              required
            />
          </div>

          {/* Optional Invoice Details Accordion */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowOptionalDetails(!showOptionalDetails)}
              className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t('optionalInvoiceHeader')}
              </span>
              {showOptionalDetails ? <FiChevronUp className="w-4 h-4 text-amber-500" /> : <FiChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showOptionalDetails && (
              <div className="p-4 space-y-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">{t('goldValue')}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={goldValue}
                      onChange={(e) => setGoldValue(e.target.value)}
                      placeholder="₹"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">{t('makingCharges')}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={makingCharges}
                      onChange={(e) => setMakingCharges(e.target.value)}
                      placeholder="₹"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">{t('wastage')}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={wastage}
                      onChange={(e) => setWastage(e.target.value)}
                      placeholder="₹"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">{t('gst')}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={gst}
                      onChange={(e) => setGst(e.target.value)}
                      placeholder="₹"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Replace Photo / Invoice (Optional) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {t('invoiceDoc')}
              </label>
              <label className="flex flex-col items-center justify-center p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-amber-500 cursor-pointer bg-slate-50 dark:bg-slate-950">
                <FiFileText className="w-4 h-4 text-amber-500 mb-1" />
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold truncate max-w-[120px]">
                  {invoiceFile ? invoiceFile.name : (purchase.invoice_url ? 'Replace' : 'Upload')}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {t('jewelleryPhoto')}
              </label>
              <label className="flex flex-col items-center justify-center p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-amber-500 cursor-pointer bg-slate-50 dark:bg-slate-950">
                <FiImage className="w-4 h-4 text-amber-500 mb-1" />
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold truncate max-w-[120px]">
                  {jewelFile ? jewelFile.name : (purchase.jewel_url || purchase.photo_url ? 'Replace' : 'Upload')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setJewelFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              {t('cancelBtn')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 text-xs font-black shadow-md cursor-pointer font-heading flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <FiCheck className="w-4 h-4 stroke-[3]" />
              <span>{loading ? t('updatingAssetBtn') : t('saveChangesBtn')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAssetModal;
