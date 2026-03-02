import Redis from 'ioredis';
import { config } from '../../config';
import { logger } from '../../config/logger';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    try {
      redis = new Redis(config.REDIS_URL);
      redis.on('error', (err) => {
        logger.warn('Redis connection error (non-fatal):', err.message);
      });
    } catch {
      logger.warn('Redis not available, using in-memory fallback');
      return null as any;
    }
  }
  return redis;
}

// Simple cache wrapper with optional Redis
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

export async function cacheGet(key: string): Promise<string | null> {
  try {
    const r = getRedis();
    if (r) return await r.get(key);
  } catch { /* fallback */ }

  const entry = memoryCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.value;
  memoryCache.delete(key);
  return null;
}

export async function cacheSet(key: string, value: string, ttlSeconds = 300): Promise<void> {
  try {
    const r = getRedis();
    if (r) { await r.set(key, value, 'EX', ttlSeconds); return; }
  } catch { /* fallback */ }

  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const r = getRedis();
    if (r) { await r.del(key); return; }
  } catch { /* fallback */ }

  memoryCache.delete(key);
}
