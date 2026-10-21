import axios from 'axios';

/**
 * MSG91 SMS Provider Integration
 * Sends SMS OTP directly via MSG91 REST API using the official MSG91_AUTH_KEY.
 */
export const sendSmsOtp = async (mobile, otp, context = 'AUTHENTICATION') => {
  const isEnabled = process.env.SMS_ENABLED === 'true';
  const mode = process.env.OTP_MODE || 'development';
  const authKey = process.env.MSG91_AUTH_KEY || '560885AodniWyqHerf6a82eee7P1';

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
    try {
      const templateId = process.env.MSG91_TEMPLATE_ID || undefined;
      const params = {
        authkey: authKey,
        mobile: formattedMobile,
        otp: otp,
        otp_length: 6,
        otp_expiry: 5,
      };
      if (templateId) {
        params.template_id = templateId;
      }

      // MSG91 Send OTP endpoint: https://control.msg91.com/api/v5/otp
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

      console.log(`\n==============================================`);
      console.log(`📱 [MSG91 OTP DISPATCHED]`);
      console.log(`To: +${formattedMobile}`);
      console.log(`Context: ${context}`);
      console.log(`🔑 OTP Code: ${otp}`);
      console.log(`MSG91 Request ID: ${response.data?.request_id || 'N/A'}`);
      console.log(`==============================================\n`);

      return { success: true, data: response.data, otp };
    } catch (err) {
      console.error('[MSG91 Send Error]:', err.response?.data || err.message);

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
