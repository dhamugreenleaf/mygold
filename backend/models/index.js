import User from './User.js';
import GoldPurchase from './GoldPurchase.js';
import GoldRate from './GoldRate.js';
import PurchaseDocument from './PurchaseDocument.js';
import SystemSetting from './SystemSetting.js';
import Payment from './Payment.js';
import AuditLog from './AuditLog.js';
import OTPVerification from './OTPVerification.js';
import PushSubscription from './PushSubscription.js';
import Notification from './Notification.js';

// User <-> GoldPurchase (1 to Many)
User.hasMany(GoldPurchase, {
  foreignKey: 'user_id',
  as: 'purchases',
  onDelete: 'CASCADE',
});
GoldPurchase.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// User <-> PurchaseDocument (1 to Many)
User.hasMany(PurchaseDocument, {
  foreignKey: 'user_id',
  as: 'documents',
  onDelete: 'CASCADE',
});
PurchaseDocument.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// GoldPurchase <-> PurchaseDocument (1 to Many)
GoldPurchase.hasMany(PurchaseDocument, {
  foreignKey: 'purchase_id',
  as: 'documents',
  onDelete: 'CASCADE',
});
PurchaseDocument.belongsTo(GoldPurchase, {
  foreignKey: 'purchase_id',
  as: 'purchase',
});

// User <-> Payment (1 to Many)
User.hasMany(Payment, {
  foreignKey: 'user_id',
  as: 'payments',
  onDelete: 'CASCADE',
});
Payment.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// User (Admin) <-> AuditLog (1 to Many)
User.hasMany(AuditLog, {
  foreignKey: 'admin_id',
  as: 'auditLogs',
  onDelete: 'SET NULL',
});
AuditLog.belongsTo(User, {
  foreignKey: 'admin_id',
  as: 'admin',
});

// User <-> PushSubscription (1 to Many)
User.hasMany(PushSubscription, {
  foreignKey: 'user_id',
  as: 'pushSubscriptions',
  onDelete: 'CASCADE',
});
PushSubscription.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// User <-> Notification (1 to Many)
User.hasMany(Notification, {
  foreignKey: 'user_id',
  as: 'notifications',
  onDelete: 'CASCADE',
});
Notification.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

export {
  User,
  GoldPurchase,
  GoldRate,
  PurchaseDocument,
  SystemSetting,
  Payment,
  AuditLog,
  OTPVerification,
  PushSubscription,
  Notification,
};

export default {
  User,
  GoldPurchase,
  GoldRate,
  PurchaseDocument,
  SystemSetting,
  Payment,
  AuditLog,
  OTPVerification,
  PushSubscription,
  Notification,
};
