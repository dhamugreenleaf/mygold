import React from 'react';
import { useGoldRate } from '../../context/GoldRateContext';
import { formatCurrency } from '../../utils/formatters';
import { GiGoldBar } from 'react-icons/gi';
import { FiClock, FiShield } from 'react-icons/fi';
import { IoDiamondOutline } from 'react-icons/io5';

export const LiveGoldTicker = () => {
  const {
    rate24K,
    rate22K,
    silverRate,
    sourceUpdate,
    source,
    isStale,
    isUnavailable,
    status,
  } = useGoldRate();

  return (
    <div className="gold-ticker-container flex items-center justify-center border-b border-[var(--ticker-border)] bg-[var(--ticker-bg)]" aria-label="Chennai Gold & Silver Rates">
      <div className="max-w-[1180px] w-full mx-auto px-4 sm:px-6 flex items-center justify-between overflow-x-auto no-scrollbar py-2 text-xs font-semibold">
        {/* Live Indicator & LiveChennai Market Label */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isUnavailable
                  ? 'bg-rose-400'
                  : isStale
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isUnavailable
                  ? 'bg-rose-500'
                  : isStale
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            />
          </span>
          <span className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--ticker-gold)] flex items-center gap-1.5">
            <GiGoldBar className="w-3.5 h-3.5 inline text-amber-400" />
            <span>CHENNAI GOLD MARKET RATE</span>
          </span>
          <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
            (Source: <strong className="text-slate-300">{source}</strong>)
          </span>
        </div>

        {/* Live Rates Values: 24K, 22K, Silver */}
        <div className="flex items-center space-x-4 sm:space-x-6 mx-4 whitespace-nowrap">
          {/* 24K Pure Gold */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 dark:text-slate-400 light:text-stone-500 font-medium">24K (999):</span>
            <span className="font-bold text-amber-400 dark:text-amber-400 light:text-amber-700 tabular-nums">
              {formatCurrency(rate24K)}
              <span className="text-[10px] font-normal text-slate-400 ml-0.5">/g</span>
            </span>
            <span className="text-[10px] text-slate-500 hidden md:inline tabular-nums">
              ({formatCurrency(rate24K * 8)} / 8g)
            </span>
          </div>

          <span className="text-slate-600 dark:text-slate-700 select-none">•</span>

          {/* 22K Standard Gold */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 dark:text-slate-400 light:text-stone-500 font-medium">22K (916):</span>
            <span className="font-bold text-emerald-400 dark:text-emerald-400 light:text-emerald-700 tabular-nums">
              {formatCurrency(rate22K)}
              <span className="text-[10px] font-normal text-slate-400 ml-0.5">/g</span>
            </span>
            <span className="text-[10px] text-slate-500 hidden md:inline tabular-nums">
              ({formatCurrency(rate22K * 8)} / 8g)
            </span>
          </div>

          <span className="text-slate-600 dark:text-slate-700 select-none">•</span>

          {/* Silver 1 Gram */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 dark:text-slate-400 light:text-stone-500 font-medium">Silver:</span>
            <span className="font-bold text-sky-300 dark:text-sky-300 light:text-sky-700 tabular-nums">
              {formatCurrency(silverRate)}
              <span className="text-[10px] font-normal text-slate-400 ml-0.5">/g</span>
            </span>
          </div>
        </div>

        {/* Source Update Timestamp */}
        {sourceUpdate ? (
          <div className="hidden lg:flex items-center space-x-1 text-slate-400 dark:text-slate-400 light:text-stone-500 text-[11px] shrink-0">
            <FiClock className="w-3 h-3 text-amber-400" />
            <span>Updated: {sourceUpdate}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default LiveGoldTicker;