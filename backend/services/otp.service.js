import axios from 'axios';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OTPVerification } from '../models/index.js';
import { sendSmsOtp } from './sms.provider.js';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
const OTP_RESEND_COOLDOWN_SECONDS = 30;

export const generateNumericOTP = (length = 6) => {
  // Generate a random 6-digit number
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += crypto.randomInt(0, 10).toString();
  }
  return otp;
};

export const normalizeMobile = (mobile) => {
  if (!mobile) return null;
  let cleaned = String(mobile).replace(/\D/g, '');
  cleaned = cleaned.replace(/^0+/, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  }
  if (cleaned.length > 10) {
    cleaned = cleaned.slice(-10);
  }
  return cleaned;
};

/**
 * Directly verifies an OTP against MSG91 OTP Verify API
 */
export const verifyMsg91OtpDirect = async (mobile, otp, reqId = null) => {
  const authKey = process.env.MSG91_AUTH_KEY || '';
  const widgetId = process.env.MSG91_WIDGET_ID || '3668716a4864373039323834';
  const normMobile = normalizeMobile(mobile);
  const cleanOtp = String(otp || '').trim();

  if (!authKey || !normMobile || !cleanOtp) return false;

  // 1. Try Widget verifyOtp if reqId is known
  if (widgetId && reqId) {
    try {
      const widgetVerifyRes = await axios.post(
        'https://api.msg91.com/api/v5/widget/verifyOtp',
        {
          widgetId,
          otp: cleanOtp,
          mobile: `91${normMobile}`,
          reqId,
        },
        {
          headers: {
            authkey: authKey,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        }
      );
      const wData = widgetVerifyRes.data;
      if (wData && (wData.type === 'success' || wData.status === 'success' || wData['access-token'])) {
        console.log(`[MSG91 Widget Direct Verify] Successfully verified OTP for +91${normMobile}`);
        return true;
      }
    } catch (wErr) {
      console.warn('[MSG91 Widget Direct Verify Info]:', wErr.response?.data || wErr.message);
    }
  }

  // 2. Direct MSG91 verify endpoint
  try {
    const response = await axios.get('https://control.msg91.com/api/v5/otp/verify', {
      params: {
        mobile: `91${normMobile}`,
        otp: cleanOtp,
      },
      headers: {
        authkey: authKey,
        accept: 'application/json',
      },
      timeout: 8000,
    });

    const data = response.data;
    if (
      data &&
      (data.type === 'success' ||
       data.message === 'OTP verified success' ||
       data.message === 'Mobile no. already verified' ||
       data.message === 'otp_verified_successfully')
    ) {
      console.log(`[MSG91 Direct Verify] Successfully verified OTP for +91${normMobile}`);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[MSG91 Direct Verify Check]:', err.response?.data || err.message);
    if (err.response?.data?.message === 'Mobile no. already verified') {
      return true;
    }
    return false;
  }
};

/**
 * Requests an OTP for a given mobile number and purpose.
 */
export const requestOtp = async (mobile, purpose, metadata = null) => {
  const normMobile = normalizeMobile(mobile);
  // Check if there's an existing unverified OTP for this purpose
  const existingRecord = await OTPVerification.findOne({
    where: { mobile_number: normMobile, purpose, verified_at: null },
    order: [['created_at', 'DESC']]
  });

  const now = new Date();

  // Rate limiting for resend
  if (existingRecord && existingRecord.last_sent_at) {
    const diffSeconds = (now.getTime() - existingRecord.last_sent_at.getTime()) / 1000;
    if (diffSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      throw { statusCode: 429, message: `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - diffSeconds)} seconds before requesting a new OTP.` };
    }
  }

  // Generate new OTP (4 digits for CHANGE_MOBILE, 6 digits default)
  const otpLength = purpose === 'CHANGE_MOBILE' ? 4 : 6;
  const plainOtp = generateNumericOTP(otpLength);
  const otpHash = await bcrypt.hash(plainOtp, 10);
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60000);

  let record;

  if (existingRecord && existingRecord.expires_at > now) {
    // Reuse record if still valid, just update OTP hash and counts
    existingRecord.otp_hash = otpHash;
    existingRecord.expires_at = expiresAt; // Extend expiration
    existingRecord.resend_count += 1;
    existingRecord.last_sent_at = now;
    existingRecord.attempt_count = 0; // Reset attempts on new OTP request
    if (metadata !== null) existingRecord.metadata = metadata;
    await existingRecord.save();
    record = existingRecord;
  } else {
    // Create new record
    record = await OTPVerification.create({
      mobile_number: normMobile,
      purpose,
      otp_hash: otpHash,
      expires_at: expiresAt,
      last_sent_at: now,
      metadata: metadata,
    });
  }

  // Send the SMS
  const smsRes = await sendSmsOtp(normMobile, plainOtp, purpose);
  if (smsRes?.reqId && record) {
    try {
      const currentMeta = typeof record.metadata === 'object' && record.metadata !== null ? record.metadata : {};
      record.metadata = { ...currentMeta, reqId: smsRes.reqId };
      await record.save();
    } catch (_) {}
  }

  return { success: true, message: 'OTP sent successfully.', otp: plainOtp, reqId: smsRes?.reqId };
};

/**
 * Verifies an OTP against DB and/or MSG91.
 */
export const verifyOtp = async (mobile, plainOtp, purpose) => {
  const normMobile = normalizeMobile(mobile);
  const cleanOtp = String(plainOtp || '').trim();

  if (!cleanOtp) {
    throw { statusCode: 400, message: 'OTP is required.' };
  }

  const record = await OTPVerification.findOne({
    where: { mobile_number: normMobile, purpose, verified_at: null },
    order: [['created_at', 'DESC']]
  });

  const now = new Date();
  const isDevTestOtp = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) && cleanOtp === '123456';

  let isVerified = isDevTestOtp;

  if (!isVerified && record) {
    // Check Expiration & attempt limits
    const isExpired = now > record.expires_at;
    const tooManyAttempts = record.attempt_count >= record.max_attempts;

    if (!isExpired && !tooManyAttempts) {
      const isHashMatch = await bcrypt.compare(cleanOtp, record.otp_hash);
      if (isHashMatch) {
        isVerified = true;
      }
    }
  }

  // If local DB check didn't pass, verify against MSG91 OTP verification API as fallback
  if (!isVerified) {
    const reqId = record?.metadata?.reqId || null;
    const isMsg91Valid = await verifyMsg91OtpDirect(normMobile, cleanOtp, reqId);
    if (isMsg91Valid) {
      isVerified = true;
    }
  }

  if (!isVerified) {
    if (record) {
      record.attempt_count += 1;
      await record.save();
    }
    throw { statusCode: 400, message: 'Incorrect OTP. Please check and try again.' };
  }

  // Success: mark record as verified if it exists
  if (record) {
    record.verified_at = now;
    await record.save();
  }

  return record || { mobile_number: normMobile, purpose, verified_at: now };
};

