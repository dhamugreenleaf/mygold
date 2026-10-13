import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { darkTheme } from '../../constants/theme';

export default function ConfirmModal({
  isOpen = false,
  title = 'Delete Asset',
  message = 'Are you sure you want to remove this asset from your vault? This action cannot be undone.',
  confirmText = 'Delete Asset',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!loading && onCancel) onCancel();
      }}
    >
      <Pressable
        style={styles.backdrop}
        onPress={() => {
          if (!loading && onCancel) onCancel();
        }}
      >
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onCancel}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Close confirmation dialog"
          >
            <Feather name="x" size={20} color={darkTheme.colors.textMuted} />
          </TouchableOpacity>

          {/* Warning Icon Badge */}
          <View style={styles.iconCircle}>
            <Feather name="trash-2" size={24} color={darkTheme.colors.loss} />
          </View>

          {/* Title & Message */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Actions */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={cancelText}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={confirmText}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    padding: 24,
    alignItems: 'center',
    ...darkTheme.shadows.card,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: darkTheme.colors.lossBg,
    borderWidth: 1,
    borderColor: darkTheme.colors.lossBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: darkTheme.colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: darkTheme.colors.loss,
    justifyContent: 'center',
    alignItems: 'center',
    ...darkTheme.shadows.button,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
