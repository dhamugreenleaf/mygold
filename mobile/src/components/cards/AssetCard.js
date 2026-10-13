import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency, formatGrams, formatReadableDate } from '../../utils/formatters';
import { darkTheme } from '../../constants/theme';
import { gradientPresets } from '../../constants/colors';

export default function AssetCard({
  purchase,
  onDeletePrompt,
  onEditPress,
  onViewPhoto,
  onViewInvoice,
}) {
  const [expanded, setExpanded] = useState(false);

  const isSilver = (purchase?.asset_type || '').toUpperCase() === 'SILVER';
  const itemName =
    purchase?.gold_name ||
    purchase?.item_name ||
    (isSilver ? 'Silver Asset' : 'Gold Asset');
  const purity =
    purchase?.gold_purity || purchase?.purity || (isSilver ? '999' : '22K');
  const weight = Number(purchase?.weight) || 0;
  const formattedWeight = formatGrams(weight);

  const amountPaid = Number(
    purchase?.amount_paid ??
      purchase?.purchase_amount ??
      purchase?.purchase_value ??
      0
  ) || 0;
  const currentValue = purchase?.current_value != null ? Number(purchase.current_value) : null;
  const currentRate = purchase?.current_rate != null ? Number(purchase.current_rate) : null;
  const profitLoss = purchase?.profit_loss != null ? Number(purchase.profit_loss) : null;
  const profitLossPct = purchase?.profit_loss_percentage != null ? Number(purchase.profit_loss_percentage) : null;
  const formattedPct =
    profitLossPct !== null && !isNaN(profitLossPct)
      ? Math.abs(profitLossPct).toFixed(2)
      : '0.00';
  const hasRate = !purchase?.isRateUnavailable && currentValue !== null;

  // Optional invoice breakdown presence check
  const hasInvoiceBreakdown = Boolean(
    purchase?.gold_value ||
      purchase?.making_charges ||
      purchase?.wastage ||
      purchase?.gst ||
      purchase?.other_charges ||
      purchase?.total_invoice_amount
  );

  // Document availability
  const invoiceDoc = purchase?.documents?.invoice || purchase?.invoice_document;
  const jewelDoc =
    purchase?.documents?.jewelleryPhoto || purchase?.jewel_document;
  const hasInvoice = Boolean(invoiceDoc || purchase?.invoice_image);
  const hasPhoto = Boolean(jewelDoc || purchase?.jewellery_image);

  return (
    <View
      style={[
        styles.cardContainer,
        expanded && styles.cardContainerExpanded,
      ]}
    >
      {/* Compact Summary View */}
      <TouchableOpacity
        style={styles.summaryRow}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${itemName}, ${purity}, ${formattedWeight}, Value: ${
          hasRate ? formatCurrency(currentValue) : 'Unavailable'
        }. Tap to ${expanded ? 'collapse' : 'expand'} details`}
      >
        <View style={styles.summaryLeft}>
          <LinearGradient
            colors={isSilver ? gradientPresets.silverMetallic : gradientPresets.goldMetallic}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.medalCircle}
          >
            <Text style={styles.medalEmoji}>{isSilver ? '🥈' : '🥇'}</Text>
          </LinearGradient>
          <View style={styles.summaryMeta}>
            <Text style={styles.itemName} numberOfLines={1}>
              {itemName}
            </Text>
            <Text style={styles.itemSubtitle} numberOfLines={1}>
              {purity} • {formattedWeight}
            </Text>
          </View>
        </View>

        <View style={styles.summaryRight}>
          <Text
            style={[
              styles.currentValueText,
              hasRate && !isSilver && styles.goldValueText,
            ]}
            numberOfLines={1}
          >
            {hasRate ? formatCurrency(currentValue) : '—'}
          </Text>
          {hasRate && profitLoss !== null ? (
            profitLoss > 0 ? (
              <Text style={[styles.gainLossText, styles.profitText]} numberOfLines={1}>
                +{formatCurrency(profitLoss)}{' '}
                <Text style={styles.pctText}>
                  (+{formattedPct}%)
                </Text>
              </Text>
            ) : profitLoss < 0 ? (
              <Text style={[styles.gainLossText, styles.lossText]} numberOfLines={1}>
                −{formatCurrency(Math.abs(profitLoss))}{' '}
                <Text style={styles.pctText}>
                  (−{formattedPct}%)
                </Text>
              </Text>
            ) : (
              <Text style={styles.gainLossText} numberOfLines={1}>
                {formatCurrency(0)} (0.00%)
              </Text>
            )
          ) : null}
        </View>

        <View style={styles.chevronBox}>
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={expanded ? darkTheme.colors.gold : darkTheme.colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Details View */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* 2x2 Metrics Layout */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricRow}>
              {/* 1. Current Value */}
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel} numberOfLines={1}>
                  {isSilver ? 'Current Silver Value' : 'Current Gold Value'}
                </Text>
                <Text style={styles.metricValue} numberOfLines={1}>
                  {hasRate ? formatCurrency(currentValue) : '—'}
                </Text>
              </View>

              {/* 2. Estimated Gain/Loss */}
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel} numberOfLines={1}>
                  Estimated Gain/Loss
                </Text>
                {hasRate && profitLoss !== null ? (
                  profitLoss > 0 ? (
                    <Text style={[styles.metricValue, styles.profitText]} numberOfLines={1}>
                      +{formatCurrency(profitLoss)}{' '}
                      <Text style={styles.pctText}>
                        (+{formattedPct}%)
                      </Text>
                    </Text>
                  ) : profitLoss < 0 ? (
                    <Text style={[styles.metricValue, styles.lossText]} numberOfLines={1}>
                      −{formatCurrency(Math.abs(profitLoss))}{' '}
                      <Text style={styles.pctText}>
                        (−{formattedPct}%)
                      </Text>
                    </Text>
                  ) : (
                    <Text style={styles.metricValue} numberOfLines={1}>
                      {formatCurrency(0)} (0.00%)
                    </Text>
                  )
                ) : (
                  <Text style={styles.metricValue}>—</Text>
                )}
              </View>
            </View>

            <View style={styles.metricRow}>
              {/* 3. Amount Paid */}
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel} numberOfLines={1}>
                  Amount Paid
                </Text>
                <Text style={styles.metricValue} numberOfLines={1}>
                  {formatCurrency(amountPaid)}
                </Text>
              </View>

              {/* 4. Current Rate / gram */}
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel} numberOfLines={1}>
                  Current Rate / gram
                </Text>
                <Text style={styles.metricValue} numberOfLines={1}>
                  {hasRate && currentRate ? `${formatCurrency(currentRate)}/g` : '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* Optional Invoice Breakdown */}
          {hasInvoiceBreakdown && (
            <View style={styles.invoiceBreakdownBox}>
              <Text style={styles.invoiceBreakdownTitle}>Invoice Breakdown</Text>
              <View style={styles.breakdownGrid}>
                {purchase?.gold_value ? (
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownItemLabel}>Gold Value:</Text>
                    <Text style={styles.breakdownItemValue}>
                      {formatCurrency(purchase.gold_value)}
                    </Text>
                  </View>
                ) : null}
                {purchase?.making_charges ? (
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownItemLabel}>Making Charges:</Text>
                    <Text style={styles.breakdownItemValue}>
                      {formatCurrency(purchase.making_charges)}
                    </Text>
                  </View>
                ) : null}
                {purchase?.wastage ? (
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownItemLabel}>Wastage:</Text>
                    <Text style={styles.breakdownItemValue}>
                      {formatCurrency(purchase.wastage)}
                    </Text>
                  </View>
                ) : null}
                {purchase?.gst ? (
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownItemLabel}>GST:</Text>
                    <Text style={styles.breakdownItemValue}>
                      {formatCurrency(purchase.gst)}
                    </Text>
                  </View>
                ) : null}
                {purchase?.other_charges ? (
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownItemLabel}>Other Charges:</Text>
                    <Text style={styles.breakdownItemValue}>
                      {formatCurrency(purchase.other_charges)}
                    </Text>
                  </View>
                ) : null}
                {purchase?.total_invoice_amount ? (
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownItemLabel}>Total Invoice:</Text>
                    <Text style={styles.breakdownItemValue}>
                      {formatCurrency(purchase.total_invoice_amount)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {/* Resale Advisory Note */}
          <Text style={styles.advisoryNote}>
            Actual resale amount may vary depending on the jeweller's buyback rate, purity verification, weight and applicable deductions.
          </Text>

          {/* Purchase Date & Edit / Delete Actions */}
          <View style={styles.actionsFooterRow}>
            <View style={styles.dateGroup}>
              <Feather name="calendar" size={13} color={darkTheme.colors.gold} style={{ marginRight: 5 }} />
              <Text style={styles.dateText}>
                Purchased on: {formatReadableDate(purchase?.purchase_date)}
              </Text>
            </View>

            <View style={styles.actionButtonsGroup}>
              <TouchableOpacity
                style={styles.actionTextBtn}
                onPress={() => onEditPress && onEditPress(purchase)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${itemName}`}
              >
                <Feather name="edit-2" size={13} color={darkTheme.colors.gold} style={{ marginRight: 4 }} />
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionTextBtn}
                onPress={() => onDeletePrompt && onDeletePrompt(purchase?.id, itemName)}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${itemName}`}
              >
                <Feather name="trash-2" size={13} color={darkTheme.colors.loss} style={{ marginRight: 4 }} />
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Document Buttons (View Invoice & View Photo) */}
          {(hasInvoice || hasPhoto) && (
            <View style={styles.documentButtonsRow}>
              {hasInvoice && (
                <TouchableOpacity
                  style={styles.docButton}
                  onPress={() => onViewInvoice && onViewInvoice(purchase)}
                  accessibilityRole="button"
                  accessibilityLabel={`View invoice for ${itemName}`}
                >
                  <Feather name="file-text" size={15} color={darkTheme.colors.gold} style={{ marginRight: 6 }} />
                  <Text style={styles.docButtonText}>View Invoice</Text>
                </TouchableOpacity>
              )}

              {hasPhoto && (
                <TouchableOpacity
                  style={styles.docButton}
                  onPress={() => onViewPhoto && onViewPhoto(purchase)}
                  accessibilityRole="button"
                  accessibilityLabel={`View photo for ${itemName}`}
                >
                  <Feather name="image" size={15} color={darkTheme.colors.gold} style={{ marginRight: 6 }} />
                  <Text style={styles.docButtonText}>View Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    overflow: 'hidden',
    ...darkTheme.shadows.card,
  },
  cardContainerExpanded: {
    borderColor: 'rgba(232, 179, 49, 0.4)',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 64,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    marginRight: 8,
  },
  medalCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goldMedalCircle: {
    backgroundColor: 'rgba(232, 179, 49, 0.15)',
  },
  silverMedalCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  medalEmoji: {
    fontSize: 18,
  },
  summaryMeta: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: darkTheme.colors.textMuted,
  },
  summaryRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  currentValueText: {
    fontSize: 14,
    fontWeight: '900',
    color: darkTheme.colors.textPrimary,
  },
  goldValueText: {
    color: '#FBBF24',
  },
  gainLossText: {
    fontSize: 10,
    fontWeight: '700',
    color: darkTheme.colors.textSecondary,
    marginTop: 2,
  },
  profitText: {
    color: darkTheme.colors.profit,
  },
  lossText: {
    color: darkTheme.colors.loss,
  },
  pctText: {
    fontSize: 10,
    fontWeight: '700',
  },
  chevronBox: {
    paddingLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Expanded Content
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  metricsGrid: {
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCell: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
  },

  // Invoice Breakdown
  invoiceBreakdownBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  invoiceBreakdownTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    marginBottom: 6,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 4,
  },
  breakdownItemLabel: {
    fontSize: 10,
    color: darkTheme.colors.textMuted,
    fontWeight: '600',
  },
  breakdownItemValue: {
    fontSize: 11,
    color: darkTheme.colors.textPrimary,
    fontWeight: '800',
  },

  // Advisory Note
  advisoryNote: {
    fontSize: 10,
    color: darkTheme.colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 14,
    backgroundColor: 'rgba(232, 179, 49, 0.08)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.15)',
  },

  // Actions Footer Row
  actionsFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    color: darkTheme.colors.textMuted,
    fontWeight: '600',
  },
  actionButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  editText: {
    fontSize: 12,
    fontWeight: '800',
    color: darkTheme.colors.gold,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '800',
    color: darkTheme.colors.loss,
  },

  // Document Buttons Row
  documentButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  docButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.22)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.textPrimary,
  },
});
