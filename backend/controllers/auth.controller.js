import {
  registerUser,
  loginUser,
  getUserById,
  updateUserLocationPreferences,
} from '../services/auth.service.js';



export const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

export const getMe = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated.',
      });
    }

    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePreferences = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated.',
      });
    }

    const { city, state, country } = req.body;
    const updatedUser = await updateUserLocationPreferences(req.user.id, { city, state, country });

    return res.status(200).json({
      success: true,
      message: `Preferred location set to ${updatedUser.preferred_city}.`,
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update preferences.',
    });
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }
    const { username, email } = req.body;
    
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Validate if username is provided and changed
    if (username && username.trim() !== user.username) {
      const cleanUsername = String(username).trim();
      if (cleanUsername.length < 3) {
        return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
      }
      if (!/^[a-zA-Z\s]+$/.test(cleanUsername)) {
        return res.status(400).json({ success: false, message: 'Username can only contain alphabets and spaces.' });
      }
      user.username = cleanUsername;
    }

    if (email !== undefined) {
      const cleanEmail = email ? String(email).trim() : null;
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      }
      user.email = cleanEmail;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: user.toSafeObject() }
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update profile.',
    });
  }
};

export const requestProfileUpdateOtp = updateProfile;

export const verifyProfileUpdateOtp = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ success: false, message: 'OTP is required.' });

    const user = await User.findByPk(req.user.id);
    if (!user || !user.phone) return res.status(400).json({ success: false, message: 'User or mobile not found.' });

    // Verify OTP and extract metadata
    const record = await verifyOtp(user.phone, otp, 'PROFILE_UPDATE');
    
    if (!record || !record.metadata) {
      return res.status(400).json({ success: false, message: 'Pending profile changes not found.' });
    }

    const { username, email } = record.metadata;

    if (username && username !== user.username) {
      user.username = username;
    }
    if (email !== undefined) {
      user.email = email;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: user.toSafeObject() }
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'OTP verification failed.',
    });
  }
};

// ============================================
// NEW OTP AUTHENTICATION FLOW CONTROLLERS
// ============================================

import { requestOtp, verifyOtp, normalizeMobile } from '../services/otp.service.js';
import { User } from '../models/index.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';
import { Op } from 'sequelize';

// Helpers
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'aurum_vault_super_secret_gold_key_2026', {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

export const findUserByMobile = async (mobile) => {
  const normMobile = normalizeMobile(mobile);
  if (!normMobile) return null;
  const user = await User.findOne({
    where: {
      [Op.or]: [
        { phone: normMobile },
        { phone: `+91${normMobile}` },
        { phone: `91${normMobile}` },
        { phone: `+91 ${normMobile.slice(0, 5)} ${normMobile.slice(5)}` },
        { phone: { [Op.like]: `%${normMobile}` } }
      ]
    }
  });
  if (user) return user;
  const allUsers = await User.findAll();
  return allUsers.find(u => normalizeMobile(u.phone) === normMobile) || null;
};

// --- REGISTRATION ---
export const requestRegisterOtp = async (req, res, next) => {
  try {
    const { username, mobile } = req.body;
    if (!username || !mobile) {
      return res.status(400).json({ success: false, message: 'Username and mobile number are required.' });
    }

    const cleanUsername = String(username).trim();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
    }
    if (!/^[a-zA-Z\s]+$/.test(cleanUsername)) {
      return res.status(400).json({ success: false, message: 'Username can only contain alphabets and spaces.' });
    }

    const normMobile = normalizeMobile(mobile);
    if (!normMobile || normMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number.' });
    }

    // Check if mobile is already registered
    const existingMobileUser = await findUserByMobile(normMobile);
    if (existingMobileUser) {
      return res.status(400).json({ success: false, message: 'Mobile number is already registered with an existing account.' });
    }

    const otpRes = await requestOtp(normMobile, 'REGISTRATION');
    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your mobile via MSG91.',
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to request OTP.' });
  }
};

