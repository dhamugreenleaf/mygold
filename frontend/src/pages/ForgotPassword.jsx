
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { requestForgotPasswordOtp, verifyForgotPasswordOtp, verifyForgotMsg91, resetPassword } from '../services/api';
import { initSendOtpWidget, sendOtpViaWidget, verifyOtpViaWidget, retryOtpViaWidget } from '../utils/msg91Otp';
import toast from 'react-hot-toast';
import { FiArrowRight, FiShield, FiPhone, FiUser, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

export const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  
  // Step 1: Request OTP
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  
  // Step 2: Verify OTP
  const [otp, setOtp] = useState('');
  
  // Step 3: Reset Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

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
    const str = String(num);
    if (str.length < 4) return str;
    return `******${str.slice(-4)}`;
  };

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      toast.error('Username is required.');
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setLoading(true);
      // 1. Dispatch OTP via server-to-server MSG91 API
      const res = await requestForgotPasswordOtp(cleanUsername, cleanMobile);

      // 2. Trigger widget in background if available
      sendOtpViaWidget(cleanMobile).catch(() => {});

      if (res.success) {
        toast.success(res.message || 'OTP sent successfully to your mobile.');
        setStep(2);
        setCooldown(60);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = String(otp || '').trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      toast.error('Please enter a valid OTP.');
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    const cleanUsername = username.trim();

    try {
      setLoading(true);

      // 1. First attempt verification via MSG91 Web Widget if available
      let msg91Token = null;
      try {
        const widgetResult = await Promise.race([
          verifyOtpViaWidget(cleanMobile, cleanOtp),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
        ]);
        msg91Token = widgetResult?.accessToken;
      } catch (widgetErr) {
        console.warn('[MSG91 Widget Verify Fallback]:', widgetErr?.message || widgetErr);
      }

      let res;
      if (msg91Token) {
        res = await verifyForgotMsg91({
          mobile: cleanMobile,
          accessToken: msg91Token,
        });
      } else {
        // 2. Direct server verification (checks both backend DB and MSG91 API)
        res = await verifyForgotPasswordOtp(cleanUsername, cleanMobile, cleanOtp);
      }

      if (res.success && res.data?.resetToken) {
        toast.success(res.message || 'Mobile verified! Please set your new password.');
        setResetToken(res.data.resetToken);
        setStep(3);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Invalid OTP. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await resetPassword(resetToken, newPassword);
      if (res.success) {
        toast.success('Password updated successfully. Please log in.');
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password.');
      if (err.response?.status === 401) {
        // Token expired
        setStep(1);
      }
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
          {step === 3 ? 'Create New Password' : 'Forgot Password?'}
        </h1>
        <p className="text-[var(--text-secondary)] dark:text-slate-400 mt-2 text-sm font-medium">
          {step === 1 && 'Enter your username and registered mobile number to reset.'}
          {step === 2 && 'Verify your mobile number to authorize the reset.'}
          {step === 3 && 'Secure your account with a new password.'}
        </p>
      </div>

      <div className="bg-[var(--bg-card)] dark:bg-slate-900/80 p-6 rounded-[24px] border border-[var(--border-color)] dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-none">
        
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-500 ml-1">Username</label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-11 pr-4 min-h-[48px] py-3 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[var(--border-glow)] dark:focus:ring-amber-500/20 focus:border-[var(--text-gold)] dark:focus:border-amber-500 outline-none transition-all text-base font-bold text-[var(--text-primary)] dark:text-white placeholder:font-medium placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-500 ml-1">Registered Mobile Number</label>
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
              className="w-full min-h-[48px] sm:min-h-[52px] flex items-center justify-center gap-2 bg-gold-metallic text-slate-950 py-3.5 rounded-xl font-bold text-base shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed font-heading mt-4 cursor-pointer"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
              {!loading && <FiArrowRight className="w-5 h-5 stroke-[2.5]" />}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-[var(--text-secondary)] dark:text-slate-400 font-medium">OTP sent to <br/><span className="font-bold text-[var(--text-primary)] dark:text-white">+91 {maskMobile(mobile)}</span></p>
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
                  placeholder="_ _ _ _"
                  className="w-full px-4 py-4 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[var(--border-glow)] dark:focus:ring-amber-500/20 focus:border-[var(--text-gold)] dark:focus:border-amber-500 outline-none transition-all text-2xl font-black text-center tracking-[0.5em] text-[var(--text-primary)] dark:text-white placeholder:tracking-normal"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
              >
                Change Details
              </button>
              <button
                type="button"
                onClick={() => handleRequestOtp()}
                disabled={cooldown > 0 || loading}
                className="text-xs font-bold text-[var(--text-gold)] dark:text-amber-400 disabled:text-[var(--text-muted)] dark:disabled:text-slate-400 transition-colors"
              >
                {cooldown > 0 ? `Resend OTP in 00:${cooldown.toString().padStart(2, '0')}` : 'Resend OTP'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="w-full flex items-center justify-center gap-2 bg-[var(--gold-2)] dark:bg-gradient-to-r dark:from-amber-500 dark:to-amber-600 text-[var(--text-primary)] dark:text-white py-4 rounded-xl font-bold text-sm shadow-md shadow-[var(--border-glow)] dark:hover:shadow-lg dark:hover:shadow-amber-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 font-heading"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-500 ml-1">New Password</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="new-password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-11 pr-11 py-3.5 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[var(--border-glow)] dark:focus:ring-amber-500/20 focus:border-[var(--text-gold)] dark:focus:border-amber-500 outline-none transition-all text-sm font-bold text-[var(--text-primary)] dark:text-white placeholder:font-medium placeholder:text-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--text-gold)] transition-colors"
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-500 ml-1">Confirm Password</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirm-password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-11 pr-11 py-3.5 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[var(--border-glow)] dark:focus:ring-amber-500/20 focus:border-[var(--text-gold)] dark:focus:border-amber-500 outline-none transition-all text-sm font-bold text-[var(--text-primary)] dark:text-white placeholder:font-medium placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full flex items-center justify-center gap-2 bg-[var(--gold-2)] dark:bg-gradient-to-r dark:from-amber-500 dark:to-amber-600 text-[var(--text-primary)] dark:text-white py-4 rounded-xl font-bold text-sm shadow-md shadow-[var(--border-glow)] dark:hover:shadow-lg dark:hover:shadow-amber-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 font-heading mt-4"
            >
              {loading ? 'Updating password...' : 'Reset Password'}
            </button>
          </form>
        )}

      </div>

      <div className="mt-8 text-center">
        <Link to="/login" className="text-sm font-medium text-[var(--text-gold)] dark:text-amber-400 hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
