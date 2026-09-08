# Changelog

All notable changes to Spirit Panel are documented here. Version numbers are kept in sync across the monorepo (`package.json` files).

**Format:** `MAJOR.MINOR.FEATURE.PATCH` (four parts, e.g. `1.5.3.0`). Displayed as `v1.5.3.0`.

| Bump | When | Example |
|------|------|---------|
| **PATCH** (4th) | Bug fixes, small polish | `1.3.0.0` → `1.3.0.1` |
| **FEATURE** (3rd) | New features / medium changes | `1.3.0.1` → `1.3.1.0` |
| **MINOR** (2nd) | Larger releases | `1.3.1.0` → `1.4.0.0` |
| **MAJOR** (1st) | Breaking / incompatible changes | `1.4.0.0` → `2.0.0.0` |

Bump only the segment that matches the size of the change; reset trailing segments to `0` when bumping a higher segment.

Format: `## [MAJOR.MINOR.FEATURE.PATCH] - YYYY-MM-DD`

> **Note on numbering.** Entries below `1.3.0.0` and above `1.2.x` use `1.5.x` build numbers. Those were **internal builds that were never published** — the working version raced ahead of the public release tags while development happened outside GitHub. Numbering was reconciled at the **V1.3.0.0** release, which ships all of that work. Read the `1.5.x` entries as the detailed development log for V1.3.0.0; they are kept intact rather than renumbered so the history stays honest.

## [1.3.0.0] - 2026-09-08

First public release since **V1.2.0.0**. Consolidates every internal build in between — the `1.5.x` entries below are the per-change detail for this release.

### Added

- **Plugin system:** Built-in plugins with per-plugin enable state and settings, managed from **Admin → Plugins**, backed by a new `panel_plugins` table. Ships **FiveM Marketplace** (curated catalog + GitHub installs), **Minecraft Plugins** (Modrinth browser and installer), and **Database Manager** (MySQL browser with a gated SQL console). See `docs/PLUGINS.md`.
- **Installable app (PWA):** The panel installs as a standalone app on desktop, Android, and iOS, with a branding-aware manifest, generated app icons, and a service worker that keeps the shell loading offline without ever caching live server state.
- **Branding Studio:** Admin → Settings → Branding rebuilt as a studio with Look / Colors / Identity / Layout / Assets sections and a live Login · Client · Admin · Server preview, plus expanded theme, atmosphere, and layout options.
- **Discord account linking**, location flags and country codes, node health monitoring and resync, and local backup storage adapters.

### Improved

- Server console, My Servers, and analytics redesigned; broad mobile polish across client server tabs, marketplace, and the database manager.

### Documentation

- `docs/` brought fully up to date, `README.md` moved to the repo root, and `docs/CHANGELOG.md` and `docs/PLUGINS.md` published for the first time.

### Upgrading from V1.2.0.0

```bash
pnpm install
pnpm build
cd apps/panel-api && pnpm exec prisma migrate deploy
sudo systemctl restart spirit-panel-api
```

