import sequelize from '../config/database.js';

export const runMigrations = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    // 1. Check if gold_purchases table exists and has user_id and asset_type columns
    const purchasesDesc = await queryInterface.describeTable('gold_purchases').catch(() => null);

    if (purchasesDesc) {
      if (!purchasesDesc.user_id) {
        console.log('[Migration] Adding user_id column to gold_purchases table...');
        await sequelize.query(
          'ALTER TABLE gold_purchases ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;'
        );
        console.log('[Migration] user_id column added successfully.');
      }

      if (!purchasesDesc.asset_type) {
        console.log('[Migration] Adding asset_type column to gold_purchases table...');
        await sequelize.query(
          "ALTER TABLE gold_purchases ADD COLUMN asset_type VARCHAR(10) DEFAULT 'GOLD';"
        );
        console.log('[Migration] asset_type column added successfully.');
      }

      if (!purchasesDesc.purchase_amount) {
        console.log('[Migration] Adding purchase_amount column to gold_purchases table...');
        await sequelize.query(
          'ALTER TABLE gold_purchases ADD COLUMN purchase_amount FLOAT DEFAULT NULL;'
        );
        console.log('[Migration] Backfilling purchase_amount for existing records...');
        await sequelize.query(
          'UPDATE gold_purchases SET purchase_amount = ROUND(weight * purchase_rate, 2) WHERE purchase_amount IS NULL AND purchase_rate IS NOT NULL AND weight IS NOT NULL;'
        );
        console.log('[Migration] purchase_amount backfilled successfully.');
      }

      if (!purchasesDesc.gold_value) {
        await sequelize.query('ALTER TABLE gold_purchases ADD COLUMN gold_value FLOAT DEFAULT NULL;');
      }
      if (!purchasesDesc.making_charges) {
        await sequelize.query('ALTER TABLE gold_purchases ADD COLUMN making_charges FLOAT DEFAULT NULL;');
      }
      if (!purchasesDesc.wastage) {
        await sequelize.query('ALTER TABLE gold_purchases ADD COLUMN wastage FLOAT DEFAULT NULL;');
      }
      if (!purchasesDesc.gst) {
        await sequelize.query('ALTER TABLE gold_purchases ADD COLUMN gst FLOAT DEFAULT NULL;');
      }
      if (!purchasesDesc.other_charges) {
        await sequelize.query('ALTER TABLE gold_purchases ADD COLUMN other_charges FLOAT DEFAULT NULL;');
      }
      if (!purchasesDesc.total_invoice_amount) {
        await sequelize.query('ALTER TABLE gold_purchases ADD COLUMN total_invoice_amount FLOAT DEFAULT NULL;');
      }
    }

    // 2. Check if users table exists and has user profile/admin columns
    const usersDesc = await queryInterface.describeTable('users').catch(() => null);

    if (usersDesc) {
      if (!usersDesc.preferred_city) {
        console.log('[Migration] Adding preferred_city column to users table...');
        await sequelize.query(
          "ALTER TABLE users ADD COLUMN preferred_city VARCHAR(100) DEFAULT 'Coimbatore';"
        );
      }
      if (!usersDesc.preferred_state) {
        console.log('[Migration] Adding preferred_state column to users table...');
        await sequelize.query(
          "ALTER TABLE users ADD COLUMN preferred_state VARCHAR(100) DEFAULT 'Tamil Nadu';"
        );
      }
      if (!usersDesc.preferred_country) {
        console.log('[Migration] Adding preferred_country column to users table...');
        await sequelize.query(
          "ALTER TABLE users ADD COLUMN preferred_country VARCHAR(100) DEFAULT 'India';"
        );
      }
      if (!usersDesc.phone) {
        console.log('[Migration] Adding phone column to users table...');
        await sequelize.query(
          "ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL;"
        );
      }
      if (!usersDesc.role) {
        console.log('[Migration] Adding role column to users table...');
        await sequelize.query(
          "ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';"
        );
      }
      if (!usersDesc.is_active) {
        console.log('[Migration] Adding is_active column to users table...');
        await sequelize.query(
          "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1;"
        );
      }
      if (!usersDesc.plan) {
        console.log('[Migration] Adding plan column to users table...');
        await sequelize.query(
          "ALTER TABLE users ADD COLUMN plan VARCHAR(20) DEFAULT 'free';"
        );
      }
      if (!usersDesc.last_login_at) {
        console.log('[Migration] Adding last_login_at column to users table...');
        await sequelize.query(
          "ALTER TABLE users ADD COLUMN last_login_at DATETIME DEFAULT NULL;"
        );
      }
      if (!usersDesc.mobile_verified) {
        console.log('[Migration] Adding mobile_verified column to users table...');
        await sequelize.query(
          "ALTER TABLE users ADD COLUMN mobile_verified BOOLEAN DEFAULT 0;"
        );
      }
      if (usersDesc.notifications_enabled === undefined) {
        console.log('[Migration] Adding notifications_enabled column to users table...');
        await sequelize.query(
          "ALTER TABLE users ADD COLUMN notifications_enabled BOOLEAN DEFAULT 1;"
        );
      }
    }

    // 3. Clean up any redundant duplicate indexes created during dev syncs
    if (sequelize.getDialect() === 'mysql') {
      try {
        const [userIndexes] = await sequelize.query('SHOW INDEX FROM users;').catch(() => [[]]);
        for (const idx of userIndexes) {
          // Drop unique constraints on username so multiple users can have the same name
          if (idx.Column_name === 'username' && idx.Non_unique === 0 && idx.Key_name !== 'PRIMARY') {
            await sequelize.query(`ALTER TABLE users DROP INDEX \`${idx.Key_name}\`;`).catch(() => {});
            console.log(`[Migration] Dropped unique index on users.username: ${idx.Key_name}`);
          } else if (['_2', '_3', '_4'].some((suf) => idx.Key_name.endsWith(suf))) {
            await sequelize.query(`ALTER TABLE users DROP INDEX \`${idx.Key_name}\`;`).catch(() => {});
            console.log(`[Migration] Cleaned duplicate index on users: ${idx.Key_name}`);
          }
        }

        const [settingIndexes] = await sequelize.query('SHOW INDEX FROM system_settings;').catch(() => [[]]);
        for (const idx of settingIndexes) {
          if (['_2', '_3', '_4'].some((suf) => idx.Key_name.endsWith(suf))) {
            await sequelize.query(`ALTER TABLE system_settings DROP INDEX \`${idx.Key_name}\`;`).catch(() => {});
            console.log(`[Migration] Cleaned duplicate index on system_settings: ${idx.Key_name}`);
          }
        }
      } catch (idxErr) {
        console.warn('[Migration Index Cleanup Note]:', idxErr.message);
      }
    }

    // 4. Sync all models cleanly
    await sequelize.sync();
    console.log('[Migration] All tables synchronized with location, admin, payment, settings, and silver asset fields.');
  } catch (error) {
    console.error('[Migration Error]:', error.message);
  }
};

export default runMigrations;
