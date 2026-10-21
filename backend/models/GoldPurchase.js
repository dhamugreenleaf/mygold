import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const GoldPurchase = sequelize.define('GoldPurchase', {
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
  asset_type: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'GOLD', // 'GOLD' | 'SILVER'
  },
  gold_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  gold_purity: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '22K', // Gold: '24K', '22K', '18K' | Silver: '999', '925', '916', '900'
  },
  weight: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  purchase_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  purchase_rate: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  purchase_amount: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  gold_value: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  making_charges: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  wastage: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  gst: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  other_charges: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  total_invoice_amount: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
}, {
  tableName: 'gold_purchases',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default GoldPurchase;
