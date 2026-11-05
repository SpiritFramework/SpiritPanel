# Security Policy

**Spirit-Panel** is developed by **SpiritFramework**. This document is the GitHub security policy for the repository. Operator deployment detail also lives in [`docs/PRODUCTION.md`](docs/PRODUCTION.md).

---

## Supported versions

| Version | Supported |
|---------|-----------|
| Latest GitHub Release (e.g. `V1.3.5.x`) | Yes |
| `main` (unreleased) | Yes — fixes land here first |
| Older tagged releases | No dedicated LTS — upgrade when security releases ship |

After pulling a security update:

1. Apply migrations (`prisma migrate deploy` / `spirit.sh update`)
2. Rebuild API and web if your update path does not already
3. Restart `spirit-panel-api` and reload nginx when the changelog says so

---

## Reporting a vulnerability

**Do not** open a public GitHub issue with exploit details, payloads, or proof-of-concept attack traffic.

Prefer one of:

1. **GitHub Private Vulnerability Reporting** — Security tab → Advisories → Report a vulnerability (when enabled on the repo)
2. **Private contact** with the repository maintainer / SpiritFramework

Include:

- Description of the issue
- Steps to reproduce (minimal)
- Impact (confidentiality / integrity / availability)
- Affected version or commit
- Suggested fix (optional)

We aim to **acknowledge within 72 hours** and give a **status update within 7 days**.

Coordinated testing (load / flood tests against a live host) must be **explicitly authorized** by the operator. Unauthorized attacks are not a valid disclosure channel.

---

## Security model

Spirit-Panel is a **self-hosted** control panel. The software provides baseline protections; **you** secure the host, network, secrets, edge proxy, and FeatherWings nodes.

| Your responsibility | Why it matters |
|---------------------|----------------|
| TLS, firewall, OS patches | Panel and Wings are high-value targets |
| Edge proxy (Cloudflare or similar) for the panel hostname | Stops most Layer-7 HTTPS floods before origin |
| `apps/panel-api/.env` mode `600` | DB credentials, JWT secret, encryption key |
| Limit admin / root-admin accounts | Full fleet control |
| Protect Application API keys | Equivalent to admin API access |
| Patch FeatherWings and game nodes | Game workloads run outside the panel process |
| Host/ISP DDoS scrubbing on node IPs | Multi‑Gbps UDP/PPS is not solved by the panel app |

---

## Threat layers (what protects what)

| Threat | Typical target | What helps |
|--------|----------------|------------|
| Credential stuffing / login abuse | `/api/auth/*` | Turnstile, auth rate limits, lockout |
| Layer-7 TLS / HTTP flood | Panel hostname :443 | Cloudflare (orange cloud), Bot Fight / Managed Challenge, rate-limit rules |
| Origin bypass (hit server IP :443) | Bare panel IP | `ufw-cloudflare-origin.sh` — allow 80/443 from Cloudflare only |
| App overload after traffic reaches nginx | Origin | nginx `limit_req` / `limit_conn`, raised `LimitNOFILE` |
| Volumetric Gbps / high PPS | Node or panel uplink | Host/ISP scrubbing (not nginx/Node) |
| Game port floods | Allocation ports | Expected exposure; host DDoS / separate game nodes |

App rate limits and Turnstile **do not** stop a distributed HTTPS flood by themselves. Origin still pays for TLS if junk reaches nginx.

---

## Recommended production edge (panel)

