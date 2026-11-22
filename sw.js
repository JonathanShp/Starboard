// Offline-first service worker: precache everything, serve from cache, update in background.
const V = 'starboard-v16';
const FILES = ['./', 'js/data-vo.js', 'vo/008dfd0b6e.mp3', 'vo/0604662b93.mp3', 'vo/194465d7e4.mp3', 'vo/1b6f46bddf.mp3', 'vo/1e1d3ae98a.mp3', 'vo/1e4f4de855.mp3', 'vo/1ebd4049f1.mp3', 'vo/250e9465c0.mp3', 'vo/43b0d1aa36.mp3', 'vo/4aa33389c3.mp3', 'vo/608cb9107a.mp3', 'vo/677e7f364c.mp3', 'vo/6fbe96d00e.mp3', 'vo/764fb937a8.mp3', 'vo/7ece68a1fa.mp3', 'vo/80b333fb6a.mp3', 'vo/959d0b2e9c.mp3', 'vo/ad045a79a6.mp3', 'vo/ad74513f44.mp3', 'vo/b0ceb7c3ce.mp3', 'vo/b2be92dfc7.mp3', 'vo/b729e76e17.mp3', 'vo/d273ce7deb.mp3', 'vo/e32a5e21d7.mp3', 'vo/e9762a4330.mp3', 'vo/eeaf91afad.mp3', 'sfx/bad.mp3', 'sfx/bell.mp3', 'sfx/boom.mp3', 'sfx/card.mp3', 'sfx/chip.mp3', 'sfx/coins.mp3', 'sfx/die.mp3', 'sfx/glass.mp3', 'sfx/ok.mp3', 'sfx/pop.mp3', 'sfx/question.mp3', 'sfx/select.mp3', 'sfx/shake.mp3', 'sfx/shuffle.mp3', 'sfx/step.mp3', 'sfx/switch.mp3', 'sfx/tap.mp3', 'sfx/throw.mp3', 'sfx/tick.mp3', 'sfx/win.mp3', 'index.html', 'manifest.webmanifest', 'css/app.css', 'css/table.css', 'js/bgtable.js', 'fonts/intertight.woff2',
  'js/app.js', 'js/core.js', 'js/water.js', 'js/howto.js', 'js/study.js', 'js/speak.js', 'js/play.js', 'js/chess-ui.js', 'js/solo.js', 'js/boardgames.js', 'js/bg-opoly.js', 'js/bg-isle.js', 'js/trip.js', 'js/music.js',
  'js/data-study.js', 'js/data-speak.js', 'js/data-party.js', 'js/data-deep.js', 'js/data-party2.js', 'js/data-openings.js', 'js/pieces.js', 'js/puzzles.js',
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
