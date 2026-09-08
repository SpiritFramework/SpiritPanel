import type { z } from 'zod';

/** Built-in panel plugin identifiers */
export const PANEL_PLUGIN_IDS = {
  FIVEM_MARKETPLACE: 'fivem-marketplace',
  MINECRAFT_PLUGINS: 'minecraft-plugins',
  DATABASE_MANAGER: 'database-manager',
} as const;

export type PanelPluginId = (typeof PANEL_PLUGIN_IDS)[keyof typeof PANEL_PLUGIN_IDS] | string;

export interface PluginServerNavItem {
  routeSegment: string;
  label: string;
  description?: string;
  icon: string;
  /** Permission flag on ServerAccessFlags — e.g. canReadFiles */
  accessKey: string;
  /** Egg feature tags — server must match at least one when set */
  eggFeatures?: string[];
}

export interface PluginManifest {
  id: PanelPluginId;
  name: string;
  description: string;
  version: string;
  author?: string;
  builtIn: boolean;
  /** Subuser permission strings this plugin adds */
  permissions?: string[];
  /** Client server sidebar entry when eligible */
  serverNav?: PluginServerNavItem;
  /** Admin sidebar path segment under /admin/plugins/:id */
  adminPath?: string;
}

export interface PanelPluginRecord {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string | null;
  builtIn: boolean;
  enabled: boolean;
  settings: Record<string, unknown>;
  manifest: PluginManifest;
}

export interface FivemMarketplacePluginSettings {
  enabled: boolean;
  allowGithubInstalls: boolean;
  allowCatalogInstalls: boolean;
}

export const DEFAULT_FIVEM_MARKETPLACE_SETTINGS: FivemMarketplacePluginSettings = {
  enabled: true,
  allowGithubInstalls: true,
  allowCatalogInstalls: true,
};

export interface DatabaseManagerPluginSettings {
  enabled: boolean;
  /** Allow free-form SQL console (still restricted by statement class). */
  allowSqlConsole: boolean;
  /** Allow INSERT / UPDATE / DELETE via browse or SQL console. */
  allowDataEdits: boolean;
}

export const DEFAULT_DATABASE_MANAGER_SETTINGS: DatabaseManagerPluginSettings = {
  enabled: true,
  allowSqlConsole: true,
  allowDataEdits: true,
};

export type PluginSettingsSchema<T extends Record<string, unknown>> = z.ZodType<T>;
