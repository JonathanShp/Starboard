import { h, icon, S, save, route, page, row, group, ftile, sec, seg, sheet, toast, go, pick, rand, haptic, beep, onLeave, confirmSheet, markActive, Q , sfx , play } from './core.js';
import { howTo, firstTime } from './howto.js';
const CHESS_RULES = 'Tap a piece, then a square (or drag it). Dots show legal moves.\n\nBlunder check: if your move drops a piece or more, Starboard asks "Are you sure?" so you can rethink. Turn it off in Settings.\n\nSettings also has clocks, a live coach that rates every move, and odds games where the computer starts a piece down.\n\nStuck? Hint shows a good piece to move. Undo takes back your last move.\n\nAfter every game, Review marks your blunders, mistakes and inaccuracies with the better move.';
const chessHelp = () => howTo('chess', { color: '#1FCB6E', title: 'Chess', rules: CHESS_RULES });
import { Chess } from '../vendor/chess.js';
import { PIECES } from './pieces.js';
import { PUZZLES } from './puzzles.js';
import { OPENINGS, PRINCIPLES, BLUNDER_CHECK } from './data-openings.js';

// ---------- Engine (Stockfish 19 lite, single-threaded WASM in a worker) ----------
let worker, chain = Promise.resolve(), listener = null;
function eng() {
  if (!worker) { worker = new Worker('vendor/stockfish-19-lite-single.js'); worker.onmessage = (e) => listener?.(String(e.data)); worker.postMessage('uci'); worker.postMessage('isready'); }
  return worker;
}
const send = (c) => eng().postMessage(c);
function run(cmds, until) { return (chain = chain.then(() => new Promise((res) => { const lines = []; listener = (l) => { lines.push(l); if (until.test(l)) { listener = null; res(lines); } }; cmds.forEach(send); }))); }
const toScore = (l) => { const m = l.match(/score (cp|mate) (-?\d+)/); if (!m) return null; return m[1] === 'mate' ? (+m[2] > 0 ? 10000 - +m[2] : -10000 - +m[2]) : +m[2]; };
export async function analyse(fen, depth = 10) {
  const lines = await run(['setoption name Skill Level value 20', 'position fen ' + fen, 'go depth ' + depth], /^bestmove/);
  let score = 0, pv = [];
  for (const l of lines) if (/ pv /.test(l) && / multipv 1 | depth /.test(l)) { const s = toScore(l); if (s !== null) { score = s; pv = l.split(' pv ')[1].split(' '); } }
  return { score, best: (lines.at(-1).match(/bestmove (\S+)/) || [])[1], pv };
}
const LEVELS = [
  { n: 'Beginner', elo: '~400', skill: 0, depth: 1, rnd: .35 }, { n: 'Novice', elo: '~600', skill: 0, depth: 2, rnd: .18 }, { n: 'Casual', elo: '~800', skill: 1, depth: 3, rnd: .08 },
  { n: 'Improving', elo: '~1000', skill: 3, depth: 5, rnd: 0 }, { n: 'Club', elo: '~1200', skill: 6, depth: 7, rnd: 0 }, { n: 'Strong', elo: '~1500', skill: 10, depth: 9, rnd: 0 },
  { n: 'Expert', elo: '~1900', skill: 15, depth: 12, rnd: 0 }, { n: 'Maximum', elo: '2500+', skill: 20, depth: 16, rnd: 0 },
];
async function engineMove(g, lv) {
  const L = LEVELS[lv];
  if (L.rnd && Math.random() < L.rnd) { const ms = g.moves({ verbose: true }); const caps = ms.filter((m) => m.captured); await new Promise((r) => setTimeout(r, 400)); return pick(caps.length && Math.random() < .5 ? caps : ms).lan; }
  const lines = await run([`setoption name Skill Level value ${L.skill}`, 'position fen ' + g.fen(), `go depth ${L.depth}`], /^bestmove/);
  return lines.at(-1).match(/bestmove (\S+)/)[1];
}
const uciMove = (g, u) => g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q' });

// ---------- Board ----------
const FILES = 'abcdefgh';
export const THEMES = [['ocean', 'Ocean', '#EEF3F2', '#4FA39A'], ['classic', 'Classic', '#F0D9B5', '#B58863'], ['green', 'Tournament', '#EEEED2', '#769656'], ['blue', 'Ice', '#DEE3E6', '#8CA2AD'], ['purple', 'Grape', '#ECE6FA', '#9C86D6'], ['coral', 'Coral', '#FFF1EC', '#F07A62'], ['night', 'Night', '#A7B0BE', '#4B5563']];
const opt = (k, d = true) => S.chess[k] ?? d;
function Board({ game, orient = 'w', canMove = () => true, onMove, coords = opt('coords'), dots = opt('dots') }) {
  const th = THEMES.find((t) => t[0] === (S.chess.theme || 'ocean')) || THEMES[0];
  const el = h('div', { class: 'board', role: 'grid', 'aria-label': 'Chess board', style: { '--l': th[2], '--d': th[3] } });
  let sel = null, last = null, marks = {}, ghost = null, dragFrom = null;
  const sqName = (r, f) => orient === 'w' ? FILES[f] + (8 - r) : FILES[7 - f] + (r + 1);
  const draw = () => {
    const g = game(); const legal = sel ? g.moves({ square: sel, verbose: true }) : [];
    const kingSq = g.inCheck() ? g.board().flat().find((p) => p && p.type === 'k' && p.color === g.turn())?.square : null;
    el.replaceChildren(...Array.from({ length: 64 }, (_, i) => {
      const r = Math.floor(i / 8), f = i % 8, sq = sqName(r, f), p = g.get(sq), light = (r + f) % 2 === 0;
      const lm = dots ? legal.find((m) => m.to === sq) : null;
      const cls = ['sq', light ? 'l' : 'd', last && (last.from === sq || last.to === sq) ? 'last' : '', sel === sq ? 'sel' : '', kingSq === sq ? 'chk' : '', marks[sq] || ''].join(' ');
      return h('div', { class: cls, 'data-sq': sq, 'aria-label': sq + (p ? ' ' + p.color + p.type : '') },
        p && dragFrom !== sq ? h('div', { class: 'pc', style: { backgroundImage: `url("${PIECES[p.color + p.type]}")` } }) : null,
        lm ? h('div', { class: lm.captured ? 'ring' : 'dot' }) : null,
        coords && r === 7 ? h('span', { class: 'co f' }, sq[0]) : null, coords && f === 0 ? h('span', { class: 'co r' }, sq[1]) : null);
    }));
  };
  const tryMove = async (from, to) => {
    const g = game(); const ms = g.moves({ square: from, verbose: true }).filter((m) => m.to === to);
    if (!ms.length) return false;
    let promo = 'q';
    if (ms[0].promotion) promo = await new Promise((res) => { const close = sheet('Promote to', h('div', { class: 'promo' }, ['q', 'r', 'b', 'n'].map((t) => h('button', { 'aria-label': t, style: { backgroundImage: `url("${PIECES[g.turn() + t]}")` }, onclick: () => { close(); res(t); } }))), { onClose: () => res('q') }); });
    sel = null; onMove({ from, to, promotion: promo }); return true;
  };
  const sqAt = (x, y) => document.elementFromPoint(x, y)?.closest('.sq')?.dataset.sq;
  el.onpointerdown = (e) => {
    const sq = e.target.closest('.sq')?.dataset.sq; if (!sq) return; const g = game(); const p = g.get(sq);
    if (sel && sel !== sq && g.moves({ square: sel, verbose: true }).some((m) => m.to === sq)) { tryMove(sel, sq); return; }
    if (p && p.color === g.turn() && canMove(p.color)) {
      e.preventDefault(); sel = sq; haptic(4); draw(); dragFrom = null;
      const size = el.getBoundingClientRect().width / 8;
      const start = [e.clientX, e.clientY];
      const place = (ev) => { ghost.style.left = ev.clientX - size * .6 + 'px'; ghost.style.top = ev.clientY - size * .9 + 'px'; };
      const mv = (ev) => { if (!ghost && Math.hypot(ev.clientX - start[0], ev.clientY - start[1]) > 8) { dragFrom = sq; ghost = h('div', { class: 'drag', style: { width: size * 1.2 + 'px', height: size * 1.2 + 'px', backgroundImage: `url("${PIECES[p.color + p.type]}")` } }); document.body.append(ghost); draw(); } if (ghost) place(ev); };
      const up = async (ev) => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); if (ghost) { ghost.remove(); ghost = null; const to = sqAt(ev.clientX, ev.clientY); dragFrom = null; if (!(to && to !== sq && await tryMove(sq, to))) draw(); } };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    } else { sel = null; draw(); }
  };
  draw();
  return { el, draw, set last(v) { last = v; }, get last() { return last; }, set orient(v) { orient = v; draw(); }, get orient() { return orient; }, mark(m) { marks = m || {}; draw(); }, clearSel() { sel = null; } };
}
const sound = (m) => { if (!m || !opt('sound')) return; m.captured ? play('chip', { vol: 1.2 }) : play('step'); };
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
// captured pieces + material lead for one side
function capturedRow(g, side) {
  const took = g.history({ verbose: true }).filter((m) => m.color === side && m.captured).map((m) => m.captured).sort((a, b) => VAL[b] - VAL[a]);
  const score = (c) => g.board().flat().filter((p) => p && p.color === c).reduce((s, p) => s + VAL[p.type], 0);
  const lead = score(side) - score(side === 'w' ? 'b' : 'w');
  const opp = side === 'w' ? 'b' : 'w';
  return h('div', { class: 'caps' }, took.map((t) => h('i', { style: { backgroundImage: `url("${PIECES[opp + t]}")` } })), lead > 0 ? h('b', null, '+' + lead) : null);
}

