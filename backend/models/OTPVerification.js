import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const OTPVerification = sequelize.define('OTPVerification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  mobile_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    index: true,
  },
  purpose: {
    type: DataTypes.STRING(30),
    allowNull: false,
    // e.g., REGISTRATION, LOGIN, CHANGE_MOBILE, FORGOT_USERNAME
  },
  otp_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  attempt_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  max_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    allowNull: false,
  },
  resend_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  last_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'otp_verifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default OTPVerification;
