# Security Policy

**Spirit-Panel** is developed by **SpiritFramework**. This document describes how the panel handles security and what operators are responsible for when self-hosting.

---

## Supported versions

Security fixes land on the latest `main` branch. After pulling updates:

1. Run database migrations (`pnpm db:deploy` or `prisma migrate deploy`)
2. Rebuild API and web
3. Restart `spirit-panel-api`

There is no long-term support policy for older commits — stay current.

---

## Reporting a vulnerability

If you find a security issue, **do not** open a public GitHub issue with exploit details or proof-of-concept code.

Contact the repository maintainer privately with:

- Description of the vulnerability
- Steps to reproduce
- Impact assessment (confidentiality, integrity, availability)
- Affected version or commit
- Suggested fix (if you have one)

We aim to acknowledge reports within **72 hours** and provide a status update within **7 days**.

---

## Security model

Spirit-Panel is a **self-hosted** control panel. The software provides baseline protections; **you** secure the host, network, `.env` secrets, and FeatherWings nodes.

| Your responsibility | Why it matters |
|---------------------|----------------|
| TLS, firewall, OS patches | Panel and Wings are high-value targets |
| `apps/panel-api/.env` at mode `600` | Contains DB credentials, JWT secret, encryption key |
| Limit admin / root-admin accounts | Full fleet control |
| Protect Application API keys | Equivalent to admin API access |
| Patch FeatherWings and game nodes | Game workloads run outside the panel process |

---

## Authentication

### Browser sessions

| Property | Behavior |
|----------|----------|
| **Storage** | JWT in HttpOnly `SameSite=Strict` cookie (`spirit_session`). The web UI does **not** store session tokens in `localStorage`. |
| **Transport** | Frontend uses `credentials: 'include'`. In production the cookie is also `Secure`. |
| **Lifetime** | Admin: **24 hours**. Other users: **7 days**. |
| **Revocation** | Password change or reset bumps `token_version` and invalidates all outstanding session JWTs. |
| **2FA** | Optional TOTP with recovery codes; short-lived challenge JWT for the second step. |

The API also accepts `Authorization: Bearer <jwt>` for the same session token (automation/scripts). **API keys** use a separate Bearer format (`sp_<id>.<secret>`). These paths are intentional; browser login does not depend on client-side token storage.

Admin routes require a **session JWT** (`requireSession`), not an API key.

### JWT validation

Session and 2FA challenge tokens are verified with **`jsonwebtoken`**. Before signature verification, the API rejects tokens whose JWS header contains unsupported **`crit`** (critical) extensions (RFC 7515 §4.1.11).

### API keys

| Type | Scope | Notes |
|------|-------|-------|
| **Account** | Owning user's permissions | Bcrypt-hashed at rest; `lastUsedAt` tracked |
| **Application** | Admin automation (billing, provisioning) | Memo required; **90-day** expiry; **60 req/min** in production; **scoped permissions** (`users.read`, `servers.write`, etc.); optional **IP allowlist**; usage audited in admin activity log |

Legacy Application keys with `permissions: null` retain full access until rotated. New keys should be created with explicit scopes. Treat Application keys like root passwords — rotate, revoke when unused, never commit to git or ship in client-side code.

### Login hardening

- Optional **Cloudflare Turnstile** on login and registration (**Admin → Settings**)
- Rate limiting on auth routes (per IP + identifier)
- Account lockout after repeated failed logins (15 minutes)
- **Logout** requires authentication and increments `token_version` to invalidate the session JWT immediately
- JWT verification pins **`HS256`** only
- Optional **block weak passwords** policy (Admin → Settings → Security)
- Production seed blocks weak default admin passwords

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
| `REDIS_PASSWORD` | Required when the schedule worker is enabled (or set `REDIS_ALLOW_INSECURE=true` only for isolated local deployments) |

