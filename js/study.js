import { h, icon, S, save, route, page, row, group, ftile, sec, seg, sheet, toast, go, uid, shuffle, pick, speak, haptic, confirmSheet, promptSheet, onLeave, markActive, fmtTime, keepAwake, beep, Q, esc , sfx } from './core.js';
import { STARTER, SECTIONS, PHRASES } from './data-study.js';
import { ambient } from './music.js';

const MIN = 60e3, DAY = 864e5, NEW_PER_DAY = 25;
const mk = (f, b, n = '') => ({ id: uid(), f, b, n, due: 0, ivl: 0, ease: 2.5, reps: 0, lapses: 0, st: 'new' });

export function seedDecks() {
  if (S.seeded >= 1) return;
  for (const d of STARTER) { const id = uid(); S.decks.push({ id, name: d.name, section: d.section, lang: d.lang, dir: 'f' }); S.cards[id] = d.cards.map((c) => mk(c[0], c[1], c[2] || '')); }
  S.seeded = 1; save();
}
const deck = (id) => S.decks.find((d) => d.id === id);
const newToday = () => S.reviews[new Date().toDateString()]?.newSeen || 0;
function bumpToday(isNew) { const k = new Date().toDateString(); const r = (S.reviews = Object.fromEntries(Object.entries(S.reviews).filter(([kk]) => kk === k || Date.parse(kk) > Date.now() - 30 * DAY)))[k] ||= { n: 0, newSeen: 0 }; r.n++; if (isNew) r.newSeen++; }
function queue(ids) {
  const now = Date.now(); const due = [], fresh = [];
  for (const id of ids) for (const c of S.cards[id] || []) { if (c.st === 'new') fresh.push([id, c]); else if (c.due <= now) due.push([id, c]); }
  due.sort((a, b) => a[1].due - b[1].due);
  return [...due, ...fresh.slice(0, Math.max(0, NEW_PER_DAY - newToday()))];
}
export const dueCount = () => queue(S.decks.map((d) => d.id)).length;
const deckStats = (id) => { const cs = S.cards[id] || [], now = Date.now(); return { total: cs.length, fresh: cs.filter((c) => c.st === 'new').length, due: cs.filter((c) => c.st !== 'new' && c.due <= now).length, known: cs.filter((c) => c.ivl >= 3).length }; };

// Anki-like scheduling with short learning steps (good for a 1-week trip)
function schedule(c, r) { // r: 0 again, 1 hard, 2 good, 3 easy
  const now = Date.now();
  if (c.st === 'new' || c.st === 'learn') {
    if (r === 0) { c.st = 'learn'; c.due = now + MIN; c.step = 0; }
    else if (r === 1) { c.st = 'learn'; c.due = now + 6 * MIN; }
    else if (r === 2) { if ((c.step || 0) >= 1) { c.st = 'review'; c.ivl = 1; c.due = now + DAY; } else { c.st = 'learn'; c.step = 1; c.due = now + 10 * MIN; } }
    else { c.st = 'review'; c.ivl = 3; c.due = now + 3 * DAY; }
  } else {
    if (r === 0) { c.lapses++; c.ease = Math.max(1.3, c.ease - 0.2); c.st = 'learn'; c.step = 0; c.ivl = 0; c.due = now + 10 * MIN; }
    else { const m = r === 1 ? 1.2 : r === 2 ? c.ease : c.ease * 1.3; c.ease = Math.max(1.3, c.ease + (r === 1 ? -0.15 : r === 3 ? 0.15 : 0)); c.ivl = Math.max(c.ivl + 1, Math.round(c.ivl * m)); c.due = now + c.ivl * DAY; }
  }
  c.reps++;
}
function preview(c, r) { const t = { ...c }; schedule(t, r); const ms = t.due - Date.now(); return ms < 3600e3 ? Math.round(ms / MIN) + 'm' : ms < DAY ? Math.round(ms / 3600e3) + 'h' : Math.round(ms / DAY) + 'd'; }
const sides = (d, c) => { const dir = d.dir === 'mix' ? (Math.random() < 0.5 ? 'f' : 'b') : d.dir || 'f'; return dir === 'f' ? [c.f, c.b, d.lang === 'es' ? 'es' : null] : [c.b, c.f, null]; };
const sayBtn = (text, lang) => lang ? h('button', { class: 'iconbtn', 'aria-label': 'Say it', onclick: (e) => { e.stopPropagation(); speak(text, lang === 'es' ? 'es-ES' : 'en-US'); } }, icon('vol')) : null;

