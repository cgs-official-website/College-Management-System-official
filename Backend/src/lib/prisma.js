import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({
  connectionString,
  // Keep TCP connections alive with frequent probes so remote proxy doesn't drop them
  keepAlive: true,
  keepAliveInitialDelayMillis: 3000,
  // Recycle idle connections quickly (15s) so stale proxy connections aren't reused
  idleTimeoutMillis: 15000,
  // Fail fast within 10s if remote DB cannot be reached
  connectionTimeoutMillis: 10000,
  // Prevent hanging on broken sockets
  query_timeout: 15000,
  // Pool size: on-demand creation without holding stale idle connections
  max: 10,
  min: 0,
});

// Log pool-level errors so they don't crash the process silently
pool.on('error', (err) => {
  console.error('[PrismaPool] Idle client error – pool will reconnect automatically:', err.message);
});

const adapter = new PrismaPg(pool);
const basePrisma = new PrismaClient({ adapter });

// Wrap $transaction to provide a robust default timeout for remote / high-latency databases
const originalTransaction = basePrisma.$transaction.bind(basePrisma);

basePrisma.$transaction = function (arg, options = {}) {
  if (typeof arg === 'function') {
    const defaultOptions = {
      maxWait: 15000, // 15 seconds to acquire a connection from the pool (default was 2s)
      timeout: 60000, // 60 seconds interactive transaction execution timeout (default was 5s)
      ...options
    };
    return originalTransaction(arg, defaultOptions);
  }
  return originalTransaction(arg, options);
};

export const prisma = basePrisma;

/**
 * Warm up the DB connection with retries.
 * Call this once at app startup.
 */
export async function connectWithRetry(maxRetries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log(`[PrismaPool] ✅ Database connected (attempt ${attempt})`);
      return;
    } catch (err) {
      console.warn(`[PrismaPool] DB connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        console.error('[PrismaPool] Could not connect to the database after all retries. Running in degraded mode.');
      }
    }
  }
}

export default prisma;
