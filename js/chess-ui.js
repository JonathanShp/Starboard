import { h, icon, S, save, route, page, row, group, ftile, sec, seg, sheet, toast, go, pick, rand, haptic, beep, onLeave, confirmSheet, markActive, Q } from './core.js';
import { howTo, firstTime } from './howto.js';
const CHESS_RULES = 'Tap a piece, then a square (or drag it). Dots show legal moves.\n\nBlunder check: if your move drops a piece or more, Starboard asks "Are you sure?" so you can rethink. Turn it off in the chess menu.\n\nStuck? Hint shows a good piece to move. Undo takes back your last move.\n\nAfter every game, Review marks your blunders, mistakes and inaccuracies with the better move.';
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
function Board({ game, orient = 'w', canMove = () => true, onMove }) {
  const el = h('div', { class: 'board', role: 'grid', 'aria-label': 'Chess board' });
  let sel = null, last = null, marks = {}, ghost = null, dragFrom = null;
  const sqName = (r, f) => orient === 'w' ? FILES[f] + (8 - r) : FILES[7 - f] + (r + 1);
  const draw = () => {
    const g = game(); const legal = sel ? g.moves({ square: sel, verbose: true }) : [];
    const kingSq = g.inCheck() ? g.board().flat().find((p) => p && p.type === 'k' && p.color === g.turn())?.square : null;
    el.replaceChildren(...Array.from({ length: 64 }, (_, i) => {
      const r = Math.floor(i / 8), f = i % 8, sq = sqName(r, f), p = g.get(sq), light = (r + f) % 2 === 0;
      const lm = legal.find((m) => m.to === sq);
      const cls = ['sq', light ? 'l' : 'd', last && (last.from === sq || last.to === sq) ? 'last' : '', sel === sq ? 'sel' : '', kingSq === sq ? 'chk' : '', marks[sq] || ''].join(' ');
      return h('div', { class: cls, 'data-sq': sq, 'aria-label': sq + (p ? ' ' + p.color + p.type : '') },
        p && dragFrom !== sq ? h('div', { class: 'pc', style: { backgroundImage: `url("${PIECES[p.color + p.type]}")` } }) : null,
        lm ? h('div', { class: lm.captured ? 'ring' : 'dot' }) : null,
        f === 7 ? h('span', { class: 'co f' }, '') : null, r === 7 ? h('span', { class: 'co f' }, sq[0]) : null, f === 0 ? h('span', { class: 'co r' }, sq[1]) : null);
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
      sel = sq; haptic(4); draw(); dragFrom = null;
      const size = el.getBoundingClientRect().width / 8;
      const start = [e.clientX, e.clientY];
      const mv = (ev) => { if (!ghost && Math.hypot(ev.clientX - start[0], ev.clientY - start[1]) > 6) { dragFrom = sq; ghost = h('div', { class: 'drag', style: { width: size * 1.15 + 'px', height: size * 1.15 + 'px', backgroundImage: `url("${PIECES[p.color + p.type]}")` } }); document.body.append(ghost); draw(); } if (ghost) { ghost.style.left = ev.clientX - size * .575 + 'px'; ghost.style.top = ev.clientY - size * .8 + 'px'; } };
      const up = async (ev) => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); if (ghost) { ghost.remove(); ghost = null; const to = sqAt(ev.clientX, ev.clientY); dragFrom = null; if (!(to && to !== sq && await tryMove(sq, to))) draw(); } };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    } else { sel = null; draw(); }
  };
  draw();
  return { el, draw, set last(v) { last = v; }, get last() { return last; }, set orient(v) { orient = v; draw(); }, get orient() { return orient; }, mark(m) { marks = m || {}; draw(); }, clearSel() { sel = null; } };
}
const sound = (m) => { if (!m) return; m.captured ? beep(320, .07, .25) : beep(520, .05, .18); };

