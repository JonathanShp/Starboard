// Core: DOM helper, state, router, UI primitives, icons, IndexedDB.
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const rand = (n) => Math.floor(Math.random() * n);
export const pick = (a) => a[rand(a.length)];
export const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const fmtTime = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
export const todayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

// Skip null/false/'' children everywhere (lets views use `cond ? el : null` freely)
const _rc = Element.prototype.replaceChildren, _ap = Element.prototype.append;
Element.prototype.replaceChildren = function (...k) { return _rc.apply(this, k.flat(Infinity).filter((x) => x != null && x !== false && x !== '')); };
Element.prototype.append = function (...k) { return _ap.apply(this, k.flat(Infinity).filter((x) => x != null && x !== false && x !== '')); };
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k in el && k !== 'list' && k !== 'type') { try { el[k] = v; } catch { el.setAttribute(k, v); } }
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}

// ---------- icons (24px stroke set) ----------
const P = {
  today: '<path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  study: '<rect x="3" y="5" width="13" height="15" rx="2.5"/><path d="M8 3h11a2 2 0 0 1 2 2v12"/><path d="M7 10h5M7 14h3"/>',
  speak: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>',
  play: '<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7 10.5v4M5 12.5h4"/><circle cx="15.5" cy="11.5" r=".9" fill="currentColor"/><circle cx="18" cy="14" r=".9" fill="currentColor"/>',
  trip: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  music: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  chev: '<path d="m9 6 6 6-6 6"/>', back: '<path d="m15 5-7 7 7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  playf: '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
  pausef: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
  next: '<path d="M5 5v14l10-7z" fill="currentColor"/><path d="M19 5v14"/>', prev: '<path d="M19 5v14L9 12z" fill="currentColor"/><path d="M5 5v14"/>',
  shuffle: '<path d="M3 7h3.5c5 0 6 10 11 10H21M3 17h3.5c1.7 0 2.9-1.2 3.9-2.8M13.6 9.8c1-1.6 2.2-2.8 3.9-2.8H21"/><path d="m18 4 3 3-3 3M18 14l3 3-3 3"/>',
  repeat: '<path d="M4 11V9a3 3 0 0 1 3-3h13M17 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H4M7 21l-3-3 3-3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3"/>',
  cards: '<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v13"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1Zm6 0a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
  wheel: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>',
  knight: '<path d="M7 21h11M8 21c0-3 1-5 3-7-2 0-4 1-5 2l-1.5-2c2-3 3.5-6 7.5-9l1-2 1 2c3 1 4.5 4.5 4.5 9.5V21"/><circle cx="12.5" cy="8" r=".8" fill="currentColor"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
  pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 12H3a9 9 0 0 0 18 0h-2M8 10h8"/>',
  ship: '<path d="M3 17l2 4h14l2-4-9-3z"/><path d="M6 15V9h12v6M12 4v5"/>', wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2"/>',
  note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>', mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>', rec: '<circle cx="12" cy="12" r="6" fill="currentColor"/>',
  flip: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/>', undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>', moon: '<path d="M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10Z"/>',
  wave: '<path d="M2 12c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3M2 17c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  dl: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', ul: '<path d="M12 15V3M7 8l5-5 5 5M5 21h14"/>',
  vol: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>', list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  pin: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11Z"/><circle cx="12" cy="10" r="2.2"/>', bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
};
export const icon = (n, cls = '') => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'i ' + cls); s.innerHTML = P[n] || P.sparkle; return s; };

