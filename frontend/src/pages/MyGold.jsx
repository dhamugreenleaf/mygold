import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getPurchases, deletePurchase } from '../services/api';
import { useGoldRate } from '../context/GoldRateContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, formatGrams } from '../utils/formatters';
import PurchaseCard from '../components/PurchaseCard';
import ConfirmModal from '../components/common/ConfirmModal';
import Pagination from '../components/common/Pagination';
import toast from 'react-hot-toast';
import { FiPlus, FiFolder, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi';
import { GiGoldBar } from 'react-icons/gi';

export const MyGold = () => {
  const { getLiveRate } = useGoldRate();
  const { t, language, isTamil } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [assetFilter, setAssetFilter] = useState('ALL'); // 'ALL' | 'GOLD' | 'SILVER'
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getPurchases();
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load purchases:', err);
      setError(isTamil ? 'தங்க விவரங்களை ஏற்றுவதில் பிழை.' : 'Unable to load your physical assets. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [isTamil]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const handleDeletePrompt = (id, name) => {
    setItemToDelete({ id, name });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      await deletePurchase(itemToDelete.id);
      toast.success(t('deleteAssetSuccess'));
      setDeleteModalOpen(false);
      setItemToDelete(null);
      loadPurchases();
    } catch (err) {
      toast.error(isTamil ? 'நீக்க முடியவில்லை.' : 'Failed to remove asset record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const recalculatedPurchases = useMemo(() => {
    const rawPurchases = data?.purchases || [];
    return rawPurchases.map((purchase) => {
      const isSilver = (purchase.asset_type || '').toUpperCase() === 'SILVER';
      const purity = (purchase.gold_purity || purchase.purity || (isSilver ? '999' : '22K')).toUpperCase();
      const weight = Number(purchase.weight) || 0;
      
      const purchaseAmount = purchase.purchase_amount != null 
        ? Number(purchase.purchase_amount) 
        : (purchase.purchase_rate != null ? Number((weight * Number(purchase.purchase_rate)).toFixed(2)) : 0);

      const currentRate = getLiveRate(isSilver ? 'SILVER' : 'GOLD', purity);
      const hasValidRate = currentRate !== null && !isNaN(currentRate) && currentRate > 0;
      const currentValue = hasValidRate ? Number((weight * currentRate).toFixed(2)) : null;
      const profitLoss = hasValidRate ? Number((currentValue - purchaseAmount).toFixed(2)) : null;
      const profitLossPercentage = hasValidRate && purchaseAmount > 0 ? Number(((profitLoss / purchaseAmount) * 100).toFixed(2)) : null;

      return {
        ...purchase,
        amount_paid: purchaseAmount,
        purchase_amount: purchaseAmount,
        purchase_value: purchaseAmount,
        current_rate: hasValidRate ? Number(currentRate.toFixed(2)) : null,
        current_value: currentValue,
        profit_loss: profitLoss,
        profit_loss_percentage: profitLossPercentage,
        isRateUnavailable: !hasValidRate,
      };
    });
  }, [data?.purchases, getLiveRate]);

  const summary = useMemo(() => {
    let currentPortfolioValue = 0;
    let totalInvested = 0;
    let anyRateUnavailable = false;

    recalculatedPurchases.forEach((p) => {
      totalInvested += Number(p.amount_paid) || 0;
      if (p.current_value !== null) {
        currentPortfolioValue += Number(p.current_value);
      } else {
        anyRateUnavailable = true;
      }
    });

    const totalProfit = !anyRateUnavailable && recalculatedPurchases.length > 0 ? currentPortfolioValue - totalInvested : 0;

    return {
      total_items: recalculatedPurchases.length,
      total_invested: totalInvested,
      current_value: !anyRateUnavailable ? Number(currentPortfolioValue.toFixed(2)) : null,
      total_profit: totalProfit,
    };
  }, [recalculatedPurchases]);

  const filteredPurchases = useMemo(() => {
    return recalculatedPurchases.filter((p) => {
      const isSilver = (p.asset_type || '').toUpperCase() === 'SILVER';
      const purity = (p.gold_purity || p.purity || '').toUpperCase();
      const name = (p.gold_name || p.item_name || '').toLowerCase();

      if (assetFilter === 'GOLD' && isSilver) return false;
      if (assetFilter === 'SILVER' && !isSilver) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!name.includes(q) && !purity.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [recalculatedPurchases, assetFilter, searchQuery]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [assetFilter, searchQuery, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedPurchases = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPurchases.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPurchases, currentPage, itemsPerPage]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 animate-fade-in max-w-2xl mx-auto px-3 sm:px-4">
      
      {/* 1. Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white font-heading">
            {t('assetsTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-semibold">
            {t('yourPhysicalPortfolio')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={loadPurchases} 
            title={isTamil ? 'புதுப்பிக்கவும்' : 'Refresh'}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <FiRefreshCw className={`w-4 h-4 text-amber-600 dark:text-amber-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link 
            to="/add-gold" 
            className="flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-xl bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 text-xs sm:text-sm font-black shadow-md font-heading transition-all"
          >
            <FiPlus className="w-4 h-4 stroke-[3]" />
            <span>{t('addAssetBtn')}</span>
          </Link>
        </div>
      </div>

      {/* 2. Portfolio Valuation Summary Card */}
      <div className="bg-[var(--bg-card)] dark:bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-amber-500/30 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-300 mb-0.5 font-heading">
              {t('totalCurrentGoldValue')}
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tabular-nums text-gold-gradient">
              {summary.current_value !== null ? formatCurrency(summary.current_value) : '...'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-300 mb-0.5 font-heading">
              {t('totalAssetsCount')}
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tabular-nums">
              {summary.total_items}
            </p>
          </div>
        </div>

        {/* Small advisory note with dark readable text */}
        <p className="text-xs text-slate-800 dark:text-slate-200 italic pt-2 border-t border-slate-200 dark:border-slate-800 font-medium leading-relaxed">
          {t('resaleAdvisoryNote')}
        </p>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchAssetsPlaceholder')}
            className="w-full pl-10 pr-9 min-h-[48px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-bold text-slate-950 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 shadow-xs"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => setSearchQuery('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer min-h-[44px] flex items-center justify-center"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 p-1.5 rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200/70 dark:from-slate-900/90 dark:to-[#0a0f1d] border border-slate-200 dark:border-slate-800 shadow-inner">
          {[
            { id: 'ALL', label: t('filterAll') },
            { id: 'GOLD', label: t('filterGold') },
            { id: 'SILVER', label: t('filterSilver') },
          ].map((filter) => {
            const isActive = assetFilter === filter.id;
            let activeClass = 'bg-amber-500 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 border border-amber-300 ring-1 ring-amber-400/40 scale-[1.01]';
            if (filter.id === 'SILVER') {
              activeClass = 'bg-slate-200 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-950 shadow-md shadow-slate-400/30 border border-slate-100 ring-1 ring-slate-300/50 scale-[1.01]';
            } else if (filter.id === 'GOLD') {
              activeClass = 'bg-amber-500 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/30 border border-amber-300 ring-1 ring-amber-400/50 scale-[1.01]';
            }

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setAssetFilter(filter.id)}
                className={`flex-1 min-h-[44px] py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all duration-200 cursor-pointer font-heading flex items-center justify-center active:scale-95 ${
                  isActive 
                    ? activeClass 
                    : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Assets List */}
      {loading ? (
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredPurchases.length > 0 ? (
        <div className="space-y-3">
          <div className="space-y-3">
            {paginatedPurchases.map((purchase) => (
              <PurchaseCard
                key={purchase.id}
                purchase={purchase}
                onDelete={handleDeletePrompt}
                onUpdated={loadPurchases}
                showDelete={true}
                showEdit={true}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredPurchases.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            pageSizeOptions={[5, 10, 20]}
            itemName={t('navAssets')}
          />
        </div>
      ) : (
        <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl mt-4">
          <GiGoldBar className="w-10 h-10 mx-auto text-amber-600 dark:text-amber-400 mb-3" />
          <p className="text-sm font-bold text-slate-950 dark:text-white mb-1">
            {t('noAssetsFound')}
          </p>
          <p className="text-xs text-slate-700 dark:text-slate-300 mb-4 font-medium">
            {t('noAssetsFoundDesc')}
          </p>
          <Link
            to="/add-gold"
            className="inline-flex items-center gap-2 text-xs font-black text-slate-950 bg-gold-metallic hover:bg-gold-metallic-hover px-5 py-2.5 rounded-full shadow-md transition-all font-heading"
          >
            <FiPlus className="w-4 h-4 stroke-[3]" /> {t('addAssetBtn')}
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={t('deleteModalTitle')}
        message={t('deleteModalMsg', { name: itemToDelete?.name || '' })}
        confirmText={t('deleteConfirmBtn')}
        cancelText={t('cancelBtn')}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default MyGold;
