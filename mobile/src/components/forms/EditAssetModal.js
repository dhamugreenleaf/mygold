import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { updatePurchase } from '../../services/portfolioService';
import { darkTheme } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { gradientPresets } from '../../constants/colors';
import { useToast } from '../../context/ToastContext';

const GOLD_SUGGESTIONS = [
  'Gold Chain',
  'Gold Coin',
  'Gold Ring',
  'Gold Bangle',
  'Gold Necklace',
];

const SILVER_SUGGESTIONS = [
  'Silver Bar',
  'Silver Coin',
  'Silver Anklet',
  'Silver Vessel',
  'Silver Ring',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function EditAssetModal({
  isOpen,
  onClose,
  purchase,
  onUpdated,
}) {
  const { showSuccess, showError } = useToast();
  const [assetType, setAssetType] = useState('GOLD');
  const [formData, setFormData] = useState({
    itemName: '',
    purity: '22K',
    weight: '',
    purchaseDate: '',
    totalAmountPaid: '',
    goldValue: '',
    makingCharges: '',
    wastage: '',
    gst: '',
    otherCharges: '',
    totalInvoiceAmount: '',
  });

  const [initialState, setInitialState] = useState(null);
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [invoiceAsset, setInvoiceAsset] = useState(null);
  const [jewelAsset, setJewelAsset] = useState(null);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Initialize form state when purchase changes or modal opens
  useEffect(() => {
    if (purchase && isOpen) {
      const isSilver = (purchase.asset_type || '').toUpperCase() === 'SILVER';
      const type = isSilver ? 'SILVER' : 'GOLD';
      const name = purchase.gold_name || purchase.item_name || '';
      const pur = purchase.gold_purity || purchase.purity || (isSilver ? '999' : '22K');
      const wt = purchase.weight != null ? String(purchase.weight) : '';

      const amt =
        purchase.purchase_amount ??
        purchase.amount_paid ??
        (purchase.purchase_rate && purchase.weight
          ? (purchase.weight * purchase.purchase_rate).toFixed(2)
          : '');

      let pDate = new Date().toISOString().split('T')[0];
      if (purchase.purchase_date) {
        try {
          const d = new Date(purchase.purchase_date);
          if (!isNaN(d.getTime())) {
            pDate = d.toISOString().split('T')[0];
          } else {
            pDate = String(purchase.purchase_date).split('T')[0];
          }
        } catch {
          pDate = String(purchase.purchase_date).split('T')[0];
        }
      }

      const gVal = purchase.gold_value != null ? String(purchase.gold_value) : '';
      const mChg = purchase.making_charges != null ? String(purchase.making_charges) : '';
      const wst = purchase.wastage != null ? String(purchase.wastage) : '';
      const tax = purchase.gst != null ? String(purchase.gst) : '';
      const oChg = purchase.other_charges != null ? String(purchase.other_charges) : '';
      const totInv = purchase.total_invoice_amount != null ? String(purchase.total_invoice_amount) : '';

      const initial = {
        assetType: type,
        itemName: name,
        purity: pur,
        weight: wt,
        purchaseDate: pDate,
        totalAmountPaid: amt ? String(amt) : '',
        goldValue: gVal,
        makingCharges: mChg,
        wastage: wst,
        gst: tax,
        otherCharges: oChg,
        totalInvoiceAmount: totInv,
      };

      setAssetType(type);
      setFormData(initial);
      setInitialState(initial);

      if (gVal || mChg || wst || tax || oChg || totInv) {
        setShowOptionalDetails(true);
      } else {
        setShowOptionalDetails(false);
      }

      setInvoiceAsset(null);
      setJewelAsset(null);
      setErrors({});
    }
  }, [purchase, isOpen]);

  // Existing document status
  const hasExistingInvoice = useMemo(() => {
    return Boolean(
      purchase?.documents?.invoice ||
        purchase?.invoice_document ||
        purchase?.invoice_image ||
        purchase?.invoice_url
    );
  }, [purchase]);

  const hasExistingPhoto = useMemo(() => {
    return Boolean(
      purchase?.documents?.jewelleryPhoto ||
        purchase?.jewel_document ||
        purchase?.jewellery_image ||
        purchase?.photo_url
    );
  }, [purchase]);

  // Dirty state detection
  const isDirty = useMemo(() => {
    if (!initialState) return false;
    if (invoiceAsset || jewelAsset) return true;
    if (assetType !== initialState.assetType) return true;
    return Object.keys(formData).some((key) => formData[key] !== initialState[key]);
  }, [formData, assetType, initialState, invoiceAsset, jewelAsset]);

  // Decimal Sanitizer matching AddGold logic
  const sanitizeDecimalInput = (rawVal, maxDecimals = 3) => {
    if (!rawVal) return '';
    let sanitized = rawVal.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts.length === 2 && parts[1].length > maxDecimals) {
      sanitized = parts[0] + '.' + parts[1].slice(0, maxDecimals);
    }
    return sanitized;
  };

  const handleAssetTypeChange = (newType) => {
    if (newType === assetType) return;
    setAssetType(newType);
    setFormData((prev) => ({
      ...prev,
      purity: newType === 'SILVER' ? '999' : '22K',
    }));
  };

  const handleTextChange = (name, value) => {
    let finalValue = value;
    if (name === 'weight') finalValue = sanitizeDecimalInput(value, 3);
    if (
      [
        'totalAmountPaid',
        'goldValue',
        'makingCharges',
        'wastage',
        'gst',
        'otherCharges',
        'totalInvoiceAmount',
      ].includes(name)
    ) {
      finalValue = sanitizeDecimalInput(value, 2);
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Validation
  const validate = () => {
    const errs = {};
    if (!formData.itemName || !formData.itemName.trim()) {
      errs.itemName = 'Please enter what you bought.';
    } else if (formData.itemName.trim().length < 2) {
      errs.itemName = 'Item name must be at least 2 characters.';
    }

    const wt = parseFloat(formData.weight);
    if (!formData.weight || isNaN(wt) || wt <= 0) {
      errs.weight = 'Please enter a valid weight in grams.';
    }

    const amt = parseFloat(formData.totalAmountPaid);
    if (!formData.totalAmountPaid || isNaN(amt) || amt <= 0) {
      errs.totalAmountPaid = 'Please enter the total amount paid.';
    }

    if (!formData.purchaseDate) {
      errs.purchaseDate = 'Please select the purchase date.';
    } else {
      const d = new Date(formData.purchaseDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (isNaN(d.getTime())) {
        errs.purchaseDate = 'Please enter a valid date (YYYY-MM-DD).';
      } else if (d > today) {
        errs.purchaseDate = 'Purchase date cannot be in the future.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Document picking
  const pickInvoiceDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        if (file.size && file.size > MAX_FILE_SIZE) {
          Alert.alert('File Too Large', 'Invoice file size must be under 5MB.');
          return;
        }
        setInvoiceAsset({
          uri: file.uri,
          name: file.name || 'invoice.pdf',
          size: file.size || 0,
          mimeType: file.mimeType || 'application/pdf',
        });
      }
    } catch (err) {
      console.warn('[EditAssetModal] Error picking invoice document:', err);
    }
  };

  const pickJewelleryPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photo = result.assets[0];
        if (photo.fileSize && photo.fileSize > MAX_FILE_SIZE) {
          Alert.alert('File Too Large', 'Jewellery photo size must be under 5MB.');
          return;
        }
        setJewelAsset({
          uri: photo.uri,
          name: photo.fileName || 'jewellery_photo.jpg',
          size: photo.fileSize || 0,
          mimeType: photo.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      console.warn('[EditAssetModal] Error picking jewellery photo:', err);
    }
  };

  // Close with unsaved changes confirmation
  const handleClosePrompt = () => {
    if (submitting) return;
    if (isDirty) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved edits. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setErrors({});
              onClose();
            },
          },
        ]
      );
    } else {
      setErrors({});
      onClose();
    }
  };

  // Submit Changes
  const handleSave = async () => {
    if (submitting) return;
    if (!validate()) return;

    try {
      setSubmitting(true);
      const dataPayload = new FormData();

      dataPayload.append('assetType', assetType);
      dataPayload.append('itemName', formData.itemName.trim());
      dataPayload.append('purity', formData.purity);
      dataPayload.append('weight', String(parseFloat(formData.weight)));
      dataPayload.append('purchaseDate', formData.purchaseDate);
      dataPayload.append('totalAmountPaid', String(parseFloat(formData.totalAmountPaid)));

      if (formData.goldValue) {
        dataPayload.append('gold_value', String(parseFloat(formData.goldValue)));
      }
      if (formData.makingCharges) {
        dataPayload.append('making_charges', String(parseFloat(formData.makingCharges)));
      }
      if (formData.wastage) {
        dataPayload.append('wastage', String(parseFloat(formData.wastage)));
      }
      if (formData.gst) {
        dataPayload.append('gst', String(parseFloat(formData.gst)));
      }
      if (formData.otherCharges) {
        dataPayload.append('other_charges', String(parseFloat(formData.otherCharges)));
      }
      if (formData.totalInvoiceAmount) {
        dataPayload.append('total_invoice_amount', String(parseFloat(formData.totalInvoiceAmount)));
      }

      if (invoiceAsset) {
        dataPayload.append('invoice', {
          uri: invoiceAsset.uri,
          name: invoiceAsset.name || 'invoice.pdf',
          type: invoiceAsset.mimeType || 'application/pdf',
        });
      }

      if (jewelAsset) {
        dataPayload.append('jewelleryPhoto', {
          uri: jewelAsset.uri,
          name: jewelAsset.name || 'photo.jpg',
          type: jewelAsset.mimeType || 'image/jpeg',
        });
      }

      await updatePurchase(purchase.id, dataPayload);

      showSuccess('Changes have been saved successfully.', 'Asset Updated');
      if (onUpdated) {
        await onUpdated();
      }
      onClose();
    } catch (err) {
      console.warn('[EditAssetModal] Update failed:', err?.message || err);
      const msg = err.response?.data?.message || err.message || 'Failed to update asset.';
      showError(msg, 'Update Failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !purchase) return null;

  const currentSuggestions = assetType === 'GOLD' ? GOLD_SUGGESTIONS : SILVER_SUGGESTIONS;
  const purities =
    assetType === 'GOLD' ? ['24K', '22K', '18K'] : ['999', '925', '916', '900'];

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={handleClosePrompt}
    >
      <View style={styles.modalBackdrop}>
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <LinearGradient
            colors={gradientPresets.ambientGlow}
            style={styles.ambientGlow}
            pointerEvents="none"
          />
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Top Bar Header */}
            <View style={styles.headerBar}>
              <View>
                <Text style={styles.headerTitle}>Edit Asset</Text>
                <Text style={styles.headerSubtitle}>
                  Update asset details and purchase invoice
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClosePrompt}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Close edit modal"
              >
                <Feather name="x" size={20} color={darkTheme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Metal Switcher */}
              <View style={styles.metalSwitcherRow}>
                <TouchableOpacity
                  style={styles.metalTabTouch}
                  onPress={() => handleAssetTypeChange('GOLD')}
                  disabled={submitting}
                  activeOpacity={0.85}
                  accessibilityRole="tab"
                  accessibilityLabel="Select Gold asset type"
                >
                  {assetType === 'GOLD' ? (
                    <LinearGradient
                      colors={gradientPresets.goldMetallic}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.metalTabActiveGradient}
                    >
                      <Text style={styles.metalEmoji}>🥇</Text>
                      <Text style={styles.metalTabTextActiveDark}>Gold Asset</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.metalTabInactive}>
                      <Text style={styles.metalEmoji}>🥇</Text>
                      <Text style={styles.metalTabTextInactive}>Gold Asset</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.metalTabTouch}
                  onPress={() => handleAssetTypeChange('SILVER')}
                  disabled={submitting}
                  activeOpacity={0.85}
                  accessibilityRole="tab"
                  accessibilityLabel="Select Silver asset type"
                >
                  {assetType === 'SILVER' ? (
                    <LinearGradient
                      colors={gradientPresets.silverMetallic}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.metalTabActiveGradient}
                    >
                      <Text style={styles.metalEmoji}>🥈</Text>
                      <Text style={styles.metalTabTextActiveDark}>Silver Asset</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.metalTabInactive}>
                      <Text style={styles.metalEmoji}>🥈</Text>
                      <Text style={styles.metalTabTextInactive}>Silver Asset</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Form Card */}
              <View style={styles.card}>
                {/* 1. Item Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Item / Jewellery Name <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.textInput, errors.itemName && styles.inputErrorBorder]}
                    value={formData.itemName}
                    onChangeText={(val) => handleTextChange('itemName', val)}
                    placeholder={assetType === 'GOLD' ? 'e.g. 22K Gold Bangle' : 'e.g. Silver Coin'}
                    placeholderTextColor={darkTheme.colors.textMuted}
                    editable={!submitting}
                  />
                  {errors.itemName ? (
                    <Text style={styles.errorText}>{errors.itemName}</Text>
                  ) : null}

                  {/* Suggestion Chips */}
                  <View style={styles.suggestionsRow}>
                    {currentSuggestions.map((sug) => (
                      <TouchableOpacity
                        key={sug}
                        style={styles.suggestionChip}
                        onPress={() => handleTextChange('itemName', sug)}
                        disabled={submitting}
                      >
                        <Text style={styles.suggestionChipText}>{sug}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 2. Purity Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Purity Standard <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={styles.purityButtonsRow}>
                    {purities.map((pur) => {
                      const isActive = formData.purity === pur;
                      return (
                        <TouchableOpacity
                          key={pur}
                          style={[styles.purityButton, isActive && styles.purityButtonActive]}
                          onPress={() => handleTextChange('purity', pur)}
                          disabled={submitting}
                        >
                          <Text
                            style={[
                              styles.purityButtonText,
                              isActive && styles.purityButtonTextActive,
                            ]}
                          >
                            {pur}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 3. Weight & Purchase Date Row */}
                <View style={styles.twoColumnRow}>
                  {/* Weight in Grams */}
                  <View style={styles.columnField}>
                    <Text style={styles.inputLabel}>
                      Weight (g) <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View style={styles.inputWithSuffix}>
                      <TextInput
                        style={[
                          styles.textInput,
                          styles.inputWithSuffixPadding,
                          errors.weight && styles.inputErrorBorder,
                        ]}
                        value={formData.weight}
                        onChangeText={(val) => handleTextChange('weight', val)}
                        placeholder="0.000"
                        placeholderTextColor={darkTheme.colors.textMuted}
                        keyboardType="decimal-pad"
                        editable={!submitting}
                      />
                      <Text style={styles.suffixText}>grams</Text>
                    </View>
                    {errors.weight ? (
                      <Text style={styles.errorText}>{errors.weight}</Text>
                    ) : null}
                  </View>

                  {/* Purchase Date */}
                  <View style={styles.columnField}>
                    <Text style={styles.inputLabel}>
                      Purchase Date <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        errors.purchaseDate && styles.inputErrorBorder,
                      ]}
                      value={formData.purchaseDate}
                      onChangeText={(val) => handleTextChange('purchaseDate', val)}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={darkTheme.colors.textMuted}
                      keyboardType="numbers-and-punctuation"
                      editable={!submitting}
                    />
                    {errors.purchaseDate ? (
                      <Text style={styles.errorText}>{errors.purchaseDate}</Text>
                    ) : null}
                  </View>
                </View>

                {/* 4. Total Amount Paid */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Total Amount Paid (₹) <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={styles.inputWithPrefix}>
                    <Text style={styles.prefixText}>₹</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        styles.inputWithPrefixPadding,
                        errors.totalAmountPaid && styles.inputErrorBorder,
                      ]}
                      value={formData.totalAmountPaid}
                      onChangeText={(val) => handleTextChange('totalAmountPaid', val)}
                      placeholder="e.g. 55000"
                      placeholderTextColor={darkTheme.colors.textMuted}
                      keyboardType="decimal-pad"
                      editable={!submitting}
                    />
                  </View>
                  {errors.totalAmountPaid ? (
                    <Text style={styles.errorText}>{errors.totalAmountPaid}</Text>
                  ) : null}
                </View>
              </View>

              {/* Optional Invoice Breakdown Accordion */}
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setShowOptionalDetails(!showOptionalDetails)}
                activeOpacity={0.7}
              >
                <View style={styles.accordionHeaderLeft}>
                  <Feather
                    name="file-text"
                    size={16}
                    color={darkTheme.colors.gold}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.accordionTitle}>Optional Invoice Breakdown</Text>
                </View>
                <Feather
                  name={showOptionalDetails ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={darkTheme.colors.textMuted}
                />
              </TouchableOpacity>

              {showOptionalDetails && (
                <View style={styles.accordionBodyCard}>
                  <View style={styles.twoColumnRow}>
                    <View style={styles.columnField}>
                      <Text style={styles.inputLabel}>Metal Value (₹)</Text>
                      <TextInput
                        style={styles.textInput}
                        value={formData.goldValue}
                        onChangeText={(val) => handleTextChange('goldValue', val)}
                        placeholder="0.00"
                        placeholderTextColor={darkTheme.colors.textMuted}
                        keyboardType="decimal-pad"
                        editable={!submitting}
                      />
                    </View>
                    <View style={styles.columnField}>
                      <Text style={styles.inputLabel}>Making Charges (₹)</Text>
                      <TextInput
                        style={styles.textInput}
                        value={formData.makingCharges}
                        onChangeText={(val) => handleTextChange('makingCharges', val)}
                        placeholder="0.00"
                        placeholderTextColor={darkTheme.colors.textMuted}
                        keyboardType="decimal-pad"
                        editable={!submitting}
                      />
                    </View>
                  </View>

                  <View style={styles.twoColumnRow}>
                    <View style={styles.columnField}>
                      <Text style={styles.inputLabel}>Wastage (₹)</Text>
                      <TextInput
                        style={styles.textInput}
                        value={formData.wastage}
                        onChangeText={(val) => handleTextChange('wastage', val)}
                        placeholder="0.00"
                        placeholderTextColor={darkTheme.colors.textMuted}
                        keyboardType="decimal-pad"
                        editable={!submitting}
                      />
                    </View>
                    <View style={styles.columnField}>
                      <Text style={styles.inputLabel}>GST (₹)</Text>
                      <TextInput
                        style={styles.textInput}
                        value={formData.gst}
                        onChangeText={(val) => handleTextChange('gst', val)}
                        placeholder="0.00"
                        placeholderTextColor={darkTheme.colors.textMuted}
                        keyboardType="decimal-pad"
                        editable={!submitting}
                      />
                    </View>
                  </View>

                  <View style={styles.twoColumnRow}>
                    <View style={styles.columnField}>
                      <Text style={styles.inputLabel}>Other Charges (₹)</Text>
                      <TextInput
                        style={styles.textInput}
                        value={formData.otherCharges}
                        onChangeText={(val) => handleTextChange('otherCharges', val)}
                        placeholder="0.00"
                        placeholderTextColor={darkTheme.colors.textMuted}
                        keyboardType="decimal-pad"
                        editable={!submitting}
                      />
                    </View>
                    <View style={styles.columnField}>
                      <Text style={styles.inputLabel}>Total Invoice (₹)</Text>
                      <TextInput
                        style={styles.textInput}
                        value={formData.totalInvoiceAmount}
                        onChangeText={(val) => handleTextChange('totalInvoiceAmount', val)}
                        placeholder="0.00"
                        placeholderTextColor={darkTheme.colors.textMuted}
                        keyboardType="decimal-pad"
                        editable={!submitting}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Attachments Section */}
              <View style={styles.card}>
                <Text style={styles.sectionHeaderTitle}>Receipt & Photo</Text>
                <Text style={styles.sectionHeaderSubtitle}>
                  Replace existing documents or add new proofs
                </Text>

                {/* Invoice Upload Card */}
                <View style={styles.attachmentCard}>
                  <View style={styles.attachmentInfo}>
                    <Feather name="file-text" size={18} color={darkTheme.colors.gold} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={styles.attachmentTitle}>Purchase Invoice</Text>
                      <Text style={styles.attachmentStatus}>
                        {invoiceAsset
                          ? `New: ${invoiceAsset.name}`
                          : hasExistingInvoice
                          ? 'Current invoice on file'
                          : 'No invoice attached'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.attachmentActionRow}>
                    <TouchableOpacity
                      style={styles.attachmentBtn}
                      onPress={pickInvoiceDocument}
                      disabled={submitting}
                    >
                      <Text style={styles.attachmentBtnText}>
                        {invoiceAsset
                          ? 'Change File'
                          : hasExistingInvoice
                          ? 'Replace File'
                          : 'Attach Invoice'}
                      </Text>
                    </TouchableOpacity>

                    {invoiceAsset ? (
                      <TouchableOpacity
                        style={styles.removeAssetBtn}
                        onPress={() => setInvoiceAsset(null)}
                        disabled={submitting}
                      >
                        <Text style={styles.removeAssetText}>Revert</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {/* Jewellery Photo Upload Card */}
                <View style={styles.attachmentCard}>
                  <View style={styles.attachmentInfo}>
                    <Feather name="image" size={18} color={darkTheme.colors.gold} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={styles.attachmentTitle}>Jewellery Photo</Text>
                      <Text style={styles.attachmentStatus}>
                        {jewelAsset
                          ? `New: ${jewelAsset.name}`
                          : hasExistingPhoto
                          ? 'Current photo on file'
                          : 'No photo attached'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.attachmentActionRow}>
                    <TouchableOpacity
                      style={styles.attachmentBtn}
                      onPress={pickJewelleryPhoto}
                      disabled={submitting}
                    >
                      <Text style={styles.attachmentBtnText}>
                        {jewelAsset
                          ? 'Change Photo'
                          : hasExistingPhoto
                          ? 'Replace Photo'
                          : 'Attach Photo'}
                      </Text>
                    </TouchableOpacity>

                    {jewelAsset ? (
                      <TouchableOpacity
                        style={styles.removeAssetBtn}
                        onPress={() => setJewelAsset(null)}
                        disabled={submitting}
                      >
                        <Text style={styles.removeAssetText}>Revert</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Bottom Buttons */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClosePrompt}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButtonWrapper, submitting && styles.buttonDisabled]}
                  onPress={handleSave}
                  disabled={submitting}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="Save asset changes"
                >
                  <LinearGradient
                    colors={gradientPresets.goldMetallic}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.saveButtonGradient}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#080B12" />
                    ) : (
                      <>
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                        <Feather name="arrow-right" size={16} color="#080B12" style={{ marginLeft: 6 }} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.borderSubtle,
    backgroundColor: darkTheme.colors.backgroundCard,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  metalSwitcherRow: {
    flexDirection: 'row',
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    marginBottom: 16,
    gap: 6,
  },
  metalTabTouch: {
    flex: 1,
  },
  metalTabActiveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    ...darkTheme.shadows.button,
  },
  metalTabInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    gap: 8,
  },
  metalEmoji: {
    fontSize: 16,
  },
  metalTabTextActiveDark: {
    fontSize: 13,
    fontWeight: '800',
    color: '#080B12',
  },
  metalTabTextInactive: {
    fontSize: 13,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
  },
  card: {
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: darkTheme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: darkTheme.colors.textMuted,
    marginBottom: 6,
    marginLeft: 2,
  },
  requiredStar: {
    color: darkTheme.colors.gold,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.colors.textPrimary,
  },
  inputErrorBorder: {
    borderColor: darkTheme.colors.loss,
  },
  errorText: {
    fontSize: 11,
    color: darkTheme.colors.loss,
    marginTop: 4,
    fontWeight: '600',
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  suggestionChip: {
    backgroundColor: darkTheme.colors.backgroundSubtle,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  suggestionChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: darkTheme.colors.textMuted,
  },
  purityButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  purityButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  purityButtonActive: {
    backgroundColor: 'rgba(232, 179, 49, 0.15)',
    borderColor: darkTheme.colors.gold,
  },
  purityButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
  },
  purityButtonTextActive: {
    color: darkTheme.colors.gold,
    fontWeight: '800',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  columnField: {
    flex: 1,
  },
  inputWithSuffix: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithSuffixPadding: {
    paddingRight: 50,
  },
  suffixText: {
    position: 'absolute',
    right: 12,
    fontSize: 11,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
  },
  inputWithPrefix: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithPrefixPadding: {
    paddingLeft: 28,
  },
  prefixText: {
    position: 'absolute',
    left: 12,
    fontSize: 14,
    fontWeight: '700',
    color: darkTheme.colors.gold,
    zIndex: 1,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.backgroundCard,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    marginBottom: 14,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: darkTheme.colors.textPrimary,
  },
  accordionBodyCard: {
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    marginBottom: 2,
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    marginBottom: 12,
  },
  attachmentCard: {
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    marginBottom: 10,
  },
  attachmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  attachmentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: darkTheme.colors.textPrimary,
  },
  attachmentStatus: {
    fontSize: 11,
    color: darkTheme.colors.textMuted,
    marginTop: 2,
  },
  attachmentActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  attachmentBtn: {
    backgroundColor: 'rgba(232, 179, 49, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.3)',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  attachmentBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: darkTheme.colors.gold,
  },
  removeAssetBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  removeAssetText: {
    fontSize: 11,
    fontWeight: '600',
    color: darkTheme.colors.loss,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
  },
  saveButtonWrapper: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: darkTheme.colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  saveButtonGradient: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080B12',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