// ---------- Settings ----------
const TCS = [[null, 'Off'], ['3+2', '3|2'], ['5+0', '5m'], ['10+0', '10m'], ['15+10', '15|10']];
const ODDS = [['none', 'None'], ['n', 'Knight'], ['r', 'Rook'], ['q', 'Queen']];
function boardSettings(onClose) {
  const c = S.chess;
  const themes = h('div', { class: 'themes' });
  const drawT = () => themes.replaceChildren(...THEMES.map(([id, n, l, d]) => h('button', { class: (c.theme || 'ocean') === id ? 'on' : '', onclick: () => { c.theme = id; save(); drawT(); }, 'aria-label': n },
    h('div', { class: 'sw' }, h('i', { style: { background: l } }), h('i', { style: { background: d } }), h('i', { style: { background: d } }), h('i', { style: { background: l } })), h('span', null, n))));
  drawT();
  const tog = (k, label, sub) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', null, label), sub ? h('span', null, sub) : null), seg([[true, 'On'], [false, 'Off']], opt(k), (v) => { c[k] = v; save(); }));
  sheet('Board & sound', h('div', { class: 'stack' }, h('b', null, 'Board theme'), themes,
    h('div', { class: 'group' }, tog('dots', 'Show legal moves'), tog('coords', 'Coordinates'), tog('sound', 'Move sounds'))), { onClose });
}
function aiSettings(onClose = () => dispatchEvent(new HashChangeEvent('hashchange'))) {
  const c = S.chess;
  const lvl = h('div', { class: 'group' });
  const drawL = () => lvl.replaceChildren(...LEVELS.map((L, i) => h('button', { class: 'rowi', onclick: () => { c.level = i; save(); drawL(); } }, h('div', { class: 't' }, h('b', null, `${i + 1}. ${L.n}`), h('span', null, L.elo)), h('div', { class: 'check' + (c.level === i ? ' on' : '') }, c.level === i ? icon('check') : null))));
  drawL();
  sheet('Game settings', h('div', { class: 'stack' },
    h('b', null, 'Play as'), seg([['w', 'White'], ['b', 'Black'], ['r', 'Random']], c.color || 'w', (v) => { c.color = v; save(); }),
    h('b', null, 'Clock'), seg(TCS.map(([v, l]) => [v, l]), c.tc ?? null, (v) => { c.tc = v; save(); }),
    h('b', null, 'Computer gives odds'), seg(ODDS, c.odds || 'none', (v) => { c.odds = v; save(); }), h('p', { class: 'small muted', style: { margin: 0 } }, 'The computer starts without that piece. Great for beating a level that\'s a bit too strong.'),
    h('b', null, 'Coach'), seg([[true, 'On'], [false, 'Off']], opt('coach', false), (v) => { c.coach = v; save(); }), h('p', { class: 'small muted', style: { margin: 0 } }, 'Rates every move you make: Best, Good, Inaccuracy, Mistake or Blunder.'),
    h('b', null, 'Blunder guard'), seg([[true, 'On'], [false, 'Off']], c.guard, (v) => { c.guard = v; save(); }), h('p', { class: 'small muted', style: { margin: 0 } }, 'If a move loses a piece or more, you get a warning and can take it back.'),
    h('b', null, 'Level'), lvl, h('button', { class: 'btn block', onclick: () => boardSettings() }, icon('grid'), 'Board theme & sound')), { onClose });
}
const oddsFen = (odds, aiColor) => {
  const g = new Chess(); if (!odds || odds === 'none') return null;
  const rank = aiColor === 'w' ? '1' : '8';
  g.remove({ n: 'b', r: 'a', q: 'd' }[odds] + rank); return g.fen();
};
// rough rating from results vs levels (Elo-style, starts at 800)
function estRating() {
  let R = 800; for (const gm of S.chess.games) { if (!gm.res || gm.opp === 'Friend' || gm.odds) continue; const L = LEVELS.find((x) => x.n === gm.opp); if (!L) continue; const E = parseInt(L.elo.replace(/\D/g, '')) || 800; const exp = 1 / (1 + 10 ** ((E - R) / 400)); R += 40 * ((gm.res === 'W' ? 1 : gm.res === 'D' ? .5 : 0) - exp); }
  return Math.round(R / 10) * 10;
}
const COACH = [[10, 'Best move', 'best'], [35, 'Excellent', 'best'], [80, 'Good', 'good'], [150, 'Inaccuracy', 'inacc'], [300, 'Mistake', 'mistake'], [1e9, 'Blunder', 'blunder']];
const dayIdx = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);

