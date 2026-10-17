/** Modrinth category chips shown in the Plugins browse UI. */
export type PluginBrowseKind = 'plugin' | 'mod' | 'datapack';

export interface PluginCategoryChip {
  id: string;
  label: string;
}

/** Full Modrinth `mod` category set (also used for plugins / datapacks in search). */
const MODRINTH_CATEGORIES: PluginCategoryChip[] = [
  { id: 'adventure', label: 'Adventure' },
  { id: 'utility', label: 'Utility' },
  { id: 'worldgen', label: 'Worldgen' },
  { id: 'technology', label: 'Technology' },
  { id: 'magic', label: 'Magic' },
  { id: 'decoration', label: 'Decoration' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'game-mechanics', label: 'Game mechanics' },
  { id: 'mobs', label: 'Mobs' },
  { id: 'optimization', label: 'Optimization' },
  { id: 'library', label: 'Libraries' },
  { id: 'economy', label: 'Economy' },
  { id: 'management', label: 'Management' },
  { id: 'social', label: 'Chat & social' },
  { id: 'minigame', label: 'Minigames' },
  { id: 'food', label: 'Food' },
  { id: 'storage', label: 'Storage' },
  { id: 'transportation', label: 'Transport' },
  { id: 'cursed', label: 'Cursed' },
];

const PLUGIN_ORDER = [
  'management',
  'economy',
  'utility',
  'minigame',
  'social',
  'worldgen',
  'library',
  'optimization',
  'technology',
  'adventure',
  'game-mechanics',
  'mobs',
  'magic',
  'decoration',
  'equipment',
  'food',
  'storage',
  'transportation',
  'cursed',
];

const MOD_ORDER = [
  'adventure',
  'technology',
  'magic',
  'worldgen',
  'optimization',
  'decoration',
  'utility',
  'library',
  'equipment',
  'mobs',
  'game-mechanics',
  'food',
  'storage',
  'transportation',
  'economy',
  'management',
  'social',
  'minigame',
  'cursed',
];

const DATAPACK_ORDER = [
  'adventure',
  'worldgen',
  'utility',
  'technology',
  'magic',
  'decoration',
  'equipment',
  'game-mechanics',
  'mobs',
  'optimization',
  'library',
  'food',
  'storage',
  'transportation',
  'economy',
  'social',
  'management',
  'minigame',
  'cursed',
];

function orderCategories(order: string[]): PluginCategoryChip[] {
  const byId = new Map(MODRINTH_CATEGORIES.map((c) => [c.id, c]));
  return order.map((id) => byId.get(id)).filter(Boolean) as PluginCategoryChip[];
}

const LOADER_SET = new Set([
  'bukkit',
  'spigot',
  'paper',
  'purpur',
  'folia',
  'sponge',
  'fabric',
  'quilt',
  'forge',
  'neoforge',
  'bungeecord',
  'waterfall',
  'velocity',
  'liteloader',
  'modloader',
  'rift',
  'datapack',
]);

export function categoriesForKind(kind: string | undefined): PluginCategoryChip[] {
  if (kind === 'mod') return orderCategories(MOD_ORDER);
  if (kind === 'datapack') return orderCategories(DATAPACK_ORDER);
  return orderCategories(PLUGIN_ORDER);
}

export function formatPluginDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatRelativePluginDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 45) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 18) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/** Non-loader display categories for chips. */
export function displayPluginTags(categories: string[], limit = 3): string[] {
  return categories
    .filter((c) => !LOADER_SET.has(c.toLowerCase()))
    .map((c) => c.replace(/-/g, ' '))
    .slice(0, limit);
}

export function titleCaseSlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export const PLUGIN_SORT_OPTIONS = [
  { id: 'downloads', label: 'Most downloads' },
  { id: 'updated', label: 'Recently updated' },
  { id: 'follows', label: 'Most followed' },
  { id: 'newest', label: 'Newest' },
  { id: 'relevance', label: 'Relevance' },
] as const;

export type PluginSortId = (typeof PLUGIN_SORT_OPTIONS)[number]['id'];
