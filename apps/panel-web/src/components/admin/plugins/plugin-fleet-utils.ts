import { Box, Database, Package, Puzzle, Store, type LucideIcon } from 'lucide-react';
import type { AdminPanelPlugin } from '../../../lib/api';

export type PluginFleetFilter = 'all' | 'enabled' | 'disabled';

export type PluginFleetStats = {
  total: number;
  enabled: number;
  disabled: number;
  catalogEntries: number;
};

export function isPluginActive(plugin: AdminPanelPlugin): boolean {
  const settingsEnabled = (plugin.settings as { enabled?: boolean }).enabled !== false;
  return plugin.enabled && settingsEnabled;
}

export function pluginIcon(id: string): LucideIcon {
  if (id === 'fivem-marketplace') return Store;
  if (id === 'minecraft-plugins') return Package;
  if (id === 'database-manager') return Database;
  return Puzzle;
}

export function pluginGameLabel(id: string): string {
  if (id === 'fivem-marketplace') return 'FiveM';
  if (id === 'minecraft-plugins') return 'Minecraft Java';
  if (id === 'database-manager') return 'MySQL';
  return 'Panel';
}

export function pluginAccentTone(id: string): 'fivem' | 'minecraft' | 'neutral' {
  if (id === 'fivem-marketplace') return 'fivem';
  if (id === 'minecraft-plugins') return 'minecraft';
  return 'neutral';
}

export function pluginManagePath(plugin: AdminPanelPlugin): string | null {
  if (!plugin.manifest.adminPath) return null;
  return `/admin/plugins/${plugin.manifest.adminPath}`;
}

export function pluginNavLabel(plugin: AdminPanelPlugin): string | null {
  return plugin.manifest.serverNav?.label ?? null;
}

export function computePluginFleetStats(plugins: AdminPanelPlugin[]): PluginFleetStats {
  let enabled = 0;
  let catalogEntries = 0;
  for (const plugin of plugins) {
    if (isPluginActive(plugin)) enabled++;
    if (plugin.stats?.catalogCount) catalogEntries += plugin.stats.catalogCount;
  }
  return {
    total: plugins.length,
    enabled,
    disabled: plugins.length - enabled,
    catalogEntries,
  };
}

export function matchesPluginFilter(plugin: AdminPanelPlugin, filter: PluginFleetFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'enabled':
      return isPluginActive(plugin);
    case 'disabled':
      return !isPluginActive(plugin);
    default:
      return true;
  }
}

export function matchesPluginSearch(plugin: AdminPanelPlugin, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    plugin.name.toLowerCase().includes(q) ||
    plugin.description.toLowerCase().includes(q) ||
    plugin.id.toLowerCase().includes(q) ||
    pluginGameLabel(plugin.id).toLowerCase().includes(q) ||
    (plugin.manifest.serverNav?.label?.toLowerCase().includes(q) ?? false)
  );
}

export const PLUGIN_ECOSYSTEM = [
  {
    icon: Store,
    title: 'FiveM Marketplace',
    body: 'Curated resources and GitHub installs with automatic server.cfg patching.',
  },
  {
    icon: Package,
    title: 'Minecraft Plugins',
    body: 'Modrinth search and one-click plugin installs for Java servers.',
  },
  {
    icon: Database,
    title: 'Database Manager',
    body: 'Optional in-panel MySQL browser alongside the existing Databases feature.',
  },
  {
    icon: Box,
    title: 'Built-in extensions',
    body: 'First-party plugins ship with Spirit Panel — no separate install step.',
  },
] as const;