// ---------- Study home ----------
route(/^study$/, () => {
  const due = dueCount();
  const bySec = {};
  for (const d of S.decks) (bySec[d.section] ||= []).push(d);
  const secs = [...SECTIONS.filter((s) => bySec[s]), ...Object.keys(bySec).filter((s) => !SECTIONS.includes(s))];
  return page({ title: 'Study', right: h('div', { class: 'flex', style: { gap: 4 } }, S.decks.length ? h('button', { class: 'iconbtn', 'aria-label': 'Delete decks', onclick: deleteDecks }, icon('trash')) : null, h('button', { class: 'iconbtn', 'aria-label': 'New deck', onclick: newDeck }, icon('plus'))) },
    h('div', { class: 'hero' }, h('div', { class: 'k' }, 'Today'), h('div', { class: 'big' }, due ? `${due} to review` : 'All clear'),
      h('div', { class: 'sub' }, due ? 'Spaced repetition: cards come back right before you\'d forget them.' : 'Nice. Import a list or learn something new.'),
      h('div', { class: 'gap16' }), due ? h('a', { class: 'btn primary', href: '#/study/review' }, 'Start review') : h('a', { class: 'btn primary', href: '#/study/import' }, 'Import a list')),
    h('div', { class: 'gap16' }),
    h('div', { class: 'row2' }, ftile({ icon: 'ul', tone: 'c', title: 'Import list', sub: 'Paste homework vocab', href: '#/study/import' }), ftile({ icon: 'globe', title: 'Phrasebook', sub: 'Spanish for port days', href: '#/study/phrases' }), ftile({ icon: 'timer', tone: 'n', title: 'Focus timer', sub: 'Pomodoro + ocean sounds', href: '#/study/focus' }), ftile({ icon: 'bolt', tone: 'g', title: 'Quick quiz', sub: 'Mixed, all decks', href: '#/study/learn/all' })),
    secs.map((s) => [sec(s), group(...bySec[s].map((d) => { const st = deckStats(d.id); return row({ icon: d.lang === 'es' ? 'globe' : s.includes('Speaking') ? 'mic' : 'book', tone: d.lang === 'es' ? 'c' : '', title: d.name, sub: `${st.total} cards · ${st.known} known`, detail: st.due ? st.due + ' due' : st.fresh ? st.fresh + ' new' : '✓', href: '#/study/deck/' + d.id }); }))]),
  );
});
function deleteDecks() {
  const pickd = new Set(); const box = h('div', { class: 'stack' });
  const draw = () => box.replaceChildren(h('p', { class: 'muted', style: { margin: '0 4px' } }, 'Tap the decks to delete.'),
    h('div', { class: 'group' }, S.decks.map((d) => h('button', { class: 'rowi' + (pickd.has(d.id) ? ' on' : ''), 'aria-pressed': String(pickd.has(d.id)), onclick: () => { pickd.has(d.id) ? pickd.delete(d.id) : pickd.add(d.id); draw(); } },
      h('i', { class: 'selbox' + (pickd.has(d.id) ? ' on' : '') }), h('div', { class: 't' }, h('b', null, d.name), h('span', null, (S.cards[d.id] || []).length + ' cards · ' + d.section))))),
    h('button', { class: 'btn accent block', disabled: !pickd.size, onclick: async () => { const n = pickd.size; close();
      if (!await confirmSheet(`Delete ${n} deck${n > 1 ? 's' : ''}?`, 'Their cards and progress are deleted too. This can\'t be undone.')) return;
      S.decks = S.decks.filter((d) => !pickd.has(d.id)); pickd.forEach((id) => delete S.cards[id]); save(); toast(`Deleted ${n} deck${n > 1 ? 's' : ''}`); dispatchEvent(new HashChangeEvent('hashchange')); } }, pickd.size ? `Delete ${pickd.size} deck${pickd.size > 1 ? 's' : ''}` : 'Delete'));
  draw(); const close = sheet('Delete decks', box);
}
async function newDeck() {
  const name = await promptSheet('New deck', { placeholder: 'e.g. Spanish Unit 4 vocab' }); if (!name) return;
  const section = await pickSection(); if (!section) return;
  const id = uid(); S.decks.push({ id, name, section, lang: section === 'Spanish' ? 'es' : 'en', dir: 'f' }); S.cards[id] = []; save(); go('study/deck/' + id);
}
function pickSection(cur) {
  return new Promise((res) => { let done = false; const close = sheet('Section', group(...SECTIONS.map((s) => row({ title: s, chev: false, detail: s === cur ? '✓' : '', onclick: () => { done = true; close(); res(s); } }))), { onClose: () => !done && res(null) }); });
}

