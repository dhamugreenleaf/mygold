import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { requestRegisterOtp, verifyRegisterOtp, verifyRegisterMsg91 } from '../services/api';
import { initSendOtpWidget, sendOtpViaWidget, verifyOtpViaWidget, retryOtpViaWidget } from '../utils/msg91Otp';
import toast from 'react-hot-toast';
import { FiArrowRight, FiShield, FiPhone, FiUser, FiLock, FiMail } from 'react-icons/fi';

export const Register = () => {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const { setAuthSession } = useAuth();
  const { t, isTamil } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    initSendOtpWidget();
  }, []);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      toast.error(isTamil ? 'பயனர் பெயர் குறைந்தது 3 எழுத்துக்கள் இருக்க வேண்டும்.' : 'Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z\s]+$/.test(cleanUsername)) {
      toast.error(isTamil ? 'பயனர் பெயர் எழுத்துக்களாக மட்டுமே இருக்க வேண்டும்.' : 'Username can only contain alphabets and spaces.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(isTamil ? 'சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்.' : 'Please enter a valid email.');
      return;
    }
    if (!password || password.length < 6) {
      toast.error(isTamil ? 'கடவுச்சொல் குறைந்தது 6 எழுத்துக்கள் இருக்க வேண்டும்.' : 'Password must be at least 6 characters.');
      return;
    }
    const cleanMobile = mobile.replace(/\D/g, '').replace(/^0+/, '');
    if (!cleanMobile || cleanMobile.length !== 10) {
      toast.error(isTamil ? 'சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்.' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setLoading(true);
      const res = await requestRegisterOtp(cleanUsername, cleanMobile);
      sendOtpViaWidget(cleanMobile).catch(() => {});
      toast.success(res?.message || (isTamil ? 'OTP உங்கள் மொபைல் எண்ணிற்கு அனுப்பப்பட்டது.' : 'OTP sent successfully to your mobile.'));
      setStep(2);
      setCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || (isTamil ? 'OTP அனுப்ப முடியவில்லை.' : 'Failed to send OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = String(otp || '').trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      toast.error(isTamil ? '6 இலக்க OTP குறியீட்டை உள்ளிடவும்.' : 'Please enter the 6-digit OTP.');
      return;
    }

    try {
      setLoading(true);
      const cleanMobile = mobile.replace(/\D/g, '').replace(/^0+/, '');
      const cleanUsername = username.trim();

      let msg91Token = null;
      try {
        const widgetResult = await Promise.race([
          verifyOtpViaWidget(cleanMobile, cleanOtp),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        msg91Token = widgetResult?.accessToken;
      } catch (widgetErr) {
        console.warn('[MSG91 Widget Verify Fallback]:', widgetErr?.message || widgetErr);
      }

      let res;
      if (msg91Token) {
        res = await verifyRegisterMsg91({
          username: cleanUsername,
          email,
          password,
          mobile: cleanMobile,
          accessToken: msg91Token,
        });
      } else {
        res = await verifyRegisterOtp(cleanUsername, email, password, cleanMobile, cleanOtp);
      }

      if (res.success && res.data?.token) {
        toast.success(isTamil ? 'கணக்கு தொடங்கப்பட்டது! 🎉' : 'Account verified & created! 🎉');
        setAuthSession(res.data.token, res.data.user);
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || (isTamil ? 'தவறான OTP குறியீடு.' : 'Invalid OTP. Please check and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    try {
      setLoading(true);
      const cleanMobile = mobile.replace(/\D/g, '').replace(/^0+/, '');
      const cleanUsername = username.trim();
      const res = await requestRegisterOtp(cleanUsername, cleanMobile);
      retryOtpViaWidget(cleanMobile).catch(() => {});
      toast.success(res?.message || (isTamil ? 'OTP மீண்டும் அனுப்பப்பட்டது.' : 'OTP resent to your mobile.'));
      setCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || (isTamil ? 'மீண்டும் OTP அனுப்ப முடியவில்லை.' : 'Failed to resend OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const maskMobile = (num) => {
    if (!num) return '';
    const str = String(num);
    if (str.length < 4) return str;
    return `******${str.slice(-4)}`;
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center max-w-sm mx-auto px-4 py-8 animate-in fade-in duration-300">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-[var(--gold-2)] to-[var(--gold-3)] dark:from-amber-400 dark:to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-6 rotate-3">
          <FiShield className="w-8 h-8 text-white -rotate-3" />
        </div>
        <h1 className="text-3xl font-black text-[var(--text-primary)] dark:text-white font-heading">
          {t('registerTitle')}
        </h1>
        <p className="text-[var(--text-secondary)] dark:text-slate-400 mt-2 text-sm font-medium">
          {step === 1 ? t('registerSubtitle') : (isTamil ? 'தொடர உங்கள் மொபைல் எண்ணை சரிபார்க்கவும்.' : 'Verify your mobile number to continue.')}
        </p>
      </div>

      <div className="bg-[var(--bg-card)] dark:bg-slate-900/80 p-6 rounded-[24px] border border-[var(--border-color)] dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-none">
        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-500 ml-1">
                {t('username')}
              </label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  placeholder={isTamil ? 'உங்கள் முழு பெயர் / பயனர் பெயர்' : 'Full Name / Username'}
                  className="w-full pl-10 pr-4 min-h-[48px] py-3 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-xl focus:border-amber-500 outline-none text-base font-bold text-[var(--text-primary)] dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-500 ml-1">
                {isTamil ? 'மின்னஞ்சல்' : 'Email'}
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 min-h-[48px] py-3 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-xl focus:border-amber-500 outline-none text-base font-bold text-[var(--text-primary)] dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-500 ml-1">
                {t('mobileNumber')}
              </label>
              <div className="relative flex">
                <span className="inline-flex items-center px-3 min-h-[48px] text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-r-0 border-[var(--border-color)] dark:border-slate-800 rounded-l-xl">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength="10"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full px-4 min-h-[48px] py-3 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-r-xl focus:border-amber-500 outline-none text-base font-bold tabular-nums text-[var(--text-primary)] dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-500 ml-1">
                {t('passwordLabel')}
              </label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isTamil ? 'கடவுச்சொல் (குறைந்தது 6 எழுத்துக்கள்)' : 'At least 6 characters'}
                  className="w-full pl-10 pr-4 min-h-[48px] py-3 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-xl focus:border-amber-500 outline-none text-base font-bold text-[var(--text-primary)] dark:text-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] sm:min-h-[52px] py-3.5 mt-2 rounded-xl bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 font-black text-base shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer font-heading disabled:opacity-50"
            >
              <span>{loading ? (isTamil ? 'OTP அனுப்பப்படுகிறது...' : 'Sending OTP...') : t('sendOtp')}</span>
              <FiArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="text-center pb-2">
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {isTamil ? 'OTP அனுப்பப்பட்ட எண்:' : 'Enter 6-digit OTP sent to'}{' '}
                <b className="text-slate-900 dark:text-white">+91 {maskMobile(mobile)}</b>
              </p>
            </div>

            <div>
              <input
                type="text"
                maxLength="6"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full min-h-[52px] py-3.5 text-center text-2xl font-black tracking-widest bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-amber-500/40 rounded-xl focus:border-amber-500 outline-none tabular-nums"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] sm:min-h-[52px] py-3.5 rounded-xl bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 font-black text-base shadow-md active:scale-[0.98] transition-all font-heading cursor-pointer disabled:opacity-50"
            >
              {loading ? (isTamil ? 'சரிபார்க்கிறது...' : 'Verifying...') : t('verifyAndRegister')}
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold p-1"
              >
                ← {isTamil ? 'எண்ணை மாற்றுக' : 'Change Number'}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldown > 0 || loading}
                className="text-amber-600 dark:text-amber-400 font-bold hover:underline disabled:opacity-50 p-1"
              >
                {cooldown > 0 ? `${t('resendOtp')} (${cooldown}s)` : t('resendOtp')}
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="text-center text-xs text-[var(--text-secondary)] dark:text-slate-400 mt-6 font-medium">
        {t('haveAccountPrompt')}{' '}
        <Link to="/login" className="text-amber-600 dark:text-amber-400 font-bold hover:underline">
          {t('loginNow')}
        </Link>
      </p>
    </div>
  );
};

export default Register;
