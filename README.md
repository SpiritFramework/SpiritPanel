# Spirit-Panel

Game server panel for SpiritHost. The panel runs on Ubuntu; game servers run on separate nodes with **FeatherWings**.

## Documentation

| Guide | Use when |
|-------|----------|
| **[docs/LOCAL.md](docs/LOCAL.md)** | Developing on your machine (Windows, macOS, or Linux) |
| **[docs/PRODUCTION.md](docs/PRODUCTION.md)** | Deploying to a production Ubuntu server |

## Quick start

**Local development**

```bash
./install          # Linux / macOS
./install.ps1      # Windows
pnpm dev
```

Open http://localhost:5173 — login `admin@spirithost.co.uk` / `admin123!`

**Production**

```bash
pnpm install
pnpm spirit-install --production --api-url https://panel.example.com
```

Then follow [docs/PRODUCTION.md](docs/PRODUCTION.md) for systemd, Nginx, TLS, and FeatherWings nodes.

## Install commands

```bash
pnpm spirit-install [options]   # aliases: pnpm setup, ./install, bash scripts/install.sh
pnpm spirit-install --help
```
