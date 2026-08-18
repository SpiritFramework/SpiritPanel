/**
 * Caching utilities for improved performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<any>>();

/** Set a value in cache with TTL */
export function setCacheValue<T>(key: string, data: T, ttlMs: number = 60000): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
}

/** Get a value from cache if not expired */
export function getCacheValue<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/** Clear specific cache key */
export function clearCacheKey(key: string): void {
  cache.delete(key);
}

/** Clear all cache entries older than TTL */
export function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
    }
  }
}

/** Batch cache clearing for pattern */
export function clearCachePattern(pattern: RegExp): void {
  for (const key of cache.keys()) {
    if (pattern.test(key)) {
      cache.delete(key);
    }
  }
}

/** Get cache statistics */
export function getCacheStats() {
  return {
    size: cache.size,
    maxSize: 10000, // Prevent unbounded growth
  };
}

/** Check if cache is full and clean if needed */
export function maintainCacheSize(): void {
  const stats = getCacheStats();
  if (stats.size > stats.maxSize * 0.8) {
    clearExpiredCache();
  }
  if (stats.size > stats.maxSize) {
    // Delete oldest entries
    const entries = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < entries.length * 0.1; i++) {
      cache.delete(entries[i][0]);
    }
  }
}

/** Create a memoized function */
export function memoize<Args extends any[], Return>(
  fn: (...args: Args) => Return,
  options: { ttl?: number; keyGenerator?: (...args: Args) => string } = {}
): (...args: Args) => Return {
  const ttl = options.ttl || 60000;
  const keyGenerator = options.keyGenerator || ((...args) => JSON.stringify(args));

  return (...args: Args): Return => {
    const key = `memo:${keyGenerator(...args)}`;
    const cached = getCacheValue<Return>(key);
    if (cached !== null) {
      return cached;
    }

    const result = fn(...args);
    setCacheValue(key, result, ttl);
    maintainCacheSize();
    return result;
  };
}

/** Create a memoized async function */
export function memoizeAsync<Args extends any[], Return>(
  fn: (...args: Args) => Promise<Return>,
  options: { ttl?: number; keyGenerator?: (...args: Args) => string } = {}
): (...args: Args) => Promise<Return> {
  const ttl = options.ttl || 60000;
  const keyGenerator = options.keyGenerator || ((...args) => JSON.stringify(args));

  return async (...args: Args): Promise<Return> => {
    const key = `memo:${keyGenerator(...args)}`;
    const cached = getCacheValue<Return>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn(...args);
    setCacheValue(key, result, ttl);
    maintainCacheSize();
    return result;
  };
}
