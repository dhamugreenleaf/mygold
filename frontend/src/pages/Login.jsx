import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { login } from '../services/api';
import toast from 'react-hot-toast';
import { FiArrowRight, FiShield, FiLock, FiUser, FiEye, FiEyeOff } from 'react-icons/fi';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { setAuthSession } = useAuth();
  const { t, isTamil } = useLanguage();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      toast.error(isTamil ? 'பயனர் பெயர் மற்றும் கடவுச்சொல் தேவை.' : 'Username and password are required.');
      return;
    }

    try {
      setLoading(true);
      const res = await login(cleanUsername, password);
      if (res.success && res.data?.token) {
        toast.success(isTamil ? 'மீண்டும் வருக! 🔒' : 'Welcome back! 🔒');
        setAuthSession(res.data.token, res.data.user);
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || (isTamil ? 'பயனர் பெயர் அல்லது கடவுச்சொல் தவறானது.' : 'Invalid username or password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center max-w-sm mx-auto px-4 py-8 animate-in fade-in duration-300">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-[var(--gold-2)] to-[var(--gold-3)] dark:from-amber-400 dark:to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-6">
          <FiShield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-black text-[var(--text-primary)] dark:text-white font-heading">
          {t('welcomeBack')}
        </h1>
        <p className="text-[var(--text-secondary)] dark:text-slate-400 mt-2 text-sm font-medium">
          {t('loginSubtitle')}
        </p>
      </div>

      <div className="bg-[var(--bg-card)] dark:bg-slate-900/80 p-6 rounded-[24px] border border-[var(--border-color)] dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-none">
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-500 ml-1">
              {isTamil ? 'பயனர் பெயர் / மொபைல்' : 'Username / Mobile'}
            </label>
            <div className="relative">
              <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isTamil ? 'பயனர் பெயர் அல்லது மொபைல் எண்' : 'Enter username or mobile'}
                className="w-full pl-11 pr-4 min-h-[48px] py-3 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-base font-bold text-[var(--text-primary)] dark:text-white"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-500 ml-1">
                {t('passwordLabel')}
              </label>
            </div>
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                className="w-full pl-11 pr-11 min-h-[48px] py-3 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-base font-bold text-[var(--text-primary)] dark:text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
            <Link
              to="/forgot-username"
              className="font-bold text-[var(--text-muted)] dark:text-slate-400 hover:text-amber-500 transition-colors p-1"
            >
              {t('forgotUsername')}
            </Link>
            <Link
              to="/forgot-password"
              className="font-bold text-amber-600 dark:text-amber-400 hover:underline p-1"
            >
              {t('forgotPassword')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] sm:min-h-[52px] py-3.5 rounded-xl bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 font-bold text-base shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer font-heading disabled:opacity-50"
          >
            <span>{loading ? t('signingInBtn') : t('signInBtn')}</span>
            <FiArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-[var(--text-secondary)] dark:text-slate-400 mt-6 font-medium">
        {t('noAccountPrompt')}{' '}
        <Link to="/register" className="text-amber-600 dark:text-amber-400 font-bold hover:underline">
          {t('registerNow')}
        </Link>
      </p>
    </div>
  );
};

export default Login;
