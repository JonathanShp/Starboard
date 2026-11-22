import { sfx, say, enVoices } from './core.js';
import { h, icon, S, save, route, render, page, row, group, ftile, sec, sheet, toast, go, search, addSearch, seg, replaceState, confirmSheet, $ } from './core.js';
import { dueCount, seedDecks } from './study.js';
import { tripInfo, ensureTrip } from './trip.js';
import { topicOfDay } from './speak.js';
import './play.js';
import './chess-ui.js';
import './solo.js';
import './boardgames.js';
import { initMusic } from './music.js';
import { startWater } from './water.js';

startWater();
// soft tap sound on anything pressable
document.addEventListener('click', (e) => { const b = e.target.closest?.('button, a[href], [role=button]'); if (b && !b.disabled && !b.closest('.board, .opboard, .isboard')) sfx.tap(); }, true);

seedDecks();
ensureTrip();

// ---- tab bar ----
const TABS = [['today', 'Today', 'today'], ['study', 'Study', 'study'], ['speak', 'Speak', 'speak'], ['play', 'Play', 'play'], ['trip', 'Trip', 'trip']];
document.body.append(h('div', { class: 'tabbar' }, h('nav', { 'aria-label': 'Main' }, TABS.map(([id, label, ic]) => h('a', { href: '#/' + id, 'data-tab': id }, icon(ic), h('span', null, label))))));

// ---- swipe between tabs ----
(() => {
  const ids = TABS.map((t) => t[0]); const view = document.getElementById('view'); let sw = null;
  const hScroll = (el) => { for (; el && el !== document.body; el = el.parentElement) { if (el.scrollWidth > el.clientWidth + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowX)) return true; } return false; };
  const reset = (anim) => { view.style.transition = anim ? 'transform .22s ease, opacity .22s ease' : ''; view.style.transform = ''; view.style.opacity = ''; };
  addEventListener('touchstart', (e) => {
    sw = null; if (e.touches.length !== 1) return; const t = e.touches[0]; const path = location.hash.replace(/^#\/?/, '').split('?')[0] || 'today';
    if (!ids.includes(path) || t.clientX < 28 || t.clientX > innerWidth - 28 || t.clientY > innerHeight - 96) return;
    if (document.querySelector('.scrim, .fullgame') || e.target.closest('input, textarea, select, .chips, .seg, .board, .opboard, .isboard, canvas, svg, .dial, .draw, [data-noswipe]') || hScroll(e.target)) return;
    sw = { x: t.clientX, y: t.clientY, t: performance.now(), lock: null, i: ids.indexOf(path) };
  }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (!sw) return; const t = e.touches[0]; const dx = t.clientX - sw.x, dy = t.clientY - sw.y;
    if (!sw.lock) { if (Math.hypot(dx, dy) < 12) return; sw.lock = Math.abs(dx) > Math.abs(dy) * 1.8 ? 'x' : 'y'; if (sw.lock === 'y') { sw = null; return; } }
    const next = sw.i + (dx < 0 ? 1 : -1); const edge = next < 0 || next >= ids.length;
    view.style.transition = ''; view.style.transform = `translateX(${dx * (edge ? 0.12 : 0.45)}px)`; view.style.opacity = String(1 - Math.min(0.35, Math.abs(dx) / innerWidth * 0.6));
  }, { passive: true });
  addEventListener('touchend', (e) => {
    if (!sw || sw.lock !== 'x') { sw = null; return; } const t = e.changedTouches[0]; const dx = t.clientX - sw.x; const v = Math.abs(dx) / (performance.now() - sw.t);
    const next = sw.i + (dx < 0 ? 1 : -1); sw = null;
    if (next >= 0 && next < ids.length && (Math.abs(dx) > innerWidth * 0.35 || (Math.abs(dx) > 70 && v > 0.45))) {
      view.style.transition = 'transform .14s ease-in, opacity .14s'; view.style.transform = `translateX(${dx < 0 ? -40 : 40}px)`; view.style.opacity = '0';
      setTimeout(() => { location.hash = '#/' + ids[next]; view.style.transition = ''; view.style.transform = `translateX(${dx < 0 ? 40 : -40}px)`; requestAnimationFrame(() => requestAnimationFrame(() => reset(true))); }, 140);
    } else reset(true);
  }, { passive: true });
  addEventListener('touchcancel', () => { sw = null; reset(true); }, { passive: true });
})();

