import { z } from 'zod';
import {
  DEFAULT_DATABASE_MANAGER_SETTINGS,
  DEFAULT_FIVEM_MARKETPLACE_SETTINGS,
  PANEL_PLUGIN_IDS,
  type DatabaseManagerPluginSettings,
  type FivemMarketplacePluginSettings,
  type PluginManifest,
  type PanelPluginRecord,
} from '@spirit/plugin-sdk';

export const fivemMarketplaceSettingsSchema = z.object({
  enabled: z.boolean(),
  allowGithubInstalls: z.boolean(),
  allowCatalogInstalls: z.boolean(),
});

export const minecraftPluginsSettingsSchema = z.object({
  enabled: z.boolean(),
  allowModrinthInstalls: z.boolean(),
});

export const databaseManagerSettingsSchema = z.object({
  enabled: z.boolean(),
  allowSqlConsole: z.boolean(),
  allowDataEdits: z.boolean(),
});

export type MinecraftPluginsPluginSettings = z.infer<typeof minecraftPluginsSettingsSchema>;

export const DEFAULT_MINECRAFT_PLUGINS_PLUGIN_SETTINGS: MinecraftPluginsPluginSettings = {
  enabled: true,
  allowModrinthInstalls: true,
};

export const BUILTIN_PLUGIN_MANIFESTS: PluginManifest[] = [
  {
    id: PANEL_PLUGIN_IDS.FIVEM_MARKETPLACE,
    name: 'FiveM Marketplace',
    description: 'Curated resource catalog and GitHub installs for FiveM servers.',
    version: '1.0.0',
    author: 'SpiritFramework',
    builtIn: true,
    permissions: ['marketplace.install'],
    serverNav: {
      routeSegment: 'marketplace',
      label: 'Marketplace',
      description: 'Scripts, maps & resources',
      icon: 'store',
      accessKey: 'canReadFiles',
      eggFeatures: ['fivem'],
    },
    adminPath: 'fivem-marketplace',
  },
  {
    id: PANEL_PLUGIN_IDS.MINECRAFT_PLUGINS,
    name: 'Minecraft Plugins',
    description: 'Modrinth plugin and mod installs for Java Minecraft servers.',
    version: '1.0.0',
    author: 'SpiritFramework',
    builtIn: true,
    serverNav: {
      routeSegment: 'plugins',
      label: 'Plugins',
      description: 'Minecraft plugins & mods',
      icon: 'package',
      accessKey: 'canReadFiles',
      eggFeatures: ['minecraft'],
    },
    adminPath: 'minecraft-plugins',
  },
  {
    id: PANEL_PLUGIN_IDS.DATABASE_MANAGER,
    name: 'Database Manager',
    description: 'Built-in MySQL browser for server databases (browse tables and optional SQL console).',
    version: '1.0.0',
    author: 'SpiritFramework',
    builtIn: true,
    adminPath: 'database-manager',
  },
];

export function defaultSettingsForPlugin(id: string): Record<string, unknown> {
  if (id === PANEL_PLUGIN_IDS.FIVEM_MARKETPLACE) {
    return { ...DEFAULT_FIVEM_MARKETPLACE_SETTINGS };
  }
  if (id === PANEL_PLUGIN_IDS.MINECRAFT_PLUGINS) {
    return { ...DEFAULT_MINECRAFT_PLUGINS_PLUGIN_SETTINGS };
  }
  if (id === PANEL_PLUGIN_IDS.DATABASE_MANAGER) {
    return { ...DEFAULT_DATABASE_MANAGER_SETTINGS };
  }
  return { enabled: true };
}

export function parseFivemMarketplaceSettings(raw: unknown): FivemMarketplacePluginSettings {
  const parsed = fivemMarketplaceSettingsSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { ...DEFAULT_FIVEM_MARKETPLACE_SETTINGS };
}

export function parseMinecraftPluginsSettings(raw: unknown): MinecraftPluginsPluginSettings {
  const parsed = minecraftPluginsSettingsSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { ...DEFAULT_MINECRAFT_PLUGINS_PLUGIN_SETTINGS };
}

export function parseDatabaseManagerSettings(raw: unknown): DatabaseManagerPluginSettings {
  const parsed = databaseManagerSettingsSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { ...DEFAULT_DATABASE_MANAGER_SETTINGS };
}

export function manifestFor(id: string): PluginManifest | undefined {
  return BUILTIN_PLUGIN_MANIFESTS.find((m) => m.id === id);
}

export function toPanelPluginRecord(row: {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string | null;
  builtIn: boolean;
  enabled: boolean;
  settings: unknown;
}): PanelPluginRecord | null {
  const manifest = manifestFor(row.id);
  if (!manifest) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    version: row.version,
    author: row.author,
    builtIn: row.builtIn,
    enabled: row.enabled,
    settings: (row.settings && typeof row.settings === 'object' ? row.settings : {}) as Record<string, unknown>,
    manifest,
  };
}
