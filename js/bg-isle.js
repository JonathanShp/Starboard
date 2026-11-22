// Islanders: Catan-style trade-and-build, pass-and-play on one phone.
import { h, icon, S, save, route, seg, sheet, toast, shuffle, pick, rand, haptic, beep, confirmSheet, onLeave, go, sfx } from './core.js';
import { bg, bpage } from './boardgames.js';
import { tableView, act, boardDice } from './bgtable.js';
import { howTo } from './howto.js';

const RES = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const RN = { wood: 'Timber', brick: 'Clay', sheep: 'Wool', wheat: 'Grain', ore: 'Stone', desert: 'Sandbar' };
const RC = { wood: '#2E8B57', brick: '#D0623F', sheep: '#9AD16B', wheat: '#F2C14E', ore: '#8C96A3', desert: '#EADCB0' };
const COST = { road: { wood: 1, brick: 1 }, settle: { wood: 1, brick: 1, sheep: 1, wheat: 1 }, city: { wheat: 2, ore: 3 }, dev: { sheep: 1, wheat: 1, ore: 1 } };
const DEVN = { knight: 'Knight', vp: 'Victory point', road: 'Road building', plenty: 'Year of plenty', mono: 'Monopoly' };
const DEVD = { knight: 'Move the robber and steal a card. 3 knights = Largest Army (+2).', vp: '+1 point. Kept secret until you win.', road: 'Build 2 roads for free.', plenty: 'Take any 2 resources from the bank.', mono: 'Name a resource. Everyone gives you all of theirs.' };
const PCOL = ['#3D7BFF', '#FF5A3C', '#FFFFFF', '#FF9F1A'];
const RULES = 'Setup: in snake order, each player places 2 towns and a road next to each. Your second town gives you its neighbouring resources.\n\nEach turn, roll the 3D dice. Every island hex with that number pays its resource to towns (1) and cities (2) touching it.\n\nRoll a 7: anyone holding more than 7 cards gives back half (they pick which). Then move the robber: that hex stops paying, and you steal a card from someone next to it.\n\nBuild: road = Timber + Clay. Town = Timber + Clay + Wool + Grain. City = 2 Grain + 3 Stone. Development card = Wool + Grain + Stone.\n\nTowns need a gap of 2 roads from any other town and must connect to your roads. Each player has 15 roads, 5 towns and 4 cities.\n\nTrade with the player whose turn it is (both sides must give something), or with the bank: 4 of one kind for 1 of any. A town or city on a harbor improves that: 3:1 harbors take 3 of any one kind, 2:1 harbors take 2 of the kind shown. The bank has 19 of each card; if it cannot pay everyone, nobody gets that card (unless only one player was owed).\n\nPoints: town 1, city 2, Longest Road (5+) 2, Largest Army (3+ knights) 2, victory point cards 1. First to 10 wins.';

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
const COAST = EDGE.map((_, k) => k).filter((k) => { const { a, b } = EDGE[k]; return VERT[a].hex.filter((x) => VERT[b].hex.includes(x)).length === 1; })
  .sort((p, q) => { const m = (k) => { const { a, b } = EDGE[k]; return Math.atan2(VERT[a].y + VERT[b].y, VERT[a].x + VERT[b].x); }; return m(p) - m(q); });
const SLOTS = [0, 3, 6, 10, 13, 16, 20, 23, 26];
const newHarbors = () => shuffle(['any', 'any', 'any', 'any', ...RES]).map((k, j) => ({ e: COAST[SLOTS[j]], k }));
const newBoard = () => {
  const res = shuffle([...Array(4).fill('wood'), ...Array(3).fill('brick'), ...Array(4).fill('sheep'), ...Array(4).fill('wheat'), ...Array(3).fill('ore'), 'desert']);
  let num;
  for (let tries = 0; tries < 500; tries++) { const nums = shuffle([2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]); num = res.map((r) => r === 'desert' ? 0 : nums.pop());
    if (!HEX.some((hx, i) => (num[i] === 6 || num[i] === 8) && hx.nb.some((j) => num[j] === 6 || num[j] === 8))) break; }
  return { res, num, robber: res.indexOf('desert'), harb: newHarbors() };
};
const pips = (n) => n ? 6 - Math.abs(7 - n) : 0;

