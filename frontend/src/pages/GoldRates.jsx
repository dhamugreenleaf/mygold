import React, { useState } from 'react';
import { useGoldRate } from '../context/GoldRateContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../utils/formatters';
import { FiRefreshCw, FiInfo } from 'react-icons/fi';
import { GiGoldBar } from 'react-icons/gi';

export const GoldRates = () => {
  const {
    rate24K,
    rate22K,
    rate18K,
    silverRate,
    silverRate925,
    silverRate916,
    silverRate900,
    sourceUpdate,
    status,
    refreshGoldRates,
    isLoading,
  } = useGoldRate();

  const { t, language, isTamil } = useLanguage();

  const [refreshing, setRefreshing] = useState(false);
  const [calcMetal, setCalcMetal] = useState('22K');
  const [calcWeight, setCalcWeight] = useState(8);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshGoldRates();
    setTimeout(() => setRefreshing(false), 500);
  };

  let activeRatePerGram = rate22K;
  if (calcMetal === '24K') activeRatePerGram = rate24K;
  else if (calcMetal === '18K') activeRatePerGram = rate18K;
  else if (calcMetal === '999') activeRatePerGram = silverRate;
  else if (calcMetal === '925') activeRatePerGram = silverRate925;

  const rawBullionValue = (Number(calcWeight) || 0) * activeRatePerGram;

  const goldRates = [
    {
      name: isTamil ? '24K சுத்த தங்கம்' : '24K Gold',
      subtitle: isTamil ? 'சுத்த தங்கம் / நாணயம் / பிஸ்கட்' : 'Pure Bullion / Coin / Bar',
      purity: '99.9%',
      badge: '24K',
      badgeClass: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 border border-amber-300 shadow-sm shadow-amber-500/25',
      rate1g: rate24K,
      ratePoun: rate24K * 8,
    },
    {
      name: isTamil ? '22K ஆபரணத் தங்கம்' : '22K Gold',
      subtitle: isTamil ? 'ஹால்மார்க் ஆபரணத் தரம் (916)' : 'Hallmark Jewellery Standard',
      purity: '91.6%',
      badge: '22K',
      badgeClass: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 border border-amber-300 shadow-sm shadow-amber-500/25',
      rate1g: rate22K,
      ratePoun: rate22K * 8,
    },
    {
      name: isTamil ? '18K தங்கம்' : '18K Gold',
      subtitle: isTamil ? 'ஆபரணக் கலவை' : 'Standard Alloy',
      purity: '75.0%',
      badge: '18K',
      badgeClass: 'bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 text-slate-950 border border-amber-300/80 shadow-sm shadow-amber-500/15',
      rate1g: rate18K,
      ratePoun: rate18K * 8,
    },
  ];

  const silverRates = [
    {
      name: isTamil ? '999 சுத்த வெள்ளி' : '999 Fine Silver',
      subtitle: isTamil ? 'சுத்த வெள்ளி கட்டி' : 'Pure Silver Bar',
      purity: '99.9%',
      badge: '999',
      badgeClass: 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-950 border border-slate-100 shadow-sm shadow-slate-400/20',
      rate1g: silverRate,
      rate10g: silverRate * 10,
      rate1kg: silverRate * 1000,
    },
    {
      name: isTamil ? '925 ஸ்டெர்லிங் வெள்ளி' : '925 Sterling Silver',
      subtitle: isTamil ? 'வெள்ளி ஆபரணங்கள்' : 'Jewellery Standard',
      purity: '92.5%',
      badge: '925',
      badgeClass: 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-950 border border-slate-100 shadow-sm shadow-slate-400/20',
      rate1g: silverRate925,
      rate10g: silverRate925 * 10,
      rate1kg: silverRate925 * 1000,
    },
    {
      name: isTamil ? '916 வெள்ளி' : '916 Silver',
      subtitle: isTamil ? 'வெள்ளி பாத்திரங்கள்' : 'Silver Articles',
      purity: '91.6%',
      badge: '916',
      badgeClass: 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-950 border border-slate-100 shadow-sm shadow-slate-400/20',
      rate1g: silverRate916,
      rate10g: silverRate916 * 10,
      rate1kg: silverRate916 * 1000,
    },
    {
      name: isTamil ? '900 வெள்ளி பொருட்கள்' : '900 Silver',
      subtitle: isTamil ? 'பாரம்பரிய வெள்ளி' : 'Traditional Silver',
      purity: '90.0%',
      badge: '900',
      badgeClass: 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-950 border border-slate-100 shadow-sm shadow-slate-400/20',
      rate1g: silverRate900,
      rate10g: silverRate900 * 10,
      rate1kg: silverRate900 * 1000,
    },
  ];

  return (
    <div className="relative space-y-6 pb-28 animate-fade-in max-w-xl mx-auto px-3 sm:px-4 mt-2">
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] dark:text-white tracking-tight font-heading">
            {t('chennaiRatesTitle')}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[var(--text-muted)] mt-0.5">
            {t('chennaiRatesSubtitle')}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className={`w-2 h-2 rounded-full ${
                status.includes('Live') || status.includes('Success')
                  ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]'
                  : 'bg-amber-500 shadow-[0_0_8px_#F59E0B]'
              }`}
            />
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-heading">
              {status.includes('Live') || status.includes('Success')
                ? sourceUpdate
                  ? `${isTamil ? 'புதுப்பிக்கப்பட்டது' : 'Updated'} ${sourceUpdate}`
                  : (isTamil ? 'இப்போது புதுப்பிக்கப்பட்டது' : 'Updated Recently')
                : sourceUpdate
                ? `${isTamil ? 'கடைசி புதுப்பிப்பு' : 'Last Updated'}: ${sourceUpdate}`
                : (isTamil ? 'நேரலை நிலவரம்' : 'Rate update unavailable')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
          aria-label="Refresh rates"
          className="w-11 h-11 shrink-0 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-slate-600 dark:text-slate-300 transition-all active:scale-95 hover:text-amber-500 hover:border-amber-400 cursor-pointer"
        >
          <FiRefreshCw
            className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-500' : ''}`}
          />
        </button>
      </div>

      {/* 1. PHYSICAL GOLD SECTION (1G & 1 POUN / 8G) */}
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
          <h2 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-heading">
            <GiGoldBar className="w-4 h-4" />
            <span>{t('goldRatesTab')}</span>
          </h2>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-heading">
            {t('onePoun')}
          </span>
        </div>

        <div className="space-y-3">
          {goldRates.map((item) => (
            <div
              key={item.badge}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-[#111726] dark:to-[#0a0f1d] border border-slate-200 dark:border-amber-500/20 shadow-xs transition-all hover:border-amber-500/40"
            >
              {/* Top Row: Karat Title & Purity Badge */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center font-heading shadow-xs ${item.badgeClass}`}
                  >
                    {item.badge}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white font-heading leading-tight">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-heading">
                  {item.purity} {isTamil ? 'தூய்மை' : 'Purity'}
                </span>
              </div>

              {/* Bottom Row: 1 Gram Price & 1 Poun Price */}
              <div className="grid grid-cols-2 gap-3 pt-3.5 items-center">
                {/* 1 Gram Column */}
                <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-heading">
                    {t('oneGramPrice')}
                  </span>
                  <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight font-heading mt-0.5">
                    {formatCurrency(item.rate1g)}
                    <span className="text-[10px] font-bold text-slate-400 ml-1">/g</span>
                  </div>
                </div>

                {/* 1 Poun (8g) Column */}
                <div className="px-3 py-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 dark:border-amber-500/25">
                  <span className="text-[10px] sm:text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider block font-heading">
                    {t('onePoun')}
                  </span>
                  <div className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-300 tabular-nums tracking-tight font-heading mt-0.5">
                    {formatCurrency(item.ratePoun)}
                    <span className="text-[10px] font-bold text-amber-600/70 dark:text-amber-400/70 ml-1">/8g</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. PHYSICAL SILVER SECTION */}
      <div className="relative z-10 space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700/60 pb-2">
          <h2 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-heading">
            <span>🥈</span>
            <span>{t('silverRatesTab')}</span>
          </h2>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-heading">
            {isTamil ? '1 கிலோ = 1000 கிராம்' : '1 Kg = 1000 Grams'}
          </span>
        </div>

        <div className="space-y-3">
          {silverRates.map((item) => (
            <div
              key={item.name}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-[#111726] dark:to-[#0a0f1d] border border-slate-200 dark:border-slate-800 shadow-xs transition-all hover:border-slate-700"
            >
              {/* Top Row: Title & Purity */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center font-heading shadow-xs ${item.badgeClass}`}
                  >
                    {item.badge}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white font-heading leading-tight">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-heading">
                  {item.purity} {isTamil ? 'தூய்மை' : 'Purity'}
                </span>
              </div>

              {/* Bottom Row: 1g, 10g, 1kg Rates */}
              <div className="grid grid-cols-3 gap-2 pt-3.5 text-center">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">{t('oneGramPrice')}</span>
                  <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                    {formatCurrency(item.rate1g)}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">{isTamil ? '10 கிராம்' : '10 Grams'}</span>
                  <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                    {formatCurrency(item.rate10g)}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">{isTamil ? '1 கிலோ' : '1 Kg'}</span>
                  <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                    {formatCurrency(item.rate1kg)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. QUICK GOLD VALUATION CALCULATOR */}
      <div className="relative z-10 overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-white via-amber-50/40 to-white dark:bg-gradient-to-br dark:from-[#131b2e] dark:via-[#0c1220] dark:to-[#171424] border border-amber-500/25 dark:border-amber-500/30 shadow-lg dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)] space-y-4">
        {/* Ambient Gradient Glows inside card */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-br from-amber-500/20 via-yellow-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-gradient-to-tr from-amber-600/15 via-orange-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/50 dark:via-amber-300/30 to-transparent pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-[1px] shadow-sm flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-[11px] bg-white dark:bg-slate-900 flex items-center justify-center text-amber-500 dark:text-amber-400">
                <GiGoldBar className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider font-heading bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-yellow-300 dark:to-amber-400 bg-clip-text text-transparent">
                {t('goldCalculator')}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {isTamil ? 'நேரலை விலைக்கேற்ப உடனடி கணக்கீடு' : 'Instant valuation based on live rates'}
              </p>
            </div>
          </div>

          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/15 to-yellow-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-heading">
            {calcMetal === '999' ? (isTamil ? 'வெள்ளி' : 'Silver') : (isTamil ? 'தங்கம்' : 'Gold')}
          </span>
        </div>

        {/* Calculator Inputs: Purity + Weight */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('calcSelectPurity')}
            </label>
            <div className="flex gap-1.5">
              {['24K', '22K', '18K', '999'].map((m) => {
                const isActive = calcMetal === m;
                const isSilver = m === '999';
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCalcMetal(m)}
                    className={`flex-1 py-2.5 min-h-[44px] rounded-xl text-xs font-black transition-all duration-200 cursor-pointer font-heading border flex items-center justify-center active:scale-95 ${
                      isActive
                        ? isSilver
                          ? 'bg-amber-500 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-950 border-slate-100 shadow-[0_2px_14px_rgba(200,200,200,0.35)] ring-2 ring-slate-300/40'
                          : 'bg-amber-500 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 border-amber-300 shadow-[0_2px_14px_rgba(245,158,11,0.4)] ring-2 ring-amber-400/40'
                        : 'bg-gradient-to-b from-white to-slate-50 dark:from-slate-800/80 dark:to-slate-900/90 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-amber-500/40 hover:text-amber-500 dark:hover:text-amber-300'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('calcWeight')}
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={calcWeight}
                onChange={(e) => setCalcWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3.5 pr-14 min-h-[48px] py-2.5 bg-gradient-to-b from-white to-slate-50 dark:from-slate-950/90 dark:to-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-base font-bold tabular-nums focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
              />
              <span className="absolute right-2.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 pointer-events-none font-heading">
                {isTamil ? 'கிராம்' : 'grams'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Weight Preset Buttons */}
        <div className="relative z-10 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
            {isTamil ? 'விரைவு எடை:' : 'Quick:'}
          </span>
          {[
            { label: '1g', val: 1 },
            { label: '4g', val: 4 },
            { label: isTamil ? '8g (1 சவரன்)' : '8g (1 Poun)', val: 8 },
            { label: '10g', val: 10 },
            { label: isTamil ? '16g (2 சவரன்)' : '16g (2 Poun)', val: 16 },
          ].map((preset) => {
            const isPresetActive = Number(calcWeight) === preset.val;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setCalcWeight(preset.val)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer font-heading border ${
                  isPresetActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-xs'
                    : 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-amber-500/30 hover:text-amber-500'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Estimated Value Card - Hero Gradient Box */}
        <div
          className={`relative z-10 overflow-hidden p-4 sm:p-5 rounded-2xl border transition-all duration-300 shadow-md flex flex-wrap items-center justify-between gap-3 ${
            calcMetal === '999'
              ? 'bg-gradient-to-br from-slate-200/60 via-slate-100/40 to-slate-200/30 dark:from-slate-800/90 dark:via-slate-850/70 dark:to-slate-900/80 border-slate-300 dark:border-slate-700/80 shadow-[0_4px_20px_rgba(148,163,184,0.15)]'
              : 'bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-amber-600/5 dark:from-amber-500/20 dark:via-yellow-500/10 dark:to-transparent border-amber-500/40 dark:border-amber-500/35 shadow-[0_6px_24px_rgba(245,158,11,0.2)]'
          }`}
        >
          {/* Top subtle highlight shimmer border */}
          <div
            className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${
              calcMetal === '999'
                ? 'from-transparent via-slate-400 to-transparent'
                : 'from-transparent via-amber-400 dark:via-yellow-300 to-transparent'
            }`}
          />

          <div className="space-y-1">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider font-heading border ${
                calcMetal === '999'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                  : 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
              }`}
            >
              <span>✨</span>
              <span>{t('calculatedEstValue')}</span>
            </div>
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-semibold tabular-nums">
              {calcWeight}g × {formatCurrency(activeRatePerGram)}/g
            </div>
          </div>

          <div className="text-right">
            <p
              className={`text-2xl sm:text-3xl font-black tabular-nums tracking-tight font-heading ${
                calcMetal === '999'
                  ? 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-slate-300 bg-clip-text text-transparent'
                  : 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 dark:from-yellow-100 dark:via-amber-300 dark:to-yellow-400 bg-clip-text text-transparent filter drop-shadow-[0_2px_10px_rgba(245,158,11,0.25)]'
              }`}
            >
              {formatCurrency(rawBullionValue)}
            </p>
          </div>
        </div>

        {/* Advisory Note */}
        <div className="relative z-10 flex items-start gap-2.5 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/10 dark:via-slate-900/40 dark:to-transparent border border-amber-500/15">
          <FiInfo className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
            {t('resaleAdvisoryNote')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoldRates;