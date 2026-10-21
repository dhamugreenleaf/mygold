import React, { useState, useEffect, useRef } from 'react';
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
import {
  requestForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword,
} from '../../services/authService';
import OtpInput from '../../components/forms/OtpInput';
import { darkTheme } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { gradientPresets } from '../../constants/colors';

export default function ForgotPasswordScreen({ navigation }) {
  // Steps: 1 = Request OTP, 2 = Verify OTP, 3 = Reset Password, 4 = Success
  const [step, setStep] = useState(1);

  // Step 1 State
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');

  // Step 2 State
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Step 3 State (Ephemeral resetToken strictly in component memory)
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  const timerRef = useRef(null);

  // Cooldown countdown effect
  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldown]);

  // Clean up resetToken state if user unmounts/leaves
  useEffect(() => {
    return () => {
      setResetToken('');
    };
  }, []);

  const maskMobile = (num) => {
    if (!num) return '';
    const clean = String(num).replace(/\D/g, '');
    if (clean.length < 4) return clean;
    return `******${clean.slice(-4)}`;
  };

  // ==========================================
  // STEP 1: REQUEST OTP
  // ==========================================
  const handleRequestOtp = async () => {
    setErrorMessage('');
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage('Please enter your username.');
      return;
    }

    let cleanMobile = mobile.replace(/\D/g, '').replace(/^0+/, '');
    if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
      cleanMobile = cleanMobile.slice(2);
    } else if (cleanMobile.length > 10) {
      cleanMobile = cleanMobile.slice(-10);
    }
    if (!cleanMobile || cleanMobile.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setLoading(true);
      const res = await requestForgotPasswordOtp(cleanUsername, cleanMobile);
      if (res?.success) {
        setStep(2);
        setCooldown(30);
        setOtp('');
        setSuccessNotice('OTP sent to your registered mobile number.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send OTP. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STEP 2: VERIFY OTP
  // ==========================================
  const handleVerifyOtp = async () => {
    setErrorMessage('');
    const cleanOtp = String(otp || '').trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setErrorMessage('Please enter the OTP code.');
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);

    try {
      setLoading(true);
      const res = await verifyForgotPasswordOtp(username.trim(), cleanMobile, cleanOtp);
      if (res?.success && res.data?.resetToken) {
        setResetToken(res.data.resetToken);
        setStep(3);
        setSuccessNotice('');
      } else {
        setErrorMessage(res?.message || 'Invalid OTP code.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || loading) return;
    setErrorMessage('');
    const cleanMobile = mobile.replace(/\D/g, '').replace(/^0+/, '');

    try {
      setLoading(true);
      const res = await requestForgotPasswordOtp(username.trim(), cleanMobile);
      if (res?.success) {
        setCooldown(30);
        setSuccessNotice('A new OTP has been sent to your mobile.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STEP 3: RESET PASSWORD
  // ==========================================
  const handleResetPassword = async () => {
    setErrorMessage('');
    if (!newPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!resetToken) {
      setErrorMessage('Reset authorization expired. Please restart the request.');
      setStep(1);
      return;
    }

    try {
      setLoading(true);
      const res = await resetPassword(resetToken, newPassword);
      if (res?.success) {
        // Clear sensitive token from state immediately
        setResetToken('');
        setNewPassword('');
        setConfirmPassword('');
        setStep(4);
      } else {
        setErrorMessage(res?.message || 'Failed to reset password.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reset password. Session may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.ambientGlow}>
        <LinearGradient
          colors={gradientPresets.ambientGlow}
          style={StyleSheet.absoluteFill}
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
            {/* Top Bar with Back Button */}
            <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (step === 2) {
                  setStep(1);
                  setErrorMessage('');
                } else {
                  navigation.navigate('Login');
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Feather name="arrow-left" size={20} color={darkTheme.colors.gold} />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>
              {step === 4 ? 'Complete' : 'Password Recovery'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <LinearGradient
              colors={gradientPresets.goldMetallic}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <Feather
                name={step === 4 ? 'check-circle' : step === 3 ? 'lock' : 'key'}
                size={28}
                color="#080B12"
              />
            </LinearGradient>
            <Text style={styles.brandTitle}>MYGOLD</Text>
            <Text style={styles.welcomeText}>
              {step === 1 && 'Reset Password'}
              {step === 2 && 'Verify Mobile'}
              {step === 3 && 'New Password'}
              {step === 4 && 'Password Updated'}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {step === 1 && 'Enter your username and registered mobile number to receive a verification code'}
              {step === 2 && `Enter the 6-digit OTP code sent to +91 ${maskMobile(mobile)}`}
              {step === 3 && 'Choose a strong new password with at least 6 characters'}
              {step === 4 && 'Your password has been successfully reset. You can now sign in with your new credentials.'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Feather
                  name="alert-circle"
                  size={16}
                  color={darkTheme.colors.loss}
                  style={styles.errorIcon}
                />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Success Info Banner */}
            {successNotice ? (
              <View style={styles.successBanner}>
                <Feather
                  name="info"
                  size={16}
                  color={darkTheme.colors.gold}
                  style={styles.errorIcon}
                />
                <Text style={styles.successNoticeText}>{successNotice}</Text>
              </View>
            ) : null}

            {/* ==================================================== */}
            {/* STAGE 1: Username & Mobile Form */}
            {/* ==================================================== */}
            {step === 1 && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Username</Text>
                  <View style={styles.inputContainer}>
                    <Feather
                      name="user"
                      size={18}
                      color={darkTheme.colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={username}
                      onChangeText={(text) => {
                        setUsername(text);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="Enter registered username"
                      placeholderTextColor={darkTheme.colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      accessibilityLabel="Username input"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Registered Mobile Number</Text>
                  <View style={styles.inputContainer}>
                    <Feather
                      name="phone"
                      size={18}
                      color={darkTheme.colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <Text style={styles.countryCodePrefix}>+91</Text>
                    <TextInput
                      style={[styles.textInput, { paddingLeft: 6 }]}
                      value={mobile}
                      onChangeText={(text) => {
                        setMobile(text.replace(/\D/g, '').slice(0, 10));
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="10-digit mobile"
                      placeholderTextColor={darkTheme.colors.textMuted}
                      keyboardType="phone-pad"
                      maxLength={10}
                      editable={!loading}
                      accessibilityLabel="Mobile number input"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleRequestOtp}
                  disabled={loading}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="Request OTP button"
                >
                  <LinearGradient
                    colors={loading ? ['#64748B', '#475569'] : gradientPresets.goldMetallic}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryButton}
                  >
                    {loading ? (
                      <ActivityIndicator color="#080B12" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* ==================================================== */}
            {/* STAGE 2: 6-Digit OTP Verification */}
            {/* ==================================================== */}
            {step === 2 && (
              <>
                <Text style={styles.otpHelperText}>
                  Please enter the 6-digit verification code:
                </Text>

                <OtpInput
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    if (errorMessage) setErrorMessage('');
                  }}
                  length={6}
                  disabled={loading}
                />

                <View style={styles.cooldownContainer}>
                  {cooldown > 0 ? (
                    <Text style={styles.cooldownText}>
                      Resend code in <Text style={styles.cooldownHighlight}>{cooldown}s</Text>
                    </Text>
                  ) : (
                    <TouchableOpacity
                      onPress={handleResendOtp}
                      disabled={loading}
                      accessibilityRole="button"
                      accessibilityLabel="Resend OTP"
                    >
                      <Text style={styles.resendLinkText}>Resend Code</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  disabled={loading || otp.length < 6}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="Verify OTP button"
                >
                  <LinearGradient
                    colors={loading || otp.length < 6 ? ['#64748B', '#475569'] : gradientPresets.goldMetallic}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryButton}
                  >
                    {loading ? (
                      <ActivityIndicator color="#080B12" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Verify & Proceed</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.changeDetailsBtn}
                  onPress={() => {
                    setStep(1);
                    setErrorMessage('');
                  }}
                  disabled={loading}
                >
                  <Text style={styles.changeDetailsText}>Edit Mobile Number</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ==================================================== */}
            {/* STAGE 3: New Password Form */}
            {/* ==================================================== */}
            {step === 3 && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.inputContainer}>
                    <Feather
                      name="lock"
                      size={18}
                      color={darkTheme.colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="At least 6 characters"
                      placeholderTextColor={darkTheme.colors.textMuted}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      accessibilityLabel="New password input"
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
                        color={darkTheme.colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <View style={styles.inputContainer}>
                    <Feather
                      name="lock"
                      size={18}
                      color={darkTheme.colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="Re-enter new password"
                      placeholderTextColor={darkTheme.colors.textMuted}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      accessibilityLabel="Confirm password input"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                      accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      accessibilityRole="button"
                    >
                      <Feather
                        name={showConfirmPassword ? 'eye-off' : 'eye'}
                        size={18}
                        color={darkTheme.colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="Update Password button"
                >
                  <LinearGradient
                    colors={loading ? ['#64748B', '#475569'] : gradientPresets.goldMetallic}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryButton}
                  >
                    {loading ? (
                      <ActivityIndicator color="#080B12" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Update Password</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* ==================================================== */}
            {/* STAGE 4: Success Card */}
            {/* ==================================================== */}
            {step === 4 && (
              <View style={styles.successContainer}>
                <View style={styles.successIconBox}>
                  <Feather name="check" size={32} color="#080B12" />
                </View>
                <Text style={styles.successHeadline}>Password Reset Complete</Text>
                <Text style={styles.successDescription}>
                  Your vault access credentials have been securely updated. Please sign in with your new password.
                </Text>

                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="Return to Sign In"
                >
                  <LinearGradient
                    colors={gradientPresets.goldMetallic}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryButtonText}>Sign In Now</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Back to Login Footer (for steps 1-3) */}
            {step !== 4 && (
              <View style={styles.loginFooter}>
                <Text style={styles.footerText}>Remember your credentials? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  disabled={loading}
                  accessibilityRole="link"
                  accessibilityLabel="Return to Login"
                >
                  <Text style={styles.loginLinkText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            )}
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
    backgroundColor: darkTheme.colors.background,
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: darkTheme.layout.screenPaddingHorizontal,
    paddingVertical: 16,
  },
  innerContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: darkTheme.colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    color: darkTheme.colors.gold,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: darkTheme.colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  card: {
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: darkTheme.borderRadius.xl,
    padding: darkTheme.layout.cardPaddingLarge,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.lossBg,
    borderRadius: darkTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: darkTheme.colors.loss,
    fontWeight: '600',
    lineHeight: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 179, 49, 0.1)',
    borderRadius: darkTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  successNoticeText: {
    flex: 1,
    fontSize: 12,
    color: darkTheme.colors.gold,
    fontWeight: '600',
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: darkTheme.colors.textMuted,
    marginBottom: 8,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderRadius: darkTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  countryCodePrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: darkTheme.colors.gold,
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    color: darkTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    height: '100%',
  },
  eyeButton: {
    padding: 6,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpHelperText: {
    fontSize: 13,
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  cooldownContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  cooldownText: {
    fontSize: 13,
    color: darkTheme.colors.textMuted,
    fontWeight: '500',
  },
  cooldownHighlight: {
    color: darkTheme.colors.gold,
    fontWeight: '700',
  },
  resendLinkText: {
    fontSize: 13,
    color: darkTheme.colors.gold,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  primaryButton: {
    borderRadius: darkTheme.borderRadius.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: darkTheme.colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#080B12',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  changeDetailsBtn: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  changeDetailsText: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successIconBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: darkTheme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: darkTheme.colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  successHeadline: {
    fontSize: 20,
    fontWeight: '700',
    color: darkTheme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 13,
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  loginFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.borderSubtle,
  },
  footerText: {
    fontSize: 13,
    color: darkTheme.colors.textMuted,
  },
  loginLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: darkTheme.colors.gold,
  },
});
