import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  admin_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'SET NULL',
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  target_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  target_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  old_value: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  new_value: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

export default AuditLog;
