# Spirit-Panel — Production deployment

**Local development:** see [LOCAL.md](LOCAL.md)

---

## Contents

1. [Quick start](#quick-start)
2. [Architecture](#architecture)
3. [Server requirements](#server-requirements)
4. [First-time Ubuntu setup](#first-time-ubuntu-setup)
5. [Install](#install)
6. [Deploy methods](#deploy-methods)
7. [systemd](#systemd)
8. [Nginx + TLS](#nginx--tls)
9. [FeatherWings (game nodes)](#featherwings-game-nodes)
10. [Environment variables](#environment-variables)
11. [Post-install setup](#post-install-setup)
12. [Installable app (PWA)](#installable-app-pwa)
13. [Post-deploy checklist](#post-deploy-checklist)
14. [Updates](#updates)
15. [Troubleshooting](#troubleshooting)
16. [Security](#security)

---



## Quick start

### Guided installer (recommended)

On a **fresh** Ubuntu 22.04+ / Debian 12+ server, as root:

```bash
curl -fsSL https://raw.githubusercontent.com/SpiritFramework/SpiritPanel/main/scripts/spirit.sh -o /tmp/spirit.sh
sudo bash /tmp/spirit.sh
```

> **Do not use** `sudo bash <(curl ...)`. Process substitution gives bash a `/dev/fd/63` path belonging to the calling shell, and `sudo` closes inherited file descriptors before exec, so bash reports `/dev/fd/63: No such file or directory`. Download to a file, or pipe (`curl ... | sudo bash -s -- update -y`) when you do not need the interactive menu.

This is the only step that needs `sudo`, and it is the one path that covers the whole server rather than just the app. It installs Node 20, pnpm, MariaDB, Redis, nginx and certbot, creates the `spiritpanel` user, clones the panel to `/home/spiritpanel/Spirit-Panel`, generates `.env` with real secrets, provisions the database, builds, installs the systemd unit and nginx site, requests a certificate, and prints the admin credentials.

The script version is printed under the banner (`Script Version: 2.0.0`). If you still see `1.0.0`, you are on an old cached copy — re-download `/tmp/spirit.sh` from `main`.

**Point DNS at the server first.** Certbot validates over HTTP, so the domain has to resolve before you run it. If issuance fails the installer leaves the panel serving plain HTTP and tells you the command to retry — it does not leave nginx in a broken state.

Unattended:

```bash
sudo bash /tmp/spirit.sh install --domain panel.example.com --admin-email you@example.com -y
```


| Flag                    | Purpose                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `--domain DOMAIN`       | Public panel domain — becomes `API_URL` and Wings `remote:` |
| `--admin-email MAIL`    | Admin account, and the Let's Encrypt contact                |
| `--admin-password PASS` | Admin password (12+ chars; generated if omitted)            |
| `--no-tls`              | Skip certbot — use behind an existing proxy or load balancer |
| `--ref REF`             | Install a specific branch or tag                            |
| `--force-nginx`         | Overwrite an existing nginx site config                     |
| `--install-dir DIR`     | Install somewhere other than `/home/spiritpanel/Spirit-Panel` |
| `-y`, `--yes`           | Never prompt                                                |


Re-running it is safe: an existing `.env` is kept as-is, and a customised nginx site is left alone unless you pass `--force-nginx`.

### Manual install (existing checkout)

If the server already has Node 20+, pnpm and MariaDB, and you only want the app configured:

```bash
cd ~/Spirit-Panel
pnpm install
pnpm spirit-install --production --api-url https://panel.example.com
```

This covers the database, `.env`, admin user and build. systemd, nginx and TLS remain manual — see the sections below.

Same via shell wrapper:

```bash
bash install --production --api-url https://panel.example.com
```

**Do not run the installer with** `sudo`**.** Run as your app user (e.g. `spiritpanel`). The script calls `sudo mysql` itself when needed.

The installer creates the database, `.env`, admin user, schema, and production build. **Save the credentials it prints.**

Then configure systemd + Nginx (below) and connect FeatherWings nodes.

---



## Architecture

```
Internet → Nginx (443) → panel-web (static) + panel-api (127.0.0.1:3000)
                              ↓
                    MariaDB + Redis (schedules)
                              ↓
              FeatherWings nodes (game servers, Docker)
```


| Component        | Role                                                  |
| ---------------- | ----------------------------------------------------- |
| **panel-api**    | REST API + FeatherWings remote API                    |
| **panel-web**    | Static React UI (Nginx serves `apps/panel-web/dist/`) |
| **MariaDB**      | Panel database                                        |
| **Redis**        | Schedule worker (optional)                            |
| **FeatherWings** | Daemon on game nodes — not on the panel server        |


**Critical:** `API_URL` in `.env` must exactly equal `remote:` in every Wings config (HTTPS, no trailing slash).

---



## Server requirements


| Resource       | Minimum                 |
| -------------- | ----------------------- |
| OS             | Ubuntu 24.04 LTS        |
| CPU            | 2 vCPU                  |
| RAM            | 2 GB (4 GB recommended) |
| Disk           | 40 GB SSD               |
| Ports (public) | 22, 80, 443 only        |


---



## First-time Ubuntu setup

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm@9

# MariaDB + Redis + Nginx
sudo apt install -y mariadb-server mariadb-client redis-server nginx certbot python3-certbot-nginx unzip
sudo mysql_secure_installation

sudo systemctl enable --now mariadb redis-server nginx

# App user
sudo adduser --disabled-password --gecos "" spiritpanel
```



### Path map (default install)


| What             | Path                                                  |
| ---------------- | ----------------------------------------------------- |
| App root         | `/home/spiritpanel/Spirit-Panel/`                     |
| Secrets          | `/home/spiritpanel/Spirit-Panel/apps/panel-api/.env`  |
| Web (Nginx root) | `/home/spiritpanel/Spirit-Panel/apps/panel-web/dist/` |
| Nginx config     | `/etc/nginx/sites-available/spirit-panel`             |
| systemd unit     | `/etc/systemd/system/spirit-panel-api.service`        |


Templates live in `deploy/`.

---



## Install

```bash
pnpm spirit-install [options]
# aliases: pnpm setup, bash install, bash scripts/install.sh
```


| Command                                                                | Purpose                |
| ---------------------------------------------------------------------- | ---------------------- |
| `pnpm spirit-install --production --api-url https://panel.example.com` | Full production setup  |
| `bash install --production --api-url ...`                              | Same via shell wrapper |



| Flag                         | Purpose                                            |
| ---------------------------- | -------------------------------------------------- |
| `--production`, `-p`         | Production mode (HTTPS URL, strong secrets, build) |
| `--api-url URL`              | Public panel URL — must match Wings `remote:`      |
| `--mysql-root-password PASS` | MariaDB root password if `sudo mysql` needs it     |
| `--admin-password PASS`      | Admin login (auto-generated if omitted)            |
| `--database-url URL`         | Use existing MySQL database                        |
| `--fix-database`             | Re-create DB user from `.env`                      |
| `--skip-build`               | Skip production build                              |
| `--help`, `-h`               | Full option list                                   |


---



## Deploy methods



### Via Git

```bash
sudo su - spiritpanel
git clone <repo-url> Spirit-Panel
cd Spirit-Panel
pnpm install
pnpm spirit-install --production --api-url https://panel.example.com
```



### Via SFTP (Windows → Ubuntu)

**Include in zip:** `apps/`, `packages/`, `scripts/`, `deploy/`, `docs/`, `install`, `install.ps1`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `docker-compose.yml`, `.env.example`, `README.md`, `LICENSE`

**Exclude:** `node_modules/`, `dist/`, `build/`, `.turbo/`, `apps/panel-api/.env`, `.git/`, and the vendored `FeatherWings-*/` tree

```powershell
tar -a -c -f Spirit-Panel.zip --exclude=node_modules --exclude=dist --exclude=build --exclude=.turbo --exclude=.env --exclude=.env.local --exclude="*.log" apps packages scripts deploy docs install install.ps1 package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json docker-compose.yml .env.example README.md LICENSE
```

`tar` is used rather than `Compress-Archive` because it honours the excludes; `Compress-Archive` would otherwise sweep in `node_modules/` from any listed directory.

On the server:

```bash
unzip -o Spirit-Panel.zip -d Spirit-Panel
cd Spirit-Panel
pnpm install
pnpm spirit-install --production --api-url https://panel.example.com
```

---



## systemd

```bash
sudo cp deploy/systemd/spirit-panel-api.service /etc/systemd/system/
# Edit User, WorkingDirectory, EnvironmentFile if paths differ
sudo systemctl daemon-reload
sudo systemctl enable --now spirit-panel-api
journalctl -u spirit-panel-api -f
curl -s http://127.0.0.1:3000/health
```



### `.env` permissions (common 502 cause)

The API runs as `spiritpanel` and must read `apps/panel-api/.env` (systemd `EnvironmentFile` + Prisma).

If logs show `EACCES: permission denied, open '.../.env'` or a crash loop with `REDIS_PASSWORD is required` immediately after deploy:

```bash
sudo chown spiritpanel:spiritpanel /home/spiritpanel/Spirit-Panel/apps/panel-api/.env
sudo chmod 600 /home/spiritpanel/Spirit-Panel/apps/panel-api/.env
sudo systemctl restart spirit-panel-api
curl -s http://127.0.0.1:3000/health
```

Ensure `REDIS_PASSWORD` is set in `.env` and matches your Redis `requirepass` (or set `DISABLE_SCHEDULE_WORKER=true` if you do not use schedules yet).

---



## Nginx + TLS

Nginx serves the React UI as static files and proxies `/api/*` to the API on `127.0.0.1:3000`. The API must **not** be exposed directly on port 3000 to the internet.

### 1. Install the site config

```bash
sudo cp deploy/nginx/spirit-panel.conf /etc/nginx/sites-available/spirit-panel
sudo nano /etc/nginx/sites-available/spirit-panel
```

Change these lines:


| Setting                                   | Example                                              |
| ----------------------------------------- | ---------------------------------------------------- |
| `server_name` (both blocks)               | `panel.example.com`                                  |
| `root`                                    | `/home/spiritpanel/Spirit-Panel/apps/panel-web/dist` |
| `ssl_certificate` / `ssl_certificate_key` | Certbot paths (after TLS step)                       |


Reference config is in `deploy/nginx/spirit-panel.conf`.

### 2. Enable the site

```bash
sudo ln -sf /etc/nginx/sites-available/spirit-panel /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default   # optional
sudo nginx -t
```



### 3. TLS with Certbot

DNS must point at this server before running Certbot.

```bash
sudo certbot --nginx -d panel.example.com
sudo systemctl reload nginx
sudo certbot renew --dry-run
```



### 4. File permissions

Nginx runs as `www-data` and must traverse into the web dist:

```bash
chmod o+x /home/spiritpanel
chmod -R o+rX /home/spiritpanel/Spirit-Panel/apps/panel-web/dist
```



### 5. Firewall (panel server)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Only **22, 80, 443** should be public. Do not open 3000, 3306, or 6379.

### 6. Verify

```bash
curl -s https://panel.example.com/health
curl -s https://panel.example.com/health/ready
```

Browser: open `https://panel.example.com/admin`

### 7. Caching rules (do not skip)

The shipped config sets deliberate `Cache-Control` values. Removing them causes deploys to roll out inconsistently:


| Path          | Policy                                | Why                                                           |
| ------------- | ------------------------------------- | ------------------------------------------------------------- |
| `/sw.js`      | `no-cache, must-revalidate`           | The service worker must be re-fetched to notice a new release |
| `/index.html` | `no-cache, must-revalidate`           | A stale copy pins users to an old asset manifest              |
| `/assets/`    | `public, max-age=31536000, immutable` | Filenames are content-hashed by Vite                          |
| `/icons/`     | `public, max-age=604800`              | Bundled PWA icons change rarely                               |


> ⚠️ **nginx** `add_header` **inheritance:** a `location` block that declares **any** `add_header` of its own stops inheriting the server-level ones. Because the blocks above set `Cache-Control`, they must repeat every security header they still need. The `= /index.html` block therefore re-declares the full set including CSP — every SPA route is served through it, so dropping them would silently disable your security headers site-wide. If you add a `location` with `add_header`, copy the header block too.

---



## FeatherWings (game nodes)

The panel and Wings run on **different servers**. Wings talks to the panel over HTTPS; customers connect to Wings directly for console WebSocket and SFTP.

```
Panel server                          Game node
─────────────                         ─────────
Nginx :443                            Wings :8080 (API + console WS)
panel-api :3000 (local)    ◄────────  remote: https://panel...
/api/remote/*              HTTPS      token_id + token
```



### DNS


| Record              | Points to       |
| ------------------- | --------------- |
| `panel.example.com` | Panel server IP |
| `node1.example.com` | Game node IP    |




### Step 1 — Panel: create the node

1. Log in at `https://panel.example.com/admin`
2. **Locations → Add Location**
3. **Nodes → Add Node** — set FQDN, scheme, daemon listen (8080), SFTP port (2022)
4. Click **Wings Config** — download YAML or copy token
5. **Allocations** — add IP + port range

Confirm `API_URL` in `apps/panel-api/.env` matches Wings `remote:` exactly.

### Step 2 — Game node: install Docker + FeatherWings

```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker

sudo mkdir -p /etc/featherpanel
sudo curl -L -o /usr/local/bin/wings \
  "https://github.com/MythicalLTD/FeatherWings/releases/latest/download/wings_linux_amd64"
sudo chmod +x /usr/local/bin/wings
sudo mkdir -p /var/lib/pterodactyl/volumes
```



### Step 3 — Wings config

Save to `/etc/featherpanel/config.yml` using values from **Admin → Nodes → Wings Config**:

```yaml
debug: false
uuid: YOUR_NODE_UUID
token_id: YOUR_TOKEN_ID
token: YOUR_TOKEN_SECRET

api:
  host: 0.0.0.0
  port: 8080
  ssl:
    enabled: false
  upload_limit: 100

system:
  data: /var/lib/pterodactyl/volumes
  sftp:
    bind_port: 2022

remote: https://panel.example.com
remote_query:
  timeout: 30
  boot_servers_per_page: 50

allowed_mounts: []
allow_cors_private_network: false
```

Test: `sudo wings --debug` — Wings should connect and sync.

### Step 4 — Wings systemd

```bash
sudo cp deploy/featherwings/wings.service /etc/systemd/system/wings.service
sudo systemctl daemon-reload
sudo systemctl enable --now wings
journalctl -u wings -f
```



### Step 5 — Game node firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 8080/tcp
sudo ufw allow 2022/tcp
sudo ufw allow 25565:25600/tcp
sudo ufw enable
```



### Step 6 — Verify from game node

```bash
curl -I https://panel.example.com/health
curl -s http://127.0.0.1:8080/api/system
```



### Step 7 — Create a game server

1. Import eggs (`pnpm import-eggs` or **Admin → Nests & Eggs → Import**)
2. **Servers → Create** — pick node, egg, allocation
3. Customer opens **My servers → Console**

**Server resource limits (admin):** When creating or editing a server, set **memory, disk, CPU, swap, or IO** to **0** for unlimited (Pterodactyl-style). Unlimited servers do not count against node capacity totals. **Allocation, backup, and database limits** still use **0 = disabled** — they are not unlimited.

Pre-pull Docker images on game nodes:

```bash
docker pull ghcr.io/pterodactyl/yolks:java_21
docker pull ghcr.io/pterodactyl/installers:debian
```



### Optional — TLS on game node (WSS console)

Put Nginx in front of Wings on the game node for `wss://`. Set node **Scheme** to `https` in panel admin. See `deploy/nginx/` for reference patterns.

### FeatherWings troubleshooting


| Problem                   | Fix                                                               |
| ------------------------- | ----------------------------------------------------------------- |
| Wings `401` on remote API | Token mismatch — rotate in **Admin → Nodes**, update `config.yml` |
| Wings can't reach panel   | `curl https://panel.../health` from game node; check firewall/DNS |
| `remote:` mismatch        | Must equal `API_URL` in panel `.env` exactly                      |
| Install stuck             | `journalctl -u wings -f`; pull egg Docker images                  |
| Console won't connect     | Port 8080 open; check node FQDN                                   |
| SFTP fails                | Port 2022 open; use username format from panel                    |


---



## Environment variables

File: `apps/panel-api/.env` (mode `600`)


| Variable                  | Notes                                                     |
| ------------------------- | --------------------------------------------------------- |
| `DATABASE_URL`            | `mysql://spirit_panel:pass@127.0.0.1:3306/spirit_panel`   |
| `JWT_SECRET`              | User login tokens                                         |
| `APP_KEY`                 | Wings console JWT — must differ from `JWT_SECRET`         |
| `API_URL`                 | HTTPS public URL — Wings `remote:`                        |
| `PANEL_URL`               | Usually same as `API_URL`                                 |
| `ADMIN_PASSWORD`          | 12+ chars, quoted if it contains special characters       |
| `HOST`                    | `127.0.0.1` in production                                 |
| `PORT`                    | `3000`                                                    |
| `CORS_ORIGINS`            | Comma-separated allowed origins (defaults to `PANEL_URL`) |
| `DISABLE_SCHEDULE_WORKER` | `true` if Redis unavailable                               |
| `DISABLE_STATS_COLLECTOR` | `true` to disable usage analytics                         |


Template: `deploy/env/production.example`

### What the database seed creates


| Environment     | Seeded                                       |
| --------------- | -------------------------------------------- |
| **Production**  | Admin user only                              |
| **Development** | Admin + demo data (see [LOCAL.md](LOCAL.md)) |


Always seed production with `NODE_ENV=production` (the installer does this).

Required before production seed:

```
ADMIN_EMAIL=you@yourdomain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD="your-strong-password"
```

---



## Post-install setup



### 1. Redis (scheduled tasks)

```bash
sudo systemctl enable --now redis-server
redis-cli ping   # PONG
```

In `.env`:

```
DISABLE_SCHEDULE_WORKER=false
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

Verify: `curl -s http://127.0.0.1:3000/health/ready`

If Redis is unavailable, set `DISABLE_SCHEDULE_WORKER=true`.

### 2. Game infrastructure (Admin UI)


| Step                       | Where                                          |
| -------------------------- | ---------------------------------------------- |
| Import eggs                | **Admin → Nests & Eggs** or `pnpm import-eggs` |
| Create location            | **Admin → Locations**                          |
| Create node + Wings config | **Admin → Nodes**                              |
| Add allocations            | **Admin → Nodes → Allocations**                |
| Database hosts             | **Admin → Nodes → Database** tab               |




### 3. Panel settings


| Setting                       | Why                         |
| ----------------------------- | --------------------------- |
| **Admin → Settings → Email**  | Password reset (SMTP)       |
| **Admin → Settings → Access** | Disable public registration |
| Branding                      | Match your domain           |




### 4. Schema updates after pulling code

```bash
cd ~/Spirit-Panel/apps/panel-api
pnpm exec prisma migrate deploy
sudo systemctl restart spirit-panel-api
```



### 5. Usage analytics

CPU/memory/disk/network snapshots every **30 seconds**, retained **8 days**. Disable with `DISABLE_STATS_COLLECTOR=true`.

---



## Installable app (PWA)

Users can install the panel as a standalone app from the **Install app** entry in the sidebar footer. Nothing needs enabling — it works as soon as the panel is served over HTTPS with the shipped nginx config.

The manifest is generated per-deploy from your Branding Studio settings:

```bash
curl -s https://panel.example.com/api/auth/branding/manifest.webmanifest
```

Name, short name, description, theme colour, and icon all come from **Admin → Settings → Branding**. Set an **App icon** there (Assets section) so installed apps use your mark rather than the bundled Spirit default.

Requirements and caveats:


| Item                               | Detail                                                                                                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HTTPS**                          | Browsers only offer installation on a secure origin. Certbot step above covers this.                                                                       |
| `/sw.js` **reachable at the root** | A service worker's scope cannot exceed its own directory, so it must not be moved into a subpath.                                                          |
| **Icon changes after install**     | Desktop OSes bake the icon into the shortcut at install time. Changing branding later does **not** update an already-installed app — users must reinstall. |
| **Offline behaviour**              | The app shell is cached for flaky connections. API, FeatherWings, and health traffic are never cached, so server state is always live.                     |


---



## Post-deploy checklist


| Step                                                                       | Expected                                        |
| -------------------------------------------------------------------------- | ----------------------------------------------- |
| `curl https://panel.example.com/health`                                    | `{"status":"ok"}`                               |
| `curl https://panel.example.com/health/ready`                              | `"database":"connected"`, `"redis":"connected"` |
| Browser `/admin`                                                           | Admin login works                               |
| Admin → Nodes                                                              | Node online, allocations added                  |
| Admin → Servers → Create                                                   | Install on Wings                                |
| Client console                                                             | WebSocket to node connects                      |
| Client → Schedules                                                         | Create schedule (needs Redis)                   |
| `curl -s https://panel.example.com/api/auth/branding/manifest.webmanifest` | Returns your panel name and app icon            |
| `curl -sI https://panel.example.com/sw.js`                                 | `Cache-Control: no-cache, must-revalidate`      |


---



## Updates

### Guided updater (recommended)

The installer ships inside the checkout, so an installed panel updates itself:

```bash
sudo bash /home/spiritpanel/Spirit-Panel/scripts/spirit.sh update
```

If the checkout predates the script (or you deployed by zip), fetch it first:

```bash
curl -fsSL https://raw.githubusercontent.com/SpiritFramework/SpiritPanel/main/scripts/spirit.sh -o /tmp/spirit.sh
sudo bash /tmp/spirit.sh update
```

Order of operations, which is what makes it safe to run on a live panel:

1. Copies `.env` and runs `mysqldump` into `/var/backups/spirit-panel/<timestamp>/`. If the dump fails it stops and asks before going further.
2. Updates the source — `git fetch` and a hard reset onto the tracked upstream, or the release tarball if the deploy was not a git checkout. Local modifications prompt to stash rather than being silently discarded.
3. `pnpm install`, then `pnpm build`.
4. `prisma migrate deploy`.
5. Restarts the API, reloads nginx, then polls `/health`.

**A failure in step 3 or 4 stops before the restart**, so the previously built version keeps serving. The backup path is printed either way. Add `--ref V1.3.0.1` to move to a specific release, or `-y` to skip prompts.

`.env`, `node_modules/`, and the existing `dist/` are never overwritten by the source sync.

### Manual update

```bash
cd ~/Spirit-Panel
git pull
pnpm install && pnpm build
cd apps/panel-api && pnpm exec prisma migrate deploy
sudo systemctl restart spirit-panel-api
sudo systemctl reload nginx
```

Check `docs/CHANGELOG.md` for the release you are moving to — entries call out any migration or configuration step beyond the commands above.

If you deployed by extracting a new zip rather than `git pull`, re-copy `deploy/nginx/spirit-panel.conf` when the changelog mentions nginx changes; the installer does not overwrite a config you have already customised.

Browsers pick up the new build on the next load because `index.html` and `sw.js` are served `no-cache`. Users already sitting in an installed app get it on their next launch. There is no need to ask them to clear caches.

---



## Import eggs

```bash
git clone https://github.com/parkervcp/pterodactyl-eggs.git /tmp/pterodactyl-eggs
pnpm import-eggs -- --dir /tmp/pterodactyl-eggs/game/minecraft --create-nest
```

Or **Admin → Nests & Eggs → Import Egg** (PTDL_v2 JSON).

---



## Troubleshooting



### 500 on `/api/client/servers` or `/api/admin/servers/*`

Schema not migrated after deploy:

```bash
cd ~/Spirit-Panel/apps/panel-api
pnpm exec prisma migrate deploy
sudo systemctl restart spirit-panel-api
pnpm exec prisma migrate status
journalctl -u spirit-panel-api -n 50 --no-pager
```



### 502 on `/api/*`

- `sudo systemctl status spirit-panel-api`
- `.env` must have `HOST=127.0.0.1`
- `journalctl -u spirit-panel-api -n 50`



### Blank `/admin` page

- `ls apps/panel-web/dist/index.html`
- Nginx `root` path correct
- `chmod o+x /home/spiritpanel`



### `vite: Permission denied` during build

After SFTP upload, wrappers may lose execute bit:

```bash
chmod +x node_modules/.bin/* 2>/dev/null
pnpm build
```

Prefer `pnpm install` on the server rather than copying `node_modules/`.

### Database access denied

```bash
./install --production --api-url https://panel.example.com --fix-database
```



### Wings 401 / 403

Panel → Wings auth uses the `token` **value** from node config.

1. Copy token from **Admin → Nodes → Wings Config**
2. Must match `token:` in `/etc/featherpanel/config.yml`
3. If unsure: **Rotate token**, update config, restart Wings

```bash
curl -s http://127.0.0.1:8080/api/system -H "Authorization: Bearer YOUR_TOKEN_SECRET"
```



### Console WebSocket / Mixed Content

Browsers block `ws://` on HTTPS panels. Options:

- **Same server:** use `/wings/` nginx block from `deploy/nginx/spirit-panel.conf`
- **Separate node:** TLS on node FQDN, set node scheme to `https`



### Schedule worker errors

Set `DISABLE_SCHEDULE_WORKER=true` in `.env` and restart API.

### Installed app still shows the old icon

First confirm the panel is serving the right one:

```bash
curl -s https://panel.example.com/api/auth/branding/manifest.webmanifest
```

If the `icons` entry points at your branded asset, the panel side is correct and the stale icon is cached by the operating system, not the panel. Installed apps bake their icon into the OS shortcut at install time and never refresh it, so the fix is always on the client:

1. Uninstall the app, then reinstall it from the browser.
2. On Windows, a desktop shortcut can stay stale even after reinstalling, because Explorer caches shortcut icons separately. Delete the desktop shortcut and drag a fresh one out of the Start Menu.
3. If a freshly created shortcut is *still* wrong, clear the icon cache — the files are locked while Explorer runs, so it has to be stopped first:

```powershell
taskkill /f /im explorer.exe
Remove-Item "$env:LocalAppData\IconCache.db" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:LocalAppData\Microsoft\Windows\Explorer\iconcache*.db" -Force -ErrorAction SilentlyContinue
Start-Process explorer.exe
```



### Cleaning up old demo data

If database was seeded in development mode on production:

1. Delete servers, demo users, nodes, locations, nests
2. Re-seed admin only: `cd apps/panel-api && NODE_ENV=production pnpm db:seed`

---



## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting, session handling, and API key guidance.

1. Store admin password safely after install
2. **Admin → Settings** — disable public registration
3. `chmod 600 apps/panel-api/.env`
4. Never expose ports 3306, 6379, or 3000 publicly
5. Back up `.env` and run daily `mysqldump` of `spirit_panel`
6. Do not rotate `APP_KEY` without expecting console disconnects

---



## Optional: Application API

**Admin → API Keys** → create Application key → use on `/api/application/`* for billing automation.