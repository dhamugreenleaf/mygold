import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getAdminDashboard,
  getAdminUsers,
  getAdminUser,
  updateAdminUserStatus,
  deleteAdminUser,
  updateAdminPricing,
  getAdminAuditLogs,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatReadableDate } from '../utils/formatters';
import { downloadAuditLogsPdf } from '../utils/auditPdfGenerator';
import {
  FiUsers,
  FiDollarSign,
  FiSearch,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiTrash2,
  FiRefreshCw,
  FiEdit3,
  FiShield,
  FiChevronLeft,
  FiChevronRight,
  FiPhone,
  FiClock,
  FiAlertTriangle,
  FiX,
  FiAward,
  FiActivity,
  FiDownload,
} from 'react-icons/fi';
import { GiGoldBar } from 'react-icons/gi';
import toast from 'react-hot-toast';

export const AdminDashboard = () => {
  const { user: currentAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    tabFromUrl && ['overview', 'users', 'audit'].includes(tabFromUrl) ? tabFromUrl : 'overview'
  );

  // Dashboard Stats State
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // User Management State
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 8, totalPages: 1 });
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVersion, setFilterVersion] = useState('all'); // 'all' | 'paid' | 'free'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'inactive'

  // Selected User for Details Modal
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

  // User Status Confirmation Modal
  const [statusConfirmModal, setStatusConfirmModal] = useState({
    isOpen: false,
    user: null,
    targetStatus: false,
    loading: false,
  });

  // User Deletion Confirmation Modal
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    user: null,
    loading: false,
  });

  // Price Edit Modal State
  const [priceModal, setPriceModal] = useState({
    isOpen: false,
    newPrice: '',
    loading: false,
    error: '',
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Listen for Price Editor trigger from bottom navigation
  useEffect(() => {
    const handleOpen = () => {
      setPriceModal({
        isOpen: true,
        newPrice: String(stats?.pricing?.currentPaidPrice || 999),
        loading: false,
        error: '',
      });
    };
    window.addEventListener('admin:open-price-editor', handleOpen);
    return () => window.removeEventListener('admin:open-price-editor', handleOpen);
  }, [stats]);

  // Sync tab if URL changes (e.g. from bottom navigation)
  useEffect(() => {
    if (tabFromUrl && ['overview', 'users', 'audit'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const switchTab = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // ==========================================
  // 1. Fetch Dashboard Stats
  // ==========================================
  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await getAdminDashboard();
      if (res?.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // ==========================================
  // 2. Fetch Users with Search & Filter
  // ==========================================
  const fetchUsers = useCallback(
    async (pageToLoad = 1) => {
      try {
        setLoadingUsers(true);
        const params = {
          page: pageToLoad,
          limit: pagination.limit,
          search: searchQuery,
          version: filterVersion,
          status: filterStatus,
        };

        const res = await getAdminUsers(params);
        if (res?.data) {
          setUsers(res.data.users || []);
          setPagination(res.data.pagination || { total: 0, page: 1, limit: 8, totalPages: 1 });
        }
      } catch (err) {
        console.error('Failed to fetch admin users:', err);
      } finally {
        setLoadingUsers(false);
      }
    },
    [pagination.limit, searchQuery, filterVersion, filterStatus]
  );

  // ==========================================
  // 3. Fetch Audit Logs
  // ==========================================
  const fetchLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const res = await getAdminAuditLogs({ limit: 25 });
      if (res?.data) {
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchDashboardStats();
    fetchUsers(1);
    fetchLogs();
  }, [fetchDashboardStats, fetchUsers, fetchLogs]);

  // Debounced Search & Filter trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, filterVersion, filterStatus, fetchUsers]);

  // Manual Refresh Handler
  const handleManualRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardStats(), fetchUsers(pagination.page), fetchLogs()]);
    setTimeout(() => setRefreshing(false), 400);
    toast.success('Admin data synchronized.');
  };

  // Open User Details
  const handleViewUser = async (userId) => {
    setSelectedUserId(userId);
    setLoadingUserDetails(true);
    try {
      const res = await getAdminUser(userId);
      if (res?.data) {
        setSelectedUserDetails(res.data);
      }
    } catch (err) {
      toast.error('Unable to load user details.');
      setSelectedUserId(null);
    } finally {
      setLoadingUserDetails(false);
    }
  };

  // Open User Status Confirmation Modal
  const openStatusConfirmation = (user, targetStatus) => {
    setStatusConfirmModal({
      isOpen: true,
      user,
      targetStatus,
      loading: false,
    });
  };

  // Confirm and Execute User Status Change
  const handleConfirmStatusChange = async () => {
    if (!statusConfirmModal.user) return;
    setStatusConfirmModal((prev) => ({ ...prev, loading: true }));

    try {
      await updateAdminUserStatus(statusConfirmModal.user.id, {
        is_active: statusConfirmModal.targetStatus,
        reason: `Status changed by ${currentAdmin?.username || 'Admin'}`,
      });

      toast.success(
        `User ${statusConfirmModal.user.username} is now ${
          statusConfirmModal.targetStatus ? 'Active' : 'Inactive'
        }.`
      );

      setStatusConfirmModal({ isOpen: false, user: null, targetStatus: false, loading: false });
      fetchUsers(pagination.page);
      fetchDashboardStats();
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user status.');
      setStatusConfirmModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Open User Deletion Confirmation Modal
  const openDeleteConfirmation = (user) => {
    setDeleteConfirmModal({
      isOpen: true,
      user,
      loading: false,
    });
  };

  // Confirm and Execute Permanent User Deletion
  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal.user) return;
    setDeleteConfirmModal((prev) => ({ ...prev, loading: true }));

    try {
      await deleteAdminUser(deleteConfirmModal.user.id);
      toast.success(`User '${deleteConfirmModal.user.username}' was permanently deleted.`);
      setDeleteConfirmModal({ isOpen: false, user: null, loading: false });
      if (selectedUserId === deleteConfirmModal.user.id) {
        setSelectedUserId(null);
      }
      fetchUsers(pagination.page);
      fetchDashboardStats();
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user.');
      setDeleteConfirmModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Open Price Editor Modal
  const openPriceEditor = () => {
    setPriceModal({
      isOpen: true,
      newPrice: String(stats?.pricing?.currentPaidPrice || 999),
      loading: false,
      error: '',
    });
  };

  // Save Price
  const handleSavePrice = async () => {
    const rawPrice = String(priceModal.newPrice ?? '').trim();
    const numPrice = parseFloat(rawPrice);

    if (!rawPrice || isNaN(numPrice) || numPrice <= 0) {
      setPriceModal((prev) => ({
        ...prev,
        error: 'Please enter a valid numeric price greater than 0.',
      }));
      return;
    }

    setPriceModal((prev) => ({ ...prev, loading: true, error: '' }));

    try {
      await updateAdminPricing({
        price: numPrice,
        reason: `Updated to ₹${numPrice} by ${currentAdmin?.username || 'Admin'}`,
      });

      toast.success(`Paid version price set to ₹${numPrice.toLocaleString('en-IN')}`);
      setPriceModal({ isOpen: false, newPrice: '', loading: false, error: '' });
      fetchDashboardStats();
      fetchLogs();
    } catch (err) {
      setPriceModal((prev) => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || 'Failed to update price.',
      }));
    }
  };

  // Download Audit Logs PDF Report
  const handleDownloadPdf = () => {
    if (!auditLogs || auditLogs.length === 0) {
      toast.error('No audit records available to export.');
      return;
    }
    try {
      toast.loading('Generating Audit PDF Report...', { id: 'pdf-gen' });
      downloadAuditLogsPdf(auditLogs, currentAdmin);
      toast.success('Audit Report PDF downloaded! 📄', { id: 'pdf-gen' });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      toast.error('Failed to generate PDF report.', { id: 'pdf-gen' });
    }
  };

  const totalUsers = stats?.users?.total || 0;
  const paidUsers = stats?.users?.paid || 0;
  const freeUsers = stats?.users?.free || 0;
  const activeUsers = stats?.users?.active || 0;
  const paidPercentage = stats?.users?.paidPercentage || 0;
  const totalRevenue = stats?.payments?.totalRevenue || 0;
  const subRevenue = stats?.payments?.subscriptionRevenue || 0;
  const oneTimeRevenue = stats?.payments?.oneTimeRevenue || 0;
  const activeSubs = stats?.subscriptions?.active || 0;
  const cancelledSubs = stats?.subscriptions?.cancelled || 0;
  const currentPrice = stats?.pricing?.currentPaidPrice || 10;

  return (
    <div className="space-y-4 pb-24 animate-fade-in max-w-lg mx-auto px-4 mt-2">
      
      {/* 1. Header (Matches Home & User panel) */}
      <div className="flex justify-between items-center px-1">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-heading uppercase tracking-wider">
              <FiShield className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Admin Portal</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)] dark:text-white font-heading">
            Admin Dashboard
          </h1>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing || loadingStats}
          aria-label="Refresh admin data"
          className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-50 dark:bg-[var(--bg-subtle)] border border-transparent dark:border-slate-800/50 shadow-sm text-slate-600 dark:text-slate-400 transition-all active:scale-95 hover:text-[var(--text-gold)] cursor-pointer"
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[var(--text-gold)]' : ''}`} />
        </button>
      </div>

      {/* 2. Hero Metric: Total Revenue */}
      <div className="px-2 text-center space-y-1 mt-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] dark:text-slate-400">
          Total Revenue Collected
        </p>
        {loadingStats ? (
          <div className="h-12 w-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg mx-auto" />
        ) : (
          <h2 className="text-4xl sm:text-5xl font-black tabular-nums tracking-tighter text-gold-gradient py-1 font-heading">
            {formatCurrency(totalRevenue)}
          </h2>
        )}
        <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold font-heading">
            AutoPay Subscriptions: {formatCurrency(subRevenue)}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold font-heading">
            One-Time: {formatCurrency(oneTimeRevenue)}
          </span>
        </div>
      </div>

      {/* 3. Key Metrics 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Users */}
        <div className="bg-[var(--bg-card)] dark:bg-slate-900/60 rounded-2xl p-3.5 flex items-center justify-between border border-[var(--border-color)] dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-base">
              <FiUsers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-secondary)] dark:text-slate-400">Total Users</p>
              <p className="text-base font-black text-[var(--text-primary)] dark:text-white tabular-nums font-heading">
                {loadingStats ? '—' : totalUsers}
              </p>
            </div>
          </div>
        </div>

        {/* Active AutoPay Subscriptions */}
        <div className="bg-[var(--bg-card)] dark:bg-slate-900/60 rounded-2xl p-3.5 flex items-center justify-between border border-amber-500/25 dark:border-amber-500/20 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-base">
              <FiAward className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Active Subs</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-base font-black text-[var(--text-primary)] dark:text-white tabular-nums font-heading">
                  {loadingStats ? '—' : activeSubs}
                </p>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">({paidPercentage}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Accounts */}
        <div className="bg-[var(--bg-card)] dark:bg-slate-900/60 rounded-2xl p-3.5 flex items-center justify-between border border-emerald-500/20 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base">
              <FiActivity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Active Logins</p>
              <p className="text-base font-black text-[var(--text-primary)] dark:text-white tabular-nums font-heading">
                {loadingStats ? '—' : activeUsers}
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Plan Price */}
        <div 
          onClick={openPriceEditor}
          className="bg-[var(--bg-card)] dark:bg-slate-900/60 rounded-2xl p-3.5 flex items-center justify-between border border-[var(--border-color)] dark:border-slate-800/80 shadow-xs cursor-pointer hover:border-amber-400 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-base group-hover:scale-105 transition-transform">
              <FiDollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-secondary)] dark:text-slate-400">Monthly Price</p>
              <p className="text-base font-black text-[var(--text-primary)] dark:text-white tabular-nums font-heading">
                ₹{currentPrice}/mo
              </p>
            </div>
          </div>
          <FiEdit3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors" />
        </div>
      </div>

      {/* 4. Action Button (Edit Paid Price) */}
      <div>
        <button 
          type="button"
          onClick={openPriceEditor}
          className="w-full flex justify-center items-center gap-2 py-3.5 rounded-2xl bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 font-bold text-sm shadow-[0_4px_14px_rgba(217,154,0,0.3)] active:scale-[0.98] transition-transform cursor-pointer font-heading"
        >
          <FiEdit3 className="w-4 h-4 stroke-[2.5]" />
          <span>Edit Paid Version Price (₹{currentPrice})</span>
        </button>
      </div>

      {/* 5. Clean Segmented Navigation Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-900/70 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => switchTab('overview')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-heading transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-gold-metallic text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiActivity className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('users')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-heading transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'users'
              ? 'bg-gold-metallic text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiUsers className="w-3.5 h-3.5" />
          <span>Users ({totalUsers})</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('audit')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-heading transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-gold-metallic text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiClock className="w-3.5 h-3.5" />
          <span>Audit Logs</span>
        </button>
      </div>

      {/* =========================================================
          TAB 1: OVERVIEW SUMMARY
          ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Plan Distribution Breakdown */}
          <div className="bg-[var(--bg-card)] dark:bg-slate-900/60 rounded-2xl p-4 border border-[var(--border-color)] dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-[var(--text-primary)] dark:text-white font-heading">
                Customer Plan Distribution
              </h3>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-heading">
                {totalUsers} Total Accounts
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${paidPercentage}%` }}
                className="bg-gold-metallic h-full rounded-full transition-all duration-500"
                title={`Paid Users: ${paidPercentage}%`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">Paid Version</p>
                <p className="text-lg font-black text-amber-700 dark:text-amber-400 font-heading mt-0.5">
                  {paidUsers} <span className="text-xs font-medium opacity-80">({paidPercentage}%)</span>
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Free Version</p>
                <p className="text-lg font-black text-slate-800 dark:text-slate-200 font-heading mt-0.5">
                  {freeUsers} <span className="text-xs font-medium opacity-80">({100 - paidPercentage}%)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Quick Price Manager Card */}
          <div className="bg-[var(--bg-card)] dark:bg-slate-900/60 rounded-2xl p-4 border border-[var(--border-color)] dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-heading">
                Paid Version Pricing
              </span>
              <p className="text-xl font-black text-[var(--text-primary)] dark:text-white font-heading">
                ₹{currentPrice} <span className="text-xs font-medium text-slate-400">/ upgrade</span>
              </p>
            </div>
            <button
              type="button"
              onClick={openPriceEditor}
              className="px-4 py-2 rounded-xl bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 font-bold text-xs font-heading shadow-xs cursor-pointer active:scale-95 transition-transform"
            >
              Modify
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: USER MANAGEMENT (Clean Mobile Cards)
          ========================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          
          {/* Search Input */}
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-9 py-2.5 bg-[var(--bg-card)] dark:bg-slate-900/60 border border-[var(--border-color)] dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium text-[var(--text-primary)] dark:text-white focus:outline-none focus:border-amber-500 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'paid', label: 'Paid Only' },
              { id: 'free', label: 'Free Only' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterVersion(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-heading transition-all whitespace-nowrap cursor-pointer ${
                  filterVersion === f.id
                    ? 'bg-gold-metallic text-slate-950 shadow-xs'
                    : 'bg-[var(--bg-card)] dark:bg-slate-900/60 border border-[var(--border-color)] dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setFilterStatus(filterStatus === 'all' ? 'inactive' : 'all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-heading transition-all whitespace-nowrap cursor-pointer ${
                filterStatus === 'inactive'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-[var(--bg-card)] dark:bg-slate-900/60 border border-[var(--border-color)] dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {filterStatus === 'inactive' ? 'Showing Inactive' : 'Inactive'}
            </button>
          </div>

          {/* User List Cards */}
          <div className="space-y-2">
            {loadingUsers ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[var(--bg-card)] dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 animate-pulse flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    <div className="space-y-1.5">
                      <div className="w-24 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
                      <div className="w-36 h-2 bg-slate-200 dark:bg-slate-800 rounded" />
                    </div>
                  </div>
                </div>
              ))
            ) : users.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[var(--bg-card)] dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-400 font-medium">No customer accounts matched your search.</p>
              </div>
            ) : (
              users.map((item) => {
                const isPaid = item.plan === 'paid';
                const isActive = item.is_active;
                const isAdmin = item.role === 'admin';

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[var(--bg-card)] dark:bg-slate-900/60 border border-[var(--border-color)] dark:border-slate-800 shadow-xs hover:border-amber-400/40 transition-all flex items-center justify-between gap-3"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-gold-metallic text-slate-950 flex items-center justify-center font-black text-sm font-heading shadow-xs">
                          {item.username.charAt(0).toUpperCase()}
                        </div>
                        {isAdmin && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px]">
                            ★
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-[var(--text-primary)] dark:text-white font-heading truncate max-w-[130px] sm:max-w-[180px]">
                            {item.username}
                          </h4>
                          {isPaid ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-heading">
                              PAID
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 font-heading">
                              FREE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                          {item.email}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* View Details */}
                      <button
                        type="button"
                        onClick={() => handleViewUser(item.id)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-600 transition-colors cursor-pointer"
                        title="View profile"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>

                      {/* Toggle Active / Inactive */}
                      <button
                        type="button"
                        disabled={item.id === currentAdmin?.id}
                        onClick={() => openStatusConfirmation(item, !isActive)}
                        className={`p-2 rounded-xl transition-all cursor-pointer disabled:opacity-30 ${
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-rose-500/15 hover:text-rose-600'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-emerald-500/15 hover:text-emerald-600'
                        }`}
                        title={
                          item.id === currentAdmin?.id
                            ? 'Cannot deactivate admin'
                            : isActive
                            ? 'Active (click to deactivate)'
                            : 'Inactive (click to activate)'
                        }
                      >
                        {isActive ? <FiCheckCircle className="w-4 h-4" /> : <FiXCircle className="w-4 h-4" />}
                      </button>

                      {/* Delete User */}
                      <button
                        type="button"
                        disabled={item.id === currentAdmin?.id || isAdmin}
                        onClick={() => openDeleteConfirmation(item)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/15 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
                        title={
                          item.id === currentAdmin?.id || isAdmin
                            ? 'Cannot delete admin'
                            : 'Delete user permanently'
                        }
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Simple Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 px-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || loadingUsers}
                  onClick={() => fetchUsers(pagination.page - 1)}
                  className="p-2 rounded-xl bg-[var(--bg-card)] dark:bg-slate-900 border border-[var(--border-color)] dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages || loadingUsers}
                  onClick={() => fetchUsers(pagination.page + 1)}
                  className="p-2 rounded-xl bg-[var(--bg-card)] dark:bg-slate-900 border border-[var(--border-color)] dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 3: AUDIT LOGS
          ========================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <div className="flex justify-between items-center px-1 pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-heading">
              Recent Activity Logs ({auditLogs.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={loadingLogs || auditLogs.length === 0}
                className="px-3 py-1.5 rounded-xl bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 text-xs font-bold font-heading flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-transform disabled:opacity-40"
                title="Download audit logs as PDF"
              >
                <FiDownload className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Export PDF</span>
              </button>
              <button
                type="button"
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="p-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Refresh audit logs"
              >
                <FiRefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin text-amber-500' : ''}`} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {loadingLogs ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading audit logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[var(--bg-card)] dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-400">No activity records logged yet.</p>
              </div>
            ) : (
              auditLogs.slice(0, 15).map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-[var(--bg-card)] dark:bg-slate-900/60 border border-[var(--border-color)] dark:border-slate-800 shadow-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatReadableDate(log.created_at)}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[var(--text-primary)] dark:text-white font-heading">
                    {log.description || log.action}
                  </p>
                  {(log.old_value || log.new_value) && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {log.old_value && <span className="line-through text-rose-500 mr-1">{log.old_value}</span>}
                      {log.new_value && <span className="text-emerald-600 font-bold">{log.new_value}</span>}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 1: USER DETAILS MODAL
          ========================================================= */}
      {selectedUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedUserId(null)}
        >
          <div
            className="relative w-full max-w-md bg-[var(--bg-card)] dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-[var(--border-color)] dark:border-amber-500/25 p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedUserId(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl"
            >
              <FiX className="w-5 h-5" />
            </button>

            {loadingUserDetails ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-400 rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold font-heading">Loading User Profile...</p>
              </div>
            ) : selectedUserDetails ? (
              <div className="space-y-4">
                {/* Header Profile */}
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gold-metallic text-slate-950 flex items-center justify-center font-heading font-black text-lg shadow-sm">
                    {selectedUserDetails.user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[var(--text-primary)] dark:text-white font-heading">
                      {selectedUserDetails.user.username}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{selectedUserDetails.user.email}</p>
                  </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block font-heading uppercase">Plan</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {selectedUserDetails.user.plan === 'paid' ? 'Premium Monthly' : 'Free Plan'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block font-heading uppercase">AutoPay Status</span>
                    <span className={`font-bold ${
                      selectedUserDetails.user.subscription_status === 'active'
                        ? 'text-emerald-600'
                        : selectedUserDetails.user.subscription_status === 'paused'
                          ? 'text-amber-600'
                          : selectedUserDetails.user.subscription_status === 'cancelled'
                            ? 'text-rose-500'
                            : 'text-slate-500'
                    }`}>
                      {selectedUserDetails.user.subscription_status === 'active'
                        ? 'AutoPay: ON'
                        : selectedUserDetails.user.subscription_status === 'paused'
                          ? 'AutoPay: PAUSED'
                          : selectedUserDetails.user.subscription_status === 'cancelled'
                            ? 'AutoPay: CANCELLED'
                            : 'Free (No AutoPay)'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block font-heading uppercase">Phone</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedUserDetails.user.phone || '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block font-heading uppercase">City</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedUserDetails.user.preferred_city || 'Salem'}, {selectedUserDetails.user.preferred_state || 'Tamil Nadu'}
                    </span>
                  </div>
                </div>

                {/* Subscription Period & ID if present */}
                {selectedUserDetails.user.razorpay_subscription_id && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold">Subscription ID:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {selectedUserDetails.user.razorpay_subscription_id}
                      </span>
                    </div>
                    {selectedUserDetails.user.current_period_end && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Billing Cycle End:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {formatReadableDate(selectedUserDetails.user.current_period_end)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Portfolio Summary */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex justify-between items-center">
                  <span className="font-bold text-amber-700 dark:text-amber-400 font-heading">Total Holdings:</span>
                  <span className="font-black text-amber-700 dark:text-amber-400 font-heading text-sm">
                    {selectedUserDetails.purchases?.length || 0} Assets Saved
                  </span>
                </div>

                {/* Account Management Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={selectedUserDetails.user.id === currentAdmin?.id}
                    onClick={() => {
                      const userObj = users.find((u) => u.id === selectedUserDetails.user.id) || selectedUserDetails.user;
                      openStatusConfirmation(userObj, !selectedUserDetails.user.is_active);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold font-heading flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 ${
                      selectedUserDetails.user.is_active
                        ? 'bg-rose-500/15 text-rose-600 hover:bg-rose-500/25'
                        : 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25'
                    }`}
                  >
                    {selectedUserDetails.user.is_active ? (
                      <>
                        <FiXCircle className="w-4 h-4" />
                        <span>Deactivate</span>
                      </>
                    ) : (
                      <>
                        <FiCheckCircle className="w-4 h-4" />
                        <span>Activate</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={selectedUserDetails.user.id === currentAdmin?.id || selectedUserDetails.user.role === 'admin'}
                    onClick={() => {
                      const userObj = users.find((u) => u.id === selectedUserDetails.user.id) || selectedUserDetails.user;
                      openDeleteConfirmation(userObj);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold font-heading flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    <span>Delete User</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: USER STATUS CONFIRMATION MODAL
          ========================================================= */}
      {statusConfirmModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            if (!statusConfirmModal.loading) {
              setStatusConfirmModal((prev) => ({ ...prev, isOpen: false }));
            }
          }}
        >
          <div
            className="relative w-full max-w-sm bg-[var(--bg-card)] dark:bg-slate-900 rounded-3xl shadow-2xl border border-[var(--border-color)] dark:border-slate-800 p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${
                statusConfirmModal.targetStatus
                  ? 'bg-emerald-500/15 text-emerald-600'
                  : 'bg-rose-500/15 text-rose-600'
              }`}
            >
              {statusConfirmModal.targetStatus ? (
                <FiCheckCircle className="w-6 h-6" />
              ) : (
                <FiAlertTriangle className="w-6 h-6" />
              )}
            </div>

            <div>
              <h3 className="text-base font-black text-[var(--text-primary)] dark:text-white font-heading">
                {statusConfirmModal.targetStatus ? 'Activate Account?' : 'Deactivate Account?'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {statusConfirmModal.targetStatus
                  ? `Allow ${statusConfirmModal.user?.username} to log in.`
                  : `Block ${statusConfirmModal.user?.username} from logging in.`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={statusConfirmModal.loading}
                onClick={() => setStatusConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold font-heading cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={statusConfirmModal.loading}
                onClick={handleConfirmStatusChange}
                className={`py-2.5 px-3 rounded-xl text-white text-xs font-bold font-heading cursor-pointer shadow-sm ${
                  statusConfirmModal.targetStatus ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {statusConfirmModal.loading ? 'Updating...' : statusConfirmModal.targetStatus ? 'Activate' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2.5: PERMANENT USER DELETION CONFIRMATION MODAL
          ========================================================= */}
      {deleteConfirmModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            if (!deleteConfirmModal.loading) {
              setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }));
            }
          }}
        >
          <div
            className="relative w-full max-w-sm bg-[var(--bg-card)] dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-500/30 p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-rose-500/15 text-rose-600 border border-rose-500/30">
              <FiTrash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-rose-600 dark:text-rose-400 font-heading">
                Permanently Delete User?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 font-medium">
                Are you sure you want to delete <strong className="text-[var(--text-primary)] dark:text-white">{deleteConfirmModal.user?.username}</strong>?
              </p>
              <div className="mt-2.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-700 dark:text-rose-300 font-medium text-left space-y-0.5">
                <p>⚠️ <strong>Warning:</strong></p>
                <p>• All physical metal purchases will be removed.</p>
                <p>• Uploaded invoices and photos will be deleted.</p>
                <p>• This action cannot be reversed.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={deleteConfirmModal.loading}
                onClick={() => setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold font-heading cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmModal.loading}
                onClick={handleConfirmDelete}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold font-heading cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {deleteConfirmModal.loading ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 3: EDIT PAID PRICING MODAL (1-Step Direct & Clean)
          ========================================================= */}
      {priceModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            if (!priceModal.loading) {
              setPriceModal({ isOpen: false, newPrice: '', loading: false, error: '' });
            }
          }}
        >
          <div
            className="relative w-full max-w-sm bg-[var(--bg-card)] dark:bg-slate-900 rounded-3xl shadow-2xl border border-[var(--border-color)] dark:border-amber-500/25 p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-sm">
              <FiDollarSign className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-[var(--text-primary)] dark:text-white font-heading">
                Edit Paid Version Price
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current active price: <strong className="text-amber-600 dark:text-amber-400 font-bold">₹{currentPrice}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1 font-heading uppercase">
                  New Price (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    autoFocus
                    value={priceModal.newPrice}
                    onChange={(e) =>
                      setPriceModal((prev) => ({
                        ...prev,
                        newPrice: e.target.value,
                        error: '',
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePrice();
                    }}
                    placeholder="Enter amount in ₹ (e.g. 999)"
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-base font-bold text-[var(--text-primary)] dark:text-white focus:outline-none focus:border-amber-500 font-heading"
                  />
                </div>
                {priceModal.error ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">{priceModal.error}</p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Customers upgrading via Razorpay will be charged this dynamic amount.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={priceModal.loading}
                onClick={() => setPriceModal({ isOpen: false, newPrice: '', loading: false, error: '' })}
                className="py-3 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold font-heading cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  priceModal.loading ||
                  !priceModal.newPrice ||
                  isNaN(Number(priceModal.newPrice)) ||
                  Number(priceModal.newPrice) <= 0
                }
                onClick={handleSavePrice}
                className="py-3 px-3 rounded-xl bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 text-xs font-bold font-heading shadow-sm cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-40 disabled:pointer-events-none border-none"
              >
                {priceModal.loading ? 'Saving...' : 'Save Price'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
