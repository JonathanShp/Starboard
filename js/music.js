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
    sec('Background sounds'), group(...[['ocean', 'Ocean waves', 'Slow waves on a beach'], ['rain', 'Rain', 'Steady rain with drops'], ['brown', 'Brown noise', 'Deep, smooth rumble for focus and sleep']].map(([k, l, sub]) => row({ icon: amb?.k === k ? 'pausef' : 'wave', tone: amb?.k === k ? 'p' : '', title: l, sub, chev: false, detail: amb?.k === k ? 'Playing' : '', onclick: () => { if (amb?.k === k) { amb.stop(); amb = null; } else { amb?.stop(); amb = { k, stop: ambient(k, S.music.sleep || 0) }; } dispatchEvent(new HashChangeEvent('hashchange')); } }))),
    h('div', { class: 'gap8' }), h('div', { class: 'card', style: { padding: 14 } }, h('b', null, 'Sleep timer'), h('div', { class: 'gap8' }), seg([[0, 'Off'], [15, '15m'], [30, '30m'], [60, '1h'], [120, '2h']], S.music.sleep || 0, (v) => { S.music.sleep = v; save(); if (amb) { const k = amb.k; amb.stop(); amb = { k, stop: ambient(k, v) }; } }), h('p', { class: 'small muted', style: { margin: '8px 2px 0' } }, 'Sounds fade out gently at the end. Starts counting when you press play.')));
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
// Procedural, no audio files. Loops are crossfaded so there's no click at the seam; waves are randomized and
// pre-scheduled on the audio clock (keeps working when the screen is off and timers are throttled).
let actx;
function loopBuf(sec, fill) {
  const sr = actx.sampleRate, L = Math.floor(sec * sr), X = Math.floor(1.5 * sr), buf = actx.createBuffer(2, L - X, sr);
  for (let ch = 0; ch < 2; ch++) { const tmp = new Float32Array(L); fill(tmp, sr); const d = buf.getChannelData(ch);
    for (let i = 0; i < L - X; i++) d[i] = i < X ? tmp[i] * (i / X) + tmp[L - X + i] * (1 - i / X) : tmp[i]; }
  return buf;
}
const brown = (d) => { let last = 0; for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; } };
const pink = (d, amp = 1) => { let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852; b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898; d[i] += (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11 * amp; b6 = w * .115926; } };
const src = (buf) => { const s = actx.createBufferSource(); s.buffer = buf; s.loop = true; return s; };
const filt = (type, f, q = 0.7) => { const x = actx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
export function ambient(kind, mins = 0) {
  actx ||= new AudioContext(); actx.resume();
  const now = actx.currentTime; const master = actx.createGain(); master.gain.setValueAtTime(0, now); master.gain.linearRampToValueAtTime(1, now + 2.5); master.connect(actx.destination);
  const nodes = []; let timer = 0;
  if (kind === 'brown') {
    const s = src(loopBuf(20, brown)); const lp = filt('lowpass', 420); const hp = filt('highpass', 25); const g = actx.createGain(); g.gain.value = 0.55;
    s.connect(hp).connect(lp).connect(g).connect(master); s.start(); nodes.push(s);
  }
  if (kind === 'rain') {
    const buf = loopBuf(24, (d, sr) => { pink(d, 0.35);
      const drops = Math.floor(d.length / sr * 55); for (let k = 0; k < drops; k++) { const at = Math.floor(Math.random() * d.length); const amp = Math.pow(Math.random(), 3) * 0.55; const dec = sr * (0.002 + Math.random() * 0.006); let lp = 0;
        for (let j = 0; j < dec * 5 && at + j < d.length; j++) { lp += 0.35 * ((Math.random() * 2 - 1) - lp); d[at + j] += lp * amp * Math.exp(-j / dec); } }
      const plinks = Math.floor(d.length / sr * 2.5); for (let k = 0; k < plinks; k++) { const at = Math.floor(Math.random() * d.length); const f = 1400 + Math.random() * 2600; const amp = 0.02 + Math.random() * 0.03; for (let j = 0; j < sr * 0.05 && at + j < d.length; j++) d[at + j] += Math.sin(2 * Math.PI * f * j / sr) * amp * Math.exp(-j / (sr * 0.008)); } });
    const s = src(buf); const hp = filt('highpass', 180); const lp = filt('lowpass', 6500); const g = actx.createGain(); g.gain.value = 0.9;
    const roof = src(loopBuf(20, brown)); const rl = filt('lowpass', 160); const rg = actx.createGain(); rg.gain.value = 0.25;
    s.connect(hp).connect(lp).connect(g).connect(master); roof.connect(rl).connect(rg).connect(master); s.start(); roof.start(); nodes.push(s, roof);
  }
  if (kind === 'ocean') {
    const noise = loopBuf(20, (d) => { brown(d); pink(d, 0.25); });
    const bed = src(noise); const bl = filt('lowpass', 260); const bg = actx.createGain(); bg.gain.value = 0.18; bed.connect(bl).connect(bg).connect(master); bed.start(); nodes.push(bed);
    const layers = [-0.45, 0.45].map((pan, k) => { const s = src(noise); s.loopStart = k * 7; const f = filt('lowpass', 400, 0.5); const g = actx.createGain(); g.gain.value = 0.05; const p = actx.createStereoPanner(); p.pan.value = pan; s.connect(f).connect(g).connect(p).connect(master); s.start(0, k * 7); nodes.push(s); return { f, g, t: now + 0.5 + k * 4.5 }; });
    // schedule one hour of waves per layer, then top up
    const plan = () => { for (const L of layers) { const end = actx.currentTime + 3600; while (L.t < end) { const t = L.t, rise = 2.2 + Math.random() * 2.2, crash = 0.5 + Math.random() * 0.6, wash = 3 + Math.random() * 3.5, peak = 0.35 + Math.random() * 0.45;
      L.g.gain.setTargetAtTime(0.08 + peak * 0.35, t, rise / 2.5); L.g.gain.setTargetAtTime(peak, t + rise, crash / 3); L.g.gain.setTargetAtTime(0.05, t + rise + crash, wash / 3);
      L.f.frequency.setTargetAtTime(500 + peak * 500, t, rise / 2.5); L.f.frequency.setTargetAtTime(1800 + peak * 1600, t + rise, crash / 3); L.f.frequency.setTargetAtTime(380, t + rise + crash, wash / 2.5);
      L.t = t + rise + crash + wash * (0.7 + Math.random() * 0.5) + Math.random() * 2.5; } } timer = setTimeout(plan, 50 * 60 * 1000); };
    plan();
  }
  if (mins) { const end = now + mins * 60; master.gain.setValueAtTime(1, end - 20); master.gain.linearRampToValueAtTime(0, end); }
  return () => { clearTimeout(timer); const t = actx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 0.8); setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch { } }); master.disconnect(); }, 900); };
}

