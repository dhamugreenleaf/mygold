import sequelize from '../config/database.js';
import { PROVIDER_INFO, getLatestGoldRatesMap } from '../services/goldRate.service.js';

/**
 * Format uptime into human-readable string
 */
const formatUptime = (seconds) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(' ');
};

/**
 * Test Database Connectivity and Latency
 */
const checkDatabaseHealth = async () => {
  const startTime = Date.now();
  try {
    await sequelize.authenticate();
    const latencyMs = Date.now() - startTime;
    return {
      status: 'connected',
      dialect: sequelize.getDialect?.() || 'unknown',
      latencyMs: `${latencyMs}ms`,
      healthy: true,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      dialect: sequelize.getDialect?.() || 'unknown',
      error: error.message,
      healthy: false,
    };
  }
};

/**
 * Check Gold Rate Service Health
 */
const checkGoldRateServiceHealth = async () => {
  try {
    const rateData = await getLatestGoldRatesMap();
    return {
      status: rateData.isUnavailable ? 'degraded' : 'active',
      provider: PROVIDER_INFO?.name || 'Gold Rate Provider',
      isStale: !!rateData.isStale,
      lastUpdated: rateData.updatedAt || null,
      healthy: !rateData.isUnavailable,
    };
  } catch (error) {
    return {
      status: 'unavailable',
      provider: PROVIDER_INFO?.name || 'Gold Rate Provider',
      error: error.message,
      healthy: false,
    };
  }
};

/**
 * Main Health Check Handler - Returns general system & dependency health
 * GET /api/health or GET /health
 */
export const getHealth = async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const uptimeSeconds = process.uptime();
  const mem = process.memoryUsage();

  const isHealthy = dbHealth.healthy;
  const statusCode = isHealthy ? 200 : 503;

  return res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'degraded',
    message: isHealthy ? 'Gold Tracker API is operational' : 'Gold Tracker API degraded',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(uptimeSeconds),
      human: formatUptime(uptimeSeconds),
    },
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbHealth.status,
      dialect: dbHealth.dialect,
      latency: dbHealth.latencyMs || null,
    },
    memory: {
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
    },
  });
};

/**
 * Liveness Probe - Used by orchestrators (Kubernetes/Docker/Pingers) to verify process is alive
 * GET /api/health/live or GET /health/live
 */
export const getLiveness = (req, res) => {
  return res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
};

/**
 * Readiness Probe - Confirms database and core dependencies are ready to serve incoming traffic
 * GET /api/health/ready or GET /health/ready
 */
export const getReadiness = async (req, res) => {
  const dbHealth = await checkDatabaseHealth();

  if (!dbHealth.healthy) {
    return res.status(503).json({
      status: 'not_ready',
      message: 'Database connection failed',
      database: dbHealth,
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(200).json({
    status: 'ready',
    message: 'All core dependencies are ready to accept traffic',
    database: dbHealth,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Detailed Health Check - Full telemetry for monitoring dashboards and diagnostics
 * GET /api/health/details or GET /health/details
 */
export const getDetailedHealth = async (req, res) => {
  const [dbHealth, goldRateHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkGoldRateServiceHealth(),
  ]);

  const uptimeSeconds = process.uptime();
  const mem = process.memoryUsage();
  const overallHealthy = dbHealth.healthy && goldRateHealth.healthy;
  const statusCode = dbHealth.healthy ? 200 : 503;

  return res.status(statusCode).json({
    status: overallHealthy ? 'healthy' : dbHealth.healthy ? 'degraded' : 'unhealthy',
    timestamp: new Date().toISOString(),
    system: {
      uptimeSeconds: Math.floor(uptimeSeconds),
      uptimeFormatted: formatUptime(uptimeSeconds),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      environment: process.env.NODE_ENV || 'development',
    },
    memory: {
      heapUsedMB: +(mem.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: +(mem.heapTotal / 1024 / 1024).toFixed(2),
      rssMB: +(mem.rss / 1024 / 1024).toFixed(2),
      externalMB: +(mem.external / 1024 / 1024).toFixed(2),
    },
    services: {
      database: dbHealth,
      goldRateProvider: goldRateHealth,
    },
  });
};

export default {
  getHealth,
  getLiveness,
  getReadiness,
  getDetailedHealth,
};
