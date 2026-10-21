import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';

export const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: {
        args: [3, 50],
        msg: 'Username must be between 3 and 50 characters.',
      },
    },
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: false,
    validate: {
      isEmail: {
        msg: 'Please provide a valid email address.',
      },
    },
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  preferred_city: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Coimbatore',
  },
  preferred_state: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Tamil Nadu',
  },
  preferred_country: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'India',
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
  },
  mobile_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'user',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  plan: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'free',
  },
  free_entries_used: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  subscription_status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'free', // 'free', 'active', 'pending', 'cancelled', 'expired', 'paused', 'payment_failed'
  },
  subscription_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  razorpay_subscription_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  razorpay_customer_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  current_period_start: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  current_period_end: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notifications_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Instance method to compare password
User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

// Instance method to return safe public user object (NEVER exposes password_hash)
User.prototype.toSafeObject = function () {
  return {
    id: this.id,
    username: this.username,
    email: this.email,
    phone: this.phone || null,
    mobile_verified: this.mobile_verified !== false,
    role: this.role || 'user',
    is_active: this.is_active !== false,
    notifications_enabled: this.notifications_enabled !== false,
    plan: this.plan || 'free',
    free_entries_used: this.free_entries_used || 0,
    subscription_status: this.subscription_status || 'free',
    subscription_expires_at: this.subscription_expires_at || null,
    razorpay_subscription_id: this.razorpay_subscription_id || null,
    current_period_start: this.current_period_start || null,
    current_period_end: this.current_period_end || null,
    cancelled_at: this.cancelled_at || null,
    last_login_at: this.last_login_at || null,
    preferred_city: this.preferred_city || 'Coimbatore',
    preferred_state: this.preferred_state || 'Tamil Nadu',
    preferred_country: this.preferred_country || 'India',
    created_at: this.created_at,
    updated_at: this.updated_at,
  };
};

export default User;
