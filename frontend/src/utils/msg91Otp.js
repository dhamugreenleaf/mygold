/**
 * MSG91 Secure OTP Web SDK Integration
 * Widget ID: 3668716a4864373039323834
 * Token Auth: 560885T2kcvOrbS46a82e3fcP1
 */

const WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID || '3668716a4864373039323834';
const TOKEN_AUTH = import.meta.env.VITE_MSG91_WIDGET_TOKEN || '560885T2kcvOrbS46a82e3fcP1';

/**
 * Format Indian mobile into 91XXXXXXXXXX
 */
export const formatIndianMobile = (mobile) => {
  if (!mobile) return '';
  let cleaned = String(mobile).replace(/\D/g, '');
  cleaned = cleaned.replace(/^0+/, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  }
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  return `91${cleaned.slice(-10)}`;
};

let isWidgetInitialized = false;

const loadScript = () => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.initSendOTP) return Promise.resolve(true);

  // Skip widget script injection on localhost to prevent reCAPTCHA/hCaptcha domain mismatch errors
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    if (document.getElementById('msg91-otp-script')) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.id = 'msg91-otp-script';
    script.type = 'text/javascript';
    script.src = 'https://control.msg91.com/app/assets/otp-provider/otp-provider.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
};

/**
 * Step 3.1 & 3.2: Wait for SDK and initialize window.configuration (Singleton)
 */
export const initSendOtpWidget = async (mobile, { onSuccess, onFailure } = {}) => {
  const formattedMobile = formatIndianMobile(mobile);

  if (isWidgetInitialized && window.configuration) {
    window.configuration.identifier = formattedMobile;
    if (onSuccess) window.configuration.success = onSuccess;
    if (onFailure) window.configuration.failure = onFailure;
    return true;
  }

  const loaded = await loadScript();
  if (!loaded) return false;

  return new Promise((resolve) => {
    const checkSDK = () => {
      if (typeof window.initSendOTP === 'function') {
        window.configuration = {
          widgetId: WIDGET_ID,
          tokenAuth: TOKEN_AUTH,
          identifier: formattedMobile,
          exposeMethods: true,
          success: (data) => {
            console.log('[MSG91 Global Success Callback]:', data);
            if (onSuccess) onSuccess(data);
          },
          failure: (error) => {
            const errStr = String(error?.message || error || '');
            if (errStr.toLowerCase().includes('captcha') || errStr.toLowerCase().includes('already been rendered')) {
              return;
            }
            console.warn('[MSG91 Global Failure Callback]:', error);
            if (onFailure) onFailure(error);
          },
        };

        try {
          window.initSendOTP(window.configuration);
          isWidgetInitialized = true;
        } catch (e) {
          console.error('[MSG91 initSendOTP error]:', e);
        }
        resolve(true);
      } else {
        setTimeout(checkSDK, 150);
      }
    };

    checkSDK();
  });
};

let lastReqId = null;

/**
 * Step 3.3: Sending OTP via window.sendOtp
 */
export const sendOtpViaWidget = async (mobile) => {
  const formattedMobile = formatIndianMobile(mobile);

  return new Promise(async (resolve) => {
    try {
      await Promise.race([
        initSendOtpWidget(formattedMobile),
        new Promise((r) => setTimeout(r, 2000))
      ]);
    } catch (e) {
      console.warn('[MSG91 Widget Init Warning]:', e);
    }

    let resolved = false;
    const safeResolve = (res) => {
      if (!resolved) {
        resolved = true;
        resolve(res);
      }
    };

    // 3.5-second total timeout safeguard
    const globalTimeout = setTimeout(() => {
      safeResolve({ fallback: true, timeout: true });
    }, 3500);

    let attempts = 0;
    const checkMethod = () => {
      if (resolved) return;

      if (typeof window.sendOtp === 'function') {
        console.log(`[MSG91 SDK] Dispatching OTP SMS to ${formattedMobile}...`);
        try {
          window.sendOtp(
            formattedMobile,
            (successData) => {
              clearTimeout(globalTimeout);
              console.log('[MSG91 SDK sendOtp Success]:', successData);
              if (successData?.message && typeof successData.message === 'string') {
                lastReqId = successData.message;
              }
              safeResolve({ success: true, data: successData, reqId: lastReqId });
            },
            (errorData) => {
              clearTimeout(globalTimeout);
              console.warn('[MSG91 SDK sendOtp Callback Info]:', errorData);
              safeResolve({ fallback: true, info: errorData });
            }
          );
        } catch (err) {
          clearTimeout(globalTimeout);
          console.warn('[MSG91 sendOtp invocation error]:', err);
          safeResolve({ fallback: true, error: err });
        }
      } else if (attempts < 15) {
        attempts++;
        setTimeout(checkMethod, 150);
      } else {
        clearTimeout(globalTimeout);
        console.warn('[MSG91 SDK] window.sendOtp not bound within timeout.');
        safeResolve({ fallback: true });
      }
    };

    setTimeout(checkMethod, 50);
  });
};

/**
 * Step 3.4: Verifying OTP via window.verifyOtp
 */
export const verifyOtpViaWidget = (mobile, otp) => {
  const cleanOtp = String(otp || '').trim();

  return new Promise((resolve, reject) => {
    let resolved = false;

    // 15-second watchdog timer
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('OTP verification timed out. Please check your code or request a new OTP.'));
      }
    }, 15000);

    const handleSuccess = (data) => {
      if (resolved) return;
      if (data?.type === 'error' || data?.status === 'fail' || data?.hasError) {
        handleFailure(data);
        return;
      }
      resolved = true;
      clearTimeout(timer);
      console.log('[MSG91] Access token acquired successfully.');
      const token =
        data?.message ||
        data?.data?.token ||
        data?.token ||
        (typeof data === 'string' ? data : null);
      resolve({ success: true, accessToken: token, raw: data });
    };

    const handleFailure = (err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      const msg = typeof err === 'string' ? err : err?.message || 'Invalid OTP. Please check and try again.';
      reject(new Error(msg));
    };

    // Attach callbacks to global configuration
    if (window.configuration) {
      window.configuration.success = handleSuccess;
      window.configuration.failure = handleFailure;
    }

    if (typeof window.verifyOtp === 'function') {
      try {
        // MSG91 Web SDK exact signature: verifyOtp(otp, successCallback, failureCallback, reqId)
        window.verifyOtp(cleanOtp, handleSuccess, handleFailure, lastReqId);
      } catch (err) {
        console.warn('[MSG91 verifyOtp invocation error]:', err);
        handleFailure(err);
      }
    } else {
      clearTimeout(timer);
      reject(new Error('MSG91 verification SDK is not ready.'));
    }
  });
};

/**
 * Retrying OTP via window.retryOtp
 */
export const retryOtpViaWidget = (mobile, channel = null) => {
  const formattedMobile = formatIndianMobile(mobile);

  return new Promise((resolve) => {
    if (typeof window.retryOtp === 'function') {
      try {
        window.retryOtp(
          channel,
          (success) => {
            console.log('[MSG91 Retry Success]:', success);
            resolve({ success: true, data: success });
          },
          (error) => {
            console.warn('[MSG91 retryOtp Info]:', error);
            sendOtpViaWidget(formattedMobile).then(resolve);
          }
        );
      } catch (e) {
        sendOtpViaWidget(formattedMobile).then(resolve);
      }
    } else {
      sendOtpViaWidget(formattedMobile).then(resolve);
    }
  });
};

export const loadMsg91Sdk = initSendOtpWidget;

