/* Gym Tracker -- offline shell cache.
 *
 * Network-first with cache fallback: every request goes to the server, and
 * a good response refreshes the cache; only when the server can't be reached
 * (Termux stopped, phone offline) does the cached copy serve. On localhost a
 * refused connection fails in milliseconds, so this costs nothing when the
 * server is up, and it guarantees a freshly installed build is what loads --
 * the earlier stale-while-revalidate variant would have shown the previous
 * build first and the new one only on the *next* open.
 *
 * The cache is keyed with the query string stripped: the launcher opens
 * gym-tracker.html?v=<timestamp> with a new stamp every tap, so without this
 * the cache would never match offline (and would grow an entry per tap).
 *
 * The app talks to the server only via POST /api/save, which is not GET and
 * passes straight through untouched.
 */
const CACHE = 'gym-shell-v2';
const NET_TIMEOUT_MS = 4000;

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

function cacheKey(request) {
  const u = new URL(request.url);
  u.search = '';
  return new Request(u.toString(), { method: 'GET' });
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = cacheKey(e.request);
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NET_TIMEOUT_MS));
    const fresh = await Promise.race([fetch(e.request).catch(() => null), timeout]);
    if (fresh && fresh.ok) { cache.put(key, fresh.clone()); return fresh; }
    const cached = await cache.match(key);
    if (cached) return cached;
    return fresh || new Response('Offline, and nothing cached yet -- load this page once while online first.',
      { status: 503, headers: { 'Content-Type': 'text/plain' } });
  })());
});
