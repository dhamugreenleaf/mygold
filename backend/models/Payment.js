import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'INR',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'paid', // 'paid', 'pending', 'failed'
  },
  plan_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Premium Vault Pro',
  },
  transaction_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'UPI', // 'UPI', 'Card', 'Net Banking', 'Manual'
  },
  payment_type: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'one_time', // 'one_time', 'subscription'
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  expiry_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  razorpay_order_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  razorpay_payment_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  razorpay_signature: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  razorpay_subscription_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  razorpay_invoice_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  event_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  tableName: 'payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default Payment;
