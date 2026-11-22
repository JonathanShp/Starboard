// Islanders: Catan-style trade-and-build, pass-and-play on one phone.
import { h, icon, S, save, route, seg, sheet, toast, shuffle, pick, rand, haptic, beep, confirmSheet, onLeave , sfx } from './core.js';
import { bg, dice, bpage } from './boardgames.js';

const RES = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const RN = { wood: 'Timber', brick: 'Clay', sheep: 'Wool', wheat: 'Grain', ore: 'Stone', desert: 'Sandbar' };
const RC = { wood: '#2E8B57', brick: '#D0623F', sheep: '#9AD16B', wheat: '#F2C14E', ore: '#8C96A3', desert: '#EADCB0' };
const COST = { road: { wood: 1, brick: 1 }, settle: { wood: 1, brick: 1, sheep: 1, wheat: 1 }, city: { wheat: 2, ore: 3 }, dev: { sheep: 1, wheat: 1, ore: 1 } };
const DEVN = { knight: 'Knight', vp: 'Victory point', road: 'Road building', plenty: 'Year of plenty', mono: 'Monopoly' };
const DEVD = { knight: 'Move the robber and steal a card. 3 knights = Largest Army (+2).', vp: '+1 point. Kept secret until you win.', road: 'Build 2 roads for free.', plenty: 'Take any 2 resources from the bank.', mono: 'Name a resource. Everyone gives you all of theirs.' };
const PCOL = ['#3D7BFF', '#FF5A3C', '#FFFFFF', '#FF9F1A'];
const RULES = 'Setup: in snake order, each player places 2 towns and a road next to each. Your second town gives you its neighbouring resources.\n\nEach turn, roll the 3D dice. Every island hex with that number pays its resource to towns (1) and cities (2) touching it.\n\nRoll a 7: anyone holding more than 7 cards loses half (picked at random). Then move the robber: that hex stops paying, and you steal a card from someone next to it.\n\nBuild: road = Timber + Clay. Town = Timber + Clay + Wool + Grain. City = 2 Grain + 3 Stone. Development card = Wool + Grain + Stone.\n\nTowns need a gap of 2 roads from any other town and must connect to your roads. Trade with players or the bank (4 of one for 1 of any).\n\nPoints: town 1, city 2, Longest Road (5+) 2, Largest Army (3+ knights) 2, victory point cards 1. First to 10 wins.';

// ---------- geometry (fixed layout: rows of 3,4,5,4,3) ----------
const R = 40, W = Math.sqrt(3) * R;
const HEX = [], VERT = [], EDGE = [];
(() => {
  const vk = {}, ek = {};
  const vid = (x, y) => { const k = Math.round(x) + ',' + Math.round(y); if (vk[k] == null) { vk[k] = VERT.length; VERT.push({ x, y, hex: [], adj: new Set(), edges: [] }); } return vk[k]; };
  [3, 4, 5, 4, 3].forEach((n, row) => { for (let c = 0; c < n; c++) {
    const x = (c - (n - 1) / 2) * W, y = (row - 2) * 1.5 * R; const id = HEX.length;
    const vs = Array.from({ length: 6 }, (_, k) => { const a = Math.PI / 180 * (60 * k - 90); return vid(x + R * Math.cos(a), y + R * Math.sin(a)); });
    vs.forEach((v) => VERT[v].hex.push(id));
    for (let k = 0; k < 6; k++) { const a = vs[k], b = vs[(k + 1) % 6]; const key = Math.min(a, b) + '-' + Math.max(a, b); if (ek[key] == null) { ek[key] = EDGE.length; EDGE.push({ a, b }); VERT[a].edges.push(ek[key]); VERT[b].edges.push(ek[key]); VERT[a].adj.add(b); VERT[b].adj.add(a); } }
    HEX.push({ x, y, v: vs });
  } });
  VERT.forEach((v) => v.adj = [...v.adj]);
  HEX.forEach((hx, i) => hx.nb = HEX.map((o, j) => j !== i && o.v.filter((v) => hx.v.includes(v)).length === 2 ? j : -1).filter((j) => j >= 0));
})();
const newBoard = () => {
  const res = shuffle([...Array(4).fill('wood'), ...Array(3).fill('brick'), ...Array(4).fill('sheep'), ...Array(4).fill('wheat'), ...Array(3).fill('ore'), 'desert']);
  let num;
  for (let tries = 0; tries < 500; tries++) { const nums = shuffle([2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]); num = res.map((r) => r === 'desert' ? 0 : nums.pop());
    if (!HEX.some((hx, i) => (num[i] === 6 || num[i] === 8) && hx.nb.some((j) => num[j] === 6 || num[j] === 8))) break; }
  return { res, num, robber: res.indexOf('desert') };
};
const pips = (n) => n ? 6 - Math.abs(7 - n) : 0;

