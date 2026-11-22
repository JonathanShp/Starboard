// Seaopoly: Monopoly-style property trading, pass-and-play on one phone.
import { h, icon, S, save, route, seg, sheet, toast, shuffle, haptic, beep, confirmSheet, onLeave , sfx } from './core.js';
import { bg, dice, bpage } from './boardgames.js';

const GC = { br: '#8B5A3C', lb: '#7FD0F0', pk: '#E0569B', or: '#FF8A1A', rd: '#E5372A', yl: '#FFD21A', gr: '#1FA85A', db: '#2A4BD0' };
const HC = (i) => i < 10 ? 50 : i < 20 ? 100 : i < 30 ? 150 : 200;
const P_ = (n, s, g, p) => ({ t: 'prop', n, s, g, p });
const SP = [
  { t: 'go', n: 'Embark', s: 'GO' }, P_('Key West Pier', 'Key West', 'br', 60), { t: 'cc', n: 'Treasure Chest', s: 'Chest' }, P_('Bimini Beach', 'Bimini', 'br', 60), { t: 'tax', n: 'Port Fee', s: 'Port fee', amt: 200 },
  { t: 'port', n: 'Miami Terminal', s: 'Miami', p: 200 }, P_('Nassau Market', 'Nassau', 'lb', 100), { t: 'ch', n: 'Captain\'s Call', s: 'Call' }, P_('Paradise Island', 'Paradise', 'lb', 100), P_('Cable Beach', 'Cable Bch', 'lb', 120),
  { t: 'jail', n: 'The Brig', s: 'Brig' }, P_('Cozumel Reef', 'Cozumel', 'pk', 140), { t: 'util', n: 'Ship Wi-Fi', s: 'Wi-Fi', p: 150 }, P_('Playa del Carmen', 'Playa', 'pk', 140), P_('Tulum Ruins', 'Tulum', 'pk', 160),
  { t: 'port', n: 'Fort Lauderdale Port', s: 'Ft Laud.', p: 200 }, P_('Roatán Bay', 'Roatán', 'or', 180), { t: 'cc', n: 'Treasure Chest', s: 'Chest' }, P_('Belize Cayes', 'Belize', 'or', 180), P_('Costa Maya', 'Costa M.', 'or', 200),
  { t: 'free', n: 'Sun Deck', s: 'Sun Deck' }, P_('Labadee Zipline', 'Labadee', 'rd', 220), { t: 'ch', n: 'Captain\'s Call', s: 'Call' }, P_('Grand Cayman', 'Cayman', 'rd', 220), P_('Stingray City', 'Stingray', 'rd', 240),
  { t: 'port', n: 'Port Canaveral', s: 'Canav.', p: 200 }, P_('St. Thomas', 'St Thomas', 'yl', 260), P_('St. Maarten', 'St Maart.', 'yl', 260), { t: 'util', n: 'Laundry Service', s: 'Laundry', p: 150 }, P_('Aruba Palm Beach', 'Aruba', 'yl', 280),
  { t: 'gojail', n: 'Go to the Brig', s: 'To Brig' }, P_('Barbados', 'Barba-dos', 'gr', 300), P_('St. Lucia Pitons', 'St Lucia', 'gr', 300), { t: 'cc', n: 'Treasure Chest', s: 'Chest' }, P_('Antigua', 'Anti-gua', 'gr', 320),
  { t: 'port', n: 'Galveston Port', s: 'Galv.', p: 200 }, { t: 'ch', n: 'Captain\'s Call', s: 'Call' }, P_('Royal Suite', 'Royal Ste', 'db', 350), { t: 'tax', n: 'Luxury Spa', s: 'Spa', amt: 100 }, P_('Private Island', 'Private Isl', 'db', 400),
];
SP.forEach((x, i) => { if (x.t === 'prop') { const r = Math.max(2, Math.round(x.p * 0.065)); x.rent = [r, r * 5, r * 15, r * 40, r * 50, r * 60]; x.hc = HC(i); } });
const CH = [['Advance to Embark. Collect $200.', { to: 0 }], ['Advance to Stingray City.', { to: 24 }], ['Advance to the Royal Suite.', { to: 37 }], ['Sail to the nearest port. If it\'s owned, pay double rent.', { near: 'port' }], ['Go to the nearest ship service.', { near: 'util' }], ['The purser refunds you $50.', { cash: 50 }], ['Get out of the Brig free. Keep this card.', { goo: 1 }], ['Go back 3 spaces.', { back: 3 }], ['Caught in the crew-only area. Go to the Brig.', { jail: 1 }], ['Cabin repairs: pay $25 per cabin and $100 per resort.', { repair: [25, 100] }], ['Speeding on the go-karts. Pay $15.', { cash: -15 }], ['Take a trip to Miami Terminal.', { to: 5 }], ['You hosted the deck party. Pay each player $50.', { each: -50 }], ['Your shore excursion business pays off. Collect $150.', { cash: 150 }], ['Advance to Cozumel Reef.', { to: 11 }]];
const CC = [['Advance to Embark. Collect $200.', { to: 0 }], ['Casino jackpot! Collect $200.', { cash: 200 }], ['Spa bill. Pay $50.', { cash: -50 }], ['You sold your towel animals. Collect $50.', { cash: 50 }], ['Get out of the Brig free. Keep this card.', { goo: 1 }], ['Go directly to the Brig.', { jail: 1 }], ['Bingo night! Collect $50 from every player.', { each: 50 }], ['Port tax refund. Collect $20.', { cash: 20 }], ['It\'s your birthday at sea. Collect $10 from every player.', { each: 10 }], ['Ship doctor visit. Pay $100.', { cash: -100 }], ['Travel insurance. Pay $50.', { cash: -50 }], ['Passengers tipped you. Collect $25.', { cash: 25 }], ['Cabin makeover: pay $40 per cabin and $115 per resort.', { repair: [40, 115] }], ['Second place in karaoke. Collect $10.', { cash: 10 }], ['A long-lost aunt left you $100.', { cash: 100 }]];
const PCOL = ['#3D7BFF', '#FF5A3C', '#1FCB6E', '#FFC21A', '#8F63FF', '#FF4F8B'];
const RULES = 'Everyone starts with $1,500. Roll the 3D dice and sail around the board.\n\nLand on an unowned port, island or service: buy it or pass. Land on someone else\'s: pay rent. Own a whole color set and rent doubles, and you can build cabins (up to 4, then a resort).\n\nDoubles = roll again. Three doubles in a row sends you to the Brig. Get out by rolling doubles, paying $50, or using a card.\n\nPassing Embark pays $200. Treasure Chest and Captain\'s Call cards do what they say.\n\nTrade anything with anyone on your turn. Short on cash? Mortgage or sell cabins. Can\'t pay = bankrupt. Last one standing wins.';

