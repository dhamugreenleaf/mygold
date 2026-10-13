import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useAuth from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { darkTheme } from '../../constants/theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { t, isTamil } = useLanguage();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validate = () => {
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage(isTamil ? 'பயனர் பெயர் மற்றும் கடவுச்சொல் தேவை.' : 'Username and password are required.');
      return false;
    }
    if (!/^[a-zA-Z\s]+$/.test(cleanUsername)) {
      setErrorMessage(isTamil ? 'பயனர் பெயர் எழுத்துக்களாக மட்டுமே இருக்க வேண்டும்.' : 'Username can only contain alphabets and spaces.');
      return false;
    }
    if (!password) {
      setErrorMessage(isTamil ? 'கடவுச்சொல்லை உள்ளிடவும்.' : 'Please enter your password.');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    setErrorMessage('');
    if (!validate()) return;

    try {
      setSubmitting(true);
      await login(username.trim(), password);
    } catch (err) {
      setErrorMessage(
        err.message || (isTamil ? 'பயனர் பெயர் அல்லது கடவுச்சொல் தவறானது.' : 'Invalid username or password.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Ambient Gold Glow Matching Website radial-gradient */}
      <LinearGradient
        colors={['rgba(245, 158, 11, 0.14)', 'rgba(217, 119, 6, 0.03)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header Matching Website */}
          <View style={styles.headerContainer}>
            {/* Amber/Gold Gradient Badge */}
            <LinearGradient
              colors={['#FBBF24', '#D97706', '#B45309']}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={styles.iconBadge}
            >
              <Feather name="shield" size={32} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.titleText}>{t('welcomeBack')}</Text>
            <Text style={styles.subtitleText}>{t('loginSubtitle')}</Text>
          </View>

          {/* Form Card Matching Website */}
          <View style={styles.card}>
            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Feather name="alert-circle" size={16} color={darkTheme.colors.loss} style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('username')}</Text>
              <View style={styles.inputContainer}>
                <Feather name="user" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text.replace(/[^a-zA-Z\s]/g, ''));
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder={isTamil ? 'பயனர் பெயரை உள்ளிடவும்' : 'Enter your username'}
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!submitting}
                  accessibilityLabel="Username input"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('passwordLabel')}</Text>
              <View style={styles.inputContainer}>
                <Feather name="lock" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder={t('passwordPlaceholder')}
                  placeholderTextColor="#64748B"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!submitting}
                  accessibilityLabel="Password input"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={submitting}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  accessibilityRole="button"
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={18}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Credentials Row */}
            <View style={styles.forgotRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotUsername')}
                disabled={submitting}
                accessibilityRole="link"
                accessibilityLabel="Forgot Username"
                style={styles.forgotTouchTarget}
              >
                <Text style={styles.forgotLinkTextMuted}>{t('forgotUsername')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                disabled={submitting}
                accessibilityRole="link"
                accessibilityLabel="Forgot Password"
                style={styles.forgotTouchTarget}
              >
                <Text style={styles.forgotLinkTextGold}>{t('forgotPassword')}</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button Matching Website Metallic Gold Gradient */}
            <TouchableOpacity
              style={[styles.buttonWrapper, submitting && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={submitting}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Sign in button"
            >
              <LinearGradient
                colors={['#FDE68A', '#F59E0B', '#B45309']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loginGradientButton}
              >
                {submitting ? (
                  <View style={styles.buttonContentRow}>
                    <ActivityIndicator color="#080B12" size="small" />
                    <Text style={styles.loginButtonText}>{t('signingInBtn')}</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContentRow}>
                    <Text style={styles.loginButtonText}>{t('signInBtn')}</Text>
                    <Feather name="arrow-right" size={18} color="#080B12" style={styles.arrowIcon} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Register Footer */}
          <View style={styles.registerFooter}>
            <Text style={styles.footerText}>{t('noAccountPrompt')} </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              disabled={submitting}
              accessibilityRole="link"
              accessibilityLabel="Register Now"
            >
              <Text style={styles.registerLinkText}>{t('registerNow')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#080B12',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: '#FB7185',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#64748B',
    marginBottom: 6,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  eyeButton: {
    padding: 6,
  },
  forgotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 2,
  },
  forgotTouchTarget: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  forgotLinkTextMuted: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  forgotLinkTextGold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  buttonWrapper: {
    marginTop: 6,
    marginBottom: 16,
    borderRadius: 14,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  loginGradientButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: '#080B12',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  arrowIcon: {
    marginLeft: 2,
  },
  registerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  registerLinkText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
});