Generate secrets with:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 32   # APP_KEY
```

Development mode relaxes these checks — do not expose a dev-configured API to the internet.

---

## Network and infrastructure

Recommended production layout:

- **`HOST=127.0.0.1`** — API listens on loopback; Nginx terminates TLS and proxies
- **Public ports** — 22, 80, 443 only on the panel server
- **Do not expose** MariaDB (3306), Redis (6379), or the raw API port (3000)
- **`API_URL`** must exactly match `remote:` in every FeatherWings `config.yml` (HTTPS, no trailing slash)

Additional hardening:

- Disable public registration unless needed (**Admin → Settings → Access**)
- Enable SMTP for password-reset email
- Restrict admin panel access (VPN, IP allowlist, or separate admin hostname)

---

## File manager path safety

Client **file manager** routes validate paths and filenames **before** forwarding to FeatherWings:

- Paths must be absolute (start with `/`)
- Rejects `..`, null bytes, and invalid filename segments

This applies to list, read, write, upload, delete, rename, and related file operations — not to unrelated Wings calls (console, power, install).

---

## Uploads and branding

| Surface | Policy |
|---------|--------|
| **Logo / favicon upload** | SVG **not** accepted. Allowed: PNG, JPEG, WebP, ICO. MIME type and size limits enforced. |
| **App icon upload** | Re-rendered in the browser to a 512×512 PNG before upload, so the stored file is always a canvas-encoded PNG rather than the original bytes. Server accepts PNG only, max 1 MB. |
| **Branding asset serve** | `.svg` files under branding assets return 404 even if present on disk. |
| **Egg logo URL** | Admin-configured **external** HTTPS URL, rendered with `<img>` (not inline SVG). Hosters should trust URLs they set. |

User **avatar** URLs follow the same URL validation rules as other branding fields.

---

## Database hosts

Creating or updating a MySQL database host **always** requires a successful live connection test. There is no “skip verification” flag.

Database passwords and host credentials are encrypted at rest when `APP_KEY` is configured.

---

## FeatherWings remote API

- Daemon authentication compares token secrets with **timing-safe** equality
- Node daemon tokens are rotatable from **Admin → Nodes**
- Panel → Wings and Wings → panel trust boundaries assume TLS on `API_URL`

Operators must secure Wings nodes separately (firewall 8080/2022, TLS for WSS/SFTP as needed). See [PRODUCTION.md](PRODUCTION.md).

---

## Deployment checklist

After install or update:

```bash
cd apps/panel-api
pnpm exec prisma migrate deploy
sudo systemctl restart spirit-panel-api
```

Verify:

```bash
curl -s https://your-panel.example.com/health/ready
pnpm verify:prod
```

Force users to sign in again after deploys that change session or cookie behavior.

---

## Dependencies

- Session verification uses **`jsonwebtoken`** with explicit **`crit`** header validation (`apps/panel-api/src/lib/jwt-crit.ts`).
- Keep dependencies updated (`pnpm install`, review Dependabot alerts).
- Audit with `pnpm --filter @spirit/panel-api audit:security` (fails at moderate severity and above).
- Run production installs with `pnpm install` on the server; avoid copying unverified `node_modules` trees.

---

## Cross-site scripting (XSS) mitigations

The panel UI does not use `dangerouslySetInnerHTML`. User-controlled strings are rendered as React text nodes by default.

| Layer | Mitigation |
|-------|------------|
| **Content-Security-Policy** | `script-src 'self'` plus Cloudflare Turnstile when enabled, with `manifest-src 'self'` and `worker-src 'self'` for the installable app. Delivered via **Nginx/Vite headers** (not `<meta>`). |
| **Strict-Transport-Security** | Nginx (`deploy/nginx/spirit-panel.conf`) and API responses (`security-headers.ts`): `max-age=31536000; includeSubDomains; preload`. |
| **URL sinks** | Avatar, logo, egg icon, support, markdown, and console link URLs are validated client-side (`sanitizeImageSrc` / `sanitizeLinkHref`) and server-side (`safe-url.ts`) — only `http:`/`https:` or same-origin asset paths. |
| **Branding uploads** | SVG blocked; MIME allowlist on upload. |
| **Email template preview** | Sandboxed iframe (`sandbox=""`) with no script execution. |
| **Session cookies** | HttpOnly + `SameSite=Strict` — stolen tokens via `document.cookie` are blocked. |
| **CSRF** | `SameSite=Strict` session cookies are not sent on cross-site POST requests from other origins. |

A compromised admin account can still change panel settings and email HTML — treat admin access as trusted. XSS from **untrusted** users should not execute script in the panel origin with these controls in place.

Residual risk: a future code path that injects unsanitized HTML or loosens CSP would re-open XSS. Review UI changes that render HTML or accept URLs.

### Header delivery caveat (nginx)

A `location` block that declares **any** `add_header` stops inheriting the server-level ones — nginx does not merge them. The shipped config sets `Cache-Control` on `/sw.js`, `/index.html`, `/assets/`, and `/icons/`, so those blocks re-declare the security headers they need. The `= /index.html` block is the one that matters: every SPA route is served through it, so if it loses its `Content-Security-Policy` line your CSP is effectively off for the whole UI while still appearing correct in the config file.

Verify after any nginx edit:

```bash
curl -sI https://panel.example.com/ | grep -i content-security-policy
```

---

## Service worker

The panel registers a service worker at `/sw.js` to keep the app shell loading on unreliable connections.

| Property | Behavior |
|----------|----------|
| **Scope** | Site root. A worker cannot claim a scope above its own path, so it must stay at `/sw.js`. |
| **What is cached** | Static shell only — `index.html`, hashed `/assets/`, icons. |
| **What is never cached** | `/api/*`, `/wings/*`, and `/health*`. Non-`GET` and cross-origin requests are ignored entirely, so session-scoped and live server data never lands in the cache. |
| **Rollout** | Cache names are versioned from the release the app registers with, and older `spirit-*` caches are deleted on activation. `sw.js` and `index.html` are served `no-cache`, so a new release is picked up on next load rather than pinned by a stale worker. |

Because responses to authenticated API calls are never stored, a shared machine does not retain another user's panel data in the cache storage.

---

## Known limitations

- No bug bounty program at this time
- No independent penetration test has been published
- Security depends on correct operator configuration (production env, TLS, firewall)
- FeatherWings, Docker, and game eggs introduce separate risk outside this codebase
- Malicious **admins** can configure HTML email bodies and external URLs within allowed schemes

---

## License

Spirit-Panel is licensed under the **GNU Affero General Public License v3.0** ([LICENSE](../LICENSE)). Network use of modified versions may require source availability to users under AGPL terms.
