// Offline-first service worker: precache everything, serve from cache, update in background.
const V = 'starboard-v7';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'fonts/intertight.woff2',
  'js/app.js', 'js/core.js', 'js/water.js', 'js/howto.js', 'js/study.js', 'js/speak.js', 'js/play.js', 'js/chess-ui.js', 'js/solo.js', 'js/boardgames.js', 'js/bg-opoly.js', 'js/bg-isle.js', 'js/trip.js', 'js/music.js',
  'js/data-study.js', 'js/data-speak.js', 'js/data-party.js', 'js/data-deep.js', 'js/data-openings.js', 'js/pieces.js', 'js/puzzles.js',
  'vendor/chess.js', 'vendor/stockfish-19-lite-single.js', 'vendor/stockfish-19-lite-single.wasm',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => {
    const net = fetch(e.request).then((res) => { if (res.ok && new URL(e.request.url).origin === location.origin) { const cp = res.clone(); caches.open(V).then((c) => c.put(e.request, cp)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
