import { getSharedRedis } from './redis.js';

const failures = new Map<string, { count: number; lockedUntil: number }>();

const MAX_FAILURES = 10;
const LOCKOUT_MS = 15 * 60 * 1000;
const WINDOW_MS = 60 * 60 * 1000;
const LOCK_PREFIX = 'login:lock:';
const FAIL_PREFIX = 'login:fail:';

/** Per identifier+IP (distributed / shared-IP friendly). */
function pairKey(identifier: string, ip: string): string {
  return `${identifier.trim().toLowerCase()}|${ip}`;
}

/** Account identity alone — locks after N failures across any IPs. */
function accountKey(identifier: string): string {
  return `acct:${identifier.trim().toLowerCase()}`;
}

function lockoutError(): Error & { statusCode: number } {
  return Object.assign(new Error('Too many failed login attempts. Please try again later.'), {
    statusCode: 429,
  });
}

function pruneExpired(entry: { count: number; lockedUntil: number }, now: number): void {
  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
    entry.count = 0;
    entry.lockedUntil = 0;
  }
}

async function redisClient() {
  const redis = getSharedRedis();
  if (!redis) return null;
  try {
    if (redis.status === 'wait') await redis.connect();
    if (redis.status !== 'ready') return null;
    return redis;
  } catch {
    return null;
  }
}

async function assertKeyAllowed(mapKey: string): Promise<void> {
  const redis = await redisClient();
  if (redis) {
    try {
      const locked = await redis.get(`${LOCK_PREFIX}${mapKey}`);
      if (locked) throw lockoutError();
      return;
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 429) throw err;
    }
  }

  const now = Date.now();
  const entry = failures.get(mapKey);
  if (!entry) return;
  pruneExpired(entry, now);
  if (entry.lockedUntil > now) throw lockoutError();
}

async function recordKeyFailure(mapKey: string): Promise<void> {
  const redis = await redisClient();
  if (redis) {
    try {
      const failKey = `${FAIL_PREFIX}${mapKey}`;
      const count = await redis.incr(failKey);
      if (count === 1) await redis.pexpire(failKey, WINDOW_MS);
      if (count >= MAX_FAILURES) {
        await redis.set(`${LOCK_PREFIX}${mapKey}`, '1', 'PX', LOCKOUT_MS);
        await redis.del(failKey);
      }
      return;
    } catch {
      // fall back to in-memory guard
    }
  }

  const now = Date.now();
  const entry = failures.get(mapKey) ?? { count: 0, lockedUntil: 0 };
  pruneExpired(entry, now);
  entry.count += 1;
  if (entry.count >= MAX_FAILURES) {
    entry.lockedUntil = now + LOCKOUT_MS;
    entry.count = 0;
  }
  failures.set(mapKey, entry);

  if (failures.size > 10_000) {
    for (const [k, v] of failures) {
      if (v.lockedUntil > 0 && v.lockedUntil < now - WINDOW_MS) failures.delete(k);
    }
  }
}

async function clearKeyFailures(mapKey: string): Promise<void> {
  const redis = await redisClient();
  if (redis) {
    try {
      await redis.del(`${LOCK_PREFIX}${mapKey}`, `${FAIL_PREFIX}${mapKey}`);
    } catch {
      // ignore
    }
  }
  failures.delete(mapKey);
}

export async function assertLoginAllowed(identifier: string, ip: string): Promise<void> {
  await assertKeyAllowed(pairKey(identifier, ip));
  await assertKeyAllowed(accountKey(identifier));
}

export async function recordLoginFailure(identifier: string, ip: string): Promise<void> {
  await recordKeyFailure(pairKey(identifier, ip));
  await recordKeyFailure(accountKey(identifier));
}

export async function clearLoginFailures(identifier: string, ip: string): Promise<void> {
  await clearKeyFailures(pairKey(identifier, ip));
  await clearKeyFailures(accountKey(identifier));
}
