import Redis from 'ioredis';

// Railway injects REDIS_URL
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => {
    if (times > 3) {
      console.warn('Redis unreachable after 3 attempts. Disabling cache.');
      return null; // Stop retrying
    }
    return Math.min(times * 50, 2000); // fail fast
  },
});

// Suppress repetitive error logging by only logging once or keeping it silent
let errorLogged = false;
redis.on('error', (err) => {
  if (!errorLogged) {
    console.warn('Redis connection error:', err.message);
    errorLogged = true;
  }
});

/**
 * Cache-aside getOrSet wrapper.
 * Fails open (falls back to fetchFn) if Redis is down.
 */
export async function getOrSet(key, ttlSeconds, fetchFn) {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.warn(`Redis get failed for key ${key}, falling back to DB:`, err.message);
  }

  const freshData = await fetchFn();

  try {
    if (freshData) {
      await redis.set(key, JSON.stringify(freshData), 'EX', ttlSeconds);
    }
  } catch (err) {
    console.warn(`Redis set failed for key ${key}:`, err.message);
  }

  return freshData;
}
