import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  FiLogOut,
  FiShield,
  FiChevronRight,
  FiUser,
  FiLock,
  FiBell,
  FiAward,
  FiPhone,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiCalendar,
  FiFileText,
  FiChevronDown,
  FiSend,
  FiLoader,
  FiGlobe,
} from 'react-icons/fi';
import { useNotification } from '../context/NotificationContext';
import { TermsModal } from '../components/common/TermsModal';
import toast from 'react-hot-toast';
import {
  getAssets,
  requestChangeMobileOtp,
  verifyChangeMobileOtp,
  updateProfile,
  cancelMonthlySubscription,
  pauseMonthlySubscription,
  resumeMonthlySubscription,
  getEntitlementStatus,
  getNotificationStatus,
} from '../services/api';
import {
  initSendOtpWidget,
  sendOtpViaWidget,
  verifyOtpViaWidget,
  retryOtpViaWidget,
} from '../utils/msg91Otp';
import {
  enablePushNotifications,
  disablePushNotifications,
  isPushNotificationSupported,
} from '../utils/notification';
import { formatReadableDate } from '../utils/formatters';

export const Profile = () => {
  const { user, setAuthSession, logout, refreshUserProfile } = useAuth();
  const { t, language, setLanguage, isTamil } = useLanguage();
  const navigate = useNavigate();
  
  const [assetCount, setAssetCount] = useState(0);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [entitlement, setEntitlement] = useState(null);
  
  // Subscription Action States & Modals
  const [showManageSubModal, setShowManageSubModal] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [subActionLoading, setSubActionLoading] = useState(false);

  // Change Mobile State
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [mobileStep, setMobileStep] = useState(1);
  const [newMobile, setNewMobile] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileLoading, setMobileLoading] = useState(false);
  const [mobileCooldown, setMobileCooldown] = useState(0);

  // Edit Profile State (Direct update - No OTP required)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [editUsername, setEditUsername] = useState(user?.username || user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editLoading, setEditLoading] = useState(false);

  // Daily Notification Settings Context
  const {
    notificationsEnabled,
    deviceSubscribed,
    loading: notifLoading,
    testing: notifTesting,
    toggleNotifications: handleToggleNotifications,
    enableOnDevice: handleEnableOnDevice,
    sendTestAlert: handleSendTestNotification,
    permission: notifPermission,
    isSupported: isPushSupported,
  } = useNotification();

  useEffect(() => {
    initSendOtpWidget();
  }, []);

  useEffect(() => {
    let timer;
    if (mobileCooldown > 0) {
      timer = setInterval(() => setMobileCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [mobileCooldown]);

  useEffect(() => {
    const fetchAssetCountAndEntitlement = async () => {
      try {
        setLoadingAssets(true);
        const [assetRes, entRes] = await Promise.allSettled([
          getAssets(),
          getEntitlementStatus(),
        ]);
        if (assetRes.status === 'fulfilled') {
          const count = assetRes.value?.data?.length || assetRes.value?.length || 0;
          setAssetCount(count);
        }
        if (entRes.status === 'fulfilled' && entRes.value?.data) {
          setEntitlement(entRes.value.data);
        }
      } catch (error) {
        console.error("Failed to fetch profile details", error);
      } finally {
        setLoadingAssets(false);
      }
    };
    fetchAssetCountAndEntitlement();
  }, []);

  const handlePauseAutoPay = async () => {
    try {
      setSubActionLoading(true);
      const res = await pauseMonthlySubscription();
      toast.success(res.message || 'AutoPay paused.');
      setShowPauseConfirm(false);
      if (refreshUserProfile) await refreshUserProfile();
      const entRes = await getEntitlementStatus();
      if (entRes?.data) setEntitlement(entRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to pause subscription');
    } finally {
      setSubActionLoading(false);
    }
  };

  const handleResumeAutoPay = async () => {
    try {
      setSubActionLoading(true);
      const res = await resumeMonthlySubscription();
      toast.success(res.message || 'AutoPay resumed successfully!');
      if (refreshUserProfile) await refreshUserProfile();
      const entRes = await getEntitlementStatus();
      if (entRes?.data) setEntitlement(entRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resume subscription');
    } finally {
      setSubActionLoading(false);
    }
  };

  const handleCancelAutoPay = async () => {
    try {
      setSubActionLoading(true);
      const res = await cancelMonthlySubscription();
      toast.success(res.message || 'AutoPay renewal cancelled.');
      setShowCancelConfirm(false);
      if (refreshUserProfile) await refreshUserProfile();
      const entRes = await getEntitlementStatus();
      if (entRes?.data) setEntitlement(entRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setSubActionLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    const cleanUsername = editUsername.trim();
    if (!cleanUsername) return toast.error(isTamil ? 'பயனர் பெயரை உள்ளிடவும்' : 'Username cannot be empty');
    if (cleanUsername.length < 3) return toast.error(isTamil ? 'பயனர் பெயர் குறைந்தது 3 எழுத்துகள் இருக்க வேண்டும்' : 'Username must be at least 3 characters');
    
    // Check if nothing changed
    if (cleanUsername === (user?.username || user?.name) && editEmail.trim() === (user?.email || '')) {
      return toast.error(isTamil ? 'மாற்றங்கள் எதுவும் இல்லை' : 'No changes to save.');
    }

    try {
      setEditLoading(true);
      const res = await updateProfile({ username: cleanUsername, email: editEmail.trim() });
      if (res.success) {
        toast.success(isTamil ? 'சுயவிவரம் புதுப்பிக்கப்பட்டது! 🎉' : 'Profile updated successfully! 🎉');
        if (setAuthSession && res.data?.user) {
          const currentToken = localStorage.getItem('aurum_token');
          setAuthSession(currentToken, res.data.user);
        }
        setShowEditProfileModal(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || (isTamil ? 'சுயவிவரத்தை புதுப்பிக்க முடியவில்லை' : 'Failed to update profile'));
    } finally {
      setEditLoading(false);
    }
  };

  const handleRequestChangeMobile = async (e) => {
    if (e) e.preventDefault();
    const cleanMobile = newMobile.replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length !== 10) {
      return toast.error(isTamil ? 'சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்' : 'Please enter a valid 10-digit mobile number');
    }
    const currentPhone = (user?.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanMobile === currentPhone) {
      return toast.error(isTamil ? 'இது உங்கள் தற்போதைய மொபைல் எண்' : 'This is already your current registered mobile number');
    }

    try {
      setMobileLoading(true);
      const res = await requestChangeMobileOtp(cleanMobile);
      // Dispatch via MSG91 Web Widget in background for reliable SMS delivery in production
      sendOtpViaWidget(cleanMobile).catch(() => {});
      toast.success(res?.message || (isTamil ? 'புதிய மொபைல் எண்ணிற்கு OTP அனுப்பப்பட்டது' : 'OTP sent to new mobile'));
      setNewMobile(cleanMobile);
      setMobileStep(2);
      setMobileCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || (isTamil ? 'OTP அனுப்ப முடியவில்லை' : 'Failed to request OTP'));
    } finally {
      setMobileLoading(false);
    }
  };

  const handleVerifyChangeMobile = async (e) => {
    e.preventDefault();
    const cleanOtp = String(mobileOtp || '').replace(/\D/g, '').trim();
    if (!cleanOtp || cleanOtp.length !== 4) {
      return toast.error(isTamil ? 'சரியான 4 இலக்க OTP குறியீட்டை உள்ளிடவும்' : 'Please enter the 4-digit OTP');
    }
    const cleanMobile = newMobile.replace(/\D/g, '').slice(-10);

    try {
      setMobileLoading(true);

      // 1. Attempt verification via MSG91 Web Widget if available
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

      // 2. Send to backend
      const res = await verifyChangeMobileOtp(cleanMobile, cleanOtp, msg91Token);
      if (res.success) {
        toast.success(isTamil ? 'மொபைல் எண் வெற்றிகரமாக மாற்றப்பட்டது! 🎉' : 'Mobile number updated successfully! 🎉');
        if (setAuthSession && res.data?.user) {
          const currentToken = localStorage.getItem('aurum_token');
          setAuthSession(currentToken, res.data.user);
        }
        setShowMobileModal(false);
        setMobileStep(1);
        setNewMobile('');
        setMobileOtp('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || (isTamil ? 'தவறான OTP குறியீடு' : 'Failed to verify OTP'));
    } finally {
      setMobileLoading(false);
    }
  };

  const handleResendChangeMobile = async () => {
    if (mobileCooldown > 0 || mobileLoading) return;
    const cleanMobile = newMobile.replace(/\D/g, '').slice(-10);
    try {
      setMobileLoading(true);
      retryOtpViaWidget(cleanMobile).catch(() => {});
      const res = await requestChangeMobileOtp(cleanMobile);
      toast.success(res?.message || (isTamil ? 'OTP மீண்டும் அனுப்பப்பட்டது' : 'OTP resent successfully'));
      setMobileCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || (isTamil ? 'மீண்டும் OTP அனுப்ப முடியவில்லை' : 'Failed to resend OTP'));
    } finally {
      setMobileLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Successfully locked vault and logged out 🔒');
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'G';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const isPaid = entitlement?.status === 'PAID' || user?.plan === 'paid' || user?.subscription_status === 'active' || user?.role === 'admin';
  const isCancelled = user?.subscription_status === 'cancelled' || !!user?.cancelled_at;
  const MAX_FREE_ASSETS = 10;
  const entriesUsed = entitlement?.entriesUsed ?? (user?.free_entries_used || 0);
  const progressPercentage = !isPaid ? Math.min((entriesUsed / MAX_FREE_ASSETS) * 100, 100) : 100;
  const currentPeriodEnd = user?.current_period_end || user?.subscription_expires_at || entitlement?.currentPeriodEnd;

  return (
    <div className="max-w-md mx-auto space-y-6 pb-24 md:pb-12 animate-in fade-in duration-300">
      
      {/* 1. Header Profile Section */}
      <div className="flex flex-col items-center justify-center text-center space-y-4 pt-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[var(--gold-2)] via-[var(--gold-3)] to-[var(--gold-4)] dark:from-amber-400 dark:via-amber-500 dark:to-amber-600 text-[var(--text-primary)] dark:text-slate-950 flex items-center justify-center font-heading font-black text-3xl shadow-[0_4px_14px_rgba(217,154,0,0.3)] dark:shadow-xl dark:shadow-amber-500/20">
            {getInitials(user?.username || user?.name)}
          </div>
          <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[var(--profit-green)] dark:bg-emerald-500 border-2 border-[var(--bg-main)] dark:border-slate-900 flex items-center justify-center text-white text-[10px] shadow-sm">
            ✓
          </div>
        </div>
        
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] dark:text-white font-heading">
            {user?.username || user?.name || 'Vault Member'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] dark:text-slate-400 font-medium">
            {user?.email || 'N/A'}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--profit-green)]/10 dark:bg-emerald-500/10 text-[var(--profit-green)] dark:text-emerald-400 border border-[var(--profit-green)]/20 dark:border-emerald-500/20 text-xs font-bold font-heading">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--profit-green)] dark:bg-emerald-500 animate-pulse"></span>
            Account Verified
          </div>
        </div>
      </div>

      {/* 2. Account Details */}
      <div className="bg-[var(--bg-card)] dark:bg-slate-900/80 rounded-3xl border border-[var(--border-color)] dark:border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-color)] dark:border-slate-800/80">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-400 font-heading">
            Account Information
          </h2>
        </div>
        <div className="divide-y divide-[var(--border-color)] dark:divide-slate-800/80">
          <div className="px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-secondary)] dark:text-slate-400">Username</span>
            <span className="text-sm font-bold text-[var(--text-primary)] dark:text-white">{user?.username || user?.name}</span>
          </div>
          <div className="px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-secondary)] dark:text-slate-400">Email</span>
            <span className="text-sm font-bold text-[var(--text-primary)] dark:text-white">{user?.email || 'N/A'}</span>
          </div>
          <div className="px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-secondary)] dark:text-slate-400">Mobile Number</span>
            <span className="text-sm font-bold text-[var(--text-primary)] dark:text-white">{user?.phone ? `+91 ${user.phone}` : 'Not Linked'}</span>
          </div>
          <div className="px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-secondary)] dark:text-slate-400">Member Since</span>
            <span className="text-sm font-bold text-[var(--text-primary)] dark:text-white">{formatDate(user?.created_at || user?.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* 3. Subscription & Plan */}
      <div className="bg-[var(--bg-card)] dark:bg-slate-900/80 rounded-3xl border border-[var(--border-color)] dark:border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-color)] dark:border-slate-800/80 flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-400 font-heading flex items-center gap-2">
            <FiAward className="w-4 h-4 text-[var(--text-gold)] dark:text-amber-500" />
            Subscription & Plan
          </h2>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
            isPaid 
              ? (user?.subscription_status === 'paused'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : isCancelled 
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' 
                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300')
              : 'bg-[var(--bg-subtle)] dark:bg-slate-800 text-[var(--text-secondary)] dark:text-slate-300'
          }`}>
            {isPaid 
              ? (user?.subscription_status === 'paused' 
                  ? 'AutoPay Paused' 
                  : isCancelled 
                    ? 'Cancellation Scheduled' 
                    : 'Active Premium') 
              : 'Free Tier'}
          </span>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)] dark:text-white font-heading">
                {isPaid ? 'Premium Monthly Vault' : 'Free Plan'}
              </p>
              <p className="text-xs text-[var(--text-secondary)] dark:text-slate-400 mt-0.5">
                {isPaid 
                  ? 'Unlimited Gold & Silver entries with monthly recurring AutoPay.'
                  : 'Track up to 10 combined Gold & Silver entries for free.'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-[var(--text-gold)] dark:text-amber-400 font-heading">
                {!isPaid ? entriesUsed : '∞'}
              </span>
              {!isPaid && (
                <span className="text-xs text-[var(--text-muted)] dark:text-slate-400 font-medium"> / {MAX_FREE_ASSETS} Used</span>
              )}
            </div>
          </div>

          {!isPaid ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="w-full h-2.5 bg-[var(--bg-subtle)] dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[var(--gold-2)] to-[var(--gold-3)] dark:from-amber-400 dark:to-amber-500 transition-all duration-700 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <p className="text-[10px] font-medium text-[var(--text-muted)] dark:text-slate-400 text-right">
                  {Math.max(MAX_FREE_ASSETS - entriesUsed, 0)} free entries remaining
                </p>
              </div>

              <button 
                onClick={() => navigate('/upgrade')}
                className="w-full py-3 rounded-xl bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 font-bold text-sm transition-all shadow-[0_4px_14px_rgba(217,154,0,0.3)] dark:shadow-md font-heading hover:-translate-y-0.5 cursor-pointer"
              >
                Upgrade to Premium Monthly
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-2 border-t border-[var(--border-color)] dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] dark:text-slate-400 flex items-center gap-1.5">
                  <span className="font-semibold">AutoPay:</span>
                </span>
                <span className={`font-bold font-heading px-2 py-0.5 rounded-md text-[11px] ${
                  user?.subscription_status === 'paused'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : isCancelled
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {user?.subscription_status === 'paused' ? 'PAUSED' : (isCancelled ? 'OFF / Ending' : 'ON')}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] dark:text-slate-400 flex items-center gap-1.5">
                  <FiCalendar className="w-3.5 h-3.5 text-amber-500" />
                  {isCancelled ? 'Access Valid Until:' : (user?.subscription_status === 'paused' ? 'Current Access Until:' : 'Next AutoPay Renewal:')}
                </span>
                <span className="font-bold text-[var(--text-primary)] dark:text-white font-mono">
                  {currentPeriodEnd ? formatDate(currentPeriodEnd) : 'Active'}
                </span>
              </div>

              <button
                onClick={() => setShowManageSubModal(true)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>⚙️ Manage Subscription & AutoPay</span>
              </button>
            </div>
          )}
        </div>
      </div> 

      {/* Manage Subscription Modal */}
      {showManageSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--bg-card)] dark:bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white font-heading flex items-center gap-2">
                <span>👑</span> Manage Subscription
              </h3>
              <button 
                onClick={() => setShowManageSubModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500">Plan:</span>
                <span className="font-bold text-slate-900 dark:text-white">Premium Monthly Vault</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500">AutoPay Status:</span>
                <span className={`font-bold ${
                  user?.subscription_status === 'paused'
                    ? 'text-amber-500'
                    : isCancelled
                      ? 'text-rose-500'
                      : 'text-emerald-500'
                }`}>
                  {user?.subscription_status === 'paused' ? 'PAUSED' : (isCancelled ? 'OFF / Ending' : 'ON')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500">Current Period:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {user?.current_period_start ? formatDate(user.current_period_start) : '—'} to {currentPeriodEnd ? formatDate(currentPeriodEnd) : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500">{isCancelled ? 'Access Valid Until:' : 'Next Billing Date:'}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {currentPeriodEnd ? formatDate(currentPeriodEnd) : '—'}
                </span>
              </div>
            </div>

            {/* Action Buttons inside Modal */}
            <div className="space-y-2 pt-2">
              {user?.subscription_status === 'paused' ? (
                <button
                  onClick={handleResumeAutoPay}
                  disabled={subActionLoading}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {subActionLoading ? 'Resuming AutoPay...' : '▶️ Resume AutoPay'}
                </button>
              ) : !isCancelled ? (
                <button
                  onClick={() => setShowPauseConfirm(true)}
                  disabled={subActionLoading}
                  className="w-full py-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold text-xs transition-colors cursor-pointer border border-amber-500/30 disabled:opacity-50"
                >
                  ⏸️ Pause AutoPay
                </button>
              ) : null}

              {!isCancelled && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={subActionLoading}
                  className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition-colors cursor-pointer border border-rose-200 dark:border-rose-500/30 disabled:opacity-50"
                >
                  ❌ Cancel Subscription
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pause Confirmation Modal */}
      {showPauseConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--bg-card)] dark:bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto text-2xl">
              ⏸️
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white font-heading">
              Pause AutoPay?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Future recurring payments will be paused according to the subscription lifecycle. Your subscription status will be updated after Razorpay confirms the change.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowPauseConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Keep Active
              </button>
              <button
                onClick={handlePauseAutoPay}
                disabled={subActionLoading}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs disabled:opacity-50"
              >
                {subActionLoading ? 'Pausing...' : 'Confirm Pause'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--bg-card)] dark:bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white font-heading">
              Cancel AutoPay?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Your future recurring payments will stop. Your Premium access will remain active until the end of your current paid billing period ({currentPeriodEnd ? formatDate(currentPeriodEnd) : 'billing period'}).
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelAutoPay}
                disabled={subActionLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50"
              >
                {subActionLoading ? 'Cancelling...' : 'Cancel AutoPay'}
              </button>
            </div>
          </div>
        </div>
      )} 

      {/* 4. Security Notice */}
      <div className="p-5 rounded-3xl bg-[var(--gold-1)]/10 dark:bg-amber-500/5 border border-[var(--gold-2)]/30 dark:border-amber-500/20 flex gap-4">
        <div className="w-10 h-10 shrink-0 rounded-2xl bg-[var(--gold-1)]/30 dark:bg-amber-500/20 text-[var(--text-gold)] dark:text-amber-400 flex items-center justify-center">
          <FiShield className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] dark:text-white font-heading">Your Vault is Private</h3>
          <p className="text-xs text-[var(--text-secondary)] dark:text-slate-400 mt-1 leading-relaxed font-medium">
            All your gold entries, purchase receipts, and jewellery photos are stored securely. No other user can access your bullion records.
          </p>
        </div>
      </div>

      {/* 4.1 Terms & Conditions Card */}
      <div className="p-5 rounded-3xl bg-[var(--bg-card)] dark:bg-slate-900/80 border border-[var(--border-color)] dark:border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-sm flex flex-col gap-3">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-[var(--gold-1)]/20 dark:bg-amber-500/15 text-[var(--text-gold)] dark:text-amber-400 flex items-center justify-center">
            <FiFileText className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-[var(--text-primary)] dark:text-white font-heading uppercase tracking-wide">
              {t('termsAndConditions')}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] dark:text-slate-400 mt-1 leading-relaxed font-medium">
              {t('termsSubtitle')}
            </p>
          </div>
        </div>
        <div className="pt-2 border-t border-[var(--border-color)] dark:border-slate-800/60 flex justify-end">
          <button
            type="button"
            onClick={() => setShowTermsModal(true)}
            className="text-xs font-bold text-[var(--text-gold)] dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer py-1"
          >
            <span>{t('viewTerms')}</span>
            <span className="text-sm leading-none">→</span>
          </button>
        </div>
      </div>

      {/* 4.2 Language Settings Card */}
      <div className="bg-[var(--bg-card)] dark:bg-slate-900/80 rounded-3xl border border-[var(--border-color)] dark:border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400/20 via-yellow-400/15 to-amber-600/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <FiGlobe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
                {t('languageSection')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t('selectLanguage')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-1.5 rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200/70 dark:from-slate-950/80 dark:to-[#0a0f1d] border border-slate-200 dark:border-slate-800/80 shadow-inner">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 border cursor-pointer font-heading flex items-center justify-center gap-1.5 active:scale-95 ${
              language === 'en'
                ? 'bg-amber-500 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30 ring-1 ring-amber-400/40 scale-[1.01]'
                : 'bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>🇬🇧</span>
            <span>English</span>
          </button>
          <button
            type="button"
            onClick={() => setLanguage('ta')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 border cursor-pointer font-heading flex items-center justify-center gap-1.5 active:scale-95 ${
              language === 'ta'
                ? 'bg-amber-500 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30 ring-1 ring-amber-400/40 scale-[1.01]'
                : 'bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>🇮🇳</span>
            <span>தமிழ்</span>
          </button>
        </div>
      </div>

      {/* 5. Account Settings (UI Links) */}
      <div className="bg-[var(--bg-card)] dark:bg-slate-900/80 rounded-3xl border border-[var(--border-color)] dark:border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-sm overflow-hidden">
        <div className="divide-y divide-[var(--border-color)] dark:divide-slate-800/80">
          <button 
            onClick={() => {
              setEditUsername(user?.username || user?.name || '');
              setEditEmail(user?.email || '');
              setShowEditProfileModal(true);
            }}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--bg-subtle)] dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-[var(--text-primary)] dark:text-slate-300">
              <FiUser className="w-4 h-4 text-[var(--text-muted)] dark:text-slate-400" />
              <span className="text-sm font-bold">Edit Profile</span>
            </div>
            <FiChevronRight className="w-4 h-4 text-[var(--text-muted)] dark:text-slate-400" />
          </button>
          <button 
            onClick={() => setShowMobileModal(true)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--bg-subtle)] dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-[var(--text-primary)] dark:text-slate-300">
              <FiPhone className="w-4 h-4 text-[var(--text-muted)] dark:text-slate-400" />
              <span className="text-sm font-bold">Change Mobile Number</span>
            </div>
            <FiChevronRight className="w-4 h-4 text-[var(--text-muted)] dark:text-slate-400" />
          </button>
          {/* Notifications Setting */}
          <div className="px-5 py-4 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-[var(--text-primary)] dark:text-slate-300">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${
                  notificationsEnabled && deviceSubscribed
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : notificationsEnabled
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                }`}>
                  <FiBell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold block font-heading">Push Notifications</span>
                    {notificationsEnabled && deviceSubscribed ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase font-heading">
                        <FiCheckCircle className="w-2.5 h-2.5" /> ACTIVE ON THIS DEVICE
                      </span>
                    ) : notifPermission === 'denied' ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 uppercase font-heading">
                        PERMISSION BLOCKED
                      </span>
                    ) : notificationsEnabled ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase font-heading">
                        TAP TO ALLOW
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500 uppercase font-heading">
                        DISABLED
                      </span>
                    )}
                  </div>

                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleNotifications}
                disabled={notifLoading || !isPushSupported}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notificationsEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                } ${notifLoading ? 'opacity-50 cursor-wait' : ''}`}
                aria-label="Toggle Daily Notifications"
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* If Notifications are enabled on account but not yet permitted on this phone */}
            {notificationsEnabled && !deviceSubscribed && notifPermission !== 'denied' && (
              <div className="mt-3.5 p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/30 animate-in fade-in">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-amber-900 dark:text-amber-200 font-heading">
                      Enable Lock-Screen Alerts
                    </p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium mt-0.5">
                      Tap below to grant mobile permission for live gold alerts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleEnableOnDevice}
                    disabled={notifLoading}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black uppercase tracking-wider font-heading hover:brightness-110 active:scale-95 transition-all shrink-0 cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    {notifLoading ? 'Enabling...' : 'Allow Now'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                  📱 <strong>iPhone users:</strong> Tap Safari Share ➔ "Add to Home Screen" first to allow Web Push.
                </p>
              </div>
            )}

            {/* Permission Blocked Warning */}
            {notifPermission === 'denied' && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
                <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Push notifications are blocked in your browser settings. Tap the lock/tune icon near your browser URL bar to allow notifications for this site.
                </span>
              </div>
            )}


          </div>
        </div>
      </div>

      {/* 6. Lock & Logout */}
      <div className="pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-rose-50/50 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-[var(--loss-red)] dark:text-rose-400 border border-[var(--loss-red)]/20 dark:border-slate-700 hover:border-[var(--loss-red)]/40 dark:hover:border-rose-500/30 py-4 rounded-2xl font-bold transition-all cursor-pointer font-heading"
        >
          <FiLogOut className="w-4 h-4" />
          <span>Lock Vault & Logout</span>
        </button>
      </div>

      {/* Change Mobile Modal */}
      {showMobileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card)] dark:bg-slate-900 w-full max-w-sm rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden animate-in slide-in-from-bottom-4 duration-300 border border-[var(--border-color)] dark:border-slate-800">
            <div className="px-6 py-5 border-b border-[var(--border-color)] dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-[var(--text-primary)] dark:text-white font-heading">
                Change Mobile
              </h3>
              <button 
                onClick={() => { setShowMobileModal(false); setMobileStep(1); setNewMobile(''); setMobileOtp(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-subtle)] dark:bg-slate-800 text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-slate-300 transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6">
              {mobileStep === 1 ? (
                <form onSubmit={handleRequestChangeMobile} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-500 ml-1">New Mobile Number</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <FiPhone className="w-4 h-4 text-slate-400" />
                        <span className="text-[var(--text-secondary)] dark:text-slate-500 font-bold text-sm">+91</span>
                        <div className="w-px h-4 bg-[var(--border-color)] dark:bg-slate-700 ml-1"></div>
                      </div>
                      <input
                        type="tel"
                        value={newMobile}
                        onChange={(e) => setNewMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="Enter 10-digit number"
                        maxLength="10"
                        className="w-full pl-[88px] pr-4 py-3.5 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[var(--border-glow)] dark:focus:ring-amber-500/20 focus:border-[var(--text-gold)] dark:focus:border-amber-500 outline-none transition-all text-sm font-bold tracking-wide text-[var(--text-primary)] dark:text-white placeholder:font-medium placeholder:text-slate-400 placeholder:tracking-normal"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={mobileLoading || newMobile.length !== 10}
                    className="w-full bg-[var(--gold-2)] dark:bg-white text-[var(--text-primary)] dark:text-slate-900 py-3.5 rounded-xl font-bold text-sm hover:-translate-y-0.5 disabled:opacity-50 transition-all font-heading"
                  >
                    {mobileLoading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyChangeMobile} className="space-y-5">
                  <p className="text-sm text-[var(--text-secondary)] dark:text-slate-400 text-center leading-relaxed">
                    Enter the 4-digit OTP sent to <br/>
                    <span className="font-bold text-[var(--text-primary)] dark:text-white">+91 {newMobile}</span>
                  </p>
                  <div className="flex justify-center gap-3">
                    {[...Array(4)].map((_, i) => (
                      <input
                        key={`mobile-otp-${i}`}
                        type="text"
                        maxLength="1"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={mobileOtp[i] || ''}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
                          if (pasteData) {
                            setMobileOtp(pasteData);
                          }
                        }}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          const newOtp = mobileOtp.split('');
                          newOtp[i] = val.slice(-1);
                          setMobileOtp(newOtp.join('').slice(0, 4));
                          if (val && e.target.nextElementSibling) {
                            e.target.nextElementSibling.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !mobileOtp[i] && e.target.previousElementSibling) {
                            e.target.previousElementSibling.focus();
                          }
                        }}
                        className="w-14 h-16 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-[var(--border-glow)] dark:focus:ring-amber-500/20 focus:border-[var(--text-gold)] dark:focus:border-amber-500 outline-none transition-all text-2xl font-black text-[var(--text-primary)] dark:text-white text-center shadow-inner"
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold pt-1">
                    <button
                      type="button"
                      onClick={() => { setMobileStep(1); setMobileOtp(''); }}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-slate-400 dark:hover:text-white transition-colors"
                    >
                      Change Number
                    </button>
                    <button
                      type="button"
                      onClick={handleResendChangeMobile}
                      disabled={mobileCooldown > 0 || mobileLoading}
                      className="text-[var(--text-gold)] dark:text-amber-400 disabled:text-[var(--text-muted)] dark:disabled:text-slate-500 transition-colors"
                    >
                      {mobileCooldown > 0 ? `Resend OTP in 00:${mobileCooldown.toString().padStart(2, '0')}` : 'Resend OTP'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={mobileLoading || mobileOtp.length !== 4}
                    className="w-full bg-[var(--gold-2)] dark:bg-gradient-to-r dark:from-amber-500 dark:to-amber-600 text-[var(--text-primary)] dark:text-white py-3.5 rounded-xl font-bold text-sm hover:-translate-y-0.5 disabled:opacity-50 transition-all font-heading"
                  >
                    {mobileLoading ? 'Verifying...' : 'Verify & Update'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal (Direct Update - No OTP needed) */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card)] dark:bg-slate-900 w-full max-w-sm rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden animate-in slide-in-from-bottom-4 duration-300 border border-[var(--border-color)] dark:border-slate-800">
            <div className="px-6 py-5 border-b border-[var(--border-color)] dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-[var(--text-primary)] dark:text-white font-heading">
                Edit Profile
              </h3>
              <button 
                onClick={() => setShowEditProfileModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-subtle)] dark:bg-slate-800 text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-slate-300 transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-500 ml-1">Username</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-4 py-3.5 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[var(--border-glow)] dark:focus:ring-amber-500/20 focus:border-[var(--text-gold)] dark:focus:border-amber-500 outline-none transition-all text-sm font-bold text-[var(--text-primary)] dark:text-white placeholder:font-medium placeholder:text-slate-400"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-500 ml-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3.5 bg-[var(--bg-subtle)] dark:bg-slate-950/50 border border-[var(--border-color)] dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[var(--border-glow)] dark:focus:ring-amber-500/20 focus:border-[var(--text-gold)] dark:focus:border-amber-500 outline-none transition-all text-sm font-bold text-[var(--text-primary)] dark:text-white placeholder:font-medium placeholder:text-slate-400"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditProfileModal(false)}
                    className="flex-1 py-3.5 rounded-xl bg-[var(--bg-subtle)] dark:bg-slate-800 text-[var(--text-secondary)] dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-heading"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading || !editUsername.trim()}
                    className="flex-1 bg-[var(--gold-2)] dark:bg-white text-[var(--text-primary)] dark:text-slate-900 py-3.5 rounded-xl font-bold text-sm hover:-translate-y-0.5 disabled:opacity-50 transition-all font-heading shadow-md"
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Terms & Conditions Modal */}
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />

    </div>
  );
};

export default Profile;
