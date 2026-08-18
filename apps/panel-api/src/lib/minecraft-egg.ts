/** Modrinth loader / category ids we care about for server installs. */
export const MINECRAFT_PLUGIN_LOADERS = [
  'bukkit',
  'spigot',
  'paper',
  'purpur',
  'folia',
  'sponge',
  'bungeecord',
  'waterfall',
  'velocity',
] as const;

export const MINECRAFT_MOD_LOADERS = ['fabric', 'quilt', 'forge', 'neoforge'] as const;

export type MinecraftPluginLoader = (typeof MINECRAFT_PLUGIN_LOADERS)[number];
export type MinecraftModLoader = (typeof MINECRAFT_MOD_LOADERS)[number];
export type MinecraftLoader = MinecraftPluginLoader | MinecraftModLoader | 'datapack';

export type MinecraftInstallKind = 'plugin' | 'mod' | 'datapack';

export interface MinecraftEggLike {
  name: string;
  features?: unknown;
  dockerImages?: unknown;
  nest?: { name?: string | null } | null;
}

export interface MinecraftEggProfile {
  isMinecraft: boolean;
  isBedrock: boolean;
  loaders: MinecraftLoader[];
  /** Preferred Modrinth project_type facets for browse (mod covers plugins on Modrinth too). */
  projectTypes: Array<'mod' | 'plugin' | 'datapack'>;
  /** Human label for the UI, e.g. "Paper" or "Fabric". */
  platformLabel: string;
  kind: MinecraftInstallKind;
}

const VERSION_ENV_KEYS = [
  'MINECRAFT_VERSION',
  'MC_VERSION',
  'VANILLA_VERSION',
  'SERVER_VERSION',
  'VERSION',
  'PAPER_VERSION',
  'PURPUR_VERSION',
  'FOLIA_VERSION',
  'FABRIC_VERSION',
  'FORGE_VERSION',
  'NEOFORGE_VERSION',
  'BUILD_VERSION',
];

function eggBlob(egg: MinecraftEggLike): string {
  const images =
    egg.dockerImages && typeof egg.dockerImages === 'object'
      ? Object.values(egg.dockerImages as Record<string, string>).join(' ')
      : '';
  const features = Array.isArray(egg.features) ? egg.features.map(String).join(' ') : '';
  return `${egg.nest?.name ?? ''} ${egg.name} ${features} ${images}`.toLowerCase();
}

function featuresList(egg: MinecraftEggLike): string[] {
  return Array.isArray(egg.features) ? egg.features.map((f) => String(f).toLowerCase()) : [];
}

/** True for Java Minecraft game servers (excluding pure Bedrock). */
export function isMinecraftEgg(egg: MinecraftEggLike): boolean {
  if (isBedrockOnlyEgg(egg)) return false;
  const features = featuresList(egg);
  if (features.includes('eula') && !features.includes('steam') && !features.includes('fivem')) {
    return true;
  }
  const blob = eggBlob(egg);
  if (
    /\b(minecraft|paper|spigot|purpur|folia|fabric|forge|neoforge|quilt|sponge|bungee|waterfall|velocity|bukkit|magma|mohist|arclight|leaves|pufferfish)\b/.test(
      blob,
    )
  ) {
    return true;
  }
  return false;
}

export function isBedrockOnlyEgg(egg: MinecraftEggLike): boolean {
  const blob = eggBlob(egg);
  const hasBedrock = /\b(bedrock|pocketmine|nukkit|minecraftpe|mcpe)\b/.test(blob);
  const hasJava =
    /\b(java|paper|spigot|purpur|folia|fabric|forge|neoforge|quilt|sponge|bungee|waterfall|velocity|bukkit)\b/.test(
      blob,
    );
  return hasBedrock && !hasJava;
}

function uniqLoaders(loaders: MinecraftLoader[]): MinecraftLoader[] {
  return [...new Set(loaders)];
}

