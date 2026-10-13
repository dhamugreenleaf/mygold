import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { darkTheme } from '../../constants/theme';
import {
  createMonthlySubscription,
  verifyMonthlySubscription,
} from '../../services/profileService';

/**
 * In-App Razorpay Checkout Modal
 * Loads Razorpay Standard Checkout in a secured WebView, supporting
 * UPI (GPay, PhonePe, Paytm), Cards, NetBanking, and AutoPay subscriptions.
 */
export default function RazorpayCheckoutModal({
  isOpen,
  onClose,
  onSuccess,
  user,
  price = 10,
}) {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [checkoutData, setCheckoutData] = useState(null);
  const webViewRef = useRef(null);

  // Initialize subscription from backend when modal opens
  const initializeCheckout = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setVerifying(false);

      const res = await createMonthlySubscription();

      if (res?.data?.alreadyActive) {
        onSuccess?.({ alreadyActive: true });
        onClose?.();
        return;
      }

      if (!res?.data?.subscriptionId || !res?.data?.keyId) {
        throw new Error('Invalid subscription initialization data received.');
      }

      setCheckoutData(res.data);
    } catch (err) {
      console.error('Failed to initialize Razorpay checkout:', err);
      setErrorMsg(
        err.message || 'Unable to connect to Razorpay payment gateway. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [onClose, onSuccess]);

  useEffect(() => {
    if (isOpen) {
      initializeCheckout();
    } else {
      setCheckoutData(null);
      setErrorMsg(null);
      setVerifying(false);
    }
  }, [isOpen, initializeCheckout]);

  // Handle messages posted from Razorpay Checkout JS
  const handleMessage = async (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);

      if (payload.type === 'PAYMENT_SUCCESS') {
        const authData = payload.data;
        setVerifying(true);

        try {
          const verifyRes = await verifyMonthlySubscription({
            razorpay_subscription_id: authData.razorpay_subscription_id,
            razorpay_payment_id: authData.razorpay_payment_id,
            razorpay_signature: authData.razorpay_signature,
          });

          setVerifying(false);
          onSuccess?.(verifyRes);
          onClose?.();
        } catch (verifyErr) {
          setVerifying(false);
          setErrorMsg(
            verifyErr.message ||
              'Payment received but verification failed. Our system will sync shortly.'
          );
        }
      } else if (payload.type === 'PAYMENT_DISMISSED') {
        onClose?.();
      } else if (payload.type === 'PAYMENT_FAILED') {
        setErrorMsg(payload.error || 'Payment was declined or cancelled.');
      }
    } catch (err) {
      console.error('Error handling WebView message:', err);
    }
  };

  // Intercept UPI intents (gpay://, upi://, phonepe://, paytmmp://) on mobile devices
  const handleShouldStartLoadWithRequest = (request) => {
    const { url } = request;

    // Check for native UPI schemes
    if (
      url.startsWith('upi://') ||
      url.startsWith('tez://') ||
      url.startsWith('phonepe://') ||
      url.startsWith('paytmmp://') ||
      url.startsWith('cred://') ||
      url.startsWith('bhim://')
    ) {
      Linking.canOpenURL(url)
        .then((supported) => {
          if (supported) {
            Linking.openURL(url);
          } else {
            Linking.openURL(url).catch(() => {});
          }
        })
        .catch(() => {});
      return false;
    }

    return true;
  };

  if (!isOpen) return null;

  // Generate HTML containing the official Razorpay Checkout SDK
  const userName = (user?.username || user?.name || 'Member').replace(/"/g, '');
  const userEmail = (user?.email || 'vault@mygold.com').replace(/"/g, '');
  const rawPhone = (user?.phone || '').replace(/\D/g, '');
  const userPhone = rawPhone.length === 10 ? `+91${rawPhone}` : rawPhone;

  const checkoutHtml = checkoutData
    ? `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background-color: #080B12;
      color: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .loader-box {
      padding: 24px;
      max-width: 320px;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 4px solid rgba(245, 158, 11, 0.15);
      border-top: 4px solid #F59E0B;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
      margin: 0 auto 18px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    h2 { font-size: 16px; font-weight: 800; color: #F8FAFC; margin: 0 0 6px 0; }
    p { font-size: 12px; color: #94A3B8; margin: 0; }
  </style>
</head>
<body>
  <div class="loader-box">
    <div class="spinner"></div>
    <h2>Connecting to Razorpay</h2>
    <p>Opening secure AutoPay window...</p>
  </div>

  <script>
    (function() {
      const options = {
        key: "${checkoutData.keyId}",
        subscription_id: "${checkoutData.subscriptionId}",
        name: "MyGold",
        description: "${checkoutData.description || 'Monthly Premium Vault Subscription'}",
        theme: {
          color: "#F59E0B",
          backdrop_color: "rgba(8, 11, 18, 0.9)"
        },
        prefill: {
          name: "${userName}",
          email: "${userEmail}",
          contact: "${userPhone}"
        },
        handler: function(response) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PAYMENT_SUCCESS',
            data: response
          }));
        },
        modal: {
          ondismiss: function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PAYMENT_DISMISSED'
            }));
          }
        }
      };

      const rzp = new Razorpay(options);

      rzp.on('payment.failed', function(resp) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'PAYMENT_FAILED',
          error: (resp.error && resp.error.description) ? resp.error.description : 'Payment Failed'
        }));
      });

      // Auto-open Razorpay Checkout
      setTimeout(function() {
        rzp.open();
      }, 300);
    })();
  </script>
</body>
</html>`
    : '';

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Secure Checkout Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.shieldIconBox}>
              <Feather name="shield" size={16} color={darkTheme.colors.gold} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Razorpay Secure Checkout</Text>
              <Text style={styles.headerSubtitle}>256-Bit SSL Encrypted AutoPay</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.pricePill}>
              <Text style={styles.pricePillText}>₹{price}/mo</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close payment window"
            >
              <Feather name="x" size={20} color={darkTheme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Area */}
        <View style={styles.content}>
          {verifying ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={darkTheme.colors.gold} />
              <Text style={styles.stateTitle}>Verifying AutoPay...</Text>
              <Text style={styles.stateSubtitle}>
                Authorizing monthly vault plan. Please do not close this window.
              </Text>
            </View>
          ) : loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={darkTheme.colors.gold} />
              <Text style={styles.stateTitle}>Preparing Razorpay Gateway</Text>
              <Text style={styles.stateSubtitle}>
                Generating subscription order for ₹{price} / month...
              </Text>
            </View>
          ) : errorMsg ? (
            <View style={styles.centerState}>
              <View style={styles.errorIconBox}>
                <Feather name="alert-circle" size={32} color={darkTheme.colors.loss} />
              </View>
              <Text style={styles.stateTitle}>Payment Notice</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>

              <View style={styles.errorButtonsRow}>
                <TouchableOpacity
                  onPress={initializeCheckout}
                  style={styles.retryButton}
                  activeOpacity={0.85}
                >
                  <Text style={styles.retryButtonText}>Retry Payment</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onClose}
                  style={styles.cancelButton}
                  activeOpacity={0.85}
                >
                  <Text style={styles.cancelButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              source={{ html: checkoutHtml }}
              onMessage={handleMessage}
              onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
              javaScriptEnabled
              domStorageEnabled
              style={styles.webView}
              renderLoading={() => (
                <View style={styles.webLoadingOverlay}>
                  <ActivityIndicator size="small" color={darkTheme.colors.gold} />
                </View>
              )}
              startInLoadingState
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#080B12',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  shieldIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(232, 179, 49, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: darkTheme.colors.textMuted,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pricePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  pricePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: darkTheme.colors.gold,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#080B12',
  },
  webView: {
    flex: 1,
    backgroundColor: '#080B12',
  },
  webLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080B12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  errorIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorText: {
    fontSize: 12,
    color: '#FCA5A5',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  errorButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  retryButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#080B12',
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
});
