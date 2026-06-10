# Spirit-Panel

Self-hosted game server control panel by **SpiritFramework**. Manage users, nodes, eggs, and game servers from a web UI — similar in scope to Pterodactyl, built for **FeatherWings** daemons on separate game nodes.

The panel runs on one machine (Ubuntu in production). **Do not** run game servers on the panel box; Docker workloads live on FeatherWings nodes.

---

## Features

**Admin**

- Multi-node fleet management (locations, allocations, capacity, diagnostics)
- User accounts, roles, suspensions, and API keys
- Server provisioning with eggs/nests, resource limits, and unlimited memory/disk/CPU when set to `0`
- Backups, schedules, MySQL database hosts, and marketplace integrations
- Branding, announcements, mail settings, and activity logs

**Client**

- Live console, file manager, startup editor, and power controls
- Usage analytics, backups, databases, cron schedules, and subusers
- SFTP credentials and server-specific settings

**Platform**

- Pterodactyl-compatible remote API for FeatherWings
- Application API for automation
- HttpOnly browser sessions, 2FA, API keys for automation, production env validation

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
| `apps/panel-api` | Fastify REST API + Wings remote API |
| `apps/panel-web` | React UI (Vite) |
| **MariaDB** | Panel database (Prisma) |
| **Redis** | Schedule worker queue |
| **FeatherWings** | Daemon on each game node |

`API_URL` in the panel `.env` must exactly match `remote:` in every Wings `config.yml` (HTTPS, no trailing slash).

---

## Requirements

| | Local dev | Production |
|---|-----------|------------|
| **OS** | Windows, macOS, or Linux | Ubuntu 24.04 LTS |
| **Node.js** | 20+ | 20+ |
| **pnpm** | 9+ | 9+ |
| **Database** | Docker MariaDB (recommended) or local MySQL | MariaDB |
| **Redis** | Docker (recommended) | Redis |
| **Game nodes** | Optional (UI works with seed data) | FeatherWings on separate servers |

---

## Quick start

### Local development

```bash
./install          # Linux / macOS — or ./install.ps1 on Windows
pnpm dev
```

| Service | URL |
|---------|-----|
| Web UI | http://localhost:5173 |
| API | http://localhost:3000/health |

Default dev admin credentials are in **[docs/LOCAL.md](docs/LOCAL.md)** (demo user seeded too).

Full dev guide: **[docs/LOCAL.md](docs/LOCAL.md)**

### Production

On a fresh Ubuntu server (Node 20+, pnpm, MariaDB):

```bash
pnpm install
pnpm spirit-install --production --api-url https://panel.example.com
```

The installer creates the database, `.env`, admin user, schema, and production build. **Save the credentials it prints.** Do not run the installer with `sudo`.

Then configure systemd, Nginx, TLS, and FeatherWings nodes:

**[docs/PRODUCTION.md](docs/PRODUCTION.md)**

---

## Install command

```bash
pnpm spirit-install [options]   # aliases: pnpm setup, ./install, bash scripts/install.sh
pnpm spirit-install --help
```

Use `--production` and `--api-url` only when deploying to a live server.

---

## Common commands

```bash
pnpm dev              # API + web in dev mode
pnpm build            # Production build (all apps)
pnpm start:prod       # Run compiled API

pnpm db:migrate       # Dev migrations
pnpm db:deploy        # Production migrations (run after updates)
pnpm db:seed          # Re-seed dev data

pnpm import-eggs      # Import egg JSON into the panel
pnpm verify:prod      # Check production env and health
```

After pulling updates on a live server:

```bash
cd apps/panel-api && pnpm exec prisma migrate deploy
sudo systemctl restart spirit-panel-api
```

---

## Project layout

```
Spirit-Panel/
├── apps/
│   ├── panel-api/      # Fastify API, Prisma schema, workers
│   └── panel-web/      # React frontend
├── packages/
│   ├── shared/         # Shared utilities
│   └── shared-types/   # Shared TypeScript types
├── deploy/             # systemd, Nginx templates
├── docs/
│   ├── LOCAL.md        # Development setup
│   └── PRODUCTION.md   # Production deployment
├── scripts/
│   └── spirit-install.ts
└── SECURITY.md
```

---

## Documentation

| Guide | Use when |
|-------|----------|
| **[docs/LOCAL.md](docs/LOCAL.md)** | Developing on your machine |
| **[docs/PRODUCTION.md](docs/PRODUCTION.md)** | Deploying Ubuntu + Nginx + FeatherWings |
| **[SECURITY.md](SECURITY.md)** | Security model, checklist, vulnerability reporting |

---

## Security

Spirit-Panel is designed for self-hosting: you are responsible for TLS, firewall rules, and protecting `apps/panel-api/.env`.

**Built-in**

- **Browser login** — JWT stored in an HttpOnly `SameSite=Strict` cookie; the web UI does not keep session tokens in `localStorage`. API keys and Bearer JWTs are supported separately for automation.
- **XSS controls** — Content-Security-Policy (`script-src 'self'`), safe URL validation for images/links, no `dangerouslySetInnerHTML` in the UI.
- **Production startup checks** — With `NODE_ENV=production`, the API refuses placeholder or short `JWT_SECRET` / `APP_KEY`, identical secrets, and non-HTTPS or localhost `API_URL`.
- **Branding uploads** — SVG is not accepted for logo/favicon uploads (PNG, JPEG, WebP, ICO only).
- **File manager** — Client file paths are validated (absolute paths, no `..` traversal) before requests reach FeatherWings.

**Your responsibility**

- Run production with `NODE_ENV=production` and the installer’s `--production` flow.
- Restrict admin access, rotate API keys, and treat XSS as high impact even with HttpOnly cookies.

Full model and reporting: **[SECURITY.md](SECURITY.md)**.

---

## License

[GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0).

If you run a modified version as a network service, AGPL requires making corresponding source available to users interacting with it over the network.
