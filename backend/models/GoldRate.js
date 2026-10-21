import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const GoldRate = sequelize.define('GoldRate', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  metal_type: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'GOLD', // 'GOLD' | 'SILVER'
  },
  gold_purity: {
    type: DataTypes.STRING(20),
    allowNull: false, // '24K', '22K', '18K', '999', '925', '916', '900'
  },
  rate_per_gram: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'INR',
  },
  source: {
    type: DataTypes.STRING(100),
    defaultValue: 'LiveChennai',
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'LIVE',
  },
  is_manual: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  manual_reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'gold_rates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default GoldRate;
