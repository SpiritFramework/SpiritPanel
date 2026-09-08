/** Shared UI Content-Security-Policy (Nginx + Vite dev server). */
export const PANEL_CSP = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' https: http: data: blob:",
  "connect-src 'self' https://challenges.cloudflare.com wss:",
  "frame-src 'self' https://challenges.cloudflare.com",
  // PWA: manifest is served from /api on this origin; the service worker is /sw.js.
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');