// ---------- Hub ----------
route(/^play\/chess$/, () => {
  const c = S.chess; const L = LEVELS[c.level];
  const recent = c.games.slice(-5).reverse();
  const done = Object.keys(c.opDone).length;
  if (firstTime('chess')) setTimeout(chessHelp, 350);
  return page({ title: 'Chess', back: 'play', right: h('button', { class: 'btn sm', onclick: chessHelp }, 'How to play') },
    h('div', { class: 'hero' }, h('div', { class: 'k' }, c.cur ? 'Game in progress' : 'Play the computer'), h('div', { class: 'big' }, c.cur ? 'Resume' : L.n), h('div', { class: 'sub' }, c.cur ? 'Pick up where you left off.' : `Level ${c.level + 1} · ${L.elo} · Blunder guard ${c.guard ? 'on' : 'off'}`), h('div', { class: 'gap16' }),
      h('div', { class: 'flex wrap' }, h('a', { class: 'btn primary', href: '#/play/chess/game/' + (c.cur?.mode || 'ai') }, c.cur ? 'Resume game' : 'Play'), c.cur ? null : h('button', { class: 'btn', style: { background: 'rgba(255,255,255,.16)', color: '#fff', boxShadow: 'none' }, onclick: aiSettings }, 'Settings'))),
    h('div', { class: 'gap16' }),
    h('div', { class: 'row2' },
      ftile({ icon: 'target', tone: 'c', title: 'Puzzles', sub: `${Math.min(c.puzzle, PUZZLES.length)}/${PUZZLES.length} solved`, href: '#/play/chess/puzzles' }),
      ftile({ icon: 'book', tone: 'b', title: 'Openings', sub: `${done}/${OPENINGS.length} learned`, href: '#/play/chess/openings' }),
      ftile({ icon: 'users', tone: 'y', title: 'vs Friend', sub: 'Same device, auto-flip', href: '#/play/chess/game/friend', onclick: () => { if (c.cur?.mode === 'ai') { } } }),
      ftile({ icon: 'bulb', tone: 'p', title: 'Stop blundering', sub: 'The 5 habits that fix it', href: '#/play/chess/habits' })),
    recent.length ? [sec('Recent games'), group(...recent.map((g) => row({ icon: g.res === 'W' ? 'star' : g.res === 'D' ? 'flip' : 'x', tone: g.res === 'W' ? 'g' : g.res === 'D' ? 's' : 'c', title: (g.res === 'W' ? 'Win' : g.res === 'D' ? 'Draw' : g.res === 'L' ? 'Loss' : 'Game') + (g.opp ? ' vs ' + g.opp : ''), sub: new Date(g.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + g.moves + ' moves' + (g.blunders != null ? ' · ' + g.blunders + ' blunders' : ''), href: '#/play/chess/review/' + g.id })))] : null,
  );
});
function aiSettings() {
  const c = S.chess;
  const lvl = h('div', { class: 'group' });
  const drawL = () => lvl.replaceChildren(...LEVELS.map((L, i) => h('button', { class: 'rowi', onclick: () => { c.level = i; save(); drawL(); } }, h('div', { class: 't' }, h('b', null, `${i + 1}. ${L.n}`), h('span', null, L.elo)), h('div', { class: 'check' + (c.level === i ? ' on' : '') }, c.level === i ? icon('check') : null))));
  drawL();
  sheet('Computer settings', h('div', { class: 'stack' },
    h('b', null, 'Play as'), seg([['w', 'White'], ['b', 'Black'], ['r', 'Random']], c.color || 'w', (v) => { c.color = v; save(); }),
    h('b', null, 'Blunder guard'), seg([[true, 'On'], [false, 'Off']], c.guard, (v) => { c.guard = v; save(); }), h('p', { class: 'small muted', style: { margin: 0 } }, 'Before your move counts, the engine checks it. If it loses a piece or more, you get a warning and can take it back.'),
    h('b', null, 'Level'), lvl), { onClose: () => dispatchEvent(new HashChangeEvent('hashchange')) });
}
route(/^play\/chess\/habits$/, () => page({ title: 'Stop blundering', sub: 'Do these every move until they\'re automatic.', back: 'play/chess' },
  h('div', { class: 'stack' }, BLUNDER_CHECK.map(([t, b], i) => h('div', { class: 'card' }, h('div', { class: 'flex', style: { alignItems: 'flex-start' } }, h('div', { class: 'serif', style: { fontSize: '30px', color: 'var(--coral)', lineHeight: 1 } }, i + 1), h('div', null, h('b', null, t), h('p', { class: 'muted', style: { margin: '4px 0 0' } }, b)))))),
  sec('Opening principles'), group(...PRINCIPLES.map(([t, b]) => h('div', { class: 'rowi' }, h('div', { class: 'tile' }, icon('check')), h('div', { class: 't' }, h('b', null, t), h('span', { style: { whiteSpace: 'normal' } }, b))))),
  h('div', { class: 'gap16' }), h('a', { class: 'btn primary block', href: '#/play/chess/puzzles' }, 'Practice with puzzles')));

// ---------- Game ----------
route(/^play\/chess\/game\/(ai|friend)$/, (mode) => {
  const c = S.chess;
  if (c.cur && c.cur.mode !== mode) c.cur = null;
  const g = new Chess();
  let me = 'w', autoFlip = c.autoFlip ?? true;
  if (c.cur) { try { g.loadPgn(c.cur.pgn); } catch { } me = c.cur.me; }
  else { me = mode === 'ai' ? (c.color === 'r' ? (Math.random() < .5 ? 'w' : 'b') : c.color || 'w') : 'w'; c.cur = { mode, me, pgn: '', level: c.level }; save(); }
  const lv = c.cur.level ?? c.level;
  let thinking = false, pre = null, over = false;
  const status = h('div', { class: 'small muted', style: { minHeight: 20 } });
  const evalBar = h('div', { class: 'evalbar', style: { display: 'none' } }, h('i', { style: { width: '50%' } }));
  const movesEl = h('div', { class: 'moves' });
  const board = Board({ game: () => g, orient: mode === 'ai' ? me : 'w', canMove: (col) => !over && !thinking && (mode === 'friend' || col === me), onMove: userMove });
  const persist = () => { c.cur.pgn = g.pgn(); save(); };
  const drawMoves = () => { const hs = g.history(); movesEl.replaceChildren(...hs.flatMap((m, i) => [i % 2 === 0 ? h('span', { class: 'n' }, i / 2 + 1 + '.') : null, h('span', { class: i === hs.length - 1 ? 'cur' : '' }, m)])); movesEl.scrollTop = 1e4; };
  const setStatus = () => {
    if (g.isCheckmate()) return end(g.turn() === me && mode === 'ai' ? 'L' : mode === 'ai' ? 'W' : (g.turn() === 'w' ? 'Black' : 'White') + ' wins', 'Checkmate');
    if (g.isDraw() || g.isStalemate() || g.isThreefoldRepetition() || g.isInsufficientMaterial()) return end('D', g.isStalemate() ? 'Stalemate' : 'Draw');
    status.textContent = thinking ? 'Computer is thinking…' : mode === 'friend' ? (g.turn() === 'w' ? 'White' : 'Black') + ' to move' + (g.inCheck() ? ' · check' : '') : g.turn() === me ? 'Your move' + (g.inCheck() ? ' · you\'re in check' : '') : '';
  };
  const lastOf = () => { const hs = g.history({ verbose: true }); return hs.at(-1); };
  async function userMove(mv) {
    const before = g.fen();
    let m; try { m = g.move(mv); } catch { board.draw(); return; }
    board.last = m; sound(m); board.draw(); drawMoves();
    if (mode === 'ai' && c.guard && !g.isCheckmate()) {
      status.textContent = 'Checking your move…';
      thinking = true;
      const p0 = await (pre || analyse(before, 10)); const p1 = await analyse(g.fen(), 10);
      thinking = false;
      const loss = p0.score - (-p1.score);
      if (loss >= 180 && -p1.score < 250) {
        const bestSan = (() => { try { const t = new Chess(before); return uciMove(t, p0.best).san; } catch { return p0.best; } })();
        const take = await new Promise((res) => { let done = false; const close = sheet('Hold on — check that move', h('div', { class: 'stack' }, h('p', { class: 'muted', style: { margin: '0 4px' } }, `${m.san} drops about ${(loss / 100).toFixed(1)} pawns of value. Look at your opponent's checks, captures and threats first.`), h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => { done = true; close(); res(false); } }, 'Play it anyway'), h('button', { class: 'btn primary', onclick: () => { done = true; close(); res(true); } }, 'Take it back')), h('button', { class: 'btn ghost', onclick: (e) => { e.target.textContent = 'Best was ' + bestSan; } }, 'Show best move')), { onClose: () => !done && res(false) }); });
        if (take) { g.undo(); board.last = lastOf(); board.draw(); drawMoves(); setStatus(); return; }
        (c.cur.guardHits ||= 0); c.cur.guardHits++;
      }
    }
    persist(); setStatus();
    if (mode === 'friend' && autoFlip && !over) setTimeout(() => { board.orient = g.turn(); }, 350);
    if (mode === 'ai' && !over) aiTurn();
  }
  async function aiTurn() {
    if (g.turn() === me || over) return;
    thinking = true; setStatus();
    const t0 = Date.now(); const u = await engineMove(g, lv);
    await new Promise((r) => setTimeout(r, Math.max(0, 500 - (Date.now() - t0))));
    if (!board.el.isConnected) return;
    const m = uciMove(g, u); thinking = false; board.last = m; sound(m); board.draw(); drawMoves(); persist(); setStatus();
    if (c.guard && !over) pre = analyse(g.fen(), 10);
  }
  function end(res, why) {
    if (over) return; over = true; status.textContent = why;
    const id = Date.now().toString(36);
    const rec = { id, at: Date.now(), pgn: g.pgn(), me: mode === 'ai' ? me : 'w', res: res.length === 1 ? res : null, moves: Math.ceil(g.history().length / 2), opp: mode === 'ai' ? LEVELS[lv].n : 'Friend', label: res.length > 1 ? res : null };
    c.games.push(rec); c.games = c.games.slice(-30); c.cur = null; markActive(); save();
    haptic([60, 40, 60]);
    setTimeout(() => sheet(why, h('div', { class: 'stack' }, h('div', { class: 'serif center', style: { fontSize: '34px' } }, res === 'W' ? 'You win' : res === 'L' ? 'You lose' : res === 'D' ? 'Draw' : res),
      h('a', { class: 'btn primary block', href: '#/play/chess/review/' + id, onclick: () => document.querySelector('.scrim')?.click() }, 'Review with the engine'), h('button', { class: 'btn block', onclick: () => { document.querySelector('.scrim')?.click(); newGame(); } }, 'New game'))), 600);
  }
  const newGame = () => { c.cur = null; save(); dispatchEvent(new HashChangeEvent('hashchange')); };
  const hint = async () => { if (thinking || over) return; status.textContent = 'Thinking of a hint…'; const a = await analyse(g.fen(), 12); const from = a.best.slice(0, 2), to = a.best.slice(2, 4); board.mark({ [from]: 'hint', [to]: 'hint' }); setStatus(); c.cur.hints = (c.cur.hints || 0) + 1; setTimeout(() => board.mark({}), 2500); };
  const undo = () => { if (thinking || over) return; if (mode === 'ai') { g.undo(); if (g.turn() !== me) g.undo(); } else g.undo(); board.last = lastOf(); board.draw(); drawMoves(); persist(); setStatus(); if (mode === 'ai' && g.turn() !== me) aiTurn(); if (c.guard) pre = null; };
  const resign = async () => { if (over) return; if (await confirmSheet('Resign?', 'This counts as a loss.', 'Resign')) end(mode === 'ai' ? 'L' : (g.turn() === 'w' ? 'Black' : 'White') + ' wins', 'Resigned'); };
  const showEval = async () => { evalBar.style.display = evalBar.style.display ? '' : 'none'; if (!evalBar.style.display) { const a = await analyse(g.fen(), 12); const wv = (g.turn() === 'w' ? 1 : -1) * a.score; evalBar.firstChild.style.width = Math.max(4, Math.min(96, 50 + wv / 12)) + '%'; toast('Eval: ' + (Math.abs(wv) > 9000 ? 'mate' : (wv > 0 ? '+' : '') + (wv / 100).toFixed(1))); } };

  board.last = lastOf(); board.draw(); drawMoves(); setStatus();
  if (mode === 'ai') { if (g.turn() !== me) setTimeout(aiTurn, 400); else if (c.guard) pre = analyse(g.fen(), 10); }
  onLeave(() => { persist(); });
  const tb = (ic, label, fn) => h('button', { class: 'btn sm line', style: { flex: 1, padding: '0 6px' }, onclick: fn, 'aria-label': label }, icon(ic), label);
  return page({ title: mode === 'ai' ? `vs ${LEVELS[lv].n} (${LEVELS[lv].elo})` : 'vs Friend', back: 'play/chess', large: false, right: h('button', { class: 'iconbtn', onclick: newGame, 'aria-label': 'New game' }, icon('plus')) },
    h('div', { class: 'stack', style: { gap: '10px' } }, status, board.el, evalBar,
      h('div', { class: 'flex', style: { gap: 6 } }, mode === 'ai' ? tb('bulb', 'Hint', hint) : tb('flip', autoFlip ? 'Auto-flip' : 'Flip', () => { if (autoFlip) { autoFlip = false; c.autoFlip = false; save(); toast('Auto-flip off'); } board.orient = board.orient === 'w' ? 'b' : 'w'; }), tb('undo', 'Undo', undo), tb('eye', 'Eval', showEval), tb('flag', 'Resign', resign)),
      h('div', { class: 'card', style: { padding: 12 } }, movesEl)));
});

