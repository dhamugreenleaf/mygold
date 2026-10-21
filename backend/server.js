import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

import sequelize, { initializeDatabase } from './config/database.js';
import { runMigrations } from './migrations/migrate.js';
import { seedDemoData } from './seeders/demoData.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import goldRateRoutes from './routes/goldRate.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';
import healthRoutes from './routes/health.routes.js';
import adminRoutes from './routes/admin.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { initDailyNotificationCron } from './cron/dailyNotifications.cron.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const rawCorsOrigin = process.env.CORS_ORIGIN || '*';
const allowedOrigins = rawCorsOrigin === '*'
  ? '*'
  : rawCorsOrigin.split(',').map((o) => o.trim());

// Security and Performance Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins === '*' ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        origin.includes('gldatacenter.com') ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Allow origin in production
    },
    credentials: true,
  })
);
app.use(compression());
app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));

// Webhook Raw Body Parser (MUST be before express.json for cryptographic signature validation)
app.use('/api/payments/razorpay/webhook', express.raw({ type: 'application/json' }));
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check API Routes (Root & API namespace)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Application API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rates', goldRateRoutes);
app.use('/api/gold-rates', goldRateRoutes);
app.use('/api/gold-rate', goldRateRoutes);
app.use('/api/gold', goldRateRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/assets', purchaseRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notification', notificationRoutes);

// Static frontend serving if dist folder exists (Production / Fullstack Deployment)
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(
    express.static(frontendDist, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html') || filePath.endsWith('sw.js')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

// 404 Handler for Unmatched API Endpoints
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  console.error('API Error:', err.message || err);
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Initialize Database & Start Server
const startServer = async () => {
  try {
    await initializeDatabase();
    await runMigrations();
    await seedDemoData();
    initDailyNotificationCron();
  } catch (error) {
    console.error('Failed to initialize database:', error.message);
  }

  const getNetworkIp = () => {
    try {
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            return iface.address;
          }
        }
      }
    } catch {}
    return '127.0.0.1';
  };

  app.listen(PORT, '0.0.0.0', () => {
    const networkIp = getNetworkIp();
    console.log(`✨ Gold Tracker Server running on:`);
    console.log(`   - Local:   http://localhost:${PORT}`);
    console.log(`   - Network: http://${networkIp}:${PORT}`);
  });
};

startServer();
