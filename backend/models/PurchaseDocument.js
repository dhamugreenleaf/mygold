import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const PurchaseDocument = sequelize.define('PurchaseDocument', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  purchase_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'gold_purchases',
      key: 'id',
    },
    onDelete: 'CASCADE',
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
  document_type: {
    type: DataTypes.ENUM('INVOICE', 'JEWELLERY_PHOTO'),
    allowNull: false,
  },
  original_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  stored_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
}, {
  tableName: 'purchase_documents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default PurchaseDocument;