// ---------- Deck ----------
route(/^study\/deck\/(\w+)$/, (id) => {
  const d = deck(id); if (!d) return page({ title: 'Deck not found', back: 'study' });
  const st = deckStats(id);
  const list = h('div', { class: 'group plain' }); let sel = null; const selBar = h('div', { class: 'selbar', hidden: true });
  const head = h('div');
  const drawHead = () => head.replaceChildren(sec(S.cards[id].length + ' cards', h('div', { class: 'flex', style: { gap: 14 } }, S.cards[id].length ? h('button', { onclick: () => { sel = sel ? null : new Set(); drawList(); } }, sel ? 'Done' : 'Select') : null, sel ? null : h('button', { onclick: () => editCard(id, null, drawList) }, '+ Add card'))));
  const drawList = () => { drawHead();
    list.replaceChildren(...(S.cards[id].length ? S.cards[id].map((c) => h('button', { class: 'rowi', 'aria-pressed': sel ? String(sel.has(c)) : null, onclick: () => { if (!sel) return editCard(id, c, drawList); sel.has(c) ? sel.delete(c) : sel.add(c); drawList(); } }, sel ? h('i', { class: 'selbox' + (sel.has(c) ? ' on' : '') }) : null, h('div', { class: 't' }, h('b', null, c.f), h('span', null, c.b)), h('div', { class: 'd' }, c.st === 'new' ? 'new' : c.ivl >= 3 ? 'known' : 'learning'))) : [h('div', { class: 'empty' }, 'No cards yet. Add some or import a list.')]));
    selBar.hidden = !sel; selBar.replaceChildren(...(sel ? [h('button', { class: 'btn', onclick: () => { sel = sel.size === S.cards[id].length ? new Set() : new Set(S.cards[id]); drawList(); } }, sel.size === S.cards[id].length ? 'Select none' : 'Select all'),
      h('button', { class: 'btn accent', disabled: !sel.size, onclick: async () => { const n = sel.size; if (!await confirmSheet(`Delete ${n} card${n > 1 ? 's' : ''}?`, 'This can\'t be undone.')) return; S.cards[id] = S.cards[id].filter((c) => !sel.has(c)); save(); sel = null; toast(`Deleted ${n} card${n > 1 ? 's' : ''}`); drawList(); } }, sel.size ? `Delete ${sel.size}` : 'Delete')] : [])); };
  drawList();
  const more = () => sheet(d.name, group(
    row({ icon: 'edit', title: 'Rename', onclick: async () => { const n = await promptSheet('Rename deck', { value: d.name }); if (n) { d.name = n; save(); go('study/deck/' + id); dispatchEvent(new HashChangeEvent('hashchange')); } } }),
    row({ icon: 'list', title: 'Move to section', sub: d.section, onclick: async () => { const s = await pickSection(d.section); if (s) { d.section = s; save(); toast('Moved to ' + s); } } }),
    row({ icon: 'globe', title: 'Language of front side', sub: d.lang === 'es' ? 'Spanish (read aloud in Spanish)' : 'English', onclick: () => { d.lang = d.lang === 'es' ? 'en' : 'es'; save(); toast('Front side: ' + (d.lang === 'es' ? 'Spanish' : 'English')); } }),
    row({ icon: 'flip', title: 'Reset progress', onclick: async () => { if (await confirmSheet('Reset progress?', 'All cards in this deck go back to "new".', 'Reset')) { S.cards[id] = S.cards[id].map((c) => mk(c.f, c.b, c.n)); save(); location.reload(); } } }),
    row({ icon: 'trash', tone: 'c', title: 'Delete deck', onclick: async () => { if (await confirmSheet('Delete "' + d.name + '"?', 'This deletes the deck and its ' + st.total + ' cards. This can\'t be undone.')) { S.decks = S.decks.filter((x) => x !== d); delete S.cards[id]; save(); go('study'); } } }),
  ));
  return page({ title: d.name, sub: d.section, back: 'study', right: h('button', { class: 'iconbtn', onclick: more, 'aria-label': 'Deck options' }, h('span', { style: { fontSize: '22px', lineHeight: 1 } }, '···')) },
    h('div', { class: 'row3' }, [['New', st.fresh], ['Due', st.due], ['Known', st.known]].map(([l, n]) => h('div', { class: 'card center', style: { padding: '14px 8px' } }, h('div', { class: 'serif', style: { fontSize: '28px' } }, n), h('div', { class: 'small muted' }, l)))),
    sec('Show first'),
    seg([['f', d.lang === 'es' ? 'Spanish' : 'Term'], ['b', d.lang === 'es' ? 'English' : 'Meaning'], ['mix', 'Mixed']], d.dir || 'f', (v) => { d.dir = v; save(); }),
    sec('Study modes'),
    group(
      row({ icon: 'cards', tone: 'n', title: 'Flashcards', sub: 'Spaced repetition — the most efficient way to memorize', href: '#/study/review/' + id, detail: st.due + st.fresh ? Math.min(st.due + st.fresh, 999) : '' }),
      row({ icon: 'target', tone: 'c', title: 'Learn', sub: 'Multiple choice, then type it', href: '#/study/learn/' + id }),
      row({ icon: 'pen', title: 'Write', sub: 'Type the answer — best for spelling & accents', href: '#/study/type/' + id }),
      row({ icon: 'grid', tone: 'g', title: 'Match', sub: 'Race the clock pairing terms', href: '#/study/match/' + id }),
      row({ icon: 'eye', tone: 's', title: 'Cram', sub: 'Flip through everything, no scheduling', href: '#/study/review/' + id + '?cram=1' }),
    ),
    head,
    list, selBar,
    h('div', { class: 'gap16' }),
    group(row({ icon: 'trash', tone: 'c', title: 'Delete this deck', chev: false, onclick: async () => { if (await confirmSheet('Delete "' + d.name + '"?', 'This deletes the deck and its ' + S.cards[id].length + ' cards. This can\'t be undone.')) { S.decks = S.decks.filter((x) => x !== d); delete S.cards[id]; save(); go('study'); } } })),
  );
});
async function editCard(deckId, c, after) {
  const f = h('input', { value: c?.f || '', placeholder: 'Front (term)' }), b = h('input', { value: c?.b || '', placeholder: 'Back (meaning)' }), n = h('input', { value: c?.n || '', placeholder: 'Example or note (optional)' });
  const close = sheet(c ? 'Edit card' : 'Add card', h('div', { class: 'stack' }, f, b, n,
    h('div', { class: 'btnrow' }, c ? h('button', { class: 'btn', onclick: () => { S.cards[deckId] = S.cards[deckId].filter((x) => x !== c); save(); close(); after(); } }, 'Delete') : null,
      h('button', { class: 'btn primary', onclick: () => { if (!f.value.trim() || !b.value.trim()) return toast('Fill in both sides'); if (c) Object.assign(c, { f: f.value.trim(), b: b.value.trim(), n: n.value.trim() }); else S.cards[deckId].push(mk(f.value.trim(), b.value.trim(), n.value.trim())); save(); if (c) close(); else { f.value = b.value = n.value = ''; f.focus(); toast('Added'); } after(); } }, c ? 'Save' : 'Add'))));
  setTimeout(() => f.focus(), 300);
}

