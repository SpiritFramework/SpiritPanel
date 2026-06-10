# Spirit-Panel — Local development

Run the full panel stack on your machine for UI and API development. Game servers still need a real FeatherWings node for live console and installs — the dev seed includes a **demo server** for browsing the UI only.

---

## Requirements

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| pnpm | 9+ (`npm install -g pnpm`) |
| Docker | Recommended — starts MariaDB + Redis automatically |

---

## First-time setup

From the repo root:

```bash
./install          # Linux / macOS
./install.ps1      # Windows
```

Or:

```bash
pnpm install
pnpm spirit-install
```

The installer will:

1. Start Docker MariaDB + Redis (if Docker is available)
2. Create `apps/panel-api/.env` from `.env.example`
3. Install dependencies and build shared packages
4. Run database migrations and seed **development** data
5. Build all apps

**Do not** pass `--production` for local work.

---

## Daily workflow

```bash
pnpm dev
```

| Service | URL |
|---------|-----|
| Web UI | http://localhost:5173 |
| API health | http://localhost:3000/health |
| API ready | http://localhost:3000/health/ready |

### Default login

| Field | Value |
|-------|-------|
| Email | `admin@example.com` |
| Password | `admin123!` (or `ADMIN_PASSWORD` in `.env`) |

Demo user: `demo@example.com` / `demo123!`

### Docker services

```bash
docker compose up -d          # MariaDB + Redis
docker compose ps             # check health
docker compose down           # stop
```

Default database URL (Docker): `mysql://spirit:spirit@127.0.0.1:3306/spirit_panel`

---

## What the dev seed creates

| Item | Notes |
|------|-------|
| Admin user | From `.env` or defaults above |
| Demo user | `demo@example.com` |
| UK location | Short code `uk` |
| Minecraft nest + egg | Vanilla Minecraft |
| Demo server | UI preview — no real Wings connection |
| Panel settings | Branding, registration disabled |
| Marketplace catalog | FiveM plugins |

Production seed (`NODE_ENV=production`) creates **admin only** — never run that locally unless you intend to.

---

## Useful commands

```bash
pnpm dev                      # API + web dev servers
pnpm build                    # production build
pnpm lint                     # lint all packages

pnpm db:generate              # regenerate Prisma client
pnpm db:deploy                # apply migrations
pnpm db:push                  # push schema (fallback)
pnpm db:seed                  # re-seed (development data)

pnpm import-eggs -- --dir /path/to/pterodactyl-eggs/game/minecraft --create-nest
pnpm verify:prod              # validate production .env (after prod install)
```

---

## Environment file

Path: `apps/panel-api/.env`

Key variables for local dev:

| Variable | Default |
|----------|---------|
| `DATABASE_URL` | Docker MariaDB URL (see above) |
| `JWT_SECRET` | Dev placeholder in `.env.example` |
| `APP_KEY` | Dev placeholder |
| `API_URL` | `http://localhost:3000` |
| `PANEL_URL` | `http://localhost:5173` |
| `ADMIN_PASSWORD` | `admin123!` |

The Vite dev server proxies `/api` to the API on port 3000.

---

## Install script options (development)

```bash
pnpm spirit-install [options]
```

| Flag | Purpose |
|------|---------|
| `--skip-docker` | Don't start Docker containers |
| `--skip-db` | Skip migrations and seed |
| `--skip-build` | Skip `pnpm build` |
| `--database-url URL` | Use a custom MySQL URL |
| `--help` | Full option list |

---

## Connecting a real Wings node (optional)

For live console and server installs locally:

1. Install FeatherWings on another machine (or WSL2 with Docker)
2. Set panel `API_URL` to a URL Wings can reach (e.g. ngrok or LAN IP)
3. Create a node in **Admin → Nodes** and copy the Wings config
4. Point Wings `remote:` at your reachable API URL

See [PRODUCTION.md](PRODUCTION.md) → FeatherWings for node setup details.

---

## Troubleshooting

### Database not reachable

```bash
docker compose up -d
docker compose ps    # mariadb should show "healthy"
```

Or set `DATABASE_URL` in `.env` to your local MySQL instance.

### Port already in use

Change `PORT` in `apps/panel-api/.env` or stop the conflicting process.

### Schema out of date after `git pull`

```bash
pnpm db:deploy
# or: cd apps/panel-api && pnpm db:push
```

### Reset local database

```bash
docker compose down -v
docker compose up -d
pnpm spirit-install --skip-build
```

### Windows: execution policy

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\install.ps1
```

---

## Production deploy

When ready to deploy, switch to **[PRODUCTION.md](PRODUCTION.md)**.

```bash
pnpm spirit-install --production --api-url https://panel.example.com
```
