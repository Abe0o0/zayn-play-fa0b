/* Zayn's Play & Learn — offline service worker.
   Precaches the full app at install: both HTML pages, the model, icons, the
   audio manifest AND all 172 voice clips (~2247 KB total) — so "works
   offline in the car" is true from the first visit, not after every clip has
   been tapped once. Runtime: network-first for HTML + the audio manifest
   (new words show up without a version bump), cache-first for immutable
   assets, plus Google Fonts. Bump CACHE to ship updates.
   AUDIO list below is generated from assets/audio/*.m4a on disk — regenerate
   it when clips are added or removed. */
const CACHE = 'zayn-v8';
const CORE = [
  './', 'play.html', 'index.html', 'zayn-model.js', 'manifest.webmanifest',
  'apple-touch-icon.png', 'assets/icon-192.png', 'assets/icon-512.png',
  'assets/icon-512-maskable.png', 'assets/mascot.png',
  'assets/audio/manifest.json'
];
const AUDIO = [
  'assets/audio/abc-a.m4a', 'assets/audio/abc-b.m4a', 'assets/audio/abc-c.m4a', 'assets/audio/abc-d.m4a',
  'assets/audio/abc-e.m4a', 'assets/audio/abc-f.m4a', 'assets/audio/abc-g.m4a', 'assets/audio/abc-h.m4a',
  'assets/audio/abc-i.m4a', 'assets/audio/abc-j.m4a', 'assets/audio/abc-k.m4a', 'assets/audio/abc-l.m4a',
  'assets/audio/abc-m.m4a', 'assets/audio/abc-n.m4a', 'assets/audio/abc-o.m4a', 'assets/audio/abc-p.m4a',
  'assets/audio/abc-q.m4a', 'assets/audio/abc-r.m4a', 'assets/audio/abc-s.m4a', 'assets/audio/abc-t.m4a',
  'assets/audio/abc-u.m4a', 'assets/audio/abc-v.m4a', 'assets/audio/abc-w.m4a', 'assets/audio/abc-x.m4a',
  'assets/audio/abc-y.m4a', 'assets/audio/abc-z.m4a', 'assets/audio/animals-bee.m4a', 'assets/audio/animals-bird.m4a',
  'assets/audio/animals-cat.m4a', 'assets/audio/animals-cow.m4a', 'assets/audio/animals-dog.m4a', 'assets/audio/animals-duck.m4a',
  'assets/audio/animals-elephant.m4a', 'assets/audio/animals-fish.m4a', 'assets/audio/animals-horse.m4a', 'assets/audio/animals-lion.m4a',
  'assets/audio/animals-monkey.m4a', 'assets/audio/animals-sheep.m4a', 'assets/audio/arabic-bismillah.m4a', 'assets/audio/arabic-hubb.m4a',
  'assets/audio/arabic-kitab.m4a', 'assets/audio/arabic-maa.m4a', 'assets/audio/arabic-masjid.m4a', 'assets/audio/arabic-najmah.m4a',
  'assets/audio/arabic-qamar.m4a', 'assets/audio/arabic-qittah.m4a', 'assets/audio/arabic-salaam.m4a', 'assets/audio/arabic-shams.m4a',
  'assets/audio/arabicnumbers-arbaa.m4a', 'assets/audio/arabicnumbers-ashara.m4a', 'assets/audio/arabicnumbers-ithnan.m4a', 'assets/audio/arabicnumbers-khamsa.m4a',
  'assets/audio/arabicnumbers-sabaa.m4a', 'assets/audio/arabicnumbers-sitta.m4a', 'assets/audio/arabicnumbers-thalatha.m4a', 'assets/audio/arabicnumbers-thamaniya.m4a',
  'assets/audio/arabicnumbers-tisaa.m4a', 'assets/audio/arabicnumbers-wahid.m4a', 'assets/audio/body-baba.m4a', 'assets/audio/body-baby.m4a',
  'assets/audio/body-ear.m4a', 'assets/audio/body-eye.m4a', 'assets/audio/body-foot.m4a', 'assets/audio/body-hair.m4a',
  'assets/audio/body-hand.m4a', 'assets/audio/body-heart.m4a', 'assets/audio/body-mama.m4a', 'assets/audio/body-mouth.m4a',
  'assets/audio/body-nose.m4a', 'assets/audio/body-tooth.m4a', 'assets/audio/colors-blue.m4a', 'assets/audio/colors-brown.m4a',
  'assets/audio/colors-green.m4a', 'assets/audio/colors-orange.m4a', 'assets/audio/colors-pink.m4a', 'assets/audio/colors-purple.m4a',
  'assets/audio/colors-red.m4a', 'assets/audio/colors-yellow.m4a', 'assets/audio/food-apple.m4a', 'assets/audio/food-banana.m4a',
  'assets/audio/food-berry.m4a', 'assets/audio/food-bread.m4a', 'assets/audio/food-carrot.m4a', 'assets/audio/food-cheese.m4a',
  'assets/audio/food-cookie.m4a', 'assets/audio/food-egg.m4a', 'assets/audio/food-grapes.m4a', 'assets/audio/food-milk.m4a',
  'assets/audio/food-orange.m4a', 'assets/audio/food-water.m4a', 'assets/audio/go-bike.m4a', 'assets/audio/go-boat.m4a',
  'assets/audio/go-bus.m4a', 'assets/audio/go-car.m4a', 'assets/audio/go-helicopter.m4a', 'assets/audio/go-plane.m4a',
  'assets/audio/go-train.m4a', 'assets/audio/go-truck.m4a', 'assets/audio/great.m4a', 'assets/audio/hi.m4a',
  'assets/audio/home-ball.m4a', 'assets/audio/home-bed.m4a', 'assets/audio/home-book.m4a', 'assets/audio/home-chair.m4a',
  'assets/audio/home-cup.m4a', 'assets/audio/home-hat.m4a', 'assets/audio/home-key.m4a', 'assets/audio/home-light.m4a',
  'assets/audio/home-shoe.m4a', 'assets/audio/home-spoon.m4a', 'assets/audio/home-teddy.m4a', 'assets/audio/home-toothbrush.m4a',
  'assets/audio/huruf-alif.m4a', 'assets/audio/huruf-ayn.m4a', 'assets/audio/huruf-ba.m4a', 'assets/audio/huruf-daad.m4a',
  'assets/audio/huruf-dal.m4a', 'assets/audio/huruf-dhaa.m4a', 'assets/audio/huruf-dhal.m4a', 'assets/audio/huruf-fa.m4a',
  'assets/audio/huruf-ghayn.m4a', 'assets/audio/huruf-haa.m4a', 'assets/audio/huruf-hah.m4a', 'assets/audio/huruf-jeem.m4a',
  'assets/audio/huruf-kaf.m4a', 'assets/audio/huruf-kha.m4a', 'assets/audio/huruf-lam.m4a', 'assets/audio/huruf-meem.m4a',
  'assets/audio/huruf-noon.m4a', 'assets/audio/huruf-qaf.m4a', 'assets/audio/huruf-ra.m4a', 'assets/audio/huruf-saad.m4a',
  'assets/audio/huruf-seen.m4a', 'assets/audio/huruf-sheen.m4a', 'assets/audio/huruf-ta.m4a', 'assets/audio/huruf-tha.m4a',
  'assets/audio/huruf-tta.m4a', 'assets/audio/huruf-waw.m4a', 'assets/audio/huruf-ya.m4a', 'assets/audio/huruf-zay.m4a',
  'assets/audio/nature-cloud.m4a', 'assets/audio/nature-fire.m4a', 'assets/audio/nature-flower.m4a', 'assets/audio/nature-moon.m4a',
  'assets/audio/nature-rain.m4a', 'assets/audio/nature-snow.m4a', 'assets/audio/nature-star.m4a', 'assets/audio/nature-sun.m4a',
  'assets/audio/nature-tree.m4a', 'assets/audio/nature-wave.m4a', 'assets/audio/numbers-1.m4a', 'assets/audio/numbers-10.m4a',
  'assets/audio/numbers-2.m4a', 'assets/audio/numbers-3.m4a', 'assets/audio/numbers-4.m4a', 'assets/audio/numbers-5.m4a',
  'assets/audio/numbers-6.m4a', 'assets/audio/numbers-7.m4a', 'assets/audio/numbers-8.m4a', 'assets/audio/numbers-9.m4a',
  'assets/audio/shapes-circle.m4a', 'assets/audio/shapes-diamond.m4a', 'assets/audio/shapes-heart.m4a', 'assets/audio/shapes-oval.m4a',
  'assets/audio/shapes-rectangle.m4a', 'assets/audio/shapes-square.m4a', 'assets/audio/shapes-star.m4a', 'assets/audio/shapes-triangle.m4a',
  'assets/audio/tap.m4a', 'assets/audio/tryagain.m4a', 'assets/audio/whereis.m4a', 'assets/audio/yes.m4a',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // NO .catch() here — if precaching fails (flaky network mid-update) the
    // install must fail so the previous, fully-cached SW stays active. A
    // swallowed failure + skipWaiting + activate-deletes-old-cache would
    // leave an EMPTY cache and break a previously-working offline app.
    await c.addAll(CORE.concat(AUDIO).map(u => new Request(u, { cache: 'reload' })));
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

  // network-first for things that change (the HTML + the audio manifest) so
  // newly-added words/clips show up without a version bump; fall back to cache offline.
  const netFirst = sameOrigin &&
    (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('manifest.json'));

  if (netFirst) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        // only cache good responses — a cached 404/error page would be served
        // offline forever, replacing a previously-working cached copy.
        if (res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
        return res;
      } catch (err) {
        return (await caches.match(req)) || (await caches.match('play.html')) || Response.error();
      }
    })());
    return;
  }

  // cache-first for immutable assets (audio clips, icons, fonts)
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) {
        const c = await caches.open(CACHE); c.put(req, res.clone());
      }
      return res;
    } catch (err) {
      return cached || Response.error();
    }
  })());
});
