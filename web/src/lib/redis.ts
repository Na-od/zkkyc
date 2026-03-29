import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => {
    if (times > 1) return null; // Stop retrying quickly to trigger fallback
    return 50;
  }
});

// Prevent unhandled error events from crashing the process
redis.on('error', (err) => {
  // console.warn('Redis Connection Error:', err.message);
});

// For local development persistence
const globalForRedis = global as unknown as { memoryCache: Record<string, string> };
export const memoryCache = globalForRedis.memoryCache || {};

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.memoryCache = memoryCache;
}

/**
 * Helper to set value with Redis fallback
 */
export async function setCache(key: string, value: string, expirySeconds: number) {
  try {
    await redis.set(key, value, 'EX', expirySeconds);
  } catch (err) {
    console.warn(`⚠️ Redis 'set' failed, using in-memory fallback for ${key}`);
    memoryCache[key] = value;
  }
}

/**
 * Helper to get value with Redis fallback
 */
export async function getCache(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch (err) {
    console.warn(`⚠️ Redis 'get' failed, using in-memory fallback for ${key}`);
    return memoryCache[key] || null;
  }
}

/**
 * Helper to delete value with Redis fallback
 */
export async function delCache(key: string) {
  try {
    await redis.del(key);
  } catch (err) {
    delete memoryCache[key];
  }
}
