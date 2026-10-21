import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getPortfolio } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useGoldRate } from '../context/GoldRateContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, formatGrams } from '../utils/formatters';
import { FiPlus, FiArrowRight, FiRefreshCw, FiTrendingUp, FiTrendingDown, FiInfo } from 'react-icons/fi';

export const Home = () => {
  const { user } = useAuth();
  const { t, language, isTamil } = useLanguage();
  const { 
    rate24K, 
    rate22K, 
    rate18K,
    silverRate, 
    silverRate925,
    silverRate916,
    silverRate900,
    getLiveRate,
    refreshGoldRates, 
  } = useGoldRate();

  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeRateTab, setActiveRateTab] = useState('gold');

  const goldRatesList = [
    { name: t('twentyFourKarat'), purity: '99.9%', badge: '24K', rate: rate24K, pounRate: rate24K * 8 },
    { name: t('twentyTwoKarat'), purity: '91.6%', badge: '22K', rate: rate22K, pounRate: rate22K * 8 },
    { name: t('eighteenKarat'), purity: '75.0%', badge: '18K', rate: rate18K, pounRate: rate18K * 8 },
  ];

  const silverRatesList = [
    { name: t('fineSilver999'), purity: '99.9%', badge: '999', rate: silverRate },
    { name: t('sterlingSilver925'), purity: '92.5%', badge: '925', rate: silverRate925 },
    { name: t('hallmarkSilver916'), purity: '91.6%', badge: '916', rate: silverRate916 },
    { name: t('jewellerySilver900'), purity: '90.0%', badge: '900', rate: silverRate900 },
  ];

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPortfolio();
      if (res?.data) {
        setPortfolioData(res.data);
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboard(), refreshGoldRates()]);
    setTimeout(() => setRefreshing(false), 500);
  };

  const liveSummary = useMemo(() => {
    const rawPurchases = portfolioData?.purchases || [];
    let totalInvested = 0;
    let currentLiveValue = 0;

    let goldWeight = 0;
    let goldValue = 0;

    let silverWeight = 0;
    let silverValue = 0;

    rawPurchases.forEach((p) => {
      const isSilver = (p.asset_type || '').toUpperCase() === 'SILVER';
      const purity = (p.gold_purity || p.purity || (isSilver ? '999' : '22K')).toUpperCase();
      const weight = Number(p.weight) || 0;
      
      const purchaseAmount = p.purchase_amount != null 
        ? Number(p.purchase_amount) 
        : (p.purchase_rate != null ? Number((weight * Number(p.purchase_rate)).toFixed(2)) : 0);

      totalInvested += purchaseAmount;
      const liveRate = getLiveRate(isSilver ? 'SILVER' : 'GOLD', purity);
      const itemLiveValue = weight * liveRate;
      currentLiveValue += itemLiveValue;

      if (isSilver) {
        silverWeight += weight;
        silverValue += itemLiveValue;
      } else {
        goldWeight += weight;
        goldValue += itemLiveValue;
      }
    });

    const totalProfit = rawPurchases.length > 0 ? currentLiveValue - totalInvested : 0;
    const totalProfitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return {
      total_items: rawPurchases.length,
      total_invested: totalInvested,
      current_value: currentLiveValue,
      total_profit: totalProfit,
      total_profit_percentage: totalProfitPercentage,
      is_profit: totalProfit >= 0,
      gold: { weight: goldWeight, currentValue: goldValue },
      silver: { weight: silverWeight, currentValue: silverValue },
    };
  }, [portfolioData, getLiveRate]);

  const recentPurchases = portfolioData?.recent_purchases || portfolioData?.purchases?.slice(0, 4) || [];

  return (
    <div className="space-y-6 sm:space-y-8 pb-28 animate-fade-in max-w-lg mx-auto">
      
      {/* 1. Welcome & Manual Refresh Header */}
      <div className="flex justify-between items-start px-3 sm:px-4 pt-2">
        <div>
          <p className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] dark:text-slate-400 mb-0.5">
            {t('helloUser', { name: user?.username || t('investor') })}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] dark:text-white tracking-tight font-heading">
            {t('yourVault')}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={refreshing || loading}
          title={isTamil ? 'புதுப்பிக்கவும்' : 'Refresh Rates'}
          className={`p-2.5 rounded-2xl bg-[var(--bg-card)] dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs text-slate-700 dark:text-slate-300 transition-all active:scale-95 cursor-pointer hover:border-amber-400 ${
            refreshing ? 'animate-spin' : ''
          }`}
        >
          <FiRefreshCw className="w-4 h-4 text-amber-500" />
        </button>
      </div>

      {/* 2. Hero Portfolio: Total Current Value + Amount Paid + Estimated Gain/Loss */}
      <div className="px-3 sm:px-4">
        <div className="bg-[var(--bg-card)] dark:bg-slate-900/80 rounded-3xl p-5 sm:p-6 border border-amber-500/20 shadow-md text-center space-y-3 relative overflow-hidden">
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-bold uppercase tracking-wider">
            <span>✨</span>
            <span>{t('totalCurrentGoldValue')}</span>
          </div>

          {loading ? (
            <div className="h-12 w-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl mx-auto my-2"></div>
          ) : (
            <h2 className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight text-[var(--text-primary)] dark:text-white text-gold-gradient py-1">
              {formatCurrency(liveSummary.current_value)}
            </h2>
          )}

          {/* Breakdown Pills: Total Amount Paid & Estimated Gain/Loss */}
          {!loading && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-left">
              {/* Total Amount Paid */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 min-w-0">
                <p className="text-xs text-slate-800 dark:text-slate-200 font-extrabold mb-0.5 truncate">
                  {t('totalAmountPaid')}
                </p>
                <p className="text-sm sm:text-base font-black text-slate-950 dark:text-white tabular-nums break-words">
                  {formatCurrency(liveSummary.total_invested)}
                </p>
              </div>

              {/* Estimated Gain/Loss */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 min-w-0">
                <p className="text-xs text-slate-800 dark:text-slate-200 font-extrabold mb-0.5 truncate">
                  {t('estimatedGainLoss')}
                </p>
                {(() => {
                  const profit = liveSummary.total_profit || 0;
                  const pct = liveSummary.total_profit_percentage || 0;
                  if (profit > 0) {
                    return (
                      <p className="text-sm sm:text-base font-black tabular-nums text-emerald-700 dark:text-emerald-400 break-words">
                        +{formatCurrency(profit)}{' '}
                        <span className="text-xs font-extrabold">
                          (+{pct.toFixed(2)}%)
                        </span>
                      </p>
                    );
                  } else if (profit < 0) {
                    return (
                      <p className="text-sm sm:text-base font-black tabular-nums text-rose-700 dark:text-rose-400 break-words">
                        −{formatCurrency(Math.abs(profit))}{' '}
                        <span className="text-xs font-extrabold">
                          (−{Math.abs(pct).toFixed(2)}%)
                        </span>
                      </p>
                    );
                  } else {
                    return (
                      <p className="text-sm sm:text-base font-black tabular-nums text-slate-900 dark:text-slate-200 break-words">
                        {formatCurrency(0)}{' '}
                        <span className="text-xs font-extrabold">(0.00%)</span>
                      </p>
                    );
                  }
                })()}
              </div>
            </div>
          )}

          {/* Small Advisory Note */}
          <p className="text-xs text-slate-800 dark:text-slate-200 italic pt-2 text-center font-medium border-t border-slate-200 dark:border-slate-800 leading-relaxed">
            {t('resaleAdvisoryNote')}
          </p>
        </div>
      </div>

      {/* 3. Gold & Silver Split Cards */}
      <div className="px-3 sm:px-4 flex gap-2.5 sm:gap-3">
        <div className="flex-1 bg-[var(--bg-card)] dark:bg-slate-900/60 rounded-2xl p-3 sm:p-4 flex items-center justify-between border border-amber-500/20 shadow-xs min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center text-xl shrink-0">
              🥇
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">{t('goldAsset')}</p>
              <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white tabular-nums truncate">
                {formatCurrency(liveSummary.gold.currentValue)}
              </p>
              <p className="text-xs text-slate-400 font-semibold truncate">
                {formatGrams(liveSummary.gold.weight, language)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-[var(--bg-card)] dark:bg-slate-900/60 rounded-2xl p-3 sm:p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800 shadow-xs min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-xl shrink-0">
              🥈
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">{t('silverAsset')}</p>
              <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white tabular-nums truncate">
                {formatCurrency(liveSummary.silver.currentValue)}
              </p>
              <p className="text-xs text-slate-400 font-semibold truncate">
                {formatGrams(liveSummary.silver.weight, language)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Main Action Buttons */}
      <div className="px-3 sm:px-4 flex gap-2.5 sm:gap-3">
        <Link 
          to="/add-gold" 
          className="flex-1 flex justify-center items-center gap-2 min-h-[48px] py-3 rounded-2xl bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 font-black text-sm sm:text-base shadow-md active:scale-[0.98] transition-transform font-heading"
        >
          <FiPlus className="w-5 h-5 stroke-[3] shrink-0" />
          <span>{t('addAssetBtn')}</span>
        </Link>
        <Link 
          to="/my-gold" 
          className="flex-1 flex justify-center items-center gap-2 min-h-[48px] py-3 rounded-2xl bg-[var(--bg-card)] dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm sm:text-base border border-slate-200 dark:border-slate-800 active:scale-[0.98] transition-transform font-heading shadow-xs"
        >
          <span>{t('vaultDetailsBtn')}</span>
        </Link>
      </div>

      {/* 5. Live Market Rates Section */}
      <div className="px-3 sm:px-4 space-y-3 pt-2">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] dark:text-white font-heading">
              {t('chennaiRatesTitle')}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] dark:text-slate-400 font-medium">
              {t('chennaiRatesSubtitle')}
            </p>
          </div>
          <Link to="/gold-rates" className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline shrink-0">
            {t('fullMarketLink')} <FiArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Metal Segmented Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs gap-1.5">
          <button
            type="button"
            onClick={() => setActiveRateTab('gold')}
            className={`w-full min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer select-none ${
              activeRateTab === 'gold'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="text-base leading-none">🥇</span>
            <span className="leading-none">{t('goldRatesTab')}</span>
            {rate24K > 0 && (
              <span className="text-[11px] font-extrabold opacity-90 tabular-nums leading-none">
                ({formatCurrency(rate24K)}/g)
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveRateTab('silver')}
            className={`w-full min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer select-none ${
              activeRateTab === 'silver'
                ? 'bg-slate-200 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-950 shadow-md shadow-slate-400/30 border border-slate-100 ring-1 ring-slate-300/50 scale-[1.01] font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="text-base leading-none">🥈</span>
            <span className="leading-none">{t('silverRatesTab')}</span>
            {silverRate > 0 && (
              <span className="text-[11px] font-extrabold opacity-90 tabular-nums leading-none">
                ({formatCurrency(silverRate)}/g)
              </span>
            )}
          </button>
        </div>

        {/* Dynamic Rate Cards Stack (Clean, Aligned, Symmetrical) */}
        <div className="space-y-2.5">
          {activeRateTab === 'gold' ? (
            goldRatesList.map((item) => (
              <div
                key={item.badge}
                className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-amber-500/20 shadow-xs hover:border-amber-500/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 flex items-center justify-center text-xs font-black border border-amber-300 shadow-sm shadow-amber-500/25 shrink-0 font-heading">
                    {item.badge}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-extrabold text-slate-950 dark:text-white leading-tight font-heading">
                        {item.name}
                      </p>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 font-heading">
                        {item.purity}
                      </span>
                    </div>
                    <p className="text-xs font-extrabold text-amber-700 dark:text-amber-400 mt-0.5 font-heading">
                      {t('onePoun')}: {formatCurrency(item.pounRate)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase block font-heading">
                    {t('oneGramPrice')}
                  </span>
                  <p className="text-base sm:text-lg font-black text-slate-950 dark:text-white tabular-nums font-heading">
                    {formatCurrency(item.rate)}
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-0.5">/g</span>
                  </p>
                </div>
              </div>
            ))
          ) : (
            silverRatesList.map((item) => (
              <div
                key={item.badge}
                className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-950 flex items-center justify-center text-xs font-black border border-slate-100 shadow-sm shadow-slate-400/20 shrink-0 font-heading">
                    {item.badge}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-extrabold text-slate-950 dark:text-white leading-tight font-heading">
                        {item.name}
                      </p>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-heading">
                        {item.purity}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                      {isTamil ? '10 கிராம்' : '10g'}: {formatCurrency(item.rate * 10)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase block font-heading">
                    {t('oneGramPrice')}
                  </span>
                  <p className="text-base sm:text-lg font-black text-slate-950 dark:text-white tabular-nums font-heading">
                    {formatCurrency(item.rate)}
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-0.5">/g</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 6. Recent Assets List */}
      <div className="px-3 sm:px-4 space-y-3 pt-2">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-[var(--text-primary)] dark:text-white font-heading">
            {t('recentAdditions')}
          </h3>
          <Link to="/my-gold" className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline">
            {t('seeAll')} <FiArrowRight className="w-3 h-3" />
          </Link>
        </div>
        
        {loading ? (
          <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
        ) : recentPurchases.length > 0 ? (
          <div className="space-y-2.5">
            {recentPurchases.map((purchase) => {
              const isSilver = (purchase.asset_type || '').toUpperCase() === 'SILVER';
              const purity = purchase.gold_purity || purchase.purity || (isSilver ? '999' : '22K');
              const weight = Number(purchase.weight) || 0;
              const liveRate = getLiveRate(isSilver ? 'SILVER' : 'GOLD', purity);
              const currentValue = weight * liveRate;
              
              const purchaseAmount = purchase.purchase_amount != null 
                ? Number(purchase.purchase_amount) 
                : (purchase.purchase_rate != null ? Number((weight * Number(purchase.purchase_rate)).toFixed(2)) : 0);

              const profit = currentValue - purchaseAmount;
              const isProfit = profit >= 0;

              return (
                <Link 
                  to="/my-gold" 
                  key={purchase.id} 
                  className="flex justify-between items-center p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-card)] dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 shadow-xs transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">
                      {isSilver ? '🥈' : '🥇'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {purchase.gold_name || purchase.item_name || (isSilver ? t('silverAsset') : t('goldAsset'))}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {purity} • {formatGrams(weight, language)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm sm:text-base font-black tabular-nums text-slate-900 dark:text-white">
                      {formatCurrency(currentValue)}
                    </p>
                    {profit > 0 ? (
                      <p className="text-[11px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(profit)}
                      </p>
                    ) : profit < 0 ? (
                      <p className="text-[11px] font-bold tabular-nums text-rose-600 dark:text-rose-400">
                        −{formatCurrency(Math.abs(profit))}
                      </p>
                    ) : (
                      <p className="text-[11px] font-bold tabular-nums text-slate-500">
                        {formatCurrency(0)}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
              📦
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{t('vaultEmptyTitle')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('vaultEmptySubtitle')}</p>
            <Link 
              to="/add-gold" 
              className="inline-flex items-center gap-2 text-xs font-black text-slate-950 bg-gold-metallic hover:bg-gold-metallic-hover px-5 py-2.5 rounded-full shadow-md transition-all font-heading"
            >
              <FiPlus className="w-4 h-4 stroke-[3]" /> {t('addAssetBtn')}
            </Link>
          </div>
        )}
      </div>

    </div>
  );
};

export default Home;