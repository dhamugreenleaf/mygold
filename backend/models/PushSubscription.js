import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const PushSubscription = sequelize.define('PushSubscription', {
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
  endpoint: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  p256dh: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  auth: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  user_agent: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  last_morning_sent_date: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
  },
  last_afternoon_sent_date: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
  },
  last_evening_sent_date: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
  },
}, {
  tableName: 'push_subscriptions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default PushSubscription;
