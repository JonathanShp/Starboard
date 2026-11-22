import { h, icon, S, save, route, page, row, group, sec, seg, sheet, toast, idb, uid, shuffle, fmtTime, confirmSheet, promptSheet, haptic, $ } from './core.js';

const M = () => (S.music.tracks ||= []);
const audio = new Audio(); audio.preload = 'auto';
let queue = [], idx = -1, shuf = false, rep = 'off', curUrl = null, sleepT = null, sleepEnd = false;
const cur = () => M().find((t) => t.id === queue[idx]);

async function load(i, autoplay = true) {
  idx = i; const t = cur(); if (!t) return;
  const blob = await idb.get('tracks', t.id); if (!blob) return toast('Track file missing');
  if (curUrl) URL.revokeObjectURL(curUrl);
  curUrl = URL.createObjectURL(blob); audio.src = curUrl;
  if (autoplay) audio.play().catch(() => { });
  if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist || 'Starboard', album: 'Starboard' });
  drawMini();
}
export function playList(ids, start = 0) { queue = shuf ? [ids[start], ...shuffle(ids.filter((_, k) => k !== start))] : [...ids]; load(shuf ? 0 : start); }
const next = (auto) => { if (!queue.length) return; if (auto && rep === 'one') return load(idx); if (idx + 1 < queue.length) load(idx + 1); else if (rep === 'all' || !auto) load(0); else { audio.pause(); drawMini(); } };
const prev = () => { if (audio.currentTime > 3) audio.currentTime = 0; else if (idx > 0) load(idx - 1); };
const toggle = () => { if (!cur()) return; audio.paused ? audio.play() : audio.pause(); };
audio.onended = () => { if (sleepEnd) { sleepEnd = false; drawMini(); return; } next(true); };
audio.onplay = audio.onpause = () => drawMini();
audio.ontimeupdate = () => { const p = $('.mini .prog i'); if (p && audio.duration) p.style.width = (100 * audio.currentTime / audio.duration) + '%'; };
if ('mediaSession' in navigator) { const ms = navigator.mediaSession; ms.setActionHandler('play', () => audio.play()); ms.setActionHandler('pause', () => audio.pause()); ms.setActionHandler('nexttrack', () => next()); ms.setActionHandler('previoustrack', prev); try { ms.setActionHandler('seekto', (e) => audio.currentTime = e.seekTime); } catch { } }

let mini;
function drawMini() {
  const t = cur();
  if (!mini) return;
  mini.style.display = t ? 'flex' : 'none'; if (!t) return;
  mini.replaceChildren(h('button', { class: 'art', onclick: openPlayer, 'aria-label': 'Open player' }, icon('music')), h('button', { class: 't', style: { textAlign: 'left' }, onclick: openPlayer }, h('b', null, t.title), h('span', null, t.artist || 'Your library')),
    h('button', { class: 'iconbtn', onclick: toggle, 'aria-label': audio.paused ? 'Play' : 'Pause' }, icon(audio.paused ? 'playf' : 'pausef')), h('button', { class: 'iconbtn', onclick: () => next(), 'aria-label': 'Next' }, icon('next')), h('div', { class: 'prog' }, h('i')));
}
export function initMusic() { mini = h('div', { class: 'mini', style: { display: 'none' } }); document.body.append(mini); }

