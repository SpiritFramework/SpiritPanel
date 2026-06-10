import { CONTAINER_STATES, normalizeContainerState } from './container-state.js';

export interface WingsResourcesSnapshot {
  state?: string;
  uptime?: number;
  memory_bytes?: number;
  cpu_absolute?: number;
  disk_bytes?: number;
  network?: { rx_bytes?: number; tx_bytes?: number };
}

function pickStateFromSource(source: Record<string, unknown>): string | undefined {
  for (const key of ['state', 'current_state', 'status'] as const) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function collectMetricSources(root: Record<string, unknown>): Record<string, unknown>[] {
  return [root.utilization, root.resources, root.attributes, root.data, root].filter(
    (entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object',
  );
}

/** Normalize FeatherWings `GET /api/servers/{uuid}` payloads (flat or nested). */
export function parseWingsResourcesPayload(raw: unknown): WingsResourcesSnapshot {
  if (!raw || typeof raw !== 'object') return {};

  const root = raw as Record<string, unknown>;
  const metricSources = collectMetricSources(root);

  let nestedState: string | undefined;
  let uptime: number | undefined;
  let memory_bytes: number | undefined;
  let cpu_absolute: number | undefined;
  let disk_bytes: number | undefined;
  let network: WingsResourcesSnapshot['network'];

  for (const source of metricSources) {
    if (!nestedState) nestedState = pickStateFromSource(source);
    if (uptime === undefined && typeof source.uptime === 'number') uptime = source.uptime;
    if (memory_bytes === undefined && typeof source.memory_bytes === 'number') {
      memory_bytes = source.memory_bytes;
    }
    if (cpu_absolute === undefined && typeof source.cpu_absolute === 'number') {
      cpu_absolute = source.cpu_absolute;
    }
    if (disk_bytes === undefined && typeof source.disk_bytes === 'number') {
      disk_bytes = source.disk_bytes;
    }
    if (!network && source.network && typeof source.network === 'object') {
      const n = source.network as { rx_bytes?: number; tx_bytes?: number };
      network = {
        rx_bytes: typeof n.rx_bytes === 'number' ? n.rx_bytes : undefined,
        tx_bytes: typeof n.tx_bytes === 'number' ? n.tx_bytes : undefined,
      };
    }
  }

  // FeatherWings top-level `state` is authoritative over nested utilization.state.
  const rootState = typeof root.state === 'string' && root.state.trim() ? root.state.trim() : undefined;

  return {
    state: rootState ?? nestedState,
    uptime,
    memory_bytes,
    cpu_absolute,
    disk_bytes,
    network,
  };
}

function normalizeWingsState(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  const normalized = normalizeContainerState(raw.trim());
  return CONTAINER_STATES.has(normalized) ? normalized : null;
}

function statsIndicateRunning(resources: WingsResourcesSnapshot): boolean {
  return (
    (resources.uptime ?? 0) > 0 ||
    (resources.memory_bytes ?? 0) > 512_000 ||
    (resources.cpu_absolute ?? 0) > 0.05
  );
}

/** Derive a container state from a Wings server/resources response. */
export function inferStateFromWingsResources(raw: unknown): string {
  const resources = parseWingsResourcesPayload(raw);
  const explicit = normalizeWingsState(resources.state);
  const active = statsIndicateRunning(resources);

  // Stale nested "starting" while the container is clearly up → running.
  if (explicit === 'starting' && active) return 'running';
  if (explicit) return explicit;
  if (active) return 'running';
  return 'offline';
}
