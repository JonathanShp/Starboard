// Overboard!: a Sorry!/Trouble-style race, pass-and-play on one phone. Roll, race four pawns home, knock friends overboard.
import { h, S, save, route, sheet, toast, shuffle, haptic, confirmSheet, onLeave, go, sfx } from './core.js';
import { bg, bpage } from './boardgames.js';
import { tableView, act, boardDice, pawnSVG } from './bgtable.js';
import { howTo } from './howto.js';

const COL = ['#FF5A3C', '#3D7BFF', '#1FA85A', '#E8A800'];
const RULES = 'Everyone has 4 pawns waiting in their cabin. Take turns rolling the die.\n\nRoll a 6 to bring a pawn out onto your start square. A 6 also gives you another roll.\n\nMove one pawn forward by the roll. Land exactly on another player\'s pawn and they go overboard: back to their cabin. You can\'t land on your own pawn.\n\nWaterslides: land on the first square of a slide that isn\'t your color and you zoom to the end, knocking everyone on the slide overboard.\n\nAfter one lap, pawns turn into your colored home lane. You need the exact roll to move in the lane. First to get all 4 pawns home wins.';
const LAP = 28, LAST = 31; // progress 0..27 on the deck, 28..31 in your home lane
const SLIDE = (s) => [s * 7 + 2, s * 7 + 5]; // each seat's slide: start → end on the ring
const JOKES = ['Splash!', 'Man overboard!', 'Bon voyage!', 'Swim back to your cabin!', 'Someone throw a life ring!', 'That\'s going in the group chat.'];

// board geometry in 0..100 units
const ring = (i) => { const s = Math.floor(i / 7), j = i % 7, d = 80 / 7 * j; return [[90 - d, 90], [10, 90 - d], [10 + d, 10], [90, 10 + d]][s]; };
const DIR = [[1, 1], [-1, 1], [-1, -1], [1, -1]]; // seat corner direction from the centre
const lane = (seat, m) => { const [sx, sy] = DIR[seat], o = 25 - m * 5.2; return [50 + sx * o, 50 + sy * o]; };
const cabin = (seat) => { const [sx, sy] = DIR[seat]; return [50 + sx * 31.5, 50 + sy * 31.5]; };

