import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  FiHome,
  FiTrendingUp,
  FiPlus,
  FiSun,
  FiMoon,
  FiLogIn,
  FiUserPlus,
  FiShield,
  FiLogOut,
  FiGlobe,
} from 'react-icons/fi';
import { GiGoldBar } from 'react-icons/gi';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { usePWA } from '../../context/PWAContext';
import { useLanguage } from '../../context/LanguageContext';
import AccountMenu from '../AccountMenu';
import NotificationButton from './NotificationButton';

export const Navbar = () => {
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const { isInstalled, promptInstall } = usePWA();
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

  const handleAdminLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#080B12]/90 backdrop-blur-xl border-b border-slate-200 dark:border-amber-500/15 transition-all shadow-xs dark:shadow-[0_4px_30px_rgba(0,0,0,0.15)]">
      <div className="max-w-[1180px] mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-3">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-6">
          <Link to={isAdmin ? '/admin' : '/'} className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#FFE29F] via-[#F59E0B] to-[#92400E] flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/30 group-hover:scale-105 group-hover:shadow-amber-500/50 transition-all duration-300">
              <GiGoldBar className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm" />
              <div className="absolute inset-0 rounded-2xl border border-white/40 pointer-events-none"></div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-heading font-black text-base sm:text-xl tracking-tight text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  My Gold
                </span>
                <span
                  className={`hidden sm:inline-flex text-[9px] sm:text-[10px] font-extrabold tracking-wider uppercase px-1.5 sm:px-2 py-0.5 rounded-full border ${
                    isAdmin
                      ? 'bg-gold-metallic text-slate-950 border-amber-400 font-black'
                      : user?.plan === 'paid' || user?.subscription_status === 'active'
                      ? 'bg-gold-metallic text-slate-950 border-amber-400 font-black shadow-xs'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold'
                  }`}
                >
                  {isAdmin
                    ? t('adminPanel')
                    : user?.plan === 'paid' || user?.subscription_status === 'active'
                    ? t('premiumVault')
                    : t('freeVault')}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 -mt-0.5 hidden sm:block font-medium">
                {isAdmin ? t('adminSubtitle') : t('tagline')}
              </p>
            </div>
          </Link>
        </div>

        {/* Regular Customer Navigation (Hidden for Admin) */}
        {isAuthenticated && !isAdmin ? (
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800/80 backdrop-blur-md">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-gold-metallic text-slate-950 dark:bg-gold-metallic dark:text-slate-950 shadow-[0_2px_10px_rgba(217,154,0,0.2)] border-none'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5 border-none'
                }`
              }
            >
              <FiHome className="w-4 h-4" />
              <span>{t('navHome')}</span>
            </NavLink>

            <NavLink
              to="/my-gold"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-gold-metallic text-slate-950 dark:bg-gold-metallic dark:text-slate-950 shadow-[0_2px_10px_rgba(217,154,0,0.2)] border-none'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5 border-none'
                }`
              }
            >
              <GiGoldBar className="w-4 h-4" />
              <span>{t('navAssets')}</span>
            </NavLink>

            <NavLink
              to="/gold-rates"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-gold-metallic text-slate-950 dark:bg-gold-metallic dark:text-slate-950 shadow-[0_2px_10px_rgba(217,154,0,0.2)] border-none'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5 border-none'
                }`
              }
            >
              <FiTrendingUp className="w-4 h-4" />
              <span>{t('navRates')}</span>
            </NavLink>
          </nav>
        ) : null}

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Language Switcher Button */}
          <button
            type="button"
            onClick={toggleLanguage}
            title={language === 'en' ? 'தமிழில் மாற்றவும்' : 'Switch to English'}
            aria-label="Toggle language"
            className="flex items-center justify-center gap-1.5 px-3 sm:px-3.5 min-h-[44px] rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 hover:from-amber-500/25 hover:via-yellow-500/20 hover:to-amber-500/25 border border-amber-500/40 hover:border-amber-400 text-amber-700 dark:text-amber-300 font-black text-xs transition-all duration-200 cursor-pointer shadow-xs shadow-amber-500/10 hover:shadow-md hover:shadow-amber-500/20 active:scale-95 group font-heading"
          >
            <FiGlobe className="w-4 h-4 text-amber-500 shrink-0 group-hover:rotate-12 transition-transform duration-300" />
            <span className="tracking-wide bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 dark:from-yellow-200 dark:via-amber-300 dark:to-yellow-400 bg-clip-text text-transparent font-black">
              {language === 'en' ? 'தமிழ்' : 'English'}
            </span>
          </button>

          {/* Header Install Icon Button (Only if not installed) */}
          {!isInstalled && (
            <button
              type="button"
              onClick={promptInstall}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 hover:border-amber-400 text-amber-700 dark:text-amber-300 transition-all cursor-pointer shadow-xs group relative"
              title={t('installApp')}
              aria-label="Install App"
            >
              <GiGoldBar className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center text-[8px] font-black border border-amber-400 font-mono leading-none">
                ↓
              </span>
            </button>
          )}

          {/* Daily Price Notification Alerts Button */}
          {isAuthenticated && <NotificationButton />}

          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-400 transition-all cursor-pointer shadow-xs"
            title={t('switchTheme')}
            aria-label="Toggle theme"
          >
            {isDark ? <FiSun className="w-4 h-4 text-amber-300" /> : <FiMoon className="w-4 h-4 text-amber-700" />}
          </button>

          {isAuthenticated ? (
            isAdmin ? (
              // Dedicated Admin Header Controls
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold font-heading">
                  <FiShield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="hidden sm:inline">{user?.username || 'Administrator'}</span>
                </div>

                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold font-heading transition-all cursor-pointer"
                  title={t('logout')}
                >
                  <FiLogOut className="w-3.5 h-3.5" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            ) : (
              // Regular Customer Header Controls
              <>
                <Link
                  to="/add-gold"
                  className="hidden sm:flex items-center gap-2 bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-amber-500/25 hover:shadow-amber-500/40 transition-all transform active:scale-95 cursor-pointer font-heading tracking-wide border-none"
                >
                  <FiPlus className="w-4 h-4 stroke-[3]" />
                  <span>{t('addAssetBtn')}</span>
                </Link>

                <AccountMenu />
              </>
            )
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-900/80 border border-transparent hover:border-slate-200 dark:hover:border-amber-500/30 transition-all font-heading"
              >
                <FiLogIn className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{t('login')}</span>
              </Link>

              <Link
                to="/register"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-bold shadow-md hover:from-amber-300 transition-all font-heading"
              >
                <FiUserPlus className="w-3.5 h-3.5" />
                <span>{t('register')}</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
