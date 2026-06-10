import type { PrismaClient } from '@prisma/client';

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

const statusCache = new Map<string, { state: string; expiresAt: number }>();
const TTL_MS = 60 * 60 * 1000;

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

export function setContainerStatus(uuid: string, state: string) {
  statusCache.set(uuid, { state, expiresAt: Date.now() + TTL_MS });
}

export function getContainerStatus(uuid: string): string | null {
  const entry = statusCache.get(uuid);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    statusCache.delete(uuid);
    return null;
  }
  return entry.state;
}

/** Drop all in-memory Wings container status entries (API restart does the same). */
export function clearContainerStatusCache(): number {
  const count = statusCache.size;
  statusCache.clear();
  return count;
}

export async function applyContainerStatusUpdate(
  prisma: PrismaClient,
  server: { id: string; uuid: string },
  state: string,
) {
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
  } else if (state === 'stopping' || state === 'stopped' || state === 'offline') {
    data.status = 'normal';
  } else if (state === 'suspended') {
    data.suspended = true;
  }

  await prisma.server.update({ where: { id: server.id }, data });
}

/** Align stale panel install flags with a live container state for API responses. */
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
  return {};
}
