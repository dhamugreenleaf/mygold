import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { usePWA } from '../../context/PWAContext';
import { GiGoldBar } from 'react-icons/gi';
import { FiDownload } from 'react-icons/fi';

export const FloatingInstallButton = () => {
  const { isInstalled, promptInstall } = usePWA();
  const [showTooltip, setShowTooltip] = useState(false);
  const location = useLocation();

  const isAuthRoute =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-username' ||
    location.pathname === '/forgot-password';

  if (isInstalled) {
    return null;
  }

  const handleInstall = async (e) => {
    e.stopPropagation();
    await promptInstall();
  };

  return (
    <div 
      className={`fixed ${isAuthRoute ? 'bottom-6' : 'bottom-20 sm:bottom-6'} right-4 sm:right-6 z-50 flex flex-col items-center justify-end`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Floating Hover Tooltip */}
      {showTooltip && (
        <div className="hidden sm:block absolute right-16 top-3 px-3 py-1.5 rounded-xl bg-slate-900/95 dark:bg-[#0B101D]/95 text-white text-xs font-bold font-heading whitespace-nowrap shadow-xl border border-amber-500/30 backdrop-blur-md animate-in fade-in slide-in-from-right-2 duration-150 mr-1 z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400">🪙</span>
            <span>Install Aurum Vault App</span>
          </div>
        </div>
      )}

      {/* Floating Physics Animated Container */}
      <div className="animate-float-bob relative flex items-center justify-center">
        {/* Unique 3D Gold Bullion Floating Action Button */}
        <button
          type="button"
          onClick={handleInstall}
          title="Install Aurum Vault App"
          aria-label="Install Aurum Vault App"
          className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#FFF0BE] via-[#F59E0B] to-[#92400E] p-0.5 shadow-[0_10px_35px_-5px_rgba(245,158,11,0.5),0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_15px_45px_-5px_rgba(245,158,11,0.7),0_0_30px_rgba(245,158,11,0.5)] flex items-center justify-center cursor-pointer hover:scale-110 active:scale-90 transition-all duration-300 border-2 border-white/60 group relative overflow-visible"
        >
          {/* Inner Gold Sheen Container */}
          <div className="w-full h-full rounded-[14px] bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 flex items-center justify-center relative overflow-hidden">
            {/* Ambient Sheen Streak */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

            {/* 3D Gold Bar Ingot Icon */}
            <GiGoldBar className="w-7 h-7 sm:w-8 sm:h-8 text-slate-950 drop-shadow-md group-hover:rotate-6 group-hover:scale-110 transition-all duration-300" />
          </div>

          {/* Small Bottom-Right Download Badge */}
          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center border-2 border-amber-400 shadow-md shadow-black/50 group-hover:scale-110 transition-transform">
            <FiDownload className="w-3.5 h-3.5 stroke-[3] group-hover:translate-y-0.5 transition-transform" />
          </div>

          {/* Top-Right Emerald Pulse Dot */}
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-xs" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping opacity-80" />
        </button>
      </div>

      {/* Floating Shadow Below Button */}
      <div className="w-10 h-2 rounded-full bg-amber-500/40 blur-xs animate-float-shadow mt-1" />
    </div>
  );
};

export default FloatingInstallButton;
