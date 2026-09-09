import type { PrismaClient } from '@prisma/client';
import {
  redisClearContainerStatuses,
  redisDeleteContainerStatus,
  redisGetContainerStatus,
  redisSetContainerStatus,
} from './container-state-redis.js';

/** Runtime states FeatherWings reports via POST /api/remote/servers/{uuid}/container/status */
export const CONTAINER_STATES = new Set([
  'offline',
  'starting',
  'running',
  'stopping',
  'stopped',
  'installing',
  'install_failed',
  'update_failed',
  'backup_failed',
  'crashed',
  'suspended',
]);

const localCache = new Map<string, { state: string; expiresAt: number }>();
// CRITICAL: Keep TTL very short (10 seconds) because FeatherWings relies on accurate state
// for crash detection. A stale "offline" state causes Wings to repeatedly restart servers
// that are actually running. Previously was 60 minutes which caused infinite restart loops.
const TTL_MS = 10 * 1000;

/**
 * After Kill / force-offline, FeatherWings can keep reporting "stopping" for a long time
 * (soft-stop wait up to ~10 minutes). Ignore those transitional reports so the panel
 * does not get stuck again on the next refresh.
 */
const suppressTransitionalUntil = new Map<string, number>();
const SUPPRESS_TRANSITIONAL_MS = 10 * 60 * 1000; // match FeatherWings soft-stop wait (~10m)

export function suppressTransitionalContainerReports(uuid: string, ms = SUPPRESS_TRANSITIONAL_MS) {
  suppressTransitionalUntil.set(uuid, Date.now() + ms);
}

function shouldSuppressTransitional(uuid: string, state: string): boolean {
  if (state !== 'stopping' && state !== 'starting') return false;
  const until = suppressTransitionalUntil.get(uuid);
  if (!until) return false;
  if (Date.now() > until) {
    suppressTransitionalUntil.delete(uuid);
    return false;
  }
  return true;
}

/** Map a daemon-reported state through recent Kill / force-offline suppression. */
export function resolveReportedContainerState(uuid: string, state: string): string {
  if (shouldSuppressTransitional(uuid, state)) return 'offline';
  return state;
}

export function normalizeContainerState(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, '_');
}

export function parseContainerStatusBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const nested = record.data as Record<string, unknown> | undefined;

  const raw =
    (typeof nested?.new_state === 'string' ? nested.new_state : null) ??
    (typeof record.state === 'string' ? record.state : null);

  if (!raw?.trim()) return null;

  const normalized = normalizeContainerState(raw.trim());
  return CONTAINER_STATES.has(normalized) ? normalized : null;
}

const ACTIVE_STATES = new Set(['running', 'starting']);

/** Read previous_state + new_state from a FeatherWings container status webhook. */
export function parseContainerStatusTransition(body: unknown): {
  previous: string | null;
  next: string | null;
} {
  if (!body || typeof body !== 'object') {
    return { previous: null, next: parseContainerStatusBody(body) };
  }
  const record = body as Record<string, unknown>;
  const nested = record.data as Record<string, unknown> | undefined;

  const prevRaw =
    (typeof nested?.previous_state === 'string' ? nested.previous_state : null) ??
    (typeof record.previous_state === 'string' ? record.previous_state : null);
  const next = parseContainerStatusBody(body);

  const previous = prevRaw?.trim()
    ? (() => {
        const normalized = normalizeContainerState(prevRaw.trim());
        return CONTAINER_STATES.has(normalized) ? normalized : null;
      })()
    : null;

  return { previous, next };
}

/** FeatherWings reports running/starting → offline on crash; infer crashed for panel badges. */
export function inferContainerStateFromTransition(
  previous: string | null,
  next: string | null,
): string | null {
  if (!next) return null;
  if (next !== 'offline') return next;
  if (previous && ACTIVE_STATES.has(previous)) return 'crashed';
  return next;
}

/** Resolve the state to persist from a Wings container status webhook body. */
export function resolveContainerStateFromWebhook(body: unknown): string | null {
  const { previous, next } = parseContainerStatusTransition(body);
  return inferContainerStateFromTransition(previous, next);
}

function setLocalContainerStatus(uuid: string, state: string) {
  localCache.set(uuid, { state, expiresAt: Date.now() + TTL_MS });
}