// ---------- Hub ----------
route(/^play\/chess$/, () => {
  const c = S.chess; const L = LEVELS[c.level];
  const recent = c.games.slice(-5).reverse();
  const done = Object.keys(c.opDone).length;
  const vsAi = c.games.filter((g) => g.opp && g.opp !== 'Friend' && g.res);
  const cnt = (r) => vsAi.filter((g) => g.res === r).length;
  if (firstTime('chess')) setTimeout(chessHelp, 350);
  const tile = (cls, href, ic, t, s, tall) => h('a', { class: 't ' + cls + (tall ? ' tall' : ''), href }, h('div', { class: 'ic' }, icon(ic)), h('div', null, h('b', null, t), h('span', null, s)));
  const dailyDone = c.daily === dayIdx();
  return page({ title: 'Chess', back: 'play', right: h('button', { class: 'btn sm', onclick: chessHelp }, 'How to play') },
    h('div', { class: 'hero' }, h('div', { class: 'k' }, c.cur ? 'Game in progress' : 'Play the computer'), h('div', { class: 'big' }, c.cur ? 'Resume' : L.n), h('div', { class: 'sub' }, c.cur ? 'Pick up where you left off.' : [`Level ${c.level + 1} · ${L.elo}`, c.tc ? c.tc.replace('+', '|') + ' clock' : null, c.odds && c.odds !== 'none' ? 'odds: ' + ODDS.find((o) => o[0] === c.odds)[1] : null, opt('coach', false) ? 'coach on' : null].filter(Boolean).join(' · ')), h('div', { class: 'gap16' }),
      h('div', { class: 'flex wrap' }, h('a', { class: 'btn primary', href: '#/play/chess/game/' + (c.cur?.mode || 'ai') }, c.cur ? 'Resume game' : 'Play'), c.cur ? h('button', { class: 'btn', style: { background: 'rgba(255,255,255,.16)', color: '#fff', boxShadow: 'none' }, onclick: () => { c.cur = null; save(); dispatchEvent(new HashChangeEvent('hashchange')); } }, 'New game') : h('button', { class: 'btn', style: { background: 'rgba(255,255,255,.16)', color: '#fff', boxShadow: 'none' }, onclick: () => aiSettings() }, 'Settings'))),
    h('div', { class: 'bento even' },
      tile('c-coral', '#/play/chess/puzzles', 'target', 'Puzzles', `${Math.min(c.puzzle, PUZZLES.length)}/${PUZZLES.length} · streak ${c.pStreak || 0}`),
      tile('c-yellow', '#/play/chess/rush', 'bolt', 'Puzzle Rush', c.rushBest ? 'Best ' + c.rushBest : '3 min, 3 strikes'),
      tile(dailyDone ? 'c-black' : 'c-purple', '#/play/chess/daily', 'star', 'Daily puzzle', dailyDone ? 'Done today' : 'New one every day'),
      tile('c-blue', '#/play/chess/openings', 'book', 'Openings', `${done}/${OPENINGS.length} learned`),
      tile('c-teal', '#/play/chess/endgames', 'flag', 'Endgames', `${Object.keys(c.endDone || {}).length}/${ENDGAMES.length} mastered`),
      tile('c-pink', '#/play/chess/vision', 'eye', 'Board Vision', c.visionBest ? 'Best ' + c.visionBest : 'Learn the squares'),
      tile('c-green', '#/play/chess/game/friend', 'users', 'vs Friend', 'Same phone, clocks'),
      tile('c-black', '#/play/chess/habits', 'bulb', 'Stop blundering', '5 habits that fix it')),
    sec('Your stats', h('button', { onclick: () => boardSettings(() => dispatchEvent(new HashChangeEvent('hashchange'))) }, 'Board theme')),
    h('div', { class: 'card statrow' }, [[estRating(), 'Est. rating'], [cnt('W') + '-' + cnt('D') + '-' + cnt('L'), 'W-D-L'], [Math.min(c.puzzle, PUZZLES.length), 'Puzzles'], [c.rushBest || 0, 'Rush best']].map(([v, l]) => h('div', null, h('b', null, String(v)), h('span', null, l)))),
    recent.length ? [sec('Recent games'), group(...recent.map((g) => row({ icon: g.res === 'W' ? 'star' : g.res === 'D' ? 'flip' : 'x', tone: g.res === 'W' ? 'g' : g.res === 'D' ? 's' : 'c', title: (g.res === 'W' ? 'Win' : g.res === 'D' ? 'Draw' : g.res === 'L' ? 'Loss' : g.label || 'Game') + (g.opp ? ' vs ' + g.opp : ''), sub: new Date(g.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + g.moves + ' moves' + (g.blunders != null ? ' · ' + g.blunders + ' blunders' : ''), href: '#/play/chess/review/' + g.id })))] : null,
  );
});
route(/^play\/chess\/habits$/, () => page({ title: 'Stop blundering', sub: 'Do these every move until they\'re automatic.', back: 'play/chess' },
  h('div', { class: 'stack' }, BLUNDER_CHECK.map(([t, b], i) => h('div', { class: 'card' }, h('div', { class: 'flex', style: { alignItems: 'flex-start' } }, h('div', { class: 'serif', style: { fontSize: '30px', color: 'var(--coral)', lineHeight: 1 } }, i + 1), h('div', null, h('b', null, t), h('p', { class: 'muted', style: { margin: '4px 0 0' } }, b)))))),
  sec('Opening principles'), group(...PRINCIPLES.map(([t, b]) => h('div', { class: 'rowi' }, h('div', { class: 'tile' }, icon('check')), h('div', { class: 't' }, h('b', null, t), h('span', { style: { whiteSpace: 'normal' } }, b))))),
  h('div', { class: 'gap16' }), h('a', { class: 'btn primary block', href: '#/play/chess/puzzles' }, 'Practice with puzzles')));

// ---------- Game ----------
const fmtClock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return s >= 60 ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : (ms < 10000 ? (Math.max(0, ms) / 1000).toFixed(1) : '0:' + String(s).padStart(2, '0')); };
route(/^play\/chess\/game\/(ai|friend)$/, (mode) => {
  const c = S.chess;
  if (c.cur && c.cur.mode !== mode) c.cur = null;
  const g = new Chess();
  let me = 'w', autoFlip = c.autoFlip ?? true;
  if (c.cur) { try { g.loadPgn(c.cur.pgn); } catch { } me = c.cur.me; }
  else {
    me = mode === 'ai' ? (c.color === 'r' ? (Math.random() < .5 ? 'w' : 'b') : c.color || 'w') : 'w';
    const odds = mode === 'ai' ? c.odds || 'none' : 'none'; const f = oddsFen(odds, me === 'w' ? 'b' : 'w'); if (f) g.load(f);
    const tc = c.tc || null; const base = tc ? +tc.split('+')[0] * 60000 : 0;
    c.cur = { mode, me, pgn: g.pgn(), level: c.level, odds, tc, clock: tc ? { w: base, b: base } : null }; save();
  }
  const cur = c.cur; const lv = cur.level ?? c.level;
  const inc = cur.tc ? +cur.tc.split('+')[1] * 1000 : 0;
  let thinking = false, pre = null, over = false;
  const status = h('div', { class: 'gstatus' });
  const evalBar = h('div', { class: 'evalwrap', style: { display: 'none' } }, h('div', { class: 'evalbar' }, h('i', { style: { width: '50%' } })));
  const movesEl = h('div', { class: 'moves' });
  const board = Board({ game: () => g, orient: mode === 'ai' ? me : 'w', canMove: (col) => !over && !thinking && (mode === 'friend' || col === me), onMove: userMove });
  // player strips (top = opponent of bottom side)
  const strip = (side) => h('div', { class: 'pstrip', 'data-side': side });
  const topS = strip(), botS = strip();
  const drawStrips = () => {
    const bottom = board.orient, top = bottom === 'w' ? 'b' : 'w';
    const name = (s) => mode === 'friend' ? (s === 'w' ? 'White' : 'Black') : s === me ? 'You' : LEVELS[lv].n;
    for (const [el, s] of [[topS, top], [botS, bottom]]) {
      el.dataset.side = s;
      el.replaceChildren(h('div', { class: 'who' }, h('i', { class: 'pc-dot ' + s }), h('b', null, name(s)), capturedRow(g, s)), cur.clock ? h('div', { class: 'clock' + (g.turn() === s && !over ? ' on' : '') + (cur.clock[s] < 20000 ? ' low' : '') }, fmtClock(cur.clock[s])) : null);
    }
  };
  const persist = () => { cur.pgn = g.pgn(); save(); };
  const drawMoves = () => { const hs = g.history(); movesEl.replaceChildren(...hs.flatMap((m, i) => [i % 2 === 0 ? h('span', { class: 'n' }, i / 2 + 1 + '.') : null, h('span', { class: i === hs.length - 1 ? 'cur' : '' }, m)])); movesEl.scrollTop = 1e4; };
  const say = (txt, chip) => status.replaceChildren(chip || '', h('span', null, txt));
  const setStatus = (chip) => {
    if (g.isCheckmate()) return end(mode === 'ai' ? (g.turn() === me ? 'L' : 'W') : (g.turn() === 'w' ? 'Black' : 'White') + ' wins', 'Checkmate');
    if (g.isDraw() || g.isStalemate() || g.isThreefoldRepetition() || g.isInsufficientMaterial()) return end('D', g.isStalemate() ? 'Stalemate' : 'Draw');
    say(thinking ? 'Computer is thinking…' : mode === 'friend' ? (g.turn() === 'w' ? 'White' : 'Black') + ' to move' + (g.inCheck() ? ' · check' : '') : g.turn() === me ? 'Your move' + (g.inCheck() ? ' · you\'re in check' : '') : '', chip);
    drawStrips();
  };
  // clock
  let tickT = 0, lastTick = 0;
  const started = () => g.history().length > 0;
  const tick = () => {
    if (!cur.clock || over || !board.el.isConnected) return;
    const now = performance.now(); if (started()) { cur.clock[g.turn()] -= now - lastTick; }
    lastTick = now;
    if (cur.clock[g.turn()] <= 0) { cur.clock[g.turn()] = 0; drawStrips(); const loser = g.turn(); return end(mode === 'ai' ? (loser === me ? 'L' : 'W') : (loser === 'w' ? 'Black' : 'White') + ' wins', 'Out of time'); }
    const el = (board.orient === g.turn() ? botS : topS).querySelector('.clock'); if (el) { el.textContent = fmtClock(cur.clock[g.turn()]); el.classList.toggle('low', cur.clock[g.turn()] < 20000); }
    tickT = setTimeout(tick, 100);
  };
  const afterMove = (color) => { if (cur.clock) { cur.clock[color] += inc; } };
  const lastOf = () => g.history({ verbose: true }).at(-1);
  async function userMove(mv) {
    const before = g.fen(); const mover = g.turn();
    let m; try { m = g.move(mv); } catch { board.draw(); return; }
    afterMove(mover); board.last = m; sound(m); board.draw(); drawMoves(); drawStrips();
    let chip = null;
    if (mode === 'ai' && (c.guard || opt('coach', false)) && !g.isCheckmate()) {
      say('Checking your move…'); thinking = true;
      const p0 = await (pre || analyse(before, 10)); const p1 = await analyse(g.fen(), 10);
      thinking = false;
      let loss = Math.max(0, p0.score - (-p1.score)); if (m.lan === p0.best) loss = 0;
      if (c.guard && loss >= 180 && -p1.score < 250) {
        const bestSan = (() => { try { return uciMove(new Chess(before), p0.best).san; } catch { return p0.best; } })();
        const take = await new Promise((res) => { let done = false; const close = sheet('Hold on, check that move', h('div', { class: 'stack' }, h('p', { class: 'muted', style: { margin: '0 4px' } }, `${m.san} drops about ${(loss / 100).toFixed(1)} pawns of value. Look at your opponent's checks, captures and threats first.`), h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => { done = true; close(); res(false); } }, 'Play it anyway'), h('button', { class: 'btn primary', onclick: () => { done = true; close(); res(true); } }, 'Take it back')), h('button', { class: 'btn ghost', onclick: (e) => { e.target.textContent = 'Best was ' + bestSan; } }, 'Show best move')), { onClose: () => !done && res(false) }); });
        if (take) { g.undo(); if (cur.clock) cur.clock[mover] -= inc; board.last = lastOf(); board.draw(); drawMoves(); setStatus(); return; }
        cur.guardHits = (cur.guardHits || 0) + 1;
      }
      if (opt('coach', false)) { const [, label, cls] = COACH.find(([t]) => loss <= t); chip = h('span', { class: 'coach ' + cls }, label); }
    }
    persist(); setStatus(chip); updEval();
    if (mode === 'friend' && autoFlip && !over) setTimeout(() => { board.orient = g.turn(); drawStrips(); }, 350);
    if (mode === 'ai' && !over) aiTurn(chip);
  }
  async function aiTurn(chip) {
    if (g.turn() === me || over) return;
    thinking = true; setStatus(chip);
    const t0 = Date.now(); const u = await engineMove(g, lv);
    await new Promise((r) => setTimeout(r, Math.max(0, 500 - (Date.now() - t0))));
    if (!board.el.isConnected || over) return;
    const mover = g.turn(); const m = uciMove(g, u); afterMove(mover); thinking = false; board.last = m; sound(m); board.draw(); drawMoves(); persist(); setStatus(chip); updEval();
    if ((c.guard || opt('coach', false)) && !over) pre = analyse(g.fen(), 10);
  }
  function end(res, why) {
    if (over) return; over = true; clearTimeout(tickT); say(why);
    const id = Date.now().toString(36);
    const rec = { id, at: Date.now(), pgn: g.pgn(), me: mode === 'ai' ? me : 'w', res: res.length === 1 ? res : null, moves: Math.ceil(g.history().length / 2), opp: mode === 'ai' ? LEVELS[lv].n : 'Friend', label: res.length > 1 ? res : null, odds: cur.odds !== 'none' ? cur.odds : undefined };
    c.games.push(rec); c.games = c.games.slice(-40); c.cur = null; markActive(); save();
    haptic([60, 40, 60]); drawStrips();
    setTimeout(() => sheet(why, h('div', { class: 'stack' }, h('div', { class: 'serif center', style: { fontSize: '38px' } }, res === 'W' ? 'You win' : res === 'L' ? 'You lose' : res === 'D' ? 'Draw' : res),
      mode === 'ai' ? h('p', { class: 'center muted', style: { margin: 0 } }, 'Estimated rating: ' + estRating()) : null,
      h('a', { class: 'btn primary block', href: '#/play/chess/review/' + id, onclick: () => document.querySelector('.scrim')?.click() }, 'Review with the engine'), h('button', { class: 'btn block', onclick: () => { document.querySelector('.scrim')?.click(); newGame(); } }, 'New game'))), 600);
  }
  const newGame = () => { c.cur = null; save(); dispatchEvent(new HashChangeEvent('hashchange')); };
  const hint = async () => { if (thinking || over) return; say('Thinking of a hint…'); const a = await analyse(g.fen(), 12); const from = a.best.slice(0, 2), to = a.best.slice(2, 4); board.mark({ [from]: 'hint', [to]: 'hint' }); setStatus(); cur.hints = (cur.hints || 0) + 1; setTimeout(() => board.mark({}), 2500); };
  const undo = () => { if (thinking || over) return; if (mode === 'ai') { g.undo(); if (g.turn() !== me) g.undo(); } else g.undo(); board.last = lastOf(); board.draw(); drawMoves(); persist(); setStatus(); updEval(); if (mode === 'ai' && g.turn() !== me) aiTurn(); pre = null; };
  const resign = async () => { if (over) return; if (await confirmSheet('Resign?', 'This counts as a loss.', 'Resign')) end(mode === 'ai' ? 'L' : (g.turn() === 'w' ? 'Black' : 'White') + ' wins', 'Resigned'); };
  // live eval: when on, re-evaluates after every move (from White's side)
  let evalOn = false, evalSeq = 0; const evalTxt = h('b', { class: 'evtxt' });
  const updEval = async () => { if (!evalOn) return; const seq = ++evalSeq; const fen = g.fen(), turn = g.turn(); evalTxt.textContent = '…'; const a = await analyse(fen, 11); if (seq !== evalSeq || !evalOn) return;
    const wv = (turn === 'w' ? 1 : -1) * a.score; const mate = Math.abs(wv) > 9000; evalBar.querySelector('i').style.width = (mate ? (wv > 0 ? 100 : 0) : Math.max(3, Math.min(97, 50 + 50 * (2 / (1 + Math.exp(-wv / 250)) - 1)))) + '%';
    evalTxt.textContent = mate ? (wv > 0 ? 'White mates' : 'Black mates') : (wv > 0 ? '+' : '') + (wv / 100).toFixed(1); };
  const showEval = () => { evalOn = !evalOn; c.evalOn = evalOn; save(); evalBar.style.display = evalOn ? '' : 'none'; if (evalOn) updEval(); };
  const flip = () => { if (mode === 'friend' && autoFlip) { autoFlip = false; c.autoFlip = false; save(); toast('Auto-flip off'); } board.orient = board.orient === 'w' ? 'b' : 'w'; drawStrips(); };

  board.last = lastOf(); board.draw(); drawMoves(); setStatus();
  evalBar.append(evalTxt); if (c.evalOn) { evalOn = true; evalBar.style.display = ''; setTimeout(updEval, 300); }
  if (mode === 'ai') { if (g.turn() !== me && !over) setTimeout(aiTurn, 400); else if (c.guard || opt('coach', false)) pre = analyse(g.fen(), 10); }
  if (cur.clock && !over) setTimeout(() => { lastTick = performance.now(); tick(); }, 60);
  onLeave(() => { clearTimeout(tickT); if (!over) persist(); });
  const tb = (ic, label, fn) => h('button', { class: 'tbtn', onclick: fn, 'aria-label': label }, icon(ic), h('span', null, label));
  const title = mode === 'ai' ? `vs ${LEVELS[lv].n} (${LEVELS[lv].elo})` : 'vs Friend';
  return page({ title, back: 'play/chess', large: false, right: h('div', { class: 'flex', style: { gap: 4 } }, h('button', { class: 'iconbtn', onclick: () => boardSettings(() => board.draw()), 'aria-label': 'Board settings' }, icon('gear')), h('button', { class: 'iconbtn', onclick: newGame, 'aria-label': 'New game' }, icon('plus'))) },
    h('div', { class: 'stack', style: { gap: '8px' } }, status, topS, board.el, botS, evalBar,
      h('div', { class: 'flex', style: { gap: 6 } }, mode === 'ai' ? tb('bulb', 'Hint', hint) : null, tb('flip', 'Flip', flip), tb('undo', 'Undo', undo), tb('eye', 'Eval', showEval), tb('flag', 'Resign', resign)),
      h('div', { class: 'card', style: { padding: 12 } }, movesEl)));
});


