/* Gym Tracker -- offline shell cache.
 *
 * Cache-first with background revalidation ("stale-while-revalidate"): a
 * cached request is served immediately (instant load, works with the Termux
 * server stopped or unreachable), while a network fetch runs in parallel and
 * quietly refreshes the cache for next time. Not build-stamp-keyed -- this
 * has no clean way to read gym-tracker.html's internal BUILD constant
 * without fragile text parsing, and doesn't need to: the update-url check in
 * termux/gym-setup.sh's serve.sh is the real update channel (it replaces the
 * installed file and bumps a real page reload), this only keeps the last
 * thing actually loaded available when that channel can't be reached. A
 * single well-known cache name is enough; every successful fetch just
 * overwrites its own cache entry.
 *
 * The app never calls a server API -- storage is Store (localStorage once
 * served over http://), entirely client-side -- so caching the shell bytes
 * is sufficient for full offline function, not just a read-only shell.
 */
const CACHE = 'gym-shell-v1';

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request);
    const network = fetch(e.request).then((res) => {
      if (res && res.ok) cache.put(e.request, res.clone());
      return res;
    }).catch(() => null);

    if (cached) { network; return cached; }
    const fresh = await network;
    return fresh || new Response('Offline, and nothing cached yet -- load this page once while online first.',
      { status: 503, headers: { 'Content-Type': 'text/plain' } });
  })());
});
