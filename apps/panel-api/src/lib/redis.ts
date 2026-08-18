import { Redis, type RedisOptions } from 'ioredis';
import { getConfig } from './env.js';

export function buildRedisOptions(overrides: Partial<RedisOptions> = {}): RedisOptions {
  const config = getConfig();
  const options: RedisOptions = {
    host: config.redisHost,
    port: config.redisPort,
    maxRetriesPerRequest: overrides.maxRetriesPerRequest ?? 1,
    connectTimeout: overrides.connectTimeout ?? 2000,
    lazyConnect: overrides.lazyConnect ?? true,
    ...overrides,
  };

  if (config.redisPassword) {
    options.password = config.redisPassword;
  }

  if (config.redisTls) {
    options.tls = {};
  }

  return options;
}

export function createRedisClient(overrides: Partial<RedisOptions> = {}): Redis {
  return new Redis(buildRedisOptions(overrides));
}

export async function pingRedis(): Promise<boolean> {
  const client = createRedisClient({ lazyConnect: true });
  try {
    await client.connect();
    const pong = await client.ping();
    return pong === 'PONG';
  } catch {
    return false;
  } finally {
    client.disconnect();
  }
}

let sharedRedis: Redis | null = null;

/** Shared Redis client for short-lived caches (container state, etc.). */
export function getSharedRedis(): Redis | null {
  if (sharedRedis) return sharedRedis;
  try {
    sharedRedis = createRedisClient({ lazyConnect: true, maxRetriesPerRequest: 1 });
    sharedRedis.on('error', () => {
      /* connection errors are handled per-call */
    });
    return sharedRedis;
  } catch {
    return null;
  }
}

export async function closeSharedRedis(): Promise<void> {
  if (!sharedRedis) return;
  sharedRedis.disconnect();
  sharedRedis = null;
}
