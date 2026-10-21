import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiBellOff,
  FiCheck,
  FiTrash2,
  FiX,
  FiTrendingUp,
  FiPieChart,
  FiInfo,
  FiSettings,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
} from 'react-icons/fi';
import { GiGoldBar } from 'react-icons/gi';
import { useNotification } from '../../context/NotificationContext';
import { formatRelativeTime } from '../../utils/formatters';

export const NotificationButton = () => {
  const [open, setOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const {
    notificationsEnabled,
    deviceSubscribed,
    permission,
    isSupported,
    loading,
    notifications,
    unreadCount,
    loadingNotifications,
    toggleNotifications,
    enableOnDevice,
    loadNotifications,
    markAllAsRead,
    markOneAsRead,
    clearAll,
  } = useNotification();

  // Close popover on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setShowClearConfirm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenPopover = () => {
    setOpen((prev) => !prev);
    setShowClearConfirm(false);
    if (!open) {
      loadNotifications();
    }
  };

  const handleNotificationClick = (item) => {
    if (!item.is_read) {
      markOneAsRead(item.id);
    }
    if (item.url && item.url !== '#') {
      setOpen(false);
      navigate(item.url);
    }
  };

  const handleConfirmClear = async () => {
    await clearAll();
    setShowClearConfirm(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'rate':
        return <FiTrendingUp className="w-3.5 h-3.5 text-amber-500" />;
      case 'portfolio':
        return <FiPieChart className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <GiGoldBar className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Bell Button with Badge */}
      <button
        type="button"
        onClick={handleOpenPopover}
        className={`relative p-2.5 rounded-xl border transition-all cursor-pointer shadow-xs group ${
          unreadCount > 0
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
            : notificationsEnabled
            ? 'bg-slate-100 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-500 hover:border-amber-400'
            : 'bg-slate-100 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-amber-500 hover:border-amber-400'
        }`}
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-label="User Notification Center"
        aria-expanded={open}
      >
        {notificationsEnabled ? (
          <FiBell className="w-4 h-4 text-slate-700 dark:text-slate-200 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:scale-110 transition-transform" />
        ) : (
          <FiBellOff className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:scale-110 transition-transform" />
        )}

        {/* Unread Count Badge */}
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[10px] font-black font-heading flex items-center justify-center shadow-md border-2 border-white dark:border-slate-950 animate-pulse leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : notificationsEnabled ? (
          /* Subtle Live Dot */
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        ) : null}
      </button>

      {/* Notification Center Dropdown Popover */}
      {open && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div 
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] sm:hidden" 
            onClick={() => setOpen(false)} 
          />

          <div className="fixed inset-x-3 top-20 sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:mt-2 sm:w-96 bg-white dark:bg-[#0b0f19] rounded-3xl sm:rounded-2xl border border-slate-200 dark:border-amber-500/25 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl overflow-hidden flex flex-col max-h-[82vh]">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <FiBell className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black font-heading text-slate-900 dark:text-white uppercase tracking-wider">
                    Live Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 font-heading">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Gold & Silver Market Broadcasts
                </p>
              </div>
            </div>

            {/* Actions: Mark All as Read | Clear All | Close */}
            <div className="flex items-center gap-1.5 text-[11px] font-heading">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-bold transition-colors cursor-pointer py-1 px-1.5 rounded-lg hover:bg-amber-500/10"
                  title="Mark all notifications as read"
                >
                  Mark all as read
                </button>
              )}

              {notifications.length > 0 && (
                <>
                  {unreadCount > 0 && (
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 font-semibold transition-colors cursor-pointer py-1 px-1.5 rounded-lg hover:bg-rose-500/10"
                    title="Clear all notifications"
                  >
                    Clear all
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
                aria-label="Close"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Clear All Confirmation Box */}
          {showClearConfirm && (
            <div className="p-3.5 bg-rose-500/10 dark:bg-rose-950/40 border-b border-rose-500/20 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <FiAlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white font-heading">
                    Clear all notifications?
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    This will remove all notifications from your notification center.
                  </p>
                  <div className="flex items-center gap-2 mt-2.5">
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold font-heading hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmClear}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold font-heading transition-colors cursor-pointer shadow-xs"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Device Activation Banner */}
          {!deviceSubscribed && isSupported && permission !== 'denied' && (
            <div className="p-3 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border-b border-amber-500/25 flex items-center justify-between gap-2.5 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">📲</span>
                <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200 truncate">
                  Get live rate alerts on this phone
                </p>
              </div>
              <button
                type="button"
                onClick={enableOnDevice}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[10px] font-black uppercase tracking-wider font-heading hover:brightness-110 active:scale-95 transition-all shrink-0 cursor-pointer shadow-xs"
              >
                {loading ? '...' : 'Allow'}
              </button>
            </div>
          )}

          {/* Notification List Scroll Area */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar">
            {notifications.length === 0 ? (
              /* Empty State */
              <div className="py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto mb-3 shadow-inner">
                  <FiBell className="w-5 h-5 text-amber-500/70" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-heading">
                  No notifications yet.
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[220px] mx-auto">
                  Receive daily live gold rate and portfolio updates.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.is_read;
                return (
                  <div
                    key={item.id || item.created_at}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 transition-colors cursor-pointer group flex items-start gap-3 ${
                      isUnread
                        ? 'bg-amber-500/[0.06] dark:bg-amber-500/[0.08] hover:bg-amber-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* Category Icon */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                        isUnread
                          ? 'bg-amber-500/15 border-amber-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      {getNotificationIcon(item.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs truncate font-heading ${
                            isUnread
                              ? 'font-black text-slate-900 dark:text-amber-300'
                              : 'font-semibold text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.title}
                        </h4>

                        {/* Unread indicator / Relative Time */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-xs"></span>
                          )}
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {formatRelativeTime(item.created_at || item.createdAt)}
                          </span>
                        </div>
                      </div>

                      <p
                        className={`text-[11px] mt-0.5 line-clamp-2 leading-relaxed ${
                          isUnread
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.message || item.body}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Quick Settings */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between gap-3">
            {/* Quick Toggle Push Preference */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleNotifications}
                disabled={loading || !isSupported}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notificationsEnabled
                    ? 'bg-amber-500'
                    : 'bg-slate-300 dark:bg-slate-700'
                } ${loading ? 'opacity-60 cursor-wait' : ''}`}
                aria-label="Toggle notifications"
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    notificationsEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 font-heading">
                {deviceSubscribed && notificationsEnabled
                  ? 'Push: Active'
                  : notificationsEnabled
                  ? 'Push: Action Needed'
                  : 'Push: Off'}
              </span>
            </div>

            {/* Profile Settings Link */}
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors font-heading"
            >
              <FiSettings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default NotificationButton;
