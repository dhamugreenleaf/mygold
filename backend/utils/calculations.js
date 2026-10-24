/**
 * Utility functions for precious metals (Gold & Silver) investment and portfolio calculations
 */

/**
 * Calculates financial metrics and document references for a single physical asset (Gold or Silver)
 */
export const calculatePurchaseDetails = (purchase, currentRates = {}) => {
  const assetType = (purchase.asset_type || 'GOLD').toUpperCase();
  const rawPurity = (purchase.gold_purity || (assetType === 'SILVER' ? '999' : '22K')).toUpperCase();
  const weight = Number(purchase.weight) || 0;
  
  // Total Amount Paid (Purchase Amount)
  const purchaseAmount = purchase.purchase_amount != null 
    ? Number(purchase.purchase_amount) 
    : (purchase.purchase_rate != null ? Number((weight * Number(purchase.purchase_rate)).toFixed(2)) : 0);

  // Effective Purchase Rate (if not explicitly provided, derived from purchaseAmount / weight)
  const purchaseRate = purchase.purchase_rate != null 
    ? Number(purchase.purchase_rate) 
    : (weight > 0 ? Number((purchaseAmount / weight).toFixed(2)) : 0);

  const purchaseValue = purchaseAmount;

  // Determine current rate based on asset_type and purity
  let currentRate = null;

  if (currentRates && typeof currentRates === 'object') {
    if (assetType === 'SILVER') {
      const baseSilver = Number(currentRates['999'] ?? currentRates['silver'] ?? currentRates['Silver'] ?? currentRates['silverRate'] ?? 0);
      if (rawPurity.includes('925') || rawPurity === '925') {
        currentRate = currentRates['925'] != null ? Number(currentRates['925']) : (baseSilver > 0 ? Number((baseSilver * (92.5 / 99.9)).toFixed(2)) : null);
      } else if (rawPurity.includes('916') || rawPurity === '916') {
        currentRate = currentRates['916'] != null ? Number(currentRates['916']) : (baseSilver > 0 ? Number((baseSilver * (91.6 / 99.9)).toFixed(2)) : null);
      } else if (rawPurity.includes('900') || rawPurity === '900') {
        currentRate = currentRates['900'] != null ? Number(currentRates['900']) : (baseSilver > 0 ? Number((baseSilver * (90.0 / 99.9)).toFixed(2)) : null);
      } else {
        // Default 999 Fine Silver
        currentRate = baseSilver > 0 ? baseSilver : null;
      }
    } else {
      // GOLD asset type
      if (rawPurity === '24K' || rawPurity.includes('24K')) {
        currentRate = currentRates['24K'] != null ? Number(currentRates['24K']) : null;
      } else if (rawPurity === '18K' || rawPurity.includes('18K')) {
        if (currentRates['18K'] != null) {
          currentRate = Number(currentRates['18K']);
        } else if (currentRates['24K'] != null) {
          currentRate = Number((Number(currentRates['24K']) * 0.75).toFixed(2));
        }
      } else {
        // Default 22K Standard Gold
        currentRate = currentRates['22K'] != null ? Number(currentRates['22K']) : null;
      }
    }
  }

  const hasValidRate = currentRate !== null && !isNaN(currentRate) && currentRate > 0;
  const currentValue = hasValidRate ? Number((weight * currentRate).toFixed(2)) : null;
  const profitLoss = hasValidRate ? Number((currentValue - purchaseAmount).toFixed(2)) : null;
  const profitLossPercentage = (hasValidRate && purchaseAmount > 0)
    ? Number(((profitLoss / purchaseAmount) * 100).toFixed(2))
    : null;

  // Extract structured documents
  const docs = purchase.documents || [];
  const invoiceDoc = docs.find((d) => d.document_type === 'INVOICE');
  const jewelleryDoc = docs.find((d) => d.document_type === 'JEWELLERY_PHOTO');

  const documents = {
    invoice: invoiceDoc ? {
      id: invoiceDoc.id,
      originalName: invoiceDoc.original_name,
      mimeType: invoiceDoc.mime_type,
      fileSize: invoiceDoc.file_size,
      url: `/api/purchases/${purchase.id}/invoice`,
    } : null,
    jewelleryPhoto: jewelleryDoc ? {
      id: jewelleryDoc.id,
      originalName: jewelleryDoc.original_name,
      mimeType: jewelleryDoc.mime_type,
      fileSize: jewelleryDoc.file_size,
      url: `/api/purchases/${purchase.id}/jewellery-photo`,
    } : null,
  };

  return {
    id: purchase.id,
    user_id: purchase.user_id,
    asset_type: assetType, // 'GOLD' | 'SILVER'
    metal_type: assetType,
    gold_name: purchase.gold_name,
    item_name: purchase.gold_name,
    gold_purity: rawPurity,
    purity: rawPurity,
    weight: Number(weight.toFixed(3)),
    weight_unit: 'grams',
    purchase_date: purchase.purchase_date,
    purchase_rate: Number(purchaseRate.toFixed(2)),
    purchase_amount: Number(purchaseAmount.toFixed(2)),
    purchase_value: Number(purchaseAmount.toFixed(2)),
    amount_paid: Number(purchaseAmount.toFixed(2)),
    // Optional Invoice breakdown
    gold_value: purchase.gold_value != null ? Number(purchase.gold_value) : null,
    making_charges: purchase.making_charges != null ? Number(purchase.making_charges) : null,
    wastage: purchase.wastage != null ? Number(purchase.wastage) : null,
    gst: purchase.gst != null ? Number(purchase.gst) : null,
    other_charges: purchase.other_charges != null ? Number(purchase.other_charges) : null,
    total_invoice_amount: purchase.total_invoice_amount != null ? Number(purchase.total_invoice_amount) : null,
    current_rate: hasValidRate ? Number(currentRate.toFixed(2)) : null,
    current_value: currentValue,
    profit_loss: profitLoss,
    profit_loss_percentage: profitLossPercentage,
    is_profit: profitLoss !== null ? profitLoss >= 0 : null,
    isRateUnavailable: !hasValidRate,
    documents,
    invoice_document: documents.invoice,
    jewel_document: documents.jewelleryPhoto,
    invoice: documents.invoice,
    photo: documents.jewelleryPhoto,
    invoice_url: documents.invoice ? documents.invoice.url : null,
    jewel_url: documents.jewelleryPhoto ? documents.jewelleryPhoto.url : null,
    photo_url: documents.jewelleryPhoto ? documents.jewelleryPhoto.url : null,
    invoice_image: documents.invoice ? documents.invoice.url : null,
    jewellery_image: documents.jewelleryPhoto ? documents.jewelleryPhoto.url : null,
    created_at: purchase.created_at,
    updated_at: purchase.updated_at,
  };
};

