import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { darkTheme } from '../../constants/theme';
import useAuth from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { formatReadableDate } from '../../utils/formatters';
import profileService from '../../services/profileService';
import { getPurchases } from '../../services/portfolioService';
import OtpInput from '../../components/forms/OtpInput';
import TermsModal from '../../components/common/TermsModal';
import { LinearGradient } from 'expo-linear-gradient';
import { gradientPresets } from '../../constants/colors';

const MAX_FREE_ASSETS = 10;
const RESEND_COOLDOWN_SECONDS = 30;

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser, updateUser } = useAuth();
  const { t, language, setLanguage, isTamil } = useLanguage();

  // Screen Data State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assetCount, setAssetCount] = useState(0);
  const [entitlement, setEntitlement] = useState(null);

  // Notification Preference State
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifTesting, setNotifTesting] = useState(false);

  // Terms Modal State
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Upgrade Info Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Edit Profile Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStep, setEditStep] = useState(1); // 1: Input, 2: OTP
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editOtp, setEditOtp] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editCooldown, setEditCooldown] = useState(0);

  // Change Mobile Modal State
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [mobileStep, setMobileStep] = useState(1); // 1: Input, 2: OTP
  const [newMobile, setNewMobile] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileLoading, setMobileLoading] = useState(false);
  const [mobileError, setMobileError] = useState(null);
  const [mobileCooldown, setMobileCooldown] = useState(0);

  // Manage Subscription Modal & Confirmations
  const [showSubModal, setShowSubModal] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [subActionLoading, setSubActionLoading] = useState(false);

  // Timer references for countdowns
  const editTimerRef = useRef(null);
  const mobileTimerRef = useRef(null);

  // Edit Profile Cooldown Countdown
  useEffect(() => {
    if (editCooldown > 0) {
      editTimerRef.current = setTimeout(() => {
        setEditCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(editTimerRef.current);
  }, [editCooldown]);

  // Mobile Cooldown Countdown
  useEffect(() => {
    if (mobileCooldown > 0) {
      mobileTimerRef.current = setTimeout(() => {
        setMobileCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(mobileTimerRef.current);
  }, [mobileCooldown]);

  // Load screen data
  const loadProfileData = useCallback(async () => {
    try {
      const [userRes, assetsRes, entRes, notifRes] = await Promise.allSettled([
        profileService.getProfile(),
        getPurchases(),
        profileService.getSubscriptionStatus(),
        profileService.getNotificationStatus(),
      ]);

      if (userRes.status === 'fulfilled' && userRes.value?.data?.user) {
        updateUser(userRes.value.data.user);
      }

      if (assetsRes.status === 'fulfilled') {
        const list = assetsRes.value?.data?.purchases || assetsRes.value?.purchases || [];
        setAssetCount(list.length);
      }

      if (entRes.status === 'fulfilled' && entRes.value?.data) {
        setEntitlement(entRes.value.data);
      }

      if (notifRes.status === 'fulfilled' && notifRes.value?.data) {
        setNotificationsEnabled(Boolean(notifRes.value.data.notifications_enabled));
      }
    } catch (err) {
      console.warn('Failed to fetch profile details:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [updateUser]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfileData();
  }, [loadProfileData]);

  // Avatar Initials
  const getInitials = (name) => {
    const str = String(name || '').trim();
    if (!str) return 'G';
    const parts = str.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  // Plan & Entitlement Derived Values
  const isPaid =
    entitlement?.status === 'PAID' ||
    user?.plan === 'paid' ||
    user?.subscription_status === 'active' ||
    user?.role === 'admin';

  const isPaused = user?.subscription_status === 'paused';
  const isCancelled = user?.subscription_status === 'cancelled' || Boolean(user?.cancelled_at);

  const entriesUsed = entitlement?.entriesUsed ?? (user?.free_entries_used || assetCount);
  const remainingEntries = Math.max(MAX_FREE_ASSETS - entriesUsed, 0);
  const progressPercent = !isPaid
    ? Math.min((entriesUsed / MAX_FREE_ASSETS) * 100, 100)
    : 100;

  const currentPeriodStart = user?.current_period_start || entitlement?.currentPeriodStart;
  const currentPeriodEnd =
    user?.current_period_end ||
    user?.subscription_expires_at ||
    entitlement?.currentPeriodEnd;

  // Plan Badge Text
  const planBadgeText = isPaid
    ? isPaused
      ? t('autoPayPaused')
      : isCancelled
      ? t('cancellationScheduled')
      : t('activePremium')
    : t('freeTier');

  // ==========================================
  // EDIT PROFILE LOGIC
  // ==========================================
  const openEditModal = () => {
    setEditUsername(user?.username || user?.name || '');
    setEditEmail(user?.email || '');
    setEditOtp('');
    setEditError(null);
    setEditStep(1);
    setEditCooldown(0);
    setShowEditModal(true);
  };

  const handleRequestEditOtp = async () => {
    setEditError(null);
    const trimmedUsername = editUsername.trim();
    const trimmedEmail = editEmail.trim();

    if (!trimmedUsername) {
      setEditError('Username cannot be empty.');
      return;
    }

    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      setEditError('Username must be between 3 and 50 characters.');
      return;
    }

    if (!/^[a-zA-Z\s]+$/.test(trimmedUsername)) {
      setEditError('Username can only contain letters and spaces.');
      return;
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEditError('Please enter a valid email address.');
      return;
    }

    // Check if nothing changed
    const currentName = user?.username || user?.name || '';
    const currentMail = user?.email || '';
    if (trimmedUsername === currentName && trimmedEmail === currentMail) {
      setEditError('No changes detected. Update values before saving.');
      return;
    }

    // User must have phone number to receive OTP
    if (!user?.phone) {
      setEditError(
        'Please add a mobile number to your account before updating your profile.'
      );
      return;
    }

    try {
      setEditLoading(true);
      const res = await profileService.requestProfileUpdateOtp({
        username: trimmedUsername,
        email: trimmedEmail || undefined,
      });

      if (res.success) {
        setEditStep(2);
        setEditCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setEditError(res.message || 'Failed to request OTP');
      }
    } catch (err) {
      setEditError(err.message || 'Failed to request OTP. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleVerifyEditOtp = async () => {
    setEditError(null);
    if (!editOtp || editOtp.length !== 6) {
      setEditError('Please enter the complete 6-digit OTP code.');
      return;
    }

    try {
      setEditLoading(true);
      const res = await profileService.verifyProfileUpdateOtp(editOtp);
      if (res.success) {
        if (res.data?.user) {
          await updateUser(res.data.user);
        } else {
          await refreshUser();
        }
        setShowEditModal(false);
        Alert.alert('Success', 'Profile updated successfully.');
        loadProfileData();
      } else {
        setEditError(res.message || 'Invalid or expired OTP');
      }
    } catch (err) {
      setEditError(err.message || 'Failed to verify OTP.');
    } finally {
      setEditLoading(false);
    }
  };

  // ==========================================
  // CHANGE MOBILE LOGIC
  // ==========================================
  const openMobileModal = () => {
    setNewMobile('');
    setMobileOtp('');
    setMobileError(null);
    setMobileStep(1);
    setMobileCooldown(0);
    setShowMobileModal(true);
  };

  const handleRequestMobileOtp = async () => {
    setMobileError(null);
    const cleaned = newMobile.replace(/\D/g, '');

    if (cleaned.length !== 10) {
      setMobileError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (cleaned === user?.phone) {
      setMobileError('The new mobile number must be different from your current number.');
      return;
    }

    try {
      setMobileLoading(true);
      const res = await profileService.requestChangeMobileOtp(cleaned);
      if (res.success) {
        setMobileStep(2);
        setMobileCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setMobileError(res.message || 'Failed to request OTP');
      }
    } catch (err) {
      setMobileError(err.message || 'Failed to request OTP. Please try again.');
    } finally {
      setMobileLoading(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    setMobileError(null);
    const cleanedMobile = newMobile.replace(/\D/g, '');

    if (!mobileOtp || mobileOtp.length !== 6) {
      setMobileError('Please enter the 6-digit OTP code.');
      return;
    }

    try {
      setMobileLoading(true);
      const res = await profileService.verifyChangeMobileOtp(cleanedMobile, mobileOtp);
      if (res.success) {
        if (res.data?.user) {
          await updateUser(res.data.user);
        } else {
          await refreshUser();
        }
        setShowMobileModal(false);
        Alert.alert('Success', 'Mobile number updated successfully.');
        loadProfileData();
      } else {
        setMobileError(res.message || 'Invalid or expired OTP');
      }
    } catch (err) {
      setMobileError(err.message || 'Failed to verify OTP.');
    } finally {
      setMobileLoading(false);
    }
  };

  // ==========================================
  // SUBSCRIPTION ACTIONS
  // ==========================================
  const handlePauseAutoPay = async () => {
    try {
      setSubActionLoading(true);
      const res = await profileService.pauseSubscription();
      setShowPauseConfirm(false);
      Alert.alert('AutoPay Paused', res.message || 'Recurring payments are paused.');
      await refreshUser();
      const entRes = await profileService.getSubscriptionStatus();
      if (entRes?.data) setEntitlement(entRes.data);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to pause AutoPay');
    } finally {
      setSubActionLoading(false);
    }
  };

  const handleResumeAutoPay = async () => {
    try {
      setSubActionLoading(true);
      const res = await profileService.resumeSubscription();
      Alert.alert('AutoPay Resumed', res.message || 'Monthly recurring AutoPay is now active.');
      await refreshUser();
      const entRes = await profileService.getSubscriptionStatus();
      if (entRes?.data) setEntitlement(entRes.data);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to resume AutoPay');
    } finally {
      setSubActionLoading(false);
    }
  };

  const handleCancelAutoPay = async () => {
    try {
      setSubActionLoading(true);
      const res = await profileService.cancelSubscription();
      setShowCancelConfirm(false);
      Alert.alert(
        'AutoPay Cancelled',
        res.message || 'AutoPay cancelled. You will maintain access until the end of your billing cycle.'
      );
      await refreshUser();
      const entRes = await profileService.getSubscriptionStatus();
      if (entRes?.data) setEntitlement(entRes.data);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to cancel AutoPay');
    } finally {
      setSubActionLoading(false);
    }
  };

  // ==========================================
  // NOTIFICATIONS PREFERENCE
  // ==========================================
  const handleToggleNotifications = async (value) => {
    try {
      setNotifLoading(true);
      const res = await profileService.toggleNotificationPreference(value);
      setNotificationsEnabled(value);
      Alert.alert(
        'Notification Preference',
        value ? 'Daily rate and portfolio alerts enabled.' : 'Notifications disabled.'
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update notification setting');
    } finally {
      setNotifLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    try {
      setNotifTesting(true);
      const res = await profileService.sendTestNotification();
      Alert.alert('Notification Test', res.message || 'Test notification sent successfully.');
    } catch (err) {
      // Catch cleanly when native device token is not registered yet
      Alert.alert(
        'Notification Test',
        'Notification preference is active. Device push registration is configured on native builds.'
      );
    } finally {
      setNotifTesting(false);
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================
  const handleLogoutPress = () => {
    Alert.alert(
      'Lock Vault & Logout',
      'Are you sure you want to lock your physical gold vault and log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (err) {
              console.warn('Logout error:', err?.message);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={gradientPresets.ambientGlow}
        style={styles.ambientGlow}
        pointerEvents="none"
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={darkTheme.colors.gold}
            colors={[darkTheme.colors.gold]}
          />
        }
      >
        {/* ==================================================== */}
        {/* 1. PROFILE HEADER CARD                               */}
        {/* ==================================================== */}
        <View style={styles.headerSection}>
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={gradientPresets.goldMetallic}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarCircle}
            >
              <Text style={styles.avatarInitials}>
                {getInitials(user?.username || user?.name)}
              </Text>
            </LinearGradient>
            <View style={styles.verifiedCheckBadge}>
              <Feather name="check" size={13} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.displayName}>
            {user?.username || user?.name || 'Vault Member'}
          </Text>
          <Text style={styles.displayEmail}>{user?.email || 'N/A'}</Text>

          <View style={styles.verifiedTag}>
            <View style={styles.pulseDot} />
            <Text style={styles.verifiedTagText}>{t('accountVerified')}</Text>
          </View>
        </View>

        {/* ==================================================== */}
        {/* 2. ACCOUNT INFORMATION CARD                          */}
        {/* ==================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTitle}>{t('accountInformation')}</Text>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('username')}</Text>
              <Text style={styles.infoValue}>{user?.username || user?.name || t('na')}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('email')}</Text>
              <Text style={styles.infoValue}>{user?.email || t('na')}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('mobileNumber')}</Text>
              <Text style={styles.infoValue}>
                {user?.phone ? `+91 ${user.phone}` : t('notLinked')}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('memberSince')}</Text>
              <Text style={styles.infoValue}>
                {formatReadableDate(user?.created_at || user?.createdAt, language)}
              </Text>
            </View>
          </View>
        </View>

        {/* ==================================================== */}
        {/* 3. SUBSCRIPTION / PLAN CARD                          */}
        {/* ==================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeaderWithBadge}>
            <View style={styles.cardHeaderLeft}>
              <Feather name="award" size={16} color={darkTheme.colors.gold} />
              <Text style={styles.cardHeaderTitle}>{t('subscriptionAndPlan')}</Text>
            </View>

            <View
              style={[
                styles.planBadge,
                isPaid
                  ? isPaused || isCancelled
                    ? styles.planBadgeAmber
                    : styles.planBadgeGreen
                  : styles.planBadgeMuted,
              ]}
            >
              <Text
                style={[
                  styles.planBadgeText,
                  isPaid
                    ? isPaused || isCancelled
                      ? styles.planBadgeTextAmber
                      : styles.planBadgeTextGreen
                    : styles.planBadgeTextMuted,
                ]}
              >
                {planBadgeText}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.planOverviewRow}>
              <View style={styles.planOverviewLeft}>
                <Text style={styles.planTitle}>
                  {isPaid ? t('premiumPlan') : t('freePlan')}
                </Text>
                <Text style={styles.planSubtitle}>
                  {isPaid ? t('premiumPlanSubtitle') : t('freePlanSubtitle')}
                </Text>
              </View>

              <View style={styles.planOverviewRight}>
                <Text style={styles.planUsageCount}>
                  {!isPaid ? entriesUsed : t('unlimited')}
                </Text>
                {!isPaid && (
                  <Text style={styles.planUsageTotal}>
                    / {MAX_FREE_ASSETS} {t('entriesUsed')}
                  </Text>
                )}
              </View>
            </View>

            {!isPaid ? (
              <View style={styles.freeProgressSection}>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progressPercent}%` },
                    ]}
                  />
                </View>

                <Text style={styles.remainingEntriesText}>
                  {t('freeEntriesRemaining', { count: remainingEntries })}
                </Text>

                <TouchableOpacity
                  onPress={() => setShowUpgradeModal(true)}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel={t('upgradeToPremium')}
                >
                  <LinearGradient
                    colors={gradientPresets.goldMetallic}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.upgradeButton}
                  >
                    <Text style={styles.upgradeButtonText}>{t('upgradeToPremium')}</Text>
                    <Feather name="arrow-right" size={16} color="#080B12" style={{ marginLeft: 6 }} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.paidDetailsSection}>
                <View style={styles.paidInfoRow}>
                  <Text style={styles.paidInfoLabel}>{t('autoPay')}:</Text>
                  <View
                    style={[
                      styles.autoPayStatusTag,
                      isPaused
                        ? styles.autoPayStatusTagAmber
                        : isCancelled
                        ? styles.autoPayStatusTagRose
                        : styles.autoPayStatusTagGreen,
                    ]}
                  >
                    <Text
                      style={[
                        styles.autoPayStatusText,
                        isPaused
                          ? styles.autoPayStatusTextAmber
                          : isCancelled
                          ? styles.autoPayStatusTextRose
                          : styles.autoPayStatusTextGreen,
                      ]}
                    >
                      {isPaused ? 'PAUSED' : isCancelled ? 'OFF / Ending' : 'ON'}
                    </Text>
                  </View>
                </View>

                <View style={styles.paidInfoRow}>
                  <View style={styles.dateLabelRow}>
                    <Feather name="calendar" size={13} color={darkTheme.colors.gold} />
                    <Text style={styles.paidInfoLabel}>
                      {isCancelled
                        ? t('accessValidUntil')
                        : isPaused
                        ? t('currentAccessUntil')
                        : t('nextAutoPayRenewal')}
                    </Text>
                  </View>
                  <Text style={styles.dateValue}>
                    {currentPeriodEnd
                      ? formatReadableDate(currentPeriodEnd, language)
                      : 'Active'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.manageSubButton}
                  onPress={() => setShowSubModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('manageSubscription')}
                >
                  <Feather name="settings" size={15} color={darkTheme.colors.textPrimary} />
                  <Text style={styles.manageSubButtonText}>{t('manageSubscription')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ==================================================== */}
        {/* 4. LANGUAGE SETTINGS CARD                            */}
        {/* ==================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeaderWithBadge}>
            <View style={styles.cardHeaderLeft}>
              <Feather name="globe" size={16} color={darkTheme.colors.gold} />
              <Text style={styles.cardHeaderTitle}>{t('languageSection')}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.settingHelperText}>{t('selectLanguage')}</Text>

            <View style={styles.langButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.langChoiceButton,
                  language === 'en' && styles.langChoiceButtonActive,
                ]}
                onPress={() => setLanguage('en')}
                accessibilityRole="button"
                accessibilityLabel="Switch to English"
              >
                <Text
                  style={[
                    styles.langChoiceText,
                    language === 'en' && styles.langChoiceTextActive,
                  ]}
                >
                  🇬🇧 English
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.langChoiceButton,
                  language === 'ta' && styles.langChoiceButtonActive,
                ]}
                onPress={() => setLanguage('ta')}
                accessibilityRole="button"
                accessibilityLabel="Switch to Tamil"
              >
                <Text
                  style={[
                    styles.langChoiceText,
                    language === 'ta' && styles.langChoiceTextActive,
                  ]}
                >
                  🇮🇳 தமிழ்
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ==================================================== */}
        {/* 5. ACCOUNT ACTIONS & NOTIFICATIONS                   */}
        {/* ==================================================== */}
        <View style={styles.card}>
          <View style={styles.actionMenu}>
            {/* Edit Profile Action */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={openEditModal}
              accessibilityRole="button"
              accessibilityLabel={t('editProfile')}
            >
              <View style={styles.actionLeft}>
                <Feather name="user" size={17} color={darkTheme.colors.textMuted} />
                <Text style={styles.actionTitle}>{t('editProfile')}</Text>
              </View>
              <Feather name="chevron-right" size={17} color={darkTheme.colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Change Mobile Action */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={openMobileModal}
              accessibilityRole="button"
              accessibilityLabel={t('changeMobileNumber')}
            >
              <View style={styles.actionLeft}>
                <Feather name="phone" size={17} color={darkTheme.colors.textMuted} />
                <Text style={styles.actionTitle}>{t('changeMobileNumber')}</Text>
              </View>
              <Feather name="chevron-right" size={17} color={darkTheme.colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Notification Preference Setting */}
            <View style={styles.notifSettingContainer}>
              <View style={styles.notifHeaderRow}>
                <View style={styles.notifLeft}>
                  <View
                    style={[
                      styles.notifIconCircle,
                      notificationsEnabled && styles.notifIconCircleActive,
                    ]}
                  >
                    <Feather
                      name="bell"
                      size={16}
                      color={
                        notificationsEnabled
                          ? darkTheme.colors.gold
                          : darkTheme.colors.textMuted
                      }
                    />
                  </View>

                  <View style={styles.notifTextCol}>
                    <View style={styles.notifStatusBadgeRow}>
                      <Text style={styles.notifTitle}>{t('pushNotifications')}</Text>
                      <View
                        style={[
                          styles.notifTag,
                          notificationsEnabled
                            ? styles.notifTagActive
                            : styles.notifTagDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.notifTagText,
                            notificationsEnabled
                              ? styles.notifTagTextActive
                              : styles.notifTagTextDisabled,
                          ]}
                        >
                          {notificationsEnabled ? t('active') : t('disabled')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.notifSubtitle}>
                      {t('notificationsSubtitle')}
                    </Text>
                  </View>
                </View>

                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  disabled={notifLoading}
                  trackColor={{
                    false: '#262D3D',
                    true: darkTheme.colors.gold,
                  }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {notificationsEnabled && (
                <TouchableOpacity
                  style={styles.testNotifButton}
                  onPress={handleSendTestNotification}
                  disabled={notifTesting}
                  accessibilityRole="button"
                  accessibilityLabel={t('sendTestPushNotification')}
                >
                  {notifTesting ? (
                    <ActivityIndicator size="small" color={darkTheme.colors.gold} />
                  ) : (
                    <>
                      <Feather name="send" size={13} color={darkTheme.colors.gold} />
                      <Text style={styles.testNotifButtonText}>
                        {t('sendTestPushNotification')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ==================================================== */}
        {/* 6. SECURITY NOTICE CARD                              */}
        {/* ==================================================== */}
        <View style={styles.securityCard}>
          <View style={styles.securityIconBox}>
            <Feather name="shield" size={20} color={darkTheme.colors.gold} />
          </View>
          <View style={styles.securityTextBox}>
            <Text style={styles.securityTitle}>{t('vaultIsPrivate')}</Text>
            <Text style={styles.securityBody}>{t('vaultSecurityNotice')}</Text>
          </View>
        </View>

        {/* ==================================================== */}
        {/* 7. TERMS & CONDITIONS CARD                           */}
        {/* ==================================================== */}
        <View style={styles.card}>
          <View style={styles.termsCardContent}>
            <View style={styles.termsHeaderRow}>
              <View style={styles.termsIconBox}>
                <Feather name="file-text" size={18} color={darkTheme.colors.gold} />
              </View>
              <View style={styles.termsTextCol}>
                <Text style={styles.termsCardTitle}>{t('termsAndConditions')}</Text>
                <Text style={styles.termsCardSubtitle}>{t('termsSubtitle')}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.viewTermsAction}
              onPress={() => setShowTermsModal(true)}
              accessibilityRole="button"
              accessibilityLabel={t('viewTerms')}
            >
              <Text style={styles.viewTermsActionText}>{t('viewTerms')}</Text>
              <Feather name="arrow-right" size={14} color={darkTheme.colors.gold} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ==================================================== */}
        {/* 8. LOCK VAULT & LOGOUT BUTTON                        */}
        {/* ==================================================== */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogoutPress}
          accessibilityRole="button"
          accessibilityLabel={t('lockVaultLogout')}
        >
          <Feather name="log-out" size={17} color={darkTheme.colors.loss} />
          <Text style={styles.logoutButtonText}>{t('lockVaultLogout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ==================================================== */}
      {/* EDIT PROFILE MODAL                                   */}
      {/* ==================================================== */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => !editLoading && setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('editProfile')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => !editLoading && setShowEditModal(false)}
                disabled={editLoading}
                accessibilityRole="button"
                accessibilityLabel="Close edit profile modal"
              >
                <Feather name="x" size={18} color={darkTheme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {editStep === 1 ? (
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>{t('username')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={editUsername}
                  onChangeText={setEditUsername}
                  placeholder="Enter your username"
                  placeholderTextColor={darkTheme.colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                />

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                  {t('email')} (Optional)
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={darkTheme.colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {editError ? <Text style={styles.modalErrorText}>{editError}</Text> : null}

                <TouchableOpacity
                  onPress={handleRequestEditOtp}
                  disabled={editLoading}
                  activeOpacity={0.88}
                  style={editLoading ? styles.buttonDisabled : undefined}
                  accessibilityRole="button"
                  accessibilityLabel={t('continueAndVerify')}
                >
                  <LinearGradient
                    colors={gradientPresets.goldMetallic}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalPrimaryButton}
                  >
                    {editLoading ? (
                      <ActivityIndicator size="small" color="#080B12" />
                    ) : (
                      <Text style={styles.modalPrimaryButtonText}>
                        {t('continueAndVerify')}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <Text style={styles.otpPromptText}>
                  We sent a 6-digit OTP to your registered mobile number: +91{' '}
                  {user?.phone ? String(user.phone).slice(-4).padStart(10, '*') : ''}
                </Text>

                <OtpInput
                  value={editOtp}
                  onChange={setEditOtp}
                  disabled={editLoading}
                  error={editError}
                />

                <View style={styles.otpFooterRow}>
                  <TouchableOpacity
                    onPress={() => setEditStep(1)}
                    disabled={editLoading}
                    accessibilityRole="button"
                    accessibilityLabel={t('back')}
                  >
                    <Text style={styles.otpBackText}>← {t('back')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleRequestEditOtp}
                    disabled={editCooldown > 0 || editLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Resend OTP"
                  >
                    <Text
                      style={[
                        styles.otpResendText,
                        editCooldown > 0 && styles.otpResendTextDisabled,
                      ]}
                    >
                      {editCooldown > 0
                        ? t('resendOtpIn', { seconds: editCooldown })
                        : t('resendOtp')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleVerifyEditOtp}
                  disabled={editLoading || editOtp.length !== 6}
                  activeOpacity={0.88}
                  style={(editLoading || editOtp.length !== 6) ? styles.buttonDisabled : undefined}
                  accessibilityRole="button"
                  accessibilityLabel={t('verifyAndSave')}
                >
                  <LinearGradient
                    colors={gradientPresets.goldMetallic}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalPrimaryButton}
                  >
                    {editLoading ? (
                      <ActivityIndicator size="small" color="#080B12" />
                    ) : (
                      <Text style={styles.modalPrimaryButtonText}>
                        {t('verifyAndSave')}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ==================================================== */}
      {/* CHANGE MOBILE MODAL                                  */}
      {/* ==================================================== */}
      <Modal
        visible={showMobileModal}
        transparent
        animationType="fade"
        onRequestClose={() => !mobileLoading && setShowMobileModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('changeMobileNumber')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => !mobileLoading && setShowMobileModal(false)}
                disabled={mobileLoading}
                accessibilityRole="button"
                accessibilityLabel="Close mobile modal"
              >
                <Feather name="x" size={18} color={darkTheme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {mobileStep === 1 ? (
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>New 10-Digit Mobile Number</Text>
                <View style={styles.mobileInputWrapper}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.mobileInput}
                    value={newMobile}
                    onChangeText={(val) => setNewMobile(val.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor={darkTheme.colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>

                {mobileError ? <Text style={styles.modalErrorText}>{mobileError}</Text> : null}

                <TouchableOpacity
                  onPress={handleRequestMobileOtp}
                  disabled={mobileLoading || newMobile.length !== 10}
                  activeOpacity={0.88}
                  style={(mobileLoading || newMobile.length !== 10) ? styles.buttonDisabled : undefined}
                  accessibilityRole="button"
                  accessibilityLabel={t('sendOtp')}
                >
                  <LinearGradient
                    colors={gradientPresets.goldMetallic}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalPrimaryButton}
                  >
                    {mobileLoading ? (
                      <ActivityIndicator size="small" color="#080B12" />
                    ) : (
                      <Text style={styles.modalPrimaryButtonText}>{t('sendOtp')}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <Text style={styles.otpPromptText}>
                  Enter the 6-digit verification code sent to +91{' '}
                  {newMobile.slice(-4).padStart(10, '*')}
                </Text>

                <OtpInput
                  value={mobileOtp}
                  onChange={setMobileOtp}
                  disabled={mobileLoading}
                  error={mobileError}
                />

                <View style={styles.otpFooterRow}>
                  <TouchableOpacity
                    onPress={() => setMobileStep(1)}
                    disabled={mobileLoading}
                    accessibilityRole="button"
                    accessibilityLabel={t('back')}
                  >
                    <Text style={styles.otpBackText}>← {t('back')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleRequestMobileOtp}
                    disabled={mobileCooldown > 0 || mobileLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Resend OTP"
                  >
                    <Text
                      style={[
                        styles.otpResendText,
                        mobileCooldown > 0 && styles.otpResendTextDisabled,
                      ]}
                    >
                      {mobileCooldown > 0
                        ? t('resendOtpIn', { seconds: mobileCooldown })
                        : t('resendOtp')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleVerifyMobileOtp}
                  disabled={mobileLoading || mobileOtp.length !== 6}
                  activeOpacity={0.88}
                  style={(mobileLoading || mobileOtp.length !== 6) ? styles.buttonDisabled : undefined}
                  accessibilityRole="button"
                  accessibilityLabel={t('verifyAndUpdate')}
                >
                  <LinearGradient
                    colors={gradientPresets.goldMetallic}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalPrimaryButton}
                  >
                    {mobileLoading ? (
                      <ActivityIndicator size="small" color="#080B12" />
                    ) : (
                      <Text style={styles.modalPrimaryButtonText}>
                        {t('verifyAndUpdate')}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ==================================================== */}
      {/* MANAGE SUBSCRIPTION MODAL                            */}
      {/* ==================================================== */}
      <Modal
        visible={showSubModal}
        transparent
        animationType="fade"
        onRequestClose={() => !subActionLoading && setShowSubModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => !subActionLoading && setShowSubModal(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.subModalHeaderTitleRow}>
                <Feather name="award" size={18} color={darkTheme.colors.gold} />
                <Text style={styles.modalTitle}>Manage Subscription</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => !subActionLoading && setShowSubModal(false)}
                disabled={subActionLoading}
                accessibilityRole="button"
                accessibilityLabel="Close subscription modal"
              >
                <Feather name="x" size={18} color={darkTheme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.subDetailRow}>
                <Text style={styles.subDetailLabel}>Plan:</Text>
                <Text style={styles.subDetailValue}>Premium Monthly Vault</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.subDetailRow}>
                <Text style={styles.subDetailLabel}>AutoPay Status:</Text>
                <Text
                  style={[
                    styles.subDetailValue,
                    isPaused
                      ? { color: darkTheme.colors.gold }
                      : isCancelled
                      ? { color: darkTheme.colors.loss }
                      : { color: darkTheme.colors.profit },
                  ]}
                >
                  {isPaused ? 'PAUSED' : isCancelled ? 'OFF / Ending' : 'ON'}
                </Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.subDetailRow}>
                <Text style={styles.subDetailLabel}>Current Period:</Text>
                <Text style={styles.subDetailValue}>
                  {currentPeriodStart ? formatReadableDate(currentPeriodStart, language) : '—'}{' '}
                  to {currentPeriodEnd ? formatReadableDate(currentPeriodEnd, language) : '—'}
                </Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.subDetailRow}>
                <Text style={styles.subDetailLabel}>
                  {isCancelled ? 'Access Valid Until:' : 'Next Billing Date:'}
                </Text>
                <Text style={[styles.subDetailValue, { fontWeight: '800' }]}>
                  {currentPeriodEnd ? formatReadableDate(currentPeriodEnd, language) : '—'}
                </Text>
              </View>

              <View style={styles.subModalActions}>
                {isPaused ? (
                  <TouchableOpacity
                    style={[styles.resumeButton, subActionLoading && styles.buttonDisabled]}
                    onPress={handleResumeAutoPay}
                    disabled={subActionLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Resume AutoPay"
                  >
                    {subActionLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="play" size={15} color="#FFFFFF" />
                        <Text style={styles.resumeButtonText}>Resume AutoPay</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : !isCancelled ? (
                  <TouchableOpacity
                    style={[styles.pauseButton, subActionLoading && styles.buttonDisabled]}
                    onPress={() => setShowPauseConfirm(true)}
                    disabled={subActionLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Pause AutoPay"
                  >
                    <Feather name="pause" size={15} color={darkTheme.colors.gold} />
                    <Text style={styles.pauseButtonText}>Pause AutoPay</Text>
                  </TouchableOpacity>
                ) : null}

                {!isCancelled && (
                  <TouchableOpacity
                    style={[styles.cancelSubButton, subActionLoading && styles.buttonDisabled]}
                    onPress={() => setShowCancelConfirm(true)}
                    disabled={subActionLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel AutoPay"
                  >
                    <Feather name="x-circle" size={15} color={darkTheme.colors.loss} />
                    <Text style={styles.cancelSubButtonText}>Cancel Subscription</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ==================================================== */}
      {/* PAUSE CONFIRMATION MODAL                             */}
      {/* ==================================================== */}
      <Modal
        visible={showPauseConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => !subActionLoading && setShowPauseConfirm(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => !subActionLoading && setShowPauseConfirm(false)}
        >
          <Pressable style={styles.confirmCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.confirmIconCircleAmber}>
              <Feather name="pause" size={24} color={darkTheme.colors.gold} />
            </View>

            <Text style={styles.confirmTitle}>Pause AutoPay?</Text>
            <Text style={styles.confirmMessage}>
              Future recurring payments will be paused according to the subscription lifecycle.
              Your subscription status will be updated after verification.
            </Text>

            <View style={styles.confirmButtonRow}>
              <TouchableOpacity
                style={styles.confirmKeepButton}
                onPress={() => setShowPauseConfirm(false)}
                disabled={subActionLoading}
                accessibilityRole="button"
                accessibilityLabel="Keep Active"
              >
                <Text style={styles.confirmKeepText}>Keep Active</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePauseAutoPay}
                disabled={subActionLoading}
                activeOpacity={0.88}
                style={[styles.confirmActionTouch, subActionLoading && styles.buttonDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Confirm Pause"
              >
                <LinearGradient
                  colors={gradientPresets.goldMetallic}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.confirmAmberAction}
                >
                  {subActionLoading ? (
                    <ActivityIndicator size="small" color="#080B12" />
                  ) : (
                    <Text style={styles.confirmAmberActionText}>Confirm Pause</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ==================================================== */}
      {/* CANCEL CONFIRMATION MODAL                            */}
      {/* ==================================================== */}
      <Modal
        visible={showCancelConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => !subActionLoading && setShowCancelConfirm(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => !subActionLoading && setShowCancelConfirm(false)}
        >
          <Pressable style={styles.confirmCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.confirmIconCircleRed}>
              <Feather name="alert-triangle" size={24} color={darkTheme.colors.loss} />
            </View>

            <Text style={styles.confirmTitle}>Cancel AutoPay?</Text>
            <Text style={styles.confirmMessage}>
              Your future recurring payments will stop. Your Premium access will remain active
              until the end of your current paid billing period (
              {currentPeriodEnd ? formatReadableDate(currentPeriodEnd, language) : 'billing period'}
              ).
            </Text>

            <View style={styles.confirmButtonRow}>
              <TouchableOpacity
                style={styles.confirmKeepButton}
                onPress={() => setShowCancelConfirm(false)}
                disabled={subActionLoading}
                accessibilityRole="button"
                accessibilityLabel="Keep Subscription"
              >
                <Text style={styles.confirmKeepText}>Keep Subscription</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmRedAction, subActionLoading && styles.buttonDisabled]}
                onPress={handleCancelAutoPay}
                disabled={subActionLoading}
                accessibilityRole="button"
                accessibilityLabel="Cancel AutoPay"
              >
                {subActionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmRedActionText}>Cancel AutoPay</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ==================================================== */}
      {/* UPGRADE INFORMATION MODAL (NO RAZORPAY INJECTED)      */}
      {/* ==================================================== */}
      <Modal
        visible={showUpgradeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowUpgradeModal(false)}>
          <Pressable style={styles.upgradeInfoCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.upgradeIconCircle}>
              <Feather name="award" size={28} color={darkTheme.colors.gold} />
            </View>

            <Text style={styles.upgradeInfoTitle}>Premium Monthly Vault</Text>
            <Text style={styles.upgradeInfoBody}>
              Upgrade to Premium Monthly to unlock unlimited Gold & Silver bullion records,
              cloud backups, and purchase receipt storage.
            </Text>

            <View style={styles.upgradePriceBox}>
              <Text style={styles.upgradePriceValue}>₹199 / month</Text>
              <Text style={styles.upgradePriceSub}>Cancel or pause anytime with 1-click</Text>
            </View>

            <Text style={styles.upgradeNoticeText}>
              To activate monthly AutoPay, please log in through the MyGold web portal.
            </Text>

            <TouchableOpacity
              onPress={() => setShowUpgradeModal(false)}
              activeOpacity={0.88}
              style={{ width: '100%' }}
              accessibilityRole="button"
              accessibilityLabel="Got it"
            >
              <LinearGradient
                colors={gradientPresets.goldMetallic}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.upgradeCloseButton}
              >
                <Text style={styles.upgradeCloseButtonText}>Got It</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ==================================================== */}
      {/* TERMS & CONDITIONS MODAL                             */}
      {/* ==================================================== */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },

  // 1. Header Section
  headerSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...darkTheme.shadows.goldGlow,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '900',
    color: '#080B12',
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.profit,
    borderWidth: 2,
    borderColor: darkTheme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '900',
    color: darkTheme.colors.textPrimary,
    marginBottom: 4,
  },
  displayEmail: {
    fontSize: 13,
    color: darkTheme.colors.textMuted,
    fontWeight: '500',
    marginBottom: 10,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.profitBg,
    borderWidth: 1,
    borderColor: darkTheme.colors.profitBorder,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: darkTheme.colors.profit,
  },
  verifiedTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: darkTheme.colors.profit,
  },

  // Cards General
  card: {
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    overflow: 'hidden',
    ...darkTheme.shadows.card,
  },
  cardHeader: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.borderSubtle,
  },
  cardHeaderWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.borderSubtle,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: darkTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardBody: {
    padding: 18,
  },
  divider: {
    height: 1,
    backgroundColor: darkTheme.colors.borderSubtle,
    marginVertical: 12,
  },

  // Account Info Rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: darkTheme.colors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: darkTheme.colors.textPrimary,
  },

  // Subscription Card
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  planBadgeGreen: {
    backgroundColor: darkTheme.colors.profitBg,
    borderWidth: 1,
    borderColor: darkTheme.colors.profitBorder,
  },
  planBadgeAmber: {
    backgroundColor: 'rgba(232, 179, 49, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.3)',
  },
  planBadgeMuted: {
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  planBadgeTextGreen: {
    color: darkTheme.colors.profit,
  },
  planBadgeTextAmber: {
    color: darkTheme.colors.gold,
  },
  planBadgeTextMuted: {
    color: darkTheme.colors.textMuted,
  },
  planOverviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  planOverviewLeft: {
    flex: 1,
    paddingRight: 12,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    marginBottom: 4,
  },
  planSubtitle: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    lineHeight: 17,
  },
  planOverviewRight: {
    alignItems: 'flex-end',
  },
  planUsageCount: {
    fontSize: 22,
    fontWeight: '900',
    color: darkTheme.colors.gold,
  },
  planUsageTotal: {
    fontSize: 11,
    color: darkTheme.colors.textMuted,
    fontWeight: '600',
  },
  freeProgressSection: {
    gap: 8,
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: darkTheme.colors.gold,
    borderRadius: 4,
  },
  remainingEntriesText: {
    fontSize: 11,
    fontWeight: '600',
    color: darkTheme.colors.textMuted,
    textAlign: 'right',
  },
  upgradeButton: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...darkTheme.shadows.button,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080B12',
  },
  paidDetailsSection: {
    gap: 12,
  },
  paidInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paidInfoLabel: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    fontWeight: '600',
  },
  autoPayStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  autoPayStatusTagGreen: {
    backgroundColor: darkTheme.colors.profitBg,
  },
  autoPayStatusTagAmber: {
    backgroundColor: 'rgba(232, 179, 49, 0.15)',
  },
  autoPayStatusTagRose: {
    backgroundColor: darkTheme.colors.lossBg,
  },
  autoPayStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  autoPayStatusTextGreen: {
    color: darkTheme.colors.profit,
  },
  autoPayStatusTextAmber: {
    color: darkTheme.colors.gold,
  },
  autoPayStatusTextRose: {
    color: darkTheme.colors.loss,
  },
  dateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  manageSubButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  manageSubButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.textPrimary,
  },

  // Language Settings
  settingHelperText: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    marginBottom: 12,
  },
  langButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langChoiceButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langChoiceButtonActive: {
    backgroundColor: darkTheme.colors.gold,
    borderColor: darkTheme.colors.gold,
  },
  langChoiceText: {
    fontSize: 13,
    fontWeight: '700',
    color: darkTheme.colors.textSecondary,
  },
  langChoiceTextActive: {
    color: '#080B12',
    fontWeight: '900',
  },

  // Actions Menu
  actionMenu: {
    paddingVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: darkTheme.colors.textPrimary,
  },

  // Notifications Row
  notifSettingContainer: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  notifIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIconCircleActive: {
    backgroundColor: 'rgba(232, 179, 49, 0.12)',
    borderColor: 'rgba(232, 179, 49, 0.3)',
  },
  notifTextCol: {
    flex: 1,
  },
  notifStatusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: darkTheme.colors.textPrimary,
  },
  notifTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  notifTagActive: {
    backgroundColor: darkTheme.colors.profitBg,
  },
  notifTagDisabled: {
    backgroundColor: darkTheme.colors.backgroundSubtle,
  },
  notifTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  notifTagTextActive: {
    color: darkTheme.colors.profit,
  },
  notifTagTextDisabled: {
    color: darkTheme.colors.textMuted,
  },
  notifSubtitle: {
    fontSize: 11,
    color: darkTheme.colors.textMuted,
    lineHeight: 15,
  },
  testNotifButton: {
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(232, 179, 49, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  testNotifButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: darkTheme.colors.gold,
    textTransform: 'uppercase',
  },

  // Security Notice
  securityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(232, 179, 49, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.25)',
  },
  securityIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(232, 179, 49, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTextBox: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    marginBottom: 4,
  },
  securityBody: {
    fontSize: 12,
    color: darkTheme.colors.textSecondary,
    lineHeight: 17,
  },

  // Terms Card
  termsCardContent: {
    padding: 18,
  },
  termsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  termsIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(232, 179, 49, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsTextCol: {
    flex: 1,
  },
  termsCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    marginBottom: 2,
  },
  termsCardSubtitle: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
  },
  viewTermsAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingTop: 6,
  },
  viewTermsActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.gold,
  },

  // Logout Button
  logoutButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: darkTheme.colors.lossBg,
    borderWidth: 1,
    borderColor: darkTheme.colors.lossBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: darkTheme.colors.loss,
  },

  // Modals Shared
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    overflow: 'hidden',
    ...darkTheme.shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.borderSubtle,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    height: 50,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.colors.textPrimary,
  },
  mobileInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    borderRadius: 14,
    height: 50,
    overflow: 'hidden',
  },
  countryCodeBox: {
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: darkTheme.colors.borderSubtle,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
  },
  mobileInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
    color: darkTheme.colors.textPrimary,
  },
  modalErrorText: {
    fontSize: 12,
    color: darkTheme.colors.loss,
    fontWeight: '600',
    marginTop: 10,
    lineHeight: 16,
  },
  modalPrimaryButton: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    ...darkTheme.shadows.button,
  },
  modalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080B12',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  otpPromptText: {
    fontSize: 13,
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 8,
  },
  otpFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  otpBackText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
  },
  otpResendText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.gold,
  },
  otpResendTextDisabled: {
    color: darkTheme.colors.textMuted,
  },

  // Manage Sub Modal
  subModalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  subDetailLabel: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
  },
  subDetailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: darkTheme.colors.textPrimary,
  },
  subModalActions: {
    marginTop: 18,
    gap: 10,
  },
  resumeButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.profit,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resumeButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pauseButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(232, 179, 49, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pauseButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: darkTheme.colors.gold,
  },
  cancelSubButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.lossBg,
    borderWidth: 1,
    borderColor: darkTheme.colors.lossBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelSubButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: darkTheme.colors.loss,
  },

  // Confirmation Modals
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    padding: 22,
    alignItems: 'center',
    ...darkTheme.shadows.card,
  },
  confirmIconCircleAmber: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(232, 179, 49, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmIconCircleRed: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: darkTheme.colors.lossBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: darkTheme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmButtonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  confirmKeepButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmKeepText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.textSecondary,
  },
  confirmActionTouch: {
    flex: 1,
    height: 44,
  },
  confirmAmberAction: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmAmberActionText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#080B12',
  },
  confirmRedAction: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.loss,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmRedActionText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Upgrade Info Card
  upgradeInfoCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.3)',
    padding: 24,
    alignItems: 'center',
    ...darkTheme.shadows.card,
  },
  upgradeIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(232, 179, 49, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  upgradeInfoTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: darkTheme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  upgradeInfoBody: {
    fontSize: 13,
    color: darkTheme.colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  upgradePriceBox: {
    width: '100%',
    backgroundColor: 'rgba(232, 179, 49, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.25)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  upgradePriceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: darkTheme.colors.gold,
    marginBottom: 2,
  },
  upgradePriceSub: {
    fontSize: 11,
    color: darkTheme.colors.textMuted,
    fontWeight: '600',
  },
  upgradeNoticeText: {
    fontSize: 11,
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 18,
  },
  upgradeCloseButton: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...darkTheme.shadows.button,
  },
  upgradeCloseButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080B12',
  },
});
