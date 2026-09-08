# 🚀 Spirit-Panel

Spirit-Panel is a self-hosted game server control panel built by **SpiritFramework**.

It provides a modern web interface for managing users, nodes, game servers, and infrastructure — similar in scope to Pterodactyl, but designed specifically for **FeatherWings** daemons running on separate game nodes.

📚 FeatherWings Documentation: https://docs.mythical.systems/docs/featherpanel/wings

📚 Spirit-Panel Documentation: https://framework.spirithost.co.uk/docs?script=spirit-panel

> ⚠️ The panel runs only the control panel (web + API). Game servers are never hosted on the panel machine. All Docker workloads are executed on FeatherWings nodes.

---

## 🖼️ Preview

![Spirit-Panel Preview](https://iili.io/CCK2Esp.png)

---

## ✨ Features

### 🛠️ Administration

* Multi-node fleet management (locations, allocations, capacity, diagnostics)
* User accounts, roles, suspensions, SSH keys, and API keys
* Server provisioning with nests/eggs and resource limits
* Unlimited resources when set to `0` (CPU, RAM, disk, IO, swap)
* Backups, schedules, MySQL databases, and marketplace integration
* Branding Studio with live preview, announcements, SMTP/mail configuration, and audit logs
* Built-in plugins (FiveM Marketplace, Minecraft Plugins, Database Manager) — see `docs/PLUGINS.md`

---

### 👤 Client (End Users)

* Live server console with real-time output
* File manager and built-in file editor
* Startup configuration and environment variables
* Power controls (start, stop, restart, kill)
* Backups, restore system, and database management
* Cron schedules and automation tools
* Subuser system with fine-grained permissions
* SFTP access and server-specific settings
* Installable as a standalone app (PWA) on desktop, Android, and iOS

---

### 🌐 Platform

* Pterodactyl-compatible remote API for FeatherWings
* Application API for automation and integrations
* HttpOnly session authentication with optional 2FA
* API key system for external services
* Production environment validation and safety checks
* Branding-aware web manifest and service worker, so an installed app carries your name, icon, and theme

---

## 🧱 Architecture

```
Internet → Nginx (HTTPS)
              ↓
     panel-web (React static)
     panel-api (Fastify, localhost:3000)
              ↓
     MariaDB + Redis (queues/schedules)
              ↓
     FeatherWings nodes (Docker game servers)
```

| Component        | Description                    |
| ---------------- | ------------------------------ |
| `apps/panel-api` | Fastify API + Prisma + workers |
| `apps/panel-web` | React (Vite) frontend          |
| MariaDB          | Primary database               |
| Redis            | Queue / scheduler system       |
| FeatherWings     | Game server daemon on nodes    |

> ⚠️ `API_URL` in `.env` must match `remote:` in FeatherWings config exactly (HTTPS, no trailing slash).

---

## ⚙️ Requirements

| Component  | Dev                     | Production            |
| ---------- | ----------------------- | --------------------- |
| OS         | Windows / macOS / Linux | Ubuntu 24.04 LTS      |
| Node.js    | 20+                     | 20+                   |
| pnpm       | 9+                      | 9+                    |
| Database   | Docker MariaDB or MySQL | MariaDB               |
| Redis      | Docker recommended      | Redis                 |
| Game nodes | Optional                | FeatherWings required |

---

## 🚀 Quick Start

### Development

```bash
./install
pnpm dev
```

* Web UI: [http://localhost:5173](http://localhost:5173)
* API: [http://localhost:3000/health](http://localhost:3000/health)

Dev credentials and seed data: `docs/LOCAL.md`

---

### Production

On a fresh Ubuntu 22.04+ or Debian 12+ server, run the installer as root:

```bash
sudo bash <(curl -fsSL https://raw.githubusercontent.com/SpiritFramework/SpiritPanel/main/scripts/spirit.sh)
```

That opens a menu with **Install**, **Update**, **Status**, **Backup**, and **Uninstall**. It takes a bare server all the way to a working panel: Node 20, pnpm, MariaDB, Redis (with a password), nginx, and a Let's Encrypt certificate.

Unattended:

```bash
sudo bash <(curl -fsSL .../scripts/spirit.sh) install \
  --domain panel.example.com --admin-email you@example.com -y
```

Point DNS at the server **before** installing, so certbot can issue a certificate.

#### Updating

```bash
sudo bash <(curl -fsSL .../scripts/spirit.sh) update
```

Backs up `.env` and the database first, then rebuilds, migrates, and restarts. If the build or a migration fails it stops **before** restarting, so the running version stays up.

#### Already have a checkout?

```bash
pnpm install
pnpm spirit-install --production --api-url https://panel.example.com
```

This configures the database, `.env`, admin user, and build, but leaves systemd, nginx, and TLS to you.

> ⚠️ Save the generated credentials. Do not run `spirit-install` itself as root.

Full guide: `docs/PRODUCTION.md`

---

## 🧰 Commands

```bash
pnpm dev              # start dev environment
pnpm build            # build all apps
pnpm lint             # lint all packages
pnpm start:prod       # run production API

pnpm db:migrate       # run dev migrations
pnpm db:deploy        # production migrations
pnpm db:seed          # seed test data

pnpm import-eggs      # import server templates
pnpm verify:prod      # production health check

pnpm --filter @spirit/panel-api test    # API unit tests
pnpm --filter @spirit/panel-web test    # web unit tests
```

After updates on production:

```bash
pnpm db:deploy
sudo systemctl restart spirit-panel-api
```

---

## 📁 Project Structure

```
Spirit-Panel/
├── apps/
│   ├── panel-api          # Fastify API, Prisma, workers, built-in plugins
│   └── panel-web          # React (Vite) frontend
├── packages/
│   ├── shared             # Shared runtime helpers
│   ├── shared-types       # Types shared across API and web
│   └── plugin-sdk         # Plugin contract types and manifests
├── deploy/                # nginx, systemd, env, and Wings templates
├── docs/
├── scripts/               # Installer, egg import, production verify
└── LICENSE
```

---

## 📚 Documentation

| File                    | Purpose                                    |
| ----------------------- | ------------------------------------------ |
| `docs/LOCAL.md`         | Local development setup                    |
| `docs/PRODUCTION.md`    | Deployment guide                           |
| `docs/SECURITY.md`      | Security model & reporting                 |
| `docs/PLUGINS.md`       | Built-in plugins and the plugin SDK        |
| `docs/CHANGELOG.md`     | Release history and versioning scheme      |

Deep-dive engineering notes on FeatherWings crash detection and container state handling also live in `docs/`; both are point-in-time analyses rather than maintained guides.

---

## 🔐 Security

Spirit-Panel is designed for self-hosting environments. You are responsible for securing infrastructure, TLS, and system access.

### Built-in protections

* HttpOnly session cookies (no token storage in localStorage)
* CSP with strict script restrictions
* URL sanitization and safe link validation
* Production environment validation checks
* Secure file path validation (no traversal attacks)
* Restricted branding uploads (no SVG execution risk)

### Your responsibility

* Enable HTTPS in production
* Secure `.env` and rotate secrets regularly
* Restrict admin access and API keys
* Follow `docs/SECURITY.md` guidelines

---

## 📄 License

Licensed under **GNU AGPL-3.0**.

If you modify and run this as a network service, you must provide source access under AGPL terms.