// ---------- Review (SRS) ----------
route(/^study\/review(?:\/(\w+))?$/, (id) => {
  const cram = Q.get('cram');
  const ids = id ? [id] : S.decks.map((d) => d.id);
  let q = cram ? shuffle(ids.flatMap((i) => (S.cards[i] || []).map((c) => [i, c]))) : queue(ids);
  const total = q.length; let done = 0, again = 0;
  const wrap = h('div');
  const back = id ? 'study/deck/' + id : 'study';
  const el = page({ title: cram ? 'Cram' : 'Review', back, large: false }, wrap);
  const next = () => {
    if (!q.length) return finish();
    const [did, c] = q[0]; const d = deck(did);
    const [front, backTxt, lang] = sides(d, c);
    let flipped = false;
    const card = h('div', { class: 'fc' }, h('div', { class: 'face' }, h('div', { class: 'lab' }, d.name), h('div', { class: 'word' }, front), sayBtn(front, lang), h('div', { class: 'hint' }, 'Tap to flip')),
      h('div', { class: 'face back' }, h('div', { class: 'lab' }, 'Answer'), h('div', { class: 'word' }, backTxt), c.n ? h('p', { class: 'muted', style: { marginTop: 12 } }, c.n) : null, sayBtn(lang ? front : backTxt, d.lang === 'es' && !lang ? null : lang)));
    const actions = h('div');
    const flip = () => { if (flipped) return; flipped = true; haptic(6); card.classList.add('flip'); actions.replaceChildren(cram ? h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => { q.push(q.shift()); again++; next(); } }, 'Still learning'), h('button', { class: 'btn primary', onclick: () => { q.shift(); done++; next(); } }, 'Got it')) : h('div', { class: 'rate' }, [['Again', 0, 'again'], ['Hard', 1, ''], ['Good', 2, 'good'], ['Easy', 3, '']].map(([l, r, cl]) => h('button', { class: cl, onclick: () => rate(r) }, l, h('small', null, preview(c, r)))))); };
    const rate = (r) => {
      haptic(8); const wasNew = c.st === 'new'; schedule(c, r); bumpToday(wasNew); markActive(); save(); q.shift();
      if (r === 0) again++; else done++;
      if (c.st === 'learn' && c.due - Date.now() < 15 * MIN) q.splice(Math.min(q.length, 4), 0, [did, c]);
      next();
    };
    card.onclick = flip;
    actions.append(h('button', { class: 'btn primary block', onclick: flip }, 'Show answer'));
    wrap.replaceChildren(h('div', { class: 'bar', style: { margin: '6px 0 16px' } }, h('i', { style: { width: (total ? (100 * done / total) : 100) + '%' } })), h('div', { class: 'fc-wrap' }, card), h('div', { class: 'gap16' }), actions,
      h('p', { class: 'small dim center' }, `${q.length} left` + (cram ? '' : ' · keys: space flips, 1–4 rate')));
    keyH = (e) => { if (e.key === ' ') { e.preventDefault(); flip(); } else if (flipped && !cram && '1234'.includes(e.key)) rate(+e.key - 1); };
  };
  let keyH = null; const kd = (e) => keyH?.(e); addEventListener('keydown', kd); onLeave(() => removeEventListener('keydown', kd));
  const finish = () => { keyH = null; wrap.replaceChildren(h('div', { class: 'empty fade-in' }, h('div', { class: 'tile g' }, icon('check')), h('h2', { class: 'serif', style: { margin: '0 0 6px', fontWeight: 500 } }, total ? 'Session done' : 'Nothing due'), h('p', null, total ? `${done} cards reviewed${again ? `, ${again} to see again soon` : ''}.` : 'Come back later, or cram a deck to practice anyway.'), h('div', { class: 'gap16' }), h('a', { class: 'btn primary', href: '#/' + back }, 'Done'))); };
  next();
  return el;
});