// ---- shortcuts registry for pins ----
export const SHORTCUTS = {
  'study/review': { icon: 'cards', tone: 'b', title: 'Review cards', sub: 'Due flashcards' },
  'study/phrases': { icon: 'globe', tone: 'b', title: 'Phrasebook', sub: 'Spanish for port days' },
  'speak/spin': { icon: 'wheel', tone: 'c', title: 'Spin a topic', sub: 'Impromptu practice' },
  'speak/lessons': { icon: 'bulb', tone: 'c', title: 'Speaking tips', sub: 'Lessons & drills' },
  'play/chess': { icon: 'knight', tone: 'g', title: 'Chess', sub: 'Play, learn, puzzles' },
  'play/party': { icon: 'users', tone: 'y', title: 'Party games', sub: '21 games, one phone' },
  'play/solo': { icon: 'grid', tone: 'g', title: 'Solo puzzles', sub: 'Sudoku, 2048, words' },
  'trip/journal': { icon: 'pen', tone: 'k', title: 'Journal', sub: 'Today\'s entry' },
  'trip/tools': { icon: 'calc', tone: 'y', title: 'Tools', sub: 'Money, tips, timer' },
  'music': { icon: 'music', tone: 'p', title: 'Music', sub: 'Your library' },
  'trip/packing': { icon: 'bag', tone: 'y', title: 'Packing list', sub: 'Don\'t forget stuff' },
};

