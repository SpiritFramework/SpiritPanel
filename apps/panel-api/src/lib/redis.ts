import { Redis } from 'ioredis';
import { getConfig } from './env.js';

export async function pingRedis(): Promise<boolean> {
  const config = getConfig();
  const client = new Redis({
    host: config.redisHost,
    port: config.redisPort,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    lazyConnect: true,
  });

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