// ---------- Review ----------
route(/^play\/chess\/review\/(\w+)$/, (id) => {
  const rec = S.chess.games.find((x) => x.id === id); if (!rec) return page({ title: 'Game not found', back: 'play/chess' });
  const full = new Chess(); full.loadPgn(rec.pgn); const hist = full.history({ verbose: true });
  const fens = [full.getHeaders().FEN || new Chess().fen(), ...hist.map((m) => m.after)];
  let ply = hist.length; const view = new Chess(fens[ply]);
  const board = Board({ game: () => view, orient: rec.me, canMove: () => false, onMove: () => { } });
  const info = h('div', { class: 'card small', style: { minHeight: 64 } }, 'Tap "Analyze" to find your mistakes.');
  const list = h('div');
  let res = rec.analysis || null;
  const goto = (p) => { ply = Math.max(0, Math.min(hist.length, p)); view.load(fens[ply]); board.last = hist[ply - 1]; const mk = {}; const a = res?.[ply]; if (a && a.cls) { mk[hist[ply - 1].to] = 'bad'; } board.mark(mk);
    if (a?.cls) { info.replaceChildren(h('b', { class: 'cls-' + a.cls }, `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'} ${hist[ply - 1].san} — ${a.cls === 'inacc' ? 'inaccuracy' : a.cls}`), h('div', { class: 'muted' }, `Better was ${a.bestSan}. ${a.cls === 'blunder' ? 'Lost ' + (a.loss / 100).toFixed(1) + ' pawns of value.' : ''}`), h('button', { class: 'btn sm line', style: { marginTop: 8 }, onclick: () => { view.load(fens[ply - 1]); board.last = hist[ply - 2]; board.mark({ [a.best.slice(0, 2)]: 'hint', [a.best.slice(2, 4)]: 'hint' }); } }, 'Show the better move')); }
    else info.textContent = ply ? `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'} ${hist[ply - 1].san}` : 'Start position'; };
  const drawList = () => { if (!res) return; const mine = rec.me; const items = hist.map((m, i) => ({ m, i, a: res[i + 1] })).filter((x) => x.a?.cls && x.m.color === mine);
    const cnt = (k) => items.filter((x) => x.a.cls === k).length;
    list.replaceChildren(h('div', { class: 'row3' }, [['blunder', 'Blunders'], ['mistake', 'Mistakes'], ['inacc', 'Inaccuracies']].map(([k, l]) => h('div', { class: 'card center', style: { padding: 12 } }, h('div', { class: 'serif cls-' + k, style: { fontSize: '28px' } }, cnt(k)), h('div', { class: 'small muted' }, l)))),
      h('div', { class: 'gap8' }), items.length ? group(...items.map((x) => row({ title: `${Math.ceil((x.i + 1) / 2)}${x.i % 2 ? '…' : '.'} ${x.m.san}`, sub: 'Better: ' + x.a.bestSan, detail: h('span', { class: 'cls-' + x.a.cls }, x.a.cls === 'inacc' ? '?!' : x.a.cls === 'mistake' ? '?' : '??'), onclick: () => { goto(x.i + 1); scrollTo({ top: 0, behavior: 'smooth' }); } }))) : h('div', { class: 'empty' }, 'Clean game — no big mistakes by you.'));
  };
  const analyze = async (btn) => {
    btn.disabled = true; res = {}; let prev = await analyse(fens[0], 10);
    for (let i = 0; i < hist.length; i++) {
      btn.textContent = `Analyzing ${i + 1}/${hist.length}…`;
      const cur = await analyse(fens[i + 1], 10); if (!board.el.isConnected) return;
      const before = prev.score, after = -cur.score; const loss = before - after;
      let cls = loss >= 300 ? 'blunder' : loss >= 150 ? 'mistake' : loss >= 80 ? 'inacc' : null;
      if (cls && before > 600 && after > 400) cls = null; if (cls && before < -600) cls = null;
      let bestSan = prev.best; try { bestSan = uciMove(new Chess(fens[i]), prev.best).san; } catch { }
      if (hist[i].san === bestSan) cls = null;
      res[i + 1] = { cls, loss, best: prev.best, bestSan }; prev = cur;
    }
    rec.analysis = res; rec.blunders = Object.entries(res).filter(([k, v]) => v.cls === 'blunder' && hist[k - 1].color === rec.me).length; save();
    btn.remove(); drawList(); goto(ply);
  };
  const nav = h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => goto(0), 'aria-label': 'Start' }, '|◀'), h('button', { class: 'btn', onclick: () => goto(ply - 1), 'aria-label': 'Back' }, '◀'), h('button', { class: 'btn', onclick: () => goto(ply + 1), 'aria-label': 'Forward' }, '▶'), h('button', { class: 'btn', onclick: () => goto(hist.length), 'aria-label': 'End' }, '▶|'));
  const aBtn = h('button', { class: 'btn primary block', onclick: (e) => analyze(e.currentTarget) }, 'Analyze my mistakes');
  goto(ply); drawList();
  return page({ title: 'Review', back: 'play/chess', large: false }, h('div', { class: 'stack', style: { gap: 10 } }, board.el, nav, info, res ? null : aBtn, list));
});

