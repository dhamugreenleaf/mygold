import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useAuth from '../../hooks/useAuth';
import useGoldRate from '../../hooks/useGoldRate';
import { getPortfolio } from '../../services/portfolioService';
import { formatCurrency, formatGrams } from '../../utils/formatters';
import { darkTheme } from '../../constants/theme';
import { gradientPresets } from '../../constants/colors';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const {
    rate24K,
    rate22K,
    rate18K,
    silverRate,
    silverRate925,
    silverRate916,
    silverRate900,
    loading: ratesLoading,
    error: ratesError,
    getLiveRate,
    refreshGoldRates,
  } = useGoldRate();

  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMetal, setSelectedMetal] = useState('gold');

  // Load portfolio overview
  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const res = await getPortfolio();
      if (res?.data) {
        setPortfolioData(res.data);
      } else if (res?.summary || res?.purchases) {
        setPortfolioData(res);
      }
    } catch (err) {
      console.error('[HomeScreen] Failed to fetch portfolio:', err?.message || err);
      setError('Unable to load your vault. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Pull to refresh & manual refresh handler
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([loadDashboard(), refreshGoldRates()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, loadDashboard, refreshGoldRates]);

  // Live valuation calculation matching the existing web business logic
  const liveSummary = useMemo(() => {
    const rawPurchases = portfolioData?.purchases || [];
    let totalInvested = 0;
    let currentLiveValue = 0;

    let goldWeight = 0;
    let goldValue = 0;

    let silverWeight = 0;
    let silverValue = 0;

    rawPurchases.forEach((p) => {
      const isSilver = (p.asset_type || '').toUpperCase() === 'SILVER';
      const purity = (p.gold_purity || p.purity || (isSilver ? '999' : '22K')).toUpperCase();
      const weight = Number(p.weight) || 0;

      const purchaseAmount =
        p.purchase_amount != null
          ? Number(p.purchase_amount)
          : p.purchase_rate != null
          ? Number((weight * Number(p.purchase_rate)).toFixed(2))
          : 0;

      totalInvested += purchaseAmount;
      const liveRate = getLiveRate(isSilver ? 'SILVER' : 'GOLD', purity);
      const itemLiveValue = weight * liveRate;
      currentLiveValue += itemLiveValue;

      if (isSilver) {
        silverWeight += weight;
        silverValue += itemLiveValue;
      } else {
        goldWeight += weight;
        goldValue += itemLiveValue;
      }
    });

    const totalProfit = rawPurchases.length > 0 ? currentLiveValue - totalInvested : 0;
    const totalProfitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return {
      total_items: rawPurchases.length,
      total_invested: totalInvested,
      current_value: currentLiveValue,
      total_profit: totalProfit,
      total_profit_percentage: totalProfitPercentage,
      is_profit: totalProfit >= 0,
      gold: { weight: goldWeight, currentValue: goldValue },
      silver: { weight: silverWeight, currentValue: silverValue },
    };
  }, [portfolioData, getLiveRate]);

  // Up to 4 recent assets
  const recentPurchases = useMemo(() => {
    return (
      portfolioData?.recent_purchases?.slice(0, 4) ||
      portfolioData?.purchases?.slice(0, 4) ||
      []
    );
  }, [portfolioData]);

  // Gold rates list
  const goldRatesList = useMemo(
    () => [
      {
        name: '24 Karat Pure Gold',
        purity: '99.9%',
        badge: '24K',
        rate: rate24K,
        pounRate: rate24K * 8,
      },
      {
        name: '22 Karat Standard Gold',
        purity: '91.6%',
        badge: '22K',
        rate: rate22K,
        pounRate: rate22K * 8,
      },
      {
        name: '18 Karat Jewellery Gold',
        purity: '75.0%',
        badge: '18K',
        rate: rate18K,
        pounRate: rate18K * 8,
      },
    ],
    [rate24K, rate22K, rate18K]
  );

  // Silver rates list
  const silverRatesList = useMemo(
    () => [
      {
        name: 'Fine Silver 999',
        purity: '99.9%',
        badge: '999',
        rate: silverRate,
      },
      {
        name: 'Sterling Silver 925',
        purity: '92.5%',
        badge: '925',
        rate: silverRate925,
      },
      {
        name: 'Hallmark Silver 916',
        purity: '91.6%',
        badge: '916',
        rate: silverRate916,
      },
      {
        name: 'Jewellery Silver 900',
        purity: '90.0%',
        badge: '900',
        rate: silverRate900,
      },
    ],
    [silverRate, silverRate925, silverRate916, silverRate900]
  );

  // Full Screen Error State if portfolio fails completely
  if (error && !portfolioData && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconCircle}>
            <Feather name="alert-circle" size={32} color={darkTheme.colors.loss} />
          </View>
          <Text style={styles.errorTitle}>Unable to load your vault</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            onPress={loadDashboard}
            accessibilityRole="button"
            accessibilityLabel="Try loading vault again"
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#FDE68A', '#F59E0B', '#B45309']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButton}
            >
              <Feather name="refresh-cw" size={16} color="#080B12" style={{ marginRight: 8 }} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Ambient Gold Glow Matching Website */}
      <LinearGradient
        colors={['rgba(245, 158, 11, 0.14)', 'rgba(217, 119, 6, 0.03)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={darkTheme.colors.gold}
            colors={[darkTheme.colors.gold]}
          />
        }
      >
        {/* 1. Welcome & Manual Refresh Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.welcomeText}>
              Hello, {user?.username || 'Investor'}
            </Text>
            <Text style={styles.vaultTitle}>Your Vault</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing || loading}
            accessibilityRole="button"
            accessibilityLabel="Refresh portfolio and live rates"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={darkTheme.colors.gold} />
            ) : (
              <Feather name="refresh-cw" size={18} color={darkTheme.colors.gold} />
            )}
          </TouchableOpacity>
        </View>

        {/* Initial Loading Skeleton Placeholder */}
        {loading && !portfolioData ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={darkTheme.colors.gold} />
            <Text style={styles.loadingText}>Loading your vault metrics...</Text>
          </View>
        ) : (
          <>
            {/* 2. Hero Portfolio Valuation Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeSparkle}>✨</Text>
                <Text style={styles.heroBadgeText}>TOTAL CURRENT VAULT VALUE</Text>
              </View>

              <Text style={styles.heroValueText}>
                {formatCurrency(liveSummary.current_value)}
              </Text>

              {/* Breakdown Pills: Total Amount Paid & Estimated Gain/Loss */}
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownPill}>
                  <Text style={styles.breakdownLabel} numberOfLines={1}>
                    Total Amount Paid
                  </Text>
                  <Text style={styles.breakdownValue} numberOfLines={1}>
                    {formatCurrency(liveSummary.total_invested)}
                  </Text>
                </View>

                <View style={styles.breakdownPill}>
                  <Text style={styles.breakdownLabel} numberOfLines={1}>
                    Estimated Gain/Loss
                  </Text>
                  {(() => {
                    const profit = liveSummary.total_profit;
                    const pct = liveSummary.total_profit_percentage;
                    if (profit > 0) {
                      return (
                        <Text style={[styles.breakdownValue, styles.profitText]} numberOfLines={1}>
                          +{formatCurrency(profit)}{' '}
                          <Text style={styles.pctText}>(+{pct.toFixed(2)}%)</Text>
                        </Text>
                      );
                    } else if (profit < 0) {
                      return (
                        <Text style={[styles.breakdownValue, styles.lossText]} numberOfLines={1}>
                          −{formatCurrency(Math.abs(profit))}{' '}
                          <Text style={styles.pctText}>(−{Math.abs(pct).toFixed(2)}%)</Text>
                        </Text>
                      );
                    }
                    return (
                      <Text style={styles.breakdownValue} numberOfLines={1}>
                        {formatCurrency(0)}{' '}
                        <Text style={styles.pctText}>(0.00%)</Text>
                      </Text>
                    );
                  })()}
                </View>
              </View>

              {/* Advisory Resale Note */}
              <Text style={styles.advisoryNote}>
                Note: Actual resale amount may vary depending on the jeweller's buyback rate, purity verification, weight and applicable deductions.
              </Text>
            </View>

            {/* 3. Gold & Silver Split Cards */}
            <View style={styles.splitCardsRow}>
              {/* Gold Split Card */}
              <View style={[styles.splitCard, styles.goldSplitCard]}>
                <View style={styles.splitCardHeader}>
                  <LinearGradient
                    colors={['#FBBF24', '#D97706', '#B45309']}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.medalIconCircle}
                  >
                    <Text style={styles.medalEmoji}>🥇</Text>
                  </LinearGradient>
                  <View style={styles.splitCardMeta}>
                    <Text style={styles.splitCardLabel}>Gold Asset</Text>
                    <Text style={styles.splitCardValue} numberOfLines={1}>
                      {formatCurrency(liveSummary.gold.currentValue)}
                    </Text>
                    <Text style={styles.splitCardWeight} numberOfLines={1}>
                      {formatGrams(liveSummary.gold.weight)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Silver Split Card */}
              <View style={[styles.splitCard, styles.silverSplitCard]}>
                <View style={styles.splitCardHeader}>
                  <LinearGradient
                    colors={['#F1F5F9', '#CBD5E1', '#94A3B8']}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.medalIconCircle}
                  >
                    <Text style={styles.medalEmoji}>🥈</Text>
                  </LinearGradient>
                  <View style={styles.splitCardMeta}>
                    <Text style={styles.splitCardLabel}>Silver Asset</Text>
                    <Text style={styles.splitCardValue} numberOfLines={1}>
                      {formatCurrency(liveSummary.silver.currentValue)}
                    </Text>
                    <Text style={styles.splitCardWeight} numberOfLines={1}>
                      {formatGrams(liveSummary.silver.weight)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 4. Quick Actions */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.primaryActionButtonWrapper}
                onPress={() => navigation.navigate('AddGold')}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Add new gold or silver asset"
              >
                <LinearGradient
                  colors={['#FDE68A', '#F59E0B', '#B45309']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryActionGradient}
                >
                  <Feather name="plus" size={18} color="#080B12" style={styles.actionButtonIcon} />
                  <Text style={styles.primaryActionText}>+ Add Asset</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={() => navigation.navigate('MyGold')}
                accessibilityRole="button"
                accessibilityLabel="View vault details"
              >
                <Text style={styles.secondaryActionText}>Vault Details</Text>
              </TouchableOpacity>
            </View>

            {/* 5. Live Market Rates Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Chennai Live Gold & Silver Rates</Text>
                  <Text style={styles.sectionSubtitle}>Live bullion quotes per gram</Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('More')}
                  accessibilityRole="button"
                  accessibilityLabel="View full market rates in More"
                  style={styles.linkButton}
                >
                  <Text style={styles.linkButtonText}>Full Market</Text>
                  <Feather name="arrow-right" size={14} color={darkTheme.colors.gold} />
                </TouchableOpacity>
              </View>

              {/* Metal Segmented Switcher */}
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={styles.segmentTab}
                  onPress={() => setSelectedMetal('gold')}
                  activeOpacity={0.85}
                  accessibilityRole="tab"
                  accessibilityLabel="View Gold Rates"
                >
                  {selectedMetal === 'gold' ? (
                    <LinearGradient
                      colors={['#FDE68A', '#F59E0B', '#B45309']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.segmentTabActiveGradient}
                    >
                      <Text style={styles.segmentEmoji}>🥇</Text>
                      <Text style={styles.segmentTextActiveDark}>Gold Rates</Text>
                      {rate24K > 0 && (
                        <Text style={styles.segmentSubtextDark}>
                          ({formatCurrency(rate24K)}/g)
                        </Text>
                      )}
                    </LinearGradient>
                  ) : (
                    <View style={styles.segmentTabInactiveContent}>
                      <Text style={styles.segmentEmoji}>🥇</Text>
                      <Text style={styles.segmentTextInactive}>Gold Rates</Text>
                      {rate24K > 0 && (
                        <Text style={styles.segmentSubtextLight}>
                          ({formatCurrency(rate24K)}/g)
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.segmentTab}
                  onPress={() => setSelectedMetal('silver')}
                  activeOpacity={0.85}
                  accessibilityRole="tab"
                  accessibilityLabel="View Silver Rates"
                >
                  {selectedMetal === 'silver' ? (
                    <LinearGradient
                      colors={['#F1F5F9', '#CBD5E1', '#94A3B8']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.segmentTabActiveGradient}
                    >
                      <Text style={styles.segmentEmoji}>🥈</Text>
                      <Text style={styles.segmentTextActiveDark}>Silver Rates</Text>
                      {silverRate > 0 && (
                        <Text style={styles.segmentSubtextDark}>
                          ({formatCurrency(silverRate)}/g)
                        </Text>
                      )}
                    </LinearGradient>
                  ) : (
                    <View style={styles.segmentTabInactiveContent}>
                      <Text style={styles.segmentEmoji}>🥈</Text>
                      <Text style={styles.segmentTextInactive}>Silver Rates</Text>
                      {silverRate > 0 && (
                        <Text style={styles.segmentSubtextLight}>
                          ({formatCurrency(silverRate)}/g)
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Rates Cards Stack */}
              {ratesLoading && rate24K === 0 ? (
                <View style={styles.ratesLoadingBox}>
                  <ActivityIndicator size="small" color={darkTheme.colors.gold} />
                  <Text style={styles.ratesLoadingText}>Fetching live Chennai rates...</Text>
                </View>
              ) : ratesError && rate24K === 0 ? (
                <View style={styles.ratesFallbackBox}>
                  <Text style={styles.ratesFallbackText}>
                    Live rates temporarily unavailable. Tap refresh above to retry.
                  </Text>
                </View>
              ) : selectedMetal === 'gold' ? (
                <View style={styles.ratesStack}>
                  {goldRatesList.map((item) => (
                    <View key={item.badge} style={styles.rateCard}>
                      <View style={styles.rateCardLeft}>
                        <LinearGradient
                          colors={gradientPresets.goldMetallic}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.goldBadgeBox}
                        >
                          <Text style={styles.badgeTextGold}>{item.badge}</Text>
                        </LinearGradient>
                        <View style={styles.rateCardTitleGroup}>
                          <View style={styles.rateCardNameRow}>
                            <Text style={styles.rateItemName}>{item.name}</Text>
                            <View style={styles.purityTagGold}>
                              <Text style={styles.purityTagGoldText}>{item.purity}</Text>
                            </View>
                          </View>
                          <Text style={styles.pounRateText}>
                            1 Poun (8g): {formatCurrency(item.pounRate)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.rateCardRight}>
                        <Text style={styles.rateUnitLabel}>1 GRAM</Text>
                        <Text style={[styles.rateValueText, styles.rateValueGoldText]}>
                          {formatCurrency(item.rate)}
                          <Text style={styles.ratePerGram}>/g</Text>
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.ratesStack}>
                  {silverRatesList.map((item) => (
                    <View key={item.badge} style={styles.rateCard}>
                      <View style={styles.rateCardLeft}>
                        <LinearGradient
                          colors={gradientPresets.silverMetallic}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.silverBadgeBox}
                        >
                          <Text style={styles.badgeTextSilver}>{item.badge}</Text>
                        </LinearGradient>
                        <View style={styles.rateCardTitleGroup}>
                          <View style={styles.rateCardNameRow}>
                            <Text style={styles.rateItemName}>{item.name}</Text>
                            <View style={styles.purityTagSilver}>
                              <Text style={styles.purityTagSilverText}>{item.purity}</Text>
                            </View>
                          </View>
                          <Text style={styles.pounRateTextSilver}>
                            10g: {formatCurrency(item.rate * 10)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.rateCardRight}>
                        <Text style={styles.rateUnitLabel}>1 GRAM</Text>
                        <Text style={styles.rateValueText}>
                          {formatCurrency(item.rate)}
                          <Text style={styles.ratePerGram}>/g</Text>
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* 6. Recent Assets Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Additions</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('MyGold')}
                  accessibilityRole="button"
                  accessibilityLabel="See all assets in vault"
                  style={styles.linkButton}
                >
                  <Text style={styles.linkButtonText}>See All</Text>
                  <Feather name="arrow-right" size={14} color={darkTheme.colors.gold} />
                </TouchableOpacity>
              </View>

              {recentPurchases.length > 0 ? (
                <View style={styles.recentAssetsStack}>
                  {recentPurchases.map((purchase) => {
                    const isSilver = (purchase.asset_type || '').toUpperCase() === 'SILVER';
                    const purity =
                      purchase.gold_purity || purchase.purity || (isSilver ? '999' : '22K');
                    const weight = Number(purchase.weight) || 0;
                    const liveRate = getLiveRate(isSilver ? 'SILVER' : 'GOLD', purity);
                    const currentValue = weight * liveRate;

                    const purchaseAmount =
                      purchase.purchase_amount != null
                        ? Number(purchase.purchase_amount)
                        : purchase.purchase_rate != null
                        ? Number((weight * Number(purchase.purchase_rate)).toFixed(2))
                        : 0;

                    const profit = currentValue - purchaseAmount;

                    return (
                      <TouchableOpacity
                        key={purchase.id || `purchase-${Math.random()}`}
                        style={styles.recentAssetCard}
                        onPress={() => navigation.navigate('MyGold')}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`View ${purchase.gold_name || purchase.item_name || 'asset'} details`}
                      >
                        <View style={styles.recentAssetLeft}>
                          <View style={styles.assetEmojiBox}>
                            <Text style={styles.assetEmoji}>{isSilver ? '🥈' : '🥇'}</Text>
                          </View>
                          <View style={styles.assetMetaGroup}>
                            <Text style={styles.assetName} numberOfLines={1}>
                              {purchase.gold_name ||
                                purchase.item_name ||
                                (isSilver ? 'Silver Asset' : 'Gold Asset')}
                            </Text>
                            <Text style={styles.assetSubtitle}>
                              {purity} • {formatGrams(weight)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.recentAssetRight}>
                          <Text style={styles.assetValueText} numberOfLines={1}>
                            {formatCurrency(currentValue)}
                          </Text>
                          {profit > 0 ? (
                            <Text style={styles.assetProfitText} numberOfLines={1}>
                              +{formatCurrency(profit)}
                            </Text>
                          ) : profit < 0 ? (
                            <Text style={styles.assetLossText} numberOfLines={1}>
                              −{formatCurrency(Math.abs(profit))}
                            </Text>
                          ) : (
                            <Text style={styles.assetNeutralText} numberOfLines={1}>
                              {formatCurrency(0)}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                /* Empty Vault State */
                <View style={styles.emptyVaultCard}>
                  <View style={styles.emptyVaultIconCircle}>
                    <Text style={styles.emptyVaultEmoji}>📦</Text>
                  </View>
                  <Text style={styles.emptyVaultTitle}>Your vault is empty</Text>
                  <Text style={styles.emptyVaultSubtitle}>
                    Start tracking your gold and silver assets with live valuation.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyAddButton}
                    onPress={() => navigation.navigate('AddGold')}
                    accessibilityRole="button"
                    accessibilityLabel="Add your first asset"
                  >
                    <Feather name="plus" size={16} color="#080B12" style={{ marginRight: 6 }} />
                    <Text style={styles.emptyAddButtonText}>Add Asset</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },

  // 1. Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 13,
    fontWeight: '600',
    color: darkTheme.colors.textMuted,
    marginBottom: 2,
  },
  vaultTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    letterSpacing: 0.3,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...darkTheme.shadows.card,
  },

  // Loading Placeholder
  loadingCard: {
    padding: 36,
    borderRadius: 24,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: darkTheme.colors.textMuted,
    fontWeight: '500',
  },

  // Full Screen Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: darkTheme.colors.lossBg,
    borderWidth: 1,
    borderColor: darkTheme.colors.lossBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: darkTheme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.gold,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    ...darkTheme.shadows.button,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#080B12',
  },

  // 2. Hero Portfolio Valuation Card
  heroCard: {
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    alignItems: 'center',
    marginBottom: 14,
    ...darkTheme.shadows.card,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(232, 179, 49, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.25)',
    marginBottom: 10,
  },
  heroBadgeSparkle: {
    fontSize: 11,
    marginRight: 4,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: darkTheme.colors.gold,
    letterSpacing: 0.8,
  },
  heroValueText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: -0.5,
    marginVertical: 4,
    textAlign: 'center',
  },
  breakdownRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  breakdownPill: {
    flex: 1,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  breakdownLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
    marginBottom: 3,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
  },
  profitText: {
    color: darkTheme.colors.profit,
  },
  lossText: {
    color: darkTheme.colors.loss,
  },
  pctText: {
    fontSize: 11,
    fontWeight: '700',
  },
  advisoryNote: {
    fontSize: 10,
    color: darkTheme.colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    lineHeight: 14,
  },

  // 3. Gold & Silver Split Cards
  splitCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  splitCard: {
    flex: 1,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    ...darkTheme.shadows.card,
  },
  goldSplitCard: {
    borderColor: 'rgba(232, 179, 49, 0.25)',
  },
  silverSplitCard: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  splitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  medalIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  goldIconCircle: {
    backgroundColor: 'rgba(232, 179, 49, 0.15)',
  },
  silverIconCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  medalEmoji: {
    fontSize: 18,
  },
  splitCardMeta: {
    flex: 1,
  },
  splitCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
    marginBottom: 1,
  },
  splitCardValue: {
    fontSize: 14,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
  },
  splitCardWeight: {
    fontSize: 11,
    fontWeight: '600',
    color: darkTheme.colors.textSecondary,
    marginTop: 1,
  },

  // 4. Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  primaryActionButtonWrapper: {
    flex: 1,
    borderRadius: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryActionGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  actionButtonIcon: {
    marginRight: 6,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#080B12',
  },
  secondaryActionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    ...darkTheme.shadows.card,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },

  // 5. Sections Common
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: darkTheme.colors.textMuted,
    marginTop: 1,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  linkButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },

  // Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  segmentTab: {
    flex: 1,
    borderRadius: 11,
    overflow: 'hidden',
  },
  segmentTabActiveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 11,
    gap: 4,
  },
  segmentTabInactiveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 11,
    gap: 4,
  },
  segmentEmoji: {
    fontSize: 13,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTextActiveDark: {
    color: '#080B12',
    fontWeight: '900',
  },
  segmentTextActiveWhite: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  segmentTextInactive: {
    color: darkTheme.colors.textMuted,
  },
  segmentSubtext: {
    fontSize: 10,
  },
  segmentSubtextDark: {
    color: '#080B12',
    fontWeight: '700',
    opacity: 0.9,
  },
  segmentSubtextSilverActive: {
    color: '#E2E8F0',
    fontWeight: '600',
  },
  segmentSubtextLight: {
    color: darkTheme.colors.textMuted,
  },

  // Rates Stack
  ratesStack: {
    gap: 8,
  },
  ratesLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 16,
    gap: 10,
  },
  ratesLoadingText: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
  },
  ratesFallbackBox: {
    padding: 16,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
  },
  ratesFallbackText: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
  },
  rateCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
  },
  rateCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  goldBadgeBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    ...darkTheme.shadows.button,
  },
  badgeTextGold: {
    fontSize: 12,
    fontWeight: '900',
    color: '#080B12',
  },
  silverBadgeBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    ...darkTheme.shadows.button,
  },
  badgeTextSilver: {
    fontSize: 11,
    fontWeight: '900',
    color: '#080B12',
  },
  rateValueGoldText: {
    color: '#FBBF24',
  },
  rateCardTitleGroup: {
    flex: 1,
  },
  rateCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rateItemName: {
    fontSize: 13,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
  },
  purityTagGold: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(232, 179, 49, 0.15)',
  },
  purityTagGoldText: {
    fontSize: 9,
    fontWeight: '800',
    color: darkTheme.colors.gold,
  },
  purityTagSilver: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  purityTagSilverText: {
    fontSize: 9,
    fontWeight: '800',
    color: darkTheme.colors.textSecondary,
  },
  pounRateText: {
    fontSize: 11,
    fontWeight: '700',
    color: darkTheme.colors.gold,
    marginTop: 2,
  },
  pounRateTextSilver: {
    fontSize: 11,
    fontWeight: '600',
    color: darkTheme.colors.textSecondary,
    marginTop: 2,
  },
  rateCardRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  rateUnitLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: darkTheme.colors.textMuted,
    letterSpacing: 0.5,
  },
  rateValueText: {
    fontSize: 15,
    fontWeight: '900',
    color: darkTheme.colors.textPrimary,
    marginTop: 1,
  },
  ratePerGram: {
    fontSize: 11,
    fontWeight: '600',
    color: darkTheme.colors.textMuted,
  },

  // 6. Recent Assets
  recentAssetsStack: {
    gap: 8,
  },
  recentAssetCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
  },
  recentAssetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  assetEmojiBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assetEmoji: {
    fontSize: 17,
  },
  assetMetaGroup: {
    flex: 1,
  },
  assetName: {
    fontSize: 13,
    fontWeight: '700',
    color: darkTheme.colors.textPrimary,
    marginBottom: 2,
  },
  assetSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: darkTheme.colors.textMuted,
  },
  recentAssetRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  assetValueText: {
    fontSize: 14,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
  },
  assetProfitText: {
    fontSize: 11,
    fontWeight: '700',
    color: darkTheme.colors.profit,
    marginTop: 2,
  },
  assetLossText: {
    fontSize: 11,
    fontWeight: '700',
    color: darkTheme.colors.loss,
    marginTop: 2,
  },
  assetNeutralText: {
    fontSize: 11,
    fontWeight: '600',
    color: darkTheme.colors.textMuted,
    marginTop: 2,
  },

  // Empty Vault
  emptyVaultCard: {
    padding: 28,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyVaultIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(232, 179, 49, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyVaultEmoji: {
    fontSize: 22,
  },
  emptyVaultTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    marginBottom: 4,
  },
  emptyVaultSubtitle: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.gold,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    ...darkTheme.shadows.button,
  },
  emptyAddButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#080B12',
  },
});
