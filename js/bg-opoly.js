// Seaopoly: Monopoly-style property trading, pass-and-play on one phone.
import { h, icon, S, save, route, seg, sheet, toast, shuffle, haptic, beep, confirmSheet, onLeave, go, sfx } from './core.js';
import { bg, bpage } from './boardgames.js';
import { tableView, act, boardDice, pawnSVG } from './bgtable.js';
import { howTo } from './howto.js';

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
const RENT = { 1: [2, 10, 30, 90, 160, 250], 3: [4, 20, 60, 180, 320, 450], 6: [6, 30, 90, 270, 400, 550], 8: [6, 30, 90, 270, 400, 550], 9: [8, 40, 100, 300, 450, 600],
  11: [10, 50, 150, 450, 625, 750], 13: [10, 50, 150, 450, 625, 750], 14: [12, 60, 180, 500, 700, 900], 16: [14, 70, 200, 550, 750, 950], 18: [14, 70, 200, 550, 750, 950], 19: [16, 80, 220, 600, 800, 1000],
  21: [18, 90, 250, 700, 875, 1050], 23: [18, 90, 250, 700, 875, 1050], 24: [20, 100, 300, 750, 925, 1100], 26: [22, 110, 330, 800, 975, 1150], 27: [22, 110, 330, 800, 975, 1150], 29: [24, 120, 360, 850, 1025, 1200],
  31: [26, 130, 390, 900, 1100, 1275], 32: [26, 130, 390, 900, 1100, 1275], 34: [28, 150, 450, 1000, 1200, 1400], 37: [35, 175, 500, 1100, 1300, 1500], 39: [50, 200, 600, 1400, 1700, 2000] };
SP.forEach((x, i) => { if (x.t === 'prop') { x.rent = RENT[i]; x.hc = HC(i); } });
const CABINS = 32, RESORTS = 12; // the bank's whole supply, as in the classic game
const CH = [['Advance to Embark. Collect $200.', { to: 0 }], ['Advance to Stingray City.', { to: 24 }], ['Advance to Private Island.', { to: 39 }], ['Sail to the nearest port. If it\'s owned, pay double rent.', { near: 'port' }], ['Sail to the nearest port. If it\'s owned, pay double rent.', { near: 'port' }], ['Go to the nearest ship service. If it\'s owned, roll the dice and pay 10 times the roll.', { near: 'util' }], ['The purser refunds you $50.', { cash: 50 }], ['Get out of the Brig free. Keep this card.', { goo: 1 }], ['Go back 3 spaces.', { back: 3 }], ['Caught in the crew-only area. Go to the Brig.', { jail: 1 }], ['Cabin repairs: pay $25 per cabin and $100 per resort.', { repair: [25, 100] }], ['Speeding on the go-karts. Pay $15.', { cash: -15 }], ['Take a trip to Miami Terminal.', { to: 5 }], ['You hosted the deck party. Pay each player $50.', { each: -50 }], ['Your shore excursion business pays off. Collect $150.', { cash: 150 }], ['Advance to Cozumel Reef.', { to: 11 }]];
const CC = [['Advance to Embark. Collect $200.', { to: 0 }], ['Casino jackpot! Collect $200.', { cash: 200 }], ['Spa bill. Pay $50.', { cash: -50 }], ['You sold your towel animals. Collect $50.', { cash: 50 }], ['Get out of the Brig free. Keep this card.', { goo: 1 }], ['Go directly to the Brig.', { jail: 1 }], ['Holiday fund matures. Collect $100.', { cash: 100 }], ['Life insurance matures. Collect $100.', { cash: 100 }], ['Port tax refund. Collect $20.', { cash: 20 }], ['It\'s your birthday at sea. Collect $10 from every player.', { each: 10 }], ['Ship doctor visit. Pay $100.', { cash: -100 }], ['Travel insurance. Pay $50.', { cash: -50 }], ['Passengers tipped you. Collect $25.', { cash: 25 }], ['Cabin makeover: pay $40 per cabin and $115 per resort.', { repair: [40, 115] }], ['Second place in karaoke. Collect $10.', { cash: 10 }], ['A long-lost aunt left you $100.', { cash: 100 }]];
const PCOL = ['#3D7BFF', '#FF5A3C', '#1FCB6E', '#FFC21A', '#8F63FF', '#FF4F8B'];
const RULES = 'Everyone starts with $1,500. Roll the 3D dice and sail around the board.\n\nLand on an unowned port, island or service: buy it at the printed price, or it goes to auction and anyone (you too) can bid from $1. Land on someone else\'s: pay rent. Own a whole color set and rent doubles on empty islands, and you can build cabins evenly (up to 4, then a resort). The bank has only 32 cabins and 12 resorts.\n\nDoubles = roll again. Three doubles in a row sends you to the Brig. Get out by rolling doubles, paying $50, or using a card.\n\nPassing Embark pays $200. Treasure Chest and Captain\'s Call cards do what they say.\n\nTrade anything with anyone on your turn. Short on cash? Sell cabins back for half, or mortgage for half the price (unmortgage costs that plus 10%). Getting a mortgaged property in a trade costs 10% right away. Can\'t pay = bankrupt: your things go to the player you owe, or to auction if you owe the bank. Last one standing wins.';