Ship helpers under `deploy/` (see **V1.3.5.3+**). **Existing installs:** step-by-step upgrade and troubleshooting are in [`docs/PRODUCTION.md` — Cloudflare origin hardening](docs/PRODUCTION.md#cloudflare-origin-hardening-v1353) (do **not** re-run a full `install` just to refresh nginx).

| Piece | Path |
|-------|------|
| nginx rate/conn zones | `deploy/nginx/spirit-panel-http.conf` → `/etc/nginx/conf.d/` |
| Site limits + TLS hardening | `deploy/nginx/spirit-panel.conf` |
| Cloudflare real client IP | `deploy/nginx/cloudflare-realip.conf` / `deploy/firewall/sync-cloudflare-realip.sh` |
| Origin 80/443 → Cloudflare only | `deploy/firewall/ufw-cloudflare-origin.sh` |
| nginx open-file headroom | `deploy/firewall/raise-nginx-nofile.sh` |

### Checklist

1. **Orange-cloud** the panel hostname (Proxied DNS).
2. Cloudflare **Bot Fight / Managed Challenge** and a **rate-limit** rule on the panel host.
3. **WAF Skip** for FeatherWings (do **not** skip managed WAF rulesets unless you must):
   - Match: `/api/remote*`, `/health`, `/api/health`, `/health/ready`
   - Skip: Super Bot Fight / Managed Challenge / rate limiting as needed  
   - Leave **All managed rules** unchecked (avoids disabling php2shell etc. unnecessarily).
4. Install **real-IP** restore so nginx/Fastify see `CF-Connecting-IP`.
5. After the panel works through Cloudflare, run **`ufw-cloudflare-origin.sh`**.
6. Re-open **game ports**, **SFTP (2022)**, and **Wings (8080)** if they live on the same box — the origin script only locks 80/443.
7. Run **`raise-nginx-nofile.sh`** once so floods do not tip nginx into `Too many open files` (HTTP 500 on static assets).
8. Disable Cloudflare **Rocket Loader**, **Email Obfuscation**, and **JS Auto Minify** on the panel hostname — they inject inline scripts that a strict CSP correctly blocks.

Same-box installs (panel + Wings + games): game/SFTP ports make the machine IP public by design. Cloudflare still protects **panel HTTP**; volumetric attacks on the bare IP need **host DDoS protection**.

---

## Authentication

### Browser sessions

| Property | Behavior |
|----------|----------|
| **Storage** | JWT in HttpOnly `SameSite=Strict` cookie (`spirit_session`). The web UI does **not** store session tokens in `localStorage`. |
| **Transport** | Frontend uses `credentials: 'include'`. In production the cookie is also `Secure`. |
| **Lifetime** | Admin: **24 hours**. Other users: **7 days**. |
| **Revocation** | Password change or reset bumps `token_version` and invalidates outstanding session JWTs. |
| **2FA** | Optional TOTP with recovery codes; short-lived challenge JWT for the second step. |

The API also accepts `Authorization: Bearer <jwt>` for the same session token. **API keys** use a separate Bearer format (`sp_<id>.<secret>`). Admin routes require a **session JWT** (`requireSession`), not an API key.

### JWT validation

Session and 2FA challenge tokens use **`jsonwebtoken`**. Tokens whose JWS header contains unsupported **`crit`** extensions are rejected before verification.

### API keys

| Type | Scope | Notes |
|------|-------|-------|
| **Account** | Owning user's permissions | Bcrypt-hashed at rest; `lastUsedAt` tracked |
| **Application** | Admin automation (billing, provisioning) | Memo required; **90-day** expiry; **60 req/min** in production; scoped permissions; optional **IP allowlist**; audited |

Legacy Application keys with `permissions: null` retain full access until rotated. Treat Application keys like root passwords.

### Login hardening

- Optional **Cloudflare Turnstile** (Admin → Settings → Security)
- Rate limiting on auth routes (per IP + identifier)
- Account lockout after repeated failed logins (15 minutes)
- Logout bumps `token_version`
- JWT algorithms pinned to **`HS256`**
- Optional weak-password policy; production seed blocks weak default admin passwords

---

## Production startup checks

When `NODE_ENV=production`, the API **refuses to start** unless:

| Check | Requirement |
|-------|-------------|
| `JWT_SECRET` | 16+ characters; not a placeholder or dev default |
| `APP_KEY` | 16+ characters; not a placeholder; **must differ** from `JWT_SECRET` |
| `DATABASE_URL` | No `CHANGE_ME` placeholder credentials |
| `API_URL` | HTTPS public URL (not `http://`, not localhost) |
| `HOST` | Must not be `0.0.0.0` in production (bind loopback; proxy via Nginx) |
| `REDIS_PASSWORD` | Required when the schedule worker is enabled (or `REDIS_ALLOW_INSECURE=true` only for isolated local use) |

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 32   # APP_KEY
```

---

## Network baseline

- **`HOST=127.0.0.1`** — API on loopback; Nginx terminates TLS
- Do **not** expose MariaDB (3306), Redis (6379), or raw API (3000)
- **`API_URL`** must match `remote:` in every FeatherWings `config.yml` (HTTPS, no trailing slash)
- DNS hygiene: remove unused `temp` / `test` hostnames that publish old backend IPs

---

## File manager path safety

Client file manager routes validate paths **before** FeatherWings:

- Absolute paths only (`/…`)
- Rejects `..`, null bytes, and invalid filename segments

---

## Uploads and branding

| Surface | Policy |
|---------|--------|
| Logo / favicon | No SVG. PNG, JPEG, WebP, ICO; MIME + size limits |
| App icon | Re-rendered to 512×512 PNG client-side; server accepts PNG only, max 1 MB |
| Branding serve | `.svg` under branding assets → 404 |
| Egg logo URL | External HTTPS only; `<img>`, not inline SVG |

---

## Database hosts

Creating or updating a MySQL database host **always** requires a successful live connection test. Credentials are encrypted at rest when `APP_KEY` is set.

---

## FeatherWings remote API

- Daemon token compare is **timing-safe**
- Node tokens rotatable from Admin → Nodes
- Trust assumes TLS on `API_URL`
- Secure nodes separately (firewall game ports / 8080 / 2022). See [`docs/PRODUCTION.md`](docs/PRODUCTION.md)

---

## XSS and browser headers

The UI does not use `dangerouslySetInnerHTML` for user content by default.

| Layer | Mitigation |
|-------|------------|
| **CSP** | `script-src 'self'` + Turnstile (`challenges.cloudflare.com`). Delivered via Nginx/Vite headers |
| **HSTS** | Nginx `max-age=31536000; includeSubDomains; preload` (API skips duplicate HSTS behind `X-Forwarded-Proto`) |
| **server_tokens** | `off` |
| **Origin limits** | nginx `limit_req` / `limit_conn` |
| **URL sinks** | Client + server allow only `http:`/`https:` or same-origin asset paths |
| **Cookies** | HttpOnly + `SameSite=Strict` |
| **CSRF** | Strict cookies are not sent on cross-site POSTs |

### nginx `add_header` caveat

A `location` that sets any `add_header` stops inheriting server-level headers. Blocks that set `Cache-Control` must re-declare CSP and related headers. Verify:

```bash
curl -sI https://panel.example.com/ | grep -i content-security-policy
```

---

## Service worker

| Property | Behavior |
|----------|----------|
| Scope | `/sw.js` at site root |
| Cached | Static shell only (`index.html`, hashed `/assets/`, icons) |
| Never cached | `/api/*`, `/wings/*`, `/health*` |
| Rollout | Versioned cache names; `sw.js` / `index.html` are `no-cache` |

---

## Dependencies

- Keep deps updated; review Dependabot
- `pnpm audit` / `pnpm --filter @spirit/panel-api audit:security`
- Root `pnpm.overrides` may pin transitive fixes; prefer same-major unless verified (see historical notes in the changelog)

---

## Known limitations

- No public bug bounty
- No published independent penetration test
- Security depends on operator configuration (edge, firewall, secrets)
- FeatherWings, Docker, and eggs are separate risk domains
- Malicious **admins** can change branding HTML/email within allowed schemes
- DNS enumeration of game/node hostnames is expected; hide unused records, not playable game IPs

---

## License

GNU Affero General Public License v3.0 — see [LICENSE](LICENSE).