// ---------- Review ----------
route(/^play\/chess\/review\/(\w+)$/, (id) => {
  const rec = S.chess.games.find((x) => x.id === id); if (!rec) return page({ title: 'Game not found', back: 'play/chess' });
  const full = new Chess(); full.loadPgn(rec.pgn); const hist = full.history({ verbose: true });
  const fens = [new Chess().fen(), ...hist.map((m) => m.after)];
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
    if (m.san !== exp) { fails++; haptic([30, 40, 30]); beep(220, .15); board.mark({ [mv.to]: 'bad' }); setTimeout(() => board.mark(fails >= 2 ? { [new Chess(g.fen()).move(exp).from]: 'hint' } : {}), 500); note.replaceChildren(h('b', null, 'Not the book move.'), h('div', { class: 'muted' }, fails >= 2 ? 'Hint: the highlighted piece moves.' : 'Think about the idea of this opening.')); return; }
    fails = 0; setTo(i + 1); sound(m);
    if (i >= o.moves.length) return finishDrill();
    setTimeout(() => { setTo(i + 1); if (i >= o.moves.length) finishDrill(); }, 500);
  }
  const finishDrill = () => { S.chess.opDone[o.id] = (S.chess.opDone[o.id] || 0) + 1; markActive(); save(); haptic([40, 40, 40]); ctr.replaceChildren(h('div', { class: 'card center' }, h('b', null, 'Line complete!'), h('p', { class: 'muted small' }, `Drilled ${S.chess.opDone[o.id]}× · do it 3 times on different days to lock it in.`), h('button', { class: 'btn primary', onclick: drillStart }, 'Drill again'))); };
  setTo(0); learnCtr();
  return page({ title: o.name, back: 'play/chess/openings', large: false },
    h('div', { class: 'stack', style: { gap: 10 } }, seg([['learn', 'Learn'], ['drill', 'Drill']], 'learn', (v) => { mode = v; v === 'learn' ? (setTo(0), learnCtr()) : drillStart(); }), board.el, note, ctr));
});

