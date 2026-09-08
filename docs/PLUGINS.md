# Panel plugins

Spirit Panel ships **built-in plugins** — optional features that admins enable and configure from **Admin → Plugins**.

| Plugin | Purpose | Admin path |
|--------|---------|------------|
| **FiveM Marketplace** | Curated resource catalog and GitHub installs for FiveM servers | `/admin/plugins/fivem-marketplace` |
| **Minecraft Plugins** | Modrinth plugin and mod installs for Java Minecraft servers | `/admin/plugins/minecraft-plugins` |
| **Database Manager** | Built-in MySQL browser for server databases | `/admin/plugins/database-manager` |

Manifests are declared in `apps/panel-api/src/plugins/manifests.ts`; enable state and settings live in the `panel_plugins` table.

## Server navigation

A plugin manifest can contribute a tab to the server sidebar via `serverNav`. The tab only appears when the plugin is enabled **and** the server's egg advertises a matching feature — `fivem` for the Marketplace, `minecraft` for Plugins — so a Minecraft server never shows FiveM tooling and vice versa. `accessKey` maps the tab to a subuser permission (both currently use `canReadFiles`).

## FiveM Marketplace (v2)

The FiveM marketplace is a self-contained plugin:

| Layer | Location |
|-------|----------|
| **Backend** | `apps/panel-api/src/plugins/fivem-marketplace/` — access, service, routes |
| **Client UI** | `apps/panel-web/src/features/fivem-marketplace/` — ds-* design system |
| **Admin UI** | `apps/panel-web/src/features/fivem-marketplace/admin/` |

### Client routes

| Path | Page |
|------|------|
| `/servers/:id/marketplace` | Hub — catalog, GitHub, installed tabs |
| `/servers/:id/marketplace/catalog/:slug` | Host catalog resource detail |
| `/servers/:id/marketplace/script/:owner/:repo` | GitHub script detail |
| `/servers/:id/marketplace/script/:owner/:repo/install` | GitHub install wizard |
| `/servers/:id/marketplace/github/browse` | Category picker |
| `/servers/:id/marketplace/github/browse/:category` | Category results (paginated) |
| `/servers/:id/marketplace/github/search?q=` | Full search results (paginated) |

### Admin experience

- **Plugins hub:** `/admin/plugins`
- **FiveM Marketplace:** `/admin/plugins/fivem-marketplace` — settings + catalog CRUD with modal editor

### Adding catalog resources

1. Admin → Plugins → FiveM Marketplace → Manage
2. **Add resource** — slug, GitHub repo, install path, dependencies
3. Users install from **Host catalog** on their server

Default entries (ox_lib, oxmysql, etc.) seed when the catalog table is empty.

## Minecraft Plugins

Modrinth browser and installer for Java Minecraft servers.

| Layer | Location |
|-------|----------|
| **Backend** | `apps/panel-api/src/routes/minecraft-plugins.ts` plus `services/modrinth.ts`, `services/minecraft-plugin-scan.ts`, `services/minecraft-plugin-installer.ts` |
| **Client UI** | `apps/panel-web/src/pages/client/PluginsRoutes.tsx`, `ServerPlugins.tsx`, `MinecraftPluginProject.tsx` |
| **Admin UI** | `apps/panel-web/src/components/admin/plugins/minecraft/MinecraftPluginsView.tsx` |

Settings: `enabled`, `allowModrinthInstalls`. Installed plugins are discovered by scanning the server's plugin directory, so files added over SFTP are still recognised.

## Database Manager

Built-in MySQL browser that sits alongside the existing Databases feature (create / credentials / delete unchanged).

| Layer | Location |
|-------|----------|
| **Backend** | `apps/panel-api/src/plugins/database-manager/` |
| **Client UI** | Databases page → **Open in browser** modal |
| **Admin UI** | `/admin/plugins/database-manager` |

Connections use each database's own MySQL user, and the driver is opened with `multipleStatements: false`.

### SQL policy

Two settings gate what users can run: **Allow SQL console** and **Allow data edits**. The guard (`sql-guard.ts`) classifies each statement as `read`, `write`, `ddl`, or `blocked`, and the rules differ by entry point:

| Entry point | Multi-statement | Comments | DDL | Writes |
|-------------|-----------------|----------|-----|--------|
| **Interactive console** | Blocked | Blocked | Blocked | Require **Allow data edits** |
| **Script import** (upload or paste `.sql`) | Allowed | Allowed | Requires **Allow data edits** | Require **Allow data edits** |

Comments and stacked statements are rejected in the console because they are the usual way to smuggle a second statement past a verb check. The import path parses the script into statements and classifies each one individually, which is why it can safely permit both.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/client/plugins` | Enabled plugins, used to build server navigation |
| GET | `/api/admin/plugins` | All plugins + stats |
| PATCH | `/api/admin/plugins/:id` | Enable/disable + settings |
| GET/POST/PATCH/DELETE | `/api/admin/plugins/fivem-marketplace/catalog` | Catalog CRUD |
| GET | `/api/client/servers/:id/marketplace/catalog` | Client catalog browse |
| POST | `/api/client/servers/:id/marketplace/install` | Catalog one-click install |

Legacy marketplace routes remain unchanged for backward compatibility.

## Plugin SDK

Contract types live in `packages/plugin-sdk`. Built-in plugins register their manifest in `apps/panel-api/src/plugins/manifests.ts`, and each one declares a Zod schema for its settings so stored JSON is validated on read and falls back to defaults when it does not parse.

## Storage and migration

Plugin state lives in the `panel_plugins` table (enable flag + settings JSON), created by a Prisma migration — so `pnpm db:deploy` is required when upgrading from a release that predates it. See [PRODUCTION.md](PRODUCTION.md#updates) for the full update sequence.

On first API start after the migration, built-in plugins are seeded and the legacy `marketplace` / `minecraft_plugins` keys in `panel_settings` are imported. **`panel_plugins` is the runtime source of truth**; the old `panel_settings` keys are still dual-written for older clients, but every enable check goes through the plugin manager.

### Verify after upgrading

1. **Admin → Plugins** lists all three plugins
2. **FiveM Marketplace → Manage** shows the catalog table with default resources
3. On a FiveM server, **Marketplace → Curated** lists catalog entries and one-click install works
4. On a Minecraft server, **Plugins** browses Modrinth
5. On a server with databases, **Open in browser** opens the Database Manager modal
