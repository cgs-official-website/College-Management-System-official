import Redis from 'ioredis';
import pino from 'pino';

// Dedicated logger instance for cache module if server.js logger isn't initialized yet
const logger = pino({
  transport: process.env.NODE_ENV === 'production' ? undefined : {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Railway injects REDIS_URL
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) {
      logger.warn('[warn] Redis unreachable after 3 attempts. Disabling cache and failing open.');
      return null; // Stop retrying
    }
    return Math.min(times * 50, 2000); // fail fast
  },
});

// Connect lazily with non-blocking error handling
redis.connect().catch((err) => {
  logger.warn(`[warn] Redis initial connection failed: ${err.message}. Cache failing open.`);
});

let errorLogged = false;
redis.on('error', (err) => {
  if (!errorLogged) {
    logger.warn(`[warn] Redis connection error: ${err.message}. Operating in fail-open mode.`);
    errorLogged = true;
  }
});

redis.on('ready', () => {
  logger.info('[info] Redis connection established and ready.');
  errorLogged = false;
});

/**
 * Standardized Redis key naming generator
 * Ensures module caches never conflict with authentication / session keys.
 */
export const redisKeys = {
  refreshToken: (tokenHash) => `auth:refresh:${tokenHash}`,
  userRefreshToken: (userId) => `auth:user_refresh:${userId}`,
  revokedToken: (jti) => `auth:revoked:${jti}`,
  dashboardStats: (collegeId) => `dashboard:stats:${collegeId}`,
  inventoryItems: (collegeId, paramsStr = '') => `inventory:items:${collegeId}:${paramsStr}`,
  inventoryCategories: (collegeId) => `inventory:categories:${collegeId}:*`
};

/**
 * Cache-aside getOrSet wrapper.
 * Fails open (falls back to fetchFn) if Redis is down.
 */
export async function getOrSet(key, ttlSeconds, fetchFn) {
  if (redis.status === 'ready') {
    try {
      const cached = await redis.get(key);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (parseErr) {
          logger.warn(`[warn] Redis JSON parse error for key ${key}. Falling back to fetch.`);
          await redis.del(key).catch(() => {});
        }
      }
    } catch (err) {
      logger.warn(`[warn] Redis cache read failed for key ${key}: ${err.message}. Falling open.`);
    }
  }

  const freshData = await fetchFn();

  if (redis.status === 'ready' && freshData !== undefined && freshData !== null) {
    try {
      await redis.set(key, JSON.stringify(freshData), 'EX', ttlSeconds);
    } catch (err) {
      logger.warn(`[warn] Redis cache write failed for key ${key}: ${err.message}.`);
    }
  }

  return freshData;
}

/**
 * Invalidate cache keys matching a pattern (e.g. "inventory:categories:collegeId:*").
 * Prevents wiping authentication / session keys.
 * Fails open if Redis is offline.
 */
export async function invalidateCachePattern(pattern) {
  if (redis.status === 'ready') {
    try {
      // Guard: Never allow deleting auth keys via generic pattern invalidation
      if (pattern.startsWith('auth:') || pattern === '*') {
        logger.warn(`[warn] Blocked dangerous cache invalidation pattern: ${pattern}`);
        return;
      }

      const keys = await redis.keys(pattern);
      if (keys && keys.length > 0) {
        // Filter out any auth keys just in case
        const safeKeys = keys.filter(k => !k.startsWith('auth:'));
        if (safeKeys.length > 0) {
          await redis.del(...safeKeys);
        }
      }
    } catch (err) {
      logger.warn(`[warn] Redis cache invalidation failed for pattern ${pattern}: ${err.message}.`);
    }
  }
}