// ---------- Openings ----------
route(/^play\/chess\/openings$/, () => {
  const by = (s) => OPENINGS.filter((o) => o.side === s);
  const r = (o) => row({ icon: S.chess.opDone[o.id] ? 'check' : 'book', tone: S.chess.opDone[o.id] ? 'g' : o.side === 'w' ? '' : 'n', title: o.name, sub: o.idea, detail: o.tag, href: '#/play/chess/opening/' + o.id });
  return page({ title: 'Openings', sub: 'Learn the moves AND the reasons. Then drill until you can play them from memory.', back: 'play/chess' },
    sec('As White'), group(...by('w').map(r)), sec('As Black'), group(...by('b').map(r)),
    sec('Principles'), group(...PRINCIPLES.map(([t, b]) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', null, t), h('span', { style: { whiteSpace: 'normal' } }, b))))));
});
route(/^play\/chess\/opening\/(\w+)$/, (id) => {
  const o = OPENINGS.find((x) => x.id === id); let mode = 'learn', i = 0, fails = 0;
  const g = new Chess();
  const note = h('div', { class: 'card', style: { minHeight: 90 } });
  const ctr = h('div');
  const board = Board({ game: () => g, orient: o.side, canMove: (col) => mode === 'drill' && col === o.side, onMove: (mv) => drillMove(mv) });
  const setTo = (k) => { g.reset(); for (let j = 0; j < k; j++) g.move(o.moves[j]); i = k; board.last = g.history({ verbose: true }).at(-1); board.mark({}); board.draw(); showNote(); };
  const showNote = () => { const k = i - 1; note.replaceChildren(h('div', { class: 'small dim' }, i ? `${Math.ceil(i / 2)}${i % 2 ? '.' : '…'} ${o.moves[k]}` : 'Start'), h('div', { style: { marginTop: 4 } }, i === 0 ? o.idea : (o.notes[k] || (g.history({ verbose: true }).at(-1).color === o.side ? 'Your move in the line.' : 'Opponent\'s move.')))); };
  const learnCtr = () => ctr.replaceChildren(h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => setTo(Math.max(0, i - 1)) }, '◀ Back'), h('button', { class: 'btn primary', onclick: () => { if (i < o.moves.length) setTo(i + 1); else { toast('End of line — now drill it'); } } }, 'Next ▶')));
  const drillStart = () => { setTo(0); fails = 0; if (o.side === 'b') setTimeout(() => { setTo(1); }, 400); ctr.replaceChildren(h('p', { class: 'small muted center' }, 'Play the next move for your side. Wrong moves get a hint after 2 tries.')); };
  function drillMove(mv) {
    const exp = o.moves[i]; const t = new Chess(g.fen()); let m; try { m = t.move(mv); } catch { return board.draw(); }
    if (m.san !== exp) { fails++; haptic([30, 40, 30]); sfx.bad(); board.mark({ [mv.to]: 'bad' }); setTimeout(() => board.mark(fails >= 2 ? { [new Chess(g.fen()).move(exp).from]: 'hint' } : {}), 500); note.replaceChildren(h('b', null, 'Not the book move.'), h('div', { class: 'muted' }, fails >= 2 ? 'Hint: the highlighted piece moves.' : 'Think about the idea of this opening.')); return; }
    fails = 0; setTo(i + 1); sound(m);
    if (i >= o.moves.length) return finishDrill();
    setTimeout(() => { setTo(i + 1); if (i >= o.moves.length) finishDrill(); }, 500);
  }
  const finishDrill = () => { S.chess.opDone[o.id] = (S.chess.opDone[o.id] || 0) + 1; markActive(); save(); haptic([40, 40, 40]); ctr.replaceChildren(h('div', { class: 'card center' }, h('b', null, 'Line complete!'), h('p', { class: 'muted small' }, `Drilled ${S.chess.opDone[o.id]}× · do it 3 times on different days to lock it in.`), h('button', { class: 'btn primary', onclick: drillStart }, 'Drill again'))); };
  setTo(0); learnCtr();
  return page({ title: o.name, back: 'play/chess/openings', large: false },
    h('div', { class: 'stack', style: { gap: 10 } }, seg([['learn', 'Learn'], ['drill', 'Drill']], 'learn', (v) => { mode = v; v === 'learn' ? (setTo(0), learnCtr()) : drillStart(); }), board.el, note, ctr));
});


