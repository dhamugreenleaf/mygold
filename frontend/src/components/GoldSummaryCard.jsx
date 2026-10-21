import React from 'react';

export const GoldSummaryCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeType = 'profit', // 'profit', 'neutral', 'gold', 'loss'
}) => {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900/75 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-amber-500/20 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:border-amber-400 dark:hover:border-amber-500/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
      {/* Subtle Top-Right Ambient Glow */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all"></div>

      <div>
        <div className="flex items-center justify-between gap-1.5 mb-2.5">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate font-heading">
            {title}
          </span>
          {Icon && (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 group-hover:scale-110 transition-transform">
              <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate tabular-nums font-heading">
            {value}
          </h3>
          {badge && (
            <span
              className={`text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-md tabular-nums tracking-wide ${
                badgeType === 'profit'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                  : badgeType === 'loss'
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
              }`}
            >
              {badge}
            </span>
          )}
        </div>
      </div>

      {subtitle && (
        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-2.5 font-medium truncate flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
          <span>{subtitle}</span>
        </p>
      )}
    </div>
  );
};

export default GoldSummaryCard;
