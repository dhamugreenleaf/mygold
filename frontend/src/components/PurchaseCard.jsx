import React, { useState } from 'react';
import { formatCurrency, formatGrams, formatReadableDate } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import EditAssetModal from './common/EditAssetModal';
import { 
  FiFileText, 
  FiImage, 
  FiChevronDown, 
  FiChevronRight, 
  FiTrash2, 
  FiEdit2,
  FiCalendar, 
  FiInfo, 
  FiX, 
  FiDownload, 
  FiExternalLink 
} from 'react-icons/fi';

export const PurchaseCard = ({ purchase, onDelete, onUpdated, showDelete = true, showEdit = true }) => {
  const { t, language, isTamil } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Modal State for full-size viewing of invoice/photo
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUrl, setModalUrl] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubtitle, setModalSubtitle] = useState('');
  const [modalFileName, setModalFileName] = useState('');
  const [modalType, setModalType] = useState('image'); // 'image' | 'pdf'

  const isSilver = (purchase.asset_type || '').toUpperCase() === 'SILVER';
  const itemName = purchase.gold_name || purchase.item_name || (isSilver ? t('silverAsset') : t('goldAsset'));
  const purity = purchase.gold_purity || purchase.purity || (isSilver ? '999' : '22K');
  const weight = purchase.weight || 0;
  const formattedWeight = formatGrams(weight, language);

  const invoiceDoc = purchase.invoice_document || purchase.invoice;
  const jewelDoc = purchase.jewel_document || purchase.photo;
  const invoiceUrl = invoiceDoc?.url || purchase.invoice_url;
  const jewelUrl = jewelDoc?.url || purchase.jewel_url || purchase.photo_url;

  const hasRate = !purchase.isRateUnavailable;
  const amountPaid = purchase.amount_paid ?? purchase.purchase_amount ?? purchase.purchase_value ?? 0;
  const currentValue = purchase.current_value;
  const profitLoss = purchase.profit_loss;
  const profitLossPct = purchase.profit_loss_percentage;

  // Format Gain / Loss Value and Style
  const formatGainLoss = (amount, pct) => {
    const num = Number(amount) || 0;
    const pctNum = Number(pct) || 0;
    if (num > 0) {
      return {
        text: `+${formatCurrency(num)} (+${pctNum.toFixed(2)}%)`,
        className: 'text-emerald-700 dark:text-emerald-400 font-extrabold',
      };
    } else if (num < 0) {
      const absFormatted = formatCurrency(Math.abs(num));
      return {
        text: `−${absFormatted} (−${Math.abs(pctNum).toFixed(2)}%)`,
        className: 'text-rose-700 dark:text-rose-400 font-extrabold',
      };
    } else {
      return {
        text: `${formatCurrency(0)} (0.00%)`,
        className: 'text-slate-900 dark:text-slate-200 font-extrabold',
      };
    }
  };

  const gainLossInfo = hasRate && profitLoss !== null ? formatGainLoss(profitLoss, profitLossPct) : null;

  // Optional Invoice breakdown items
  const hasInvoiceBreakdown = purchase.gold_value || purchase.making_charges || purchase.wastage || purchase.gst || purchase.other_charges || purchase.total_invoice_amount;

  const handleOpenDoc = (url, title, fileName, type = 'image') => {
    if (!url) return;
    setModalUrl(url);
    setModalTitle(title);
    setModalSubtitle(`${purity} ${isSilver ? t('silverAsset') : t('goldAsset')} • ${formattedWeight}`);
    setModalFileName(fileName || '');
    setModalType(type);
    setModalOpen(true);
  };

  return (
    <>
      <div className={`bg-white dark:bg-slate-900/90 rounded-2xl border transition-all duration-300 ${
        expanded 
          ? 'border-amber-500/50 shadow-md ring-1 ring-amber-500/20' 
          : 'border-slate-300 dark:border-slate-800 hover:border-amber-500/40 shadow-xs'
      }`}>
        
        {/* Compact Summary View (Always visible) */}
        <div 
          onClick={() => setExpanded(!expanded)}
          className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform min-h-[52px]"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
              {isSilver ? '🥈' : '🥇'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-950 dark:text-white leading-snug truncate">
                {itemName}
              </p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                {purity} • {formattedWeight}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 sm:gap-3 text-right shrink-0">
            <div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                {isSilver ? t('currentSilverValue') : t('currentGoldValue')}
              </p>
              <p className="text-sm sm:text-base font-black tabular-nums text-slate-950 dark:text-white">
                {hasRate && currentValue !== null ? formatCurrency(currentValue) : '—'}
              </p>
              {gainLossInfo && (
                <p className={`text-xs font-extrabold tabular-nums ${gainLossInfo.className}`}>
                  {gainLossInfo.text}
                </p>
              )}
            </div>
            <div className="text-slate-600 dark:text-slate-400 p-1">
              {expanded ? <FiChevronDown className="w-5 h-5 text-amber-500" /> : <FiChevronRight className="w-5 h-5" />}
            </div>
          </div>
        </div>

        {/* Expanded Details View */}
        {expanded && (
          <div className="px-3.5 sm:px-4 pb-4 pt-3 border-t border-slate-200 dark:border-slate-800 animate-fade-in space-y-3.5">
            
            {/* Primary Metrics Grid: 2x2 on mobile, 4-col on tablet/desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs bg-slate-50 dark:bg-slate-950/80 p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              {/* Current Gold Value */}
              <div className="min-w-0">
                <p className="text-slate-800 dark:text-slate-200 mb-0.5 font-bold truncate">
                  {isSilver ? t('currentSilverValue') : t('currentGoldValue')}
                </p>
                <p className="font-black text-sm text-slate-950 dark:text-white tabular-nums break-words">
                  {hasRate && currentValue !== null ? formatCurrency(currentValue) : '—'}
                </p>
              </div>

              {/* Estimated Gain/Loss */}
              <div className="min-w-0">
                <p className="text-slate-800 dark:text-slate-200 mb-0.5 font-bold truncate">
                  {t('estimatedGainLoss')}
                </p>
                {gainLossInfo ? (
                  <p className={`font-black text-sm tabular-nums break-words ${gainLossInfo.className}`}>
                    {gainLossInfo.text}
                  </p>
                ) : (
                  <p className="font-bold text-slate-950 dark:text-white">—</p>
                )}
              </div>

              {/* Amount Paid */}
              <div className="min-w-0">
                <p className="text-slate-800 dark:text-slate-200 mb-0.5 font-bold truncate">
                  {t('amountPaid')}
                </p>
                <p className="font-black text-sm text-slate-950 dark:text-white tabular-nums break-words">
                  {formatCurrency(amountPaid)}
                </p>
              </div>

              {/* Current Metal Rate */}
              <div className="min-w-0">
                <p className="text-slate-800 dark:text-slate-200 mb-0.5 font-bold truncate">
                  {isSilver ? t('currentSilverRate') : t('currentGoldRate')}
                </p>
                <p className="font-black text-sm text-slate-950 dark:text-white tabular-nums break-words">
                  {hasRate && purchase.current_rate ? `${formatCurrency(purchase.current_rate)}/g` : '—'}
                </p>
              </div>
            </div>

            {/* Optional Invoice Breakdown Details */}
            {hasInvoiceBreakdown && (
              <div className="bg-slate-50/80 dark:bg-slate-950/50 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-1.5 text-xs">
                <p className="text-xs font-extrabold text-slate-900 dark:text-slate-200">
                  {t('optionalInvoiceHeader')}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-800 dark:text-slate-300 font-semibold">
                  {purchase.gold_value && (
                    <div>{t('goldValue')}: <b className="text-slate-950 dark:text-white">{formatCurrency(purchase.gold_value)}</b></div>
                  )}
                  {purchase.making_charges && (
                    <div>{t('makingCharges')}: <b className="text-slate-950 dark:text-white">{formatCurrency(purchase.making_charges)}</b></div>
                  )}
                  {purchase.wastage && (
                    <div>{t('wastage')}: <b className="text-slate-950 dark:text-white">{formatCurrency(purchase.wastage)}</b></div>
                  )}
                  {purchase.gst && (
                    <div>{t('gst')}: <b className="text-slate-950 dark:text-white">{formatCurrency(purchase.gst)}</b></div>
                  )}
                  {purchase.other_charges && (
                    <div>{t('otherCharges')}: <b className="text-slate-950 dark:text-white">{formatCurrency(purchase.other_charges)}</b></div>
                  )}
                  {purchase.total_invoice_amount && (
                    <div>{t('totalInvoiceAmount')}: <b className="text-slate-950 dark:text-white">{formatCurrency(purchase.total_invoice_amount)}</b></div>
                  )}
                </div>
              </div>
            )}

            {/* Small Advisory Note */}
            <p className="text-xs text-slate-800 dark:text-slate-200 italic bg-amber-500/10 dark:bg-amber-500/15 p-2.5 rounded-lg border border-amber-500/30 font-medium leading-relaxed">
              {t('resaleAdvisoryNote')}
            </p>

            {/* Purchase Date & Actions (Edit & Delete) */}
            <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-slate-800 dark:text-slate-200 pt-1 font-semibold">
              <span className="flex items-center gap-1.5">
                <FiCalendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{t('purchasedOn')}: {formatReadableDate(purchase.purchase_date, language)}</span>
              </span>

              <div className="flex items-center gap-3">
                {showEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditModalOpen(true);
                    }}
                    className="text-amber-600 dark:text-amber-400 font-extrabold hover:underline flex items-center gap-1 cursor-pointer min-h-[36px] py-1 px-1.5"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                    <span>{t('editAsset')}</span>
                  </button>
                )}

                {showDelete && onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(purchase.id, itemName);
                    }}
                    className="text-rose-600 dark:text-rose-400 font-extrabold hover:underline flex items-center gap-1 cursor-pointer min-h-[36px] py-1 px-1.5"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                    <span>{t('deleteAsset')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Document / Photo View Buttons */}
            {(invoiceUrl || jewelUrl) && (
              <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                {invoiceUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDoc(invoiceUrl, `${t('viewInvoice')} - ${itemName}`, invoiceDoc?.originalName, 'pdf');
                    }}
                    className="flex-1 flex justify-center items-center gap-1.5 py-2.5 px-3 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-bold transition-all hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <FiFileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" /> <span className="truncate">{t('viewInvoice')}</span>
                  </button>
                )}
                {jewelUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDoc(jewelUrl, `${t('viewPhoto')} - ${itemName}`, jewelDoc?.originalName, 'image');
                    }}
                    className="flex-1 flex justify-center items-center gap-1.5 py-2.5 px-3 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-bold transition-all hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <FiImage className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" /> <span className="truncate">{t('viewPhoto')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document / Image Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {modalTitle}
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  {modalSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-50 dark:bg-slate-950">
              {modalType === 'pdf' && modalUrl?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={modalUrl}
                  title={modalTitle}
                  className="w-full h-96 rounded-lg border border-slate-200 dark:border-slate-800"
                />
              ) : (
                <img
                  src={modalUrl}
                  alt={modalTitle}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <span className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-[200px] font-semibold">
                {modalFileName || modalTitle}
              </span>
              <div className="flex gap-2">
                <a
                  href={modalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700"
                >
                  <FiExternalLink className="w-3.5 h-3.5" />
                  <span>{isTamil ? 'திறக்கவும்' : 'Open'}</span>
                </a>
                <a
                  href={modalUrl}
                  download={modalFileName || 'document'}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 font-heading"
                >
                  <FiDownload className="w-3.5 h-3.5" />
                  <span>{isTamil ? 'பதிவிறக்கு' : 'Download'}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Asset Modal */}
      <EditAssetModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        purchase={purchase}
        onUpdated={onUpdated}
      />
    </>
  );
};

export default PurchaseCard;
