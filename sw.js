/* Zayn's Play & Learn — offline service worker.
   Cache-first for everything same-origin (html, the 90 voice clips, icons,
   manifest) plus Google Fonts. After the first full visit the app runs with
   no network — important for use in the car / on the go. Bump CACHE to ship
   updates. */
const CACHE = 'zayn-v1';
const CORE = [
  './', 'play.html', 'index.html', 'manifest.webmanifest',
  'apple-touch-icon.png', 'assets/icon-192.png', 'assets/icon-512.png',
  'assets/audio/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))).catch(() => {});
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;            // let other requests pass through

  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) {
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
      }
      return res;
    } catch (err) {
      // offline & not cached — nothing we can do, but don't crash
      return cached || Response.error();
    }
  })());
});
