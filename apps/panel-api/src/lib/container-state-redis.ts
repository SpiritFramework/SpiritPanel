import { getSharedRedis } from './redis.js';

const KEY_PREFIX = 'spirit:cs:';
const TTL_SEC = 10;

function redisKey(uuid: string): string {
  return `${KEY_PREFIX}${uuid}`;
}

async function withRedis<T>(fn: (client: NonNullable<ReturnType<typeof getSharedRedis>>) => Promise<T>): Promise<T | null> {
  const client = getSharedRedis();
  if (!client) return null;
  try {
    if (client.status !== 'ready') await client.connect();
    return await fn(client);
  } catch {
    return null;
  }
}

export async function redisSetContainerStatus(uuid: string, state: string): Promise<void> {
  await withRedis((client) => client.set(redisKey(uuid), state, 'EX', TTL_SEC));
}

export async function redisGetContainerStatus(uuid: string): Promise<string | null> {
  const value = await withRedis((client) => client.get(redisKey(uuid)));
  return value ?? null;
}

export async function redisDeleteContainerStatus(uuid: string): Promise<void> {
  await withRedis((client) => client.del(redisKey(uuid)));
}

/** Best-effort flush of all container-state keys (used on admin refresh). */
export async function redisClearContainerStatuses(): Promise<void> {
  await withRedis(async (client) => {
    let cursor = '0';
    do {
      const [next, keys] = await client.scan(cursor, 'MATCH', `${KEY_PREFIX}*`, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) await client.del(...keys);
    } while (cursor !== '0');
  });
}
