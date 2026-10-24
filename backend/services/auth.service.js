import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'aurum_vault_super_secret_gold_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const registerUser = async ({ username, email, password }) => {
  // 1. Username Validation
  if (!username || typeof username !== 'string' || !username.trim()) {
    const error = new Error('Please enter your username.');
    error.statusCode = 400;
    throw error;
  }
  const cleanUsername = username.trim();
  if (cleanUsername.length < 3) {
    const error = new Error('Username must be at least 3 characters.');
    error.statusCode = 400;
    throw error;
  }
  if (cleanUsername.length > 50) {
    const error = new Error('Username cannot exceed 50 characters.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Email Validation
  if (!email || typeof email !== 'string' || !email.trim()) {
    const error = new Error('Please enter your email address.');
    error.statusCode = 400;
    throw error;
  }
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    const error = new Error('Please enter a valid email address.');
    error.statusCode = 400;
    throw error;
  }

  // 3. Password Validation
  if (!password || typeof password !== 'string' || password.length < 6) {
    const error = new Error('Password must be at least 6 characters.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Duplicate Check
  const existingEmail = await User.findOne({ where: { email: cleanEmail } });
  if (existingEmail) {
    const error = new Error('An account with this email already exists. Please login.');
    error.statusCode = 409;
    throw error;
  }

  const finalUsername = cleanUsername;

  // 5. Hash Password & Create User
  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password, saltRounds);

  const newUser = await User.create({
    username: finalUsername,
    email: cleanEmail,
    password_hash,
  });

  // 6. Generate JWT Token
  const token = jwt.sign(
    {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role || 'user',
      plan: newUser.plan || 'free',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    user: newUser.toSafeObject(),
    token,
  };
};

export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error('Email and password are required.');
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = email.trim().toLowerCase();

  const user = await User.findOne({ where: { email: cleanEmail } });
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Check if user is active
  if (user.is_active === false) {
    const error = new Error('Your account has been deactivated by an administrator. Please contact support.');
    error.statusCode = 403;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Update last login timestamp
  try {
    user.last_login_at = new Date();
    await user.save();
  } catch (e) {
    // Non-fatal
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role || 'user',
      plan: user.plan || 'free',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    user: user.toSafeObject(),
    token,
  };
};

export const getUserById = async (id) => {
  const user = await User.findByPk(id);
  if (!user) {
    return null;
  }
  return user.toSafeObject();
};

export const updateUserLocationPreferences = async (userId, { city, state, country }) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  if (city) user.preferred_city = city.trim();
  if (state) user.preferred_state = state.trim();
  if (country) user.preferred_country = country.trim();

  await user.save();

  return user.toSafeObject();
};

export default {
  registerUser,
  loginUser,
  getUserById,
  updateUserLocationPreferences,
};
