import React, { useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { darkTheme } from '../../constants/theme';

/**
 * Native 6-digit OTP Input Component
 * Uses native React Native TextInput with refs, auto-focus forward,
 * backspace navigation, and multi-digit paste support.
 */
export default function OtpInput({
  value = '',
  onChange,
  length = 6,
  disabled = false,
  error = null,
}) {
  const inputRefs = useRef([]);

  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const handleChangeText = (text, index) => {
    if (disabled) return;

    const cleaned = text.replace(/\D/g, '');

    // Handle paste of full or partial code
    if (cleaned.length > 1) {
      const pastedCode = cleaned.slice(0, length);
      if (onChange) onChange(pastedCode);
      const nextFocus = Math.min(pastedCode.length, length - 1);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    // Handle single digit entry
    const newDigits = [...digits];
    newDigits[index] = cleaned;
    const combined = newDigits.join('').slice(0, length);
    if (onChange) onChange(combined);

    // Auto-focus next box if digit was typed
    if (cleaned && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (disabled) return;

    if (e.nativeEvent.key === 'Backspace') {
      // If current box is empty, navigate back to previous box and clear it
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        if (onChange) onChange(newDigits.join(''));
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.boxesRow}>
        {Array.from({ length }).map((_, i) => {
          const isFilled = Boolean(digits[i]);
          return (
            <TextInput
              key={`otp-box-${i}`}
              ref={(ref) => (inputRefs.current[i] = ref)}
              style={[
                styles.box,
                isFilled && styles.boxFilled,
                error && styles.boxError,
              ]}
              value={digits[i]}
              onChangeText={(text) => handleChangeText(text, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete={Platform.OS === 'ios' ? 'one-time-code' : 'sms-otp'}
              maxLength={i === 0 ? length : 1}
              selectTextOnFocus
              editable={!disabled}
              textAlign="center"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={`OTP digit ${i + 1}`}
              returnKeyType="done"
            />
          );
        })}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 12,
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 320,
    gap: 8,
  },
  box: {
    flex: 1,
    height: 54,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1.5,
    borderColor: darkTheme.colors.borderSubtle,
    borderRadius: 14,
    color: darkTheme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  boxFilled: {
    borderColor: darkTheme.colors.gold,
    backgroundColor: 'rgba(232, 179, 49, 0.08)',
  },
  boxError: {
    borderColor: darkTheme.colors.loss,
    backgroundColor: darkTheme.colors.lossBg,
  },
  errorText: {
    fontSize: 12,
    color: darkTheme.colors.loss,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});