This release adds several database migrations, so `prisma migrate deploy` is **required**. Re-copy `deploy/nginx/spirit-panel.conf` as well: the PWA needs new cache-control and CSP directives. See [PRODUCTION.md](PRODUCTION.md#updates).

## [1.5.10.4] - 2026-09-08

### Documentation

Full pass over `docs/` to catch up with recent releases.

- **Installable app is now documented:** `PRODUCTION.md` covers the manifest endpoint, HTTPS and service-worker-scope requirements, and why a rebranded icon does not update an already-installed app. `LOCAL.md` explains that the worker is disabled in dev and how to exercise it via `pnpm build` + preview.
- **nginx caching rules are documented, with the inheritance trap called out** in both `PRODUCTION.md` and `SECURITY.md`: a `location` that sets `Cache-Control` stops inheriting server-level `add_header`, so the `= /index.html` block must repeat the security headers or CSP is silently lost site-wide.
- **`SECURITY.md`** gains a service worker section (what is and is not cached, per-release cache versioning), the app icon upload policy, `manifest-src`/`worker-src` in the CSP row, and the `audit:security` script.
- **`PLUGINS.md`** corrected: it claimed multi-statement SQL and DDL were blocked outright, which stopped being true when script import landed in 1.5.3.0. The console and import paths now have their actual, differing rules. Adds the missing Minecraft Plugins section and how `serverNav` gates tabs by egg feature.
- **Broken cross-references fixed:** `SECURITY.md` pointed at `docs/PRODUCTION.md` and `LICENSE` from inside `docs/`, `PRODUCTION.md` pointed at `../SECURITY.md`, and 21 source links in the container-state analysis were root-relative. `README.md` listed `SECURITY.md` at the repo root and omitted `packages/plugin-sdk`.
- Both `*_ANALYSIS.md` files are labelled as point-in-time snapshots, noting that the Wings tree has moved to 1.3.7.10 and that line numbers have drifted.
- Test and type-check commands are documented for the first time.

## [1.5.10.3] - 2026-09-07

### Fixed

- **Uploaded app icons could be cropped on Android home screens:** any branded app icon was declared `purpose: "any maskable"`, which permits a circular crop, but only icons built with *From logo* / *From favicon* were padded to survive it. Direct uploads now pass through the same padding step, so the stored icon is always crop-safe.
- Uploaded app icons are normalised to 512×512, which scales cleanly to the 256/48/32/16 sizes Windows derives for desktop shortcuts. Odd source sizes previously produced a slightly soft icon.

### Changed

- App icon uploads accept JPEG and WebP in addition to PNG, and no longer need to be square — the source is fitted whole and centred on the accent gradient.

## [1.5.10.2] - 2026-09-07

### Fixed

- **Default favicon flashed before the branded one on every page load:** `index.html` is static, so it pointed at the bundled icon and only swapped once branding had been fetched. New `GET /api/auth/branding/favicon` and `/branding/app-icon` endpoints resolve the branded asset server-side, so the correct icon is the only one painted.
- `apple-touch-icon` now resolves through the same endpoint, so iOS gets the branded icon without waiting for JavaScript.

## [1.5.10.1] - 2026-09-07

### Fixed

- **Installed app showed the default icon instead of your branding:** the manifest listed the bundled 512×512 icons alongside the branded one, so two entries competed at the same size and browsers generally picked the later bundled entry. A branded icon is now returned on its own.
- **iOS home-screen icon ignored branding:** iOS reads `apple-touch-icon` rather than the manifest when adding to the home screen, and that link was hardcoded to the bundled file. It now tracks your app icon.
- App shortcut ("My Servers") uses the branded icon too.

## [1.5.10.0] - 2026-09-07

### Added

- **App icon from your branding:** **Branding Studio → Assets** gains an **App icon** control. *From logo* / *From favicon* renders a 512×512 square icon in the browser — your artwork is fitted whole (never cropped) and centred on the accent gradient, inside Android's circular-crop safe zone so one file covers both plain and maskable use. You can also upload a square PNG directly, or reset to the bundled default.
- Installed apps and home-screen shortcuts now use that icon instead of the default Spirit mark.

### Changed

- Branding asset URLs carry a `?v=` cache-busting query, so replacing a logo, favicon, or app icon no longer serves the previously cached image.
- The manifest still accepts a large square PNG favicon as the app icon for deploys that never generated one.

### Fixed

- **Branding save no longer clears the app icon:** `appIconUrl` now round-trips through the settings form, which otherwise would have blanked it on the next save.

## [1.5.9.0] - 2026-09-07

### Added

- **Installable app (PWA):** The panel can now be installed as a standalone app on desktop, Android, and iOS. An **Install app** entry appears in the client and admin sidebar footers (iOS shows Share → Add to Home Screen instructions, since it has no install prompt API).
- **Branding-aware app manifest:** `GET /api/auth/branding/manifest.webmanifest` builds the manifest from Branding Studio settings, so an installed app uses the deploy's own name, tagline, and theme colours instead of Spirit defaults. A custom favicon is promoted to the app icon when it is a square PNG of 192px or more; otherwise the bundled icons are used.
- **Default icon set:** Bundled PWA icons (192, 512, 512-maskable, Apple touch, 32px favicon), regenerated with `pnpm --filter @spirit/panel-web icons`. This also gives the panel a real favicon for the first time.
- **Service worker:** Keeps the app shell loading on a flaky connection and adds an offline fallback page. API, FeatherWings, and health traffic are never cached, so live server state is always fresh.

### Fixed

- **Favicon fallback:** Deploys without a branding favicon pointed at a non-existent `/favicon.ico`; they now fall back to the bundled icon.
- **Theme colour:** Browser and OS chrome now track the active theme preset instead of staying on the default dark value.

### Changed

- **nginx:** `sw.js` and `index.html` are served `no-cache` so releases roll out promptly; `/assets/` and `/icons/` get long-lived caching. CSP gains `manifest-src` and `worker-src`.

## [1.5.8.0] - 2026-09-07

### Improved

- **Mobile polish (client):** Server chrome gets a compact back link on every phone tab; console recovers back + icon power controls; denser mobile tabs; My Servers filter pills scroll horizontally; Analytics header drops duplicate identity on small screens; marketplace tabs and DB manager modal respect safe-area / `100dvh`; tables scroll horizontally on touch.

## [1.5.7.0] - 2026-09-07

### Improved

- **FiveM Marketplace cleanup:** Slimmer hub header (logo + title + layout path), compact pill tabs with counts, flattened GitHub search/paste bar (no nested hero), denser Installed list, and catalog category chips aligned with shared filter pills.

## [1.5.6.2] - 2026-09-07

### Improved

- **Analytics Allocation:** Side panel limits use icon rows for CPU / Memory / Disk (matching chart tones) instead of a plain key-value list.

## [1.5.6.1] - 2026-09-07

### Fixed

- **Server analytics charts:** Network throughput sits beside Disk footprint in the same 2×2 grid instead of a full-width row.

## [1.5.6.0] - 2026-09-07

### Improved

- **My Servers redesign:** Unified fleet header (greeting, brand mark, live stats, filters, search, and view toggle in one surface). Branding hooks preserved — hero stripe, logo/panel name, tagline, accent tokens, default grid/list view, and all server card layout styles.

## [1.5.5.4] - 2026-09-07

### Improved

- **Ping from your location:** Overview Ping now estimates latency from the user’s browser to the server’s node (not panel→game-port TCP). Label stays Ping; console Net traffic metrics are unchanged.

## [1.5.5.3] - 2026-09-07

### Improved

- **Ping metric:** Overview bar label renamed from Port → Ping. Console live metrics replace Net with Ping (same TCP latency as the overview bar).

## [1.5.5.2] - 2026-09-07

### Fixed

- **Console Net metric:** Net pill now uses the same layout and size as CPU / RAM / Disk (icon, label, bar, value).

## [1.5.5.1] - 2026-09-07

### Fixed

- **Console offline metrics:** Removed the awkward “Offline / Start server for live usage” metrics pill from the toolbar. Status stays on the Offline pill; guidance lives in the empty console area instead.

## [1.5.5.0] - 2026-09-07

### Improved

- **Server console redesign:** Slim status toolbar with compact live metrics, quieter log lines (timestamps on hover, no line numbers), and a theme-aware command dock. Log viewport stays the focus; power controls remain in the server sidebar.

## [1.5.4.2] - 2026-09-07

### Added

- **More Atmosphere options:** Login and panel backdrops now include Horizon, Dawn, Ember, Fog, Circuit, Void (login) / Halo (panel), plus a Cinematic login ambient level.

### Improved

- **Existing atmospheres:** Richer Gradient, Aurora, Stars, and Mesh treatments with clearer picker descriptions.

## [1.5.4.1] - 2026-09-07

### Added

- **More Layout tab selections:** New server card layouts (Poster, Split, Outline, Tile), sidebar styles (Admin Icons/Boxed, Client Pills/Underline, Server Icons/Stacked), Spacious density, and Loose pills admin tabs — all wired through branding settings and live preview.

## [1.5.4.0] - 2026-09-07

### Added

- **Branding studio:** Admin → Settings → Branding is redesigned as a studio with Look / Colors / Identity / Layout / Assets sections and a live Login · Client · Admin · Server preview (scoped so drafts do not rewrite the whole admin chrome while editing). Theme cards support surfaces-only or surfaces + accents.

### Fixed

- **Admin settings branding defaults:** `GET /admin/settings` merges branding and general with defaults so older stored rows expose new appearance keys.

## [1.5.3.0] - 2026-09-07

### Changed

- **Versioning:** Switched to four-part versions (`MAJOR.MINOR.FEATURE.PATCH`). `1.5.30` is now `1.5.3.0`; future bumps follow change size (patch → feature → minor → major).

### Added

- **Database Manager SQL upload:** Users can upload or paste `.sql` scripts (multi-statement import, including CREATE/INSERT when edits are allowed). Polished NULL checkboxes, upload dropzone, and SQL tab controls.

## [1.5.29] - 2026-09-04

### Added

- **Database Manager row editing:** Server users can insert, edit, and delete table rows in the built-in browser (tables with a primary key). Data edits are enabled by default; subusers still need the Edit database data permission.
## [1.5.28] - 2026-09-04

### Added

- **Subuser permission `database.update` (Edit database data):** Gates INSERT/UPDATE/DELETE in the Database Manager. Browse still needs View databases; panel writes still need the plugin Allow data edits setting.
## [1.5.27] - 2026-09-04

### Improved

- **Database Manager:** Richer browser UI (schema search, typed cells, sticky row numbers, page size, refresh) plus Ctrl/Cmd+Enter SQL, quick Query from table, and clearer read-only/write mode chrome.
## [1.5.26] - 2026-09-04

### Added

- **Database Manager plugin:** Built-in MySQL browser under Admin → Plugins. Existing Databases create/list/delete stays the same; when the plugin is enabled, owners get **Open in browser** (table browse + optional SQL console). Connections use the database's own credentials; DDL and multi-statements are blocked.

## [1.5.25] - 2026-09-04

### Fixed

- **Ticket Details / Controls sidebar:** Stopped flex shrinking from clipping Controls (Assignee was cut off). Wider sidebar, label/value detail rows, and chip pickers for status/priority instead of cramped dropdowns.
## [1.5.24] - 2026-09-04

### Fixed

- **Ticket detail sidebar:** Wider details/controls column, stacked detail rows, and roomier padding so Ticket details and Controls are no longer squished.
## [1.5.23] - 2026-09-04

### Improved

- **Admin support / tickets:** Staff inbox redesign aligned with client support — clickable queue stats, needs-reply + urgent callouts, denser customer rows, and detail controls with quick status + assign/unassign.
## [1.5.22] - 2026-09-04

### Improved

- **Client support / tickets:** Redesigned inbox (awaiting-you callout, unified list panel, clearer filters) and create-ticket form sections; ticket detail header/sidebar polish for clients.
## [1.5.21] - 2026-09-03

### Improved

- **Mobile UI polish:** Larger tap targets, readable type floors (≥ 12px body / 11px labels), looser spacing on server list/cards/shell, always-visible file grid actions on touch, and scrollable overview metrics without wrapping.

## [1.5.20] - 2026-09-03

### Fixed

- **Mobile console:** Give the terminal most of the phone screen — hide the tall server identity + overview bar on console, collapse the console chrome to status + actions, drop keyboard hints / CPU metrics strip, and edge the log flush to the viewport.

## [1.5.19] - 2026-09-03

### Fixed

- **Mobile server view:** Desktop server sidebar no longer stays visible on phones (CSS `display: flex` was overriding Tailwind `hidden`), which had been taking roughly half the screen. Phones use the header + horizontal tabs; overview metrics use a compact strip below `md`.

## [1.5.18] - 2026-09-03

### Security

- **Discord link / change** now requires current password, and the 2FA code when two-factor is enabled, before starting Discord OAuth. Linking without that short-lived intent token is rejected.

## [1.5.17] - 2026-09-03

### Added

- **Discord login:** Users can link Discord from Profile → Security after a normal sign-in, then use **Continue with Discord** or their password next time. 2FA still applies. Discord IDs are unique (one Discord account per panel user). No Discord-only signup.
- Admin **Settings → Security** Discord app (client ID, secret, copyable redirect URL). Login button only appears when Discord login is enabled and configured.
- Admin user **Identifiers** show Discord linked/not linked, `@username`, and Discord ID.

## [1.5.16] - 2026-09-02

### Fixed

- Admin server console/manage build: `refresh` callbacks now match `StaticServerProvider`'s return type after the 1.5.14 server context change.

## [1.5.15] - 2026-09-02

### Fixed

- **Server port latency:** The console metric now shows TCP connect time from the panel API to your server port (typically ~5–40 ms on the same host node), instead of the full browser→panel HTTP round-trip that caused wild 24–300 ms swings depending on where you were browsing from.
- Port latency uses three quick TCP probes (minimum sample) plus light UI smoothing between refreshes.

## [1.5.14] - 2026-09-02

### Fixed

- **Wings restart console desync:** Server console no longer stays stuck on Offline after FeatherWings restarts — polls the API every 5s while disconnected or the node is unreachable, and applies live container state from refreshes without requiring a full page reload.
- **Start after Wings restart:** Power actions refresh live server state from Wings before sending Start; stale post-reset install flags no longer block Start when the container is already running or installing on the daemon.
- **API:** Client `GET /servers/:id` retries a Wings poll when the node is online but state is still offline (common right after daemon boot). Post-reset container resync now runs synchronously (up to 8s). Node health worker interval reduced to 15s.

## [1.5.13] - 2026-09-02

### Fixed

- Login and registration now show the API's actual error text (e.g. **Invalid credentials**, **Please complete the security check.**, **Too many attempts**) instead of always saying "Your session has expired."
- Safe server messages pass through for 403 and other client errors (wrong password, suspended account, validation messages); internal/stack traces are still hidden.
- Session-expired handling no longer fires on failed login/register attempts — only on authenticated API calls.

## [1.5.12] - 2026-09-02

### Added

- **Wings/server reliability:** crash inference when FeatherWings reports running/starting → offline (panel stores `crashed` for badges and activity).
- Node health worker (60s): when a node comes back online, automatically re-polls all servers on that node from Wings.
- Post-`POST /servers/reset` node-scoped container resync so states match Wings after daemon boot.
- `nodeReachable` / `nodeOnline` on client and admin server payloads; unreachable-node banners on server list, server shell, and admin server detail.
- `server:crashed` activity metadata (exit code, OOM) in the server activity feed; clearer crash/OOM lines in the console.

### Fixed

- WebSocket disconnect no longer forces runtime to Offline; reconnect refreshes server state from the API on auth success.
- Reinstall clears container status cache before setting installing.
- Install completion webhook clears container cache.
- Client and admin server lists poll Wings live every third refresh cycle (~45s) instead of cache-only polls.

## [1.5.11] - 2026-09-02

### Fixed

- After FeatherWings restart: `POST /servers/reset` now clears stuck `installing` / `restoring_backup` flags (matches Wings boot contract) instead of leaving Start blocked while showing Offline.
- Offline / stopped / crashed status updates clear stale install flags; live container polls persist those clears before the API responds.
- Start treats already-running Wings containers as success and recovers from stale install flags when Wings is not actually installing.
- Admin server detail reconciles status/installStatus with live container state; status UI prefers live Running over stale Installing (no dual Running+Installing badges).

## [1.5.10] - 2026-09-02

### Fixed

- Minecraft Plugins enablement now uses `panel_plugins` (same as FiveM) instead of legacy `panel_settings`, so Admin → Plugins toggles match runtime gates.
- Legacy `PUT /admin/settings` marketplace / minecraft_plugins keys now sync into `panel_plugins` as well.

### Changed

- Removed unused legacy `ActivityFeed` / `ActivityTimeline` components after the Admin Activity redesign; shared `ActivityPageResult` lives in `lib/activity.ts`.

## [1.5.9] - 2026-09-02

### Changed

- Removed category chip filters from Admin Activity feed (scope tabs handle filtering).

## [1.5.8] - 2026-09-02

### Changed

- Redesigned Admin **Activity** page: fleet-style header with scope tabs, stats row, category chip filters, timeline feed, and sidebar rail with retention and breakdown.

## [1.5.7] - 2026-09-02

### Changed

- Redesigned Profile **Security** tab: overview tiles, two-column bento layout, security score sidebar, and fleet-style cards for password, 2FA, GitHub, and SSH keys.

## [1.5.6] - 2026-09-02

### Added

- Fleet-style **Profile** page redesign: command-bar header with avatar, live stats, and URL-synced tabs (`?tab=profile|security|keys`).
- Profile sidebar rail with account card, avatar preview, and UUID copy.
- Floating save bar on the profile tab (matches admin settings pattern).

### Changed

- Profile and security sections use bento `NodeOverviewSection` cards; security tab keeps 2FA, GitHub, and SSH panels.

## [1.4.6] - 2026-09-02

### Changed

- Removed **Your profile** from the admin sidebar footer (profile remains under client area / command palette).

## [1.4.5] - 2026-09-02

### Changed

- Sidebar attribution tightened to a single line: compact dots, inline version, author truncates if the sidebar is narrow.

## [1.4.4] - 2026-09-02

### Changed

- Sidebar software attribution restyled: compact chip with gradient product name, divider separators, author link, and version pill (same footprint).

## [1.4.3] - 2026-09-02

### Changed

- Client and admin sidebar footers now show the panel version (`Spirit-Panel · SpiritFramework · v1.4.3`).

## [1.4.2] - 2026-09-02

### Changed

- Production versioning now uses **single-digit semver** (`1.4.2` not `1.41.2`). Same build as **1.41.2** — no functional changes.

## [1.41.2] - 2026-09-02

### Changed

- Version bumped to **v1.41.2** for production — same build as 0.41.2 (About tab redesign, settings cleanup, build-time version sync). No functional changes from 0.41.2.

## [0.41.2] - 2026-09-02

### Changed

- Redesigned Panel settings **About** tab: hero banner with version pill and capability tags, feature highlights, credits card with Discord CTA, and a three-column related-admin link grid.

## [0.41.1] - 2026-09-02

### Added

- Dedicated **About** tab in Panel settings (next to System) with Spirit Panel product info, credits, and links to Plugins, Announcements, and Subdomains.
- Build-time version sync: `PANEL_VERSION` is injected from the monorepo `package.json` so the UI always matches the release.

### Changed

- Removed FiveM marketplace and Minecraft plugin toggles from Panel settings — configure those under **Admin → Plugins** instead.
- Removed About section from the settings sidebar rail; About is now its own tab with a full-width layout.

## [0.41.0] - 2026-09-02

### Added

- Fleet-style admin settings page with command-bar header, live status stats, and URL-synced tabs (`?tab=`).
- New settings sections: **Features** (registration, marketplace, plugins, tickets) and **Security** (password policy, Turnstile, Cloudflare DNS) split from the old Access tab.
- Settings sidebar rail with live preview, quick status, and links to Announcements and Subdomains.
- UI for `blockWeakPasswords` and `adminServerSupport` security settings.

### Changed

- Merged **General** (company & support) into the **Branding** tab.
- Renamed **Maintenance** tab to **System**; settings panels now use the shared bento `NodeOverviewSection` layout and floating save bar.

## [0.40.1] - 2026-09-02

### Changed

- Auth hero panel: larger logo with accent glow, tagline badge, headline treatment for login message, capability pills, and numbered feature cards with titles and descriptions.

## [0.40.0] - 2026-09-02

### Added

- Fleet-style login and signup redesign with `ds-auth-*` design system: command-bar form shell, accent rail, segmented sign-in/create tabs, and feature cards on the branded hero panel.
- Shared auth components: `AuthHeader`, `AuthShell`, `AuthTabs`, and redesigned `AuthField` inputs.

### Changed

- Forgot password and reset password pages updated to match the new auth layout.

## [0.39.1] - 2026-09-02

### Changed

- Changelog now uses [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`) with Keep a Changelog sections (`Added`, `Changed`, `Fixed`, `Security`).
- Release numbers now follow semver rules: **MINOR** for new features/redesigns, **PATCH** for fixes and small improvements (historical `0.2.x` patch-only sequence replaced).

## [0.39.0] - 2026-09-02

### Added

- Fleet-style file editor matching the file manager: breadcrumb path, toolbar, status bar, find bar, word wrap, and active line highlight.

## [0.38.2] - 2026-09-01

### Security

- Login lockout shared via Redis when available (multi-instance safe).
- HSTS only in production; improved global error handling.

### Changed

- Faster server list query, backup index, and minor auth/API tweaks.

## [0.38.1] - 2026-09-01

### Fixed

- Server backup downloads work again.

## [0.38.0] - 2026-09-01

### Changed

- Fleet-style `ds-adm-nest-*` nests hub: branded header, stats, template health overview, nests/eggs view tabs via `?view=`, filter pills, and card/table toggle.
- `NestFleetCard` and `EggFleetCard` with egg-themed icons; `useAdminNests` hook with debounced search.
- Nest detail (`ds-nst-*`): URL tabs (`overview | manage | eggs`), overview bento, manage panels, egg list tab.
- Egg detail (`ds-egg-*`): URL tabs (`overview | manage | variables | config`), snapshot, variables editor, config/re-import panels.

## [0.37.0] - 2026-09-01

### Changed

- Fleet-style `ds-asd-*` server detail page with URL tabs (`overview | manage | network | activity`), matching user and node detail architecture.
- Overview tab: quick dock, server snapshot, support tools grid, owner/infrastructure/identifiers panels, and recent activity preview.
- Manage tab: ownership transfer, limits, suspend, power controls, reinstall, and danger zone in modular panels with sticky save bar.
- Activity tab: paginated feed with search/filters and clear-all for full admins via `useServerActivity`.

## [0.36.0] - 2026-09-01

### Changed

- Fleet-style `ds-adm-srv-*` servers dashboard: branded command header, stats strip, fleet health overview with node distribution, and searchable server list with table/card toggle.
- `ServerFleetCard` with egg images, owner, node, resources, and status; modular components and `useAdminServers` hook with 15s polling and live refresh.
- Client-side status filter pills with live counts; node filter and search preserved from API.

## [0.35.0] - 2026-09-01

### Changed

- User detail servers now expose `eggLogoUrl` from the API and render egg images on fleet cards, table rows, shared-access cards, and overview previews.
- Activity tab redesigned with `ds-ud-act-*` fleet layout: toolbar, stats, category overview, paginated feed with search/filters, and server-linked event rows.
- New `GET /admin/users/:id/activity` endpoint and `useUserActivity` hook for cursor-based loading.

## [0.34.0] - 2026-09-01

### Changed

- Fleet-style `ds-ud-srv-*` servers tab on user detail: stats row, fleet health overview, and searchable list with scope/status filters.
- Owned servers support table/card toggle with egg-themed fleet cards; shared subuser access gets dedicated cards.
- Modular components under `components/admin/user-detail/servers/` with `user-server-utils` for filtering and stats.

## [0.33.0] - 2026-09-01

### Changed

- Complete `ds-ud-*` user manage page modeled on node detail: branded header with avatar, inline tab nav, and URL-driven tabs (`?tab=`).
- New **Overview** tab with quick dock, account snapshot, usage meters, server/activity previews, and identifier panel.
- **Manage** tab uses panel-based layout with sticky save bar; **Servers**, **API keys**, and **Activity** tabs redesigned with fleet-style rows and panels.
- `useUserDetail` hook and modular dashboards under `components/admin/user-detail/`.

## [0.32.0] - 2026-09-01

### Changed

- Fleet-style `ds-usr-*` users dashboard: branded command header, stats strip, account health overview, and searchable member list with table/card toggle.
- Modular components (`UsersHeader`, `UsersFleetStats`, `UsersFleetOverview`, `UsersListPanel`, `UserFleetCard`) with `useAdminUsers` hook and `user-fleet-utils`.
- Status filter pills (all, active, suspended, admins, staff, users, with servers) with live counts; preserves create user modal and existing table/detail flows.

## [0.31.1] - 2026-09-01

### Changed

- Replaced per-page accent palettes (indigo, cyan, violet, sky, amber, slate, fuchsia) with panel branding tokens (`--accent`, `--accent-hover`, `--accent-muted`) across all `ds-srv-*` server dashboards and the console shell.
- Activity filters, category chips, and event row accents now use branding (semantic green/amber kept for power/files/marketplace).
- Analytics CPU chart and info notices use `--accent`; console connecting/info state uses branded header accents.

## [0.31.0] - 2026-09-01

### Changed

- Fleet-style `ds-srv-sub-*` subusers dashboard: command header, stats row, invite panel, searchable member list with inline permission editor.
- Modular components (`SubusersHeader`, `SubusersStatsRow`, `SubusersInvitePanel`, `SubusersListPanel`, `SubuserRow`, `SubuserPermissionGrid`) with `useServerSubusers` hook and `subuser-utils`.
- Preserves invite by email, permission groups, inline edit/save, remove with confirm, and `canManageSubusers` route gating.

## [0.30.0] - 2026-09-01

### Changed

- Fleet-style `ds-srv-set-*` settings dashboard: command header with save/reset, resource stats row, general + overview panels, and reinstall section.
- Modular components (`SettingsHeader`, `SettingsStatsRow`, `SettingsGeneralPanel`, `SettingsOverviewPanel`, `SettingsReinstallPanel`) with `useServerSettings` hook.
- Preserves name/description editing, server overview, resource limits display, reinstall with wipe option, and permission gating.

## [0.29.0] - 2026-09-01

### Changed

- Fleet-style `ds-srv-stu-*` startup dashboard: command header with save/reset, stats row, side-by-side command/preview panels, and searchable environment variables.
- Modular components (`StartupHeader`, `StartupStatsRow`, `StartupCommandPanel`, `StartupPreviewPanel`, `StartupVariablesPanel`, `VariableRow`) with `useServerStartup` hook.
- Preserves startup command editing, docker image selection, live resolved preview, variable save, and permission gating.

## [0.28.0] - 2026-09-01

### Changed

- Fleet-style `ds-srv-net-*` network dashboard: command header, stats/quota row, connection panel, subdomain panel, and searchable port list.
- Modular components (`NetworkHeader`, `NetworkStatsRow`, `NetworkConnectPanel`, `NetworkDomainPanel`, `NetworkListPanel`, `AllocationRow`) with `useServerNetwork` hook.
- Preserves game/SFTP connection copy, auto-assign ports, primary selection, delete, and Cloudflare subdomain management.

## [0.27.0] - 2026-09-01

### Changed

- Fleet-style `ds-srv-sch-*` schedules dashboard: command header, stats row, UTC info banner, search, active/paused filters, and card-based schedule list.
- Modular components (`SchedulesHeader`, `SchedulesStatsRow`, `SchedulesInfoBanner`, `SchedulesListPanel`, `ScheduleRow`) with `useServerSchedules` hook and `schedule-utils`.
- Preserves create (with quick templates), toggle active, run now, delete, and permission gating.

## [0.26.0] - 2026-09-01

### Changed

- Backups: disk budget warnings in create modal, `canCreate` only from API (not permission fallback), archive size uses `disk.backupBytes`, hide default `[]` ignore patterns.
- Fleet-style `ds-srv-db-*` database dashboard: command header, stats/capacity row, connect panel, searchable list with expandable credential cards.
- Modular components (`DatabasesHeader`, `DatabasesStatsRow`, `DatabasesConnectPanel`, `DatabasesListPanel`, `DatabaseRow`) with `useServerDatabases` hook.

## [0.25.0] - 2026-09-01

### Changed

- Fleet-style `ds-srv-bk-*` backup dashboard: command header, stats row, search, status filters, and card-based backup list.
- Modular components (`BackupsHeader`, `BackupsStatsRow`, `BackupsListPanel`, `BackupRow`) with `useServerBackups` hook.
- Preserves create/restore/delete, lock/unlock, download, quota limits, disk budget display, and pending-backup polling.

## [0.24.0] - 2026-09-01

### Changed

- Fleet-style `ds-srv-fm-*` file manager: command header, stats row, breadcrumb toolbar, list/grid explorer, and detail sidebar.
- Modular components (`FilesHeader`, `FilesStatsRow`, `FilesToolbar`, `FilesExplorerPanel`, `FilesListView`, `FilesGridView`, `FilesDetailPanel`) with `useServerFiles` hook.
- Folder icons and accents use panel branding (`--accent`, `--accent-muted`, `--accent-hover`) instead of fixed amber.
- Preserves upload, CRUD, bulk move/archive/delete, rename, compress/extract, permissions, and URL `?dir=` navigation.

## [0.23.0] - 2026-09-01

### Changed

- Fleet-style `ds-srv-act-*` audit dashboard: command header, stats row, search, category filters, and card-based event timeline.
- Modular components (`ActivityHeader`, `ActivityStatsRow`, `ActivityFeedPanel`, `ActivityEventRow`) with `useServerActivityPage` hook.
- Events grouped by day with accent bars, category badges, actor/IP metadata, and load-more pagination.

## [0.22.0] - 2026-09-01

### Changed

- Fleet-style `ds-srv-an-*` dashboard: command header, live metric tiles, bento chart grid, and side panel.
- Modular components (`AnalyticsHeader`, `AnalyticsLiveStrip`, `AnalyticsChartsPanel`) with `useServerAnalytics` hook.
- Charts retain hover tooltips, avg/peak stats, and limit lines; allocation and retention info in sidebar cards.

## [0.21.1] - 2026-09-01

### Changed

- Removed server identity card and back-to-servers links from the server sidebar; branding + nav + power only.

## [0.21.0] - 2026-09-01

### Changed

- Panel branding on the server sidebar now matches the client layout exactly (panel name + tagline).
- New `ServerSidebar` component with server context card (egg icon, name, back link), redesigned power dock, and footer link back to servers.

## [0.20.0] - 2026-09-01

### Changed

- Overview bar: removed duplicate running status; redesigned location/node badge with flag and region label.
- Console header metrics: CPU, RAM, disk, and network pills with icons and usage bars; improved network down/up display.
- Server sidebar: panel `BrandMark` with server name subtitle and theme accent.
- Client API: server node responses now include location short code and flag.

## [0.19.0] - 2026-09-01

### Changed

- New `ds-srv-bar-*` fleet strip: back link, live status, copyable address, metric pills, and node badge.
- Extracted `ServerOverviewBar` component; simplified metrics nav styling.
- Console buffer no longer caps display at 50 lines (full session log up to 5,000 lines).
- Console header accent, icon ring, and pulse now follow server status (running, offline, installing, crashed, etc.).
- Hardened Web Vitals performance observers against missing entry fields.

## [0.18.0] - 2026-09-01

### Changed

- Fleet-style command-bar header with live status, line counts, and CPU/RAM/disk meters.
- Modular console components (`ds-con-*` design system) with filter toolbar, grid viewport, and compose bar.
- Keyboard shortcut hints, improved empty states, and legacy console CSS removed from `index.css`.

## [0.17.0] - 2026-09-01

### Changed

- Plugin hub with command-bar header, ecosystem overview, search/filters, and card/table views.
- FiveM Marketplace detail: bento settings, category filters, and catalog card grid.
- New Minecraft Plugins admin page with Modrinth visibility settings; plugin settings sync to panel config.

## [0.16.2] - 2026-09-01

### Fixed

- Clearing a subdomain on server delete now resets the primary allocation alias (not just the DNS record).
- `releaseServerAllocations` also clears the primary port alias when a server is removed.

## [0.16.1] - 2026-09-01

### Fixed

- `useAsyncData` no longer refetches on every render when an inline fetcher is passed.
- API client shares a global 429 cooldown and honors `Retry-After` instead of parallel retry storms.
- Raised authenticated API rate limit (600/min prod); stabilized admin servers node fetch.

## [0.16.0] - 2026-09-01

### Changed

- Fleet-style subdomains page with stats strip, node distribution overview, and card/table views.
- Search and filters (all, subdomain shown, IP shown, errors); quick links to Cloudflare settings and servers.
- New `ds-dom-*` card and table components; delete flow unchanged.

## [0.15.0] - 2026-09-01

### Changed

- Command-bar header with live/draft status, broadcast stats, and go-live toggle.
- Bento workspace: compose panel, placement sidebar, and dual live-preview frames.
- Floating save bar aligned with location/node detail pages; migrated styles to `ds-ann-*`.

## [0.14.1] - 2026-09-01

### Changed

- Dashboard header, activity feed, capacity ring, and quick-actions grid layout refinements.
- Improved mobile stacking for dashboard, location headers, and server rows.
- Restored consistent spacing across admin list and detail pages.

## [0.14.0] - 2026-09-01

### Changed

- Command-bar header with fleet health, status pill, and quick actions (replaces gradient hero).
- Metric stat strip, capacity bento panel with health ring and port allocation, and quick-action tiles.
- Split layout for node fleet and timeline-style activity feed; refreshed server list.

## [0.13.0] - 2026-09-01

### Changed

- Fleet-style stats strip, distribution overview, and top-regions sidebar.
- Card and table views with status filters (All / In use / Empty), search, and refresh.
- Region cards show flag, node/server counts, and online fraction.

## [0.12.0] - 2026-09-01

### Changed

- Replaced the green gradient hero with a unified command-bar header matching node detail (breadcrumb, flag, stats, tab nav).
- Settings tab uses a bento layout with identity, branding, identifiers, fleet snapshot, and floating save bar.
- Nodes tab shows a card grid with status badges instead of the old related table.

## [0.11.0] - 2026-09-01

### Changed

- Replaced emoji country codes with an optional **flag image URL** on locations.
- Flags render as images across location rows, node cards, and region badges.

## [0.10.0] - 2026-09-01

### Changed

- Locations can store an optional ISO country code for flag display.
- Searchable country picker on create and edit location forms.
- Flags appear on location rows, node cards, region badges, and server lists.

## [0.9.0] - 2026-09-01

### Changed

- Activity tab now shows only panel changes on the node (settings edits, config downloads, token rotations, allocations).
- Redesigned timeline with category badges and change detail tags.
- Config downloads and allocation edits are now logged.
- Removed squished "N/N reporting" badge from Live from Wings usage block.

## [0.8.0] - 2026-09-01

### Changed

- Compact time-range bar and live metrics strip (running, CPU, RAM, disk, ports).
- Bento layout: historical charts + capacity snapshot sidebar with live Wings usage and port allocation.
- Redesigned server workload list with inline RAM/disk/CPU meters.

## [0.7.2] - 2026-09-01

### Changed

- Removed "Live from Wings" usage block from Resource limits on Settings (panel-assigned usage only).

## [0.7.1] - 2026-09-01

### Changed

- Removed section jump nav from Settings.
- Removed "At a glance" header from the resource usage snapshot.

## [0.7.0] - 2026-09-01

### Changed

- Section jump nav (Identity, Network, Resources, FeatherWings, Danger zone).
- Card layout aligned with Overview using shared `NodeOverviewSection` components.
- Right rail: maintenance toggle, live connection preview, Wings credentials.
- Floating bottom save bar with dirty/saved/error states.

## [0.6.1] - 2026-09-01

### Changed

- Removed recent activity from the Overview tab (still available on the Activity tab).
- FeatherWings version card no longer stretches to match the capacity panel height.

## [0.6.0] - 2026-09-01

### Changed

- **Header:** Unified command-bar header with status accent rail, integrated breadcrumb, FQDN copy, inline stat strip, and underline tab navigation.
- **Overview:** Bento layout — quick-launch dock, capacity/resources panel with FeatherWings version card, three-column endpoints/identity/host grid, and activity timeline.
- **FeatherWings version checker** retained in the overview sidebar card.

## [0.5.0] - 2026-09-01

### Changed

- **Overview layout:** Status and FeatherWings version cards sit side-by-side at the top; compact metric pills for servers, ports, and region.
- **Version checker:** Compares the installed daemon version against the latest [mythicalltd/featherwings](https://github.com/mythicalltd/featherwings) GitHub release.
- **Update prompts:** Shows Up to date, Update available (with release link), or guidance when Wings is unreachable.
- **API:** `GET /admin/featherwings/release` (cached 15 minutes; uses `GITHUB_TOKEN` when set).

## [0.4.0] - 2026-09-01

### Changed

- Replaced the heavy fleet hero + sidebar layout with the same pattern as Servers/Locations: header, stat cards, and a single main panel.
- **Table view** (default) uses the full node table with status, connection, resource usage, and workload columns.
- **Cards view** toggle for a visual grid when preferred.
- Compact **fleet capacity** strip with memory/disk meters and per-location online counts.
- Status filter pills, search, and location filter integrated into the main panel toolbar.

## [0.3.0] - 2026-09-01

### Added

- **Sort filter:** GitHub search and category browse support sorting by best match, most stars, most forks, recently updated, and recently pushed.
- **API:** `GET /marketplace/github/search` accepts a `sort` query parameter; results are ordered server-side before pagination.

## [0.2.0] - 2026-09-01

### Added

- **Release fallback:** Installing with "Latest release" no longer fails when a repo has no GitHub releases. The panel falls back to the newest published release, then to the default branch archive.
- **Branch downloads:** Default-branch installs use the correct `refs/heads/<branch>` codeload URL instead of treating branch names as tags.
- **Canonical repos:** Installs resolve owner/repo through rename aliases (e.g. CommunityOx → Overextended) and GitHub's canonical casing before download.
- **Search results:** Browse/search cards use aliased upstream repos so install targets match live repositories.
- **GitHub API:** Requests include `X-GitHub-Api-Version: 2022-11-28` and clearer 404 messages when a release vs repository is missing.

### Changed

- Redesigned marketplace header and tab navigation
- Compact category browse cards and improved search field alignment
- Repository owner avatars on script cards (GitHub icon fallback)
- Polished install wizard checkboxes and script detail metadata layout

## [0.1.0] - 2026-09-01

### Added

- Initial Spirit Panel V4 monorepo release.