route(/^play\/board\/opoly$/, () => {
  const st = bg(); const body = h('div');
  let G = st.opoly; let busy = false; if (G?.phase === 'auction') G.phase = 'buy';
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
  const cabinsLeft = () => CABINS - Object.values(G.own).reduce((s, o) => s + (o.h < 5 ? o.h || 0 : 0), 0);
  const resortsLeft = () => RESORTS - Object.values(G.own).filter((o) => o.h === 5).length;
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
    for (const i of mine()) while (p.cash < need && houses(i) > 0) { if (houses(i) === 5 && cabinsLeft() < 4) { p.cash += SP[i].hc * 5 / 2; G.own[i].h = 0; log(`${p.n} sold the resort on ${SP[i].n}.`); break; } G.own[i].h--; p.cash += SP[i].hc / 2; log(`${p.n} sold a cabin on ${SP[i].n}.`); }
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
    for (const i of Object.keys(G.own)) if (G.own[i].o === pi) { if (to != null) { G.own[i].o = to; G.own[i].h = 0; } else { delete G.own[i]; (G.aq ||= []).push(+i); } }
    if (to != null) { G.P[to].cash += Math.max(0, p.cash); G.P[to].goo += p.goo; (G.P[to].gooK ||= []).push(...(p.gooK || [])); } else (p.gooK || []).forEach(([k, id]) => (k === 'ch' ? G.ch : G.cc).push(id));
    p.cash = 0; p.goo = 0; p.gooK = [];
  };
  const alive = () => G.P.filter((p) => !p.out);
  const toJail = (p) => { p.pos = 10; p.jail = 0; G.dbl = 0; log(`${p.n} goes to the Brig.`); sfx.bad(); };
  const walk = async (p, steps) => {
    const dir = Math.sign(steps);
    for (let k = 0; k < Math.abs(steps); k++) { p.pos = (p.pos + dir + 40) % 40; if (p.pos === 0 && dir > 0) { p.cash += 200; log(`${p.n} passed Embark: +$200.`); sfx.coins(); } drawBoard(); sfx.step(); await new Promise((r) => setTimeout(r, 110)); }
  };
  const goTo = async (p, to) => walk(p, ((to - p.pos) + 40) % 40 || 40);
  // resolve the square the current player landed on. returns 'buy' when a decision is needed
  const land = async (roll, mult = 1, ten = false) => {
    const p = cur(); const pi = G.turn; const x = SP[p.pos];
    if (x.t === 'gojail') { toJail(p); return; }
    if (x.t === 'tax') { log(`${p.n} paid ${x.n}: $${x.amt}.`); pay(pi, x.amt); return; }
    if (x.t === 'cc' || x.t === 'ch') return card(x.t, roll);
    if (x.p) {
      const o = G.own[p.pos];
      if (!o) return p.cash >= x.p ? 'buy' : (log(`${p.n} can't afford ${x.n}: it goes to auction.`), 'auction');
      if (o.o === pi) return;
      if (o.m) { log(`${x.n} is mortgaged: no rent.`); return; }
      let r = rentFor(p.pos, roll) * mult;
      if (ten && x.t === 'util') { const v = await D.roll(); G.last = v; r = (v[0] + v[1]) * 10; log(`${p.n} rolled ${v[0] + v[1]} for the service: 10 × the roll.`); }
      log(`${p.n} paid $${r} rent to ${G.P[o.o].n}.`); pay(pi, r, o.o);
    }
  };
  const card = async (kind, roll) => {
    const deck = kind === 'ch' ? G.ch : G.cc; const list = kind === 'ch' ? CH : CC;
    const id = deck.shift(); const [txt, a] = list[id]; if (!a.goo) deck.push(id);
    await new Promise((r) => { const close = sheet(kind === 'ch' ? 'Captain\'s Call' : 'Treasure Chest', h('div', { class: 'stack' }, h('div', { class: 'opcard ' + kind }, txt), h('button', { class: 'btn primary block', onclick: () => close() }, 'OK')), { onClose: r }); });
    const p = cur(), pi = G.turn; log(`${p.n}: ${txt}`);
    if (a.cash) { if (a.cash > 0) p.cash += a.cash; else pay(pi, -a.cash); }
    if (a.goo) { p.goo++; (p.gooK ||= []).push([kind, id]); }
    if (a.jail) return toJail(p);
    if (a.each) for (let j = 0; j < G.P.length; j++) if (j !== pi && !G.P[j].out) { if (a.each > 0) pay(j, a.each, pi); else pay(pi, -a.each, j); }
    if (a.repair) { const t = Object.entries(G.own).filter(([, o]) => o.o === pi).reduce((s, [, o]) => s + (o.h === 5 ? a.repair[1] : (o.h || 0) * a.repair[0]), 0); pay(pi, t); }
    if (a.to != null) { await goTo(p, a.to); return land(roll); }
    if (a.back) { await walk(p, -a.back); return land(roll); }
    if (a.near) { const ts = a.near === 'port' ? [5, 15, 25, 35] : [12, 28]; const to = ts.find((t) => t > p.pos) ?? ts[0]; await goTo(p, to); return land(roll, a.near === 'port' ? 2 : 1, a.near === 'util'); }
  };
  const nextTurn = () => { if (alive().length < 2) return; do G.turn = (G.turn + 1) % G.P.length; while (G.P[G.turn].out); G.dbl = 0; G.phase = 'roll'; log(`${cur().n}'s turn.`); persist(); render(); };
  const afterResolve = (rolledDouble) => {
    if (alive().length < 2) { G.phase = 'over'; persist(); return render(); }
    if (cur().out) { G.phase = 'end'; persist(); return render(); }
    G.phase = rolledDouble && cur().jail < 0 ? 'roll' : 'end'; persist(); render();
  };
  const doRoll = async () => {
    if (busy) return; if (!D) layout(); if (!D) return toast('One moment…'); busy = true; render();
    const v = await D.roll(); G.last = v; const p = cur(); const dbl = v[0] === v[1]; const sum = v[0] + v[1]; log(`${p.n} rolled ${sum}${dbl ? " (doubles)" : ""}.`);
    if (p.jail >= 0) {
      if (dbl) { p.jail = -1; log(`${p.n} rolled doubles and left the Brig.`); }
      else { p.jail++; if (p.jail >= 3) { log(`${p.n} paid $50 to leave the Brig.`); pay(G.turn, 50); p.jail = -1; } else { log(`${p.n} stays in the Brig.`); busy = false; return afterResolve(false); } }
      await walk(p, sum); const r = await land(sum); busy = false; if (r === 'buy') { G.phase = 'buy'; persist(); return render(); } if (r === 'auction') await auction(p.pos); return afterResolve(false);
    }
    if (dbl) { G.dbl++; if (G.dbl >= 3) { toJail(p); busy = false; return afterResolve(false); } }
    await walk(p, sum); const r = await land(sum); busy = false;
    if (r === 'buy') { G.phase = 'buy'; G.again = dbl; persist(); return render(); }
    if (r === 'auction') await auction(p.pos);
    afterResolve(dbl && cur().jail < 0);
  };
  const buy = () => { if (G.phase !== 'buy') return; const p = cur(); const x = SP[p.pos]; p.cash -= x.p; G.own[p.pos] = { o: G.turn, h: 0, m: false }; log(`${p.n} bought ${x.n} for $${x.p}.`); sfx.coins(); haptic(20); afterResolve(G.again && p.jail < 0); };
  const passBuy = async () => { if (G.phase !== 'buy') return; log(`${cur().n} didn't buy ${SP[cur().pos].n}: auction.`); G.phase = 'auction'; render(); await auction(cur().pos); afterResolve(G.again && cur().jail < 0); };
  // open auction around the table: anyone still in can raise; the last high bid wins when you tap Sold
  const auction = (i) => new Promise((res) => {
    const x = SP[i]; let bid = 0, lead = null, fin = false; const outS = new Set(); const box = h('div', { class: 'stack' });
    const bidders = G.P.map((_, k) => k).filter((k) => !G.P[k].out);
    const finish = () => { if (fin) return; fin = true;
      if (lead != null) { G.P[lead].cash -= bid; G.own[i] = { o: lead, h: 0, m: false }; log(`${G.P[lead].n} won ${x.n} at auction for $${bid}.`); sfx.coins(); haptic(20); } else log(`No one bid on ${x.n}. It stays with the bank.`);
      persist(); res(); };
    const draw = () => box.replaceChildren(
      h('p', { class: 'small muted', style: { margin: 0 } }, `Printed price $${x.p}. Everyone can bid, including whoever passed. Bids start at $1.`),
      h('div', { class: 'op-bid' }, h('span', null, lead == null ? 'No bids yet' : 'High bid: ' + G.P[lead].n), h('b', null, '$' + bid)),
      h('div', { class: 'group' }, bidders.map((k) => { const q = G.P[k], o = outS.has(k);
        return h('div', { class: 'rowi op-bidder' + (k === lead ? ' on' : '') + (o ? ' out' : '') }, h('i', { class: 'opdot', style: { background: q.c } }), h('div', { class: 't' }, h('b', null, q.n), h('span', null, o ? 'Out' : '$' + q.cash)),
          o ? null : [1, 10, 50].map((inc) => h('button', { class: 'btn sm', disabled: bid + inc > q.cash, 'aria-label': `${q.n} bids $${bid + inc}`, onclick: () => { bid += inc; lead = k; beep(520 + inc * 6, .05); draw(); } }, '+' + inc)),
          o || k === lead ? null : h('button', { class: 'btn sm ghost', 'aria-label': q.n + ' drops out', onclick: () => { outS.add(k); draw(); } }, 'Out')); })),
      h('button', { class: 'btn primary block', onclick: () => close() }, lead == null ? 'No one wants it' : `Sold to ${G.P[lead].n} for $${bid}`));
    draw(); const close = sheet('Auction: ' + x.n, box, { onClose: finish });
  });
  let auctioning = false;
  const runAuctions = async () => { auctioning = true; while (G.aq?.length && G.phase !== 'over') { const i = G.aq.shift(); persist(); await auction(i); } auctioning = false; render(); };
  // ---------- sheets ----------
  const info = (i) => { const x = SP[i], o = G.own[i];
    const rows = x.t === 'prop' ? [['Rent', '$' + x.rent[0]], ['With full set', '$' + x.rent[0] * 2], ...[1, 2, 3, 4].map((k) => [k + ' cabin' + (k > 1 ? 's' : ''), '$' + x.rent[k]]), ['Resort', '$' + x.rent[5]], ['Cabin cost', '$' + x.hc]] : x.t === 'port' ? [['1 port', '$25'], ['2 ports', '$50'], ['3 ports', '$100'], ['4 ports', '$200']] : x.t === 'util' ? [['1 service', '4 × dice'], ['Both', '10 × dice']] : [];
    sheet(x.n, h('div', { class: 'stack' }, h('div', { class: 'opdeed', style: { '--g': GC[x.g] || '#14130F' } }, h('b', null, x.n), x.p ? h('span', null, 'Price $' + x.p + ' · mortgage $' + x.p / 2) : h('span', null, { go: 'Collect $200 every time you pass.', jail: 'Just visiting, unless you were sent here.', free: 'Relax. Nothing happens here.', gojail: 'Go straight to the Brig. Do not pass Embark.', tax: 'Pay $' + x.amt + '.', cc: 'Draw a Treasure Chest card.', ch: 'Draw a Captain\'s Call card.' }[x.t])),
      rows.length ? h('div', { class: 'group' }, rows.map(([a, b]) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', { style: { fontWeight: 600 } }, a)), h('b', null, b)))) : null,
      o ? h('p', { class: 'muted center', style: { margin: 0 } }, 'Owned by ' + G.P[o.o].n + (o.m ? ' (mortgaged)' : '') + (o.h ? ` · ${o.h === 5 ? 'resort' : o.h + ' cabins'}` : '')) : null)); };
  const buildSheet = () => { const pi = G.turn; const p = cur(); const box = h('div', { class: 'stack' });
    const draw = () => { const sets = Object.keys(GC).filter((g) => hasSet(pi, g) && !inGroup(g).some((i) => G.own[i].m)); const cl = cabinsLeft(), rl = resortsLeft();
      box.replaceChildren(...(sets.length ? [h('p', { class: 'small muted', style: { margin: 0 } }, `Cash $${p.cash}. Build evenly: each island in a set needs a cabin before any gets a second. The bank has ${cl} cabin${cl === 1 ? '' : 's'} and ${rl} resort${rl === 1 ? '' : 's'} left.`), ...sets.map((g) => h('div', { class: 'group' }, inGroup(g).map((i) => { const hs = houses(i), grp = inGroup(g).map(houses);
        return h('div', { class: 'rowi' }, h('i', { style: { width: 10, alignSelf: 'stretch', borderRadius: 4, background: GC[g] } }), h('div', { class: 't' }, h('b', null, SP[i].n), h('span', null, hs === 5 ? 'Resort' : hs + ' cabins · $' + SP[i].hc + ' each')),
          h('button', { class: 'btn sm', disabled: hs === 0 || hs < Math.max(...grp) || (hs === 5 && cl < 4), onclick: () => { G.own[i].h--; p.cash += SP[i].hc / 2; log(`${p.n} sold a cabin on ${SP[i].n}.`); persist(); draw(); render(); } }, '−'),
          h('button', { class: 'btn sm primary', disabled: hs === 5 || hs > Math.min(...grp) || p.cash < SP[i].hc || (hs < 4 ? cl < 1 : rl < 1), onclick: () => { G.own[i].h++; p.cash -= SP[i].hc; beep(700, .06); log(`${p.n} built on ${SP[i].n}.`); persist(); draw(); render(); } }, '+')); })))] : [h('div', { class: 'empty' }, 'Own every island in a color set (none mortgaged) to build cabins.')])); };
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
        close(); const mf = [...give, ...get].filter((i) => G.own[i].m); const desc = (mf.length ? 'Mortgaged property costs 10% interest for whoever receives it. ' : '') + `${G.P[pi].n} gives ${[...[...give].map((i) => SP[i].n), a ? '$' + a : ''].filter(Boolean).join(', ') || 'nothing'}.\n${G.P[pj].n} gives ${[...[...get].map((i) => SP[i].n), b ? '$' + b : ''].filter(Boolean).join(', ') || 'nothing'}.`;
        if (!await confirmSheet(`Pass to ${G.P[pj].n}: accept?`, desc, 'Accept trade', false)) return toast('Trade declined');
        give.forEach((i) => G.own[i].o = pj); get.forEach((i) => G.own[i].o = pi); G.P[pi].cash += b - a; G.P[pj].cash += a - b; log(`Trade: ${G.P[pi].n} ⇄ ${G.P[pj].n}.`);
        const fee = (set, who) => [...set].filter((i) => G.own[i].m).forEach((i) => { const f = Math.ceil(SP[i].p / 20); log(`${G.P[who].n} paid $${f} interest on mortgaged ${SP[i].n}.`); pay(who, f); });
        fee(give, pj); fee(get, pi); beep(880, .1); persist(); render(); } }, 'Propose trade'));
    draw(); const close = sheet('Trade', box); };
  const endGame = async () => { if (!await confirmSheet('End the game?', 'Richest player (cash + property) wins.', 'End game', false)) return; G.phase = 'over'; persist(); render(); };
  // ---------- view: the whole phone is the board ----------
  const GLY = {
    cc: '<svg class="gl" viewBox="0 0 24 24" fill="none" stroke="#191712" stroke-width="2" stroke-linejoin="round"><path d="M3 10h18v10H3z"/><path d="M3 10c0-4 3-6 9-6s9 2 9 6"/><path d="M10 12h4v3h-4z" fill="#F2B705"/></svg>',
    ch: '<svg class="gl" viewBox="0 0 24 24" fill="none" stroke="#D7322A" stroke-width="2.6" stroke-linecap="round"><path d="M8.5 8.5a3.5 3.5 0 1 1 5 3.2c-1 .5-1.5 1.3-1.5 2.3v1"/><circle cx="12" cy="19" r=".6" fill="#D7322A"/></svg>',
    port: '<svg class="gl" viewBox="0 0 24 24" fill="none" stroke="#191712" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v13M7 11h10M4 14c0 4 4 6 8 6s8-2 8-6"/></svg>',
    wifi: '<svg class="gl" viewBox="0 0 24 24" fill="none" stroke="#191712" stroke-width="2.2" stroke-linecap="round"><path d="M3 9a13 13 0 0 1 18 0M6 12.5a8.5 8.5 0 0 1 12 0M9 16a4 4 0 0 1 6 0"/><circle cx="12" cy="19" r="1" fill="#191712"/></svg>',
    shirt: '<svg class="gl" viewBox="0 0 24 24" fill="none" stroke="#191712" stroke-width="2" stroke-linejoin="round"><path d="M8 3l4 2 4-2 5 4-3 3-2-1v12H8V9l-2 1-3-3z"/></svg>',
    tax: '<svg class="gl" viewBox="0 0 24 24" fill="none" stroke="#191712" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
  };
  const CORNER = {
    go: '<svg viewBox="0 0 24 24" fill="none" stroke="#D7322A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>Embark<small>Collect $200</small>',
    jail: '<svg viewBox="0 0 24 24" fill="none" stroke="#191712" stroke-width="2.2"><rect x="4" y="4" width="16" height="16" rx="2" fill="#F2B705"/><path d="M9 4v16M15 4v16"/></svg>The Brig',
    free: '<svg viewBox="0 0 24 24" fill="none" stroke="#191712" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4" fill="#F2B705"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg>Sun Deck',
    gojail: '<svg viewBox="0 0 24 24" fill="none" stroke="#191712" stroke-width="2.2" stroke-linecap="round"><path d="M12 3a4 4 0 0 1 4 4v3H8V7a4 4 0 0 1 4-4z"/><rect x="5" y="10" width="14" height="11" rx="2" fill="#7FD0F0"/></svg>To the Brig',
  };
  // where pawns sit when several share a space
  const OFF = [[], [[0, 0]], [[-5, -4], [5, 4]], [[-6, -5], [6, -5], [0, 6]], [[-6, -6], [6, -6], [-6, 6], [6, 6]], [[-7, -7], [7, -7], [0, 0], [-7, 7], [7, 7]], [[-7, -8], [7, -8], [-7, 0], [7, 0], [-7, 8], [7, 8]]];
  let D, TV, geo, spacesEl, pawnEls = [];
  const tilt = () => (TV?.look === 'print' ? 0 : 24);
  const sideOf = (i) => i < 10 ? 'bot' : i < 20 ? 'lft' : i < 30 ? 'top' : 'rgt';
  const place = (i) => { const { BW, bh, C, sw, sh } = geo;
    if (i === 0) return [BW - C, bh - C, C, C]; if (i < 10) return [BW - C - i * sw, bh - C, sw, C]; if (i === 10) return [0, bh - C, C, C];
    if (i < 20) return [0, bh - C - (i - 10) * sh, C, sh]; if (i === 20) return [0, 0, C, C]; if (i < 30) return [C + (i - 21) * sw, 0, sw, C];
    if (i === 30) return [BW - C, 0, C, C]; return [BW - C, C + (i - 31) * sh, C, sh]; };
  const layout = () => {
    if (!TV || (busy && D)) return; const W0 = TV.stage.clientWidth, H0 = TV.stage.clientHeight; if (!W0 || H0 < 100) return;
    if (geo && geo.W0 === W0 && geo.H0 === H0 && geo.look === TV.look) return;
    const BW = Math.min(W0 - 22, 560), C = Math.round(Math.max(56, Math.min(70, BW * .18))); let bh = H0 - 16;
    // a tilted board looks shorter: grow it until its on-screen height fills the space under the turn buttons
    for (let pass = 0; pass < 4; pass++) { build(W0, H0, BW, bh, C); if (!tilt()) break; const got = TV.stage.firstChild.getBoundingClientRect().height; if (Math.abs(got - (H0 - 12)) < 3) break; bh = bh * (H0 - 12) / got; }
  };
  const build = (W0, H0, BW, bh, C) => {
    geo = { W0, H0, look: TV.look, BW, bh, C, sw: (BW - 2 * C) / 9, sh: (bh - 2 * C) / 9 };
    const plane = h('div', { class: 'tv-plane', style: { left: (W0 - BW) / 2 + 'px', bottom: '6px', width: BW + 'px', height: bh + 'px', transform: `rotateX(${tilt()}deg)` } });
    spacesEl = h('div');
    const centre = h('div', { class: 'op-centre', style: { left: C + 'px', top: C + 'px', width: BW - 2 * C + 'px', height: bh - 2 * C + 'px' } }, h('div', { class: 'op-logo' }, 'SEAOPOLY'),
      h('div', { class: 'op-pile', style: { left: '18px', top: '52px', background: '#FFB547' }, html: 'Captain\'s<br>Call' }), h('div', { class: 'op-pile', style: { right: '18px', bottom: '64px', background: '#7FD0F0' }, html: 'Treasure<br>Chest' }));
    plane.append(h('div', { class: 'op-board' }, centre, spacesEl));
    if (tilt()) plane.append(h('div', { class: 'op-edge' }));
    D = boardDice(2, 34, G.last); Object.assign(D.el.style, { left: BW / 2 - 44 + 'px', top: bh * .58 + 'px' }); plane.append(D.el);
    pawnEls = G.P.map((p) => { const sh = h('div', { class: 'tv-sh', style: { width: '18px', height: '8px' } }), up = h('div', { class: 'tv-up', html: pawnSVG(p.c), style: { width: '22px', height: '34px' } }); plane.append(sh, up); return { sh, up }; });
    TV.stage.replaceChildren(plane); drawBoard();
  };
  function drawBoard() {
    if (!G || !geo || !spacesEl) return;
    spacesEl.replaceChildren(...SP.map((x, i) => { const [l, t, w, hh] = place(i); const o = G.own[i]; const box = { left: l + 'px', top: t + 'px', width: w + 'px', height: hh + 'px' };
      if (i % 10 === 0) return h('button', { class: 'op-corner', style: box, html: CORNER[x.t], onclick: () => info(i), 'aria-label': x.n });
      const side = sideOf(i); const s = h('button', { class: 'op-sp ' + side + (o?.m ? ' mort' : ''), style: box, onclick: () => info(i), 'aria-label': x.n + (o ? ', owned by ' + G.P[o.o].n : '') });
      if (x.g) { const bar = h('div', { class: 'op-bar', style: { background: GC[x.g] } }); const n = o?.h || 0; const vert = side === 'bot' || side === 'top';
        if (n === 5) bar.append(h('div', { class: 'op-resort', style: { left: '50%', top: '50%', marginLeft: '-8px', marginTop: '-4px', transform: vert ? '' : 'rotate(90deg)' } }));
        else for (let k = 0; k < n; k++) { const off = (k - (n - 1) / 2) * (vert ? Math.min(11, w / 4.2) : Math.min(11, hh / 4.2)); bar.append(h('div', { class: 'op-cabin', style: vert ? { left: `calc(50% + ${off - 5}px)`, top: 'calc(50% - 4px)' } : { top: `calc(50% + ${off - 4}px)`, left: 'calc(50% - 5px)' } })); }
        s.append(bar); }
      const name = x.s.replace('-', ''); const glyph = x.g ? '' : x.t === 'util' ? (i === 12 ? GLY.wifi : GLY.shirt) : GLY[x.t] || '';
      const price = x.p ? '$' + x.p : x.amt ? '$' + x.amt : '';
      s.append(h('div', { class: 'lab', html: `<div class="nm">${name}</div>${glyph}<div class="pr">${price}</div>` }));
      if (o) s.append(h('i', { class: 'own', style: { background: G.P[o.o].c } }));
      return s; }));
    const T = tilt();
    G.P.forEach((p, k) => { const el = pawnEls[k]; if (!el) return; el.up.hidden = el.sh.hidden = p.out; if (p.out) return;
      const here = G.P.filter((q) => !q.out && q.pos === p.pos); const [dx, dy] = OFF[Math.min(6, here.length)][here.indexOf(p)] || [0, 0];
      const [l, t, w, hh] = place(p.pos); const px = l + w / 2 + dx, py = t + hh / 2 + dy + (T ? 4 : 0);
      Object.assign(el.sh.style, { left: px - 9 + 'px', top: py - 4 + 'px' });
      Object.assign(el.up.style, { left: px - 11 + 'px', top: py - 33 + 'px', transform: `rotateX(${-T}deg) scale(.82)`, filter: k === G.turn ? 'drop-shadow(0 0 3px #FFD21A) drop-shadow(0 0 2px #FFD21A)' : '', zIndex: String(Math.round(py)) }); });
  }
  const playersSheet = () => sheet('Players', h('div', { class: 'group' }, G.P.map((q, i) => h('div', { class: 'rowi' + (i === G.turn ? ' on' : '') }, h('i', { class: 'opdot', style: { background: q.c } }), h('div', { class: 't' }, h('b', null, q.n + (q.jail >= 0 ? ' (in the Brig)' : '')), h('span', { class: 'opprops' }, q.out ? 'Bankrupt' : Object.keys(G.own).filter((k) => G.own[k].o === i).map((k) => h('i', { style: { background: GC[SP[k].g] || '#14130F', opacity: G.own[k].m ? .35 : 1 } })))), h('b', null, q.out ? '—' : '$' + q.cash)))));
  const logSheet = () => sheet('Game log', h('div', { class: 'stack', style: { gap: 6 } }, [...G.log].reverse().map((m) => h('div', { class: 'small' }, m))));
  const guard = (fn) => () => (busy ? toast('Wait for the dice') : fn());
  const openTV = () => {
    if (TV) return;
    TV = tableView({ bg: (l) => l === 'print' ? 'paper' : 'teak', look: st.opLook || 'table', onLook: (l) => { st.opLook = l; save(); geo = null; layout(); },
      menu: () => [['Build cabins', 'plus', guard(buildSheet), 'Own a full color set first'], ['Trade', 'flip', guard(tradeSheet)], ['Mortgage', 'wallet', guard(mortSheet)], ['Players and deeds', 'users', playersSheet], ['Game log', 'list', logSheet],
        ['How to play', 'book', () => howTo('opoly', { title: 'Seaopoly', rules: RULES, color: '#1FCB6E' })], ['End game', 'flag', guard(endGame), 'Richest player wins'], ['Leave table', 'x', () => go('play/board'), 'Your game is saved']] });
    TV.onResize = layout; layout(); if (!geo) requestAnimationFrame(layout);
  };
  const closeTV = () => { TV?.close(); TV = null; geo = null; D = null; };
  function render() {
    if (!G) { closeTV(); return setup(); }
    if (G.phase === 'over') { closeTV(); const rank = G.P.map((q, i) => [q, worth(i)]).sort((a, b) => b[1] - a[1]);
      body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal', style: { background: rank[0][0].c, minHeight: 'auto', padding: 28 } }, h('div', { class: 'k', style: { color: 'rgba(255,255,255,.8)' } }, 'Winner'), h('div', { class: 'w' }, rank[0][0].n)),
        h('div', { class: 'group' }, rank.map(([q, w], k) => h('div', { class: 'rowi' }, h('b', { style: { width: 22 } }, k + 1), h('div', { class: 't' }, h('b', null, q.n), h('span', null, q.out ? 'Bankrupt' : 'Net worth $' + w))))),
        h('button', { class: 'btn accent block', onclick: () => { G = null; st.opoly = null; save(); setup(); } }, 'New game'))); return; }
    body.replaceChildren(h('p', { class: 'muted center' }, 'Game in progress.'), h('button', { class: 'btn accent block', onclick: () => { closeTV(); render(); } }, 'Back to the table'));
    openTV();
    const p = cur(), x = SP[p.pos];
    TV.players(G.P.map((q) => ({ n: q.n, c: q.c, v: q.out ? 'Out' : '$' + q.cash, out: q.out })), G.turn);
    const canBuild = Object.keys(GC).some((g) => hasSet(G.turn, g) && !inGroup(g).some((i) => G.own[i].m));
    TV.acts(busy ? [act('Rolling…', null, { go: 1, dis: 1 })] : G.phase === 'auction' ? [act('Auction running', null, { on: 1, dis: 1 })]
      : G.phase === 'buy' ? [act('Buy ' + x.s.replace('-', ''), buy, { go: 1, sub: '$' + x.p }), act('Auction', passBuy, { sub: 'Don’t buy' })]
      : G.phase === 'roll' ? (p.jail >= 0 ? [act('Roll for doubles', doRoll, { go: 1 }), act('Pay $50', () => { pay(G.turn, 50); p.jail = -1; log(`${p.n} paid $50 to leave the Brig.`); persist(); render(); }, { dis: p.cash < 50 }), p.goo ? act('Use card', () => { p.goo--; const k = p.gooK?.pop(); if (k) (k[0] === 'ch' ? G.ch : G.cc).push(k[1]); p.jail = -1; log(`${p.n} used a Get Out card.`); persist(); render(); }) : null]
        : [act(G.dbl ? 'Roll again' : 'Roll dice', doRoll, { go: 1, sub: p.n + '’s turn' })])
      : [act('End turn', nextTurn, { go: 1 }), canBuild ? act('Build', buildSheet) : null, act('Trade', tradeSheet)]);
    TV.tip(G.log.at(-1));
    layout(); drawBoard();
    if (G.aq?.length && !busy && !auctioning) runAuctions();
  }
  onLeave(() => { if (G) persist(); closeTV(); });
  G ? render() : setup();
  return bpage('opoly', RULES, body, {});
});
