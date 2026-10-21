import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const SystemSetting = sequelize.define('SystemSetting', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  setting_key: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  setting_value: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  setting_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'string',
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'system_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default SystemSetting;
