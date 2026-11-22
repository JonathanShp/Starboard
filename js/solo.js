import { h, icon, S, save, route, page, row, group, sec, seg, toast, shuffle, rand, pick, haptic, onLeave, markActive , sfx } from './core.js';
import { howTo, firstTime } from './howto.js';
const SOLO = { sudoku: ['Sudoku', 'grid', '#3D7BFF', 'Fill every row, column and 3×3 box with 1–9, no repeats.\n\nTap a cell, then a number. Wrong numbers turn red.\n\nPick Easy, Medium or Hard. Every puzzle has exactly one answer.'], '2048': ['2048', 'sparkle', '#E0A800', 'Swipe (or use arrow keys) to slide every tile.\n\nTwo equal tiles that touch merge into their sum.\n\nReach 2048. Tip: keep your biggest tile in one corner.'], word: ['Five', 'pen', '#1FCB6E', 'Guess the hidden 5-letter word in 6 tries.\n\nGreen: right letter, right spot. Yellow: in the word, wrong spot. Grey: not in the word.'], mines: ['Mines', 'flag', '#FF5A3C', 'Tap to open a square. Numbers tell you how many of the 8 neighbours are mines.\n\nLong-press (or right-click) to flag a mine.\n\nOpen every safe square to win.'] };
const spage = (id, body) => { const [t, ic, color, rules] = SOLO[id]; const help = () => howTo(id, { color, title: t, rules }); if (firstTime(id)) setTimeout(help, 350); return page({ title: t, back: 'play/solo', large: false, right: h('button', { class: 'btn sm', onclick: help }, 'How to play') }, h('div', { class: 'gamehead' }, h('div', { class: 'gi', style: { background: color } }, icon(ic)), h('div', null, h('h1', null, t), h('p', null, 'Solo puzzle'))), body); };

route(/^play\/solo$/, () => page({ title: 'Puzzles', sub: 'For quiet moments: deck chair, airport, cabin.', back: 'play' },
  h('div', { class: 'bento even' },
    [['sudoku', 'c-blue', S.solo.sudokuWins ? S.solo.sudokuWins + ' solved' : 'Easy to Hard'], ['2048', 'c-yellow', S.solo.best2048 ? 'Best ' + S.solo.best2048 : 'Swipe to merge'], ['word', 'c-green', S.solo.wordWins ? S.solo.wordWins + ' won' : '6 tries'], ['mines', 'c-coral', 'Long-press to flag']].map(([id, cl, sub]) =>
      h('a', { class: 't ' + cl, href: '#/play/solo/' + id }, h('div', { class: 'ic' }, icon(SOLO[id][1])), h('div', null, h('b', null, SOLO[id][0]), h('span', null, sub))))),
));