route(/^play\/board\/opoly$/, () => {
  const st = bg(); const body = h('div');
  let G = st.opoly; let busy = false;
  const persist = () => { st.opoly = G; save(); };
  // ---------- setup ----------
  const setup = () => {
    const names = [...(st.opNames || S.party.players || []).slice(0, 6)];
    const inp = h('input', { placeholder: 'Add player', enterkeyhint: 'done' });
    const add = () => { const n = inp.value.trim(); if (n && names.length < 6 && !names.includes(n)) names.push(n); inp.value = ''; draw(); };
    inp.onkeydown = (e) => { if (e.key === 'Enter') add(); };
    const draw = () => body.replaceChildren(h('div', { class: 'stack fade-in' }, h('b', null, 'Players (2–6)'), h('div', { class: 'flex' }, inp, h('button', { class: 'btn primary sm', onclick: add }, 'Add')),
      h('div', { class: 'flex wrap' }, names.map((n, i) => h('button', { class: 'chip', style: { boxShadow: `inset 0 0 0 3px ${PCOL[i]}` }, onclick: () => { names.splice(i, 1); draw(); } }, n, ' ×'))),
      names.length >= 2 ? h('button', { class: 'btn accent block', onclick: () => { st.opNames = names; G = { P: names.map((n, i) => ({ n, c: PCOL[i], cash: 1500, pos: 0, jail: -1, goo: 0, out: false })), own: {}, turn: 0, dbl: 0, phase: 'roll', log: [names[0] + ' goes first.'], ch: shuffle(CH.map((_, i) => i)), cc: shuffle(CC.map((_, i) => i)), last: [1, 1] }; persist(); render(); } }, 'Start game') : h('p', { class: 'small dim center' }, 'Add at least 2 players')));
    draw();
  };
  // ---------- rules engine ----------
  const cur = () => G.P[G.turn];
  const log = (m) => { G.log.push(m); G.log = G.log.slice(-30); };
  const inGroup = (g) => SP.map((x, i) => x.g === g ? i : -1).filter((i) => i >= 0);
  const owns = (pi, i) => G.own[i]?.o === pi;
  const hasSet = (pi, g) => inGroup(g).every((i) => owns(pi, i));
  const houses = (i) => G.own[i]?.h || 0;
  const rentFor = (i, roll) => {
    const x = SP[i], o = G.own[i]; if (!o || o.m) return 0;
    if (x.t === 'prop') return o.h ? x.rent[o.h] : x.rent[0] * (hasSet(o.o, x.g) ? 2 : 1);
    if (x.t === 'port') { const n = [5, 15, 25, 35].filter((j) => owns(o.o, j)).length; return 25 * 2 ** (n - 1); }
    if (x.t === 'util') { const n = [12, 28].filter((j) => owns(o.o, j)).length; return roll * (n === 2 ? 10 : 4); }
    return 0;
  };
  const worth = (pi) => G.P[pi].cash + Object.entries(G.own).filter(([, o]) => o.o === pi).reduce((s, [i, o]) => s + (o.m ? 0 : SP[i].p / 2) + (o.h || 0) * (SP[i].hc || 0) / 2, 0);
  // raise cash automatically: sell cabins, then mortgage
  const raise = (pi, need) => {
    const p = G.P[pi]; const mine = () => Object.keys(G.own).map(Number).filter((i) => owns(pi, i)).sort((a, b) => SP[b].p - SP[a].p);
    for (const i of mine()) while (p.cash < need && houses(i) > 0) { G.own[i].h--; p.cash += SP[i].hc / 2; log(`${p.n} sold a cabin on ${SP[i].n}.`); }
    for (const i of mine()) if (p.cash < need && !G.own[i].m && !inGroup(SP[i].g || '-').some((j) => houses(j))) { G.own[i].m = true; p.cash += SP[i].p / 2; log(`${p.n} mortgaged ${SP[i].n}.`); }
    return p.cash >= need;
  };
  const pay = (pi, amt, to = null) => {
    const p = G.P[pi]; if (amt <= 0) return true;
    if (p.cash < amt && !raise(pi, amt)) { bankrupt(pi, to); return false; }
    p.cash -= amt; if (to != null) G.P[to].cash += amt; sfx.coins(); return true;
  };
  const bankrupt = (pi, to) => {
    const p = G.P[pi]; p.out = true; log(`${p.n} is bankrupt!`); haptic([80, 40, 80]); sfx.bad();
    for (const i of Object.keys(G.own)) if (G.own[i].o === pi) { if (to != null) { G.own[i].o = to; G.own[i].h = 0; } else delete G.own[i]; }
    if (to != null) { G.P[to].cash += Math.max(0, p.cash); G.P[to].goo += p.goo; } p.cash = 0; p.goo = 0;
  };
  const alive = () => G.P.filter((p) => !p.out);
  const toJail = (p) => { p.pos = 10; p.jail = 0; G.dbl = 0; log(`${p.n} goes to the Brig.`); sfx.bad(); };
  const walk = async (p, steps) => {
    const dir = Math.sign(steps);
    for (let k = 0; k < Math.abs(steps); k++) { p.pos = (p.pos + dir + 40) % 40; if (p.pos === 0 && dir > 0) { p.cash += 200; log(`${p.n} passed Embark: +$200.`); sfx.coins(); } drawBoard(); sfx.step(); await new Promise((r) => setTimeout(r, 110)); }
  };
  const goTo = async (p, to) => walk(p, ((to - p.pos) + 40) % 40 || 40);
  // resolve the square the current player landed on. returns 'buy' when a decision is needed
  const land = async (roll, mult = 1) => {
    const p = cur(); const pi = G.turn; const x = SP[p.pos];
    if (x.t === 'gojail') { toJail(p); return; }
    if (x.t === 'tax') { log(`${p.n} paid ${x.n}: $${x.amt}.`); pay(pi, x.amt); return; }
    if (x.t === 'cc' || x.t === 'ch') return card(x.t, roll);
    if (x.p) {
      const o = G.own[p.pos];
      if (!o) return p.cash >= x.p ? 'buy' : (log(`${p.n} can't afford ${x.n}.`), undefined);
      if (o.o === pi) return;
      if (o.m) { log(`${x.n} is mortgaged: no rent.`); return; }
      const r = rentFor(p.pos, roll) * mult; log(`${p.n} paid $${r} rent to ${G.P[o.o].n}.`); pay(pi, r, o.o);
    }
  };
  const card = async (kind, roll) => {
    const deck = kind === 'ch' ? G.ch : G.cc; const list = kind === 'ch' ? CH : CC;
    const id = deck.shift(); const [txt, a] = list[id]; if (!a.goo) deck.push(id);
    await new Promise((r) => { const close = sheet(kind === 'ch' ? 'Captain\'s Call' : 'Treasure Chest', h('div', { class: 'stack' }, h('div', { class: 'opcard ' + kind }, txt), h('button', { class: 'btn primary block', onclick: () => close() }, 'OK')), { onClose: r }); });
    const p = cur(), pi = G.turn; log(`${p.n}: ${txt}`);
    if (a.cash) { if (a.cash > 0) p.cash += a.cash; else pay(pi, -a.cash); }
    if (a.goo) p.goo++;
    if (a.jail) return toJail(p);
    if (a.each) for (let j = 0; j < G.P.length; j++) if (j !== pi && !G.P[j].out) { if (a.each > 0) pay(j, a.each, pi); else pay(pi, -a.each, j); }
    if (a.repair) { const t = Object.entries(G.own).filter(([, o]) => o.o === pi).reduce((s, [, o]) => s + (o.h === 5 ? a.repair[1] : (o.h || 0) * a.repair[0]), 0); pay(pi, t); }
    if (a.to != null) { await goTo(p, a.to); return land(roll); }
    if (a.back) { await walk(p, -a.back); return land(roll); }
    if (a.near) { const ts = a.near === 'port' ? [5, 15, 25, 35] : [12, 28]; const to = ts.find((t) => t > p.pos) ?? ts[0]; await goTo(p, to); return land(a.near === 'util' ? roll : roll, a.near === 'port' ? 2 : 1); }
  };
  const nextTurn = () => { if (alive().length < 2) return; do G.turn = (G.turn + 1) % G.P.length; while (G.P[G.turn].out); G.dbl = 0; G.phase = 'roll'; log(`${cur().n}'s turn.`); persist(); render(); };
  const afterResolve = (rolledDouble) => {
    if (alive().length < 2) { G.phase = 'over'; persist(); return render(); }
    if (cur().out) { G.phase = 'end'; persist(); return render(); }
    G.phase = rolledDouble && cur().jail < 0 ? 'roll' : 'end'; persist(); render();
  };
  const doRoll = async () => {
    if (busy) return; busy = true; render();
    const v = await D.roll(); G.last = v; const p = cur(); const dbl = v[0] === v[1]; const sum = v[0] + v[1];
    if (p.jail >= 0) {
      if (dbl) { p.jail = -1; log(`${p.n} rolled doubles and left the Brig.`); }
      else { p.jail++; if (p.jail >= 3) { log(`${p.n} paid $50 to leave the Brig.`); pay(G.turn, 50); p.jail = -1; } else { log(`${p.n} stays in the Brig.`); busy = false; return afterResolve(false); } }
      await walk(p, sum); const r = await land(sum); busy = false; if (r === 'buy') { G.phase = 'buy'; persist(); return render(); } return afterResolve(false);
    }
    if (dbl) { G.dbl++; if (G.dbl >= 3) { toJail(p); busy = false; return afterResolve(false); } }
    await walk(p, sum); const r = await land(sum); busy = false;
    if (r === 'buy') { G.phase = 'buy'; G.again = dbl; persist(); return render(); }
    afterResolve(dbl && cur().jail < 0);
  };
  const buy = () => { const p = cur(); const x = SP[p.pos]; p.cash -= x.p; G.own[p.pos] = { o: G.turn, h: 0, m: false }; log(`${p.n} bought ${x.n} for $${x.p}.`); sfx.coins(); haptic(20); afterResolve(G.again && p.jail < 0); };
  const passBuy = () => { log(`${cur().n} passed on ${SP[cur().pos].n}.`); afterResolve(G.again && cur().jail < 0); };
  // ---------- sheets ----------
  const info = (i) => { const x = SP[i], o = G.own[i];
    const rows = x.t === 'prop' ? [['Rent', '$' + x.rent[0]], ['With full set', '$' + x.rent[0] * 2], ...[1, 2, 3, 4].map((k) => [k + ' cabin' + (k > 1 ? 's' : ''), '$' + x.rent[k]]), ['Resort', '$' + x.rent[5]], ['Cabin cost', '$' + x.hc]] : x.t === 'port' ? [['1 port', '$25'], ['2 ports', '$50'], ['3 ports', '$100'], ['4 ports', '$200']] : x.t === 'util' ? [['1 service', '4 × dice'], ['Both', '10 × dice']] : [];
    sheet(x.n, h('div', { class: 'stack' }, h('div', { class: 'opdeed', style: { '--g': GC[x.g] || '#14130F' } }, h('b', null, x.n), x.p ? h('span', null, 'Price $' + x.p + ' · mortgage $' + x.p / 2) : h('span', null, { go: 'Collect $200 every time you pass.', jail: 'Just visiting, unless you were sent here.', free: 'Relax. Nothing happens here.', gojail: 'Go straight to the Brig. Do not pass Embark.', tax: 'Pay $' + x.amt + '.', cc: 'Draw a Treasure Chest card.', ch: 'Draw a Captain\'s Call card.' }[x.t])),
      rows.length ? h('div', { class: 'group' }, rows.map(([a, b]) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', { style: { fontWeight: 600 } }, a)), h('b', null, b)))) : null,
      o ? h('p', { class: 'muted center', style: { margin: 0 } }, 'Owned by ' + G.P[o.o].n + (o.m ? ' (mortgaged)' : '') + (o.h ? ` · ${o.h === 5 ? 'resort' : o.h + ' cabins'}` : '')) : null)); };
  const buildSheet = () => { const pi = G.turn; const p = cur(); const box = h('div', { class: 'stack' });
    const draw = () => { const sets = Object.keys(GC).filter((g) => hasSet(pi, g) && !inGroup(g).some((i) => G.own[i].m));
      box.replaceChildren(...(sets.length ? [h('p', { class: 'small muted', style: { margin: 0 } }, `Cash $${p.cash}. Build evenly: each island in a set needs a cabin before any gets a second.`), ...sets.map((g) => h('div', { class: 'group' }, inGroup(g).map((i) => { const hs = houses(i), grp = inGroup(g).map(houses);
        return h('div', { class: 'rowi' }, h('i', { style: { width: 10, alignSelf: 'stretch', borderRadius: 4, background: GC[g] } }), h('div', { class: 't' }, h('b', null, SP[i].n), h('span', null, hs === 5 ? 'Resort' : hs + ' cabins · $' + SP[i].hc + ' each')),
          h('button', { class: 'btn sm', disabled: hs === 0 || hs < Math.max(...grp), onclick: () => { G.own[i].h--; p.cash += SP[i].hc / 2; log(`${p.n} sold a cabin on ${SP[i].n}.`); persist(); draw(); render(); } }, '−'),
          h('button', { class: 'btn sm primary', disabled: hs === 5 || hs > Math.min(...grp) || p.cash < SP[i].hc, onclick: () => { G.own[i].h++; p.cash -= SP[i].hc; beep(700, .06); log(`${p.n} built on ${SP[i].n}.`); persist(); draw(); render(); } }, '+')); })))] : [h('div', { class: 'empty' }, 'Own every island in a color set (none mortgaged) to build cabins.')])); };
    draw(); sheet('Build cabins', box); };
  const mortSheet = () => { const pi = G.turn; const p = cur(); const box = h('div');
    const draw = () => { const mine = Object.keys(G.own).map(Number).filter((i) => owns(pi, i)).sort((a, b) => a - b);
      box.replaceChildren(mine.length ? h('div', { class: 'group' }, mine.map((i) => { const o = G.own[i]; const blocked = SP[i].g && inGroup(SP[i].g).some((j) => houses(j)); const cost = Math.ceil(SP[i].p / 2 * 1.1);
        return h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', null, SP[i].n), h('span', null, o.m ? `Mortgaged · unmortgage $${cost}` : blocked ? 'Sell cabins first' : `Mortgage for $${SP[i].p / 2}`)),
          o.m ? h('button', { class: 'btn sm primary', disabled: p.cash < cost, onclick: () => { o.m = false; p.cash -= cost; persist(); draw(); render(); } }, 'Unmortgage') : h('button', { class: 'btn sm', disabled: blocked, onclick: () => { o.m = true; p.cash += SP[i].p / 2; log(`${p.n} mortgaged ${SP[i].n}.`); persist(); draw(); render(); } }, 'Mortgage')); })) : h('div', { class: 'empty' }, 'You don\'t own anything yet.')); };
    draw(); sheet('Mortgage', box); };
  const tradeSheet = () => { const pi = G.turn; const others = G.P.map((p, i) => i).filter((i) => i !== pi && !G.P[i].out); if (!others.length) return;
    let pj = others[0]; const give = new Set(), get = new Set(); const box = h('div', { class: 'stack' });
    const cashA = h('input', { type: 'number', inputmode: 'numeric', placeholder: '$ you give', min: 0 }), cashB = h('input', { type: 'number', inputmode: 'numeric', placeholder: '$ you get', min: 0 });
    const list = (who, set) => { const mine = Object.keys(G.own).map(Number).filter((i) => owns(who, i) && !(SP[i].g && inGroup(SP[i].g).some((j) => houses(j)))); return mine.length ? h('div', { class: 'flex wrap' }, mine.map((i) => h('button', { class: 'chip' + (set.has(i) ? ' on' : ''), style: { boxShadow: `inset 4px 0 0 ${GC[SP[i].g] || '#14130F'}` }, onclick: (e) => { set.has(i) ? set.delete(i) : set.add(i); e.currentTarget.classList.toggle('on'); } }, SP[i].s))) : h('p', { class: 'small dim', style: { margin: 0 } }, 'Nothing tradeable'); };
    const draw = () => box.replaceChildren(seg(others.map((i) => [i, G.P[i].n]), pj, (v) => { pj = v; give.clear(); get.clear(); draw(); }), h('b', null, 'You give'), list(pi, give), cashA, h('b', null, G.P[pj].n + ' gives'), list(pj, get), cashB,
      h('button', { class: 'btn primary block', onclick: async () => { const a = Math.max(0, +cashA.value || 0), b = Math.max(0, +cashB.value || 0);
        if (a > G.P[pi].cash || b > G.P[pj].cash) return toast('Not enough cash for that'); if (!give.size && !get.size && !a && !b) return;
        close(); const desc = `${G.P[pi].n} gives ${[...[...give].map((i) => SP[i].n), a ? '$' + a : ''].filter(Boolean).join(', ') || 'nothing'}.\n${G.P[pj].n} gives ${[...[...get].map((i) => SP[i].n), b ? '$' + b : ''].filter(Boolean).join(', ') || 'nothing'}.`;
        if (!await confirmSheet(`Pass to ${G.P[pj].n}: accept?`, desc, 'Accept trade', false)) return toast('Trade declined');
        give.forEach((i) => G.own[i].o = pj); get.forEach((i) => G.own[i].o = pi); G.P[pi].cash += b - a; G.P[pj].cash += a - b; log(`Trade: ${G.P[pi].n} ⇄ ${G.P[pj].n}.`); beep(880, .1); persist(); render(); } }, 'Propose trade'));
    draw(); const close = sheet('Trade', box); };
  const endGame = async () => { if (!await confirmSheet('End the game?', 'Richest player (cash + property) wins.', 'End game', false)) return; G.phase = 'over'; persist(); render(); };
  // ---------- view ----------
  let D; const boardEl = h('div', { class: 'opboard' }); const center = h('div', { class: 'opcenter' });
  const pos = (i) => i <= 10 ? [11, 11 - i] : i <= 20 ? [11 - (i - 10), 1] : i <= 30 ? [1, 1 + (i - 20)] : [1 + (i - 30), 11];
  function drawBoard() {
    if (!G) return;
    boardEl.replaceChildren(...SP.map((x, i) => { const [r, c] = pos(i); const o = G.own[i]; const toks = G.P.filter((p) => !p.out && p.pos === i);
      const side = i < 10 ? 'b' : i < 20 ? 'l' : i < 30 ? 't' : 'r';
      return h('button', { class: `opc s-${side}` + (i % 10 === 0 ? ' corner' : '') + (o?.m ? ' mort' : ''), style: { gridRow: String(r), gridColumn: String(c), '--g': GC[x.g] || 'transparent', '--o': o ? G.P[o.o].c : 'transparent' }, onclick: () => info(i), 'aria-label': x.n },
        x.g ? h('i', { class: 'strip' }) : null, h('span', { class: 'lbl' }, x.s), x.p && !x.g ? null : null,
        o?.h ? h('span', { class: 'hs' }, o.h === 5 ? 'R' : '•'.repeat(o.h)) : null,
        toks.length ? h('span', { class: 'toks' }, toks.map((p) => h('i', { style: { background: p.c } }))) : null); }), center);
  }
  function render() {
    if (!G) return setup();
    if (!D) D = dice(2, { size: 38, values: G.last });
    const p = cur(); const al = alive();
    if (G.phase === 'over') { const rank = G.P.map((q, i) => [q, worth(i)]).sort((a, b) => b[1] - a[1]);
      body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal', style: { background: rank[0][0].c, minHeight: 'auto', padding: 28 } }, h('div', { class: 'k', style: { color: 'rgba(255,255,255,.8)' } }, 'Winner'), h('div', { class: 'w' }, rank[0][0].n)),
        h('div', { class: 'group' }, rank.map(([q, w], k) => h('div', { class: 'rowi' }, h('b', { style: { width: 22 } }, k + 1), h('div', { class: 't' }, h('b', null, q.n), h('span', null, q.out ? 'Bankrupt' : 'Net worth $' + w))))),
        h('button', { class: 'btn accent block', onclick: () => { G = null; st.opoly = null; save(); setup(); } }, 'New game'))); return; }
    const btn = (label, fn, cls = 'primary', dis = false) => h('button', { class: 'btn sm ' + cls, onclick: fn, disabled: busy || dis }, label);
    const acts = G.phase === 'buy' ? [btn(`Buy $${SP[p.pos].p}`, buy), btn('Pass', passBuy, '')] : G.phase === 'roll' ? [btn(p.jail >= 0 ? 'Roll for doubles' : G.dbl ? 'Roll again' : 'Roll', doRoll), p.jail >= 0 ? btn('Pay $50', () => { pay(G.turn, 50); p.jail = -1; log(`${p.n} paid $50 to leave the Brig.`); persist(); render(); }, '', p.cash < 50) : null, p.jail >= 0 && p.goo ? btn('Use card', () => { p.goo--; p.jail = -1; log(`${p.n} used a Get Out card.`); persist(); render(); }, '') : null] : [btn('End turn', nextTurn)];
    center.replaceChildren(h('div', { class: 'opturn', style: { '--pc': p.c } }, h('i'), h('b', null, p.n), h('span', null, '$' + p.cash)), h('div', { class: 'opdice' }, D.el), h('div', { class: 'opacts' }, acts), h('div', { class: 'oplog' }, G.log.slice(-2).map((m) => h('div', null, m))));
    drawBoard();
    body.replaceChildren(h('div', { class: 'stack', style: { gap: 10 } }, boardEl,
      h('div', { class: 'flex', style: { gap: 6 } }, h('button', { class: 'tbtn', onclick: buildSheet, disabled: busy }, icon('plus'), h('span', null, 'Build')), h('button', { class: 'tbtn', onclick: tradeSheet, disabled: busy }, icon('flip'), h('span', null, 'Trade')), h('button', { class: 'tbtn', onclick: mortSheet, disabled: busy }, icon('wallet'), h('span', null, 'Mortgage')), h('button', { class: 'tbtn', onclick: endGame }, icon('flag'), h('span', null, 'End'))),
      h('div', { class: 'group' }, G.P.map((q, i) => h('div', { class: 'rowi' + (i === G.turn ? ' on' : '') }, h('i', { class: 'opdot', style: { background: q.c } }), h('div', { class: 't' }, h('b', null, q.n + (q.jail >= 0 ? ' (in the Brig)' : '')), h('span', { class: 'opprops' }, q.out ? 'Bankrupt' : Object.keys(G.own).filter((k) => G.own[k].o === i).map((k) => h('i', { style: { background: GC[SP[k].g] || '#14130F', opacity: G.own[k].m ? .35 : 1 } })))), h('b', null, q.out ? '—' : '$' + q.cash)))),
      h('div', { class: 'small', style: { color: '#fff', opacity: .8, textAlign: 'center' } }, `${al.length} players left · tap any space for details`)));
  }
  onLeave(() => { if (G) persist(); });
  G ? render() : setup();
  return bpage('opoly', RULES, body, {});
});
