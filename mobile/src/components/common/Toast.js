import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { darkTheme } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 440);

const TYPE_CONFIG = {
  success: {
    accent: '#10B981',
    bgBadge: 'rgba(16, 185, 129, 0.15)',
    icon: 'check-circle',
    defaultTitle: 'Success',
  },
  error: {
    accent: '#EF4444',
    bgBadge: 'rgba(239, 68, 68, 0.15)',
    icon: 'alert-circle',
    defaultTitle: 'Error',
  },
  info: {
    accent: '#3B82F6',
    bgBadge: 'rgba(59, 130, 246, 0.15)',
    icon: 'info',
    defaultTitle: 'Notice',
  },
  warning: {
    accent: '#F59E0B',
    bgBadge: 'rgba(245, 158, 11, 0.15)',
    icon: 'alert-triangle',
    defaultTitle: 'Warning',
  },
};

export default function Toast({
  visible = false,
  type = 'success',
  title = '',
  message = '',
  onClose,
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const topInset = Math.max(insets?.top || 0, Platform.OS === 'web' ? 16 : 12);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, opacity]);

  if (!visible && opacity._value === 0) {
    return null;
  }

  const displayTitle = title || config.defaultTitle;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          top: topInset,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={[styles.card, { borderLeftColor: config.accent }]}>
        {/* Icon Badge */}
        <View style={[styles.iconBadge, { backgroundColor: config.bgBadge }]}>
          <Feather name={config.icon} size={20} color={config.accent} />
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          {Boolean(displayTitle) && (
            <Text style={styles.title} numberOfLines={1}>
              {displayTitle}
            </Text>
          )}
          {Boolean(message) && (
            <Text style={styles.message} numberOfLines={3}>
              {message}
            </Text>
          )}
        </View>

        {/* Dismiss Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
        >
          <Feather name="x" size={16} color={darkTheme.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
    elevation: 10,
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: TOAST_MAX_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111726',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: '#94A3B8',
  },
  closeButton: {
    marginLeft: 10,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
