import React, { useState, useEffect, useCallback } from 'react';
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
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { createPurchase, getEntitlementStatus } from '../../services/portfolioService';
import useAuth from '../../hooks/useAuth';
import { darkTheme } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { gradientPresets } from '../../constants/colors';

const GOLD_SUGGESTIONS = [
  'Gold Chain',
  'Gold Coin',
  'Gold Ring',
  'Gold Bangle',
  'Gold Necklace',
  'Gold Bar',
];

const SILVER_SUGGESTIONS = [
  'Silver Coin',
  'Silver Anklet',
  'Silver Utensil',
  'Silver Bar',
  'Silver Lamp',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function AddGoldScreen({ navigation }) {
  const { user } = useAuth();

  const [assetType, setAssetType] = useState('GOLD'); // 'GOLD' | 'SILVER'
  const [submitting, setSubmitting] = useState(false);
  const [showOptionalInvoice, setShowOptionalInvoice] = useState(false);

  const todayString = new Date().toISOString().split('T')[0];

  // Form Fields
  const [formData, setFormData] = useState({
    itemName: '',
    purity: '22K',
    weight: '',
    totalAmountPaid: '',
    purchaseDate: todayString,
    // Optional Invoice Details
    goldValue: '',
    makingCharges: '',
    wastage: '',
    gst: '',
    otherCharges: '',
    totalInvoiceAmount: '',
  });

  // Attachments
  const [invoiceAsset, setInvoiceAsset] = useState(null); // { uri, name, size, mimeType }
  const [jewelAsset, setJewelAsset] = useState(null); // { uri, name, size, mimeType }

  // Errors & Touched
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Entitlement / Quota State
  const [entitlement, setEntitlement] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Check Entitlement on Mount
  const checkEntitlement = useCallback(async () => {
    try {
      const res = await getEntitlementStatus();
      if (res?.data) {
        setEntitlement(res.data);
        if (res.data.canCreate === false) {
          setShowUpgradeModal(true);
        }
      }
    } catch (err) {
      console.warn('[AddGoldScreen] Failed to verify entitlement status:', err?.message || err);
    }
  }, []);

  useEffect(() => {
    checkEntitlement();
  }, [checkEntitlement]);

  // Metal Switcher Handler
  const handleAssetTypeChange = (newType) => {
    if (newType === assetType) return;
    setAssetType(newType);
    setFormData((prev) => ({
      ...prev,
      itemName: '',
      purity: newType === 'SILVER' ? '999' : '22K',
      weight: '',
      totalAmountPaid: '',
    }));
    setTouched({});
    setErrors({});
  };

  // Decimal Sanitizer matching web logic
  const sanitizeDecimalInput = (rawVal, maxDecimals = 3) => {
    if (!rawVal) return '';
    let sanitized = rawVal.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = `${parts[0]}.${parts.slice(1).join('')}`;
    }
    const [whole, decimal] = sanitized.split('.');
    if (decimal !== undefined) {
      return `${whole}.${decimal.slice(0, maxDecimals)}`;
    }
    return sanitized;
  };

  // Field Validation
  const validateField = (name, value) => {
    switch (name) {
      case 'itemName':
        if (!value || !value.trim()) return 'Please enter what you bought.';
        if (value.trim().length < 2) return 'Item name must be at least 2 characters.';
        if (value.trim().length > 100) return 'Item name cannot exceed 100 characters.';
        return null;
      case 'weight': {
        if (!value || value === '') return 'Please enter the weight in grams.';
        const num = parseFloat(value);
        if (isNaN(num) || num <= 0) return 'Please enter a valid weight greater than 0.';
        if (num > 500000) return 'Weight cannot exceed 500,000 grams.';
        return null;
      }
      case 'totalAmountPaid': {
        if (!value || value === '') return 'Please enter the total amount you paid.';
        const num = parseFloat(value);
        if (isNaN(num) || num <= 0) return 'Please enter a valid amount greater than 0.';
        if (num > 1000000000) return 'Amount cannot exceed ₹100,00,00,000.';
        return null;
      }
      case 'purchaseDate': {
        if (!value) return 'Please select the purchase date.';
        const d = new Date(value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (isNaN(d.getTime())) return 'Please enter a valid date (YYYY-MM-DD).';
        if (d > today) return 'Purchase date cannot be in the future.';
        return null;
      }
      default:
        return null;
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
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
    if (touched[name]) {
      const errorMsg = validateField(name, finalValue);
      setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    }
  };

  // Document Picker for Invoice
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
      console.warn('[AddGoldScreen] Error picking invoice document:', err);
    }
  };

  // Image Picker for Jewellery Photo
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
      console.warn('[AddGoldScreen] Error picking jewellery photo:', err);
    }
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (submitting) return;

    // Check entitlement first
    if (entitlement && entitlement.canCreate === false) {
      setShowUpgradeModal(true);
      return;
    }

    // Run client validations
    const newErrors = {};
    ['itemName', 'weight', 'totalAmountPaid', 'purchaseDate'].forEach((key) => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });

    setTouched({
      itemName: true,
      weight: true,
      totalAmountPaid: true,
      purchaseDate: true,
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Incomplete Form', 'Please fill all required fields correctly.');
      return;
    }

    try {
      setSubmitting(true);

      const dataPayload = new FormData();
      dataPayload.append('asset_type', assetType);
      dataPayload.append('assetType', assetType);
      dataPayload.append('gold_name', formData.itemName.trim());
      dataPayload.append('itemName', formData.itemName.trim());
      dataPayload.append('gold_purity', formData.purity);
      dataPayload.append('purity', formData.purity);
      dataPayload.append('weight', String(parseFloat(formData.weight)));
      dataPayload.append('purchase_date', formData.purchaseDate);
      dataPayload.append('total_amount_paid', String(parseFloat(formData.totalAmountPaid)));
      dataPayload.append('totalAmountPaid', String(parseFloat(formData.totalAmountPaid)));
      dataPayload.append('purchase_amount', String(parseFloat(formData.totalAmountPaid)));

      // Optional breakdown fields
      if (formData.goldValue) dataPayload.append('gold_value', String(parseFloat(formData.goldValue)));
      if (formData.makingCharges) dataPayload.append('making_charges', String(parseFloat(formData.makingCharges)));
      if (formData.wastage) dataPayload.append('wastage', String(parseFloat(formData.wastage)));
      if (formData.gst) dataPayload.append('gst', String(parseFloat(formData.gst)));
      if (formData.otherCharges) dataPayload.append('other_charges', String(parseFloat(formData.otherCharges)));
      if (formData.totalInvoiceAmount) dataPayload.append('total_invoice_amount', String(parseFloat(formData.totalInvoiceAmount)));

      // Optional attachments
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

      await createPurchase(dataPayload);

      Alert.alert(
        'Success',
        'Asset successfully added to your vault!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MyGold'),
          },
        ],
        { cancelable: false }
      );
    } catch (err) {
      if (err.response?.data?.code === 'FREE_LIMIT_REACHED' || err.response?.status === 402) {
        setShowUpgradeModal(true);
      } else {
        const message = err.response?.data?.message || 'Failed to add asset. Please check your connection.';
        Alert.alert('Error', message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isPaid =
    entitlement?.status === 'PAID' ||
    user?.plan === 'paid' ||
    user?.subscription_status === 'active' ||
    user?.role === 'admin';
  const entriesCount = entitlement?.entriesUsed ?? (user?.free_entries_used || 0);

  const currentSuggestions = assetType === 'GOLD' ? GOLD_SUGGESTIONS : SILVER_SUGGESTIONS;
  const purities =
    assetType === 'GOLD' ? ['24K', '22K', '18K'] : ['999', '925', '916', '900'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={gradientPresets.ambientGlow}
        style={styles.ambientGlow}
        pointerEvents="none"
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Row & Entitlement Badge */}
          <View style={styles.headerRow}>
            <View style={styles.entitlementBadgeContainer}>
              {isPaid ? (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>👑 Premium Vault • Active</Text>
                </View>
              ) : (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>
                    {entriesCount} / 10 Free Entries Used
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.screenTitle}>Add Asset Entry</Text>
          </View>

          {/* Metal Switcher Segmented Control */}
          <View style={styles.metalSwitcherRow}>
            <TouchableOpacity
              style={styles.metalTabTouch}
              onPress={() => handleAssetTypeChange('GOLD')}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityLabel="Select Gold Bullion and Jewelry"
            >
              {assetType === 'GOLD' ? (
                <LinearGradient
                  colors={gradientPresets.goldMetallic}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.metalTabActiveGrad}
                >
                  <Text style={styles.metalTabTextActiveDark}>
                    🪙 Gold Bullion & Jewelry
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.metalTabInactive}>
                  <Text style={styles.metalTabTextInactive}>
                    🪙 Gold Bullion & Jewelry
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.metalTabTouch}
              onPress={() => handleAssetTypeChange('SILVER')}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityLabel="Select Silver Bullion and Articles"
            >
              {assetType === 'SILVER' ? (
                <LinearGradient
                  colors={gradientPresets.silverMetallic}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.metalTabActiveGrad}
                >
                  <Text style={styles.metalTabTextActiveDark}>
                    🥈 Silver Bullion & Articles
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.metalTabInactive}>
                  <Text style={styles.metalTabTextInactive}>
                    🥈 Silver Bullion & Articles
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* 1. Required Asset Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Asset Details</Text>

            {/* Item Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                What did you buy? <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.itemName && touched.itemName && styles.inputErrorBorder,
                ]}
                value={formData.itemName}
                onChangeText={(val) => handleTextChange('itemName', val)}
                onBlur={() => handleBlur('itemName')}
                placeholder="e.g. Gold Chain, Coin, Ring"
                placeholderTextColor={darkTheme.colors.textMuted}
                accessibilityLabel="What did you buy? Required."
              />
              {errors.itemName && touched.itemName ? (
                <Text style={styles.errorText}>{errors.itemName}</Text>
              ) : null}

              {/* Quick Suggestions Chips */}
              <View style={styles.suggestionsRow}>
                {currentSuggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.suggestionChip}
                    onPress={() => handleTextChange('itemName', suggestion)}
                    accessibilityRole="button"
                    accessibilityLabel={`Quick fill ${suggestion}`}
                  >
                    <Text style={styles.suggestionChipText}>+ {suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Purity Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Purity Standard <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.purityButtonsRow}>
                {purities.map((p) => {
                  const isSelected = formData.purity === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.purityButton,
                        isSelected && styles.purityButtonActive,
                      ]}
                      onPress={() => setFormData((prev) => ({ ...prev, purity: p }))}
                      accessibilityRole="button"
                      accessibilityLabel={`Select purity standard ${p}`}
                    >
                      <Text
                        style={[
                          styles.purityButtonText,
                          isSelected && styles.purityButtonTextActive,
                        ]}
                      >
                        {p} {assetType === 'GOLD' && p === '22K' ? '(Standard)' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Weight & Total Amount Paid Row */}
            <View style={styles.twoColumnRow}>
              {/* Weight */}
              <View style={styles.columnField}>
                <Text style={styles.label}>
                  {assetType === 'GOLD' ? 'Gold Weight (grams)' : 'Silver Weight (grams)'}{' '}
                  <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.inputWithSuffix}>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.inputWithSuffixPadding,
                      errors.weight && touched.weight && styles.inputErrorBorder,
                    ]}
                    value={formData.weight}
                    onChangeText={(val) => handleTextChange('weight', val)}
                    onBlur={() => handleBlur('weight')}
                    placeholder="0.00"
                    placeholderTextColor={darkTheme.colors.textMuted}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Weight in grams. Required."
                  />
                  <Text style={styles.suffixText}>grams</Text>
                </View>
                {errors.weight && touched.weight ? (
                  <Text style={styles.errorText}>{errors.weight}</Text>
                ) : null}
              </View>

              {/* Total Amount Paid */}
              <View style={styles.columnField}>
                <Text style={styles.label}>
                  How much did you pay? <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.inputWithPrefix}>
                  <Text style={styles.prefixText}>₹</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.inputWithPrefixPadding,
                      errors.totalAmountPaid &&
                        touched.totalAmountPaid &&
                        styles.inputErrorBorder,
                    ]}
                    value={formData.totalAmountPaid}
                    onChangeText={(val) => handleTextChange('totalAmountPaid', val)}
                    onBlur={() => handleBlur('totalAmountPaid')}
                    placeholder="0.00"
                    placeholderTextColor={darkTheme.colors.textMuted}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Total amount paid in Indian Rupees. Required."
                  />
                </View>
                {errors.totalAmountPaid && touched.totalAmountPaid ? (
                  <Text style={styles.errorText}>{errors.totalAmountPaid}</Text>
                ) : null}
              </View>
            </View>
            <Text style={styles.amountHelperText}>
              Enter the total historical amount you paid at the jeweller.
            </Text>

            {/* Purchase Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Purchase Date (YYYY-MM-DD) <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.purchaseDate && touched.purchaseDate && styles.inputErrorBorder,
                ]}
                value={formData.purchaseDate}
                onChangeText={(val) => handleTextChange('purchaseDate', val)}
                onBlur={() => handleBlur('purchaseDate')}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={darkTheme.colors.textMuted}
                accessibilityLabel="Purchase Date in YYYY-MM-DD format. Required."
              />
              {errors.purchaseDate && touched.purchaseDate ? (
                <Text style={styles.errorText}>{errors.purchaseDate}</Text>
              ) : null}
            </View>
          </View>

          {/* 2. Optional Invoice Details Accordion */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setShowOptionalInvoice(!showOptionalInvoice)}
              accessibilityRole="button"
              accessibilityLabel="Toggle optional invoice breakdown fields"
            >
              <Text style={styles.cardHeaderTitle}>Add Invoice Details (Optional)</Text>
              <Feather
                name={showOptionalInvoice ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={darkTheme.colors.textMuted}
              />
            </TouchableOpacity>

            {showOptionalInvoice && (
              <View style={styles.accordionBody}>
                <Text style={styles.accordionHelperText}>
                  You can optionally record GST, making charges, or wastage from your bill.
                </Text>

                <View style={styles.twoColumnRow}>
                  <View style={styles.columnField}>
                    <Text style={styles.subLabel}>Gold Value (₹)</Text>
                    <TextInput
                      style={styles.textInputSmall}
                      value={formData.goldValue}
                      onChangeText={(val) => handleTextChange('goldValue', val)}
                      placeholder="0.00"
                      placeholderTextColor={darkTheme.colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={styles.columnField}>
                    <Text style={styles.subLabel}>Making Charges (₹)</Text>
                    <TextInput
                      style={styles.textInputSmall}
                      value={formData.makingCharges}
                      onChangeText={(val) => handleTextChange('makingCharges', val)}
                      placeholder="0.00"
                      placeholderTextColor={darkTheme.colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.twoColumnRow}>
                  <View style={styles.columnField}>
                    <Text style={styles.subLabel}>Wastage (₹)</Text>
                    <TextInput
                      style={styles.textInputSmall}
                      value={formData.wastage}
                      onChangeText={(val) => handleTextChange('wastage', val)}
                      placeholder="0.00"
                      placeholderTextColor={darkTheme.colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={styles.columnField}>
                    <Text style={styles.subLabel}>GST (₹)</Text>
                    <TextInput
                      style={styles.textInputSmall}
                      value={formData.gst}
                      onChangeText={(val) => handleTextChange('gst', val)}
                      placeholder="0.00"
                      placeholderTextColor={darkTheme.colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.twoColumnRow}>
                  <View style={styles.columnField}>
                    <Text style={styles.subLabel}>Other Charges (₹)</Text>
                    <TextInput
                      style={styles.textInputSmall}
                      value={formData.otherCharges}
                      onChangeText={(val) => handleTextChange('otherCharges', val)}
                      placeholder="0.00"
                      placeholderTextColor={darkTheme.colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={styles.columnField}>
                    <Text style={styles.subLabel}>Total Invoice Amount (₹)</Text>
                    <TextInput
                      style={styles.textInputSmall}
                      value={formData.totalInvoiceAmount}
                      onChangeText={(val) => handleTextChange('totalInvoiceAmount', val)}
                      placeholder="0.00"
                      placeholderTextColor={darkTheme.colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* 3. Optional Document Attachments */}
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Documents & Photos (Optional)</Text>

            {/* Invoice File */}
            <View style={styles.attachmentRow}>
              <View style={styles.attachmentInfo}>
                <View style={styles.attachmentIconBox}>
                  <Feather name="file-text" size={18} color={darkTheme.colors.gold} />
                </View>
                <View style={styles.attachmentTextGroup}>
                  <Text style={styles.attachmentTitle}>Invoice Photo / PDF</Text>
                  <Text style={styles.attachmentSubtitle} numberOfLines={1}>
                    {invoiceAsset ? invoiceAsset.name : 'Bill receipt photo or PDF (max 5MB)'}
                  </Text>
                </View>
              </View>

              <View style={styles.attachmentActions}>
                {invoiceAsset ? (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => setInvoiceAsset(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Remove uploaded invoice"
                  >
                    <Feather name="trash-2" size={16} color={darkTheme.colors.loss} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={pickInvoiceDocument}
                  accessibilityRole="button"
                  accessibilityLabel="Upload invoice document"
                >
                  <Text style={styles.uploadBtnText}>
                    {invoiceAsset ? 'Change' : 'Upload'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Jewellery Photo File */}
            <View style={[styles.attachmentRow, styles.attachmentBorderTop]}>
              <View style={styles.attachmentInfo}>
                <View style={styles.attachmentIconBox}>
                  <Feather name="image" size={18} color={darkTheme.colors.gold} />
                </View>
                <View style={styles.attachmentTextGroup}>
                  <Text style={styles.attachmentTitle}>Jewellery Photo</Text>
                  <Text style={styles.attachmentSubtitle} numberOfLines={1}>
                    {jewelAsset ? jewelAsset.name : 'Ornament gallery image (max 5MB)'}
                  </Text>
                </View>
              </View>

              <View style={styles.attachmentActions}>
                {jewelAsset ? (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => setJewelAsset(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Remove uploaded jewellery photo"
                  >
                    <Feather name="trash-2" size={16} color={darkTheme.colors.loss} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={pickJewelleryPhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Upload jewellery photo"
                >
                  <Text style={styles.uploadBtnText}>
                    {jewelAsset ? 'Change' : 'Upload'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Image Preview if photo is selected */}
            {jewelAsset?.uri ? (
              <View style={styles.photoPreviewBox}>
                <Image
                  source={{ uri: jewelAsset.uri }}
                  style={styles.photoPreview}
                  resizeMode="cover"
                />
              </View>
            ) : null}
          </View>

          {/* Resale Advisory Disclaimer */}
          <Text style={styles.resaleAdvisoryNote}>
            Note: Actual resale amount may vary depending on the jeweller's buyback rate, purity verification, weight and applicable deductions.
          </Text>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Save Asset to vault"
          >
            <LinearGradient
              colors={submitting ? ['#475569', '#334155'] : gradientPresets.goldMetallic}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitButton}
            >
              {submitting ? (
                <View style={styles.submittingRow}>
                  <ActivityIndicator size="small" color="#080B12" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Saving Asset...</Text>
                </View>
              ) : (
                <View style={styles.submittingRow}>
                  <Text style={styles.submitButtonText}>Save Asset Entry</Text>
                  <Feather name="arrow-right" size={18} color="#080B12" style={{ marginLeft: 8 }} />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Upgrade / Limit Modal */}
      <Modal
        visible={showUpgradeModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowUpgradeModal(false);
          navigation.navigate('MyGold');
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setShowUpgradeModal(false);
            navigation.navigate('MyGold');
          }}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.crownCircle}>
              <Text style={styles.crownEmoji}>👑</Text>
            </View>
            <Text style={styles.modalTitle}>10 Free Entries Reached</Text>
            <Text style={styles.modalSubtitle}>
              You have used all 10 free Gold and Silver entries in your starter vault.
              Upgrade to Premium Monthly for only ₹10/month to unlock unlimited records and receipt storage.
            </Text>

            <TouchableOpacity
              onPress={() => {
                setShowUpgradeModal(false);
                navigation.navigate('Profile');
              }}
              activeOpacity={0.88}
              style={{ width: '100%', marginBottom: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Upgrade to Premium"
            >
              <LinearGradient
                colors={gradientPresets.goldMetallic}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalReturnBtn}
              >
                <Text style={styles.modalReturnBtnText}>Upgrade to Premium (₹10/mo)</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowUpgradeModal(false);
                navigation.navigate('MyGold');
              }}
              activeOpacity={0.7}
              style={{ paddingVertical: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Return to MyGold Vault"
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: darkTheme.colors.textMuted }}>Return to Vault</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // Header Row
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingTop: 4,
  },
  entitlementBadgeContainer: {
    flexShrink: 1,
  },
  premiumBadge: {
    backgroundColor: darkTheme.colors.gold,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#080B12',
  },
  freeBadge: {
    backgroundColor: 'rgba(232, 179, 49, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.3)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: darkTheme.colors.gold,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
  },

  // Metal Switcher
  metalSwitcherRow: {
    flexDirection: 'row',
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    marginBottom: 14,
    gap: 6,
  },
  metalTabTouch: {
    flex: 1,
    borderRadius: 11,
    overflow: 'hidden',
  },
  metalTabActiveGrad: {
    paddingVertical: 12,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metalTabInactive: {
    paddingVertical: 12,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metalTabText: {
    fontSize: 12,
    fontWeight: '800',
  },
  metalTabTextActiveDark: {
    color: '#080B12',
    fontSize: 12,
    fontWeight: '800',
  },
  metalTabTextActiveWhite: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  metalTabTextInactive: {
    color: darkTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  // Form Cards
  card: {
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    marginBottom: 14,
    ...darkTheme.shadows.card,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.textSecondary,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: darkTheme.colors.textMuted,
    marginBottom: 4,
  },
  requiredStar: {
    color: darkTheme.colors.loss,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.colors.textPrimary,
  },
  textInputSmall: {
    height: 42,
    borderRadius: 10,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    paddingHorizontal: 12,
    fontSize: 13,
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

  // Suggestions Chips
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

  // Purity Buttons
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

  // Two Column Row
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  columnField: {
    flex: 1,
  },
  inputWithSuffix: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithSuffixPadding: {
    paddingRight: 52,
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
    fontWeight: '800',
    color: darkTheme.colors.gold,
    zIndex: 1,
  },
  amountHelperText: {
    fontSize: 10,
    color: darkTheme.colors.textMuted,
    marginBottom: 10,
  },

  // Accordion Header & Body
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  accordionBody: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  accordionHelperText: {
    fontSize: 11,
    color: darkTheme.colors.textMuted,
    marginBottom: 10,
  },

  // Document Attachments
  attachmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  attachmentBorderTop: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 6,
    paddingTop: 12,
  },
  attachmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  attachmentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(232, 179, 49, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentTextGroup: {
    flex: 1,
  },
  attachmentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: darkTheme.colors.textPrimary,
  },
  attachmentSubtitle: {
    fontSize: 11,
    color: darkTheme.colors.textMuted,
    marginTop: 2,
  },
  attachmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(232, 179, 49, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.3)',
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.gold,
  },
  photoPreviewBox: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
  },
  photoPreview: {
    width: '100%',
    height: 140,
  },

  // Resale Note
  resaleAdvisoryNote: {
    fontSize: 10,
    color: darkTheme.colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 16,
    paddingHorizontal: 12,
  },

  // Submit Button
  submitButton: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...darkTheme.shadows.button,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#080B12',
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Modal Backdrop & Card
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.4)',
    padding: 24,
    alignItems: 'center',
    ...darkTheme.shadows.card,
  },
  crownCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(232, 179, 49, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  crownEmoji: {
    fontSize: 28,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: darkTheme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalReturnBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...darkTheme.shadows.button,
  },
  modalReturnBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080B12',
  },
});