// ---------- Puzzles ----------
route(/^play\/chess\/puzzles$/, () => {
  const wrap = h('div');
  const load = () => {
    const idx = Q.get('i') != null ? +Q.get('i') : S.chess.puzzle % PUZZLES.length; const P = PUZZLES[idx];
    const g = new Chess(P.fen); const side = g.turn(); let step = 0, failed = false, solved = false;
    const msg = h('div', { class: 'card', style: { minHeight: 70 } }, h('b', null, (side === 'w' ? 'White' : 'Black') + ' to move'), h('div', { class: 'muted' }, P.mate ? `Find mate in ${P.mate}.` : 'Find the move that wins material or the game.'));
    const board = Board({ game: () => g, orient: side, canMove: (c) => !solved && c === side, onMove: (mv) => {
      const t = new Chess(g.fen()); let m; try { m = t.move(mv); } catch { return board.draw(); }
      const want = P.sol[step]; const isWant = m.from + m.to + (m.promotion && m.promotion !== 'q' ? m.promotion : '') === want.slice(0, 4) + (want[4] && want[4] !== 'q' ? want[4] : '') || m.lan === want;
      if (isWant || t.isCheckmate()) {
        g.move(mv); board.last = m; sound(m); board.draw(); step++;
        if (t.isCheckmate() || step >= P.sol.length) return win();
        setTimeout(() => { const r = uciMove(g, P.sol[step]); board.last = r; sound(r); board.draw(); step++; if (step >= P.sol.length) win(); }, 450);
      } else { failed = true; haptic([30, 40, 30]); beep(220, .15); board.mark({ [mv.to]: 'bad' }); setTimeout(() => board.mark({}), 600); msg.replaceChildren(h('b', { style: { color: 'var(--bad)' } }, 'Not quite'), h('div', { class: 'muted' }, 'Look for checks, captures, and threats — in that order.')); }
    } });
    const win = () => { solved = true; haptic([40, 40, 80]); beep(990, .2); if (Q.get('i') == null) { S.chess.puzzle = idx + 1; S.chess.pStreak = failed ? 0 : (S.chess.pStreak || 0) + 1; markActive(); save(); }
      msg.replaceChildren(h('b', { style: { color: 'var(--good)' } }, failed ? 'Solved (with a miss)' : 'Solved!'), h('div', { class: 'muted' }, 'Line: ' + P.line.slice(0, Math.max(P.sol.length, 3)).join(' ')), h('div', { class: 'gap8' }), h('button', { class: 'btn primary', onclick: () => { history.replaceState(null, '', '#/play/chess/puzzles'); load(); } }, 'Next puzzle')); };
    const hint = () => { const f = P.sol[step].slice(0, 2); board.mark({ [f]: 'hint' }); failed = true; };
    const showSol = () => { failed = true; const u = P.sol[step]; board.mark({ [u.slice(0, 2)]: 'hint', [u.slice(2, 4)]: 'hint' }); };
    wrap.replaceChildren(h('div', { class: 'stack', style: { gap: 10 } },
      h('div', { class: 'flex', style: { justifyContent: 'space-between' } }, h('b', null, `Puzzle ${idx + 1} of ${PUZZLES.length}`), h('span', { class: 'pill c' }, `Streak ${S.chess.pStreak || 0}`)),
      board.el, msg, h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: hint }, 'Hint'), h('button', { class: 'btn', onclick: showSol }, 'Show move'), h('button', { class: 'btn', onclick: () => { S.chess.puzzle = idx + 1; S.chess.pStreak = 0; save(); load(); } }, 'Skip'))));
  };
  load();
  return page({ title: 'Puzzles', back: 'play/chess', large: false }, wrap);
});
