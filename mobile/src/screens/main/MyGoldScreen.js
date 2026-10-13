import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import useGoldRate from '../../hooks/useGoldRate';
import {
  getPurchases,
  deletePurchase,
  getInvoiceUrl,
  getJewelleryPhotoUrl,
} from '../../services/portfolioService';
import { getStoredToken, getApiBaseUrl } from '../../api/api';
import { formatCurrency } from '../../utils/formatters';
import { darkTheme } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { gradientPresets } from '../../constants/colors';
import AssetCard from '../../components/cards/AssetCard';
import ConfirmModal from '../../components/common/ConfirmModal';
import DocumentViewerModal from '../../components/common/DocumentViewerModal';
import EditAssetModal from '../../components/forms/EditAssetModal';
import { useToast } from '../../context/ToastContext';

const ITEMS_PER_PAGE = 5;

export default function MyGoldScreen({ navigation }) {
  const { getLiveRate, refreshGoldRates } = useGoldRate();
  const { showSuccess, showError } = useToast();

  // Screen State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [assetFilter, setAssetFilter] = useState('ALL'); // 'ALL' | 'GOLD' | 'SILVER'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Document Viewer Modal State
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docModalConfig, setDocModalConfig] = useState({
    title: '',
    subtitle: '',
    imageUrl: null,
    documentUrl: null,
    token: null,
    isPdf: false,
  });

  // Edit Asset Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  // Fetch Purchases from GET /purchases
  const loadPurchases = useCallback(async () => {
    try {
      setError(null);
      const res = await getPurchases();
      if (res?.data) {
        setData(res.data);
      } else if (res?.purchases) {
        setData(res);
      } else {
        setData({ purchases: [] });
      }
    } catch (err) {
      console.warn('[MyGoldScreen] Failed to fetch purchases:', err?.message || err);
      setError('Unable to load your physical assets. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  // Pull to refresh & manual refresh
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([loadPurchases(), refreshGoldRates()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, loadPurchases, refreshGoldRates]);

  // Per-Asset Recalculation preserving exact web business logic
  const recalculatedPurchases = useMemo(() => {
    const rawPurchases = data?.purchases || [];
    return rawPurchases.map((purchase) => {
      const isSilver = (purchase.asset_type || '').toUpperCase() === 'SILVER';
      const purity = (purchase.gold_purity || purchase.purity || (isSilver ? '999' : '22K')).toUpperCase();
      const weight = Number(purchase.weight) || 0;

      const purchaseAmount =
        purchase.purchase_amount != null
          ? Number(purchase.purchase_amount)
          : purchase.purchase_rate != null
          ? Number((weight * Number(purchase.purchase_rate)).toFixed(2))
          : 0;

      const currentRate = getLiveRate(isSilver ? 'SILVER' : 'GOLD', purity);
      const hasValidRate = currentRate !== null && !isNaN(currentRate) && currentRate > 0;
      const currentValue = hasValidRate ? Number((weight * currentRate).toFixed(2)) : null;
      const profitLoss = hasValidRate ? Number((currentValue - purchaseAmount).toFixed(2)) : null;
      const profitLossPercentage =
        hasValidRate && purchaseAmount > 0
          ? Number(((profitLoss / purchaseAmount) * 100).toFixed(2))
          : null;

      return {
        ...purchase,
        amount_paid: purchaseAmount,
        purchase_amount: purchaseAmount,
        purchase_value: purchaseAmount,
        current_rate: hasValidRate ? Number(currentRate.toFixed(2)) : null,
        current_value: currentValue,
        profit_loss: profitLoss,
        profit_loss_percentage: profitLossPercentage,
        isRateUnavailable: !hasValidRate,
      };
    });
  }, [data?.purchases, getLiveRate]);

  // Portfolio Valuation Summary Aggregation
  const summary = useMemo(() => {
    let currentPortfolioValue = 0;
    let totalInvested = 0;
    let anyRateUnavailable = false;

    recalculatedPurchases.forEach((p) => {
      totalInvested += Number(p.amount_paid) || 0;
      if (p.current_value !== null) {
        currentPortfolioValue += Number(p.current_value);
      } else {
        anyRateUnavailable = true;
      }
    });

    const totalProfit =
      !anyRateUnavailable && recalculatedPurchases.length > 0
        ? currentPortfolioValue - totalInvested
        : 0;

    return {
      total_items: recalculatedPurchases.length,
      total_invested: totalInvested,
      current_value: !anyRateUnavailable ? Number(currentPortfolioValue.toFixed(2)) : null,
      total_profit: totalProfit,
    };
  }, [recalculatedPurchases]);

  // Search & Metal Filtering
  const filteredPurchases = useMemo(() => {
    return recalculatedPurchases.filter((p) => {
      const isSilver = (p.asset_type || '').toUpperCase() === 'SILVER';
      const purity = (p.gold_purity || p.purity || '').toUpperCase();
      const name = (p.gold_name || p.item_name || '').toLowerCase();

      if (assetFilter === 'GOLD' && isSilver) return false;
      if (assetFilter === 'SILVER' && !isSilver) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!name.includes(q) && !purity.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [recalculatedPurchases, assetFilter, searchQuery]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [assetFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedPurchases = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPurchases.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPurchases, currentPage]);

  // Delete Action Handlers
  const handleDeletePrompt = (id, name) => {
    setItemToDelete({ id, name });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || isDeleting) return;

    try {
      setIsDeleting(true);
      await deletePurchase(itemToDelete.id);
      setDeleteModalOpen(false);
      setItemToDelete(null);
      await loadPurchases();
      showSuccess('The asset has been successfully removed from your vault.', 'Asset Removed');
    } catch (err) {
      console.warn('[MyGoldScreen] Failed to delete purchase:', err?.message || err);
      showError('Unable to remove the asset. Please try again.', 'Error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Edit Action Handler
  const handleEditPress = (purchase) => {
    setItemToEdit(purchase);
    setEditModalOpen(true);
  };

  // View Photo Handler
  const handleViewPhoto = async (purchase) => {
    try {
      const token = await getStoredToken();
      const baseUrl = getApiBaseUrl();
      const photoUrl = getJewelleryPhotoUrl(purchase.id, token);
      const isSilver = (purchase.asset_type || '').toUpperCase() === 'SILVER';
      const itemName = purchase.gold_name || purchase.item_name || (isSilver ? 'Silver Asset' : 'Gold Asset');

      setDocModalConfig({
        title: `Photo - ${itemName}`,
        subtitle: `${purchase.gold_purity || purchase.purity || ''} • ${purchase.weight || 0}g`,
        imageUrl: photoUrl,
        documentUrl: photoUrl,
        token,
        isPdf: false,
      });
      setDocModalOpen(true);
    } catch (err) {
      console.warn('[MyGoldScreen] Error opening photo:', err);
    }
  };

  // View Invoice Handler
  const handleViewInvoice = async (purchase) => {
    try {
      const token = await getStoredToken();
      const invoiceUrl = getInvoiceUrl(purchase.id, token);
      const isSilver = (purchase.asset_type || '').toUpperCase() === 'SILVER';
      const itemName = purchase.gold_name || purchase.item_name || (isSilver ? 'Silver Asset' : 'Gold Asset');

      setDocModalConfig({
        title: `Invoice - ${itemName}`,
        subtitle: `Purchase Date: ${purchase.purchase_date || 'N/A'}`,
        imageUrl: null,
        documentUrl: invoiceUrl,
        token,
        isPdf: true,
      });
      setDocModalOpen(true);
    } catch (err) {
      console.warn('[MyGoldScreen] Error opening invoice:', err);
    }
  };

  // Full Screen Error State
  if (error && !data && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={gradientPresets.ambientGlow}
          style={styles.ambientGlow}
          pointerEvents="none"
        />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconCircle}>
            <Feather name="alert-circle" size={32} color={darkTheme.colors.loss} />
          </View>
          <Text style={styles.errorTitle}>Unable to load your vault</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            onPress={loadPurchases}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Try loading vault assets again"
          >
            <LinearGradient
              colors={gradientPresets.goldMetallic}
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
      <LinearGradient
        colors={gradientPresets.ambientGlow}
        style={styles.ambientGlow}
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
        {/* 1. Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.screenTitle}>Physical Vault Assets</Text>
            <Text style={styles.screenSubtitle}>
              Track all your physical gold & silver assets
            </Text>
          </View>
          <View style={styles.headerButtonsGroup}>
            <TouchableOpacity
              style={styles.refreshIconButton}
              onPress={handleRefresh}
              disabled={refreshing || loading}
              accessibilityRole="button"
              accessibilityLabel="Refresh vault assets"
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={darkTheme.colors.gold} />
              ) : (
                <Feather name="refresh-cw" size={16} color={darkTheme.colors.gold} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('AddGold')}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Add new physical gold or silver asset"
            >
              <LinearGradient
                colors={gradientPresets.goldMetallic}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerAddButton}
              >
                <Feather name="plus" size={15} color="#080B12" style={{ marginRight: 4 }} />
                <Text style={styles.headerAddButtonText}>+ Add Asset</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Initial Loading Indicator */}
        {loading && !data ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={darkTheme.colors.gold} />
            <Text style={styles.loadingText}>Loading your vault assets...</Text>
          </View>
        ) : error && !data ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIconCircle}>
              <Feather name="alert-circle" size={32} color={darkTheme.colors.loss} />
            </View>
            <Text style={styles.errorTitle}>Unable to load vault assets</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadPurchases}
              accessibilityRole="button"
              accessibilityLabel="Try loading assets again"
            >
              <Feather name="refresh-cw" size={16} color="#080B12" style={{ marginRight: 8 }} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 2. Portfolio Valuation Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View style={styles.summaryValueGroup}>
                  <Text style={styles.summaryLabel}>TOTAL CURRENT VAULT VALUE</Text>
                  <Text style={styles.summaryMainValue}>
                    {summary.current_value !== null ? formatCurrency(summary.current_value) : '...'}
                  </Text>
                </View>
                <View style={styles.summaryCountGroup}>
                  <Text style={styles.summaryLabel}>TOTAL ASSETS</Text>
                  <Text style={styles.summaryCountValue}>{summary.total_items}</Text>
                </View>
              </View>

              <Text style={styles.summaryAdvisoryText}>
                Note: Actual resale amount may vary depending on the jeweller's buyback rate, purity verification, weight and applicable deductions.
              </Text>
            </View>

            {/* 3. Search Bar */}
            <View style={styles.searchContainer}>
              <Feather name="search" size={18} color={darkTheme.colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by asset name or purity..."
                placeholderTextColor={darkTheme.colors.textMuted}
                accessibilityLabel="Search vault assets"
                autoCapitalize="none"
              />
              {searchQuery ? (
                <TouchableOpacity
                  style={styles.searchClearBtn}
                  onPress={() => setSearchQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search input"
                >
                  <Feather name="x" size={16} color={darkTheme.colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* 4. Metal Filter Segmented Tabs */}
            <View style={styles.filterTabsRow}>
              {[
                { id: 'ALL', label: 'ALL' },
                { id: 'GOLD', label: 'GOLD' },
                { id: 'SILVER', label: 'SILVER' },
              ].map((filter) => {
                const isActive = assetFilter === filter.id;
                return (
                  <TouchableOpacity
                    key={filter.id}
                    style={styles.filterTabTouch}
                    onPress={() => setAssetFilter(filter.id)}
                    activeOpacity={0.85}
                    accessibilityRole="tab"
                    accessibilityLabel={`Filter by ${filter.label} assets`}
                  >
                    {isActive ? (
                      <LinearGradient
                        colors={
                          filter.id === 'SILVER'
                            ? gradientPresets.silverMetallic
                            : gradientPresets.goldMetallic
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.filterTabActiveGrad}
                      >
                        <Text style={styles.filterTabTextActive}>{filter.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.filterTabInactive}>
                        <Text style={styles.filterTabTextInactive}>{filter.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 5. Asset List */}
            {filteredPurchases.length > 0 ? (
              <View style={styles.assetListContainer}>
                {paginatedPurchases.map((purchase) => (
                  <AssetCard
                    key={purchase.id || `purchase-${Math.random()}`}
                    purchase={purchase}
                    onDeletePrompt={handleDeletePrompt}
                    onEditPress={handleEditPress}
                    onViewPhoto={handleViewPhoto}
                    onViewInvoice={handleViewInvoice}
                  />
                ))}

                {/* Mobile Pagination Bar */}
                {totalPages > 1 && (
                  <View style={styles.paginationBar}>
                    <TouchableOpacity
                      style={[
                        styles.paginationNavBtn,
                        currentPage === 1 && styles.paginationNavBtnDisabled,
                      ]}
                      onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      accessibilityRole="button"
                      accessibilityLabel="Previous page"
                    >
                      <Feather name="chevron-left" size={16} color={currentPage === 1 ? darkTheme.colors.textMuted : darkTheme.colors.textPrimary} />
                      <Text
                        style={[
                          styles.paginationNavText,
                          currentPage === 1 && styles.paginationNavTextDisabled,
                        ]}
                      >
                        Prev
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.paginationIndicatorText}>
                      Page <Text style={styles.paginationBoldText}>{currentPage}</Text> of{' '}
                      <Text style={styles.paginationBoldText}>{totalPages}</Text>
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.paginationNavBtn,
                        currentPage === totalPages && styles.paginationNavBtnDisabled,
                      ]}
                      onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      accessibilityRole="button"
                      accessibilityLabel="Next page"
                    >
                      <Text
                        style={[
                          styles.paginationNavText,
                          currentPage === totalPages && styles.paginationNavTextDisabled,
                        ]}
                      >
                        Next
                      </Text>
                      <Feather name="chevron-right" size={16} color={currentPage === totalPages ? darkTheme.colors.textMuted : darkTheme.colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              /* 6. Empty Vault State */
              <View style={styles.emptyStateCard}>
                <View style={styles.emptyIconCircle}>
                  <Text style={styles.emptyEmoji}>📦</Text>
                </View>
                <Text style={styles.emptyTitle}>
                  {searchQuery || assetFilter !== 'ALL'
                    ? 'No Matching Assets Found'
                    : 'Your Vault is Empty'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery || assetFilter !== 'ALL'
                    ? 'Try adjusting your search query or metal filter.'
                    : 'Start tracking your physical gold and silver assets with live valuation.'}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('AddGold')}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="Add new asset"
                >
                  <LinearGradient
                    colors={gradientPresets.goldMetallic}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyAddButton}
                  >
                    <Feather name="plus" size={16} color="#080B12" style={{ marginRight: 6 }} />
                    <Text style={styles.emptyAddButtonText}>+ Add Asset</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Remove Asset Record"
        message={`Are you sure you want to remove "${itemToDelete?.name || 'this item'}" from your vault? This action cannot be undone.`}
        confirmText="Remove Asset"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        loading={isDeleting}
      />

      {/* Document / Photo Viewer Modal */}
      <DocumentViewerModal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        title={docModalConfig.title}
        subtitle={docModalConfig.subtitle}
        imageUrl={docModalConfig.imageUrl}
        documentUrl={docModalConfig.documentUrl}
        token={docModalConfig.token}
        isPdf={docModalConfig.isPdf}
      />

      {/* Edit Asset Modal */}
      <EditAssetModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setItemToEdit(null);
        }}
        purchase={itemToEdit}
        onUpdated={async () => {
          await Promise.all([loadPurchases(), refreshGoldRates()]);
        }}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 36,
  },

  // 1. Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 4,
  },
  headerTextGroup: {
    flex: 1,
    marginRight: 10,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    letterSpacing: 0.3,
  },
  screenSubtitle: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  headerButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...darkTheme.shadows.card,
  },
  headerAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    ...darkTheme.shadows.button,
  },
  headerAddButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#080B12',
  },

  // Loading State
  loadingBox: {
    padding: 36,
    borderRadius: 20,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: darkTheme.colors.textMuted,
    fontWeight: '600',
  },

  // Error State
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
    fontSize: 18,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 22,
    ...darkTheme.shadows.button,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080B12',
  },

  // 2. Summary Card
  summaryCard: {
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.22)',
    marginBottom: 14,
    ...darkTheme.shadows.card,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  summaryValueGroup: {
    flex: 1,
  },
  summaryCountGroup: {
    alignItems: 'flex-end',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: darkTheme.colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  summaryMainValue: {
    fontSize: 25,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: -0.4,
  },
  summaryCountValue: {
    fontSize: 22,
    fontWeight: '900',
    color: darkTheme.colors.textPrimary,
  },
  summaryAdvisoryText: {
    fontSize: 10,
    color: darkTheme.colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 14,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },

  // 3. Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: darkTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  searchClearBtn: {
    padding: 6,
  },

  // 4. Metal Filter Tabs
  filterTabsRow: {
    flexDirection: 'row',
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    marginBottom: 14,
    gap: 6,
  },
  filterTabTouch: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  filterTabActiveGrad: {
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabInactive: {
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabTextActive: {
    fontSize: 12,
    fontWeight: '800',
    color: '#080B12',
  },
  filterTabTextInactive: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
  },

  // 5. Asset List
  assetListContainer: {
    gap: 10,
  },
  paginationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    marginTop: 6,
  },
  paginationNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    gap: 4,
  },
  paginationNavBtnDisabled: {
    opacity: 0.4,
  },
  paginationNavText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.textPrimary,
  },
  paginationNavTextDisabled: {
    color: darkTheme.colors.textMuted,
  },
  paginationIndicatorText: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    fontWeight: '600',
  },
  paginationBoldText: {
    color: darkTheme.colors.textPrimary,
    fontWeight: '800',
  },

  // 6. Empty State
  emptyStateCard: {
    padding: 32,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(232, 179, 49, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyEmoji: {
    fontSize: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.gold,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    ...darkTheme.shadows.button,
  },
  emptyAddButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#080B12',
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    color: darkTheme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorSubtitle: {
    color: darkTheme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.gold,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#080B12',
    fontWeight: '700',
    fontSize: 14,
  },
});