function openPlayer() {
  const t = cur(); if (!t) return;
  const range = h('input', { type: 'range', min: 0, max: 1000, value: 0, style: { padding: 0, border: 0, background: 'none', accentColor: 'var(--navy)' }, oninput: (e) => audio.duration && (audio.currentTime = e.target.value / 1000 * audio.duration) });
  const times = h('div', { class: 'flex small muted num', style: { justifyContent: 'space-between' } }, h('span'), h('span'));
  const title = h('div', { class: 'serif', style: { fontSize: '26px', lineHeight: 1.2 } }, t.title), artist = h('div', { class: 'muted' }, t.artist || 'Your library');
  const playB = h('button', { class: 'iconbtn', style: { width: 72, height: 72, background: 'var(--navy)', color: '#F5F0E8' }, onclick: toggle });
  const upd = () => { const c = cur(); if (c) { title.textContent = c.title; artist.textContent = c.artist || 'Your library'; } if (audio.duration) range.value = 1000 * audio.currentTime / audio.duration; times.children[0].textContent = fmtTime(audio.currentTime || 0); times.children[1].textContent = fmtTime(audio.duration || 0); playB.replaceChildren(icon(audio.paused ? 'playf' : 'pausef')); };
  const iv = setInterval(upd, 400); upd();
  const shufB = h('button', { class: 'iconbtn', style: { color: shuf ? 'var(--coral-ink)' : 'var(--ink3)' }, 'aria-label': 'Shuffle', onclick: (e) => { shuf = !shuf; e.currentTarget.style.color = shuf ? 'var(--coral-ink)' : 'var(--ink3)'; toast(shuf ? 'Shuffle on' : 'Shuffle off'); } }, icon('shuffle'));
  const repB = h('button', { class: 'iconbtn', style: { color: rep !== 'off' ? 'var(--coral-ink)' : 'var(--ink3)' }, 'aria-label': 'Repeat', onclick: (e) => { rep = rep === 'off' ? 'all' : rep === 'all' ? 'one' : 'off'; e.currentTarget.style.color = rep !== 'off' ? 'var(--coral-ink)' : 'var(--ink3)'; toast('Repeat: ' + rep); } }, icon('repeat'));
  sheet(null, h('div', { class: 'stack', style: { padding: '8px 8px 0' } },
    h('div', { style: { aspectRatio: '1', maxWidth: 280, width: '70%', margin: '8px auto', borderRadius: 28, background: '#8F63FF', display: 'grid', placeItems: 'center', color: '#F0B9A8' } }, icon('wave', '').cloneNode(true)),
    h('div', null, title, artist), range, times,
    h('div', { class: 'flex', style: { justifyContent: 'space-between' } }, shufB, h('button', { class: 'iconbtn', onclick: prev, 'aria-label': 'Previous' }, icon('prev')), playB, h('button', { class: 'iconbtn', onclick: () => next(), 'aria-label': 'Next' }, icon('next')), repB),
    h('button', { class: 'btn line block', onclick: sleepSheet }, icon('moon'), sleepT || sleepEnd ? 'Sleep timer on' : 'Sleep timer')), { onClose: () => clearInterval(iv) });
  const art = document.querySelector('.sheet svg.i'); if (art) { art.style.width = '40%'; art.style.height = '40%'; }
}
function sleepSheet() {
  const close = sheet('Sleep timer', group(...[[15, '15 minutes'], [30, '30 minutes'], [45, '45 minutes'], [60, '1 hour'], ['end', 'End of this song'], [0, 'Off']].map(([v, l]) => row({ title: l, chev: false, onclick: () => { clearTimeout(sleepT); sleepT = null; sleepEnd = false; if (v === 'end') sleepEnd = true; else if (v) sleepT = setTimeout(() => { fadeOut(); sleepT = null; }, v * 60e3); toast(v ? 'Sleep timer set' : 'Sleep timer off'); close(); } }))));
}
function fadeOut() { const v0 = audio.volume; let k = 0; const iv = setInterval(() => { k++; audio.volume = Math.max(0, v0 * (1 - k / 20)); if (k >= 20) { clearInterval(iv); audio.pause(); audio.volume = v0; } }, 300); }