// ---------- Puzzles (shared view) ----------
const isMate = (P) => P.mate > 0;
function puzzleView(P, { onSolve, onFail, next, quick = false } = {}) {
  const g = new Chess(P.fen); const side = g.turn(); let step = 0, failed = false, solved = false;
  const msg = h('div', { class: 'card', style: { minHeight: 70 } }, h('b', null, (side === 'w' ? 'White' : 'Black') + ' to move'), h('div', { class: 'muted' }, P.mate ? `Find mate in ${P.mate}.` : 'Find the move that wins material or the game.'));
  const win = () => { solved = true; (haptic([40, 40, 80]), sfx.win()); onSolve?.(failed);
    if (!quick) msg.replaceChildren(h('b', { style: { color: 'var(--good)' } }, failed ? 'Solved (with a miss)' : 'Solved!'), h('div', { class: 'muted' }, 'Line: ' + P.line.slice(0, Math.max(P.sol.length, 3)).join(' ')), next ? [h('div', { class: 'gap8' }), h('button', { class: 'btn primary', onclick: next }, 'Next puzzle')] : null); };
  const board = Board({ game: () => g, orient: side, canMove: (c) => !solved && c === side, onMove: (mv) => {
    const t = new Chess(g.fen()); let m; try { m = t.move(mv); } catch { return board.draw(); }
    const want = P.sol[step]; const isWant = m.from + m.to === want.slice(0, 4) && (!m.promotion || m.promotion === (want[4] || 'q'));
    if (isWant || t.isCheckmate()) {
      g.move(mv); board.last = m; sound(m); board.draw(); step++;
      if (t.isCheckmate() || step >= P.sol.length) return win();
      setTimeout(() => { const r = uciMove(g, P.sol[step]); board.last = r; sound(r); board.draw(); step++; if (step >= P.sol.length) win(); }, quick ? 300 : 450);
    } else {
      failed = true; haptic([30, 40, 30]); sfx.bad(); board.mark({ [mv.to]: 'bad' }); setTimeout(() => board.mark({}), 600);
      if (quick) { solved = true; onFail?.(); return; }
      msg.replaceChildren(h('b', { style: { color: 'var(--bad)' } }, 'Not quite'), h('div', { class: 'muted' }, 'Look for checks, captures and threats, in that order.'));
    }
  } });
  return { board, msg, hint: () => { board.mark({ [P.sol[step].slice(0, 2)]: 'hint' }); failed = true; }, show: () => { failed = true; const u = P.sol[step]; board.mark({ [u.slice(0, 2)]: 'hint', [u.slice(2, 4)]: 'hint' }); } };
}
route(/^play\/chess\/puzzles$/, () => {
  const c = S.chess; const wrap = h('div');
  const match = (P) => (c.pTheme || 'all') === 'all' || (c.pTheme === 'mate' ? isMate(P) : !isMate(P));
  const nextIdx = () => { for (let k = 0; k < PUZZLES.length; k++) { const j = (c.puzzle + k) % PUZZLES.length; if (match(PUZZLES[j])) return j; } return c.puzzle % PUZZLES.length; };
  const load = () => {
    const fixed = Q.get('i') != null; const idx = fixed ? +Q.get('i') : nextIdx(); const P = PUZZLES[idx];
    const v = puzzleView(P, { onSolve: (failed) => { if (!fixed) { c.puzzle = idx + 1; c.pStreak = failed ? 0 : (c.pStreak || 0) + 1; c.pSolved = (c.pSolved || 0) + 1; markActive(); save(); } }, next: () => { history.replaceState(null, '', '#/play/chess/puzzles'); load(); } });
    const chips = h('div', { class: 'chips' }, [['all', 'All'], ['mate', 'Checkmates'], ['win', 'Win material']].map(([id, l]) => h('button', { class: 'chip' + ((c.pTheme || 'all') === id ? ' on' : ''), onclick: () => { c.pTheme = id; save(); history.replaceState(null, '', '#/play/chess/puzzles'); load(); } }, l)));
    wrap.replaceChildren(h('div', { class: 'stack', style: { gap: 10 } }, chips,
      h('div', { class: 'flex', style: { justifyContent: 'space-between' } }, h('b', null, `Puzzle ${idx + 1} of ${PUZZLES.length}`), h('span', { class: 'pill c' }, `Streak ${c.pStreak || 0}`)),
      v.board.el, v.msg, h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: v.hint }, 'Hint'), h('button', { class: 'btn', onclick: v.show }, 'Show move'), h('button', { class: 'btn', onclick: () => { c.puzzle = idx + 1; c.pStreak = 0; save(); history.replaceState(null, '', '#/play/chess/puzzles'); load(); } }, 'Skip'))));
  };
  load();
  return page({ title: 'Puzzles', back: 'play/chess', large: false }, wrap);
});
route(/^play\/chess\/daily$/, () => {
  const c = S.chess; const d = dayIdx(); const P = PUZZLES[(d * 37) % PUZZLES.length];
  const v = puzzleView(P, { onSolve: () => { if (c.daily !== d) { c.daily = d; c.dailyN = (c.dailyLast === d - 1 ? c.dailyN || 0 : 0) + 1; c.dailyLast = d; markActive(); save(); } } });
  return page({ title: 'Daily puzzle', back: 'play/chess', large: false },
    h('div', { class: 'stack', style: { gap: 10 } }, h('div', { class: 'flex', style: { justifyContent: 'space-between' } }, h('b', null, new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })), h('span', { class: 'pill c' }, (c.dailyN || 0) + ' day streak')),
      v.board.el, v.msg, h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: v.hint }, 'Hint'), h('button', { class: 'btn', onclick: v.show }, 'Show move'))));
});

