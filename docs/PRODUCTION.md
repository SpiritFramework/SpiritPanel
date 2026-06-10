# Spirit-Panel — Production deployment

Deploy Spirit-Panel on **Ubuntu 24.04**. Game servers run on separate machines with **FeatherWings** — do not host game servers on the panel server.

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
12. [Post-deploy checklist](#post-deploy-checklist)
13. [Updates](#updates)
14. [Troubleshooting](#troubleshooting)
15. [Security](#security)

---

## Quick start

On a fresh Ubuntu server with Node 20+, pnpm, and MariaDB:

```bash
cd ~/Spirit-Panel
pnpm install
pnpm spirit-install --production --api-url https://panel.example.com
```

Same via shell wrapper:

```bash
bash install --production --api-url https://panel.example.com
```

**Do not run the installer with `sudo`.** Run as your app user (e.g. `spiritpanel`). The script calls `sudo mysql` itself when needed.

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

| Component | Role |
|-----------|------|
| **panel-api** | REST API + FeatherWings remote API |
| **panel-web** | Static React UI (Nginx serves `apps/panel-web/dist/`) |
| **MariaDB** | Panel database |
| **Redis** | Schedule worker (optional) |
| **FeatherWings** | Daemon on game nodes — not on the panel server |

**Critical:** `API_URL` in `.env` must exactly equal `remote:` in every Wings config (HTTPS, no trailing slash).

---

## Server requirements

| Resource | Minimum |
|----------|---------|
| OS | Ubuntu 24.04 LTS |
| CPU | 2 vCPU |
| RAM | 2 GB (4 GB recommended) |
| Disk | 40 GB SSD |
| Ports (public) | 22, 80, 443 only |

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

| What | Path |
|------|------|
| App root | `/home/spiritpanel/Spirit-Panel/` |
| Secrets | `/home/spiritpanel/Spirit-Panel/apps/panel-api/.env` |
| Web (Nginx root) | `/home/spiritpanel/Spirit-Panel/apps/panel-web/dist/` |
| Nginx config | `/etc/nginx/sites-available/spirit-panel` |
| systemd unit | `/etc/systemd/system/spirit-panel-api.service` |

Templates live in `deploy/`.

---

## Install

```bash
pnpm spirit-install [options]
# aliases: pnpm setup, bash install, bash scripts/install.sh
```

| Command | Purpose |
|---------|---------|
| `pnpm spirit-install --production --api-url https://panel.example.com` | Full production setup |
| `bash install --production --api-url ...` | Same via shell wrapper |

| Flag | Purpose |
|------|---------|
| `--production`, `-p` | Production mode (HTTPS URL, strong secrets, build) |
| `--api-url URL` | Public panel URL — must match Wings `remote:` |
| `--mysql-root-password PASS` | MariaDB root password if `sudo mysql` needs it |
| `--admin-password PASS` | Admin login (auto-generated if omitted) |
| `--database-url URL` | Use existing MySQL database |
| `--fix-database` | Re-create DB user from `.env` |
| `--skip-build` | Skip production build |
| `--help`, `-h` | Full option list |

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

**Include in zip:** `apps/`, `packages/`, `scripts/`, `deploy/`, `docs/`, `install`, `README.md`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `docker-compose.yml`, `.env.example`

**Exclude:** `node_modules/`, `dist/`, `apps/panel-api/.env`, `.git/`

```powershell
Compress-Archive -Path apps,packages,scripts,deploy,docs,install,README.md,package.json,pnpm-lock.yaml,pnpm-workspace.yaml,turbo.json,docker-compose.yml,.env.example -DestinationPath Spirit-Panel.zip
```

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

---

## Nginx + TLS

Nginx serves the React UI as static files and proxies `/api/*` to the API on `127.0.0.1:3000`. The API must **not** be exposed directly on port 3000 to the internet.

### 1. Install the site config

```bash
sudo cp deploy/nginx/spirit-panel.conf /etc/nginx/sites-available/spirit-panel
sudo nano /etc/nginx/sites-available/spirit-panel
```

Change these lines:

| Setting | Example |
|---------|---------|
| `server_name` (both blocks) | `panel.spirithost.co.uk` |
| `root` | `/home/spiritpanel/Spirit-Panel/apps/panel-web/dist` |
| `ssl_certificate` / `ssl_certificate_key` | Certbot paths (after TLS step) |

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
sudo certbot --nginx -d panel.spirithost.co.uk
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
curl -s https://panel.spirithost.co.uk/health
curl -s https://panel.spirithost.co.uk/health/ready
```

Browser: open `https://panel.spirithost.co.uk/admin`

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

| Record | Points to |
|--------|-----------|
| `panel.example.com` | Panel server IP |
| `node1.example.com` | Game node IP |

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

| Problem | Fix |
|---------|-----|
| Wings `401` on remote API | Token mismatch — rotate in **Admin → Nodes**, update `config.yml` |
| Wings can't reach panel | `curl https://panel.../health` from game node; check firewall/DNS |
| `remote:` mismatch | Must equal `API_URL` in panel `.env` exactly |
| Install stuck | `journalctl -u wings -f`; pull egg Docker images |
| Console won't connect | Port 8080 open; check node FQDN |
| SFTP fails | Port 2022 open; use username format from panel |

---

## Environment variables

File: `apps/panel-api/.env` (mode `600`)

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | `mysql://spirit_panel:pass@127.0.0.1:3306/spirit_panel` |
| `JWT_SECRET` | User login tokens |
| `APP_KEY` | Wings console JWT — must differ from `JWT_SECRET` |
| `API_URL` | HTTPS public URL — Wings `remote:` |
| `PANEL_URL` | Usually same as `API_URL` |
| `ADMIN_PASSWORD` | 12+ chars, quoted if it contains special characters |
| `HOST` | `127.0.0.1` in production |
| `PORT` | `3000` |
| `CORS_ORIGINS` | Comma-separated allowed origins (defaults to `PANEL_URL`) |
| `DISABLE_SCHEDULE_WORKER` | `true` if Redis unavailable |
| `DISABLE_STATS_COLLECTOR` | `true` to disable usage analytics |

Template: `deploy/env/production.example`

### What the database seed creates

| Environment | Seeded |
|-------------|--------|
| **Production** | Admin user only |
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

| Step | Where |
|------|--------|
| Import eggs | **Admin → Nests & Eggs** or `pnpm import-eggs` |
| Create location | **Admin → Locations** |
| Create node + Wings config | **Admin → Nodes** |
| Add allocations | **Admin → Nodes → Allocations** |
| Database hosts | **Admin → Nodes → Database** tab |

### 3. Panel settings

| Setting | Why |
|---------|-----|
| **Admin → Settings → Email** | Password reset (SMTP) |
| **Admin → Settings → Access** | Disable public registration |
| Branding | Match your domain |

### 4. Schema updates after pulling code

```bash
cd ~/Spirit-Panel/apps/panel-api
pnpm exec prisma migrate deploy
sudo systemctl restart spirit-panel-api
```

### 5. Usage analytics

CPU/memory/disk/network snapshots every **30 seconds**, retained **8 days**. Disable with `DISABLE_STATS_COLLECTOR=true`.

---

## Post-deploy checklist

| Step | Expected |
|------|----------|
| `curl https://panel.example.com/health` | `{"status":"ok"}` |
| `curl https://panel.example.com/health/ready` | `"database":"connected"`, `"redis":"connected"` |
| Browser `/admin` | Admin login works |
| Admin → Nodes | Node online, allocations added |
| Admin → Servers → Create | Install on Wings |
| Client console | WebSocket to node connects |
| Client → Schedules | Create schedule (needs Redis) |

---

## Updates

```bash
cd ~/Spirit-Panel
git pull
pnpm install && pnpm build
cd apps/panel-api && pnpm exec prisma migrate deploy
sudo systemctl restart spirit-panel-api
sudo systemctl reload nginx
```

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

Panel → Wings auth uses the **`token` value** from node config.

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

### Cleaning up old demo data

If database was seeded in development mode on production:

1. Delete servers, demo users, nodes, locations, nests
2. Re-seed admin only: `cd apps/panel-api && NODE_ENV=production pnpm db:seed`

---

## Security

See [SECURITY.md](../SECURITY.md) for vulnerability reporting, session handling, and API key guidance.

1. Store admin password safely after install
2. **Admin → Settings** — disable public registration
3. `chmod 600 apps/panel-api/.env`
4. Never expose ports 3306, 6379, or 3000 publicly
5. Back up `.env` and run daily `mysqldump` of `spirit_panel`
6. Do not rotate `APP_KEY` without expecting console disconnects

---

## Optional: Application API

**Admin → API Keys** → create Application key → use on `/api/application/*` for billing automation.
