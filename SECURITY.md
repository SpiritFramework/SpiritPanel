# Security Policy

## Supported versions

Security fixes are applied to the latest `main` branch. Deploy the newest release and run database migrations after pulling updates.

## Reporting a vulnerability

If you discover a security issue, **do not** open a public GitHub issue with exploit details.

Email **security@spirithost.co.uk** (or your fork maintainer) with:

- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Your suggested fix (if any)

We aim to acknowledge reports within **72 hours** and provide a status update within **7 days**.

## Security model

Spirit-Panel is a self-hosted game server control panel. You are responsible for:

- Server hardening (firewall, TLS, OS updates)
- Protecting `apps/panel-api/.env` (`chmod 600`)
- Restricting admin access and Application API keys
- Keeping FeatherWings nodes patched

### Authentication

| Mechanism | Notes |
|-----------|--------|
| **Browser sessions** | HttpOnly `SameSite=Strict` cookie (`spirit_session`). Not accessible to JavaScript (mitigates XSS token theft). |
| **JWT lifetime** | Admin: **24 hours**. Users: **7 days**. |
| **Session revocation** | Password change or reset increments `token_version` and invalidates all existing JWTs. |
| **API keys** | Account keys for user automation; Application keys for billing (admin-only). Keys are bcrypt-hashed at rest. |
| **Application keys** | Require a memo, expire after **90 days**, rate-limited to **60 req/min** in production. |

### Production requirements

The API refuses to start in production without:

- Strong `JWT_SECRET` and `APP_KEY` (16+ chars, not placeholders)
- HTTPS `API_URL`
- Non-localhost public URL

Additional recommendations:

- `HOST=127.0.0.1` — API only reachable via Nginx
- Disable public registration (**Admin → Settings → Access**)
- Configure Cloudflare Turnstile for login/register
- Enable SMTP for password reset emails
- Never expose MariaDB (3306), Redis (6379), or API port (3000) publicly

### File and path safety

Client file operations validate paths and filenames before forwarding to FeatherWings (blocks `..` traversal).

### Branding uploads

SVG uploads are **disabled** (XSS risk). Allowed: PNG, JPEG, WebP, ICO.

### Database hosts

MySQL database hosts always require a successful connection test before save (no bypass flag).

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

## Application API keys

Application keys grant **full admin API access**. Treat them like root passwords:

- One key per integration (descriptive memo)
- Rotate before 90-day expiry
- Revoke unused keys immediately
- Never commit keys to git or client-side code

Account API keys are scoped to the owning user's permissions.

## Known limitations

- No bug bounty program at this time
- Professional penetration testing has not been performed
- Operators must secure Wings nodes separately

## License

See repository `LICENSE` (if present) for usage terms.