// ---------- Learn (multiple choice → typing) ----------
const pool = (id) => id === 'all' ? S.decks.flatMap((d) => (S.cards[d.id] || []).map((c) => [d, c])) : (S.cards[id] || []).map((c) => [deck(id), c]);
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,;:"'()]/g, '').replace(/\s+/g, ' ').trim();
route(/^study\/learn\/(\w+)$/, (id) => {
  const all = pool(id); if (all.length < 4) return page({ title: 'Learn', back: 'study' }, h('div', { class: 'empty' }, 'Add at least 4 cards to use Learn.'));
  const round = shuffle(all).slice(0, 12); let i = 0, right = 0;
  const wrap = h('div');
  const next = () => {
    if (i >= round.length) return wrap.replaceChildren(h('div', { class: 'empty fade-in' }, h('div', { class: 'big-num' }, `${right}/${round.length}`), h('p', null, right === round.length ? 'Perfect round.' : 'Missed ones will come back in review.'), h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => { i = 0; right = 0; round.sort(() => Math.random() - .5); next(); } }, 'Again'), h('a', { class: 'btn primary', href: id === 'all' ? '#/study' : '#/study/deck/' + id }, 'Done'))));
    const [d, c] = round[i]; const [front, answer, lang] = sides(d, c);
    const ansKey = answer === c.b ? 'b' : 'f';
    const opts = shuffle([answer, ...shuffle(all.filter(([, x]) => x !== c).map(([, x]) => x[ansKey])).filter((x, k, a) => x !== answer && a.indexOf(x) === k).slice(0, 3)]);
    const mc = h('div', { class: 'mc' }, opts.map((o) => h('button', { onclick: (e) => { $$b(mc).forEach((b) => { b.disabled = true; if (b.textContent === answer) b.classList.add('ok'); }); if (o === answer) { right++; haptic(8); sfx.ok(); } else { e.currentTarget.classList.add('no'); haptic([20, 40, 20]); sfx.bad(); if (c.st !== 'new') { c.due = Date.now(); save(); } } setTimeout(() => { i++; next(); }, o === answer ? 650 : 1500); } }, o)));
    wrap.replaceChildren(h('div', { class: 'bar', style: { margin: '6px 0 16px' } }, h('i', { style: { width: (100 * i / round.length) + '%' } })), h('div', { class: 'card center', style: { padding: '36px 20px', marginBottom: 16 } }, h('div', { class: 'small dim' }, d.name), h('div', { class: 'serif', style: { fontSize: '30px', margin: '6px 0' } }, front), sayBtn(front, lang)), mc);
  };
  next();
  return page({ title: 'Learn', back: id === 'all' ? 'study' : 'study/deck/' + id, large: false }, wrap);
});
const $$b = (el) => [...el.querySelectorAll('button')];

