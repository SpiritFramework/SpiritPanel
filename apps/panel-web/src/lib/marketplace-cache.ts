type CacheEntry<T> = { expiresAt: number; data: T };

const store = new Map<string, CacheEntry<unknown>>();

export function getMarketplaceCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) return null;
  return entry.data as T;
}

export function getMarketplaceCacheStale<T>(key: string): T | null {
  const entry = store.get(key);
  return entry ? (entry.data as T) : null;
}

export function setMarketplaceCache<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function marketplaceCacheKey(serverId: string, ...parts: (string | number)[]): string {
  return `${serverId}:${parts.join(':')}`;
}