/**
 * Calculates aggregated summary for the user's precious metals portfolio
 * Computes combined totals and individual breakdowns for Gold and Silver
 */
export const calculatePortfolioSummary = (purchasesWithDetails = []) => {
  let totalInvested = 0;
  let currentPortfolioValue = 0;
  let anyRateUnavailable = false;

  // Gold specific aggregations
  let goldWeight = 0;
  let goldInvested = 0;
  let goldCurrentValue = 0;
  let goldCount = 0;
  let goldRateUnavailable = false;

  // Silver specific aggregations
  let silverWeight = 0;
  let silverInvested = 0;
  let silverCurrentValue = 0;
  let silverCount = 0;
  let silverRateUnavailable = false;

  purchasesWithDetails.forEach((item) => {
    const isGold = item.asset_type === 'GOLD';
    const isSilver = item.asset_type === 'SILVER';
    const itemWeight = Number(item.weight) || 0;
    const itemInvested = Number(item.purchase_value) || 0;
    const hasCurrent = item.current_value !== null && !isNaN(item.current_value);
    const itemCurrent = hasCurrent ? Number(item.current_value) : 0;

    totalInvested += itemInvested;

    if (hasCurrent) {
      currentPortfolioValue += itemCurrent;
    } else {
      anyRateUnavailable = true;
    }

    if (isGold) {
      goldCount += 1;
      goldWeight += itemWeight;
      goldInvested += itemInvested;
      if (hasCurrent) {
        goldCurrentValue += itemCurrent;
      } else {
        goldRateUnavailable = true;
      }
    } else if (isSilver) {
      silverCount += 1;
      silverWeight += itemWeight;
      silverInvested += itemInvested;
      if (hasCurrent) {
        silverCurrentValue += itemCurrent;
      } else {
        silverRateUnavailable = true;
      }
    }
  });

  // Combined metrics
  const hasCalculableCurrentValue = !anyRateUnavailable && purchasesWithDetails.length > 0;
  const totalProfit = hasCalculableCurrentValue
    ? Number((currentPortfolioValue - totalInvested).toFixed(2))
    : (purchasesWithDetails.length === 0 ? 0 : null);

  const totalProfitPercentage = (hasCalculableCurrentValue && totalInvested > 0)
    ? Number(((totalProfit / totalInvested) * 100).toFixed(2))
    : (purchasesWithDetails.length === 0 ? 0 : null);

  // Gold specific metrics
  const goldProfit = (!goldRateUnavailable && goldCount > 0)
    ? Number((goldCurrentValue - goldInvested).toFixed(2))
    : (goldCount === 0 ? 0 : null);

  const goldProfitPercentage = (!goldRateUnavailable && goldInvested > 0)
    ? Number(((goldProfit / goldInvested) * 100).toFixed(2))
    : (goldCount === 0 ? 0 : null);

  // Silver specific metrics
  const silverProfit = (!silverRateUnavailable && silverCount > 0)
    ? Number((silverCurrentValue - silverInvested).toFixed(2))
    : (silverCount === 0 ? 0 : null);

  const silverProfitPercentage = (!silverRateUnavailable && silverInvested > 0)
    ? Number(((silverProfit / silverInvested) * 100).toFixed(2))
    : (silverCount === 0 ? 0 : null);

  return {
    // Combined Portfolio
    total_invested: Number(totalInvested.toFixed(2)),
    current_value: hasCalculableCurrentValue ? Number(currentPortfolioValue.toFixed(2)) : (purchasesWithDetails.length === 0 ? 0 : null),
    total_profit: totalProfit,
    total_profit_percentage: totalProfitPercentage,
    is_profit: totalProfit !== null ? totalProfit >= 0 : true,
    isRateUnavailable: anyRateUnavailable,
    total_items: purchasesWithDetails.length,

    // Backward-compatible fields
    total_weight: Number(goldWeight.toFixed(2)), // For backward compatibility with gold-only widgets
    total_gold_weight: Number(goldWeight.toFixed(2)),
    total_silver_weight: Number(silverWeight.toFixed(2)),

    // Dedicated Gold Breakdown
    gold: {
      total_items: goldCount,
      total_weight: Number(goldWeight.toFixed(2)),
      total_invested: Number(goldInvested.toFixed(2)),
      current_value: (!goldRateUnavailable && goldCount > 0) ? Number(goldCurrentValue.toFixed(2)) : (goldCount === 0 ? 0 : null),
      total_profit: goldProfit,
      total_profit_percentage: goldProfitPercentage,
      is_profit: goldProfit !== null ? goldProfit >= 0 : true,
      isRateUnavailable: goldRateUnavailable,
    },

    // Dedicated Silver Breakdown
    silver: {
      total_items: silverCount,
      total_weight: Number(silverWeight.toFixed(2)),
      total_invested: Number(silverInvested.toFixed(2)),
      current_value: (!silverRateUnavailable && silverCount > 0) ? Number(silverCurrentValue.toFixed(2)) : (silverCount === 0 ? 0 : null),
      total_profit: silverProfit,
      total_profit_percentage: silverProfitPercentage,
      is_profit: silverProfit !== null ? silverProfit >= 0 : true,
      isRateUnavailable: silverRateUnavailable,
    },
  };
};

export default {
  calculatePurchaseDetails,
  calculatePortfolioSummary,
};