route(/^study\/type\/(\w+)$/, (id) => {
  const round = shuffle(pool(id)).slice(0, 15); let i = 0, right = 0;
  const wrap = h('div');
  const next = () => {
    if (i >= round.length) return wrap.replaceChildren(h('div', { class: 'empty' }, h('div', { class: 'big-num' }, `${right}/${round.length}`), h('div', { class: 'gap16' }), h('a', { class: 'btn primary', href: '#/study/deck/' + id }, 'Done')));
    const [d, c] = round[i]; const [front, answer, lang] = sides(d, c);
    const inp = h('input', { placeholder: 'Type the answer', autocapitalize: 'off', autocomplete: 'off', spellcheck: false });
    const fb = h('div');
    const check = () => {
      if (fb.dataset.done) { i++; return next(); }
      const ok = norm(inp.value) === norm(answer) || norm(answer).split(/[\/,;—(]/).map((s) => s.trim()).filter(Boolean).includes(norm(inp.value));
      const exact = inp.value.trim().toLowerCase() === answer.toLowerCase();
      if (ok) right++;
      fb.dataset.done = 1; haptic(ok ? 8 : [20, 40, 20]); ok ? sfx.ok() : sfx.bad();
      fb.replaceChildren(h('div', { class: 'card', style: { marginTop: 12, borderLeft: '4px solid ' + (ok ? 'var(--good)' : 'var(--bad)') } }, h('b', null, ok ? (exact ? 'Correct' : 'Correct — check the accents/spelling:') : 'Answer:'), h('div', { class: 'serif', style: { fontSize: '22px', marginTop: 4 } }, answer)), h('div', { class: 'gap8' }), h('button', { class: 'btn primary block', onclick: check }, 'Next'));
    };
    inp.onkeydown = (e) => { if (e.key === 'Enter') check(); };
    const accents = d.lang === 'es' ? h('div', { class: 'chips', style: { margin: '8px -16px 0' } }, 'á é í ó ú ñ ü ¿ ¡'.split(' ').map((ch) => h('button', { class: 'chip', onclick: () => { inp.value += ch; inp.focus(); } }, ch))) : null;
    wrap.replaceChildren(h('div', { class: 'bar', style: { margin: '6px 0 16px' } }, h('i', { style: { width: (100 * i / round.length) + '%' } })), h('div', { class: 'card center', style: { padding: '32px 20px', marginBottom: 16 } }, h('div', { class: 'serif', style: { fontSize: '28px' } }, front), sayBtn(front, lang)), inp, accents, fb, fb.dataset.done ? null : h('div', { class: 'gap16' }), h('button', { class: 'btn primary block', onclick: check }, 'Check'));
    setTimeout(() => inp.focus(), 50);
  };
  if (!round.length) return page({ title: 'Write', back: 'study' }, h('div', { class: 'empty' }, 'No cards yet.'));
  next();
  return page({ title: 'Write', back: 'study/deck/' + id, large: false }, wrap);
});

route(/^study\/match\/(\w+)$/, (id) => {
  const wrap = h('div'); let timer;
  const start = () => {
    const set = shuffle(pool(id)).slice(0, 6); if (set.length < 3) return wrap.replaceChildren(h('div', { class: 'empty' }, 'Add at least 3 cards.'));
    const tiles = shuffle(set.flatMap(([, c]) => [{ c, t: c.f }, { c, t: c.b }]));
    let sel = null, left = set.length; const t0 = Date.now();
    const clock = h('div', { class: 'serif center num', style: { fontSize: '34px', margin: '0 0 12px' } }, '0.0');
    timer = setInterval(() => clock.textContent = ((Date.now() - t0) / 1000).toFixed(1), 100);
    const grid = h('div', { class: 'match' }, tiles.map((tl) => { const b = h('button', null, tl.t); b.onclick = () => { if (!sel) { sel = [tl, b]; b.classList.add('sel'); return; } if (sel[1] === b) { b.classList.remove('sel'); sel = null; return; } if (sel[0].c === tl.c) { haptic(8); sfx.ok(); sel[1].classList.add('done'); b.classList.add('done'); left--; if (!left) { clearInterval(timer); const s = ((Date.now() - t0) / 1000).toFixed(1); const best = S.solo['match' + id]; if (!best || +s < best) { S.solo['match' + id] = +s; save(); } setTimeout(() => wrap.replaceChildren(h('div', { class: 'empty' }, h('div', { class: 'big-num' }, s + 's'), h('p', null, 'Best: ' + S.solo['match' + id] + 's'), h('button', { class: 'btn primary', onclick: start }, 'Play again'))), 300); } } else { haptic([20, 40, 20]); sfx.bad(); sel[1].classList.add('no'); b.classList.add('no'); const a = sel[1]; setTimeout(() => { a.classList.remove('no', 'sel'); b.classList.remove('no'); }, 400); } sel = null; }; return b; }));
    wrap.replaceChildren(clock, grid);
  };
  onLeave(() => clearInterval(timer));
  start();
  return page({ title: 'Match', back: 'study/deck/' + id, large: false }, wrap);
});

// ---------- Import ----------
route(/^study\/import$/, () => {
  const ta = h('textarea', { placeholder: 'Paste your list, one per line:\n\nel perro - the dog\nla casa – the house\ncomer: to eat\nubiquitous = found everywhere', style: { minHeight: '220px' } });
  const name = h('input', { placeholder: 'Deck name, e.g. Spanish Unit 5' });
  let section = 'Spanish', target = 'new', flipSides = false;
  const out = h('p', { class: 'small muted', style: { margin: '6px 4px' } });
  const parse = () => ta.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => { const m = l.match(/^(.+?)\s*(?:\t| - | – | — |:|=|;|,(?=\s))\s*(.+)$/) || l.match(/^(.+?)\s*[-–—]\s*(.+)$/); return m ? (flipSides ? [m[2].trim(), m[1].trim()] : [m[1].replace(/^\d+[.)]\s*/, '').trim(), m[2].trim()]) : null; });
  const upd = () => { const p = parse(); const ok = p.filter(Boolean).length, bad = p.length - ok; out.textContent = p.length ? `${ok} cards found` + (bad ? ` · ${bad} lines skipped (no separator)` : '') : 'Separators that work: dash, en dash, colon, equals, tab.'; };
  ta.oninput = upd; upd();
  const deckSel = h('select', { onchange: (e) => { target = e.target.value; name.style.display = secSeg.style.display = target === 'new' ? '' : 'none'; } }, h('option', { value: 'new' }, '+ New deck'), S.decks.map((d) => h('option', { value: d.id }, d.name)));
  const secSeg = h('div', null, seg([['Spanish', 'Spanish'], ['English · Class', 'Eng · Class'], ['English · Speaking', 'Eng · Speak']], section, (v) => section = v));
  return page({ title: 'Import list', sub: 'Paste vocab from your homework. Each line becomes a card.', back: 'study' },
    h('div', { class: 'stack' }, ta, out,
      h('label', { class: 'flex small muted', style: { padding: '0 4px' } }, h('input', { type: 'checkbox', style: { width: 'auto' }, onchange: (e) => { flipSides = e.target.checked; upd(); } }), 'Swap sides (English was written first)'),
      sec('Add to'), deckSel, name, secSeg,
      h('div', { class: 'gap8' }),
      h('button', { class: 'btn primary block', onclick: () => {
        const cards = parse().filter(Boolean); if (!cards.length) return toast('No cards found');
        let id = target;
        if (id === 'new') { if (!name.value.trim()) return toast('Name the deck'); id = uid(); S.decks.push({ id, name: name.value.trim(), section, lang: section === 'Spanish' ? 'es' : 'en', dir: 'f' }); S.cards[id] = []; }
        S.cards[id].push(...cards.map(([f, b]) => mk(f, b))); save(); toast(`Added ${cards.length} cards`); go('study/deck/' + id);
      } }, 'Create cards')));
});

