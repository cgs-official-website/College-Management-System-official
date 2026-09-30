import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({
  connectionString,
  // Keep TCP connections alive so the remote DB doesn't drop idle ones
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  // Remove idle connections after 120s
  idleTimeoutMillis: 120000,
  // Connection attempt timeout — generous for slow remote DBs
  connectionTimeoutMillis: 30000,
  // Pool size
  max: 10,
  min: 1,
});

// Log pool-level errors so they don't crash the process silently
pool.on('error', (err) => {
  console.error('[PrismaPool] Idle client error – pool will reconnect automatically:', err.message);
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

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
