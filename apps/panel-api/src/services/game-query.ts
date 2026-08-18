import { resolveAllocationHost } from '@spirit/shared';
import { GameDig } from 'gamedig';
import { isFiveMEgg, type FiveMEggLike } from '../lib/fivem-egg.js';

export interface GameQueryEgg extends FiveMEggLike {
  nest?: { name: string } | null;
}

export interface GamePlayerCountResult {
  online: number;
  max: number | null;
  source: 'fivem' | 'gamedig' | 'none';
  queryType: string | null;
  supported: boolean;
  offline: boolean;
  error: string | null;
}

const QUERY_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 10_000;

interface CacheEntry {
  expiresAt: number;
  result: GamePlayerCountResult;
}

const cache = new Map<string, CacheEntry>();

function eggFeatures(egg: GameQueryEgg): string[] {
  if (!Array.isArray(egg.features)) return [];
  return egg.features.map((f) => String(f).toLowerCase());
}

function matchesAny(haystack: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(haystack));
}

/** Ordered gamedig types to try for this egg (first match wins when query succeeds). */
export function resolveQueryTypes(egg: GameQueryEgg, port: number): string[] {
  const types: string[] = [];
  const push = (type: string) => {
    if (!types.includes(type)) types.push(type);
  };

  const name = egg.name.toLowerCase();
  const nest = egg.nest?.name?.toLowerCase() ?? '';
  const label = `${nest} ${name}`;
  const features = eggFeatures(egg);

  if (isFiveMEgg(egg)) {
    push('fivem-http');
    push('fivem');
    return types;
  }

  if (matchesAny(label, [/bedrock/i]) || features.includes('bedrock')) {
    push('minecraftpe');
  } else if (matchesAny(label, [/minecraft/i]) || (features.includes('eula') && !features.includes('steam'))) {
    push('minecraft');
  }

  if (matchesAny(label, [/rust/i])) push('rust');
  if (matchesAny(label, [/ark|survival evolved/i])) push('arkse');
  if (matchesAny(label, [/valheim/i])) push('valheim');
  if (matchesAny(label, [/terraria/i])) push('terraria');
  if (matchesAny(label, [/counter.?strike|cs2|csgo/i])) push('cs2');
  if (matchesAny(label, [/garry|gmod/i])) push('gmod');
  if (matchesAny(label, [/7 days|7dtd/i])) push('7d2d');
  if (matchesAny(label, [/palworld/i])) push('palworld');
  if (matchesAny(label, [/project zomboid/i])) push('projectzomboid');
  if (matchesAny(label, [/satisfactory/i])) push('satisfactory');
  if (matchesAny(label, [/factorio/i])) push('factorio');
  if (matchesAny(label, [/conan/i])) push('conanexiles');
  if (matchesAny(label, [/dayz/i])) push('dayz');
  if (matchesAny(label, [/unturned/i])) push('unturned');
  if (matchesAny(label, [/squad/i])) push('squad');
  if (matchesAny(label, [/scum/i])) push('scum');
  if (matchesAny(label, [/mordhau/i])) push('mordhau');
  if (matchesAny(label, [/insurgency/i])) push('insurgencysandstorm');
  if (matchesAny(label, [/team fortress|tf2/i])) push('tf2');
  if (matchesAny(label, [/left 4 dead|l4d2/i])) push('l4d2');
  if (matchesAny(label, [/starbound/i])) push('starbound');
  if (matchesAny(label, [/vintage story/i])) push('vintagestory');
  if (matchesAny(label, [/alt\.?v/i])) push('altv');

  if (features.includes('steam') && types.length === 0) {
    push('cs2');
    push('gmod');
  }

  const portHints: Record<number, string[]> = {
    30120: ['fivem-http', 'fivem'],
    25565: ['minecraft'],
    19132: ['minecraftpe'],
    28015: ['rust'],
    28016: ['rust'],
    7777: ['arkse', 'terraria'],
    2456: ['valheim'],
    2457: ['valheim'],
    2458: ['valheim'],
    16261: ['projectzomboid'],
    27015: ['cs2', 'gmod'],
    27016: ['cs2', 'gmod'],
    27017: ['cs2', 'gmod'],
  };
  for (const type of portHints[port] ?? []) push(type);

  for (const fallback of ['minecraft', 'cs2', 'rust', 'terraria', 'valheim', 'gmod', 'arkse']) {
    push(fallback);
  }

  return types.slice(0, 8);
}

async function queryFiveMHttp(host: string, port: number): Promise<GamePlayerCountResult | null> {
  const base = `http://${host}:${port}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    const dynamicRes = await fetch(`${base}/dynamic.json`, { signal: controller.signal });
    if (!dynamicRes.ok) return null;

    const dynamic = (await dynamicRes.json()) as {
      clients?: number;
      sv_maxclients?: number;
    };

    const online = typeof dynamic.clients === 'number' ? dynamic.clients : 0;
    const max = typeof dynamic.sv_maxclients === 'number' ? dynamic.sv_maxclients : null;

    return {
      online,
      max,
      source: 'fivem',
      queryType: 'fivem-http',
      supported: true,
      offline: false,
      error: null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function queryGamedig(type: string, host: string, port: number): Promise<GamePlayerCountResult | null> {
  try {
    const state = await GameDig.query({
      type,
      host,
      port,
      socketTimeout: 3000,
      attemptTimeout: QUERY_TIMEOUT_MS,
      requestPlayers: false,
    });

    const online = typeof state.numplayers === 'number' ? state.numplayers : 0;
    const max = typeof state.maxplayers === 'number' ? state.maxplayers : null;

    return {
      online,
      max,
      source: 'gamedig',
      queryType: type,
      supported: true,
      offline: false,
      error: null,
    };
  } catch {
    return null;
  }
}

function emptyResult(partial: Partial<GamePlayerCountResult> = {}): GamePlayerCountResult {
  return {
    online: 0,
    max: null,
    source: 'none',
    queryType: null,
    supported: true,
    offline: false,
    error: null,
    ...partial,
  };
}

export interface QueryServerPlayerCountInput {
  serverId: string;
  containerState: string;
  egg: GameQueryEgg;
  allocation: { ip: string; port: number; alias?: string | null };
  node: { fqdn: string };
}

export async function queryServerPlayerCount(input: QueryServerPlayerCountInput): Promise<GamePlayerCountResult> {
  const cached = cache.get(input.serverId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const running = input.containerState.toLowerCase() === 'running';
  if (!running) {
    const result = emptyResult({ offline: true, supported: true });
    cache.set(input.serverId, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  const host = resolveAllocationHost(input.allocation, input.node);
  const port = input.allocation.port;
  const types = resolveQueryTypes(input.egg, port);

  for (const type of types) {
    const result =
      type === 'fivem-http'
        ? await queryFiveMHttp(host, port)
        : await queryGamedig(type, host, port);

    if (result) {
      cache.set(input.serverId, { result, expiresAt: Date.now() + CACHE_TTL_MS });
      return result;
    }
  }

  const result = emptyResult({
    supported: types.length > 0,
    error: 'Unable to query players for this server',
  });
  cache.set(input.serverId, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