route(/^play\/board\/isle$/, () => {
  const st = bg(); const body = h('div'); let G = st.isle; let busy = false, D, discarding = false;
  if (G && !G.harb) G.harb = newHarbors();
  const persist = () => { st.isle = G; save(); };
  const begin = (names) => { st.isNames = names; const n = names.length;
        G = { ...newBoard(), P: names.map((nm, i) => ({ n: nm, c: PCOL[i], hand: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }, dev: [], fresh: [], knights: 0 })), bld: {}, roads: {}, turn: 0, phase: 'setup', order: [...Array(n).keys(), ...[...Array(n).keys()].reverse()], step: 0, sub: 'settle', lastV: null, deck: shuffle([...Array(14).fill('knight'), ...Array(5).fill('vp'), 'road', 'road', 'plenty', 'plenty', 'mono', 'mono']), longest: null, army: null, last: [3, 4], log: [], played: false, mode: null };
        G.turn = G.order[0]; persist(); render(); };
  const restart = async () => {
    const how = await new Promise((res) => { let done = false; const close = sheet('Restart game?', h('div', { class: 'stack' }, h('p', { class: 'muted', style: { margin: '0 4px' } }, 'The current game will be lost.'),
      h('button', { class: 'btn primary block', onclick: () => { done = true; close(); res('same'); } }, 'Restart with the same players'),
      h('button', { class: 'btn block', onclick: () => { done = true; close(); res('new'); } }, 'Change players'),
      h('button', { class: 'btn ghost block', onclick: () => { done = true; close(); res(null); } }, 'Cancel')), { onClose: () => !done && res(null) }); });
    if (!how) return; busy = false; closeTV(); G = null; st.isle = null; save();
    if (how === 'same') begin(st.isNames); else setup();
  };
  const setup = () => {
    const names = [...(st.isNames || S.party.players || []).slice(0, 4)];
    const inp = h('input', { placeholder: 'Add player', enterkeyhint: 'done' });
    const add = () => { const n = inp.value.trim(); if (n && names.length < 4 && !names.includes(n)) names.push(n); inp.value = ''; draw(); };
    inp.onkeydown = (e) => { if (e.key === 'Enter') add(); };
    const draw = () => body.replaceChildren(h('div', { class: 'stack fade-in' }, h('b', null, 'Players (2–4)'), h('div', { class: 'flex' }, inp, h('button', { class: 'btn primary sm', onclick: add }, 'Add')),
      h('div', { class: 'flex wrap' }, names.map((n, i) => h('button', { class: 'chip', style: { boxShadow: `inset 0 0 0 3px ${PCOL[i] === '#FFFFFF' ? '#14130F' : PCOL[i]}` }, onclick: () => { names.splice(i, 1); draw(); } }, n, ' ×'))),
      names.length >= 2 ? h('button', { class: 'btn accent block', onclick: () => begin(names) }, 'Start game') : h('p', { class: 'small dim center' }, 'Add at least 2 players')));
    draw();
  };
  // ---------- rules ----------
  const cur = () => G.P[G.turn];
  const log = (m) => { G.log.push(m); G.log = G.log.slice(-30); };
  const count = (p) => RES.reduce((s, r) => s + p.hand[r], 0);
  const afford = (p, c) => Object.entries(c).every(([r, n]) => p.hand[r] >= n);
  const spend = (p, c) => Object.entries(c).forEach(([r, n]) => p.hand[r] -= n);
  const bankLeft = (r) => 19 - G.P.reduce((t, q) => t + q.hand[r], 0);
  const rate = (pi, r) => { let best = 4; for (const hb of G.harb) { const { a, b } = EDGE[hb.e]; if (G.bld[a]?.p === pi || G.bld[b]?.p === pi) best = Math.min(best, hb.k === r ? 2 : hb.k === 'any' ? 3 : 4); } return best; };
  const pieces = (pi, kind) => { const b = Object.values(G.bld).filter((x) => x.p === pi); return kind === 'road' ? 15 - roadsOf(pi).length : kind === 'settle' ? 5 - b.filter((x) => !x.city).length : 4 - b.filter((x) => x.city).length; };
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
  const produce = (n) => { const got = G.P.map(() => ({})), want = {};
    HEX.forEach((hx, i) => { if (G.num[i] !== n || G.robber === i) return; const r = G.res[i]; for (const v of hx.v) { const b = G.bld[v]; if (b) { want[r] ||= {}; want[r][b.p] = (want[r][b.p] || 0) + (b.city ? 2 : 1); } } });
    for (const [r, m] of Object.entries(want)) { const ks = Object.keys(m), total = ks.reduce((t, k) => t + m[k], 0), left = bankLeft(r);
      if (total <= left) ks.forEach((k) => got[k][r] = m[k]); else if (ks.length === 1 && left > 0) got[ks[0]][r] = left; else log(`The bank is out of ${RN[r]}: nobody gets it.`); }
    got.forEach((g, i) => Object.entries(g).forEach(([r, k]) => G.P[i].hand[r] += k));
    got.forEach((g, i) => { const t = Object.entries(g).map(([r, k]) => `${k} ${RN[r]}`).join(', '); if (t) log(`${G.P[i].n} gets ${t}.`); });
    if (got.every((g) => !Object.keys(g).length)) log('Nobody collects anything.'); };
  const discardOne = (i) => new Promise((res) => { const q = G.P[i], n = count(q), k = Math.floor(n / 2); const drop = Object.fromEntries(RES.map((r) => [r, 0])); let ok = false; const box = h('div', { class: 'stack' });
    const sum = () => RES.reduce((t, r) => t + drop[r], 0);
    const draw = () => box.replaceChildren(h('p', { class: 'muted', style: { margin: 0 } }, `Pass the phone to ${q.n}. You hold ${n} cards, so pick ${k} to give back.`),
      h('div', { class: 'isgrid' }, RES.map((r) => h('div', { class: 'isstep', style: { '--rc': RC[r] } }, h('span', null, `${RN[r]} (${q.hand[r]})`), h('button', { 'aria-label': 'One less ' + RN[r], onclick: () => { drop[r] = Math.max(0, drop[r] - 1); draw(); } }, '−'), h('b', null, drop[r]), h('button', { 'aria-label': 'One more ' + RN[r], onclick: () => { if (drop[r] < q.hand[r] && sum() < k) drop[r]++; draw(); } }, '+')))),
      h('button', { class: 'btn primary block', disabled: sum() !== k, onclick: () => { ok = true; close(); } }, `Give back ${sum()} of ${k}`));
    draw(); const close = sheet(q.n + ': give back ' + k, box, { onClose: () => {
      if (!ok) { let m = k - sum(); while (m-- > 0) { const r = pick(RES.filter((x) => q.hand[x] - drop[x] > 0)); drop[r]++; } }
      RES.forEach((r) => q.hand[r] -= drop[r]); log(`${q.n} gave back ${k} cards.`); res(); } }); });
  const runDiscards = async () => { discarding = true; while (G.disc?.length) { await discardOne(G.disc[0]); G.disc.shift(); persist(); } discarding = false;
    G.phase = 'robber'; G.afterRobber = 'main'; log('Move the robber.'); done(); };
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
    if (G.mode === 'road' && afford(p, COST.road) && pieces(pi, 'road') > 0) { spend(p, COST.road); G.roads[e] = pi; G.mode = null; sfx.step(); updateLongest(); if (checkWin()) return render(); return done(); }
    if (G.mode === 'free' && G.free > 0) { G.roads[e] = pi; sfx.step(); G.free--; if (!G.free || !EDGE.some((_, k) => canRoad(k, pi))) G.mode = null; updateLongest(); if (checkWin()) return render(); return done(); }
  };
  const tapHex = (i) => { if (G.phase !== 'robber' || i === G.robber) return; G.robber = i; sfx.bad(); haptic(20); log(`${cur().n} moved the robber.`);
    const victims = [...new Set(HEX[i].v.map((v) => G.bld[v]?.p).filter((p) => p != null && p !== G.turn && count(G.P[p]) > 0))];
    const steal = (vi) => { const v = G.P[vi]; const r = pick(RES.filter((x) => v.hand[x] > 0)); v.hand[r]--; cur().hand[r]++; log(`${cur().n} stole a card from ${v.n}.`); G.phase = G.afterRobber || 'main'; done(); };
    if (!victims.length) { G.phase = G.afterRobber || 'main'; return done(); }
    if (victims.length === 1) return steal(victims[0]);
    persist(); const close = sheet('Steal from who?', h('div', { class: 'stack' }, victims.map((vi) => h('button', { class: 'btn block', onclick: () => { steal(vi); close(); } }, G.P[vi].n + ` (${count(G.P[vi])} cards)`))), { onClose: () => { if (G.phase === 'robber') steal(pick(victims)); } });
  };
  const roll = async () => { if (busy) return; if (!D) layout(); if (!D) return toast('One moment…'); busy = true; render(); const v = await D.roll(); busy = false; G.last = v; const n = v[0] + v[1]; log(`${cur().n} rolled ${n}.`);
    if (n === 7) { G.disc = G.P.map((q, i) => count(q) > 7 ? i : -1).filter((i) => i >= 0); G.phase = 'discard'; } else { produce(n); G.phase = 'main'; }
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
    if (d === 'road') { G.free = Math.min(2, pieces(G.turn, 'road')); G.mode = G.free ? 'free' : null; return done(); }
    const pickRes = (title, n, cb) => { let left = n; const close = sheet(title, h('div', { class: 'isres-pick' }, RES.map((r) => h('button', { style: { background: RC[r] }, onclick: () => { if (cb(r) === false) return; if (--left <= 0) close(); else toast('Pick ' + left + ' more'); } }, RN[r])))); };
    if (d === 'plenty') return pickRes('Take 2 resources', 2, (r) => { if (bankLeft(r) < 1) { toast('The bank is out of ' + RN[r]); return false; } p.hand[r]++; done(); });
    if (d === 'mono') return pickRes('Take everyone\'s…', 1, (r) => { let t = 0; G.P.forEach((q, i) => { if (i !== G.turn) { t += q.hand[r]; q.hand[r] = 0; } }); p.hand[r] += t; log(`${p.n} took ${t} ${RN[r]}.`); done(); });
  };
  const tradeSheet = () => { const p = cur(), pi = G.turn; const box = h('div', { class: 'stack' }); let mode = 'bank', partner = G.P.findIndex((_, i) => i !== pi);
    const give = Object.fromEntries(RES.map((r) => [r, 0])), get = Object.fromEntries(RES.map((r) => [r, 0]));
    const stepper = (obj, r, max) => h('div', { class: 'isstep', style: { '--rc': RC[r] } }, h('span', null, RN[r]), h('button', { onclick: () => { obj[r] = Math.max(0, obj[r] - 1); draw(); } }, '−'), h('b', null, obj[r]), h('button', { onclick: () => { if (obj[r] < max) obj[r]++; draw(); } }, '+'));
    const draw = () => box.replaceChildren(seg([['bank', 'Bank or harbor'], ['player', 'Player']], mode, (v) => { mode = v; draw(); }),
      mode === 'bank' ? h('div', { class: 'stack' }, h('b', null, 'Give'), h('div', { class: 'isres-pick' }, RES.map((r) => { const n = rate(pi, r); return h('button', { style: { background: RC[r], opacity: p.hand[r] >= n ? 1 : .35 }, disabled: p.hand[r] < n, onclick: () => { give.r = r; draw(); }, class: give.r === r ? 'on' : '' }, `${n} ${RN[r]}`, h('br'), h('small', null, 'you have ' + p.hand[r])); })),
        h('b', null, 'Get 1'), h('div', { class: 'isres-pick' }, RES.map((r) => h('button', { style: { background: RC[r], opacity: bankLeft(r) > 0 ? 1 : .35 }, disabled: bankLeft(r) < 1, class: get.r === r ? 'on' : '', onclick: () => { get.r = r; draw(); } }, RN[r]))),
        h('p', { class: 'small dim', style: { margin: 0 } }, 'Bank 4:1. A 3:1 harbor takes 3 of any one kind, a 2:1 harbor takes 2 of its kind. Your rate is shown on each card.'),
        h('button', { class: 'btn primary block', disabled: !give.r || !get.r || give.r === get.r, onclick: () => { const n = rate(pi, give.r); p.hand[give.r] -= n; p.hand[get.r]++; log(`${p.n} traded ${n} ${RN[give.r]} for 1 ${RN[get.r]}.`); close(); done(); } }, 'Trade'))
      : h('div', { class: 'stack' }, seg(G.P.map((q, i) => [i, q.n]).filter(([i]) => i !== pi), partner, (v) => { partner = v; RES.forEach((r) => get[r] = 0); draw(); }),
        h('b', null, 'You give'), h('div', { class: 'isgrid' }, RES.map((r) => stepper(give, r, p.hand[r]))), h('b', null, G.P[partner].n + ' gives'), h('div', { class: 'isgrid' }, RES.map((r) => stepper(get, r, G.P[partner].hand[r]))),
        h('button', { class: 'btn primary block', onclick: async () => { const tg = RES.filter((r) => give[r]), tt = RES.filter((r) => get[r]); if (!tg.length || !tt.length) return toast('Both sides must give something');
          close(); const txt = `${p.n} gives ${tg.map((r) => give[r] + ' ' + RN[r]).join(', ') || 'nothing'}. ${G.P[partner].n} gives ${tt.map((r) => get[r] + ' ' + RN[r]).join(', ') || 'nothing'}.`;
          if (!await confirmSheet(`Pass to ${G.P[partner].n}: accept?`, txt, 'Accept', false)) return toast('Trade declined');
          RES.forEach((r) => { p.hand[r] += get[r] - give[r]; G.P[partner].hand[r] += give[r] - get[r]; }); log('Trade: ' + txt); beep(880, .08); done(); } }, 'Propose trade')));
    draw(); const close = sheet('Trade', box); };
  const done = () => { persist(); render(); };
  // ---------- view: the whole phone is the island ----------
  // two-tone tiles (lit face over a darker bevel) and single-colour glyphs, like a printed hex tile
  const T2 = { wood: ['#2F7D46', '#1F5A31'], brick: ['#C4582F', '#8E3B1D'], sheep: ['#93C454', '#6A9A33'], wheat: ['#EDBB3A', '#B98A1C'], ore: ['#8B93A0', '#5F6672'], desert: ['#E3CF9A', '#B9A26A'] };
  const GL = {
    wood: '<path d="M0 -14 L9 2 H4 L10 11 H-10 L-4 2 H-9 Z" fill="#1F5A31"/><rect x="-1.5" y="11" width="3" height="5" fill="#1F5A31"/>',
    brick: '<g fill="#8E3B1D"><rect x="-12" y="-8" width="11" height="6" rx="1"/><rect x="1" y="-8" width="11" height="6" rx="1"/><rect x="-6" y="0" width="11" height="6" rx="1"/></g>',
    sheep: '<g fill="#F4F1E6"><circle cx="-5" cy="0" r="6"/><circle cx="3" cy="-2" r="6"/><circle cx="6" cy="4" r="5"/><circle cx="-3" cy="5" r="5"/></g><circle cx="11" cy="-1" r="3.4" fill="#3A3A3A"/>',
    wheat: '<g stroke="#B98A1C" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M0 14 V-10"/><path d="M0 -6 l-5 -4 M0 -6 l5 -4 M0 0 l-5 -4 M0 0 l5 -4 M0 6 l-5 -4 M0 6 l5 -4"/></g>',
    ore: '<path d="M-14 10 L-5 -8 L1 2 L5 -4 L14 10 Z" fill="#5F6672"/><path d="M-5 -8 L-2 -2 L-8 -1 Z" fill="#E9EDF2"/>',
    desert: '<path d="M0 -12 v24 M0 -4 h-5 v-5 M0 2 h5 v-6" stroke="#9C8547" stroke-width="3" stroke-linecap="round" fill="none"/>',
  };
  const shade = (c, k) => { const n = parseInt(c.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  const hexPts = (x, y, r) => [0, 1, 2, 3, 4, 5].map((j) => { const a = Math.PI / 3 * j + Math.PI / 6; return (x + Math.cos(a) * r).toFixed(1) + ',' + (y + Math.sin(a) * r).toFixed(1); }).join(' ');
  const VB = [-3.12 * W, -4.8 * R, 6.24 * W, 9.6 * R];
  const svgNS = 'http://www.w3.org/2000/svg';
  const S_ = (tag, attrs, ...kids) => { const e = document.createElementNS(svgNS, tag); for (const [k, v] of Object.entries(attrs || {})) if (v != null) e.setAttribute(k, v); kids.flat().forEach((c) => c && e.append(c)); return e; };
  const G_ = (inner, attrs) => { const g = S_('g', attrs); g.innerHTML = inner; return g; };
  let TV, plane, boardSlot, buildOpen = false;
  const tilt = () => (TV?.look === 'print' ? 0 : 22);
  const drawSVG = () => { const pi = G.turn; const p = cur();
    const showV = (G.phase === 'setup' && G.sub === 'settle') || G.mode === 'settle' || G.mode === 'city';
    const showE = (G.phase === 'setup' && G.sub === 'road') || G.mode === 'road' || G.mode === 'free';
    const svg = S_('svg', { viewBox: VB.join(' '), class: 'isb' + (G.phase === 'robber' ? ' robbing' : ''), width: '100%', height: '100%', role: 'img', 'aria-label': 'Island board' });
    HEX.forEach((hx) => svg.append(S_('polygon', { points: hexPts(hx.x, hx.y, R * 1.32), fill: 'rgba(255,255,255,.22)' })));
    HEX.forEach((hx) => svg.append(S_('polygon', { points: hexPts(hx.x, hx.y, R * 1.16), fill: '#E8D49B' })));
    G.harb.forEach((hb) => { const A = VERT[EDGE[hb.e].a], B = VERT[EDGE[hb.e].b]; const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, L = Math.hypot(mx, my), ux = mx / L, uy = my / L, tx = mx + ux * R * .7, ty = my + uy * R * .7;
      const any = hb.k === 'any', g = S_('g', { class: 'harb', 'aria-label': any ? '3 to 1 harbor' : '2 to 1 ' + RN[hb.k] + ' harbor' });
      g.append(...[A, B].map((V) => S_('line', { x1: V.x + ux * R * .1, y1: V.y + uy * R * .1, x2: tx, y2: ty, stroke: '#8B5A3C', 'stroke-width': 3.5, 'stroke-linecap': 'round' })),
        S_('circle', { cx: tx, cy: ty + 1.5, r: R * .3, fill: '#000', opacity: '.2' }), S_('circle', { cx: tx, cy: ty, r: R * .3, fill: '#FBF3DD', stroke: any ? '#5B4630' : T2[hb.k][0], 'stroke-width': any ? 1.5 : 4.5 }),
        S_('text', { x: tx, y: ty + R * .085, 'text-anchor': 'middle', 'font-size': R * .23, 'font-weight': 900, fill: '#191712', 'font-family': 'ui-serif, Georgia, serif' }, any ? '3:1' : '2:1'));
      g.addEventListener('click', () => toast(any ? '3:1 harbor: trade 3 of any one kind for 1 card' : `2:1 harbor: trade 2 ${RN[hb.k]} for 1 card`));
      svg.append(g); });
    HEX.forEach((hx, i) => { const r = G.res[i], [c1, c2] = T2[r], n = G.num[i];
      const g = S_('g', { class: 'hexg' + (G.robber === i ? ' rb' : '') }); g.addEventListener('click', () => tapHex(i));
      g.append(S_('polygon', { points: hexPts(hx.x, hx.y, R * .99), fill: c2 }), S_('polygon', { class: 'top', points: hexPts(hx.x, hx.y - 1.5, R * .86), fill: c1 }), G_(GL[r], { transform: `translate(${hx.x} ${hx.y - R * .42}) scale(${R / 46})`, opacity: '.95' }));
      if (n) { const hot = n === 6 || n === 8, col = hot ? '#C8281E' : '#191712', pp = pips(n);
        g.append(S_('circle', { cx: hx.x, cy: hx.y + R * .2 + 2, r: R * .33, fill: '#000', opacity: '.18' }), S_('circle', { cx: hx.x, cy: hx.y + R * .2, r: R * .33, fill: '#FBF3DD', stroke: '#C9B68A', 'stroke-width': 1 }),
          S_('text', { x: hx.x, y: hx.y + R * .28, 'text-anchor': 'middle', 'font-size': R * .3, 'font-weight': 900, fill: col, 'font-family': 'ui-serif, Georgia, serif' }, String(n)));
        for (let d = 0; d < pp; d++) g.append(S_('circle', { cx: hx.x + (d - (pp - 1) / 2) * R * .085, cy: hx.y + R * .4, r: R * .028, fill: col })); }
      if (G.robber === i) g.append(G_('<ellipse cy="14" rx="9" ry="3.5" fill="#000" opacity=".3"/><path d="M-7 14 C-7 4 -5 -1 -3 -3 A6 6 0 1 1 3 -3 C5 -1 7 4 7 14 Z" fill="#2A2724"/><path d="M-2 -10 a3 3 0 0 1 3 -2" stroke="rgba(255,255,255,.5)" stroke-width="1.5" fill="none"/>', { transform: `translate(${hx.x + (n ? R * .5 : 0)} ${hx.y + (n ? -R * .02 : R * .05)}) scale(${R / 40})`, 'pointer-events': 'none' }));
      svg.append(g); });
    // roads: raised strips along the hex edges
    EDGE.forEach((e, k) => { const a = VERT[e.a], b = VERT[e.b]; const o = G.roads[k];
      if (o != null) { const col = G.P[o].c, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI, L = Math.hypot(b.x - a.x, b.y - a.y) * .72;
        svg.append(G_(`<rect x="${-L / 2}" y="-1" width="${L}" height="7" rx="2" fill="${shade(col, .6)}"/><rect x="${-L / 2}" y="-4" width="${L}" height="6" rx="2" fill="${col}" stroke="rgba(0,0,0,.4)" stroke-width="1"/>`, { transform: `translate(${mx} ${my}) rotate(${ang})`, 'pointer-events': 'none' })); }
      else if (showE && canRoad(k, pi)) { const l = S_('line', { x1: a.x + (b.x - a.x) * .2, y1: a.y + (b.y - a.y) * .2, x2: b.x - (b.x - a.x) * .2, y2: b.y - (b.y - a.y) * .2, class: 'tgt-e', stroke: p.c === '#FFFFFF' ? '#191712' : p.c }); const hit = S_('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: 'transparent', 'stroke-width': 18 }); const g = S_('g', { class: 'tap' }, l, hit); g.addEventListener('click', () => tapEdge(k)); svg.append(g); } });
    // towns and cities: chunky blocks with a lit face and a shaded side
    VERT.forEach((v, k) => { const b = G.bld[k];
      if (b) { const col = G.P[b.p].c, s = R / 40;
        svg.append(G_(`<ellipse cx="0" cy="9" rx="${b.city ? 14 : 10}" ry="4" fill="#000" opacity=".3"/>` + (b.city
          ? `<path d="M-13 9 V-3 L-6 -10 L1 -3 V-6 H13 V9 Z" fill="${shade(col, .72)}"/><path d="M-13 -3 L-6 -10 L1 -3 Z M1 -6 H13 V-1 H1 Z" fill="${shade(col, 1.1)}"/><path d="M-13 9 V-3 H1 V9 Z" fill="${col}" stroke="rgba(0,0,0,.45)" stroke-width="1"/>`
          : `<path d="M-8 8 V-2 L0 -10 L8 -2 V8 Z" fill="${col}" stroke="rgba(0,0,0,.45)" stroke-width="1"/><path d="M0 -10 L8 -2 V8 L3 8 V-5 Z" fill="${shade(col, .72)}"/>`), { transform: `translate(${v.x} ${v.y}) scale(${s})`, 'pointer-events': 'none' }));
        if (G.mode === 'city' && b.p === pi && !b.city) { const t = S_('circle', { cx: v.x, cy: v.y, r: 13, class: 'tgt-v', 'fill-opacity': '.35' }); t.addEventListener('click', () => tapVertex(k)); svg.append(t); } }
      else if (showV && G.mode !== 'city' && canSettle(k, pi, G.phase === 'setup')) { const t = S_('circle', { cx: v.x, cy: v.y, r: 8, class: 'tgt-v' }); t.addEventListener('click', () => tapVertex(k)); const hit = S_('circle', { cx: v.x, cy: v.y, r: 16, fill: 'transparent' }); hit.addEventListener('click', () => tapVertex(k)); svg.append(t, hit); } });
    return svg; };
  let geoKey = '';
  const layout = () => {
    if (!TV || (busy && D)) return; const st0 = TV.stage; const W0 = st0.clientWidth, H0 = st0.clientHeight; if (!W0 || H0 < 100) return;
    const key = W0 + 'x' + H0 + TV.look; if (key === geoKey && plane) return; geoKey = key;
    const ds = Math.round(Math.max(28, Math.min(38, W0 * .09))); const ar = VB[2] / VB[3]; let w = W0 - 4, hh = w / ar; if (hh > H0 - ds * 3) { hh = H0 - ds * 3; w = hh * ar; }
    plane = h('div', { class: 'tv-plane', style: { left: (W0 - w) / 2 + 'px', top: Math.max(4, (H0 - hh - ds * 2.6) / 2) + 'px', width: w + 'px', height: hh + 'px', transform: `rotateX(${tilt()}deg)`, transformOrigin: '50% 60%' } });
    boardSlot = h('div', { style: { position: 'absolute', inset: '0' } });
    D = boardDice(2, ds, G.last); Object.assign(D.el.style, { left: w / 2 - ds * 1.25 + 'px', top: hh + ds * .55 + 'px' });
    plane.append(boardSlot, D.el); st0.replaceChildren(plane); boardSlot.replaceChildren(drawSVG());
  };
  const cost = (c) => h('span', { class: 'is-cost' }, Object.entries(c).flatMap(([r, n]) => Array.from({ length: n }, () => h('i', { style: { background: T2[r][0] } }))));
  const tray = () => h('div', { class: 'is-tray' }, RES.map((r) => { const n = cur().hand[r]; const card = h('div', { class: 'is-card' + (n ? '' : ' zero') }, h('b', null, RN[r]), h('div', { class: 'n' }, n));
    const ic = document.createElementNS(svgNS, 'svg'); ic.setAttribute('viewBox', '-16 -16 32 32'); ic.style.background = T2[r][0]; ic.innerHTML = GL[r]; card.prepend(ic); return card; }));
  const playersSheet = () => sheet('Players', h('div', { class: 'group' }, G.P.map((q, i) => h('div', { class: 'rowi' + (i === G.turn ? ' on' : '') }, h('i', { class: 'opdot', style: { background: q.c, boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,.3)' } }), h('div', { class: 't' }, h('b', null, q.n), h('span', null, `${count(q)} cards · ${q.knights} knights · road ${roadLen(i)}` + (G.longest === i ? ' · Longest Road' : '') + (G.army === i ? ' · Largest Army' : ''))), h('b', null, vp(i, i === G.turn) + ' pts')))));
  const logSheet = () => sheet('Game log', h('div', { class: 'stack', style: { gap: 6 } }, [...G.log].reverse().map((m) => h('div', { class: 'small' }, m))));
  const costSheet = () => sheet('Building costs', h('div', { class: 'group' }, [['Road', COST.road, '0 points, links your towns (15 each)'], ['Town', COST.settle, '1 point (5 each)'], ['City', COST.city, '2 points, doubles what a town collects (4 each)'], ['Development card', COST.dev, 'Knights, points and more']].map(([n, c, d]) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', null, n), h('span', null, d)), h('div', { class: 'd' }, Object.entries(c).map(([r, k]) => k + ' ' + RN[r]).join(' + '))))));
  const guard = (fn) => () => (busy ? toast('Wait for the dice') : fn());
  const openTV = () => {
    if (TV) return;
    TV = tableView({ bg: () => 'sea', look: st.isLook || 'table', onLook: (l) => { st.isLook = l; save(); geoKey = ''; layout(); },
      menu: () => [['Development cards', 'bolt', guard(devSheet)], ['Trade', 'flip', guard(tradeSheet)], ['Building costs', 'list', costSheet], ['Players', 'users', playersSheet], ['Game log', 'list', logSheet],
        ['How to play', 'book', () => howTo('isle', { title: 'Islanders', rules: RULES, color: '#FF5A3C' })], ['Restart game', 'flip', guard(restart), 'New island, same or new players'], ['Leave table', 'x', () => go('play/board'), 'Your game is saved']] });
    TV.stage.style.bottom = 'calc(var(--safe-b) + 96px)';
    TV.onResize = layout;
  };
  const closeTV = () => { TV?.close(); TV = null; plane = null; geoKey = ''; D = null; };
  function render() {
    if (!G) { closeTV(); return setup(); }
    if (G.phase === 'over') { closeTV(); const w = G.P[G.winner]; body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal', style: { background: w.c === '#FFFFFF' ? '#14130F' : w.c, minHeight: 'auto', padding: 28 } }, h('div', { class: 'k', style: { color: 'rgba(255,255,255,.8)' } }, '10 points'), h('div', { class: 'w' }, w.n + ' wins')),
      h('div', { class: 'group' }, G.P.map((q, i) => h('div', { class: 'rowi' }, h('i', { class: 'opdot', style: { background: q.c } }), h('div', { class: 't' }, h('b', null, q.n)), h('b', null, vp(i, true) + ' pts')))), h('button', { class: 'btn accent block', onclick: () => { G = null; st.isle = null; save(); setup(); } }, 'New game'))); return; }
    body.replaceChildren(h('p', { class: 'muted center' }, 'Game in progress.'), h('button', { class: 'btn accent block', onclick: () => { closeTV(); render(); } }, 'Back to the table'));
    openTV();
    const p = cur(), pi = G.turn;
    if (G.phase !== 'main' || G.mode) buildOpen = false;
    TV.players(G.P.map((q, i) => ({ n: q.n, c: q.c, v: vp(i, i === pi) + ' pts' })), pi);
    const tip = G.phase === 'setup' ? (G.sub === 'settle' ? `${p.n}: tap a glowing spot for a town` + (G.step >= G.P.length ? ' (this one pays out)' : '') : `${p.n}: tap a glowing edge for its road`)
      : G.phase === 'discard' ? 'Rolled 7: big hands give back half' : G.phase === 'robber' ? `${p.n}: tap a tile to move the robber` : G.mode === 'settle' ? 'Tap a glowing spot for your town' : G.mode === 'city' ? 'Tap one of your towns to make it a city' : G.mode === 'road' ? 'Tap a glowing edge for your road' : G.mode === 'free' ? `Free road: ${G.free} left` : G.log.at(-1) || '';
    TV.tip(tip);
    const can = (k) => afford(p, COST[k]);
    const mode = (m) => () => { G.mode = m; render(); };
    const held = p.dev.length + p.fresh.length;
    TV.acts(busy ? [act('Rolling…', null, { go: 1, dis: 1 })]
      : G.phase === 'roll' ? [act('Roll dice', roll, { go: 1, sub: p.n + '’s turn' }), held ? act('Cards', devSheet, { sub: held + ' held' }) : null]
      : G.phase !== 'main' ? []
      : G.mode ? [act({ road: 'Placing a road', settle: 'Placing a town', city: 'Placing a city', free: 'Free roads' }[G.mode], null, { on: 1, dis: 1 }), G.mode !== 'free' ? act('Cancel', () => { G.mode = null; render(); }) : null]
      : buildOpen ? [act('Road', mode('road'), { sub: cost(COST.road), dis: !can('road') || !pieces(pi, 'road') || !EDGE.some((_, k) => canRoad(k, pi)) }), act('Town', mode('settle'), { sub: cost(COST.settle), dis: !can('settle') || !pieces(pi, 'settle') || !VERT.some((_, k) => canSettle(k, pi, false)) }),
        act('City', mode('city'), { sub: cost(COST.city), dis: !can('city') || !pieces(pi, 'city') || !Object.values(G.bld).some((x) => x.p === pi && !x.city) }), act('Card', buyDev, { sub: cost(COST.dev), dis: !can('dev') }), act('Back', () => { buildOpen = false; render(); })]
      : [act('Build', () => { buildOpen = true; render(); }, { go: 1 }), act('Trade', tradeSheet), held ? act('Cards', devSheet, { sub: held + ' held' }) : null, act('End turn', endTurn)]);
    const old = TV.root.querySelector('.is-tray'); const t = tray(); old ? old.replaceWith(t) : TV.root.append(t);
    layout(); if (plane) boardSlot.replaceChildren(drawSVG()); else { layout(); if (!plane) requestAnimationFrame(layout); }
    if (G.phase === 'discard' && !discarding) runDiscards();
  }
  onLeave(() => { if (G) persist(); closeTV(); });
  G ? render() : setup();
  return bpage('isle', RULES, body);
});
