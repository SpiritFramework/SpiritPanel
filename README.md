# Spirit Panel

Self-hosted game server control panel by [SpiritFramework](https://github.com/SpiritFramework).

Spirit Panel gives you a modern web UI for users, nodes, servers, and infrastructure — in the same space as Pterodactyl, built for **[FeatherWings](https://docs.mythical.systems/docs/featherpanel/wings)** daemons. Wings can run on dedicated game nodes or on the same machine as the panel.

| | |
| --- | --- |
| **Docs** | [framework.spirithost.co.uk/docs](https://framework.spirithost.co.uk/docs?script=spirit-panel) |
| **FeatherWings** | [docs.mythical.systems](https://docs.mythical.systems/docs/featherpanel/wings) |
| **License** | [AGPL-3.0](LICENSE) |
| **Version** | `1.3.5.0` (see [`docs/CHANGELOG.md`](docs/CHANGELOG.md)) |

> **Deployment note.** The panel never runs game workloads. Every game server is a Docker container managed by FeatherWings — never by `panel-api`. That is a split of responsibility, not a requirement for separate hardware. Same-box installs are first-class (nginx `location /wings/` proxies the console WebSocket). Both topologies are covered in [`docs/PRODUCTION.md`](docs/PRODUCTION.md).

---

## Preview

![Spirit Panel](https://iili.io/nISZy7f.png)

---

## Features

### Admin

- **Fleet management** — locations, nodes, allocations, capacity meters, live health, diagnostics, and activity
- **Servers** — provision from nests/eggs, suspend, reinstall, network/allocations, startup, and admin live manage
- **Users** — roles, suspensions, SSH keys, API keys, and per-user server access
- **Nests & eggs** — import, edit variables/config, and manage service templates
- **Domains** — panel domain tooling for custom hostnames
- **Tickets** — staff inbox with priorities and Discord webhook support
- **Announce** — site-wide announcements for the client area
- **Activity** — audit-style admin activity views
- **Settings & branding** — Branding Studio (live preview), shell layout (sidebar/navbar), atmosphere scenes, SMTP/mail, security
- **Plugins** — FiveM Marketplace, Minecraft Plugins (Modrinth), Database Manager ([`docs/PLUGINS.md`](docs/PLUGINS.md))
- **Unlimited resources** when limits are set to `0` (CPU, RAM, disk, IO, swap)

### Client

- Live console with Tab completion (FeatherWings suggestions)
- File manager and built-in editor
- Startup configuration and environment variables
- Power controls (start / stop / restart / kill)
- Backups, restore, databases, and schedules
- Subusers with fine-grained permissions
- SFTP access and server settings
- Support tickets
- Installable PWA (desktop, Android, iOS) with branding-aware manifest

### Platform

- Pterodactyl-compatible remote API for FeatherWings
- Application API with scoped keys for automation
- HttpOnly session auth with optional 2FA
- Production env validation and safety checks
- Crash recovery / reconnect options for FeatherWings 1.4.3+

---

## Architecture

```
Internet → Nginx (HTTPS)
              ↓
     panel-web (React static)
     panel-api (Fastify, localhost:3000)
              ↓
     MariaDB + Redis (queues / schedules)
              ↓
     FeatherWings (Docker game servers — local and/or remote)
```

| Component | Role |
| --- | --- |
| `apps/panel-api` | Fastify API, Prisma, workers, built-in plugins |
| `apps/panel-web` | React (Vite) frontend |
| MariaDB | Primary database |
| Redis | Queues and schedule worker |
| FeatherWings | Game daemon — local, remote, or both |

**Single box:** panel + Wings on one host. Node points at `127.0.0.1:8080`; nginx `location /wings/` keeps an HTTPS panel talking to a local daemon.

**Separate nodes:** Wings on its own hardware with TLS on the node FQDN (`scheme: https`).

They mix freely — one panel can drive a local daemon and remote nodes together.

> `API_URL` in `.env` must match `remote:` in the FeatherWings config exactly (HTTPS, no trailing slash).

---

## Requirements

| | Development | Production |
| --- | --- | --- |
| OS | Windows / macOS / Linux | Ubuntu 22.04+ or Debian 12+ (Ubuntu 24.04 LTS recommended) |
| Node.js | 20+ | 20+ |
| pnpm | 9+ | 9+ |
| Database | Docker MariaDB / MySQL | MariaDB |
| Redis | Docker recommended | Redis |
| Game nodes | Optional for UI work | FeatherWings required for live servers |

---

## Quick start

### Development

```bash
./install          # Linux / macOS
./install.ps1      # Windows
pnpm dev
```

| Service | URL |
| --- | --- |
| Web UI | http://localhost:5173 |
| API health | http://localhost:3000/health |

Dev credentials and seed data: [`docs/LOCAL.md`](docs/LOCAL.md).

### Production

On a fresh Ubuntu 22.04+ / Debian 12+ server, download the installer and run it as root:

```bash
curl -fsSL https://raw.githubusercontent.com/SpiritFramework/SpiritPanel/main/scripts/spirit.sh -o /tmp/spirit.sh
sudo bash /tmp/spirit.sh
```

The menu covers **Install**, **Update**, **Status**, **Backup**, and **Uninstall**. It provisions Node 20, pnpm, MariaDB, Redis (with a password), nginx, and Let's Encrypt.

> Download to a file first — do not use `sudo bash <(curl ...)`. Process substitution breaks under `sudo` (`/dev/fd/…: No such file or directory`).

Unattended (latest GitHub release; add `--channel dev` for unreleased `main`):

```bash
sudo bash /tmp/spirit.sh install --domain panel.example.com --admin-email you@example.com -y
```

Point DNS at the server **before** install so certbot can issue a certificate. The chosen channel is saved and reused on later updates. `--ref` pins a tag or branch for that run.

#### Updating

```bash
sudo bash /home/spiritpanel/Spirit-Panel/scripts/spirit.sh update
```

Backs up `.env` and the database, checks out the saved channel, rebuilds, migrates, then restarts. If the commit is already built, install/build are skipped. Failed builds or migrations stop **before** restart so the running version stays up.

#### Existing checkout

```bash
pnpm install
pnpm spirit-install --production --api-url https://panel.example.com
```

Configures the database, `.env`, admin user, and build. Systemd, nginx, and TLS remain yours.

> Save generated credentials. Do not run `spirit-install` itself as root.

Full guide: [`docs/PRODUCTION.md`](docs/PRODUCTION.md).

---

## Commands

```bash
pnpm dev              # start development (API + web)
pnpm build            # build all apps
pnpm lint             # lint workspace
pnpm start:prod       # run production API

pnpm db:migrate       # development migrations
pnpm db:deploy        # production migrations
pnpm db:seed          # seed data

pnpm import-eggs      # import egg templates
pnpm verify:prod      # production health check

pnpm --filter @spirit/panel-api test
pnpm --filter @spirit/panel-web test
```

After a manual production update:

```bash
pnpm db:deploy
sudo systemctl restart spirit-panel-api
```

---

## Repository layout

```
Spirit-Panel/
├── apps/
│   ├── panel-api     # Fastify, Prisma, workers, plugins
│   └── panel-web     # React (Vite) UI
├── packages/
│   ├── shared
│   ├── shared-types
│   └── plugin-sdk
├── deploy/           # nginx, systemd, env, Wings templates
├── docs/
├── scripts/          # spirit.sh installer, egg import, verify
├── install / install.ps1
└── LICENSE
```

---

## Documentation

| Doc | Purpose |
| --- | --- |
| [`docs/LOCAL.md`](docs/LOCAL.md) | Local development |
| [`docs/PRODUCTION.md`](docs/PRODUCTION.md) | Production deploy |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Security model and reporting |
| [`docs/PLUGINS.md`](docs/PLUGINS.md) | Built-in plugins and SDK |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Release history and versioning |

Engineering deep-dives on FeatherWings crash detection and container state also live under `docs/` (point-in-time analyses, not day-to-day guides).

---

## Security

Spirit Panel is built for self-hosting. You own TLS, host hardening, and access control.

**Built in**

- HttpOnly session cookies (no tokens in `localStorage`)
- CSP with strict script policy
- URL sanitization and safe link validation
- Production environment validation
- Path-jail for files and backups (no traversal)
- Restricted branding uploads (no executable SVG)
- Scoped application API keys

**Your side**

- HTTPS in production
- Protect `.env` and rotate secrets
- Restrict admin accounts and API keys
- Follow [`docs/SECURITY.md`](docs/SECURITY.md)

---

## Contributing

1. Fork and clone the repo
2. Run `./install` (or `./install.ps1`) then `pnpm dev`
3. Prefer small, focused PRs against `main`
4. Note user-facing changes in [`docs/CHANGELOG.md`](docs/CHANGELOG.md) under **Unreleased**

Issues and pull requests: [github.com/SpiritFramework/SpiritPanel](https://github.com/SpiritFramework/SpiritPanel).

---

## License

Licensed under the **GNU Affero General Public License v3.0** — see [LICENSE](LICENSE).

If you modify Spirit Panel and run it as a network service, AGPL requires that you offer corresponding source to users of that service.