function detectLoaders(egg: MinecraftEggLike): { loaders: MinecraftLoader[]; label: string; kind: MinecraftInstallKind } {
  const blob = eggBlob(egg);

  if (/\bfolia\b/.test(blob)) {
    return { loaders: ['folia'], label: 'Folia', kind: 'plugin' };
  }
  if (/\bpurpur\b/.test(blob)) {
    return { loaders: ['purpur', 'paper', 'spigot', 'bukkit'], label: 'Purpur', kind: 'plugin' };
  }
  if (/\bpaper|leaves|pufferfish\b/.test(blob)) {
    return { loaders: ['paper', 'spigot', 'bukkit'], label: 'Paper', kind: 'plugin' };
  }
  if (/\bspigot\b/.test(blob)) {
    return { loaders: ['spigot', 'bukkit'], label: 'Spigot', kind: 'plugin' };
  }
  if (/\bbukkit\b/.test(blob)) {
    return { loaders: ['bukkit', 'spigot'], label: 'Bukkit', kind: 'plugin' };
  }
  if (/\b(magma|mohist|arclight)\b/.test(blob)) {
    // Hybrid jars run both Forge/NeoForge mods and Bukkit plugins — prefer plugins browse + both install dirs.
    return {
      loaders: ['paper', 'spigot', 'bukkit', 'forge', 'neoforge'],
      label: 'Hybrid',
      kind: 'plugin',
    };
  }
  if (/\bneoforge\b/.test(blob)) {
    return { loaders: ['neoforge'], label: 'NeoForge', kind: 'mod' };
  }
  if (/\bquilt\b/.test(blob)) {
    return { loaders: ['quilt', 'fabric'], label: 'Quilt', kind: 'mod' };
  }
  if (/\bfabric\b/.test(blob)) {
    return { loaders: ['fabric'], label: 'Fabric', kind: 'mod' };
  }
  if (/\bforge\b/.test(blob)) {
    return { loaders: ['forge'], label: 'Forge', kind: 'mod' };
  }
  if (/\bsponge\b/.test(blob)) {
    return { loaders: ['sponge'], label: 'Sponge', kind: 'plugin' };
  }
  if (/\bvelocity\b/.test(blob)) {
    return { loaders: ['velocity'], label: 'Velocity', kind: 'plugin' };
  }
  if (/\bwaterfall\b/.test(blob)) {
    return { loaders: ['waterfall', 'bungeecord'], label: 'Waterfall', kind: 'plugin' };
  }
  if (/\bbungee\b/.test(blob)) {
    return { loaders: ['bungeecord', 'waterfall'], label: 'BungeeCord', kind: 'plugin' };
  }
  if (/\b(vanilla|snapshot)\b/.test(blob) && !/\b(paper|spigot|purpur|fabric|forge)\b/.test(blob)) {
    return { loaders: ['datapack'], label: 'Vanilla', kind: 'datapack' };
  }

  // Generic Minecraft / EULA eggs — most hosts run Paper-compatible jars.
  return { loaders: ['paper', 'spigot', 'bukkit', 'purpur'], label: 'Minecraft', kind: 'plugin' };
}

export function resolveMinecraftEggProfile(egg: MinecraftEggLike): MinecraftEggProfile {
  if (isBedrockOnlyEgg(egg)) {
    return {
      isMinecraft: false,
      isBedrock: true,
      loaders: [],
      projectTypes: [],
      platformLabel: 'Bedrock',
      kind: 'plugin',
    };
  }

  if (!isMinecraftEgg(egg)) {
    return {
      isMinecraft: false,
      isBedrock: false,
      loaders: [],
      projectTypes: [],
      platformLabel: 'Unknown',
      kind: 'plugin',
    };
  }

  const detected = detectLoaders(egg);
  const loaders = uniqLoaders(detected.loaders);
  const projectTypes: MinecraftEggProfile['projectTypes'] = [];
  if (detected.kind === 'datapack' || loaders.includes('datapack')) {
    projectTypes.push('datapack');
  }
  if (detected.kind === 'mod' || loaders.some((l) => (MINECRAFT_MOD_LOADERS as readonly string[]).includes(l))) {
    projectTypes.push('mod');
  }
  if (
    detected.kind === 'plugin' ||
    loaders.some((l) => (MINECRAFT_PLUGIN_LOADERS as readonly string[]).includes(l))
  ) {
    // Modrinth indexes many Bukkit/Paper projects as project_type "mod" and/or "plugin".
    projectTypes.push('mod', 'plugin');
  }

  return {
    isMinecraft: true,
    isBedrock: false,
    loaders,
    projectTypes: [...new Set(projectTypes)],
    platformLabel: detected.label,
    kind: detected.kind,
  };
}

/** Parse a Minecraft version like 1.21.4 from egg variables; ignore "latest". */
export function parseMinecraftVersionFromVariables(
  variables: Array<{ eggVariable?: { envVariable?: string | null } | null; variableValue?: string | null }>,
): string | null {
  const byEnv = new Map<string, string>();
  for (const v of variables) {
    const key = v.eggVariable?.envVariable?.toUpperCase();
    const value = (v.variableValue ?? '').trim();
    if (key && value) byEnv.set(key, value);
  }

  for (const env of VERSION_ENV_KEYS) {
    const raw = byEnv.get(env);
    if (!raw) continue;
    const normalized = normalizeMinecraftVersion(raw);
    if (normalized) return normalized;
  }
  return null;
}

export function normalizeMinecraftVersion(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || /^(latest|recommended|snapshot|prompt|none|null)$/i.test(trimmed)) return null;
  // Accept 1.21, 1.21.4, 1.20.1-rc1 → strip build suffixes for Modrinth facets when possible
  const match = trimmed.match(/(\d+\.\d+(?:\.\d+)?)/);
  return match?.[1] ?? null;
}

export function installKindForLoaders(loaders: string[]): MinecraftInstallKind {
  const lower = loaders.map((l) => l.toLowerCase());
  if (lower.includes('datapack') && !lower.some((l) => (MINECRAFT_PLUGIN_LOADERS as readonly string[]).includes(l) || (MINECRAFT_MOD_LOADERS as readonly string[]).includes(l))) {
    return 'datapack';
  }
  if (lower.some((l) => (MINECRAFT_MOD_LOADERS as readonly string[]).includes(l))) {
    return 'mod';
  }
  return 'plugin';
}

export function defaultInstallDirForKind(kind: MinecraftInstallKind, worldName = 'world'): string {
  if (kind === 'mod') return '/mods';
  if (kind === 'datapack') {
    const world = worldName.replace(/[^a-zA-Z0-9._\- ]/g, '').trim() || 'world';
    return `/${world}/datapacks`;
  }
  return '/plugins';
}