async function importFiles() {
  const inp = h('input', { type: 'file', accept: 'audio/*', multiple: true });
  inp.onchange = async () => {
    let n = 0;
    for (const f of inp.files) {
      const id = uid(); const base = f.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
      const m = base.match(/^(.+?)\s+-\s+(.+)$/);
      try { await idb.put('tracks', id, f); M().push({ id, title: m ? m[2] : base, artist: m ? m[1] : '', size: f.size, added: Date.now() }); n++; } catch (e) { toast('Storage full — couldn\'t add ' + f.name); break; }
    }
    save(); toast(`Added ${n} song${n === 1 ? '' : 's'}`); dispatchEvent(new HashChangeEvent('hashchange'));
    try { await navigator.storage?.persist?.(); } catch { }
  };
  inp.click();
}
function trackMenu(t, pl) {
  const close = sheet(t.title, group(
    row({ icon: 'plus', title: 'Add to playlist', onclick: () => { close(); setTimeout(() => addToPl(t), 350); } }),
    row({ icon: 'edit', title: 'Rename', onclick: async () => { close(); const n = await promptSheet('Title', { value: t.title }); if (n) { t.title = n; save(); dispatchEvent(new HashChangeEvent('hashchange')); } } }),
    pl ? row({ icon: 'x', title: 'Remove from playlist', onclick: () => { pl.ids = pl.ids.filter((x) => x !== t.id); save(); close(); dispatchEvent(new HashChangeEvent('hashchange')); } }) : null,
    row({ icon: 'trash', tone: 'c', title: 'Delete from device', onclick: async () => { close(); if (await confirmSheet('Delete song?', '"' + t.title + '" will be removed from this device.')) { await idb.del('tracks', t.id); S.music.tracks = M().filter((x) => x !== t); S.music.playlists.forEach((p) => p.ids = p.ids.filter((x) => x !== t.id)); save(); dispatchEvent(new HashChangeEvent('hashchange')); } } }),
  ));
}
function addToPl(t) {
  const close = sheet('Add to playlist', h('div', { class: 'stack' }, group(...S.music.playlists.map((p) => row({ icon: 'list', title: p.name, detail: p.ids.length, chev: false, onclick: () => { if (!p.ids.includes(t.id)) p.ids.push(t.id); save(); toast('Added to ' + p.name); close(); } }))),
    h('button', { class: 'btn primary block', onclick: async () => { close(); const n = await promptSheet('New playlist'); if (n) { S.music.playlists.push({ id: uid(), name: n, ids: [t.id] }); save(); toast('Created ' + n); } } }, 'New playlist')));
}
const songRows = (ids, pl) => ids.length ? group(...ids.map((id, i) => { const t = M().find((x) => x.id === id); if (!t) return null; const playing = cur()?.id === id; return h('div', { class: 'rowi' }, h('button', { class: 'tile ' + (playing ? 'c' : 'n'), onclick: () => playList(ids, i), 'aria-label': 'Play' }, icon(playing ? 'vol' : 'playf')), h('button', { class: 't', style: { textAlign: 'left' }, onclick: () => playList(ids, i) }, h('b', null, t.title), h('span', null, t.artist || ((t.size / 1048576).toFixed(1) + ' MB'))), h('button', { class: 'iconbtn', onclick: () => trackMenu(t, pl), 'aria-label': 'More' }, '···')); })) : null;

