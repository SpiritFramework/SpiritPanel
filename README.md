# 🚀 Spirit-Panel

Spirit-Panel is a self-hosted game server control panel built by **SpiritFramework**.

It provides a modern web interface for managing users, nodes, game servers, and infrastructure — similar in scope to Pterodactyl, but designed specifically for **FeatherWings** daemons running on separate game nodes.

> ⚠️ The panel runs only the control plane (web + API). Game servers are never hosted on the panel machine. All Docker workloads are executed on FeatherWings nodes.

---

## ✨ Features

### 🛠️ Administration

* Multi-node fleet management (locations, allocations, capacity, diagnostics)
* User accounts, roles, suspensions, SSH keys, and API keys
* Server provisioning with nests/eggs and resource limits
* Unlimited resources when set to `0` (CPU, RAM, disk, IO, swap)
* Backups, schedules, MySQL databases, and marketplace integration
* Branding system, announcements, SMTP/mail configuration, and audit logs

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

---

### 🌐 Platform

* Pterodactyl-compatible remote API for FeatherWings
* Application API for automation and integrations
* HttpOnly session authentication with optional 2FA
* API key system for external services
* Production environment validation and safety checks

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

On Ubuntu 24.04+:

```bash
pnpm install
pnpm spirit-install --production --api-url https://panel.example.com
```

This installer:

* creates database schema
* generates `.env`
* builds frontend + backend
* creates admin user

> ⚠️ Save generated credentials. Do not run as root.

Full guide: `docs/PRODUCTION.md`

---

## 🧰 Commands

```bash
pnpm dev              # start dev environment
pnpm build            # build all apps
pnpm start:prod       # run production API

pnpm db:migrate       # run dev migrations
pnpm db:deploy        # production migrations
pnpm db:seed         # seed test data

pnpm import-eggs      # import server templates
pnpm verify:prod      # production health check
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
│   ├── panel-api
│   └── panel-web
├── packages/
│   ├── shared
│   └── shared-types
├── deploy/
├── docs/
├── scripts/
└── SECURITY.md
```

---

## 📚 Documentation

| File                 | Purpose                    |
| -------------------- | -------------------------- |
| `docs/LOCAL.md`      | Local development setup    |
| `docs/PRODUCTION.md` | Deployment guide           |
| `SECURITY.md`        | Security model & reporting |

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
* Follow `SECURITY.md` guidelines

---

## 📄 License

Licensed under **GNU AGPL-3.0**.

If you modify and run this as a network service, you must provide source access under AGPL terms.