route(/^play\/board\/isle$/, () => {
  const st = bg(); const body = h('div'); let G = st.isle; let busy = false, D;
  const persist = () => { st.isle = G; save(); };
  const setup = () => {
    const names = [...(st.isNames || S.party.players || []).slice(0, 4)];
    const inp = h('input', { placeholder: 'Add player', enterkeyhint: 'done' });
    const add = () => { const n = inp.value.trim(); if (n && names.length < 4 && !names.includes(n)) names.push(n); inp.value = ''; draw(); };
    inp.onkeydown = (e) => { if (e.key === 'Enter') add(); };
    const draw = () => body.replaceChildren(h('div', { class: 'stack fade-in' }, h('b', null, 'Players (2–4)'), h('div', { class: 'flex' }, inp, h('button', { class: 'btn primary sm', onclick: add }, 'Add')),
      h('div', { class: 'flex wrap' }, names.map((n, i) => h('button', { class: 'chip', style: { boxShadow: `inset 0 0 0 3px ${PCOL[i] === '#FFFFFF' ? '#14130F' : PCOL[i]}` }, onclick: () => { names.splice(i, 1); draw(); } }, n, ' ×'))),
      names.length >= 2 ? h('button', { class: 'btn accent block', onclick: () => { st.isNames = names; const n = names.length;
        G = { ...newBoard(), P: names.map((nm, i) => ({ n: nm, c: PCOL[i], hand: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }, dev: [], fresh: [], knights: 0 })), bld: {}, roads: {}, turn: 0, phase: 'setup', order: [...Array(n).keys(), ...[...Array(n).keys()].reverse()], step: 0, sub: 'settle', lastV: null, deck: shuffle([...Array(14).fill('knight'), ...Array(5).fill('vp'), 'road', 'road', 'plenty', 'plenty', 'mono', 'mono']), longest: null, army: null, last: [3, 4], log: [], played: false, mode: null };
        G.turn = G.order[0]; persist(); render(); } }, 'Start game') : h('p', { class: 'small dim center' }, 'Add at least 2 players')));
    draw();
  };
  // ---------- rules ----------
  const cur = () => G.P[G.turn];
  const log = (m) => { G.log.push(m); G.log = G.log.slice(-30); };
  const count = (p) => RES.reduce((s, r) => s + p.hand[r], 0);
  const afford = (p, c) => Object.entries(c).every(([r, n]) => p.hand[r] >= n);
  const spend = (p, c) => Object.entries(c).forEach(([r, n]) => p.hand[r] -= n);
  const roadsOf = (pi) => Object.keys(G.roads).filter((e) => G.roads[e] === pi).map(Number);
  const canSettle = (v, pi, initial) => { if (G.bld[v] || VERT[v].adj.some((a) => G.bld[a])) return false; return initial || VERT[v].edges.some((e) => G.roads[e] === pi); };
  const canRoad = (e, pi) => { if (G.roads[e] != null) return false; const { a, b } = EDGE[e];
    if (G.phase === 'setup') return a === G.lastV || b === G.lastV;
    return [a, b].some((v) => G.bld[v]?.p === pi || (!(G.bld[v] && G.bld[v].p !== pi) && VERT[v].edges.some((o) => o !== e && G.roads[o] === pi))); };
  const roadLen = (pi) => { const mine = roadsOf(pi); let best = 0;
    const dfs = (v, used, len) => { best = Math.max(best, len); if (G.bld[v] && G.bld[v].p !== pi && len > 0) return; for (const e of VERT[v].edges) if (G.roads[e] === pi && !used.has(e)) { used.add(e); const { a, b } = EDGE[e]; dfs(a === v ? b : a, used, len + 1); used.delete(e); } };
    for (const e of mine) { dfs(EDGE[e].a, new Set(), 0); dfs(EDGE[e].b, new Set(), 0); } return best; };
  const updateLongest = () => { const L = G.P.map((_, i) => roadLen(i)); const max = Math.max(...L);
    if (G.longest != null && L[G.longest] === max && max >= 5) return;
    const tops = L.map((l, i) => l === max ? i : -1).filter((i) => i >= 0);
    const nl = max >= 5 && tops.length === 1 ? tops[0] : (G.longest != null && L[G.longest] >= 5 && L[G.longest] === max ? G.longest : null);
    if (nl !== G.longest && nl != null) { log(`${G.P[nl].n} takes Longest Road!`); beep(990, .15); } G.longest = nl; };
  const vp = (pi, secret) => { let s = 0; for (const b of Object.values(G.bld)) if (b.p === pi) s += b.city ? 2 : 1; if (G.longest === pi) s += 2; if (G.army === pi) s += 2; if (secret) s += G.P[pi].dev.concat(G.P[pi].fresh).filter((d) => d === 'vp').length; return s; };
  const checkWin = () => { if (vp(G.turn, true) >= 10) { G.phase = 'over'; G.winner = G.turn; persist(); haptic([60, 40, 60, 40, 140]); beep(990, .4); return true; } return false; };
  const produce = (n) => { const got = G.P.map(() => ({}));
    HEX.forEach((hx, i) => { if (G.num[i] !== n || G.robber === i) return; const r = G.res[i]; for (const v of hx.v) { const b = G.bld[v]; if (b) { const k = b.city ? 2 : 1; G.P[b.p].hand[r] += k; got[b.p][r] = (got[b.p][r] || 0) + k; } } });
    got.forEach((g, i) => { const t = Object.entries(g).map(([r, k]) => `${k} ${RN[r]}`).join(', '); if (t) log(`${G.P[i].n} gets ${t}.`); });
    if (got.every((g) => !Object.keys(g).length)) log('Nobody collects anything.'); };
  const discardHalf = () => G.P.forEach((p) => { const n = count(p); if (n > 7) { let k = Math.floor(n / 2); while (k--) { const r = pick(RES.filter((x) => p.hand[x] > 0)); p.hand[r]--; } log(`${p.n} had ${n} cards and lost ${Math.floor(n / 2)}.`); } });
  // ---------- actions ----------
  const tapVertex = (v) => { const p = cur(), pi = G.turn;
    if (G.phase === 'setup' && G.sub === 'settle' && canSettle(v, pi, true)) {
      G.bld[v] = { p: pi }; G.lastV = v; G.sub = 'road'; sfx.step(); haptic(15);
      if (G.step >= G.P.length) VERT[v].hex.forEach((hi) => { const r = G.res[hi]; if (r !== 'desert') p.hand[r]++; });
      return done(); }
    if (G.mode === 'settle' && canSettle(v, pi, false) && afford(p, COST.settle)) { spend(p, COST.settle); G.bld[v] = { p: pi }; G.mode = null; log(`${p.n} built a town.`); beep(700, .06); updateLongest(); if (checkWin()) return render(); return done(); }
    if (G.mode === 'city' && G.bld[v]?.p === pi && !G.bld[v].city && afford(p, COST.city)) { spend(p, COST.city); G.bld[v].city = true; G.mode = null; log(`${p.n} built a city.`); beep(800, .08); if (checkWin()) return render(); return done(); }
  };
  const tapEdge = (e) => { const p = cur(), pi = G.turn; if (!canRoad(e, pi)) return;
    if (G.phase === 'setup' && G.sub === 'road') { G.roads[e] = pi; sfx.step();
      G.step++; if (G.step >= G.order.length) { G.phase = 'roll'; G.turn = 0; log('Setup done. ' + G.P[0].n + ' rolls first.'); } else { G.turn = G.order[G.step]; G.sub = 'settle'; }
      return done(); }
    if (G.mode === 'road' && afford(p, COST.road)) { spend(p, COST.road); G.roads[e] = pi; G.mode = null; sfx.step(); updateLongest(); if (checkWin()) return render(); return done(); }
    if (G.mode === 'free' && G.free > 0) { G.roads[e] = pi; sfx.step(); G.free--; if (!G.free || !EDGE.some((_, k) => canRoad(k, pi))) G.mode = null; updateLongest(); if (checkWin()) return render(); return done(); }
  };
  const tapHex = (i) => { if (G.phase !== 'robber' || i === G.robber) return; G.robber = i; sfx.bad(); haptic(20);
    const victims = [...new Set(HEX[i].v.map((v) => G.bld[v]?.p).filter((p) => p != null && p !== G.turn && count(G.P[p]) > 0))];
    const steal = (vi) => { const v = G.P[vi]; const r = pick(RES.filter((x) => v.hand[x] > 0)); v.hand[r]--; cur().hand[r]++; log(`${cur().n} stole a card from ${v.n}.`); G.phase = G.afterRobber || 'main'; done(); };
    if (!victims.length) { G.phase = G.afterRobber || 'main'; return done(); }
    if (victims.length === 1) return steal(victims[0]);
    persist(); const close = sheet('Steal from who?', h('div', { class: 'stack' }, victims.map((vi) => h('button', { class: 'btn block', onclick: () => { steal(vi); close(); } }, G.P[vi].n + ` (${count(G.P[vi])} cards)`))), { onClose: () => { if (G.phase === 'robber') steal(pick(victims)); } });
  };
  const roll = async () => { if (busy) return; busy = true; render(); const v = await D.roll(); busy = false; G.last = v; const n = v[0] + v[1]; log(`${cur().n} rolled ${n}.`);
    if (n === 7) { discardHalf(); G.phase = 'robber'; G.afterRobber = 'main'; log('Move the robber.'); } else { produce(n); G.phase = 'main'; }
    done(); };
  const endTurn = () => { const p = cur(); p.dev.push(...p.fresh); p.fresh = []; G.played = false; G.mode = null; G.turn = (G.turn + 1) % G.P.length; G.phase = 'roll'; log(`${cur().n}'s turn.`); done(); };
  const buyDev = () => { const p = cur(); if (!G.deck.length) return toast('No development cards left'); if (!afford(p, COST.dev)) return; spend(p, COST.dev); const d = G.deck.pop(); p.fresh.push(d); log(`${p.n} bought a development card.`); beep(880, .08);
    sheet('You got: ' + DEVN[d], h('div', { class: 'stack' }, h('p', { class: 'muted', style: { margin: 0 } }, DEVD[d]), h('p', { class: 'small dim', style: { margin: 0 } }, d === 'vp' ? 'It counts right away.' : 'You can play it from your next turn.'))); if (checkWin()) return render(); done(); };
  const devSheet = () => { const p = cur(); const playable = [...new Set(p.dev.filter((d) => d !== 'vp'))];
    const close = sheet('Development cards', h('div', { class: 'stack' }, p.dev.length + p.fresh.length ? h('div', { class: 'group' }, [...p.dev.map((d) => [d, false]), ...p.fresh.map((d) => [d, true])].map(([d, f]) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', null, DEVN[d]), h('span', { style: { whiteSpace: 'normal' } }, DEVD[d] + (f ? ' (new: next turn)' : ''))))))
      : h('div', { class: 'empty' }, 'No cards yet. Buy one for Wool + Grain + Stone.'),
      G.played ? h('p', { class: 'small dim center', style: { margin: 0 } }, 'One development card per turn.') : h('div', { class: 'flex wrap' }, playable.map((d) => h('button', { class: 'btn primary sm', onclick: () => { close(); playDev(d); } }, 'Play ' + DEVN[d]))))); };
  const playDev = (d) => { const p = cur(); p.dev.splice(p.dev.indexOf(d), 1); G.played = true; log(`${p.n} played ${DEVN[d]}.`);
    if (d === 'knight') { p.knights++; const max = Math.max(...G.P.map((q) => q.knights)); if (p.knights >= 3 && p.knights === max && G.army !== G.turn && G.P.every((q, i) => i === G.turn || q.knights < p.knights)) { G.army = G.turn; log(`${p.n} takes Largest Army!`); } G.afterRobber = G.phase; G.phase = 'robber'; if (checkWin()) return render(); return done(); }
    if (d === 'road') { G.mode = 'free'; G.free = 2; return done(); }
    const pickRes = (title, n, cb) => { let left = n; const close = sheet(title, h('div', { class: 'isres-pick' }, RES.map((r) => h('button', { style: { background: RC[r] }, onclick: () => { cb(r); if (--left <= 0) close(); else toast('Pick ' + left + ' more'); } }, RN[r])))); };
    if (d === 'plenty') return pickRes('Take 2 resources', 2, (r) => { p.hand[r]++; done(); });
    if (d === 'mono') return pickRes('Take everyone\'s…', 1, (r) => { let t = 0; G.P.forEach((q, i) => { if (i !== G.turn) { t += q.hand[r]; q.hand[r] = 0; } }); p.hand[r] += t; log(`${p.n} took ${t} ${RN[r]}.`); done(); });
  };
  const tradeSheet = () => { const p = cur(), pi = G.turn; const box = h('div', { class: 'stack' }); let mode = 'bank', partner = G.P.findIndex((_, i) => i !== pi);
    const give = Object.fromEntries(RES.map((r) => [r, 0])), get = Object.fromEntries(RES.map((r) => [r, 0]));
    const stepper = (obj, r, max) => h('div', { class: 'isstep', style: { '--rc': RC[r] } }, h('span', null, RN[r]), h('button', { onclick: () => { obj[r] = Math.max(0, obj[r] - 1); draw(); } }, '−'), h('b', null, obj[r]), h('button', { onclick: () => { if (obj[r] < max) obj[r]++; draw(); } }, '+'));
    const draw = () => box.replaceChildren(seg([['bank', 'Bank 4:1'], ['player', 'Player']], mode, (v) => { mode = v; draw(); }),
      mode === 'bank' ? h('div', { class: 'stack' }, h('b', null, 'Give 4 of'), h('div', { class: 'isres-pick' }, RES.map((r) => h('button', { style: { background: RC[r], opacity: p.hand[r] >= 4 ? 1 : .35 }, disabled: p.hand[r] < 4, onclick: () => { give.r = r; draw(); }, class: give.r === r ? 'on' : '' }, RN[r] + ' ' + p.hand[r]))),
        h('b', null, 'Get 1'), h('div', { class: 'isres-pick' }, RES.map((r) => h('button', { style: { background: RC[r] }, class: get.r === r ? 'on' : '', onclick: () => { get.r = r; draw(); } }, RN[r]))),
        h('button', { class: 'btn primary block', disabled: !give.r || !get.r || give.r === get.r, onclick: () => { p.hand[give.r] -= 4; p.hand[get.r]++; log(`${p.n} traded 4 ${RN[give.r]} for 1 ${RN[get.r]}.`); close(); done(); } }, 'Trade'))
      : h('div', { class: 'stack' }, seg(G.P.map((q, i) => [i, q.n]).filter(([i]) => i !== pi), partner, (v) => { partner = v; RES.forEach((r) => get[r] = 0); draw(); }),
        h('b', null, 'You give'), h('div', { class: 'isgrid' }, RES.map((r) => stepper(give, r, p.hand[r]))), h('b', null, G.P[partner].n + ' gives'), h('div', { class: 'isgrid' }, RES.map((r) => stepper(get, r, G.P[partner].hand[r]))),
        h('button', { class: 'btn primary block', onclick: async () => { const tg = RES.filter((r) => give[r]), tt = RES.filter((r) => get[r]); if (!tg.length && !tt.length) return;
          close(); const txt = `${p.n} gives ${tg.map((r) => give[r] + ' ' + RN[r]).join(', ') || 'nothing'}. ${G.P[partner].n} gives ${tt.map((r) => get[r] + ' ' + RN[r]).join(', ') || 'nothing'}.`;
          if (!await confirmSheet(`Pass to ${G.P[partner].n}: accept?`, txt, 'Accept', false)) return toast('Trade declined');
          RES.forEach((r) => { p.hand[r] += get[r] - give[r]; G.P[partner].hand[r] += give[r] - get[r]; }); log('Trade: ' + txt); beep(880, .08); done(); } }, 'Propose trade')));
    draw(); const close = sheet('Trade', box); };
  const done = () => { persist(); render(); };
  // ---------- view ----------
  const svgNS = 'http://www.w3.org/2000/svg';
  const S_ = (tag, attrs, ...kids) => { const e = document.createElementNS(svgNS, tag); for (const [k, v] of Object.entries(attrs || {})) if (v != null) e.setAttribute(k, v); kids.flat().forEach((c) => c && e.append(c)); return e; };
  const drawSVG = () => { const pi = G.turn; const p = cur();
    const showV = (G.phase === 'setup' && G.sub === 'settle') || G.mode === 'settle' || G.mode === 'city';
    const showE = (G.phase === 'setup' && G.sub === 'road') || G.mode === 'road' || G.mode === 'free';
    const svg = S_('svg', { viewBox: `${-2.5 * W - 14} ${-4 * R - 14} ${5 * W + 28} ${8 * R + 28}`, class: 'isboard' + (G.phase === 'robber' ? ' robbing' : '') });
    svg.append(S_('rect', { x: -2.5 * W - 14, y: -4 * R - 14, width: 5 * W + 28, height: 8 * R + 28, rx: 22, fill: '#1A7FA0' }));
    HEX.forEach((hx, i) => { const pts = hx.v.map((v) => VERT[v].x + ',' + VERT[v].y).join(' ');
      const g = S_('g', { class: 'hex', onclick: null }); g.addEventListener('click', () => tapHex(i));
      g.append(S_('polygon', { points: pts, fill: RC[G.res[i]], stroke: '#F4E9C8', 'stroke-width': 3, 'stroke-linejoin': 'round' }));
      if (G.num[i]) { const hot = G.num[i] === 6 || G.num[i] === 8; g.append(S_('circle', { cx: hx.x, cy: hx.y, r: 13, fill: '#FFF8E6' }), S_('text', { x: hx.x, y: hx.y + 4, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 900, fill: hot ? '#D7261E' : '#14130F' }, String(G.num[i])));
        g.append(...Array.from({ length: pips(G.num[i]) }, (_, k, a) => S_('circle', { cx: hx.x + (k - (pips(G.num[i]) - 1) / 2) * 3.2, cy: hx.y + 8.5, r: 1.1, fill: hot ? '#D7261E' : '#14130F' }))); }
      else g.append(S_('text', { x: hx.x, y: hx.y + 4, 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 800, fill: '#8A7A50' }, 'Sandbar'));
      g.append(S_('text', { x: hx.x, y: hx.y - 18, 'text-anchor': 'middle', 'font-size': 7.5, 'font-weight': 800, fill: 'rgba(0,0,0,.45)' }, G.res[i] === 'desert' ? '' : RN[G.res[i]]));
      if (G.robber === i) g.append(S_('circle', { cx: hx.x + 16, cy: hx.y - 2, r: 7, fill: '#14130F', stroke: '#fff', 'stroke-width': 1.5 }));
      svg.append(g); });
    EDGE.forEach((e, k) => { const a = VERT[e.a], b = VERT[e.b]; const o = G.roads[k];
      if (o != null) svg.append(S_('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#14130F', 'stroke-width': 8, 'stroke-linecap': 'round' }), S_('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: G.P[o].c, 'stroke-width': 5, 'stroke-linecap': 'round' }));
      else if (showE && canRoad(k, pi)) { const l = S_('line', { x1: a.x + (b.x - a.x) * .2, y1: a.y + (b.y - a.y) * .2, x2: b.x - (b.x - a.x) * .2, y2: b.y - (b.y - a.y) * .2, class: 'tgt-e', stroke: p.c === '#FFFFFF' ? '#14130F' : p.c }); const hit = S_('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: 'transparent', 'stroke-width': 16 }); const g = S_('g', { class: 'tap' }, l, hit); g.addEventListener('click', () => tapEdge(k)); svg.append(g); } });
    VERT.forEach((v, k) => { const b = G.bld[k];
      if (b) { const c = G.P[b.p].c; svg.append(b.city ? S_('path', { d: `M${v.x - 8} ${v.y + 7}v-9l5-5 5 5v2h6v7z`, fill: c, stroke: '#14130F', 'stroke-width': 2, 'stroke-linejoin': 'round' }) : S_('path', { d: `M${v.x - 6} ${v.y + 6}v-7l6-6 6 6v7z`, fill: c, stroke: '#14130F', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
        if (G.mode === 'city' && b.p === pi && !b.city) { const t = S_('circle', { cx: v.x, cy: v.y, r: 12, class: 'tgt-v' }); t.addEventListener('click', () => tapVertex(k)); svg.append(t); } }
      else if (showV && G.mode !== 'city' && canSettle(k, pi, G.phase === 'setup')) { const t = S_('circle', { cx: v.x, cy: v.y, r: 8, class: 'tgt-v' }); t.addEventListener('click', () => tapVertex(k)); svg.append(t); } });
    return svg; };
  function render() {
    if (!G) return setup();
    if (!D) D = dice(2, { size: 40, values: G.last });
    if (G.phase === 'over') { const w = G.P[G.winner]; body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal', style: { background: w.c === '#FFFFFF' ? '#14130F' : w.c, minHeight: 'auto', padding: 28 } }, h('div', { class: 'k', style: { color: 'rgba(255,255,255,.8)' } }, '10 points'), h('div', { class: 'w' }, w.n + ' wins')),
      h('div', { class: 'group' }, G.P.map((q, i) => h('div', { class: 'rowi' }, h('i', { class: 'opdot', style: { background: q.c } }), h('div', { class: 't' }, h('b', null, q.n)), h('b', null, vp(i, true) + ' pts')))), h('button', { class: 'btn accent block', onclick: () => { G = null; st.isle = null; save(); setup(); } }, 'New game'))); return; }
    const p = cur(), pi = G.turn;
    const tip = G.phase === 'setup' ? (G.sub === 'settle' ? `${p.n}: tap a glowing spot to place a town` + (G.step >= G.P.length ? ' (this one pays out)' : '') : `${p.n}: tap a glowing edge for its road`)
      : G.phase === 'robber' ? `${p.n}: tap a hex to move the robber` : G.mode === 'settle' ? 'Tap a glowing spot for your town' : G.mode === 'city' ? 'Tap one of your towns to upgrade it' : G.mode === 'road' ? 'Tap a glowing edge for your road' : G.mode === 'free' ? `Free road: ${G.free} left` : G.phase === 'roll' ? `${p.n}, roll the dice` : G.log.at(-1) || '';
    const can = (k) => afford(p, COST[k]);
    const b = (label, sub, fn, dis, on) => h('button', { class: 'isbtn' + (on ? ' on' : ''), disabled: busy || dis, onclick: fn }, h('b', null, label), sub ? h('span', null, sub) : null);
    const mode = (m) => () => { G.mode = G.mode === m ? null : m; render(); };
    const acts = G.phase === 'roll' ? [b('Roll', null, roll), b('Dev cards', `${p.dev.length + p.fresh.length} held`, devSheet)]
      : G.phase === 'main' ? [b('Road', 'Tm Cl', mode('road'), !can('road') || !EDGE.some((_, k) => canRoad(k, pi)), G.mode === 'road'), b('Town', 'Tm Cl Wo Gr', mode('settle'), !can('settle') || !VERT.some((_, k) => canSettle(k, pi, false)), G.mode === 'settle'), b('City', '2Gr 3St', mode('city'), !can('city') || !Object.values(G.bld).some((x) => x.p === pi && !x.city), G.mode === 'city'),
        b('Buy card', 'Wo Gr St', buyDev, !can('dev')), b('Cards', `${p.dev.length + p.fresh.length} held`, devSheet), b('Trade', null, tradeSheet), b('End turn', null, endTurn, G.mode === 'free')] : [];
    body.replaceChildren(h('div', { class: 'stack', style: { gap: 10 } },
      h('div', { class: 'istop', style: { '--pc': p.c } }, h('i'), h('div', null, h('b', null, p.n), h('span', null, vp(pi, true) + ' points')), h('div', { class: 'isdice' }, D.el)),
      h('div', { class: 'istip' }, tip), drawSVG(),
      h('div', { class: 'ishand' }, RES.map((r) => h('div', { style: { '--rc': RC[r] } }, h('b', null, p.hand[r]), h('span', null, RN[r])))),
      acts.length ? h('div', { class: 'isacts' }, acts) : null,
      h('div', { class: 'group' }, G.P.map((q, i) => h('div', { class: 'rowi' + (i === pi ? ' on' : '') }, h('i', { class: 'opdot', style: { background: q.c } }), h('div', { class: 't' }, h('b', null, q.n), h('span', null, `${count(q)} cards · ${q.knights} knights · road ${roadLen(i)}` + (G.longest === i ? ' · Longest Road' : '') + (G.army === i ? ' · Largest Army' : ''))), h('b', null, vp(i, i === pi) + ' pts')))),
      h('div', { class: 'oplog light' }, G.log.slice(-3).map((m) => h('div', null, m)))));
  }
  onLeave(() => { if (G) persist(); });
  G ? render() : setup();
  return bpage('isle', RULES, body);
});
