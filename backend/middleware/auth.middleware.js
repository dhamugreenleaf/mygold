import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'aurum_vault_super_secret_gold_key_2026';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check Authorization header: Bearer <token>
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // 2. Optional query param token for direct document download links in new browser tabs
    else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login to continue.',
      });
    }

    // 3. Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please login again.',
      });
    }

    // 4. Check user in database
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Account not found or session revoked.',
      });
    }

    // 5. Check if user account is deactivated
    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated by an administrator. Please contact support.',
      });
    }

    // 6. Attach safe user object to request including location and role preferences
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone || null,
      role: user.role || 'user',
      is_active: user.is_active !== false,
      plan: user.plan || 'free',
      last_login_at: user.last_login_at || null,
      preferred_city: user.preferred_city || 'Coimbatore',
      preferred_state: user.preferred_state || 'Tamil Nadu',
      preferred_country: user.preferred_country || 'India',
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
    });
  }
};

/**
 * Middleware to restrict access to administrator users only
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login.',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.',
    });
  }

  next();
};

export default authenticate;