function greeting() { const hr = new Date().getHours(); return hr < 5 ? 'Late night' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'; }

route(/^today$/, () => {
  const t = tripInfo();
  const due = dueCount();
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const split = (b) => b.startsWith('Sails in ') ? ['Sails in', b.slice(9)] : [null, b];
  const [k2, big] = split(t.big);
  const di = Math.floor((new Date() - new Date(S.trip.start + 'T00:00')) / 864e5);
  const days = h('div', { class: 'days' }, S.trip.days.map((_, i) => h('b', { class: i < di ? 'on' : i === di ? 'now' : '' })));
  const hero = h('a', { class: 'hero', href: '#/trip', style: { display: 'block', textDecoration: 'none' } },
    h('div', { class: 'k' }, k2 ? k2 + ' · ' + t.sub.split(' · ')[0] : t.kicker), h('div', { class: 'big' }, big), h('div', { class: 'sub' }, k2 ? t.kicker : t.sub), days);
  if (t.ticking) { const el = hero.querySelector('.big'); const iv = setInterval(() => { if (!el.isConnected) return clearInterval(iv); el.textContent = split(tripInfo().big)[1]; }, 30000); }
  const tile = (cls, href, ic, title, sub, extra) => h('a', { class: 't ' + cls, href }, h('div', { class: 'ic' }, icon(ic)), extra || h('div', null, h('b', null, title), h('span', null, sub)));
  const BENTO = ['study/review', 'speak/spin', 'play/chess', 'play/party'];
  let pins = S.pins.filter((p) => SHORTCUTS[p] && !BENTO.includes(p));
  if (!pins.length) pins = ['music', 'trip/journal', 'play/solo', 'trip/packing'];
  return h('div', { class: 'fade-in' },
    h('div', { class: 'top' }, h('div', { class: 'mark' }, h('i'), 'Starboard'),
      h('div', { class: 'acts' }, h('button', { onclick: openSearch, 'aria-label': 'Search everything' }, icon('search')), h('a', { href: '#/settings', 'aria-label': 'Settings' }, icon('gear')))),
    h('h1', { class: 'ltitle' }, greeting()),
    h('p', { class: 'lsub' }, date + (S.streak.n > 1 ? ` · ${S.streak.n}-day streak` : '')),
    hero,
    h('div', { class: 'bento' },
      tile('tall c-blue', due ? '#/study/review' : '#/study', 'cards', '', '', h('div', null,
        h('div', { class: 'n' }, String(due)), h('b', null, due === 1 ? 'Card due' : 'Cards due'), h('span', null, due ? 'About ' + Math.max(1, Math.round(due * 8 / 60)) + ' min' : 'All caught up'),
        h('span', { class: 'go' }, icon('playf'), due ? 'Start' : 'Learn new'))),
      tile('c-coral', '#/speak/spin', 'speak', 'Speak', 'Spin a topic'),
      tile('c-green', '#/play/chess', 'knight', 'Chess', 'Puzzle #' + ((S.chess.puzzle || 0) + 1)),
      tile('wide c-yellow', '#/play/party', 'users', '', '', h('div', null, h('b', null, 'Party games'), h('span', null, '21 games · one phone'))),
    ),
    sec('Pinned', h('button', { onclick: editPins }, 'Edit')),
    h('div', { class: 'row2' }, pins.map((p) => ftile({ ...SHORTCUTS[p], href: '#/' + p }))),
  );
});

function editPins() {
  const list = h('div', { class: 'group' });
  const draw = () => list.replaceChildren(...Object.entries(SHORTCUTS).map(([k, v]) => {
    const on = S.pins.includes(k);
    return h('button', { class: 'rowi', onclick: () => { S.pins = on ? S.pins.filter((x) => x !== k) : [...S.pins, k]; save(); draw(); } },
      h('div', { class: 'tile ' + v.tone }, icon(v.icon)), h('div', { class: 't' }, h('b', null, v.title), h('span', null, v.sub)),
      h('div', { class: 'check' + (on ? ' on' : '') }, on ? icon('check') : null));
  }));
  draw();
  sheet('Pinned shortcuts', list, { onClose: render });
}

// ---- global search ----
addSearch(
  { t: 'Flashcards', s: 'Study · all decks', href: '#/study', i: 'cards' }, { t: 'Review due cards', s: 'Study', href: '#/study/review', i: 'cards' }, { t: 'Import a vocab list', s: 'Study · paste words', href: '#/study/import', i: 'ul' },
  { t: 'Spanish phrasebook', s: 'Study', href: '#/study/phrases', i: 'globe' }, { t: 'Focus timer', s: 'Study · Pomodoro + sounds', href: '#/study/focus', i: 'timer' },
  { t: 'Spin a topic', s: 'Speak · random presentation', href: '#/speak/spin', i: 'wheel' }, { t: 'Speaking lessons', s: 'Speak · tips', href: '#/speak/lessons', i: 'bulb' }, { t: 'Speaking drills', s: 'Speak', href: '#/speak/lessons', i: 'bolt' }, { t: 'Recordings', s: 'Speak · your talks', href: '#/speak/history', i: 'mic' }, { t: 'Judge mode', s: 'Speak · friends score you', href: '#/speak/judge', i: 'users' },
  { t: 'Chess vs computer', s: 'Play · chess', href: '#/play/chess/game/ai', i: 'knight' }, { t: 'Chess vs friend', s: 'Play · same device', href: '#/play/chess/game/friend', i: 'knight' }, { t: 'Chess openings', s: 'Play · learn & drill', href: '#/play/chess/openings', i: 'book' }, { t: 'Chess puzzles', s: 'Play · tactics', href: '#/play/chess/puzzles', i: 'target' },
  { t: 'Party games', s: 'Play · 12 games', href: '#/play/party', i: 'users' }, { t: 'Solo puzzles', s: 'Play · Sudoku, 2048, Word, Mines', href: '#/play/solo', i: 'grid' },
  { t: 'Itinerary', s: 'Trip · ports & all-aboard', href: '#/trip', i: 'ship' }, { t: 'Packing list', s: 'Trip', href: '#/trip/packing', i: 'bag' }, { t: 'Journal', s: 'Trip', href: '#/trip/journal', i: 'pen' }, { t: 'Currency converter', s: 'Trip · tools', href: '#/trip/tools/currency', i: 'wallet' }, { t: 'Tip calculator', s: 'Trip · tools', href: '#/trip/tools/tip', i: 'calc' }, { t: 'Timer & stopwatch', s: 'Trip · tools', href: '#/trip/tools/timer', i: 'clock' }, { t: 'Ship info & cabin numbers', s: 'Trip', href: '#/trip/info', i: 'anchor' },
  { t: 'Music', s: 'Your offline library', href: '#/music', i: 'music' }, { t: 'Settings & backup', s: 'Move data phone ↔ computer', href: '#/settings', i: 'gear' },
);
function openSearch() {
  const inp = h('input', { placeholder: 'Games, decks, tools…', 'aria-label': 'Search' });
  const res = h('div', { class: 'group plain' });
  const draw = () => {
    const q = inp.value.trim().toLowerCase();
    const deckItems = S.decks.map((d) => ({ t: d.name, s: 'Deck · ' + d.section, href: '#/study/deck/' + d.id, i: 'cards' }));
    const items = [...search, ...deckItems].filter((x) => !q || (x.t + ' ' + x.s).toLowerCase().includes(q)).slice(0, 30);
    res.replaceChildren(...items.map((x) => h('a', { class: 'rowi', href: x.href, onclick: () => close() }, h('div', { class: 'tile' }, icon(x.i)), h('div', { class: 't' }, h('b', null, x.t), h('span', null, x.s)))));
    if (!items.length) res.replaceChildren(h('div', { class: 'empty' }, 'Nothing found'));
  };
  inp.oninput = draw; draw();
  const close = sheet('Search', h('div', { class: 'stack' }, inp, res));
  setTimeout(() => inp.focus(), 280);
}

// ---- settings ----
route(/^settings$/, () => page({ title: 'Settings', back: 'today' },
  sec('Party games content'),
  h('div', { class: 'card' }, seg([['family', 'Family'], ['friends', 'Friends']], S.party.mode, (v) => { S.party.mode = v; save(); }),
    h('p', { class: 'small muted', style: { margin: '10px 2px 0' } }, 'Friends mode adds roast-y, edgier prompts.')),
  sec('Sound'),
  h('div', { class: 'card stack' }, h('b', null, 'Sound effects'), seg([[true, 'On'], [false, 'Off']], S.sound !== false, (v) => { S.sound = v; save(); if (v) sfx.ok(); }),
    h('b', null, 'Narrator voice'), (() => { const sel = h('select', { onchange: () => { S.voice = sel.value; save(); say('Hello, I will be your narrator tonight.'); } }); const fill = () => { const vs = enVoices(); sel.replaceChildren(h('option', { value: '' }, 'Automatic'), ...vs.map((v) => h('option', { value: v.name, selected: v.name === S.voice }, v.name + (v.localService ? '' : ' (online)')))); }; fill(); speechSynthesis?.addEventListener?.('voiceschanged', fill); return sel; })(),
    h('p', { class: 'small muted', style: { margin: 0 } }, 'Used by Mafia and other games that read aloud. Offline voices work at sea.')),
  sec('Phone ↔ computer'),
  group(
    row({ icon: 'dl', tone: 'n', title: 'Export backup', sub: 'Decks, progress, journal, trip', onclick: exportData }),
    row({ icon: 'ul', title: 'Import backup', sub: 'Replace this device\'s data', onclick: importData }),
  ),
  h('p', { class: 'small dim', style: { margin: '8px 6px' } }, 'There\'s no internet at sea, so devices don\'t sync. Export on one device, send the file over Bluetooth or USB, and import it on the other. Music and recordings stay on each device.'),
  sec('Share Starboard'),
  group(row({ icon: 'users', tone: 'c', title: 'Share the app', sub: APP_URL.replace('https://', ''), onclick: shareApp })),
  h('p', { class: 'small dim', style: { margin: '8px 6px' } }, 'Friends open the link once while online, then tap Install. Everyone gets their own copy, and nobody sees your decks or progress.'),
  sec('Install'),
  h('div', { class: 'card small muted' }, h('p', { style: { marginTop: 0 } }, h('b', null, 'Android: '), 'Chrome menu ⋮ → "Add to Home screen" → Install. Open it once while online and it works offline after that.'), h('p', { style: { marginBottom: 0 } }, h('b', null, 'Computer: '), 'Chrome or Edge → install icon in the address bar.')),
  sec('Data'),
  group(row({ icon: 'trash', tone: 'c', title: 'Reset everything', sub: 'Deletes all progress on this device', onclick: async () => { if (await confirmSheet('Reset everything?', 'All decks, progress, journal and settings on this device will be erased. This can\'t be undone.', 'Reset')) { localStorage.clear(); location.reload(); } } })),
  h('p', { class: 'small dim center', style: { marginTop: 24 } }, 'Starboard · Chess engine: Stockfish (GPLv3) · Pieces: cburnett (CC BY-SA) · Rules: chess.js'),
));
const APP_URL = 'https://jonathanshp.github.io/Starboard/';
async function shareApp() {
  const data = { title: 'Starboard', text: 'Offline app with flashcards, chess, party games and speaking practice. Open once, tap Install:', url: APP_URL };
  try { if (navigator.share) return await navigator.share(data); } catch { return; }
  try { await navigator.clipboard.writeText(APP_URL); toast('Link copied'); } catch { toast(APP_URL); }
}
function exportData() {
  const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: 'starboard-backup-' + new Date().toISOString().slice(0, 10) + '.json' });
  document.body.append(a); a.click(); a.remove(); toast('Backup saved to Downloads');
}
function importData() {
  const inp = h('input', { type: 'file', accept: 'application/json,.json' });
  inp.onchange = async () => {
    try { const obj = JSON.parse(await inp.files[0].text()); if (!obj.decks) throw 0; if (await confirmSheet('Replace data?', 'This replaces everything on this device with the backup.', 'Replace', false)) { replaceState(obj); location.reload(); } }
    catch { toast('That file isn\'t a Starboard backup'); }
  };
  inp.click();
}

initMusic();
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:' && location.hostname !== 'localhost') {
  // When a new version takes over, reload once so the update shows right away.
  const had = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => { });
}