// ---------- Puzzle Rush ----------
route(/^play\/chess\/rush$/, () => {
  const c = S.chess; const wrap = h('div');
  const intro = () => wrap.replaceChildren(h('div', { class: 'stack' },
    h('div', { class: 'hero' }, h('div', { class: 'k' }, 'Puzzle Rush'), h('div', { class: 'big' }, '3:00'), h('div', { class: 'sub' }, 'Solve as many as you can. One wrong move is a strike. Three strikes and you\'re out.'), h('div', { class: 'gap16' }), h('button', { class: 'btn primary', onclick: start }, 'Start')),
    h('div', { class: 'card statrow' }, [[c.rushBest || 0, 'Best score'], [c.rushRuns || 0, 'Runs']].map(([v, l]) => h('div', null, h('b', null, String(v)), h('span', null, l))))));
  let score, strikes, endAt, t, order, k;
  function start() { score = 0; strikes = 0; k = 0; endAt = Date.now() + 180000; order = PUZZLES.map((_, i) => i).sort(() => Math.random() - .5); next(); tick(); }
  const top = h('div', { class: 'rushbar' });
  const drawTop = () => top.replaceChildren(h('div', { class: 'clock on' + (endAt - Date.now() < 30000 ? ' low' : '') }, fmtClock(endAt - Date.now())), h('b', { class: 'rscore' }, String(score)), h('div', { class: 'strikes' }, [0, 1, 2].map((i) => h('i', { class: i < strikes ? 'x' : '' }, i < strikes ? icon('x') : null))));
  function tick() { clearTimeout(t); if (!top.isConnected && k) return; drawTop(); if (Date.now() >= endAt) return finish(); t = setTimeout(tick, 200); }
  function next() {
    const P = PUZZLES[order[k++ % order.length]];
    const v = puzzleView(P, { quick: true, onSolve: () => { score++; drawTop(); setTimeout(next, 350); }, onFail: () => { strikes++; drawTop(); if (strikes >= 3) setTimeout(finish, 500); else setTimeout(next, 700); } });
    wrap.replaceChildren(h('div', { class: 'stack', style: { gap: 10 } }, top, v.board.el, h('div', { class: 'small center', style: { fontWeight: 700 } }, (new Chess(P.fen).turn() === 'w' ? 'White' : 'Black') + ' to move' + (P.mate ? ` · mate in ${P.mate}` : ''))));
    drawTop();
  }
  function finish() { clearTimeout(t); if (endAt === 0) return; endAt = 0; c.rushRuns = (c.rushRuns || 0) + 1; const best = score > (c.rushBest || 0); if (best) c.rushBest = score; markActive(); save(); haptic([60, 40, 60]);
    wrap.replaceChildren(h('div', { class: 'stack' }, h('div', { class: 'hero' }, h('div', { class: 'k' }, best ? 'New best' : 'Time\'s up'), h('div', { class: 'big' }, String(score)), h('div', { class: 'sub' }, `puzzles solved · best ${c.rushBest}`), h('div', { class: 'gap16' }), h('button', { class: 'btn primary', onclick: start }, 'Go again')))); }
  onLeave(() => clearTimeout(t));
  intro();
  return page({ title: 'Puzzle Rush', back: 'play/chess', large: false }, wrap);
});

