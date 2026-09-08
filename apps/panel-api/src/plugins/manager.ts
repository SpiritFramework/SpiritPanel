import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { getMarketplaceSettings, getMinecraftPluginsSettings } from '../lib/panel-settings.js';
import {
  BUILTIN_PLUGIN_MANIFESTS,
  defaultSettingsForPlugin,
  manifestFor,
  parseDatabaseManagerSettings,
  parseFivemMarketplaceSettings,
  parseMinecraftPluginsSettings,
  toPanelPluginRecord,
} from './manifests.js';
import { PANEL_PLUGIN_IDS, type PanelPluginRecord } from '@spirit/plugin-sdk';

let cache: PanelPluginRecord[] | null = null;
let cacheAt = 0;
const CACHE_MS = 5_000;

function invalidateCache() {
  cache = null;
  cacheAt = 0;
}

/** Ensure built-in plugin rows exist; migrate legacy panel_settings on first run. */
export async function ensureBuiltinPlugins() {
  const [legacyMarketplace, legacyMinecraft] = await Promise.all([
    getMarketplaceSettings(),
    getMinecraftPluginsSettings(),
  ]);

  for (const manifest of BUILTIN_PLUGIN_MANIFESTS) {
    const existing = await prisma.panelPlugin.findUnique({ where: { id: manifest.id } });
    let settings = defaultSettingsForPlugin(manifest.id);

    if (!existing) {
      if (manifest.id === PANEL_PLUGIN_IDS.FIVEM_MARKETPLACE) {
        settings = {
          enabled: legacyMarketplace.enabled,
          allowGithubInstalls: legacyMarketplace.allowGithubInstalls,
          allowCatalogInstalls: true,
        };
      }
      if (manifest.id === PANEL_PLUGIN_IDS.MINECRAFT_PLUGINS) {
        settings = {
          enabled: legacyMinecraft.enabled,
          allowModrinthInstalls: legacyMinecraft.allowModrinthInstalls,
        };
      }
    }

    await prisma.panelPlugin.upsert({
      where: { id: manifest.id },
      create: {
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        version: manifest.version,
        author: manifest.author ?? null,
        builtIn: true,
        enabled: manifest.id === PANEL_PLUGIN_IDS.FIVEM_MARKETPLACE
          ? legacyMarketplace.enabled
          : manifest.id === PANEL_PLUGIN_IDS.MINECRAFT_PLUGINS
            ? legacyMinecraft.enabled
            : true,
        settings: settings as Prisma.InputJsonValue,
      },
      update: {
        name: manifest.name,
        description: manifest.description,
        version: manifest.version,
        author: manifest.author ?? null,
      },
    });

    // One-time unlock of row edits (admins can still turn Allow data edits off afterward).
    if (manifest.id === PANEL_PLUGIN_IDS.DATABASE_MANAGER) {
      const row = await prisma.panelPlugin.findUnique({ where: { id: manifest.id } });
      if (row) {
        const raw =
          row.settings && typeof row.settings === 'object' && !Array.isArray(row.settings)
            ? (row.settings as Record<string, unknown>)
            : {};
        if (raw._allowDataEditsUnlocked !== true) {
          const current = parseDatabaseManagerSettings(raw);
          await prisma.panelPlugin.update({
            where: { id: manifest.id },
            data: {
              settings: {
                ...current,
                allowDataEdits: true,
                _allowDataEditsUnlocked: true,
              } as Prisma.InputJsonValue,
            },
          });
        }
      }
    }
  }
  invalidateCache();
}

export async function listPanelPlugins(force = false): Promise<PanelPluginRecord[]> {
  if (!force && cache && Date.now() - cacheAt < CACHE_MS) return cache;
  await ensureBuiltinPlugins();
  const rows = await prisma.panelPlugin.findMany({ orderBy: { name: 'asc' } });
  cache = rows.map((r) => toPanelPluginRecord(r)).filter((p): p is PanelPluginRecord => p !== null);
  cacheAt = Date.now();
  return cache;
}

export async function getPanelPlugin(id: string): Promise<PanelPluginRecord | null> {
  const all = await listPanelPlugins();
  return all.find((p) => p.id === id) ?? null;
}