route(/^play\/board\/over$/, () => {
  const st = bg(); const body = h('div'); let G = st.over; if (G?.phase === 'wait') { G.turn = (G.turn + 1) % G.P.length; G.phase = 'roll'; } let busy = false, TV, D, plane, geo;
  const persist = () => { st.over = G; save(); };
  const begin = (names) => { st.ovNames = names; const n = names.length; const seats = n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3];
    G = { P: names.map((nm, i) => ({ n: nm, seat: seats[i], c: COL[seats[i]], pw: [-1, -1, -1, -1] })), turn: 0, phase: 'roll', roll: 0, last: [6], log: [names[0] + ' rolls first.'], wins: G?.wins || {} }; persist(); render(); };
  const setup = () => { const names = [...(st.ovNames || S.party.players || []).slice(0, 4)];
    const inp = h('input', { placeholder: 'Add player', enterkeyhint: 'done' });
    const add = () => { const v = inp.value.trim(); if (v && names.length < 4 && !names.includes(v)) names.push(v); inp.value = ''; draw(); };
    inp.onkeydown = (e) => { if (e.key === 'Enter') add(); };
    const draw = () => body.replaceChildren(h('div', { class: 'stack fade-in' }, h('b', null, 'Players (2–4)'), h('div', { class: 'flex' }, inp, h('button', { class: 'btn primary sm', onclick: add }, 'Add')),
      h('div', { class: 'flex wrap' }, names.map((v, i) => h('button', { class: 'chip', style: { boxShadow: `inset 0 0 0 3px ${COL[names.length === 2 ? [0, 2][i] : i] || '#14130F'}` }, onclick: () => { names.splice(i, 1); draw(); } }, v, ' ×'))),
      names.length >= 2 ? h('button', { class: 'btn accent block', onclick: () => begin(names) }, 'Start game') : h('p', { class: 'small dim center' }, 'Add at least 2 players')));
    draw(); };
  // ---------- rules ----------
  const cur = () => G.P[G.turn];
  const log = (m) => { G.log.push(m); G.log = G.log.slice(-30); };
  const ringOf = (p, prog) => (p.seat * 7 + prog) % LAP;
  const ownAt = (p, prog) => p.pw.includes(prog);
  const target = (p, k, roll) => { const at = p.pw[k];
    if (at < 0) return roll === 6 && !ownAt(p, 0) ? 0 : null;
    const to = at + roll; if (to > LAST || ownAt(p, to)) return null; return to; };
  const moves = (p, roll) => { const seen = new Set(), out = []; p.pw.forEach((at, k) => { const t = target(p, k, roll); if (t == null) return; const key = at + '>' + t; if (seen.has(key)) return; seen.add(key); out.push(k); }); return out; };
  const knock = (r, by) => { G.P.forEach((q) => { if (q === by) return; q.pw.forEach((at, k) => { if (at >= 0 && at < LAP && ringOf(q, at) === r) { q.pw[k] = -1; log(`${by.n} knocked ${q.n} overboard! ${JOKES[Math.floor(Math.random() * JOKES.length)]}`); sfx.boom(); haptic([60, 40, 120]); } }); }); };
  const step = async (p, k, to) => { const from = p.pw[k];
    if (from < 0) { p.pw[k] = 0; sfx.pop(); draw(); await pause(250); }
    else for (let x = from + 1; x <= to; x++) { p.pw[k] = x; sfx.step(); draw(); await pause(150); }
    const prog = p.pw[k]; if (prog >= LAP) { const n = p.pw.filter((v) => v >= LAP).length; if (from < LAP) log(`${p.n} has ${n} pawn${n > 1 ? 's' : ''} in the home lane.`); return; }
    const r = ringOf(p, prog); knock(r, p);
    for (let s = 0; s < 4; s++) { const [a, b] = SLIDE(s); if (r !== a || s === p.seat) continue; const endProg = prog + (b - a); if (ownAt(p, endProg)) break;
      log(`Wheee! ${p.n} took the waterslide.`); sfx.coins();
      for (let x = a + 1; x <= b; x++) knock(x, p);
      p.pw[k] = endProg; draw(); await pause(300); break; } };
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  const won = (p) => p.pw.every((v) => v >= LAP);
  const nextTurn = () => { G.turn = (G.turn + 1) % G.P.length; G.phase = 'roll'; G.roll = 0; log(`${cur().n}'s turn.`); persist(); render(); };
  const doRoll = async () => { if (busy || G.phase !== 'roll') return; if (!D) layout(); if (!D) return toast('One moment…'); busy = true; render();
    const [v] = await D.roll(); G.last = [v]; G.roll = v; const p = cur(); log(`${p.n} rolled ${v}.`); busy = false;
    const ms = moves(p, v);
    if (!ms.length) { log(v === 6 ? `${p.n} can't move, but rolls again.` : `${p.n} can't move.`); G.phase = v === 6 ? 'roll' : 'wait'; persist(); render(); if (v !== 6) setTimeout(() => G?.phase === 'wait' && nextTurn(), 1100); return; }
    if (ms.length === 1) return move(ms[0]);
    G.phase = 'move'; persist(); render(); };
  const move = async (k) => { const p = cur(); const to = target(p, k, G.roll); if (to == null || busy) return; busy = true; G.phase = 'moving'; render();
    await step(p, k, to); busy = false;
    if (won(p)) { G.phase = 'over'; G.winner = G.turn; G.wins[p.n] = (G.wins[p.n] || 0) + 1; persist(); sfx.win(); haptic([60, 40, 60, 40, 140]); return render(); }
    if (G.roll === 6) { G.phase = 'roll'; log(`${p.n} rolled a 6: roll again.`); persist(); return render(); }
    nextTurn(); };
  // ---------- view ----------
  const tilt = () => (TV?.look === 'print' ? 0 : 22);
  const pt = ([x, y]) => [x * geo.u, y * geo.u];
  const svgBoard = () => { const s = []; const u = 1;
    s.push(`<rect x="1" y="1" width="98" height="98" rx="7" fill="#F3EAD3" stroke="#C9B68A" stroke-width=".8"/><rect x="18" y="18" width="64" height="64" rx="5" fill="#BFE3EA"/>`);
    // slides
    for (let seat = 0; seat < 4; seat++) { const [a, b] = SLIDE(seat), A = ring(a), B = ring(b); const c = COL[seat];
      s.push(`<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="${c}" stroke-width="7.4" stroke-linecap="round" opacity=".9"/><line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="#fff" stroke-width="1.2" stroke-dasharray="2 3" stroke-linecap="round" opacity=".8"/>`); }
    for (let i = 0; i < LAP; i++) { const [x, y] = ring(i); const st0 = i % 7 === 0; const c = st0 ? COL[i / 7] : '#FFFDF6';
      s.push(`<circle cx="${x}" cy="${y}" r="4.3" fill="${c}" stroke="rgba(0,0,0,.35)" stroke-width=".5"/>`);
      if (SLIDE(Math.floor(i / 7))[0] === i) s.push(`<circle cx="${x}" cy="${y}" r="2" fill="#fff"/>`); }
    for (let seat = 0; seat < 4; seat++) { const used = G.P.some((p) => p.seat === seat); const c = COL[seat];
      for (let m = 0; m < 4; m++) { const [x, y] = lane(seat, m); s.push(`<circle cx="${x}" cy="${y}" r="3.4" fill="${used ? c : '#E8DFC6'}" opacity="${used ? .45 : 1}" stroke="rgba(0,0,0,.3)" stroke-width=".4"/>`); }
      const [cx, cy] = cabin(seat); s.push(`<rect x="${cx - 6}" y="${cy - 6}" width="12" height="12" rx="2.5" fill="${used ? c : '#E8DFC6'}" stroke="rgba(0,0,0,.35)" stroke-width=".5"/>`); }
    s.push(`<text x="50" y="35" text-anchor="middle" font-family="ui-serif, Georgia, serif" font-weight="900" font-size="6.4" fill="#0E5B6B" letter-spacing=".4">OVERBOARD!</text>`);
    return `<svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">${s.join('')}</svg>`; };
  const layout = () => {
    if (!TV || (busy && D)) return; const W0 = TV.stage.clientWidth, H0 = TV.stage.clientHeight; if (!W0 || H0 < 100) return;
    if (geo && geo.W0 === W0 && geo.H0 === H0 && geo.look === TV.look) return;
    const BW = Math.min(W0 - (tilt() ? 34 : 16), (H0 - 16) / (tilt() ? .93 : 1), 560); geo = { W0, H0, look: TV.look, BW, u: BW / 100 };
    plane = h('div', { class: 'tv-plane', style: { left: (W0 - BW) / 2 + 'px', top: Math.max(4, (H0 - BW) / 2) + 'px', width: BW + 'px', height: BW + 'px', transform: `rotateX(${tilt()}deg)`, transformOrigin: '50% 50%' } });
    const ds = Math.round(Math.max(30, Math.min(44, BW * .1)));
    D = boardDice(1, ds, G.last); Object.assign(D.el.style, { left: BW / 2 - ds / 2 + 'px', top: BW / 2 - ds / 2 + 'px' });
    plane.append(h('div', { class: 'ob-board', html: svgBoard() }), D.el); TV.stage.replaceChildren(plane); draw(); };
  function draw() { if (!plane || !G) return; plane.querySelectorAll('.ob-pc, .tv-up, .tv-sh, .ob-cab').forEach((e) => e.remove());
    const T = tilt(), ms = G.phase === 'move' ? moves(cur(), G.roll) : [];
    G.P.forEach((p, pi) => {
      const home = p.pw.filter((v) => v < 0).length; const [cx, cy] = pt(cabin(p.seat)); const canOut = pi === G.turn && ms.some((k) => p.pw[k] < 0);
      plane.append(h('button', { class: 'ob-cab' + (canOut ? ' glow' : ''), style: { left: cx - 22 + 'px', top: cy - 22 + 'px', '--c': p.c }, 'aria-label': `${p.n}: ${home} in cabin`, onclick: () => { if (canOut) move(ms.find((k) => p.pw[k] < 0)); else toast(`${p.n} has ${home} in the cabin`); } }, h('b', null, home), h('small', null, 'cabin')));
      p.pw.forEach((at, k) => { if (at < 0) return; const xy = pt(at < LAP ? ring(ringOf(p, at)) : lane(p.seat, at - LAP)); const can = pi === G.turn && ms.includes(k);
        plane.append(h('div', { class: 'tv-sh', style: { left: xy[0] - 9 + 'px', top: xy[1] - 4 + 'px', width: '18px', height: '8px' } }),
          h('div', { class: 'tv-up', html: pawnSVG(p.c), style: { left: xy[0] - 11 + 'px', top: xy[1] - 31 + 'px', width: '22px', height: '34px', transform: `rotateX(${-T}deg) scale(.8)`, zIndex: String(Math.round(xy[1])), filter: can ? 'drop-shadow(0 0 3px #FFD21A) drop-shadow(0 0 3px #FFD21A)' : '' } }),
          h('button', { class: 'ob-pc', style: { left: xy[0] - 18 + 'px', top: xy[1] - 22 + 'px' }, 'aria-label': `${p.n} pawn`, onclick: () => { if (can) move(k); } })); }); }); }
  const playersSheet = () => sheet('Players', h('div', { class: 'group' }, G.P.map((q, i) => h('div', { class: 'rowi' + (i === G.turn ? ' on' : '') }, h('i', { class: 'opdot', style: { background: q.c } }), h('div', { class: 't' }, h('b', null, q.n), h('span', null, `${q.pw.filter((v) => v < 0).length} in cabin · ${q.pw.filter((v) => v >= 0 && v < LAP).length} on deck · ${q.pw.filter((v) => v >= LAP).length} home`)), h('b', null, (G.wins[q.n] || 0) + ((G.wins[q.n] || 0) === 1 ? ' win' : ' wins'))))));
  const restart = async () => { if (!await confirmSheet('Restart game?', 'Everyone goes back to their cabin. Same players.', 'Restart', false)) return; begin(st.ovNames); };
  const guard = (fn) => () => (busy ? toast('Wait for the move') : fn());
  const openTV = () => { if (TV) return;
    TV = tableView({ bg: (l) => l === 'print' ? 'paper' : 'teak', look: st.ovLook || 'table', onLook: (l) => { st.ovLook = l; save(); geo = null; layout(); },
      menu: () => [['Players', 'users', playersSheet], ['Game log', 'list', () => sheet('Game log', h('div', { class: 'stack', style: { gap: 6 } }, [...G.log].reverse().map((m) => h('div', { class: 'small' }, m))))],
        ['How to play', 'book', () => howTo('over', { title: 'Overboard!', rules: RULES, color: '#0FB5BA' })], ['Restart game', 'flip', guard(restart), 'Same players'], ['Change players', 'users', guard(() => { closeTV(); G = null; st.over = null; save(); setup(); })], ['Leave table', 'x', () => go('play/board'), 'Your game is saved']] });
    TV.onResize = layout; layout(); if (!geo) requestAnimationFrame(layout); };
  const closeTV = () => { TV?.close(); TV = null; geo = null; D = null; plane = null; };
  function render() {
    if (!G) { closeTV(); return setup(); }
    if (G.phase === 'moving' && !busy) G.phase = 'move';
    if (G.phase === 'over') { closeTV(); const w = G.P[G.winner];
      body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal', style: { background: w.c, minHeight: 'auto', padding: 28 } }, h('div', { class: 'k', style: { color: 'rgba(255,255,255,.85)' } }, 'All 4 pawns home'), h('div', { class: 'w' }, w.n + ' wins')),
        h('div', { class: 'group' }, G.P.map((q) => h('div', { class: 'rowi' }, h('i', { class: 'opdot', style: { background: q.c } }), h('div', { class: 't' }, h('b', null, q.n)), h('b', null, (G.wins[q.n] || 0) + ((G.wins[q.n] || 0) === 1 ? ' win' : ' wins'))))),
        h('button', { class: 'btn accent block', onclick: () => begin(st.ovNames) }, 'Play again'), h('button', { class: 'btn block', onclick: () => { G = null; st.over = null; save(); setup(); } }, 'Change players'))); return; }
    body.replaceChildren(h('p', { class: 'muted center' }, 'Game in progress.'), h('button', { class: 'btn accent block', onclick: () => { closeTV(); render(); } }, 'Back to the table'));
    openTV(); const p = cur();
    TV.players(G.P.map((q) => ({ n: q.n, c: q.c, v: q.pw.filter((v) => v >= LAP).length + '/4 home'.slice(0, G.P.length > 3 ? 2 : 7) })), G.turn);
    const ms = G.phase === 'move' ? moves(p, G.roll) : [];
    TV.acts(busy ? [act(G.phase === 'moving' ? 'Moving…' : 'Rolling…', null, { go: 1, dis: 1 })]
      : G.phase === 'move' ? [act(`Rolled ${G.roll}: tap a glowing pawn`, null, { on: 1, dis: 1 }), ms.some((k) => p.pw[k] < 0) ? act('Bring one out', () => move(ms.find((k) => p.pw[k] < 0))) : null]
      : G.phase === 'wait' ? [act('No move', null, { dis: 1 })]
      : [act('Roll die', doRoll, { go: 1, sub: p.n + '’s turn' })]);
    TV.tip(G.log.at(-1)); layout(); draw(); }
  onLeave(() => { if (G) persist(); closeTV(); });
  G ? render() : setup();
  return bpage('over', RULES, body);
});