// ---------- Board Vision ----------
route(/^play\/chess\/vision$/, () => {
  const c = S.chess; const wrap = h('div'); let side = c.visionSide || 'w';
  const g = new Chess(); g.clear();
  const intro = () => wrap.replaceChildren(h('div', { class: 'stack' },
    h('div', { class: 'hero' }, h('div', { class: 'k' }, 'Board Vision'), h('div', { class: 'big' }, '30 sec'), h('div', { class: 'sub' }, 'A square name appears. Tap that square on the board. No coordinates to help you. Knowing squares makes reading puzzles and openings much faster.'), h('div', { class: 'gap16' }), h('button', { class: 'btn primary', onclick: start }, 'Start')),
    h('b', null, 'Board from'), seg([['w', 'White side'], ['b', 'Black side']], side, (v) => { side = v; c.visionSide = v; save(); }),
    h('div', { class: 'card statrow' }, [[c.visionBest || 0, 'Best (White)'], [c.visionBestB || 0, 'Best (Black)']].map(([v, l]) => h('div', null, h('b', null, String(v)), h('span', null, l))))));
  let score, miss, target, endAt, t;
  const rnd = () => FILES[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8));
  const top = h('div', { class: 'rushbar' }); const tgt = h('div', { class: 'vtarget' });
  const drawTop = () => top.replaceChildren(h('div', { class: 'clock on' + (endAt - Date.now() < 10000 ? ' low' : '') }, fmtClock(endAt - Date.now())), h('b', { class: 'rscore' }, String(score)), h('span', { class: 'small', style: { fontWeight: 800, opacity: .8 } }, miss + ' missed'));
  function start() {
    score = 0; miss = 0; endAt = Date.now() + 30000; target = rnd(); tgt.textContent = target;
    const board = Board({ game: () => g, orient: side, coords: false, canMove: () => false, onMove: () => { } });
    board.el.addEventListener('pointerdown', (e) => { const sq = e.target.closest('.sq')?.dataset.sq; if (!sq || !endAt) return;
      if (sq === target) { score++; beep(700, .04, .15); board.mark({ [sq]: 'hint' }); } else { miss++; haptic(20); board.mark({ [sq]: 'bad', [target]: 'hint' }); }
      setTimeout(() => board.mark({}), 250); let n; do n = rnd(); while (n === target); target = n; tgt.textContent = target; drawTop(); });
    wrap.replaceChildren(h('div', { class: 'stack', style: { gap: 10 } }, top, tgt, board.el)); tick();
  }
  function tick() { clearTimeout(t); drawTop(); if (Date.now() >= endAt) return finish(); t = setTimeout(tick, 200); }
  function finish() { endAt = 0; const key = side === 'w' ? 'visionBest' : 'visionBestB'; const best = score > (c[key] || 0); if (best) c[key] = score; markActive(); save();
    wrap.replaceChildren(h('div', { class: 'stack' }, h('div', { class: 'hero' }, h('div', { class: 'k' }, best ? 'New best' : 'Done'), h('div', { class: 'big' }, String(score)), h('div', { class: 'sub' }, `squares found · ${miss} missed · best ${c[key]}`), h('div', { class: 'gap16' }), h('button', { class: 'btn primary', onclick: start }, 'Go again')))); }
  onLeave(() => clearTimeout(t));
  intro();
  return page({ title: 'Board Vision', back: 'play/chess', large: false }, wrap);
});

// ---------- Endgames ----------
const ENDGAMES = [
  { id: 'kq', n: 'Queen checkmate', s: 'King + queen vs king', fen: '8/8/8/4k3/8/8/8/KQ6 w - - 0 1', tip: 'Use the queen to box the king in (a knight\'s move away), shrink the box, then bring your king up and mate on the edge. Watch out for stalemate!' },
  { id: 'rr', n: 'Two-rook ladder', s: 'Two rooks vs king', fen: '8/8/3k4/8/8/8/8/R3K2R w - - 0 1', tip: 'One rook cuts off a rank, the other checks on the next rank. Leapfrog them up the board like a ladder until the king hits the edge.' },
  { id: 'kr', n: 'Rook checkmate', s: 'King + rook vs king', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', tip: 'Cut the king off with the rook, walk your king toward it, and give check only when the kings face each other. Mate happens on the edge.' },
  { id: 'kp', n: 'Promote the pawn', s: 'King + pawn vs king', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', tip: 'Keep your king in front of the pawn. Take the opposition (kings facing with one square between) and escort the pawn to the last rank. Win by promoting.' },
];
route(/^play\/chess\/endgames$/, () => page({ title: 'Endgames', sub: 'Win these against the engine at full strength. Every player should know them by heart.', back: 'play/chess' },
  group(...ENDGAMES.map((e) => row({ icon: S.chess.endDone?.[e.id] ? 'check' : 'flag', tone: S.chess.endDone?.[e.id] ? 'g' : 's', title: e.n, sub: e.s, detail: S.chess.endDone?.[e.id] ? S.chess.endDone[e.id] + '×' : '', href: '#/play/chess/endgame/' + e.id })))));
route(/^play\/chess\/endgame\/(\w+)$/, (id) => {
  const E = ENDGAMES.find((x) => x.id === id); if (!E) return page({ title: 'Not found', back: 'play/chess/endgames' });
  const c = S.chess; c.endDone ||= {};
  let g, over, thinking;
  const msg = h('div', { class: 'card', style: { minHeight: 70 } });
  const holder = h('div');
  const tip = () => msg.replaceChildren(h('b', null, E.id === 'kp' ? 'Promote the pawn' : 'Checkmate in as few moves as you can'), h('div', { class: 'muted' }, E.tip));
  const done = (won, why) => { over = true; if (won) { c.endDone[id] = (c.endDone[id] || 0) + 1; markActive(); save(); (haptic([40, 40, 80]), sfx.win()); }
    msg.replaceChildren(h('b', { style: { color: won ? 'var(--good)' : 'var(--bad)' } }, why), h('div', { class: 'muted' }, won ? `Done in ${Math.ceil(g.history().length / 2)} moves. Do it again faster.` : 'Not this time. Try again.'), h('div', { class: 'gap8' }), h('button', { class: 'btn primary', onclick: reset }, 'Try again')); };
  const check = (m) => {
    if (g.isCheckmate()) return done(g.turn() === 'b', 'Checkmate!');
    if (E.id === 'kp' && m?.promotion) return done(true, 'Promoted!');
    if (g.isStalemate()) return done(false, 'Stalemate: that\'s a draw');
    if (g.isDraw()) return done(false, E.id === 'kp' ? 'The pawn fell: draw' : 'Draw');
    return false;
  };
  let board;
  const reset = () => { g = new Chess(E.fen); over = false; thinking = false; board = Board({ game: () => g, orient: 'w', canMove: (col) => !over && !thinking && col === 'w', onMove }); holder.replaceChildren(board.el); tip(); };
  async function onMove(mv) {
    let m; try { m = g.move(mv); } catch { return board.draw(); }
    board.last = m; sound(m); board.draw(); if (check(m)) return;
    thinking = true; const u = await engineMove(g, 6); await new Promise((r) => setTimeout(r, 250));
    if (!holder.isConnected || over) return; const r = uciMove(g, u); thinking = false; board.last = r; sound(r); board.draw(); check(r);
  }
  reset();
  return page({ title: E.n, back: 'play/chess/endgames', large: false }, h('div', { class: 'stack', style: { gap: 10 } }, holder, msg,
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: async () => { if (over || thinking) return; const a = await analyse(g.fen(), 14); board.mark({ [a.best.slice(0, 2)]: 'hint', [a.best.slice(2, 4)]: 'hint' }); setTimeout(() => board.mark({}), 2500); } }, 'Hint'), h('button', { class: 'btn', onclick: reset }, 'Restart'))));
});