// ---------- Sudoku ----------
function solveCount(b, limit = 2) {
  const i = b.indexOf(0); if (i < 0) return 1; let n = 0; const r = Math.floor(i / 9), c = i % 9;
  for (let v = 1; v <= 9 && n < limit; v++) if (ok(b, r, c, v)) { b[i] = v; n += solveCount(b, limit - n); b[i] = 0; }
  return n;
}
function ok(b, r, c, v) { for (let k = 0; k < 9; k++) { if (b[r * 9 + k] === v || b[k * 9 + c] === v) return false; } const br = r - r % 3, bc = c - c % 3; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if (b[(br + y) * 9 + bc + x] === v) return false; return true; }
function fill(b) { const i = b.indexOf(0); if (i < 0) return true; const r = Math.floor(i / 9), c = i % 9; for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) if (ok(b, r, c, v)) { b[i] = v; if (fill(b)) return true; b[i] = 0; } return false; }
function genSudoku(givens) { const sol = Array(81).fill(0); fill(sol); const p = [...sol]; for (const i of shuffle([...Array(81).keys()])) { if (p.filter(Boolean).length <= givens) break; const v = p[i]; p[i] = 0; if (solveCount([...p]) !== 1) p[i] = v; } return { sol, puz: p }; }
route(/^play\/solo\/sudoku$/, () => {
  const wrap = h('div'); let G = S.solo.sudoku, sel = null, notes = false;
  const start = (lvl) => { const g = genSudoku({ easy: 38, medium: 31, hard: 26 }[lvl]); G = S.solo.sudoku = { ...g, cur: [...g.puz], notes: Array(81).fill(''), lvl, mistakes: 0 }; save(); draw(); };
  const draw = () => {
    if (!G) return wrap.replaceChildren(h('div', { class: 'stack' }, h('p', { class: 'muted', style: { margin: '0 4px' } }, 'Choose a difficulty'), ['easy', 'medium', 'hard'].map((l) => h('button', { class: 'btn block' + (l === 'medium' ? ' primary' : ''), onclick: () => start(l) }, l[0].toUpperCase() + l.slice(1)))));
    const sv = sel != null ? G.cur[sel] : 0;
    const grid = h('div', { class: 'sudoku' }, G.cur.map((v, i) => { const r = Math.floor(i / 9), c = i % 9; const peer = sel != null && (Math.floor(sel / 9) === r || sel % 9 === c || (Math.floor(sel / 27) === Math.floor(i / 27) && Math.floor(sel % 9 / 3) === Math.floor(c / 3)));
      return h('button', { class: [G.puz[i] ? 'giv' : '', i === sel ? 'sel' : peer ? 'peer' : '', v && v === sv && i !== sel ? 'same' : '', v && v !== G.sol[i] ? 'err' : '', c === 2 || c === 5 ? 'bR' : '', r === 2 || r === 5 ? 'bB' : ''].join(' '), onclick: () => { sel = i; draw(); }, 'aria-label': `Row ${r + 1} column ${c + 1}` }, v ? String(v) : G.notes[i] ? h('span', { style: { fontSize: '9px', lineHeight: 1.1, color: 'var(--ink3)', fontFamily: 'var(--sans)', display: 'block', letterSpacing: '1px' } }, G.notes[i]) : ''); }));
    const pad = h('div', { class: 'pad9' }, [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => h('button', { onclick: () => put(n), style: { opacity: G.cur.filter((x) => x === n).length >= 9 ? .3 : 1 } }, n)));
    wrap.replaceChildren(h('div', { class: 'stack' }, h('div', { class: 'flex', style: { justifyContent: 'space-between' } }, h('b', null, G.lvl[0].toUpperCase() + G.lvl.slice(1)), h('span', { class: 'small muted' }, 'Mistakes: ' + G.mistakes)), grid, pad,
      h('div', { class: 'flex', style: { gap: 8 } }, h('button', { class: 'btn sm' + (notes ? ' primary' : ''), style: { flex: 1 }, onclick: () => { notes = !notes; draw(); } }, icon('pen'), 'Notes'), h('button', { class: 'btn sm', style: { flex: 1 }, onclick: () => put(0) }, 'Erase'), h('button', { class: 'btn sm', style: { flex: 1 }, onclick: () => { if (sel == null || G.puz[sel]) return; G.cur[sel] = G.sol[sel]; save(); check(); draw(); } }, 'Hint'), h('button', { class: 'btn sm', style: { flex: 1 }, onclick: () => { G = S.solo.sudoku = null; save(); draw(); } }, 'New'))));
  };
  const put = (n) => { if (sel == null || G.puz[sel]) return; haptic(4); if (notes && n) { const s = new Set(G.notes[sel]); s.has(String(n)) ? s.delete(String(n)) : s.add(String(n)); G.notes[sel] = [...s].sort().join(''); } else { G.cur[sel] = n; G.notes[sel] = ''; if (n && n !== G.sol[sel]) { G.mistakes++; haptic([20, 30, 20]); } } save(); check(); draw(); };
  const check = () => { if (G.cur.every((v, i) => v === G.sol[i])) { S.solo.sudokuWins = (S.solo.sudokuWins || 0) + 1; markActive(); (haptic([40, 40, 80]), sfx.win()); toast('Solved! 🎉'); G = S.solo.sudoku = null; save(); } };
  const kd = (e) => { if (!G) return; if (/^[1-9]$/.test(e.key)) put(+e.key); if (e.key === 'Backspace') put(0); if (sel != null && e.key.startsWith('Arrow')) { sel = (sel + { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key] + 81) % 81; draw(); } };
  addEventListener('keydown', kd); onLeave(() => removeEventListener('keydown', kd));
  draw();
  return spage('sudoku', wrap);
});

