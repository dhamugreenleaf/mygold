import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { requestForgotUsernameOtp, verifyForgotUsernameOtp } from '../services/api';
import toast from 'react-hot-toast';
import { FiArrowRight, FiUserX, FiPhone, FiCheckCircle } from 'react-icons/fi';

export const ForgotUsername = () => {
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [recoveredUsername, setRecoveredUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    const cleanMobile = mobile.replace(/\D/g, '').replace(/^0+/, '');
    if (!cleanMobile || cleanMobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setLoading(true);
      const res = await requestForgotUsernameOtp(cleanMobile);
      if (res.success) {
        toast.success(res.message);
        setStep(2);
        setCooldown(30);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP.');
      return;
    }

    try {
      setLoading(true);
      const res = await verifyForgotUsernameOtp(mobile, otp);
      if (res.success && res.data?.username) {
        setRecoveredUsername(res.data.username);
        setStep(3);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    try {
      setLoading(true);
      const res = await requestForgotUsernameOtp(mobile);
      if (res.success) {
        toast.success('OTP resent successfully.');
        setCooldown(30);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP.');
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
        <div className="w-16 h-16 mx-auto bg-[var(--bg-subtle)] dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
          <FiUserX className="w-8 h-8 text-[var(--text-muted)] dark:text-slate-400" />
        </div>
        <h1 className="text-3xl font-black text-[var(--text-primary)] dark:text-white font-heading">
          Recover Username
        </h1>
        <p className="text-[var(--text-secondary)] dark:text-slate-400 mt-2 text-sm font-medium">
          {step === 1 && 'Enter your registered mobile number.'}
          {step === 2 && 'Verify your mobile to see your username.'}
          {step === 3 && 'Your username has been recovered.'}
        </p>
      </div>

      <div className="bg-[var(--bg-card)] dark:bg-slate-900/80 p-6 rounded-[24px] border border-[var(--border-color)] dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-none">
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-500 ml-1">Registered Mobile</label>
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
                  placeholder="Enter 10-digit number"
                  maxLength={10}
                  className="w-full pl-[88px] pr-4 min-h-[48px] py-3 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[var(--border-glow)] dark:focus:ring-amber-500/20 focus:border-[var(--text-gold)] dark:focus:border-amber-500 outline-none transition-all text-base font-bold tracking-wide text-[var(--text-primary)] dark:text-white placeholder:font-medium placeholder:text-slate-400 placeholder:tracking-normal"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] sm:min-h-[52px] flex items-center justify-center gap-2 bg-gold-metallic text-slate-950 py-3.5 rounded-xl font-bold text-base shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed font-heading mt-2 cursor-pointer"
            >
              {loading ? 'Requesting...' : 'Send OTP'}
              {!loading && <FiArrowRight className="w-5 h-5 stroke-[2.5]" />}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-[var(--text-secondary)] dark:text-slate-400 font-medium">Code sent to <span className="font-bold text-[var(--text-primary)] dark:text-white">+91 {maskMobile(mobile)}</span></p>
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
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Change Number
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldown > 0 || loading}
                className="text-xs font-bold text-[var(--text-gold)] dark:text-amber-400 disabled:text-[var(--text-muted)] transition-colors"
              >
                {cooldown > 0 ? `Resend OTP in 00:${cooldown.toString().padStart(2, '0')}` : 'Resend OTP'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full flex items-center justify-center gap-2 bg-[var(--gold-2)] dark:bg-gradient-to-r dark:from-amber-500 dark:to-amber-600 text-[var(--text-primary)] dark:text-white py-4 rounded-xl font-bold text-sm shadow-[0_4px_14px_rgba(217,154,0,0.3)] dark:shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed font-heading"
            >
              {loading ? 'Verifying...' : 'Verify & Reveal'}
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center py-4">
            <FiCheckCircle className="w-12 h-12 text-[var(--profit-green)] dark:text-emerald-500 mx-auto" />
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)] dark:text-slate-400 uppercase tracking-widest font-heading mb-2">Your Username is</p>
              <p className="text-2xl font-black text-[var(--text-primary)] dark:text-white bg-[var(--bg-subtle)] dark:bg-slate-800 py-3 rounded-xl border border-[var(--border-color)] dark:border-slate-700">{recoveredUsername}</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-[var(--text-primary)] dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-bold text-sm transition-all font-heading"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link to="/login" className="text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-slate-500 dark:hover:text-slate-300">
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default ForgotUsername;
