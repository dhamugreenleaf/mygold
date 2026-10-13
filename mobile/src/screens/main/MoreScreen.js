import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { darkTheme } from '../../constants/theme';
import useGoldRate from '../../hooks/useGoldRate';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatReadableDate } from '../../utils/formatters';
import notificationService from '../../services/notificationService';
import TermsModal from '../../components/common/TermsModal';
import { LinearGradient } from 'expo-linear-gradient';
import { gradientPresets } from '../../constants/colors';

const APP_VERSION = '1.0.0';

export default function MoreScreen() {
  const { t, language, isTamil } = useLanguage();
  const {
    rate24K,
    rate22K,
    rate18K,
    silverRate,
    silverRate925,
    silverRate916,
    silverRate900,
    ratesData,
    loading: ratesLoading,
    error: ratesError,
    getLiveRate,
    refreshGoldRates,
  } = useGoldRate();

  // Screen States
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState('GOLD'); // 'GOLD' | 'SILVER'

  // Calculator State
  const [calcMetal, setCalcMetal] = useState('GOLD'); // 'GOLD' | 'SILVER'
  const [calcPurity, setCalcPurity] = useState('22K');
  const [calcWeight, setCalcWeight] = useState('8');

  // Terms Modal State
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Notification Center Modal State
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [notifError, setNotifError] = useState(null);

  // Fetch in-app notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoadingNotifs(true);
      setNotifError(null);
      const res = await notificationService.getNotifications();
      if (res?.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {
      setNotifError(err.message || 'Failed to load notifications');
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        refreshGoldRates(),
        loadNotifications(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshGoldRates, loadNotifications]);

  // Manual refresh button trigger
  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshGoldRates();
    setRefreshing(false);
  };

  // Switch Calculator Metal & Purity
  const handleSelectCalcMetal = (metal) => {
    setCalcMetal(metal);
    if (metal === 'GOLD') {
      setCalcPurity('22K');
    } else {
      setCalcPurity('999');
    }
  };

  // Calculator computation
  const calcWeightNumber = useMemo(() => {
    const cleaned = calcWeight.replace(',', '.').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [calcWeight]);

  const activeRatePerGram = useMemo(() => {
    return getLiveRate(calcMetal, calcPurity);
  }, [calcMetal, calcPurity, getLiveRate]);

  const calculatedValue = useMemo(() => {
    return calcWeightNumber * activeRatePerGram;
  }, [calcWeightNumber, activeRatePerGram]);

  // Notification Actions
  const handleMarkOneRead = async (id) => {
    try {
      await notificationService.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
      );
      setUnreadCount((c) => Math.max(c - 1, 0));
    } catch (err) {
      console.warn('Failed to mark notification read:', err?.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to mark all as read');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear Notifications',
      'Are you sure you want to clear all in-app notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.clearAllNotifications();
              setNotifications([]);
              setUnreadCount(0);
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to clear notifications');
            }
          },
        },
      ]
    );
  };

  // Bullion rates data sets
  const goldRatesList = useMemo(
    () => [
      {
        badge: '24K',
        title: isTamil ? '24K சுத்த தங்கம்' : '24K Pure Gold',
        subtitle: t('pureBullionSubtitle'),
        purity: '99.9%',
        rate1g: rate24K,
        rate8g: rate24K * 8,
      },
      {
        badge: '22K',
        title: isTamil ? '22K ஆபரணத் தங்கம்' : '22K Hallmark Gold',
        subtitle: t('hallmarkSubtitle'),
        purity: '91.6%',
        rate1g: rate22K,
        rate8g: rate22K * 8,
      },
      {
        badge: '18K',
        title: isTamil ? '18K தங்கம்' : '18K Gold Standard',
        subtitle: t('alloySubtitle'),
        purity: '75.0%',
        rate1g: rate18K,
        rate8g: rate18K * 8,
      },
    ],
    [rate24K, rate22K, rate18K, isTamil, t]
  );

  const silverRatesList = useMemo(
    () => [
      {
        badge: '999',
        title: isTamil ? '999 சுத்த வெள்ளி' : '999 Fine Silver',
        subtitle: t('fineSilverSubtitle'),
        purity: '99.9%',
        rate1g: silverRate,
        rate10g: silverRate * 10,
        rate1kg: silverRate * 1000,
      },
      {
        badge: '925',
        title: isTamil ? '925 ஸ்டெர்லிங் வெள்ளி' : '925 Sterling Silver',
        subtitle: t('sterlingSilverSubtitle'),
        purity: '92.5%',
        rate1g: silverRate925,
        rate10g: silverRate925 * 10,
        rate1kg: silverRate925 * 1000,
      },
      {
        badge: '916',
        title: isTamil ? '916 வெள்ளி' : '916 Silver Articles',
        subtitle: t('silverArticlesSubtitle'),
        purity: '91.6%',
        rate1g: silverRate916,
        rate10g: silverRate916 * 10,
        rate1kg: silverRate916 * 1000,
      },
      {
        badge: '900',
        title: isTamil ? '900 பாரம்பரிய வெள்ளி' : '900 Traditional Silver',
        subtitle: t('traditionalSilverSubtitle'),
        purity: '90.0%',
        rate1g: silverRate900,
        rate10g: silverRate900 * 10,
        rate1kg: silverRate900 * 1000,
      },
    ],
    [silverRate, silverRate925, silverRate916, silverRate900, isTamil, t]
  );

  const sourceUpdateText = ratesData?.sourceUpdate || ratesData?.updatedAt;

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
        {/* 1. HEADER SECTION                                    */}
        {/* ==================================================== */}
        <View style={styles.headerSection}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>{t('liveMarketRates')}</Text>
            <Text style={styles.headerSubtitle}>{t('ratesSubtitle')}</Text>

            <View style={styles.statusRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.statusText}>
                {sourceUpdateText
                  ? `${isTamil ? 'புதுப்பிக்கப்பட்டது' : 'Updated'}: ${sourceUpdateText}`
                  : t('liveUpdate')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleManualRefresh}
            disabled={refreshing || ratesLoading}
            accessibilityRole="button"
            accessibilityLabel={t('refreshRates')}
          >
            {refreshing || ratesLoading ? (
              <ActivityIndicator size="small" color={darkTheme.colors.gold} />
            ) : (
              <Feather name="refresh-cw" size={17} color={darkTheme.colors.gold} />
            )}
          </TouchableOpacity>
        </View>

        {/* Error Notice if rates fail */}
        {ratesError && (
          <View style={styles.errorNotice}>
            <Feather name="alert-circle" size={16} color={darkTheme.colors.loss} />
            <Text style={styles.errorNoticeText}>{ratesError}</Text>
          </View>
        )}

        {/* ==================================================== */}
        {/* 2. SEGMENTED NAVIGATION (GOLD / SILVER)              */}
        {/* ==================================================== */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={styles.segmentTabTouch}
            onPress={() => setSelectedSegment('GOLD')}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityLabel={t('goldRatesTab')}
          >
            {selectedSegment === 'GOLD' ? (
              <LinearGradient
                colors={gradientPresets.goldMetallic}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.segmentTabActiveGrad}
              >
                <Feather name="award" size={16} color="#080B12" />
                <Text style={styles.segmentTabTextActiveGold}>
                  {t('gold')}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.segmentTabInactive}>
                <Feather name="award" size={16} color={darkTheme.colors.textMuted} />
                <Text style={styles.segmentTabText}>
                  {t('gold')}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.segmentTabTouch}
            onPress={() => setSelectedSegment('SILVER')}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityLabel={t('silverRatesTab')}
          >
            {selectedSegment === 'SILVER' ? (
              <LinearGradient
                colors={gradientPresets.silverMetallic}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.segmentTabActiveGrad}
              >
                <Feather name="circle" size={15} color="#080B12" />
                <Text style={styles.segmentTabTextActiveSilver}>
                  {t('silver')}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.segmentTabInactive}>
                <Feather name="circle" size={15} color={darkTheme.colors.textMuted} />
                <Text style={styles.segmentTabText}>
                  {t('silver')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ==================================================== */}
        {/* 3. RATE CARDS DISPLAY                                */}
        {/* ==================================================== */}
        {selectedSegment === 'GOLD' ? (
          <View style={styles.ratesList}>
            {goldRatesList.map((item) => (
              <View key={`gold-${item.badge}`} style={styles.rateCard}>
                {/* Header row */}
                <View style={styles.rateCardHeader}>
                  <View style={styles.badgeAndName}>
                    <LinearGradient
                      colors={gradientPresets.goldMetallic}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.goldBadge}
                    >
                      <Text style={styles.goldBadgeText}>{item.badge}</Text>
                    </LinearGradient>
                    <View>
                      <Text style={styles.rateCardTitle}>{item.title}</Text>
                      <Text style={styles.rateCardSubtitle}>{item.subtitle}</Text>
                    </View>
                  </View>

                  <View style={styles.purityTagGold}>
                    <Text style={styles.purityTagGoldText}>{item.purity}</Text>
                  </View>
                </View>

                {/* Price Grid */}
                <View style={styles.rateGrid}>
                  <View style={styles.rateMetricBox}>
                    <Text style={styles.rateMetricLabel}>{t('oneGramPrice')}</Text>
                    <Text style={styles.rateMetricValue}>
                      {formatCurrency(item.rate1g)}
                    </Text>
                  </View>

                  <View style={[styles.rateMetricBox, styles.rateMetricBoxHighlight]}>
                    <Text style={styles.rateMetricLabelHighlight}>
                      {t('onePoun')}
                    </Text>
                    <Text style={styles.rateMetricValueHighlight}>
                      {formatCurrency(item.rate8g)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.ratesList}>
            {silverRatesList.map((item) => (
              <View key={`silver-${item.badge}`} style={styles.rateCard}>
                {/* Header row */}
                <View style={styles.rateCardHeader}>
                  <View style={styles.badgeAndName}>
                    <LinearGradient
                      colors={gradientPresets.silverMetallic}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.silverBadge}
                    >
                      <Text style={styles.silverBadgeText}>{item.badge}</Text>
                    </LinearGradient>
                    <View>
                      <Text style={styles.rateCardTitle}>{item.title}</Text>
                      <Text style={styles.rateCardSubtitle}>{item.subtitle}</Text>
                    </View>
                  </View>

                  <View style={styles.purityTagSilver}>
                    <Text style={styles.purityTagSilverText}>{item.purity}</Text>
                  </View>
                </View>

                {/* Silver 3-Col Price Grid */}
                <View style={styles.silverRateGrid}>
                  <View style={styles.silverMetricBox}>
                    <Text style={styles.silverMetricLabel}>{t('oneGramPrice')}</Text>
                    <Text style={styles.silverMetricValue}>
                      {formatCurrency(item.rate1g)}
                    </Text>
                  </View>

                  <View style={styles.silverMetricBox}>
                    <Text style={styles.silverMetricLabel}>{t('tenGrams')}</Text>
                    <Text style={styles.silverMetricValue}>
                      {formatCurrency(item.rate10g)}
                    </Text>
                  </View>

                  <View style={styles.silverMetricBox}>
                    <Text style={styles.silverMetricLabel}>{t('oneKilogram')}</Text>
                    <Text style={styles.silverMetricValue}>
                      {formatCurrency(item.rate1kg)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ==================================================== */}
        {/* 4. VALUATION CALCULATOR CARD                         */}
        {/* ==================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Feather name="trending-up" size={16} color={darkTheme.colors.gold} />
              <Text style={styles.cardHeaderTitle}>{t('goldCalculator')}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            {/* Metal Selector (Gold / Silver) */}
            <View style={styles.calcMetalToggleRow}>
              <TouchableOpacity
                style={styles.calcMetalTouch}
                onPress={() => handleSelectCalcMetal('GOLD')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Calculate Gold"
              >
                {calcMetal === 'GOLD' ? (
                  <LinearGradient
                    colors={gradientPresets.goldMetallic}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.calcMetalActiveGrad}
                  >
                    <Text style={styles.calcMetalOptionTextActiveGold}>
                      🪙 {t('gold')}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.calcMetalInactive}>
                    <Text style={styles.calcMetalOptionText}>
                      🪙 {t('gold')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.calcMetalTouch}
                onPress={() => handleSelectCalcMetal('SILVER')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Calculate Silver"
              >
                {calcMetal === 'SILVER' ? (
                  <LinearGradient
                    colors={gradientPresets.silverMetallic}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.calcMetalActiveGrad}
                  >
                    <Text style={styles.calcMetalOptionTextActiveSilver}>
                      🥈 {t('silver')}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.calcMetalInactive}>
                    <Text style={styles.calcMetalOptionText}>
                      🥈 {t('silver')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Purity Selector Chips */}
            <Text style={styles.calcFieldLabel}>{t('calcSelectPurity')}</Text>
            <View style={styles.purityChipsRow}>
              {(calcMetal === 'GOLD'
                ? ['24K', '22K', '18K']
                : ['999', '925', '916', '900']
              ).map((p) => {
                const isSelected = calcPurity === p;
                return (
                  <TouchableOpacity
                    key={`purity-chip-${p}`}
                    style={styles.purityChipTouch}
                    onPress={() => setCalcPurity(p)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Select purity ${p}`}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={
                          calcMetal === 'SILVER'
                            ? gradientPresets.silverMetallic
                            : gradientPresets.goldMetallic
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.purityChipActiveGrad}
                      >
                        <Text style={styles.purityChipTextActive}>{p}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.purityChipInactive}>
                        <Text style={styles.purityChipText}>{p}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Weight Input */}
            <Text style={[styles.calcFieldLabel, { marginTop: 14 }]}>
              {t('calcWeight')}
            </Text>
            <View style={styles.calcInputWrapper}>
              <TextInput
                style={styles.calcInput}
                value={calcWeight}
                onChangeText={setCalcWeight}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={darkTheme.colors.textMuted}
                selectTextOnFocus
              />
              <View style={styles.calcInputUnit}>
                <Text style={styles.calcInputUnitText}>grams</Text>
              </View>
            </View>

            {/* Live Computed Value Display */}
            <View
              style={[
                styles.calcResultBox,
                calcMetal === 'SILVER' && styles.calcResultBoxSilver,
              ]}
            >
              <View style={styles.calcResultLeft}>
                <Text
                  style={[
                    styles.calcResultLabel,
                    calcMetal === 'SILVER' && styles.calcResultLabelSilver,
                  ]}
                >
                  {t('calculatedEstValue')}
                </Text>
                <Text
                  style={[
                    styles.calcResultFormula,
                    calcMetal === 'SILVER' && styles.calcResultFormulaSilver,
                  ]}
                >
                  {calcWeightNumber}g × {formatCurrency(activeRatePerGram)}/g
                </Text>
              </View>
              <Text
                style={[
                  styles.calcResultValue,
                  calcMetal === 'SILVER' && styles.calcResultValueSilver,
                ]}
              >
                {formatCurrency(calculatedValue)}
              </Text>
            </View>

            {/* Resale Disclaimer Note */}
            <View style={styles.disclaimerNoteRow}>
              <Feather
                name="info"
                size={14}
                color={calcMetal === 'SILVER' ? '#CBD5E1' : darkTheme.colors.gold}
                style={{ marginTop: 2 }}
              />
              <Text style={styles.disclaimerNoteText}>
                {t('resaleAdvisoryNote')}
              </Text>
            </View>
          </View>
        </View>

        {/* ==================================================== */}
        {/* 5. IN-APP NOTIFICATION INBOX LAUNCHER                */}
        {/* ==================================================== */}
        <TouchableOpacity
          style={styles.notifLauncherCard}
          onPress={() => setShowNotifModal(true)}
          accessibilityRole="button"
          accessibilityLabel={t('notificationsInbox')}
        >
          <View style={styles.notifLauncherLeft}>
            <View style={styles.notifIconCircle}>
              <Feather name="bell" size={18} color={darkTheme.colors.gold} />
            </View>
            <View style={styles.notifTextCol}>
              <View style={styles.notifTitleRow}>
                <Text style={styles.notifLauncherTitle}>
                  {t('notificationsInbox')}
                </Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {t('unreadCountLabel', { count: unreadCount })}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.notifLauncherSubtitle}>
                {t('notificationsSubtitle')}
              </Text>
            </View>
          </View>

          <Feather
            name="chevron-right"
            size={18}
            color={darkTheme.colors.textMuted}
          />
        </TouchableOpacity>

        {/* ==================================================== */}
        {/* 6. APP / LEGAL & SECURITY INFORMATION                */}
        {/* ==================================================== */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.termsCardContent}
            onPress={() => setShowTermsModal(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('termsAndConditions')}
          >
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

            <View style={styles.viewTermsAction}>
              <Text style={styles.viewTermsActionText}>{t('viewTerms')}</Text>
              <Feather name="arrow-right" size={14} color={darkTheme.colors.gold} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ==================================================== */}
        {/* 7. APP INFORMATION FOOTER                            */}
        {/* ==================================================== */}
        <View style={styles.appFooter}>
          <Text style={styles.appFooterBrand}>MyGold • Bullion Wallet</Text>
          <Text style={styles.appFooterVersion}>
            {t('version')} {APP_VERSION}
          </Text>
        </View>
      </ScrollView>

      {/* ==================================================== */}
      {/* IN-APP NOTIFICATION INBOX MODAL                      */}
      {/* ==================================================== */}
      <Modal
        visible={showNotifModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotifModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowNotifModal(false)}
        >
          <Pressable style={styles.notifModalCard} onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View style={styles.notifModalHeader}>
              <View style={styles.notifModalHeaderLeft}>
                <Feather name="bell" size={18} color={darkTheme.colors.gold} />
                <Text style={styles.notifModalTitle}>
                  {t('notificationsInbox')}
                </Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadHeaderTag}>
                    <Text style={styles.unreadHeaderTagText}>{unreadCount}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowNotifModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Close notifications modal"
              >
                <Feather name="x" size={18} color={darkTheme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Notification Actions Row */}
            {notifications.length > 0 && (
              <View style={styles.notifModalActionsRow}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={handleMarkAllRead}
                    accessibilityRole="button"
                    accessibilityLabel={t('markAllRead')}
                  >
                    <Text style={styles.notifActionLinkText}>
                      ✓ {t('markAllRead')}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleClearAll}
                  style={{ marginLeft: 'auto' }}
                  accessibilityRole="button"
                  accessibilityLabel={t('clearAll')}
                >
                  <Text style={styles.notifClearLinkText}>{t('clearAll')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Notification List Scroll */}
            <ScrollView
              style={styles.notifListScroll}
              contentContainerStyle={styles.notifListContent}
              showsVerticalScrollIndicator
            >
              {loadingNotifs ? (
                <View style={styles.notifEmptyState}>
                  <ActivityIndicator size="small" color={darkTheme.colors.gold} />
                </View>
              ) : notifError ? (
                <View style={styles.notifEmptyState}>
                  <Feather
                    name="alert-circle"
                    size={28}
                    color={darkTheme.colors.loss}
                  />
                  <Text style={styles.notifEmptyText}>{notifError}</Text>
                  <TouchableOpacity
                    onPress={loadNotifications}
                    activeOpacity={0.88}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading"
                  >
                    <LinearGradient
                      colors={gradientPresets.goldMetallic}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.retryButton}
                    >
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : notifications.length === 0 ? (
                <View style={styles.notifEmptyState}>
                  <Feather
                    name="bell-off"
                    size={36}
                    color={darkTheme.colors.textMuted}
                  />
                  <Text style={styles.notifEmptyText}>{t('allCaughtUp')}</Text>
                </View>
              ) : (
                notifications.map((item) => {
                  const isRead = Boolean(item.is_read);
                  return (
                    <TouchableOpacity
                      key={`notif-item-${item.id}`}
                      style={[
                        styles.notifItemCard,
                        !isRead && styles.notifItemCardUnread,
                      ]}
                      onPress={() => !isRead && handleMarkOneRead(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={item.title || 'Notification'}
                    >
                      <View style={styles.notifItemHeader}>
                        <View style={styles.notifItemIconCircle}>
                          <Feather
                            name={
                              item.type === 'portfolio'
                                ? 'pie-chart'
                                : 'trending-up'
                            }
                            size={14}
                            color={darkTheme.colors.gold}
                          />
                        </View>
                        <Text style={styles.notifItemTitle} numberOfLines={1}>
                          {item.title || 'Market Update'}
                        </Text>
                        {!isRead && <View style={styles.unreadDot} />}
                      </View>

                      <Text style={styles.notifItemBody}>
                        {item.message || item.body || ''}
                      </Text>

                      {item.created_at ? (
                        <Text style={styles.notifItemTime}>
                          {formatReadableDate(item.created_at, language)}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
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
    paddingTop: 10,
    paddingBottom: 40,
    gap: 16,
  },

  // 1. Header
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  headerTitleCol: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: darkTheme.colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    lineHeight: 17,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: darkTheme.colors.profit,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: darkTheme.colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    ...darkTheme.shadows.card,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: darkTheme.colors.lossBg,
    borderWidth: 1,
    borderColor: darkTheme.colors.lossBorder,
  },
  errorNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.colors.loss,
    flex: 1,
  },

  // 2. Segmented Navigation
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    gap: 6,
  },
  segmentTabTouch: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentTabActiveGrad: {
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...darkTheme.shadows.button,
  },
  segmentTabInactive: {
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  segmentTabText: {
    fontSize: 14,
    fontWeight: '800',
    color: darkTheme.colors.textMuted,
  },
  segmentTabTextActiveGold: {
    color: '#080B12',
    fontWeight: '900',
  },
  segmentTabTextActiveSilver: {
    color: '#080B12',
    fontWeight: '900',
  },

  // 3. Rate Cards
  ratesList: {
    gap: 12,
  },
  rateCard: {
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    padding: 16,
    gap: 14,
    ...darkTheme.shadows.card,
  },
  rateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.borderSubtle,
  },
  badgeAndName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  goldBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#080B12',
  },
  silverBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  silverBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  rateCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
  },
  rateCardSubtitle: {
    fontSize: 11,
    color: darkTheme.colors.textMuted,
    marginTop: 2,
  },
  purityTagGold: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(232, 179, 49, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.3)',
  },
  purityTagGoldText: {
    fontSize: 11,
    fontWeight: '800',
    color: darkTheme.colors.gold,
  },
  purityTagSilver: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(203, 213, 225, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.25)',
  },
  purityTagSilverText: {
    fontSize: 11,
    fontWeight: '800',
    color: darkTheme.colors.textSecondary,
  },
  rateGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  rateMetricBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
  },
  rateMetricBoxHighlight: {
    backgroundColor: 'rgba(232, 179, 49, 0.1)',
    borderColor: 'rgba(232, 179, 49, 0.3)',
  },
  rateMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
    textTransform: 'uppercase',
  },
  rateMetricLabelHighlight: {
    fontSize: 11,
    fontWeight: '800',
    color: darkTheme.colors.gold,
    textTransform: 'uppercase',
  },
  rateMetricValue: {
    fontSize: 17,
    fontWeight: '900',
    color: darkTheme.colors.textPrimary,
    marginTop: 4,
  },
  rateMetricValueHighlight: {
    fontSize: 17,
    fontWeight: '900',
    color: darkTheme.colors.gold,
    marginTop: 4,
  },

  // Silver 3-Col Grid
  silverRateGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  silverMetricBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    alignItems: 'center',
  },
  silverMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
  },
  silverMetricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },

  // Shared Card Styles
  card: {
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    overflow: 'hidden',
    ...darkTheme.shadows.card,
  },
  cardHeader: {
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

  // 4. Calculator Styles
  calcMetalToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  calcMetalTouch: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  calcMetalActiveGrad: {
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...darkTheme.shadows.button,
  },
  calcMetalInactive: {
    height: 44,
    borderRadius: 14,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calcMetalOptionText: {
    fontSize: 13,
    fontWeight: '800',
    color: darkTheme.colors.textMuted,
  },
  calcMetalOptionTextActiveGold: {
    color: '#080B12',
    fontWeight: '900',
    fontSize: 13,
  },
  calcMetalOptionTextActiveSilver: {
    color: '#080B12',
    fontWeight: '900',
    fontSize: 13,
  },
  calcFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  purityChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  purityChipTouch: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  purityChipActiveGrad: {
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purityChipInactive: {
    height: 42,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purityChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: darkTheme.colors.textSecondary,
  },
  purityChipTextActive: {
    color: '#080B12',
    fontWeight: '900',
    fontSize: 12,
  },
  calcInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    borderRadius: 14,
    height: 50,
    overflow: 'hidden',
  },
  calcInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
  },
  calcInputUnit: {
    paddingHorizontal: 16,
    borderLeftWidth: 1,
    borderLeftColor: darkTheme.colors.borderSubtle,
    height: '100%',
    justifyContent: 'center',
  },
  calcInputUnitText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
  },
  calcResultBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(232, 179, 49, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  calcResultLeft: {
    flex: 1,
  },
  calcResultLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: darkTheme.colors.gold,
    textTransform: 'uppercase',
  },
  calcResultFormula: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  calcResultValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FBBF24',
  },
  calcResultBoxSilver: {
    backgroundColor: 'rgba(203, 213, 225, 0.08)',
    borderColor: 'rgba(203, 213, 225, 0.35)',
  },
  calcResultLabelSilver: {
    color: '#CBD5E1',
  },
  calcResultFormulaSilver: {
    color: '#94A3B8',
  },
  calcResultValueSilver: {
    color: '#F8FAFC',
  },
  disclaimerNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
  },
  disclaimerNoteText: {
    fontSize: 11,
    color: darkTheme.colors.textMuted,
    lineHeight: 16,
    flex: 1,
    fontStyle: 'italic',
  },

  // 5. In-App Notification Launcher Card
  notifLauncherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 22,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    ...darkTheme.shadows.card,
  },
  notifLauncherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    paddingRight: 10,
  },
  notifIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(232, 179, 49, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTextCol: {
    flex: 1,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  notifLauncherTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
  },
  unreadBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: darkTheme.colors.profitBg,
    borderWidth: 1,
    borderColor: darkTheme.colors.profitBorder,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: darkTheme.colors.profit,
  },
  notifLauncherSubtitle: {
    fontSize: 11,
    color: darkTheme.colors.textMuted,
    lineHeight: 15,
  },

  // 6. Security & Legal Statements
  securityStatementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  securityStatementText: {
    fontSize: 12,
    color: darkTheme.colors.textSecondary,
    lineHeight: 17,
    flex: 1,
    fontWeight: '500',
  },
  termsCardContent: {
    padding: 16,
  },
  termsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  termsIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(232, 179, 49, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsTextCol: {
    flex: 1,
  },
  termsCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    letterSpacing: 0.3,
  },
  termsCardSubtitle: {
    fontSize: 11,
    color: darkTheme.colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  viewTermsAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingTop: 12,
  },
  viewTermsActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.gold,
  },

  // 7. App Footer
  appFooter: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 2,
  },
  appFooterBrand: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
  },
  appFooterVersion: {
    fontSize: 11,
    fontWeight: '600',
    color: darkTheme.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Modal Shared Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  notifModalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: darkTheme.colors.backgroundCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    overflow: 'hidden',
    ...darkTheme.shadows.card,
  },
  notifModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.borderSubtle,
  },
  notifModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifModalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: darkTheme.colors.textPrimary,
  },
  unreadHeaderTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(232, 179, 49, 0.2)',
  },
  unreadHeaderTagText: {
    fontSize: 11,
    fontWeight: '900',
    color: darkTheme.colors.gold,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifModalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.borderSubtle,
    backgroundColor: darkTheme.colors.backgroundSubtle,
  },
  notifActionLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.gold,
  },
  notifClearLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.loss,
  },
  notifListScroll: {
    flex: 1,
  },
  notifListContent: {
    padding: 20,
    gap: 12,
  },
  notifEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  notifEmptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#080B12',
  },
  notifItemCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    gap: 8,
  },
  notifItemCardUnread: {
    borderColor: 'rgba(232, 179, 49, 0.35)',
    backgroundColor: 'rgba(232, 179, 49, 0.05)',
  },
  notifItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifItemIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(232, 179, 49, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    flex: 1,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: darkTheme.colors.gold,
  },
  notifItemBody: {
    fontSize: 12,
    color: darkTheme.colors.textSecondary,
    lineHeight: 17,
  },
  notifItemTime: {
    fontSize: 10,
    color: darkTheme.colors.textMuted,
    fontWeight: '600',
  },
});