// ---------- 2048 ----------
const TC = { 2: ['#FFFFFF', '#14130F'], 4: ['#E3F3F6', '#14130F'], 8: ['#FFC21A', '#14130F'], 16: ['#FF9F1A', '#fff'], 32: ['#FF5A3C', '#fff'], 64: ['#E5372A', '#fff'], 128: ['#1FCB6E', '#fff'], 256: ['#0FB5BA', '#fff'], 512: ['#3D7BFF', '#fff'], 1024: ['#8F63FF', '#fff'], 2048: ['#14130F', '#FFC21A'] };
route(/^play\/solo\/2048$/, () => {
  let B = S.solo.b2048 || null, score = S.solo.s2048 || 0;
  const add = () => { const e = B.map((v, i) => v ? -1 : i).filter((i) => i >= 0); if (e.length) B[pick(e)] = Math.random() < .9 ? 2 : 4; };
  const reset = () => { B = Array(16).fill(0); score = 0; add(); add(); persist(); draw(); };
  const persist = () => { S.solo.b2048 = B; S.solo.s2048 = score; if (score > (S.solo.best2048 || 0)) S.solo.best2048 = score; save(); };
  const line = (a) => { const v = a.filter(Boolean); for (let i = 0; i < v.length - 1; i++) if (v[i] === v[i + 1]) { v[i] *= 2; score += v[i]; v.splice(i + 1, 1); } while (v.length < 4) v.push(0); return v; };
  const move = (dir) => { const old = B.join(); for (let k = 0; k < 4; k++) { let idx = [0, 1, 2, 3].map((j) => dir === 'L' ? k * 4 + j : dir === 'R' ? k * 4 + 3 - j : dir === 'U' ? j * 4 + k : (3 - j) * 4 + k); const res = line(idx.map((i) => B[i])); idx.forEach((i, j) => B[i] = res[j]); } if (B.join() !== old) { add(); haptic(4); persist(); draw(); if (!canMove()) toast('No moves left — score ' + score); } };
  const canMove = () => B.includes(0) || B.some((v, i) => (i % 4 < 3 && v === B[i + 1]) || (i < 12 && v === B[i + 4]));
  const grid = h('div', { class: 'g2048' }); const sc = h('div', { class: 'flex', style: { justifyContent: 'space-between' } });
  const draw = () => { sc.replaceChildren(h('div', null, h('div', { class: 'small dim' }, 'Score'), h('div', { class: 'serif num', style: { fontSize: '28px' } }, score)), h('div', { style: { textAlign: 'right' } }, h('div', { class: 'small dim' }, 'Best'), h('div', { class: 'serif num', style: { fontSize: '28px' } }, S.solo.best2048 || 0))); grid.replaceChildren(...B.map((v) => { const [bg, fg] = TC[v] || ['#14130F', '#fff']; return h('div', { style: v ? { background: bg, color: fg, fontSize: v > 512 ? 'clamp(16px,5vw,26px)' : '' } : {} }, v || ''); })); };
  let t0; grid.ontouchstart = (e) => t0 = [e.touches[0].clientX, e.touches[0].clientY]; grid.ontouchend = (e) => { if (!t0) return; const dx = e.changedTouches[0].clientX - t0[0], dy = e.changedTouches[0].clientY - t0[1]; if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U'); t0 = null; };
  grid.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  const kd = (e) => { const d = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D' }[e.key]; if (d) { e.preventDefault(); move(d); } };
  addEventListener('keydown', kd); onLeave(() => removeEventListener('keydown', kd));
  if (!B) reset(); else draw();
  return spage('2048', h('div', { class: 'stack' }, sc, grid, h('button', { class: 'btn block', onclick: reset }, 'New game')));
});

// ---------- Five (word) ----------
const WORDS = 'about above actor adult after again agree ahead alarm album alert alive allow alone along angel anger angle angry apple apply arena argue arise armor array arrow aside asset audio avoid award aware awful bacon badge baker basic beach beard beast begin being below bench berry birth black blade blame blank blast blaze blend bless blind block blood bloom board boast bonus boost booth brain brand brave bread break brick bride brief bring broad broke brown brush build bunch burst buyer cabin cable camel candy canoe cargo carry catch cause chain chair chalk charm chart chase cheap check cheek cheer chess chest chief child chill choir chose civil claim class clean clear clerk click cliff climb clock close cloth cloud coach coast color coral couch could count court cover crack craft crane crash crazy cream crime crisp cross crowd crown crush curve cycle daily dance death delay depth diary dirty disco ditch dizzy dodge doubt dough draft drain drama drawn dream dress drift drill drink drive eager eagle early earth eight elbow elite email empty enemy enjoy enter entry equal error event every exact exist extra fable faint faith false fancy feast fence fever fiber field fifth fifty fight final flame flash fleet float flock floor flour fluid focus force forge forth found frame fresh front frost fruit funny ghost giant given glass globe glory glove grace grade grain grand grant grape grass great green greet grill group guard guess guest guide habit happy harsh heart heavy hello hobby honey horse hotel house human humor hurry ideal image index inner input irony issue ivory jelly jewel joint judge juice jumpy knife knock label large laser later laugh layer learn lemon level light limit linen liver local lodge logic loose lucky lunch magic major maker mango maple march match mayor medal metal minor model money month moral motor mount mouse mouth movie music naval nerve never night noble noise north novel nurse ocean offer often olive onion opera orbit order other outer owner paint panel paper party pasta patch peace peach pearl penny phone photo piano piece pilot pizza place plain plane plant plate point polar pound power press price pride prime print prize proof proud pulse punch pupil queen quick quiet quote radio raise rally ranch rapid reach ready realm relax reply rhyme rider ridge right rival river roast robot rocky round route royal rugby ruler rural salad sauce scale scarf scene scent score scout sense serve seven shade shake shape share shark sharp sheep shelf shell shift shine shirt shock shore short shout sight skill skirt sleep slice smart smile smoke snack snake solar solid sound south space spare speak speed spice spike spoon sport spray squad stage stair stamp stand start steam steel stick still stone storm story stove sugar sunny super surge sweet swift swing table taste teach teeth thank theme thick thief thing think three throw thumb tiger timer title toast today tooth topic torch total touch tough tower track trade trail train treat trend trial tribe trick truck truly trust truth tulip tutor twist uncle under union unity upper urban usual vague valid value video visit vital vivid vocal voice waste watch water whale wheat wheel while white whole woman world worry write wrong yacht young youth zebra'.split(' ');
route(/^play\/solo\/word$/, () => {
  const wrap = h('div'); let ans, rows, cur, done, keyState;
  const start = () => { ans = pick(WORDS); rows = []; cur = ''; done = false; keyState = {}; draw(); };
  const score = (g) => { const res = Array(5).fill('x'), a = ans.split(''); g.split('').forEach((ch, i) => { if (ch === a[i]) { res[i] = 'g'; a[i] = null; } }); g.split('').forEach((ch, i) => { if (res[i] !== 'g') { const k = a.indexOf(ch); if (k >= 0) { res[i] = 'y'; a[k] = null; } } }); return res; };
  const press = (k) => { if (done) return; if (k === 'enter') { if (cur.length < 5) return toast('Need 5 letters'); const s = score(cur); rows.push([cur, s]); cur.split('').forEach((ch, i) => { const r = { g: 3, y: 2, x: 1 }[s[i]]; if ((keyState[ch] || 0) < r) keyState[ch] = r; }); if (cur === ans) { done = true; S.solo.wordWins = (S.solo.wordWins || 0) + 1; markActive(); save(); (haptic([40, 40, 80]), sfx.win()); setTimeout(() => toast(['Genius!', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew'][rows.length - 1]), 300); } else if (rows.length >= 6) { done = true; toast('The word was ' + ans.toUpperCase()); } cur = ''; } else if (k === 'del') cur = cur.slice(0, -1); else if (cur.length < 5) cur += k; haptic(3); draw(); };
  const draw = () => {
    const grid = h('div', { class: 'wgrid' }, Array.from({ length: 6 }, (_, r) => { const rw = rows[r]; const w = rw ? rw[0] : r === rows.length ? cur : ''; return h('div', { class: 'wr' }, Array.from({ length: 5 }, (_, i) => h('div', { class: rw ? rw[1][i] : '' }, w[i] || ''))); }));
    const kb = h('div', { class: 'kb' }, ['qwertyuiop', 'asdfghjkl', '+zxcvbnm-'].map((r) => h('div', null, r.split('').map((k) => k === '+' ? h('button', { class: 'w', onclick: () => press('enter') }, 'Enter') : k === '-' ? h('button', { class: 'w', onclick: () => press('del'), 'aria-label': 'Delete' }, '⌫') : h('button', { class: { 3: 'g', 2: 'y', 1: 'x' }[keyState[k]] || '', onclick: () => press(k) }, k)))));
    wrap.replaceChildren(h('div', { class: 'stack' }, grid, done ? h('button', { class: 'btn primary block', onclick: start }, 'New word') : null, kb));
  };
  const kd = (e) => { if (e.key === 'Enter') press('enter'); else if (e.key === 'Backspace') press('del'); else if (/^[a-z]$/i.test(e.key)) press(e.key.toLowerCase()); };
  addEventListener('keydown', kd); onLeave(() => removeEventListener('keydown', kd));
  start();
  return spage('word', wrap);
});

// ---------- Mines ----------
route(/^play\/solo\/mines$/, () => {
  const wrap = h('div'); let W = 9, Hh = 12, N = 18, cells, first, over;
  const nb = (i) => { const r = Math.floor(i / W), c = i % W, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < Hh && cc >= 0 && cc < W) o.push(rr * W + cc); } return o; };
  const start = (lvl) => { [W, Hh, N] = { easy: [9, 9, 10], medium: [9, 12, 18], hard: [10, 14, 30] }[lvl || 'medium']; cells = Array.from({ length: W * Hh }, () => ({ m: 0, o: 0, f: 0, n: 0 })); first = true; over = false; draw(); };
  const plant = (safe) => { const bad = new Set([safe, ...nb(safe)]); shuffle([...cells.keys()].filter((i) => !bad.has(i))).slice(0, N).forEach((i) => cells[i].m = 1); cells.forEach((c, i) => c.n = nb(i).filter((j) => cells[j].m).length); };
  const open = (i) => { const c = cells[i]; if (c.o || c.f) return; c.o = 1; if (!c.n && !c.m) nb(i).forEach(open); };
  const tap = (i) => { if (over) return; if (first) { plant(i); first = false; } const c = cells[i]; if (c.f) return; if (c.o && c.n) { const f = nb(i).filter((j) => cells[j].f).length; if (f === c.n) nb(i).forEach((j) => { if (!cells[j].f && !cells[j].o) { if (cells[j].m) boom(j); else open(j); } }); }
    else if (c.m) return boom(i); else open(i); haptic(3); if (cells.every((c) => c.m || c.o)) { over = true; toast('Cleared! 🎉'); markActive(); } draw(); };
  const boom = (i) => { over = true; cells[i].boom = 1; cells.forEach((c) => c.m && (c.o = 1)); haptic([80, 50, 80]); draw(); };
  const flag = (i) => { if (over || cells[i].o) return; cells[i].f ^= 1; haptic(15); draw(); };
  const COL = ['', '#3D7BFF', '#14A85A', '#E5372A', '#8F63FF', '#B4451A', '#0FB5BA', '#14130F', '#6B7280'];
  let flagMode = false;
  const draw = () => {
    const g = h('div', { class: 'mines', style: { gridTemplateColumns: `repeat(${W},1fr)` } }, cells.map((c, i) => { let pt; const b = h('button', { class: (c.o ? 'o' : '') + (c.boom ? ' boom' : ''), style: { color: COL[c.n] }, onclick: () => flagMode ? flag(i) : tap(i), oncontextmenu: (e) => { e.preventDefault(); flag(i); }, onpointerdown: () => pt = setTimeout(() => { pt = 'x'; flag(i); }, 420), onpointerup: (e) => { if (pt === 'x') { e.preventDefault(); b.onclick = null; setTimeout(draw, 0); } clearTimeout(pt); } }, c.o ? (c.m ? '✹' : c.n || '') : c.f ? '⚑' : ''); return b; }));
    wrap.replaceChildren(h('div', { class: 'stack' }, h('div', { class: 'flex', style: { justifyContent: 'space-between' } }, h('b', null, '⚑ ' + (N - cells.filter((c) => c.f).length)), h('button', { class: 'btn sm' + (flagMode ? ' primary' : ''), onclick: () => { flagMode = !flagMode; draw(); } }, flagMode ? 'Flag mode on' : 'Flag mode')), g, seg([['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']], W === 9 && Hh === 9 ? 'easy' : Hh === 12 ? 'medium' : 'hard', start)));
  };
  start('medium');
  return spage('mines', wrap);
});