// ---------- state ----------
const KEY = 'starboard.v1';
const DEF = { decks: [], cards: {}, reviews: {}, speak: { log: [], players: [] }, chess: { level: 3, guard: true, games: [], puzzle: 0, opDone: {} }, trip: null, journal: {}, pins: ['study/review', 'speak/spin', 'play/chess', 'play/party'], party: { mode: 'friends', players: [] }, solo: {}, music: { playlists: [], vol: 1 }, streak: { last: '', n: 0 }, seeded: 0 };
export let S;
try { S = Object.assign(structuredClone(DEF), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { S = structuredClone(DEF); }
let saveT;
export const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Storage is full — export a backup'); } }, 150); };
export const replaceState = (obj) => { S = Object.assign(structuredClone(DEF), obj); localStorage.setItem(KEY, JSON.stringify(S)); };
export function markActive() { const t = todayKey(); if (S.streak.last === t) return; const y = todayKey(new Date(Date.now() - 864e5)); S.streak.n = S.streak.last === y ? S.streak.n + 1 : 1; S.streak.last = t; save(); }

// ---------- IndexedDB (audio, recordings) ----------
let dbp;
const db = () => dbp ||= new Promise((res, rej) => { const r = indexedDB.open('starboard', 1); r.onupgradeneeded = () => { r.result.createObjectStore('tracks'); r.result.createObjectStore('recs'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const tx = async (store, mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(store, mode); const r = fn(t.objectStore(store)); t.oncomplete = () => res(r?.result); t.onerror = () => rej(t.error); }); };
export const idb = {
  put: (s, k, v) => tx(s, 'readwrite', (o) => o.put(v, k)),
  get: (s, k) => tx(s, 'readonly', (o) => o.get(k)),
  del: (s, k) => tx(s, 'readwrite', (o) => o.delete(k)),
  keys: (s) => tx(s, 'readonly', (o) => o.getAllKeys()),
};

// ---------- feedback ----------
export const haptic = (p = 10) => { try { navigator.vibrate?.(p); } catch { } };
let toastEl, toastT;
export function toast(msg) {
  toastEl ||= document.body.appendChild(h('div', { class: 'toast', role: 'status' }));
  toastEl.textContent = msg; toastEl.classList.add('in'); clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('in'), 2200);
}
export function sheet(title, body, opts = {}) {
  const scrim = h('div', { class: 'scrim' });
  const el = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Sheet' }, h('div', { class: 'grab' }), title ? h('h3', null, title) : null, body);
  const close = () => { scrim.classList.remove('in'); el.classList.remove('in'); setTimeout(() => { scrim.remove(); el.remove(); }, 320); opts.onClose?.(); document.removeEventListener('keydown', esck); };
  const esck = (e) => e.key === 'Escape' && close();
  scrim.onclick = close; document.addEventListener('keydown', esck);
  // swipe down to dismiss
  let y0 = null; el.addEventListener('touchstart', (e) => { if (el.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchmove', (e) => { if (y0 == null) return; const dy = e.touches[0].clientY - y0; if (dy > 0) el.style.transform = `translateY(${dy}px)`; }, { passive: true });
  el.addEventListener('touchend', (e) => { if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0; el.style.transform = ''; y0 = null; if (dy > 110) close(); });
  document.body.append(scrim, el); requestAnimationFrame(() => { scrim.classList.add('in'); el.classList.add('in'); });
  return close;
}
export function confirmSheet(title, msg, okLabel = 'Delete', danger = true) {
  return new Promise((res) => {
    let done = false;
    const close = sheet(title, h('div', null, h('p', { class: 'muted', style: { margin: '0 4px 18px' } }, msg),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => { done = true; close(); res(false); } }, 'Cancel'),
        h('button', { class: 'btn ' + (danger ? 'accent' : 'primary'), onclick: () => { done = true; close(); res(true); } }, okLabel))), { onClose: () => !done && res(false) });
  });
}
export function promptSheet(title, { value = '', placeholder = '', multiline = false, ok = 'Save' } = {}) {
  return new Promise((res) => {
    let done = false;
    const inp = multiline ? h('textarea', { placeholder, value }) : h('input', { placeholder, value });
    const go = () => { done = true; close(); res(inp.value.trim()); };
    if (!multiline) inp.onkeydown = (e) => e.key === 'Enter' && go();
    const close = sheet(title, h('div', { class: 'stack' }, inp, h('button', { class: 'btn primary block', onclick: go }, ok)), { onClose: () => !done && res(null) });
    setTimeout(() => inp.focus(), 300);
  });
}

// ---------- page scaffolding ----------
// page({title, sub, back, right, large}) → element with sticky navbar + optional large title
export function page({ title, sub, back, right, large = true }, ...content) {
  const nav = h('div', { class: 'navbar' + (large ? '' : ' always') },
    h('div', { class: 'nb' }, back ? h('button', { class: 'nb', style: { padding: '8px 4px', minWidth: 0 }, onclick: () => (typeof back === 'function' ? back() : history.length > 1 && lastWasInternal ? history.back() : go(back)), 'aria-label': 'Back' }, icon('back'), h('span', null, 'Back')) : null),
    h('div', { class: 'nt' }, title),
    h('div', { class: 'nb r' }, right || null));
  const el = h('div', { class: 'fade-in' }, nav, large ? h('h1', { class: 'ltitle' }, title) : null, large && sub ? h('p', { class: 'lsub' }, sub) : null, ...content);
  return el;
}
export const row = ({ icon: ic, tone = '', title, sub, detail, href, onclick, chev = true }) =>
  h(href ? 'a' : 'button', { class: 'rowi', href, onclick },
    ic ? h('div', { class: 'tile ' + tone }, icon(ic)) : null,
    h('div', { class: 't' }, h('b', null, title), sub ? h('span', null, sub) : null),
    detail != null ? h('div', { class: 'd' }, detail) : null, chev ? icon('chev', 'chev') : null);
export const group = (...rows) => h('div', { class: 'group' }, ...rows);
export const ftile = ({ icon: ic, tone = '', title, sub, href, onclick }) => h(href ? 'a' : 'button', { class: 'ftile', href, onclick }, h('div', { class: 'tile ' + tone }, icon(ic)), h('div', null, h('b', null, title), h('span', null, sub)));
export function seg(options, value, onchange) {
  const el = h('div', { class: 'seg', role: 'tablist' });
  const draw = (v) => { el.replaceChildren(...options.map(([val, label]) => h('button', { class: val === v ? 'on' : '', role: 'tab', 'aria-selected': val === v, onclick: () => { haptic(5); draw(val); onchange(val); } }, label))); };
  draw(value); return el;
}
export const sec = (label, action) => h('div', { class: 'sec' }, h('span', null, label), action || null);

// ---------- router ----------
const routes = [];
const leave = [];
let lastWasInternal = false;
export const route = (re, fn) => routes.push([re, fn]);
export const onLeave = (fn) => leave.push(fn);
export const go = (path) => { lastWasInternal = true; location.hash = '#/' + path.replace(/^#?\/?/, ''); };
export const search = [];
export const addSearch = (...items) => search.push(...items);
const scrollMem = {};
export let Q = new URLSearchParams();
let curPath = '';
export async function render() {
  const [p0, qs] = location.hash.replace(/^#\/?/, '').split('?');
  const path = p0 || 'today';
  Q = new URLSearchParams(qs || '');
  scrollMem[curPath] = scrollY;
  while (leave.length) try { leave.pop()(); } catch (e) { console.error(e); }
  curPath = path;
  const view = $('#view');
  for (const [re, fn] of routes) {
    const m = path.match(re);
    if (m) {
      try { const el = await fn(...m.slice(1).map((x) => x == null ? x : decodeURIComponent(x))); if (curPath !== path) return; view.replaceChildren(el); }
      catch (e) { console.error(e); view.replaceChildren(page({ title: 'Something broke', back: 'today' }, h('p', { class: 'muted' }, String(e)))); }
      break;
    }
  }
  const tab = path.split('/')[0];
  $$('.tabbar a').forEach((a) => { const on = a.dataset.tab === tab; a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  window.scrollTo(0, path.includes('/') ? 0 : scrollMem[path] || 0);
  onScroll();
}
function onScroll() { const nb = $('.navbar'); if (nb) nb.classList.toggle('scrolled', scrollY > 36); }
addEventListener('scroll', onScroll, { passive: true });
addEventListener('hashchange', render);

// ---------- speech ----------
export function speak(text, lang = 'es-ES', rate = 0.92) {
  if (!('speechSynthesis' in window)) return toast('Speech not available');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = rate;
  const v = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith(lang.slice(0, 2)) && v.localService) || speechSynthesis.getVoices().find((v) => v.lang.startsWith(lang.slice(0, 2)));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

// wake lock for timers / games
let wl;
export async function keepAwake(on) { try { if (on && !wl) { wl = await navigator.wakeLock?.request('screen'); } else if (!on && wl) { await wl.release(); wl = null; } } catch { } }

// simple beep (timers)
let actx;
export function beep(freq = 880, dur = 0.15, vol = 0.2) {
  try { actx ||= new AudioContext(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = freq; g.gain.value = vol; o.connect(g).connect(actx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur); o.stop(actx.currentTime + dur + 0.02); } catch { }
}