export const verifyRegisterOtp = async (req, res, next) => {
  try {
    const { username, email, password, mobile, otp } = req.body;
    if (!username || !mobile || !otp) {
      return res.status(400).json({ success: false, message: 'Username, mobile, and OTP are required.' });
    }

    const cleanUsername = String(username).trim();
    if (!/^[a-zA-Z\s]+$/.test(cleanUsername)) {
      return res.status(400).json({ success: false, message: 'Username can only contain alphabets and spaces.' });
    }

    const normMobile = normalizeMobile(mobile);
    if (!normMobile || normMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number.' });
    }
    await verifyOtp(normMobile, otp, 'REGISTRATION');

    let passwordHash = undefined;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Create user on success
    const newUser = await User.create({
      username: cleanUsername,
      email: email || undefined,
      password_hash: passwordHash,
      phone: normMobile,
      mobile_verified: true,
      plan: 'free'
    });

    const token = generateToken(newUser.id);
    newUser.last_login_at = new Date();
    await newUser.save();

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: { user: newUser.toSafeObject(), token }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'OTP verification failed.' });
  }
};

// --- LOGIN ---
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const cleanIdentifier = String(username).trim();
    const cleanPassword = String(password);

    let user = null;

    // 1. Try finding by mobile number first (unique per account)
    const normMobile = normalizeMobile(cleanIdentifier);
    if (normMobile && normMobile.length === 10) {
      user = await findUserByMobile(normMobile);
    }

    // 2. If not found and input contains @, try finding by email
    if (!user && cleanIdentifier.includes('@')) {
      user = await User.findOne({
        where: sequelize.where(sequelize.fn('lower', sequelize.col('email')), cleanIdentifier.toLowerCase())
      });
    }

    // 3. Try finding by username: if multiple users have this name, select the one whose password matches
    if (!user) {
      const matchingUsers = await User.findAll({ 
        where: sequelize.where(sequelize.fn('lower', sequelize.col('username')), cleanIdentifier.toLowerCase()) 
      });

      if (matchingUsers.length === 1) {
        user = matchingUsers[0];
      } else if (matchingUsers.length > 1) {
        for (const u of matchingUsers) {
          if (u.password_hash) {
            const matches = await u.comparePassword(cleanPassword);
            if (matches) {
              user = u;
              break;
            }
          }
        }
        if (!user) {
          user = matchingUsers[0];
        }
      }
    }

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    // Verify password
    if (!user.password_hash) {
      // Legacy user who hasn't set a password yet
      return res.status(401).json({ success: false, message: 'Password not set. Please use Forgot Password to secure your account.' });
    }

    const isValid = await user.comparePassword(cleanPassword);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    user.last_login_at = new Date();
    await user.save();

    const token = generateToken(user.id);
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: { user: user.toSafeObject(), token }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Login failed.' });
  }
};

