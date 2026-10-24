import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { requestForgotUsernameOtp, verifyForgotUsernameOtp, verifyForgotUsernameMsg91 } from '../services/api';
import { initSendOtpWidget, sendOtpViaWidget, verifyOtpViaWidget, retryOtpViaWidget } from '../utils/msg91Otp';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';
import { FiArrowRight, FiUserX, FiPhone, FiCheckCircle, FiCopy, FiCheck } from 'react-icons/fi';

export const ForgotUsername = () => {
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [recoveredUsername, setRecoveredUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [copied, setCopied] = useState(false);

  const { isTamil } = useLanguage();
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

  const maskMobile = (num) => {
    if (!num) return '';
    const str = String(num).replace(/\D/g, '').slice(-10);
    if (str.length < 4) return str;
    return `******${str.slice(-4)}`;
  };

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length !== 10) {
      toast.error(isTamil ? 'சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்.' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setLoading(true);
      // 1. Dispatch OTP via server-to-server API
      const res = await requestForgotUsernameOtp(cleanMobile);

      // 2. Dispatch OTP via MSG91 Web Widget in background
      sendOtpViaWidget(cleanMobile).catch(() => {});

      if (res.success) {
        toast.success(res.message || (isTamil ? 'OTP உங்கள் மொபைல் எண்ணிற்கு அனுப்பப்பட்டது.' : 'OTP sent to your registered mobile number.'));
        setMobile(cleanMobile);
        setStep(2);
        setCooldown(60);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || (isTamil ? 'OTP அனுப்ப முடியவில்லை.' : 'Failed to request OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = String(otp || '').trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      toast.error(isTamil ? 'சரியான OTP குறியீட்டை உள்ளிடவும்.' : 'Please enter a valid OTP.');
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);

    try {
      setLoading(true);

      // 1. First attempt verification via MSG91 Web Widget if available
      let msg91Token = null;
      try {
        const widgetResult = await Promise.race([
          verifyOtpViaWidget(cleanMobile, cleanOtp),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
        ]);
        msg91Token = widgetResult?.accessToken;
      } catch (widgetErr) {
        console.warn('[MSG91 Widget Verify Fallback]:', widgetErr?.message || widgetErr);
      }

      let res;
      if (msg91Token) {
        res = await verifyForgotUsernameMsg91({
          mobile: cleanMobile,
          accessToken: msg91Token,
        });
      } else {
        // 2. Direct server verification (checks both backend DB and MSG91 API)
        res = await verifyForgotUsernameOtp(cleanMobile, cleanOtp);
      }

      if (res.success && res.data?.username) {
        toast.success(isTamil ? 'பயனர் பெயர் மீட்கப்பட்டது! 🎉' : 'Username recovered successfully! 🎉');
        setRecoveredUsername(res.data.username);
        setStep(3);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || (isTamil ? 'தவறான OTP குறியீடு.' : 'Invalid OTP. Please check and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || loading) return;
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    try {
      setLoading(true);
      retryOtpViaWidget(cleanMobile).catch(() => {});
      const res = await requestForgotUsernameOtp(cleanMobile);
      toast.success(res?.message || (isTamil ? 'OTP மீண்டும் அனுப்பப்பட்டது.' : 'OTP resent successfully.'));
      setCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || (isTamil ? 'மீண்டும் OTP அனுப்ப முடியவில்லை.' : 'Failed to resend OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUsername = () => {
    if (!recoveredUsername) return;
    navigator.clipboard.writeText(recoveredUsername);
    setCopied(true);
    toast.success(isTamil ? 'பயனர் பெயர் நகலெடுக்கப்பட்டது!' : 'Username copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGoToLogin = () => {
    navigate('/login', { state: { username: recoveredUsername } });
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center max-w-sm mx-auto px-4 py-8 animate-in fade-in duration-300">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-[var(--gold-2)] to-[var(--gold-3)] dark:from-amber-400 dark:to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-6">
          <FiUserX className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-black text-[var(--text-primary)] dark:text-white font-heading">
          {isTamil ? 'பயனர் பெயர் மீட்பு' : 'Recover Username'}
        </h1>
        <p className="text-[var(--text-secondary)] dark:text-slate-400 mt-2 text-sm font-medium">
          {step === 1 && (isTamil ? 'பதிவு செய்யப்பட்ட மொபைல் எண்ணை உள்ளிடவும்.' : 'Enter your registered mobile number.')}
          {step === 2 && (isTamil ? 'பயனர் பெயரைக் காண உங்கள் மொபைலைச் சரிபார்க்கவும்.' : 'Verify your mobile to see your username.')}
          {step === 3 && (isTamil ? 'உங்கள் பயனர் பெயர் மீட்கப்பட்டது.' : 'Your username has been recovered.')}
        </p>
      </div>

      <div className="bg-[var(--bg-card)] dark:bg-slate-900/80 p-6 rounded-[24px] border border-[var(--border-color)] dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-none">
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-500 ml-1">
                {isTamil ? 'பதிவு செய்யப்பட்ட மொபைல்' : 'Registered Mobile'}
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <FiPhone className="w-4 h-4 text-slate-400" />
                  <span className="text-[var(--text-secondary)] dark:text-slate-500 font-bold text-sm">+91</span>
                  <div className="w-px h-4 bg-[var(--border-color)] dark:bg-slate-700 ml-1"></div>
                </div>
                <input
                  type="tel"
                  name="tel"
                  autoComplete="tel"
                  inputMode="numeric"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder={isTamil ? '10 இலக்க மொபைல் எண்' : 'Enter 10-digit number'}
                  maxLength={10}
                  className="w-full pl-[88px] pr-4 min-h-[48px] py-3 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[var(--border-glow)] dark:focus:ring-amber-500/20 focus:border-[var(--text-gold)] dark:focus:border-amber-500 outline-none transition-all text-base font-bold tracking-wide text-[var(--text-primary)] dark:text-white placeholder:font-medium placeholder:text-slate-400 placeholder:tracking-normal"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] sm:min-h-[52px] flex items-center justify-center gap-2 bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 py-3.5 rounded-xl font-bold text-base shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed font-heading mt-2 cursor-pointer"
            >
              {loading ? (isTamil ? 'அனுப்பப்படுகிறது...' : 'Requesting...') : (isTamil ? 'OTP அனுப்பவும்' : 'Send OTP')}
              {!loading && <FiArrowRight className="w-5 h-5 stroke-[2.5]" />}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-[var(--text-secondary)] dark:text-slate-400 font-medium">
                {isTamil ? 'குறியீடு அனுப்பப்பட்டது:' : 'Code sent to'}{' '}
                <span className="font-bold text-[var(--text-primary)] dark:text-white">+91 {maskMobile(mobile)}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <input
                  type="text"
                  name="otp"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="_ _ _ _ _ _"
                  className="w-full px-4 py-4 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[var(--border-glow)] dark:focus:ring-amber-500/20 focus:border-[var(--text-gold)] dark:focus:border-amber-500 outline-none transition-all text-2xl font-black text-center tracking-[0.5em] text-[var(--text-primary)] dark:text-white placeholder:tracking-normal"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {isTamil ? 'எண் மாற்ற' : 'Change Number'}
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldown > 0 || loading}
                className="text-xs font-bold text-[var(--text-gold)] dark:text-amber-400 disabled:text-[var(--text-muted)] transition-colors cursor-pointer"
              >
                {cooldown > 0 
                  ? `${isTamil ? 'மீண்டும் OTP' : 'Resend OTP in'} 00:${cooldown.toString().padStart(2, '0')}` 
                  : (isTamil ? 'மீண்டும் OTP அனுப்பவும்' : 'Resend OTP')}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otp.replace(/\D/g, '').length < 4}
              className="w-full min-h-[48px] sm:min-h-[52px] flex items-center justify-center gap-2 bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 py-3.5 rounded-xl font-bold text-base shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed font-heading cursor-pointer"
            >
              {loading ? (isTamil ? 'சரிபார்க்கிறது...' : 'Verifying...') : (isTamil ? 'சரிபார்த்து காட்டுக' : 'Verify & Reveal')}
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center py-4">
            <FiCheckCircle className="w-12 h-12 text-[var(--profit-green)] dark:text-emerald-500 mx-auto" />
            <div>
              <p className="text-xs font-bold text-[var(--text-secondary)] dark:text-slate-400 uppercase tracking-widest font-heading mb-2">
                {isTamil ? 'உங்கள் பயனர் பெயர்' : 'Your Username is'}
              </p>
              <div className="relative group bg-[var(--bg-subtle)] dark:bg-slate-800/80 p-4 rounded-xl border border-[var(--border-color)] dark:border-slate-700 flex items-center justify-between">
                <span className="text-xl font-black text-[var(--text-primary)] dark:text-white tracking-wider flex-1 text-center pl-6">
                  {recoveredUsername}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUsername}
                  title={isTamil ? 'நகலெடு' : 'Copy'}
                  className="p-2 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-white/10 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  {copied ? <FiCheck className="w-5 h-5 text-emerald-500" /> : <FiCopy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleGoToLogin}
              className="w-full min-h-[48px] sm:min-h-[52px] flex items-center justify-center gap-2 bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 py-3.5 rounded-xl font-bold text-base shadow-md transition-all font-heading cursor-pointer"
            >
              <span>{isTamil ? 'உள்நுழைய செல்லவும்' : 'Go to Login'}</span>
              <FiArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link to="/login" className="text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-slate-500 dark:hover:text-slate-300">
          {isTamil ? '← உள்நுழைவுக்கு திரும்பு' : '← Back to Login'}
        </Link>
      </div>
    </div>
  );
};

export default ForgotUsername;
