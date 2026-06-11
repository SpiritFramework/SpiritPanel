const failures = new Map<string, { count: number; lockedUntil: number }>();

const MAX_FAILURES = 10;
const LOCKOUT_MS = 15 * 60 * 1000;
const WINDOW_MS = 60 * 60 * 1000;

function keyFor(identifier: string, ip: string): string {
  return `${identifier.trim().toLowerCase()}|${ip}`;
}

function pruneExpired(entry: { count: number; lockedUntil: number }, now: number): void {
  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
    entry.count = 0;
    entry.lockedUntil = 0;
  }
}

export function assertLoginAllowed(identifier: string, ip: string): void {
  const now = Date.now();
  const entry = failures.get(keyFor(identifier, ip));
  if (!entry) return;
  pruneExpired(entry, now);
  if (entry.lockedUntil > now) {
    throw Object.assign(new Error('Too many failed login attempts. Please try again later.'), {
      statusCode: 429,
    });
  }
}

export function recordLoginFailure(identifier: string, ip: string): void {
  const now = Date.now();
  const mapKey = keyFor(identifier, ip);
  const entry = failures.get(mapKey) ?? { count: 0, lockedUntil: 0 };
  pruneExpired(entry, now);
  entry.count += 1;
  if (entry.count >= MAX_FAILURES) {
    entry.lockedUntil = now + LOCKOUT_MS;
    entry.count = 0;
  }
  failures.set(mapKey, entry);

  // Prevent unbounded map growth.
  if (failures.size > 10_000) {
    for (const [k, v] of failures) {
      if (v.lockedUntil > 0 && v.lockedUntil < now - WINDOW_MS) failures.delete(k);
    }
  }
}

export function clearLoginFailures(identifier: string, ip: string): void {
  failures.delete(keyFor(identifier, ip));
}
