import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../context/PWAContext';
import { useLanguage } from '../context/LanguageContext';
import { FiUser, FiLogOut, FiChevronDown, FiDownload, FiBell, FiGlobe } from 'react-icons/fi';
import { GiGoldBar } from 'react-icons/gi';

export const AccountMenu = () => {
  const { user, logout } = useAuth();
  const { isInstalled, promptInstall } = usePWA();
  const { t, language, toggleLanguage, isTamil } = useLanguage();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isPaid = user?.plan === 'paid' || user?.subscription_status === 'active' || user?.role === 'admin';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-amber-400 text-slate-900 dark:text-slate-200 transition-all cursor-pointer shadow-xs group"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="relative">
          <div className="w-7 h-7 rounded-xl bg-gold-metallic text-slate-950 flex items-center justify-center font-bold text-xs font-heading">
            {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>
          {isPaid && (
            <span className="absolute -top-1.5 -right-1 text-[10px] drop-shadow-sm" title="Premium Pro Active">
              👑
            </span>
          )}
        </div>
        <div className="text-left hidden sm:block">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block -mb-0.5 font-heading uppercase">
              {isTamil ? 'வணக்கம்,' : 'Hi,'}
            </span>
            {isPaid && (
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-heading">
                PRO
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white font-heading truncate max-w-[100px] block">
            {user?.username}
          </span>
        </div>
        <FiChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180 text-amber-500' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div 
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] sm:hidden" 
            onClick={() => setOpen(false)} 
          />

          <div className="fixed inset-x-3 top-20 sm:inset-x-auto sm:top-full sm:absolute sm:right-0 sm:mt-2 sm:w-64 max-w-sm ml-auto bg-white dark:bg-[#0b0f19] rounded-3xl sm:rounded-2xl border border-slate-200 dark:border-amber-500/25 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
            {/* User Info Header in Dropdown */}
            <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-extrabold text-slate-900 dark:text-white font-heading truncate">
                {user?.username}
              </p>
              {isPaid ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-gold-metallic text-slate-950 font-heading">
                  PREMIUM
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 font-heading">
                  FREE TIER
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {user?.phone || user?.email || ''}
            </p>
          </div>

          <div className="py-1 space-y-0.5">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-amber-500/10 dark:hover:bg-amber-500/15 transition-all font-heading"
            >
              <FiUser className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>{t('profile')}</span>
            </Link>

            <Link
              to="/my-gold"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-amber-500/10 dark:hover:bg-amber-500/15 transition-all font-heading"
            >
              <GiGoldBar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>{t('navAssets')}</span>
            </Link>

            {/* Quick Language Toggle item */}
            <button
              type="button"
              onClick={() => {
                toggleLanguage();
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 dark:hover:bg-amber-500/15 transition-all font-heading text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FiGlobe className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{t('language')}</span>
              </div>
              <span className="text-[10px] font-black bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-lg border border-amber-500/30 shadow-xs font-heading">
                {language === 'en' ? 'தமிழ்' : 'English'}
              </span>
            </button>

            {!isInstalled && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  promptInstall();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 transition-all font-heading text-left cursor-pointer"
              >
                <FiDownload className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{t('installApp')}</span>
              </button>
            )}
          </div>

          <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 transition-all cursor-pointer font-heading"
            >
              <FiLogOut className="w-4 h-4" />
              <span>{t('logout')}</span>
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default AccountMenu;