function getLocalContainerStatus(uuid: string): string | null {
  const entry = localCache.get(uuid);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    localCache.delete(uuid);
    return null;
  }
  return entry.state;
}

export function setContainerStatus(uuid: string, state: string) {
  setLocalContainerStatus(uuid, state);
  void redisSetContainerStatus(uuid, state);
}

/** Resolve container state from local cache, then Redis (multi-instance), then null. */
export async function getContainerStatus(uuid: string): Promise<string | null> {
  const local = getLocalContainerStatus(uuid);
  if (local) return local;

  const remote = await redisGetContainerStatus(uuid);
  if (remote) {
    setLocalContainerStatus(uuid, remote);
    return remote;
  }
  return null;
}

/** Drop all in-memory Wings container status entries (API restart does the same). */
export async function clearContainerStatusCache(): Promise<number> {
  const count = localCache.size;
  localCache.clear();
  await redisClearContainerStatuses();
  return count;
}

export async function deleteContainerStatus(uuid: string): Promise<void> {
  localCache.delete(uuid);
  await redisDeleteContainerStatus(uuid);
}

export async function applyContainerStatusUpdate(
  prisma: PrismaClient,
  server: { id: string; uuid: string },
  state: string,
) {
  if (shouldSuppressTransitional(server.uuid, state)) {
    setContainerStatus(server.uuid, 'offline');
    return;
  }

  const existing = await prisma.server.findUnique({
    where: { id: server.id },
    select: { id: true, name: true, suspended: true, containerState: true },
  });
  const previousState = existing?.containerState ?? 'offline';

  setContainerStatus(server.uuid, state);

  const data: {
    containerState: string;
    status?: 'installing' | 'install_failed' | 'normal';
    installStatus?: 'installing' | 'failed' | 'installed';
    suspended?: boolean;
  } = { containerState: state };

  if (state === 'installing') {
    data.status = 'installing';
    data.installStatus = 'installing';
  } else if (state === 'install_failed') {
    data.status = 'install_failed';
    data.installStatus = 'failed';
  } else if (state === 'running' || state === 'starting') {
    data.status = 'normal';
    data.installStatus = 'installed';
  } else if (
    state === 'stopping' ||
    state === 'stopped' ||
    state === 'offline' ||
    state === 'crashed'
  ) {
    // Wings is not installing — clear stuck install flags that block Start after daemon restarts.
    data.status = 'normal';
    data.installStatus = 'installed';
  }
  // Do not flip Server.suspended from Wings "suspended" runtime state — that flag is admin-controlled.

  await prisma.server.update({ where: { id: server.id }, data });

  if (existing) {
    try {
      const { evaluateServerLifecycleTransition } = await import('../services/alerts.js');
      await evaluateServerLifecycleTransition(existing, previousState, state);
    } catch {
      // Alert evaluation must never block state updates.
    }
  }
}

/** Clear a stuck stopping/starting badge in the panel (and suppress daemon re-stick). */
export async function forcePanelServerOffline(
  prisma: PrismaClient,
  server: { id: string; uuid: string },
): Promise<void> {
  suppressTransitionalContainerReports(server.uuid);
  await applyContainerStatusUpdate(prisma, server, 'offline');
}

/** Align stale panel install flags with a live container state for API responses.
 *
 * CRITICAL: Always return explicit values for installStatus. If this returns undefined,
 * the API will fall back to stale database values, causing servers to show "installing"
 * even when they're running or crashed. This blocks player actions and confuses FeatherWings.
 */
export function reconcilePanelFieldsForContainerState(
  containerState: string,
): Partial<{ status: string; installStatus: string }> {
  if (containerState === 'running' || containerState === 'starting') {
    return { status: 'normal', installStatus: 'installed' };
  }
  if (containerState === 'installing') {
    return { status: 'installing', installStatus: 'installing' };
  }
  if (containerState === 'install_failed') {
    return { status: 'install_failed', installStatus: 'failed' };
  }
  // IMPORTANT: For all other states (offline, stopping, stopped, crashed, suspended, etc.),
  // explicitly clear both status and installStatus so stale "installing" never leaks into the UI
  // or blocks Start after a Wings restart.
  return { status: 'normal', installStatus: 'installed' };
}
