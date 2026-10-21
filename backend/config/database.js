import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 3306;
const dbName = process.env.DB_NAME || 'gold_tracker';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbDialect = process.env.DB_DIALECT || 'sqlite';

const sqliteStorage = path.join(__dirname, '../database.sqlite');

let sequelize;

if (dbDialect === 'mysql') {
  sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    retry: {
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /TimeoutError/,
      ],
      max: 3,
    },
  });
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqliteStorage,
    logging: false,
  });
}

export const initializeDatabase = async () => {
  try {
    if (dbDialect === 'mysql') {
      try {
        const mysql = await import('mysql2/promise');
        const conn = await mysql.default.createConnection({
          host: dbHost,
          port: dbPort,
          user: dbUser,
          password: dbPassword,
        });
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        await conn.end();
      } catch (dbErr) {
        console.warn(`[Database Auto-Create Warning]:`, dbErr.message);
      }
    }

    await sequelize.authenticate();
    console.log(`Database connected successfully using ${sequelize.getDialect().toUpperCase()}.`);
    await sequelize.sync({ alter: false });
    console.log(`All database tables synced successfully in ${dbDialect.toUpperCase()}.`);
    return sequelize;
  } catch (error) {
    console.error(`Database initialization error:`, error.message);
    throw error;
  }
};

export default sequelize;
