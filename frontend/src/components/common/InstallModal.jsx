import React from 'react';
import { usePWA } from '../../context/PWAContext';
import { GiGoldBar } from 'react-icons/gi';
import { 
  FiX, 
  FiCheckCircle, 
  FiSmartphone, 
  FiShield, 
  FiZap, 
  FiTrendingUp, 
  FiDownloadCloud 
} from 'react-icons/fi';

export const InstallModal = () => {
  const { isInstallModalOpen, closeInstallModal, executeInstall } = usePWA();

  if (!isInstallModalOpen) {
    return null;
  }

  const handleInstallClick = async () => {
    await executeInstall();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside backdrop to close */}
      <div 
        className="absolute inset-0" 
        onClick={closeInstallModal} 
        aria-hidden="true" 
      />

      {/* In-App Install Modal Card */}
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-gradient-to-b from-[#141C2E] via-[#0E1526] to-[#0A0E1A] border border-amber-500/35 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_35px_rgba(245,158,11,0.25)] p-6 sm:p-8 text-white overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={closeInstallModal}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Close dialog"
        >
          <FiX className="w-5 h-5" />
        </button>

        {/* Modal Header & 3D Gold Emblem */}
        <div className="flex flex-col items-center text-center relative z-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-[#FFE7A0] via-[#F59E0B] to-[#92400E] p-0.5 shadow-xl shadow-amber-500/35 flex items-center justify-center mb-4 border-2 border-white/60 relative group">
            <div className="w-full h-full rounded-[22px] bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 flex items-center justify-center overflow-hidden">
              <GiGoldBar className="w-9 h-9 sm:w-11 sm:h-11 text-slate-950 drop-shadow-md" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center border border-amber-400 shadow-md">
              <FiDownloadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl sm:text-2xl font-black font-heading tracking-tight text-white">
              Install Aurum Vault
            </h3>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono tracking-wider shadow-xs">
              PWA
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xs">
            Add to your home screen for the full app experience with fast offline access.
          </p>
        </div>

        {/* Feature Benefits List */}
        <div className="my-5 space-y-2.5 bg-slate-900/60 rounded-2xl p-4 border border-slate-800/80 relative z-10">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <FiZap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100 font-heading">1-Tap Fast Launch</p>
              <p className="text-[11px] text-slate-400 leading-tight">Instant opening without browser address bar clutter.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <FiCheckCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100 font-heading">Offline Vault Ledger</p>
              <p className="text-[11px] text-slate-400 leading-tight">View assets and compute valuations even without internet.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <FiTrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100 font-heading">Live Chennai Bullion Sync</p>
              <p className="text-[11px] text-slate-400 leading-tight">Automatic background retail rate updates for 24K, 22K & Silver.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 relative z-10">
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/35 hover:shadow-amber-500/50 transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer font-heading flex items-center justify-center gap-2 border border-amber-300/40"
          >
            <FiDownloadCloud className="w-5 h-5 stroke-[2.5]" />
            <span>Install App to Device</span>
          </button>

          <button
            type="button"
            onClick={closeInstallModal}
            className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold font-heading transition-colors cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallModal;
