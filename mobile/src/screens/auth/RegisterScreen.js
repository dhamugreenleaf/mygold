import React, { useState, useEffect } from 'react';
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

export default function RegisterScreen({ navigation }) {
  const { register, requestRegisterOtp } = useAuth();
  const { t, isTamil } = useLanguage();

  // Step 1: Username, Email, Mobile (+91), Password (matching website)
  // Step 2: 6-digit OTP verification with countdown & resend (matching website)
  const [step, setStep] = useState(1);

  // Form Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Cooldown countdown timer for Resend OTP
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const maskMobile = (num) => {
    if (!num) return '';
    const str = String(num);
    if (str.length < 4) return str;
    return `******${str.slice(-4)}`;
  };

  // --- STEP 1: VALIDATION & REQUEST OTP ---
  const handleRequestOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    const cleanUsername = username.trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMessage(
        isTamil ? 'பயனர் பெயர் குறைந்தது 3 எழுத்துக்கள் இருக்க வேண்டும்.' : 'Username must be at least 3 characters.'
      );
      return;
    }
    if (!/^[a-zA-Z\s]+$/.test(cleanUsername)) {
      setErrorMessage(
        isTamil ? 'பயனர் பெயர் எழுத்துக்களாக மட்டுமே இருக்க வேண்டும்.' : 'Username can only contain alphabets and spaces.'
      );
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage(isTamil ? 'சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்.' : 'Please enter a valid email address.');
      return;
    }

    let cleanMobile = mobile.replace(/\D/g, '').replace(/^0+/, '');
    if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
      cleanMobile = cleanMobile.slice(2);
    } else if (cleanMobile.length > 10) {
      cleanMobile = cleanMobile.slice(-10);
    }
    if (!cleanMobile || cleanMobile.length !== 10) {
      setErrorMessage(isTamil ? 'சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்.' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage(isTamil ? 'கடவுச்சொல் குறைந்தது 6 எழுத்துக்கள் இருக்க வேண்டும்.' : 'Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      const res = await requestRegisterOtp(cleanUsername, cleanMobile);
      setSuccessMessage(
        res?.message || (isTamil ? 'OTP உங்கள் மொபைல் எண்ணிற்கு அனுப்பப்பட்டது.' : 'OTP sent successfully to your mobile.')
      );
      setStep(2);
      setCooldown(60);
    } catch (err) {
      setErrorMessage(err.message || (isTamil ? 'OTP அனுப்ப முடியவில்லை.' : 'Failed to send OTP. Please check your details.'));
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 2: VERIFY OTP & COMPLETE REGISTRATION ---
  const handleVerifyOtp = async () => {
    setErrorMessage('');
    const cleanOtp = String(otp || '').trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setErrorMessage(isTamil ? '6 இலக்க OTP குறியீட்டை உள்ளிடவும்.' : 'Please enter the 6-digit OTP code.');
      return;
    }

    try {
      setLoading(true);
      let cleanMobile = mobile.replace(/\D/g, '').replace(/^0+/, '');
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.slice(2);
      } else if (cleanMobile.length > 10) {
        cleanMobile = cleanMobile.slice(-10);
      }
      const cleanUsername = username.trim();
      const cleanEmail = email.trim().toLowerCase();

      await register({
        username: cleanUsername,
        email: cleanEmail,
        password,
        mobile: cleanMobile,
        otp: cleanOtp,
      });
      // AuthContext sets token, user, and isAuthenticated = true on success
    } catch (err) {
      setErrorMessage(
        err.message || (isTamil ? 'தவறான OTP குறியீடு.' : 'Invalid OTP. Please check and try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  // --- RESEND OTP ---
  const handleResendOtp = async () => {
    if (cooldown > 0 || loading) return;
    setErrorMessage('');
    setSuccessMessage('');

    try {
      setLoading(true);
      let cleanMobile = mobile.replace(/\D/g, '').replace(/^0+/, '');
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.slice(2);
      } else if (cleanMobile.length > 10) {
        cleanMobile = cleanMobile.slice(-10);
      }
      const cleanUsername = username.trim();
      const res = await requestRegisterOtp(cleanUsername, cleanMobile);
      setSuccessMessage(
        res?.message || (isTamil ? 'OTP மீண்டும் அனுப்பப்பட்டது.' : 'OTP resent to your mobile.')
      );
      setCooldown(60);
    } catch (err) {
      setErrorMessage(err.message || (isTamil ? 'மீண்டும் OTP அனுப்ப முடியவில்லை.' : 'Failed to resend OTP.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Ambient Gold Glow Matching Website radial-gradient */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={['rgba(245, 158, 11, 0.14)', 'rgba(217, 119, 6, 0.03)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.55 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
        >
          <View style={styles.innerContainer}>
            {/* Header Matching Website */}
            <View style={styles.headerContainer}>
            {/* Amber/Gold Gradient Badge (rotate-3) */}
            <LinearGradient
              colors={['#FBBF24', '#D97706', '#B45309']}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={styles.iconBadge}
            >
              <Feather name="shield" size={32} color="#FFFFFF" style={styles.shieldIcon} />
            </LinearGradient>

            <Text style={styles.titleText}>{t('registerTitle')}</Text>
            <Text style={styles.subtitleText}>
              {step === 1
                ? t('registerSubtitle')
                : (isTamil ? 'தொடர உங்கள் மொபைல் எண்ணை சரிபார்க்கவும்.' : 'Verify your mobile number to continue.')}
            </Text>
          </View>

          {/* Form Card Matching Website */}
          <View style={styles.card}>
            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Feather name="alert-circle" size={16} color={darkTheme.colors.loss} style={styles.bannerIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Success Banner */}
            {successMessage && step === 2 ? (
              <View style={styles.successBanner}>
                <Feather name="check-circle" size={16} color={darkTheme.colors.profit} style={styles.bannerIcon} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {/* ==================================================== */}
            {/* STEP 1: Registration Form Details (matching website) */}
            {/* ==================================================== */}
            {step === 1 ? (
              <>
                {/* 1. Username */}
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
                      placeholder={isTamil ? 'பயனர் பெயரைத் தேர்வு செய்யவும்' : 'Choose a username'}
                      placeholderTextColor="#64748B"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      accessibilityLabel="Username input"
                    />
                  </View>
                </View>

                {/* 2. Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{isTamil ? 'மின்னஞ்சல்' : 'Email'}</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="mail" size={18} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="name@example.com"
                      placeholderTextColor="#64748B"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      accessibilityLabel="Email input"
                    />
                  </View>
                </View>

                {/* 3. Mobile Number with +91 Prefix */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('mobileNumber')}</Text>
                  <View style={styles.mobileInputContainer}>
                    <View style={styles.countryCodeBadge}>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <TextInput
                      style={styles.mobileTextInput}
                      value={mobile}
                      onChangeText={(text) => {
                        let digits = text.replace(/\D/g, '');
                        if (digits.length === 12 && digits.startsWith('91')) {
                          digits = digits.slice(2);
                        } else if (digits.length > 10) {
                          digits = digits.slice(-10);
                        }
                        setMobile(digits);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="9876543210"
                      placeholderTextColor="#64748B"
                      keyboardType="phone-pad"
                      maxLength={10}
                      editable={!loading}
                      accessibilityLabel="Mobile number input"
                    />
                  </View>
                </View>

                {/* 4. Password */}
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
                      placeholder={isTamil ? 'கடவுச்சொல் (குறைந்தது 6 எழுத்துக்கள்)' : 'At least 6 characters'}
                      placeholderTextColor="#64748B"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      accessibilityLabel="Password input"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={loading}
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

                {/* Send OTP Metallic Gold Gradient Button Matching Website */}
                <TouchableOpacity
                  style={[styles.buttonWrapper, loading && styles.buttonDisabled]}
                  onPress={handleRequestOtp}
                  disabled={loading}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="Send OTP button"
                >
                  <LinearGradient
                    colors={['#FDE68A', '#F59E0B', '#B45309']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryGradientButton}
                  >
                    {loading ? (
                      <View style={styles.buttonContentRow}>
                        <ActivityIndicator color="#080B12" size="small" />
                        <Text style={styles.primaryButtonText}>
                          {isTamil ? 'OTP அனுப்பப்படுகிறது...' : 'Sending OTP...'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.buttonContentRow}>
                        <Text style={styles.primaryButtonText}>{t('sendOtp')}</Text>
                        <Feather name="arrow-right" size={18} color="#080B12" style={styles.arrowIcon} />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              /* ==================================================== */
              /* STEP 2: OTP Verification Form (matching website)     */
              /* ==================================================== */
              <>
                {/* Masked Mobile Header Banner */}
                <View style={styles.otpNoticeBox}>
                  <Text style={styles.otpNoticeText}>
                    {isTamil ? 'OTP அனுப்பப்பட்ட எண்: ' : 'Enter 6-digit OTP sent to '}
                    <Text style={styles.otpNoticeBold}>+91 {maskMobile(mobile)}</Text>
                  </Text>
                </View>

                {/* Large Centered 6-digit OTP Input */}
                <View style={styles.otpInputWrapper}>
                  <TextInput
                    style={styles.otpLargeInput}
                    value={otp}
                    onChangeText={(text) => {
                      setOtp(text.replace(/\D/g, '').slice(0, 6));
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="• • • • • •"
                    placeholderTextColor="#64748B"
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete={Platform.OS === 'ios' ? 'one-time-code' : 'sms-otp'}
                    maxLength={6}
                    autoFocus
                    editable={!loading}
                    accessibilityLabel="OTP Verification Input"
                  />
                </View>

                {/* Verify & Create Account Metallic Gold Gradient Button */}
                <TouchableOpacity
                  style={[styles.buttonWrapper, loading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="Verify and Register button"
                >
                  <LinearGradient
                    colors={['#FDE68A', '#F59E0B', '#B45309']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryGradientButton}
                  >
                    {loading ? (
                      <View style={styles.buttonContentRow}>
                        <ActivityIndicator color="#080B12" size="small" />
                        <Text style={styles.primaryButtonText}>
                          {isTamil ? 'சரிபார்க்கிறது...' : 'Verifying...'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.primaryButtonText}>{t('verifyAndRegister')}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Secondary Action Row: Change Number & Resend OTP */}
                <View style={styles.step2ActionsRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setStep(1);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    disabled={loading}
                    style={styles.actionTouchTarget}
                    accessibilityRole="button"
                  >
                    <Text style={styles.changeNumberText}>
                      ← {isTamil ? 'எண்ணை மாற்றுக' : 'Change Number'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={cooldown > 0 || loading}
                    style={styles.actionTouchTarget}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.resendOtpText, cooldown > 0 && styles.resendOtpDisabled]}>
                      {cooldown > 0
                        ? `${t('resendOtp')} (${cooldown}s)`
                        : t('resendOtp')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

            {/* Login Footer Matching Website */}
            <View style={styles.loginFooter}>
              <Text style={styles.footerText}>{t('haveAccountPrompt')} </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                disabled={loading}
                accessibilityRole="link"
                accessibilityLabel="Login Now"
              >
                <Text style={styles.loginLinkText}>{t('loginNow')}</Text>
              </TouchableOpacity>
            </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  innerContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
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
    transform: [{ rotate: '3deg' }],
  },
  shieldIcon: {
    transform: [{ rotate: '-3deg' }],
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  bannerIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: '#FB7185',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  successText: {
    flex: 1,
    color: '#34D399',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 14,
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
  mobileInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    height: 50,
    overflow: 'hidden',
  },
  countryCodeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  countryCodeText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '800',
  },
  mobileTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 14,
  },
  eyeButton: {
    padding: 6,
  },
  buttonWrapper: {
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 14,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryGradientButton: {
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
  primaryButtonText: {
    color: '#080B12',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  arrowIcon: {
    marginLeft: 2,
  },
  otpNoticeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    paddingVertical: 6,
  },
  otpNoticeText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
  },
  otpNoticeBold: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  otpInputWrapper: {
    marginBottom: 16,
  },
  otpLargeInput: {
    backgroundColor: '#020617',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 14,
    height: 56,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 10,
  },
  step2ActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 6,
    marginBottom: 4,
  },
  actionTouchTarget: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  changeNumberText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  resendOtpText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
  resendOtpDisabled: {
    opacity: 0.5,
    color: '#94A3B8',
  },
  loginFooter: {
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
  loginLinkText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
});
