/** Security headers applied to API responses. Static UI CSP is set in deploy/nginx and index.html. */
export const API_SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Resource-Policy': 'same-site',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'private, no-cache, no-store, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export const HSTS_HEADER = 'max-age=31536000; includeSubDomains; preload';

export const PANEL_CSP =
  "default-src 'self'; " +
  "script-src 'self' https://challenges.cloudflare.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com; " +
  "img-src 'self' https: http: data: blob:; " +
  "connect-src 'self' https://challenges.cloudflare.com wss:; " +
  "frame-src 'self' https://challenges.cloudflare.com; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'; " +
  "frame-ancestors 'self'";
