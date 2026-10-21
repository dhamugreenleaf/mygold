import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiTrendingUp, FiPlus, FiUser, FiActivity, FiUsers, FiDollarSign, FiClock, FiLogOut } from 'react-icons/fi';
import { GiGoldBar } from 'react-icons/gi';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

export const BottomNavigation = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated) return null;

  const isAdmin = user?.role === 'admin';
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'overview';

  const handleAdminLogout = async () => {
    try {
      await logout();
      toast.success(t('logout'));
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  // ----------------------------------------------------
  // ADMIN MOBILE BOTTOM NAVIGATION
  // ----------------------------------------------------
  if (isAdmin) {
    return (
      <nav aria-label="Admin Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-card)]/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-[var(--border-color)] dark:border-slate-800 px-3 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-2xl">
        <div className="flex items-center justify-around max-w-md mx-auto relative">
          
          {/* 1. Dashboard Overview */}
          <NavLink
            to="/admin?tab=overview"
            className={() =>
              `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                location.pathname === '/admin' && currentTab === 'overview'
                  ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
              }`
            }
          >
            <FiActivity className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[10px] font-heading font-bold">{t('navDashboard')}</span>
          </NavLink>

          {/* 2. User Management */}
          <NavLink
            to="/admin?tab=users"
            className={() =>
              `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                location.pathname.startsWith('/admin') && currentTab === 'users'
                  ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
              }`
            }
          >
            <FiUsers className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[10px] font-heading font-bold">{t('navUsers')}</span>
          </NavLink>

          {/* 3. Center Highlight: Price Editor Button */}
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('admin:open-price-editor'));
            }}
            className="relative -top-4 flex flex-col items-center transition-transform group hover:scale-105 active:scale-95 cursor-pointer"
          >
            <div className="w-[50px] h-[50px] rounded-full bg-gold-metallic flex items-center justify-center text-slate-950 shadow-[0_4px_14px_rgba(217,154,0,0.35)] ring-4 ring-[var(--bg-main)] dark:ring-slate-950 transition-transform">
              <FiDollarSign className="w-6 h-6 stroke-[3]" />
            </div>
            <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 mt-1 font-heading tracking-wider uppercase">
              {t('navPrice')}
            </span>
          </button>

          {/* 4. Audit Logs */}
          <NavLink
            to="/admin?tab=audit"
            className={() =>
              `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                location.pathname === '/admin' && currentTab === 'audit'
                  ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
              }`
            }
          >
            <FiClock className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[10px] font-heading font-bold">{t('navAudit')}</span>
          </NavLink>

          {/* 5. Logout */}
          <button
            type="button"
            onClick={handleAdminLogout}
            className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-rose-500 hover:text-rose-600 dark:text-rose-400 font-medium cursor-pointer transition-colors"
          >
            <FiLogOut className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[10px] font-heading font-bold">{t('logout')}</span>
          </button>

        </div>
      </nav>
    );
  }

  // ----------------------------------------------------
  // REGULAR CUSTOMER MOBILE BOTTOM NAVIGATION
  // ----------------------------------------------------
  return (
    <nav aria-label="Mobile Bottom Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-card)]/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-[var(--border-color)] dark:border-slate-800 px-2 sm:px-4 pt-1.5 pb-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] dark:shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {/* Home */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-2 min-h-[48px] min-w-[44px] rounded-xl transition-all ${
              isActive
                ? 'bg-[var(--gold-1)]/50 dark:bg-transparent text-[var(--gold-4)] dark:text-[var(--text-gold)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:text-slate-500 dark:hover:text-slate-300 font-medium'
            }`
          }
        >
          <FiHome className="w-5 h-5 shrink-0" />
          <span className="text-[11px] font-semibold tracking-tight truncate max-w-[64px]">{t('navHome')}</span>
        </NavLink>

        {/* Assets */}
        <NavLink
          to="/my-gold"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-2 min-h-[48px] min-w-[44px] rounded-xl transition-all ${
              isActive
                ? 'bg-[var(--gold-1)]/50 dark:bg-transparent text-[var(--gold-4)] dark:text-[var(--text-gold)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:text-slate-500 dark:hover:text-slate-300 font-medium'
            }`
          }
        >
          <GiGoldBar className="w-5 h-5 shrink-0" />
          <span className="text-[11px] font-semibold tracking-tight truncate max-w-[64px]">{t('navAssets')}</span>
        </NavLink>

        {/* Add Gold (Visually Highlighted Center Button) */}
        <NavLink
          to="/add-gold"
          className={({ isActive }) =>
            `relative -top-3.5 flex flex-col items-center transition-transform group ${
              isActive ? 'scale-[1.02]' : 'hover:scale-[1.02]'
            }`
          }
        >
          <div className="w-12 h-12 rounded-full bg-gold-metallic flex items-center justify-center text-slate-950 shadow-[0_4px_14px_rgba(217,154,0,0.35)] ring-4 ring-[var(--bg-main)] dark:ring-[#080D15] group-active:scale-95 transition-transform border-none">
            <FiPlus className="w-6 h-6 stroke-[3]" />
          </div>
          <span className="text-[11px] font-extrabold text-[var(--text-gold)] dark:text-[#E8B331] mt-0.5 font-heading tracking-wide uppercase">
            {t('navAdd')}
          </span>
        </NavLink>

        {/* Gold Rate */}
        <NavLink
          to="/gold-rates"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-2 min-h-[48px] min-w-[44px] rounded-xl transition-all ${
              isActive
                ? 'bg-[var(--gold-1)]/50 dark:bg-transparent text-[var(--gold-4)] dark:text-[var(--text-gold)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:text-slate-500 dark:hover:text-slate-300 font-medium'
            }`
          }
        >
          <FiTrendingUp className="w-5 h-5 shrink-0" />
          <span className="text-[11px] font-semibold tracking-tight truncate max-w-[64px]">{t('navRates')}</span>
        </NavLink>

        {/* Profile */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-2 min-h-[48px] min-w-[44px] rounded-xl transition-all ${
              isActive
                ? 'bg-[var(--gold-1)]/50 dark:bg-transparent text-[var(--gold-4)] dark:text-[var(--text-gold)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:text-slate-500 dark:hover:text-slate-300 font-medium'
            }`
          }
        >
          <FiUser className="w-5 h-5 shrink-0" />
          <span className="text-[11px] font-semibold tracking-tight truncate max-w-[64px]">{t('navProfile')}</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNavigation;