// --- FORGOT PASSWORD ---
export const requestForgotPasswordOtp = async (req, res, next) => {
  try {
    const { username, mobile } = req.body;
    if (!username || !mobile) {
      return res.status(400).json({ success: false, message: 'Username and mobile number are required.' });
    }

    const cleanUsername = String(username).trim();
    const normMobile = normalizeMobile(mobile);

    if (!normMobile || normMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number.' });
    }

    const user = await User.findOne({ 
      where: sequelize.where(sequelize.fn('lower', sequelize.col('username')), cleanUsername.toLowerCase()) 
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No user found with this username. Please register first.' });
    }

    if (normalizeMobile(user.phone) !== normMobile) {
      return res.status(400).json({ success: false, message: 'Mobile number does not match this username.' });
    }

    await requestOtp(normMobile, 'FORGOT_PASSWORD');
    return res.status(200).json({
      success: true,
      message: 'OTP has been sent to your registered mobile number.',
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to request OTP.' });
  }
};

export const verifyForgotPasswordOtp = async (req, res, next) => {
  try {
    const { username, mobile, otp } = req.body;
    if (!username || !mobile || !otp) {
      return res.status(400).json({ success: false, message: 'Missing parameters.' });
    }

    const cleanUsername = String(username).trim();
    const normMobile = normalizeMobile(mobile);
    const cleanOtp = String(otp).trim();

    await verifyOtp(normMobile, cleanOtp, 'FORGOT_PASSWORD');

    const user = await User.findOne({ 
      where: sequelize.where(sequelize.fn('lower', sequelize.col('username')), cleanUsername.toLowerCase()) 
    });
    
    if (!user || normalizeMobile(user.phone) !== normMobile) {
      return res.status(400).json({ success: false, message: 'Invalid request. Mobile does not match username.' });
    }

    // Issue short-lived reset authorization token (15 mins)
    const resetToken = jwt.sign(
      { id: user.id, purpose: 'PASSWORD_RESET' },
      process.env.JWT_SECRET || 'aurum_vault_super_secret_gold_key_2026',
      { expiresIn: '15m' }
    );

    return res.status(200).json({
      success: true,
      message: 'OTP verified. Proceed to reset password.',
      data: { resetToken }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'OTP verification failed.' });
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Invalid parameters or password too short.' });
    }

    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'aurum_vault_super_secret_gold_key_2026');
    if (decoded.purpose !== 'PASSWORD_RESET') {
      return res.status(400).json({ success: false, message: 'Invalid reset authorization.' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.password_hash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Reset session expired or invalid. Please request a new OTP.' });
    }
    return res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
};

export const requestForgotUsernameOtp = async (req, res, next) => {
  try {
    const { mobile } = req.body;
    const normMobile = normalizeMobile(mobile);
    if (!normMobile || normMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number.' });
    }

    const user = await findUserByMobile(normMobile);
    if (!user) {
      return res.status(404).json({ success: false, message: 'No registered account found with this mobile number. Please register first.' });
    }

    await requestOtp(normMobile, 'FORGOT_USERNAME');
    return res.status(200).json({ success: true, message: 'OTP sent to your registered mobile number.' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to request OTP.' });
  }
};

export const verifyForgotUsernameOtp = async (req, res, next) => {
  try {
    const { mobile, otp, accessToken } = req.body;
    const normMobile = normalizeMobile(mobile);
    if (!normMobile) {
      return res.status(400).json({ success: false, message: 'Mobile number is required.' });
    }

    if (accessToken) {
      const verification = await verifyMsg91AccessToken(accessToken);
      if (!verification.valid) {
        return res.status(400).json({ success: false, message: verification.message || 'Invalid MSG91 verification token.' });
      }
    } else {
      const cleanOtp = String(otp || '').trim();
      if (!cleanOtp) {
        return res.status(400).json({ success: false, message: 'OTP is required.' });
      }
      await verifyOtp(normMobile, cleanOtp, 'FORGOT_USERNAME');
    }

    const user = await findUserByMobile(normMobile);
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Username recovered.',
      data: { username: user.username }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'OTP verification failed.' });
  }
};

// --- CHANGE MOBILE ---
export const requestChangeMobileOtp = async (req, res, next) => {
  try {
    const { newMobile } = req.body;
    const normMobile = normalizeMobile(newMobile);
    if (!normMobile || normMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number.' });
    }

    const existing = await findUserByMobile(normMobile);
    if (existing && existing.id !== req.user.id) {
      return res.status(400).json({ success: false, message: 'Mobile number already registered to another account.' });
    }

    await requestOtp(normMobile, 'CHANGE_MOBILE');
    return res.status(200).json({ success: true, message: 'OTP sent to new mobile.' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to request OTP.' });
  }
};

export const verifyChangeMobileOtp = async (req, res, next) => {
  try {
    const { newMobile, otp, accessToken } = req.body;
    const normMobile = normalizeMobile(newMobile);
    if (!normMobile || normMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number.' });
    }

    if (accessToken) {
      const verification = await verifyMsg91AccessToken(accessToken);
      if (!verification.valid) {
        return res.status(400).json({ success: false, message: verification.message || 'Invalid MSG91 verification token.' });
      }
    } else {
      const cleanOtp = String(otp || '').trim();
      if (!cleanOtp) {
        return res.status(400).json({ success: false, message: 'OTP is required.' });
      }
      await verifyOtp(normMobile, cleanOtp, 'CHANGE_MOBILE');
    }

    const existing = await findUserByMobile(normMobile);
    if (existing && existing.id !== req.user.id) {
      return res.status(400).json({ success: false, message: 'Mobile number already registered to another account.' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    user.phone = normMobile;
    user.mobile_verified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Mobile number updated successfully.',
      data: { user: user.toSafeObject() }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'OTP verification failed.' });
  }
};

// ============================================
// MSG91 SECURE OTP WIDGET ACCESS TOKEN HANDLERS
// ============================================
import { verifyMsg91AccessToken } from '../services/msg91.service.js';

export const verifyRegisterMsg91 = async (req, res, next) => {
  try {
    const { username, email, password, mobile, accessToken } = req.body;
    if (!username || !mobile || !accessToken) {
      return res.status(400).json({ success: false, message: 'Username, mobile, and MSG91 accessToken are required.' });
    }

    const cleanUsername = String(username).trim();
    if (!/^[a-zA-Z\s]+$/.test(cleanUsername)) {
      return res.status(400).json({ success: false, message: 'Username can only contain alphabets and spaces.' });
    }

    const verification = await verifyMsg91AccessToken(accessToken);
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message || 'Invalid MSG91 verification token.' });
    }

    const normMobile = normalizeMobile(mobile);
    if (!normMobile || normMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number.' });
    }

    // Check duplicate
    const existing = await findUserByMobile(normMobile);
    if (existing) {
      return res.status(400).json({ success: false, message: 'This mobile number is already registered.' });
    }

    let passwordHash = undefined;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const newUser = await User.create({
      username: cleanUsername,
      email: email || undefined,
      password_hash: passwordHash,
      phone: normMobile,
      mobile_verified: true,
      plan: 'free',
    });

    const token = generateToken(newUser.id);
    newUser.last_login_at = new Date();
    await newUser.save();

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: 'Account verified and created successfully via MSG91! 🎉',
      data: { user: newUser.toSafeObject(), token }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Registration failed.' });
  }
};

export const verifyForgotMsg91 = async (req, res, next) => {
  try {
    const { mobile, accessToken } = req.body;
    if (!mobile || !accessToken) {
      return res.status(400).json({ success: false, message: 'Mobile and MSG91 accessToken are required.' });
    }

    const verification = await verifyMsg91AccessToken(accessToken);
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message || 'Invalid MSG91 verification token.' });
    }

    const normMobile = normalizeMobile(mobile);
    const user = await findUserByMobile(normMobile);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this mobile number.' });
    }

    const resetToken = jwt.sign(
      { id: user.id, purpose: 'PASSWORD_RESET' },
      process.env.JWT_SECRET || 'aurum_vault_super_secret_gold_key_2026',
      { expiresIn: '15m' }
    );

    return res.status(200).json({
      success: true,
      message: 'Mobile verified successfully via MSG91.',
      data: { resetToken }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Verification failed.' });
  }
};

export const verifyForgotUsernameMsg91 = async (req, res, next) => {
  try {
    const { mobile, accessToken } = req.body;
    if (!mobile || !accessToken) {
      return res.status(400).json({ success: false, message: 'Mobile and MSG91 accessToken are required.' });
    }

    const verification = await verifyMsg91AccessToken(accessToken);
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message || 'Invalid MSG91 verification token.' });
    }

    const normMobile = normalizeMobile(mobile);
    const user = await findUserByMobile(normMobile);
    if (!user) {
      return res.status(404).json({ success: false, message: 'No registered account found with this mobile number.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Username recovered.',
      data: { username: user.username }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to verify token.' });
  }
};

export const loginWithMsg91 = async (req, res, next) => {
  try {
    const { mobile, accessToken } = req.body;
    if (!mobile || !accessToken) {
      return res.status(400).json({ success: false, message: 'Mobile and MSG91 accessToken are required.' });
    }

    const verification = await verifyMsg91AccessToken(accessToken);
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message || 'Invalid MSG91 verification token.' });
    }

    const normMobile = normalizeMobile(mobile);
    const user = await User.findOne({ where: { phone: normMobile } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this mobile number. Please register first.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
    }

    const token = generateToken(user.id);
    user.last_login_at = new Date();
    await user.save();

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful via MSG91 OTP.',
      data: { user: user.toSafeObject(), token }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Login failed.' });
  }
};
