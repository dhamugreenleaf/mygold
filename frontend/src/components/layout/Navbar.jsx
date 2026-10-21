import React from 'react';
import { FiMenu, FiUser, FiZap } from 'react-icons/fi';
import { useGoldRate } from '../../context/GoldRateContext';

const Navbar = ({ setIsOpen }) => {
  const { rate24K, rate22K } = useGoldRate();

  return (
    <header className="sticky top-0 z-30 h-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 flex items-center justify-between">
      {/* Mobile Toggle & Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden focus:outline-none"
          aria-label="Open sidebar"
        >
          <FiMenu className="w-6 h-6" />
        </button>

        <div className="hidden sm:block">
          <h2 className="text-sm font-medium text-slate-400">Live Asset Portfolio</h2>
          <p className="text-xs text-amber-400/90 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Real-time Valuation Mode
          </p>
        </div>
      </div>

      {/* Live Gold Ticker & User Profile */}
      <div className="flex items-center gap-4">
        {/* Rates Ticker Badge */}
        {(rate24K || rate22K) && (
          <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-950/80 border border-amber-500/20 text-xs">
            {rate24K && (
              <div className="flex items-center gap-1 text-amber-400 font-semibold">
                <FiZap className="w-3.5 h-3.5" />
                <span>24K: ₹{rate24K.toLocaleString('en-IN')}/g</span>
              </div>
            )}
            {rate24K && rate22K && <span className="text-slate-700">|</span>}
            {rate22K && (
              <div className="text-yellow-400 font-medium">
                22K: ₹{rate22K.toLocaleString('en-IN')}/g
              </div>
            )}
          </div>
        )}

        {/* Demo User Info */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-md shadow-amber-500/10">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-amber-400 font-bold text-sm">
              <FiUser className="w-4 h-4" />
            </div>
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-200">Demo Investor</p>
            <p className="text-[10px] text-slate-400">Standard Tier</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
