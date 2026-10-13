import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { gradientPresets } from '../../constants/colors';
import { darkTheme } from '../../constants/theme';

export default function DocumentViewerModal({
  isOpen = false,
  onClose,
  title = 'Document',
  subtitle = '',
  imageUrl = null,
  documentUrl = null,
  token = null,
  isPdf = false,
}) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  if (!isOpen) return null;

  const handleOpenExternal = async () => {
    const targetUrl = documentUrl || imageUrl;
    if (!targetUrl) return;

    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
      }
    } catch (err) {
      console.warn('[DocumentViewerModal] Unable to open document URL:', err?.message || err);
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close document viewer"
            >
              <Feather name="x" size={20} color={darkTheme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Content Body */}
          <View style={styles.body}>
            {isPdf ? (
              <View style={styles.pdfNoticeBox}>
                <View style={styles.pdfIconCircle}>
                  <Feather name="file-text" size={32} color={darkTheme.colors.gold} />
                </View>
                <Text style={styles.pdfTitle}>Invoice Document</Text>
                <Text style={styles.pdfSubtitle}>
                  This invoice is formatted as a PDF document. Tap below to view or open it in your browser.
                </Text>
                {documentUrl ? (
                  <TouchableOpacity
                    onPress={handleOpenExternal}
                    activeOpacity={0.88}
                    accessibilityRole="button"
                    accessibilityLabel="Open PDF invoice in browser"
                  >
                    <LinearGradient
                      colors={gradientPresets.goldMetallic}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.openExternalButton}
                    >
                      <Feather name="external-link" size={16} color="#080B12" style={{ marginRight: 6 }} />
                      <Text style={styles.openExternalButtonText}>Open Invoice</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : imageUrl ? (
              <View style={styles.imageContainer}>
                {imageLoading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={darkTheme.colors.gold} />
                  </View>
                )}
                {imageError ? (
                  <View style={styles.errorBox}>
                    <Feather name="image" size={36} color={darkTheme.colors.textMuted} />
                    <Text style={styles.errorText}>Unable to load photo preview.</Text>
                    {imageUrl && (
                      <TouchableOpacity
                        style={styles.retryLink}
                        onPress={handleOpenExternal}
                      >
                        <Text style={styles.retryLinkText}>Open in browser</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <Image
                    source={{
                      uri: imageUrl,
                      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    }}
                    style={styles.image}
                    resizeMode="contain"
                    onLoadEnd={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                  />
                )}
              </View>
            ) : (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={32} color={darkTheme.colors.textMuted} />
                <Text style={styles.errorText}>No document preview available.</Text>
              </View>
            )}
          </View>

          {/* Footer with Open in Browser option */}
          {!isPdf && (documentUrl || imageUrl) && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.footerOpenButton}
                onPress={handleOpenExternal}
                accessibilityRole="button"
                accessibilityLabel="Open document in browser"
              >
                <Feather name="external-link" size={14} color={darkTheme.colors.gold} style={{ marginRight: 6 }} />
                <Text style={styles.footerOpenButtonText}>Open in browser</Text>
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    overflow: 'hidden',
    ...darkTheme.shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.borderSubtle,
  },
  headerTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: 16,
    minHeight: 260,
    maxHeight: 440,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.backgroundCard,
    zIndex: 2,
  },
  errorBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 10,
    fontSize: 13,
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
  },
  retryLink: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  retryLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.gold,
  },
  pdfNoticeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pdfIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(232, 179, 49, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  pdfTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    marginBottom: 6,
  },
  pdfSubtitle: {
    fontSize: 13,
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  openExternalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    ...darkTheme.shadows.button,
  },
  openExternalButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080B12',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.borderSubtle,
    alignItems: 'center',
  },
  footerOpenButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerOpenButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.gold,
  },
});
