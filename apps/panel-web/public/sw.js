/*
 * Spirit Panel service worker.
 *
 * Exists to make the panel installable and to keep the shell loading on a flaky
 * connection. It deliberately never caches API traffic: this is a live control
 * panel, so serving a stale server state or a stale permission check would be
 * worse than showing an error.
 *
 * The cache name is versioned from the `?v=` query the app registers with, so
 * every release installs a fresh worker and drops the previous caches.
 */

const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const SHELL_CACHE = `spirit-shell-${VERSION}`;
const ASSET_CACHE = `spirit-assets-${VERSION}`;

/** Paths that must always hit the network. */
const NEVER_CACHE = ['/api/', '/wings/', '/health'];

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline</title>
<style>
  body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
    background:#050810;color:#e6e8ef;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
  .box{text-align:center;padding:2rem;max-width:22rem}
  h1{font-size:1.1rem;margin:0 0 .5rem}
  p{font-size:.85rem;line-height:1.5;color:#9aa3b8;margin:0 0 1.25rem}
  button{background:#6366f1;color:#fff;border:0;border-radius:.5rem;
    padding:.6rem 1.1rem;font-size:.85rem;font-weight:600;cursor:pointer}
</style></head>
<body><div class="box">
  <h1>You're offline</h1>
  <p>Spirit Panel needs a connection to manage your servers. Reconnect and try again.</p>
  <button onclick="location.reload()">Retry</button>
</div></body></html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Ignore failures so a missing file never blocks activation.
      await cache.add('/index.html').catch(() => {});
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name.startsWith('spirit-') && !keep.has(name)).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') void self.skipWaiting();
});

/** Hashed build output and icons are immutable, so they are safe to cache forever. */
function isImmutableAsset(url) {
  return url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/');
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone()).catch(() => {});
  return response;
}

/** Navigations: prefer fresh HTML, fall back to the cached shell when offline. */
async function navigate(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('/index.html', response.clone()).catch(() => {});
    return response;
  } catch {
    const cached = (await cache.match('/index.html')) || (await cache.match(request));
    if (cached) return cached;
    return new Response(OFFLINE_HTML, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.some((prefix) => url.pathname.startsWith(prefix))) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigate(request));
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE).catch(() => fetch(request)));
  }
});
