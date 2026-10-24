import axios from 'axios';

/**
 * MSG91 SMS Provider Integration
 * Sends SMS OTP directly via MSG91 REST API using the official MSG91_AUTH_KEY.
 */
export const sendSmsOtp = async (mobile, otp, context = 'AUTHENTICATION') => {
  const isEnabled = process.env.SMS_ENABLED === 'true';
  const mode = process.env.OTP_MODE || 'development';
  const authKey = process.env.MSG91_AUTH_KEY || '';

  // Normalize mobile number strictly to 91XXXXXXXXXX
  let cleaned = String(mobile || '').replace(/\D/g, '');
  cleaned = cleaned.replace(/^0+/, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  }
  if (cleaned.length > 10) {
    cleaned = cleaned.slice(-10);
  }
  const formattedMobile = `91${cleaned}`;

  console.log(`[MSG91 OTP Dispatch] Sending OTP to ${formattedMobile} (Context: ${context})...`);

  if (authKey) {
    const widgetId = process.env.MSG91_WIDGET_ID || '3668716a4864373039323834';
    const tokenAuth = process.env.MSG91_WIDGET_TOKEN || '560885T2kcvOrbS46a82e3fcP1';
    let reqId = null;

    // 1. Primary: Send via MSG91 Widget OTP API (Reliable DLT & Multi-channel SMS)
    if (widgetId) {
      try {
        const widgetRes = await axios.post(
          'https://api.msg91.com/api/v5/widget/sendOtp',
          {
            widgetId,
            tokenAuth,
            identifier: formattedMobile,
          },
          {
            headers: {
              authkey: authKey,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );
        reqId = widgetRes.data?.message || widgetRes.data?.reqId || widgetRes.data?.request_id;
        console.log(`\n==============================================`);
        console.log(`📱 [MSG91 WIDGET OTP DISPATCHED]`);
        console.log(`To: +${formattedMobile}`);
        console.log(`Context: ${context}`);
        console.log(`MSG91 Request ID: ${reqId || 'N/A'}`);
        console.log(`==============================================\n`);

        return { success: true, data: widgetRes.data, reqId, otp };
      } catch (widgetErr) {
        console.warn('[MSG91 Widget Send API Info]:', widgetErr.response?.data || widgetErr.message);
      }
    }

    // 2. Secondary: Direct OTP API fallback
    try {
      const templateId = process.env.MSG91_TEMPLATE_ID || undefined;
      const params = {
        authkey: authKey,
        mobile: formattedMobile,
        otp: otp,
        otp_length: String(otp).length || 4,
        otp_expiry: 5,
      };
      if (templateId) {
        params.template_id = templateId;
      }

      const response = await axios.post(
        'https://control.msg91.com/api/v5/otp',
        null,
        {
          params,
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      reqId = response.data?.request_id || response.data?.message;
      console.log(`\n==============================================`);
      console.log(`📱 [MSG91 DIRECT OTP DISPATCHED]`);
      console.log(`To: +${formattedMobile}`);
      console.log(`Context: ${context}`);
      console.log(`🔑 OTP Code: ${otp}`);
      console.log(`MSG91 Request ID: ${reqId || 'N/A'}`);
      console.log(`==============================================\n`);

      return { success: true, data: response.data, reqId, otp };
    } catch (err) {
      console.error('[MSG91 Direct Send Error]:', err.response?.data || err.message);

      console.log(`\n==============================================`);
      console.log(`⚠️ [OTP DISPATCH FALLBACK]`);
      console.log(`To: +${formattedMobile}`);
      console.log(`Context: ${context}`);
      console.log(`🔑 OTP Code: ${otp}`);
      console.log(`==============================================\n`);

      return { success: true, fallback: true, error: err.response?.data?.message || err.message, otp };
    }
  }

  console.log(`\n[LOCAL OTP] To: ${formattedMobile}, OTP: ${otp}\n`);
  return { success: true, dev: true };
};