export async function isPluginEnabled(id: string): Promise<boolean> {
  const plugin = await getPanelPlugin(id);
  if (!plugin?.enabled) return false;
  const settings = plugin.settings as { enabled?: boolean };
  return settings.enabled !== false;
}

export async function updatePanelPlugin(
  id: string,
  patch: { enabled?: boolean; settings?: Record<string, unknown> },
): Promise<PanelPluginRecord> {
  const manifest = manifestFor(id);
  if (!manifest) throw Object.assign(new Error('Unknown plugin'), { statusCode: 404 });

  const existing = await prisma.panelPlugin.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Plugin not found'), { statusCode: 404 });

  const nextSettings = patch.settings
    ? { ...(existing.settings as Record<string, unknown>), ...patch.settings }
    : (existing.settings as Record<string, unknown>);

  const row = await prisma.panelPlugin.update({
    where: { id },
    data: {
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      settings: nextSettings as Prisma.InputJsonValue,
    },
  });
  invalidateCache();
  const record = toPanelPluginRecord(row);
  if (!record) throw new Error('Failed to load plugin');
  return record;
}

export async function getFivemMarketplacePluginSettings() {
  const plugin = await getPanelPlugin(PANEL_PLUGIN_IDS.FIVEM_MARKETPLACE);
  if (!plugin) return parseFivemMarketplaceSettings(null);
  return parseFivemMarketplaceSettings(plugin.settings);
}

export async function isFivemMarketplaceActive(): Promise<boolean> {
  const plugin = await getPanelPlugin(PANEL_PLUGIN_IDS.FIVEM_MARKETPLACE);
  if (!plugin?.enabled) return false;
  const s = parseFivemMarketplaceSettings(plugin.settings);
  return s.enabled;
}

export async function isFivemGithubInstallsAllowed(): Promise<boolean> {
  if (!(await isFivemMarketplaceActive())) return false;
  const s = await getFivemMarketplacePluginSettings();
  return s.allowGithubInstalls;
}

export async function isFivemCatalogInstallsAllowed(): Promise<boolean> {
  if (!(await isFivemMarketplaceActive())) return false;
  const s = await getFivemMarketplacePluginSettings();
  return s.allowCatalogInstalls;
}

export async function getMinecraftPluginsPluginSettings() {
  const plugin = await getPanelPlugin(PANEL_PLUGIN_IDS.MINECRAFT_PLUGINS);
  if (!plugin) return parseMinecraftPluginsSettings(null);
  return parseMinecraftPluginsSettings(plugin.settings);
}

/** Single source of truth: panel_plugins row (not legacy panel_settings). */
export async function isMinecraftPluginsActive(): Promise<boolean> {
  const plugin = await getPanelPlugin(PANEL_PLUGIN_IDS.MINECRAFT_PLUGINS);
  if (!plugin?.enabled) return false;
  const s = parseMinecraftPluginsSettings(plugin.settings);
  return s.enabled;
}

export async function isMinecraftModrinthInstallsAllowed(): Promise<boolean> {
  if (!(await isMinecraftPluginsActive())) return false;
  const s = await getMinecraftPluginsPluginSettings();
  return s.allowModrinthInstalls;
}

export async function getDatabaseManagerPluginSettings() {
  const plugin = await getPanelPlugin(PANEL_PLUGIN_IDS.DATABASE_MANAGER);
  if (!plugin) return parseDatabaseManagerSettings(null);
  return parseDatabaseManagerSettings(plugin.settings);
}

export async function isDatabaseManagerActive(): Promise<boolean> {
  const plugin = await getPanelPlugin(PANEL_PLUGIN_IDS.DATABASE_MANAGER);
  if (!plugin?.enabled) return false;
  const s = parseDatabaseManagerSettings(plugin.settings);
  return s.enabled;
}

export async function getDatabaseManagerCapabilities() {
  const s = await getDatabaseManagerPluginSettings();
  return {
    allowSqlConsole: s.allowSqlConsole,
    allowDataEdits: s.allowDataEdits,
  };
}

export { invalidateCache as invalidatePluginCache };