// ---------- Phrasebook ----------
route(/^study\/phrases$/, () => {
  let cat = Object.keys(PHRASES)[0];
  const list = h('div');
  const draw = () => list.replaceChildren(group(...PHRASES[cat].map(([en, es]) => h('button', { class: 'rowi', onclick: () => speak(es) }, h('div', { class: 't' }, h('b', { style: { whiteSpace: 'normal' } }, es), h('span', { style: { whiteSpace: 'normal' } }, en)), icon('vol', 'chev')))),
    h('div', { class: 'gap16' }), h('button', { class: 'btn line block', onclick: () => { const id = uid(); S.decks.push({ id, name: 'Phrases · ' + cat, section: 'Spanish', lang: 'es', dir: 'f' }); S.cards[id] = PHRASES[cat].map(([en, es]) => mk(es, en)); save(); toast('Deck created'); } }, '+ Make flashcards from this list'));
  const chips = h('div', { class: 'chips' });
  const drawChips = () => chips.replaceChildren(...Object.keys(PHRASES).map((k) => h('button', { class: 'chip' + (k === cat ? ' on' : ''), onclick: () => { cat = k; drawChips(); draw(); } }, k)));
  drawChips(); draw();
  return page({ title: 'Phrasebook', sub: 'Tap a phrase to hear it. Works offline if your phone has a Spanish voice installed (Settings → Text-to-speech → Google → Install voice data → Spanish).', back: 'study' }, chips, h('div', { class: 'gap8' }), list);
});

