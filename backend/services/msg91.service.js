import axios from 'axios';

/**
 * MSG91 Secure OTP Widget Backend Verification Service
 * Validates the access token returned by the frontend MSG91 Web SDK.
 */
export const verifyMsg91AccessToken = async (accessToken) => {
  const authKey = process.env.MSG91_AUTH_KEY || '560885AodniWyqHerf6a82eee7P1';

  if (!accessToken) {
    return { valid: false, message: 'Access token is required for verification.' };
  }

  if (!authKey) {
    return { valid: false, message: 'MSG91 Auth Key is missing in server environment.' };
  }

  try {
    console.log(`[MSG91 Widget Verification] Verifying access token with MSG91 API...`);

    const response = await axios.post(
      'https://control.msg91.com/api/v5/widget/verifyAccessToken',
      {
        'access-token': accessToken,
      },
      {
        headers: {
          authkey: authKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const body = response.data;
    console.log('[MSG91 Token Verification Result]:', body);

    // MSG91 returns success with data containing mobile or status === "success"
    if (
      body &&
      (body.type === 'success' ||
        body.status === 'success' ||
        body.message === 'Access Token verified successfully' ||
        body.responseCode === '3001' ||
        body.data)
    ) {
      // Extract verified mobile
      const verifiedMobile = body.data?.mobile || body.data?.mobile_number || body.mobile || null;
      return {
        valid: true,
        data: body,
        mobile: verifiedMobile,
      };
    }

    return {
      valid: false,
      message: body?.message || 'Access token verification failed with MSG91.',
    };
  } catch (error) {
    console.error('[MSG91 Token Verification API Error]:', error.response?.data || error.message);
    return {
      valid: false,
      message: error.response?.data?.message || 'Failed to verify token with MSG91 server.',
    };
  }
};
