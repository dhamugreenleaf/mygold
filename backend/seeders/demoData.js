import bcrypt from 'bcryptjs';
import { User, GoldPurchase, GoldRate, SystemSetting, Payment, AuditLog } from '../models/index.js';

export const seedDemoData = async () => {
  try {
    // 1. Seed / verify Gold Rates
    const rateCount = await GoldRate.count();
    if (rateCount === 0) {
      await GoldRate.bulkCreate([
        {
          gold_purity: '22K',
          rate_per_gram: 12175.25,
        },
        {
          gold_purity: '24K',
          rate_per_gram: 13282.09,
        },
        {
          gold_purity: '18K',
          rate_per_gram: 9961.57,
        },
      ]);
    }

    // 2. Seed / verify System Settings (Current Paid Version Price)
    let priceSetting = await SystemSetting.findOne({ where: { setting_key: 'paid_version_price' } });
    if (!priceSetting) {
      priceSetting = await SystemSetting.create({
        setting_key: 'paid_version_price',
        setting_value: '10',
        setting_type: 'number',
        description: 'Current price for the Paid / Premium Gold Vault Version (INR)',
      });
      console.log('[Seeder] Default paid_version_price set to ₹10');
    }

    // 3. Seed / verify Administrator Account
    let adminUser = await User.findOne({ where: { email: 'admin@goldtrack.com' } });
    if (!adminUser) {
      const adminPasswordHash = await bcrypt.hash('AdminPass123', 10);
      adminUser = await User.create({
        username: 'Admin Manager',
        email: 'admin@goldtrack.com',
        phone: '+91 98401 23456',
        role: 'admin',
        is_active: true,
        plan: 'paid',
        password_hash: adminPasswordHash,
        preferred_city: 'Chennai',
        preferred_state: 'Tamil Nadu',
        preferred_country: 'India',
        last_login_at: new Date(),
      });
      console.log('[Seeder] Created default Administrator: admin@goldtrack.com / AdminPass123');

      await AuditLog.create({
        admin_id: adminUser.id,
        action: 'SYSTEM_INITIALIZATION',
        target_type: 'System',
        target_id: '1',
        description: 'System initialized fresh with default administrator and pricing configuration.',
      });
    } else {
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        await adminUser.save();
      }
    }

    console.log('[Seeder] Fresh system initialization complete. Ready for real users.');
  } catch (error) {
    console.error('Error in database seeding:', error.message);
  }
};

export default seedDemoData;