route(/^music$/, () => {
  let tab = 'songs';
  const body = h('div');
  const draw = () => {
    if (tab === 'songs') body.replaceChildren(M().length ? h('div', null, h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: () => { shuf = false; playList(M().map((t) => t.id)); } }, icon('playf'), 'Play'), h('button', { class: 'btn', onclick: () => { shuf = true; playList(M().map((t) => t.id), Math.floor(Math.random() * M().length)); } }, icon('shuffle'), 'Shuffle')), h('div', { class: 'gap16' }), songRows(M().map((t) => t.id))) : emptyState());
    else body.replaceChildren(h('div', { class: 'stack' }, S.music.playlists.length ? group(...S.music.playlists.map((p) => row({ icon: 'list', tone: 'n', title: p.name, sub: p.ids.length + ' songs', href: '#/music/pl/' + p.id }))) : h('div', { class: 'empty' }, 'No playlists yet.'), h('button', { class: 'btn line block', onclick: async () => { const n = await promptSheet('New playlist'); if (n) { S.music.playlists.push({ id: uid(), name: n, ids: [] }); save(); draw(); } } }, '+ New playlist')));
  };
  draw();
  return page({ title: 'Music', back: 'today', right: h('button', { class: 'iconbtn', onclick: importFiles, 'aria-label': 'Add songs' }, icon('plus')) },
    seg([['songs', 'Songs'], ['pl', 'Playlists']], tab, (v) => { tab = v; draw(); }), h('div', { class: 'gap16' }), body,
    sec('Background sounds'), group(...[['ocean', 'Ocean waves'], ['rain', 'Rain'], ['brown', 'Brown noise (deep focus)']].map(([k, l]) => row({ icon: 'wave', title: l, chev: false, detail: amb?.k === k ? 'Playing' : '', onclick: (e) => { if (amb?.k === k) { amb.stop(); amb = null; e.currentTarget.querySelector('.d').textContent = ''; } else { amb?.stop(); amb = { k, stop: ambient(k) }; dispatchEvent(new HashChangeEvent('hashchange')); } } }))));
});
let amb = null;
route(/^music\/pl\/(\w+)$/, (id) => {
  const p = S.music.playlists.find((x) => x.id === id); if (!p) return page({ title: 'Playlist', back: 'music' });
  return page({ title: p.name, back: 'music', right: h('button', { class: 'iconbtn', 'aria-label': 'Delete playlist', onclick: async () => { if (await confirmSheet('Delete playlist?', 'Songs stay in your library.')) { S.music.playlists = S.music.playlists.filter((x) => x !== p); save(); history.back(); } } }, icon('trash')) },
    p.ids.length ? h('button', { class: 'btn primary block', onclick: () => playList(p.ids) }, icon('playf'), 'Play') : h('div', { class: 'empty' }, 'Add songs from the Songs list using ···'), h('div', { class: 'gap16' }), songRows(p.ids, p));
});
function emptyState() {
  return h('div', { class: 'card' }, h('div', { class: 'empty', style: { paddingBottom: 12 } }, h('div', { class: 'tile n' }, icon('music')), h('b', null, 'Load music before you sail'), h('p', { class: 'small' }, 'Pick audio files (MP3, M4A, WAV). They\'re stored inside the app and play offline, with lock-screen controls.')),
    h('button', { class: 'btn primary block', onclick: importFiles }, 'Add songs'),
    h('p', { class: 'small muted', style: { marginBottom: 0 } }, h('b', null, 'Free, legal music: '), 'Pixabay Music, YouTube Audio Library, Free Music Archive, Bandcamp (many free/name-your-price albums), or songs you\'ve bought on Amazon/iTunes. Download them on your phone, then tap Add songs.'));
}

// ---------- generated ambient sound ----------
let actx;
export function ambient(kind) {
  actx ||= new AudioContext(); actx.resume();
  const len = 4 * actx.sampleRate, buf = actx.createBuffer(2, len, actx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); let last = 0, b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (kind === 'rain') { b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * .184) * .16; } else { last = (last + .02 * w) / 1.02; d[i] = last * 3.2; } } }
  const src = actx.createBufferSource(); src.buffer = buf; src.loop = true;
  const g = actx.createGain(); g.gain.value = 0;
  let node = src;
  if (kind === 'rain') { const f = actx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 400; node.connect(f); node = f; }
  if (kind === 'ocean') { const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; node.connect(f); node = f; const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 0.35; lfo.connect(lg).connect(g.gain); lfo.start(); }
  node.connect(g).connect(actx.destination); src.start();
  g.gain.linearRampToValueAtTime(kind === 'ocean' ? 0.5 : 0.6, actx.currentTime + 1.5);
  return () => { g.gain.cancelScheduledValues(actx.currentTime); g.gain.setValueAtTime(g.gain.value, actx.currentTime); g.gain.linearRampToValueAtTime(0, actx.currentTime + .6); setTimeout(() => src.stop(), 700); };
}