// ---------- Focus timer ----------
route(/^study\/focus$/, () => {
  let mode = 'focus', len = { focus: 25, short: 5, long: 15 }, left = len.focus * 60, run = false, iv = null, sessions = 0, sound = 'off', stopSound = null;
  const big = h('div', { class: 'timer-big' }, fmtTime(left));
  const lab = h('div', { class: 'center muted', style: { marginBottom: 8 } }, 'Focus');
  const btn = h('button', { class: 'btn primary', style: { minWidth: 160 } }, 'Start');
  const tick = () => { left--; big.textContent = fmtTime(left); document.title = fmtTime(left) + ' · Focus'; if (left <= 0) { beep(660, .3); setTimeout(() => beep(880, .4), 350); haptic([200, 100, 200]); if (mode === 'focus') { sessions++; markActive(); setMode(sessions % 4 ? 'short' : 'long'); } else setMode('focus'); toggle(); } };
  const toggle = () => { run = !run; btn.textContent = run ? 'Pause' : 'Start'; clearInterval(iv); if (run) { iv = setInterval(tick, 1000); keepAwake(true); } else keepAwake(false); };
  const setMode = (m) => { mode = m; left = len[m] * 60; big.textContent = fmtTime(left); lab.textContent = m === 'focus' ? 'Focus' : m === 'short' ? 'Short break' : 'Long break'; };
  btn.onclick = toggle;
  onLeave(() => { clearInterval(iv); keepAwake(false); document.title = 'Starboard'; stopSound?.(); });
  return page({ title: 'Focus', sub: '25 minutes on, 5 off. Every 4th break is long.', back: 'study' },
    h('div', { class: 'card', style: { padding: '28px 16px' } }, lab, big, h('div', { class: 'gap16' }), h('div', { class: 'flex', style: { justifyContent: 'center' } }, h('button', { class: 'btn', onclick: () => { if (run) toggle(); setMode(mode); } }, 'Reset'), btn)),
    sec('Mode'), seg([['focus', 'Focus 25'], ['short', 'Break 5'], ['long', 'Long 15']], 'focus', (m) => { if (run) toggle(); setMode(m); }),
    sec('Background sound'), seg([['off', 'Off'], ['ocean', 'Ocean'], ['rain', 'Rain'], ['brown', 'Brown noise']], sound, (v) => { stopSound?.(); stopSound = v === 'off' ? null : ambient(v); }),
    h('p', { class: 'small dim', style: { margin: '10px 4px' } }, 'Sounds are generated live, so no download is needed. Pair with music from the Music tab.'));
});
