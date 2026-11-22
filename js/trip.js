import { h, icon, S, save, route, page, row, group, ftile, sec, seg, sheet, toast, go, uid, fmtTime, haptic, beep, keepAwake, onLeave, promptSheet, confirmSheet, todayKey, sfx } from './core.js';

const PORTS = ['Sea day', 'Miami, Florida', 'Nassau, Bahamas', 'Perfect Day at CocoCay', 'San Juan, Puerto Rico', 'Philipsburg, St. Maarten', 'Charlotte Amalie, St. Thomas', 'Basseterre, St. Kitts', 'Labadee, Haiti', 'Falmouth, Jamaica', 'Cozumel, Mexico', 'Costa Maya, Mexico', 'Roatán, Honduras', 'George Town, Grand Cayman', 'Puerto Plata, Dominican Rep.', 'Samaná, Dominican Rep.', 'Ponce, Puerto Rico'];
const PACK = { Essentials: ['Passport / ID', 'Boarding docs (printed)', 'Phone + charger', 'Wallet + some cash ($1s for tips)', 'Medications', 'Headphones'], Clothes: ['Swimsuits (2)', 'Shorts', 'T-shirts', 'Nice outfit for dinner', 'Light jacket / hoodie (AC is cold)', 'Sleepwear', 'Underwear & socks', 'Sandals / flip-flops', 'Sneakers'], 'Sun & beach': ['Sunscreen (reef-safe)', 'Sunglasses', 'Hat', 'Water bottle', 'Waterproof phone pouch', 'Aloe'], 'Study & fun': ['Spanish homework', 'English homework', 'Pens / notebook', 'Downloaded music', 'Open Starboard once on Wi-Fi'], Health: ['Motion sickness meds / bands', 'Toothbrush & toothpaste', 'Deodorant', 'Hand sanitizer', 'Band-aids'] };

export function ensureTrip() {
  if (S.trip) return;
  const days = Array.from({ length: 8 }, (_, i) => ({ port: i === 0 || i === 7 ? 'Miami, Florida' : '', arrive: '', aboard: '', notes: '' }));
  days[0].aboard = '16:00'; days[0].notes = 'Embarkation — muster drill, explore the ship.'; days[7].notes = 'Disembark in the morning.';
  S.trip = { ship: 'Allure of the Seas', start: '2026-11-23', days, packing: Object.fromEntries(Object.entries(PACK).map(([k, v]) => [k, v.map((t) => ({ t, d: 0 }))])), info: {}, rates: { 'EC dollar (XCD)': 2.70, 'Mexican peso (MXN)': 18.5, 'Jamaican dollar (JMD)': 157, 'Dominican peso (DOP)': 61, 'Bahamian dollar (BSD)': 1, 'Euro (EUR)': 0.92 }, ship_offset: 0 };
  save();
}
const startDate = () => { const [y, m, d] = S.trip.start.split('-').map(Number); return new Date(y, m - 1, d); };
const dayDate = (i) => { const d = startDate(); d.setDate(d.getDate() + i); return d; };
const at = (i, hm) => { const d = dayDate(i); const [hh, mm] = hm.split(':').map(Number); d.setHours(hh, mm, 0, 0); return d; };
const dur = (ms) => { const m = Math.max(0, Math.round(ms / 6e4)); const d = Math.floor(m / 1440), hh = Math.floor(m % 1440 / 60), mm = m % 60; return d ? `${d}d ${hh}h` : hh ? `${hh}h ${mm}m` : `${mm}m`; };
const fmtHM = (hm) => { if (!hm) return ''; const [hh, mm] = hm.split(':').map(Number); return `${(hh % 12) || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`; };
const portName = (p) => p || 'Tap to set port';
export function tripInfo() {
  const now = new Date(), T = S.trip, idx = Math.floor((now - startDate()) / 864e5);
  if (idx < 0) { const sail = at(0, T.days[0].aboard || '16:00'); return { kicker: T.ship + ' · Miami', big: 'Sails in ' + dur(sail - now), sub: dayDate(0).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' – ' + dayDate(7).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + T.days.length + ' days', ticking: true }; }
  if (idx >= T.days.length) return { kicker: 'Trip complete', big: 'Welcome home', sub: 'Read back through your journal.' };
  const d = T.days[idx]; const aboard = d.aboard ? at(idx, d.aboard) : null;
  return { kicker: `Day ${idx + 1} of ${T.days.length}`, big: d.port ? d.port.split(',')[0] : 'Sea day', sub: aboard && aboard > now ? `All aboard ${fmtHM(d.aboard)} · ${dur(aboard - now)} left` : d.notes || 'Tap to plan the day', ticking: !!aboard };
}

route(/^trip$/, () => {
  const T = S.trip; const ti = tripInfo(); const today = Math.floor((new Date() - startDate()) / 864e5);
  const hero = h('div', { class: 'hero' }, h('div', { class: 'k' }, ti.kicker), h('div', { class: 'big' }, ti.big), h('div', { class: 'sub' }, ti.sub));
  if (ti.ticking) { const iv = setInterval(() => { if (!hero.isConnected) return clearInterval(iv); const t = tripInfo(); hero.children[1].textContent = t.big; hero.children[2].textContent = t.sub; }, 15000); }
  return page({ title: 'Trip', sub: T.ship, right: h('a', { class: 'iconbtn', href: '#/trip/info', 'aria-label': 'Ship info' }, icon('anchor')) },
    hero, h('div', { class: 'gap16' }),
    h('div', { class: 'row2' }, ftile({ icon: 'pen', tone: 'c', title: 'Journal', sub: 'A line a day', href: '#/trip/journal' }), ftile({ icon: 'bag', tone: 'g', title: 'Packing', sub: packLeft() + ' left to pack', href: '#/trip/packing' }), ftile({ icon: 'calc', tone: 'n', title: 'Tools', sub: 'Money · split · meet-up', href: '#/trip/tools' }), ftile({ icon: 'anchor', title: 'Ship info', sub: 'Cabin, muster, meet spots', href: '#/trip/info' })),
    sec('Itinerary', h('button', { onclick: setStart }, 'Edit dates')),
    h('div', { class: 'group' }, T.days.map((d, i) => h('a', { class: 'rowi', href: '#/trip/day/' + i, style: i === today ? { background: '#FFF6D6' } : null },
      h('div', { class: 'day' }, h('div', { class: 'dn' }, h('span', null, dayDate(i).toLocaleDateString(undefined, { weekday: 'short' })), h('b', null, dayDate(i).getDate()))),
      h('div', { class: 't' }, h('b', { class: d.port ? '' : 'dim' }, portName(d.port)), h('span', null, [d.arrive && 'Arrive ' + fmtHM(d.arrive), d.aboard && (i === 0 ? 'Sail away ' : 'All aboard ') + fmtHM(d.aboard)].filter(Boolean).join(' · ') || d.notes || (i === today ? 'Today' : ''))), icon('chev', 'chev')))),
    h('p', { class: 'small dim', style: { margin: '10px 6px' } }, 'Ports weren\'t online for your exact sailing. Copy them from your booking or the Royal app before you lose signal. Each day takes one tap.'),
  );
});
const packLeft = () => Object.values(S.trip.packing).flat().filter((x) => !x.d).length;
async function setStart() { const v = await promptSheet('First day (YYYY-MM-DD)', { value: S.trip.start }); if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) { S.trip.start = v; save(); dispatchEvent(new HashChangeEvent('hashchange')); } else if (v) toast('Use the format 2026-11-23'); }

route(/^trip\/day\/(\d+)$/, (n) => {
  const i = +n, d = S.trip.days[i];
  const portBtn = h('button', { class: 'rowi', onclick: () => { const close = sheet('Port', h('div', { class: 'group plain' }, [...PORTS, 'Other…'].map((p) => h('button', { class: 'rowi', onclick: async () => { close(); if (p === 'Other…') { const v = await promptSheet('Port name'); if (v) d.port = v; } else d.port = p === 'Sea day' ? 'Sea day' : p; save(); dispatchEvent(new HashChangeEvent('hashchange')); } }, h('div', { class: 't' }, h('b', { style: { fontWeight: 500 } }, p)), d.port === p ? icon('check') : null)))); } }, h('div', { class: 'tile c' }, icon('pin')), h('div', { class: 't' }, h('b', null, 'Port'), h('span', null, portName(d.port))), icon('chev', 'chev'));
  const time = (k, label) => h('label', { class: 'rowi' }, h('div', { class: 'tile' }, icon('clock')), h('div', { class: 't' }, h('b', null, label)), h('input', { type: 'time', value: d[k], style: { width: 'auto', border: 0, background: 'none', textAlign: 'right' }, onchange: (e) => { d[k] = e.target.value; save(); } }));
  const notes = h('textarea', { placeholder: 'Plans, excursion meeting time, restaurant, show…', oninput: (e) => { d.notes = e.target.value; save(); } }, d.notes);
  return page({ title: `Day ${i + 1}`, sub: dayDate(i).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }), back: 'trip' },
    group(portBtn, time('arrive', 'Arrive'), time('aboard', i === 0 ? 'Sail away' : 'All aboard')), sec('Plans'), notes,
    h('p', { class: 'small dim', style: { margin: '10px 6px' } }, 'All-aboard is usually 30 min before departure. The countdown shows on Today and Trip.'));
});

route(/^trip\/packing$/, () => {
  const P = S.trip.packing; const body = h('div');
  const draw = () => body.replaceChildren(...Object.entries(P).flatMap(([cat, items]) => [sec(`${cat} · ${items.filter((x) => x.d).length}/${items.length}`, h('button', { onclick: async () => { const t = await promptSheet('Add to ' + cat); if (t) { items.push({ t, d: 0 }); save(); draw(); } } }, '+ Add')),
    h('div', { class: 'group plain' }, items.map((x) => h('button', { class: 'rowi', onclick: () => { x.d ^= 1; haptic(5); save(); draw(); }, oncontextmenu: async (e) => { e.preventDefault(); if (await confirmSheet('Remove item?', x.t, 'Remove')) { items.splice(items.indexOf(x), 1); save(); draw(); } } }, h('div', { class: 'check' + (x.d ? ' on' : '') }, x.d ? icon('check') : null), h('div', { class: 't' }, h('b', { class: x.d ? 'done-t' : '', style: { fontWeight: 500 } }, x.t)))))]));
  draw();
  return page({ title: 'Packing', sub: 'Tap to check off. Long-press to remove.', back: 'trip', right: h('button', { class: 'btn ghost sm', onclick: async () => { if (await confirmSheet('Uncheck everything?', 'Use this when packing to go home.', 'Uncheck', false)) { Object.values(P).flat().forEach((x) => x.d = 0); save(); draw(); } } }, 'Reset') }, body);
});

route(/^trip\/journal$/, () => {
  const k = todayKey(); const J = S.journal; const e = (J[k] ||= { text: '', high: '', mood: 0 });
  const moods = ['Rough', 'Meh', 'Good', 'Great', 'Best'];
  const md = h('div', { class: 'flex', style: { justifyContent: 'space-between' } });
  const drawM = () => md.replaceChildren(seg(moods.map((m, i) => [i + 1, m]), e.mood, (v) => { e.mood = v; save(); }));
  drawM();
  const past = Object.entries(J).filter(([d, v]) => d !== k && (v.text || v.high)).sort((a, b) => b[0].localeCompare(a[0]));
  const prompts = ['Best moment today?', 'What surprised you?', 'Something funny someone said', 'What did you eat that was great?', 'One thing you learned', 'Who did you meet?'];
  return page({ title: 'Journal', sub: new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }), back: 'trip' },
    h('div', { class: 'card stack' }, h('b', null, 'How was today?'), md,
      h('input', { placeholder: 'Highlight in one line', value: e.high, oninput: (ev) => { e.high = ev.target.value; save(); } }),
      h('textarea', { placeholder: prompts[new Date().getDate() % prompts.length], oninput: (ev) => { e.text = ev.target.value; save(); } }, e.text),
      h('p', { class: 'small dim', style: { margin: 0 } }, 'Saves as you type.')),
    past.length ? [sec('Earlier'), group(...past.map(([d, v]) => row({ title: (v.mood ? moods[v.mood - 1] + ' · ' : '') + new Date(d + 'T12:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), sub: v.high || v.text, chev: false, onclick: () => sheet(new Date(d + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }), h('div', null, v.high ? h('b', null, v.high) : null, h('p', { class: 'muted', style: { whiteSpace: 'pre-wrap' } }, v.text))) })))] : null);
});

route(/^trip\/info$/, () => {
  const I = S.trip.info;
  const F = [['cabin', 'Cabin number'], ['deck', 'Deck'], ['muster', 'Muster station'], ['dining', 'Dining time & table'], ['meet', 'Family meeting spot'], ['others', 'Friends & family cabins'], ['wifi', 'Notes (excursions, shows, reservations)']];
  return page({ title: 'Ship info', sub: S.trip.ship + '. Write things down so you don\'t need signal.', back: 'trip' },
    h('div', { class: 'stack' }, F.map(([k, l]) => h('label', { class: 'stack', style: { gap: 6 } }, h('span', { class: 'small muted', style: { fontWeight: 600, margin: '0 4px' } }, l), (k === 'others' || k === 'wifi' ? h('textarea', { style: { minHeight: '90px' }, oninput: (e) => { I[k] = e.target.value; save(); } }, I[k] || '') : h('input', { value: I[k] || '', oninput: (e) => { I[k] = e.target.value; save(); } }))))),
    sec('Good to know'),
    h('div', { class: 'card small muted stack', style: { gap: 8 } }, h('div', null, h('b', null, 'Ship time: '), 'usually stays on Miami time all week. Check the daily planner in the Royal app or on your cabin TV.'), h('div', null, h('b', null, 'Airplane mode: '), 'turn it on before leaving port. Roaming at sea can be very expensive.'), h('div', null, h('b', null, 'Battery: '), 'this app works offline. Lower brightness and turn on battery saver on port days.')));
});

// ---------- Tools ----------
route(/^trip\/tools$/, () => page({ title: 'Tools', back: 'trip' }, group(
  row({ icon: 'wallet', tone: 'n', title: 'Currency', sub: 'Convert with rates you set', href: '#/trip/tools/currency' }),
  row({ icon: 'calc', tone: 'c', title: 'Tip & split', sub: 'Split a bill between friends', href: '#/trip/tools/tip' }),
  row({ icon: 'timer', title: 'Timer & stopwatch', sub: 'Big, simple, keeps screen on', href: '#/trip/tools/timer' }),
  row({ icon: 'sparkle', tone: 'g', title: 'Decide for me', sub: 'Coin, dice, random picker', href: '#/trip/tools/decide' }),
  row({ icon: 'wallet', tone: 'c', title: 'Group expenses', sub: 'Who paid what, who owes who', href: '#/trip/tools/split' }),
  row({ icon: 'pin', title: 'Meet-up', sub: 'Place and time, big countdown', href: '#/trip/tools/meet' }),
  row({ icon: 'target', tone: 'g', title: 'Port photo hunt', sub: 'Challenges for port days', href: '#/trip/tools/hunt' }),
)));
route(/^trip\/tools\/currency$/, () => {
  const R = S.trip.rates; let cur = S.trip.cur || Object.keys(R)[1]; let amt = '20', dir = 'usd';
  const out = h('div', { class: 'calc-out' }); const sub = h('div', { class: 'muted small' });
  const inp = h('input', { inputmode: 'decimal', value: amt, style: { fontSize: '22px' }, oninput: (e) => { amt = e.target.value; calc(); } });
  const calc = () => { const a = parseFloat(amt) || 0, r = R[cur]; const code = cur.match(/\((\w+)\)/)?.[1] || ''; out.textContent = dir === 'usd' ? (a * r).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' ' + code : '$' + (a / r).toLocaleString(undefined, { maximumFractionDigits: 2 }); sub.textContent = `1 USD = ${r} ${code} · edit rates below`; };
  const sel = h('select', { onchange: (e) => { cur = S.trip.cur = e.target.value; save(); calc(); } }, Object.keys(R).map((k) => h('option', { value: k, selected: k === cur }, k)));
  calc();
  return page({ title: 'Currency', back: 'trip/tools' },
    h('div', { class: 'card stack' }, seg([['usd', 'USD → local'], ['loc', 'Local → USD']], dir, (v) => { dir = v; calc(); }), inp, sel, out, sub),
    sec('Rates (per 1 USD)'), group(...Object.keys(R).map((k) => row({ title: k, detail: R[k], chev: false, onclick: async () => { const v = await promptSheet(k + ' per 1 USD', { value: String(R[k]) }); if (v && !isNaN(+v)) { R[k] = +v; save(); dispatchEvent(new HashChangeEvent('hashchange')); } } }))),
    h('p', { class: 'small dim', style: { margin: '10px 6px' } }, 'Most Caribbean ports take US dollars. These rates are rough, so check them before you lose signal. Bahamian dollar is 1:1 and the EC dollar is fixed at 2.70.'));
});
route(/^trip\/tools\/tip$/, () => {
  let bill = '', pct = 18, ppl = 2;
  const out = h('div'); const draw = () => { const b = parseFloat(bill) || 0, tip = b * pct / 100, tot = b + tip; out.replaceChildren(h('div', { class: 'row2' }, h('div', { class: 'card center' }, h('div', { class: 'small dim' }, 'Tip'), h('div', { class: 'serif', style: { fontSize: '28px' } }, '$' + tip.toFixed(2))), h('div', { class: 'card center' }, h('div', { class: 'small dim' }, 'Total'), h('div', { class: 'serif', style: { fontSize: '28px' } }, '$' + tot.toFixed(2)))), h('div', { class: 'gap8' }), h('div', { class: 'hero center' }, h('div', { class: 'k' }, 'Each person pays'), h('div', { class: 'big' }, '$' + (tot / ppl).toFixed(2)), h('div', { class: 'sub' }, ppl + ' people'))); };
  const pplEl = h('b', { class: 'serif', style: { fontSize: '24px', minWidth: 40, textAlign: 'center' } }, ppl);
  draw();
  return page({ title: 'Tip & split', back: 'trip/tools' }, h('div', { class: 'stack' }, h('input', { inputmode: 'decimal', placeholder: 'Bill amount ($)', style: { fontSize: '22px' }, oninput: (e) => { bill = e.target.value; draw(); } }),
    seg([[0, '0%'], [10, '10%'], [15, '15%'], [18, '18%'], [20, '20%']], pct, (v) => { pct = v; draw(); }),
    h('div', { class: 'card flex', style: { justifyContent: 'space-between' } }, h('b', null, 'People'), h('div', { class: 'flex' }, h('button', { class: 'iconbtn', onclick: () => { ppl = Math.max(1, ppl - 1); pplEl.textContent = ppl; draw(); } }, '−'), pplEl, h('button', { class: 'iconbtn', onclick: () => { ppl++; pplEl.textContent = ppl; draw(); } }, '+'))), out,
    h('p', { class: 'small dim', style: { margin: '0 6px' } }, 'Onboard drinks already include an 18–20% service charge.')));
});
route(/^trip\/tools\/timer$/, () => {
  let mode = 'timer', run = false, t = 300, t0 = 0, acc = 0, iv = null, laps = [];
  const big = h('div', { class: 'timer-big' }); const ctr = h('div'); const lapEl = h('div');
  const show = () => { big.textContent = mode === 'timer' ? fmtTime(t) : ((acc + (run ? Date.now() - t0 : 0)) / 1000).toFixed(1); };
  const draw = () => { show(); ctr.replaceChildren(mode === 'timer' && !run ? h('div', { class: 'flex wrap', style: { justifyContent: 'center' } }, [1, 3, 5, 10, 15, 30].map((m) => h('button', { class: 'chip', onclick: () => { t = m * 60; show(); } }, m + ' min'))) : '', h('div', { class: 'gap16' }),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => { stop(); if (mode === 'timer') t = 300; else { acc = 0; laps = []; } draw(); } }, 'Reset'), mode === 'stop' && run ? h('button', { class: 'btn', onclick: () => { laps.unshift(big.textContent); draw(); } }, 'Lap') : null, h('button', { class: 'btn ' + (run ? '' : 'accent'), onclick: () => run ? stop() : startT() }, run ? 'Pause' : 'Start')));
    lapEl.replaceChildren(laps.length ? group(...laps.map((l, i) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', null, 'Lap ' + (laps.length - i))), h('div', { class: 'd num' }, l + 's')))) : ''); };
  const startT = () => { run = true; keepAwake(true); t0 = Date.now(); iv = setInterval(() => { if (mode === 'timer') { t--; if (t <= 0) { t = 0; stop(); for (let k = 0; k < 4; k++) setTimeout(() => beep(880, .25), k * 400); haptic([300, 150, 300, 150, 300]); toast('Time\'s up'); } } show(); }, mode === 'timer' ? 1000 : 100); draw(); };
  const stop = () => { if (run && mode === 'stop') acc += Date.now() - t0; run = false; clearInterval(iv); keepAwake(false); draw(); };
  onLeave(() => { clearInterval(iv); keepAwake(false); });
  draw();
  return page({ title: 'Timer', back: 'trip/tools' }, seg([['timer', 'Timer'], ['stop', 'Stopwatch']], mode, (v) => { stop(); mode = v; draw(); }), h('div', { class: 'card', style: { margin: '16px 0', padding: '28px 12px' } }, big), ctr, h('div', { class: 'gap16' }), lapEl);
});
route(/^trip\/tools\/decide$/, () => {
  const out = h('div', { class: 'hero center', style: { minHeight: 160, display: 'grid', placeItems: 'center' } }, h('div', { class: 'big' }, '?'));
  const set = (t) => { haptic(15); out.firstChild.textContent = t; out.firstChild.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1.2)' }); };
  const opts = h('textarea', { placeholder: 'One option per line, e.g.\nPool\nMini golf\nIce show', style: { minHeight: '110px' } });
  return page({ title: 'Decide for me', back: 'trip/tools' }, out, h('div', { class: 'gap16' }),
    h('div', { class: 'row3' }, h('button', { class: 'btn', onclick: () => set(Math.random() < .5 ? 'Heads' : 'Tails') }, 'Coin'), h('button', { class: 'btn', onclick: () => set('Die: ' + (1 + Math.floor(Math.random() * 6))) }, 'Dice'), h('button', { class: 'btn', onclick: () => set(String(1 + Math.floor(Math.random() * 100))) }, '1–100')),
    sec('Pick from a list'), opts, h('div', { class: 'gap8' }), h('button', { class: 'btn accent block', onclick: () => { const l = opts.value.split('\n').map((x) => x.trim()).filter(Boolean); if (l.length < 2) return toast('Add at least 2 options'); set(l[Math.floor(Math.random() * l.length)]); } }, 'Pick one'));
});

// ---------- Group expenses ----------
// Everyone's balance = paid − share. Settle by matching the biggest debtor with the biggest creditor (fewest payments).
route(/^trip\/tools\/split$/, () => {
  const X = (S.trip.split ||= { people: [...(S.party.players || []).slice(0, 8)], items: [] }); const body = h('div');
  const money = (n) => (n < 0 ? '−$' : '$') + Math.abs(n).toFixed(2);
  const settle = () => { const bal = Object.fromEntries(X.people.map((p) => [p, 0]));
    for (const it of X.items) { const among = it.among.filter((p) => p in bal); if (!among.length || !(it.by in bal)) continue; bal[it.by] += it.amt; among.forEach((p) => bal[p] -= it.amt / among.length); }
    const deb = Object.entries(bal).filter(([, v]) => v < -.005).map(([p, v]) => [p, -v]).sort((a, b) => b[1] - a[1]); const cre = Object.entries(bal).filter(([, v]) => v > .005).sort((a, b) => b[1] - a[1]); const pay = [];
    while (deb.length && cre.length) { const d = deb[0], k = cre[0], m = Math.min(d[1], k[1]); pay.push([d[0], k[0], m]); d[1] -= m; k[1] -= m; if (d[1] < .005) deb.shift(); if (k[1] < .005) cre.shift(); }
    return { bal, pay }; };
  const addPerson = async () => { const n = (await promptSheet('Name'))?.trim(); if (n && !X.people.includes(n)) { X.people.push(n); save(); draw(); } };
  const addItem = () => { if (X.people.length < 2) return toast('Add at least 2 people first');
    const what = h('input', { placeholder: 'What for (e.g. Coco Beach Club)' }); const amt = h('input', { inputmode: 'decimal', placeholder: 'Amount ($)' }); let by = X.people[0]; const among = new Set(X.people);
    const chips = () => h('div', { class: 'flex wrap' }, X.people.map((p) => h('button', { class: 'chip' + (among.has(p) ? ' on' : ''), onclick: (e) => { among.has(p) ? among.delete(p) : among.add(p); e.currentTarget.classList.toggle('on'); } }, p)));
    const close = sheet('Add expense', h('div', { class: 'stack' }, what, amt, h('b', null, 'Paid by'), seg(X.people.map((p) => [p, p]), by, (v) => by = v), h('b', null, 'Split between'), chips(),
      h('button', { class: 'btn accent block', onclick: () => { const a = parseFloat(amt.value); if (!(a > 0)) return toast('Enter an amount'); if (!among.size) return toast('Pick who it\'s split between'); X.items.unshift({ id: uid(), what: what.value.trim() || 'Expense', amt: a, by, among: [...among], at: Date.now() }); save(); close(); draw(); sfx.coins(); } }, 'Add'))); setTimeout(() => what.focus(), 300); };
  const draw = () => { const { bal, pay } = settle(); const total = X.items.reduce((s, i) => s + i.amt, 0);
    body.replaceChildren(h('div', { class: 'stack' },
      h('div', { class: 'hero' }, h('div', { class: 'k' }, 'Group total'), h('div', { class: 'big' }, money(total)), h('div', { class: 'sub' }, X.items.length + (X.items.length === 1 ? ' expense · ' : ' expenses · ') + X.people.length + ' people')),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn accent', onclick: addItem }, icon('plus'), 'Expense'), h('button', { class: 'btn', onclick: addPerson }, icon('plus'), 'Person')),
      sec('Settle up'), pay.length ? group(...pay.map(([a, b, m]) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', null, a + ' pays ' + b)), h('b', { style: { fontVariantNumeric: 'tabular-nums' } }, money(m))))) : h('p', { class: 'small dim', style: { margin: '0 6px' } }, 'Everyone is even.'),
      sec('Balances'), group(...X.people.map((p) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', null, p)), h('span', { style: { fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: bal[p] > .005 ? '#1F9A54' : bal[p] < -.005 ? '#D7322A' : '' } }, bal[p] > .005 ? 'gets ' + money(bal[p]) : bal[p] < -.005 ? 'owes ' + money(-bal[p]) : 'even')))),
      X.items.length ? [sec('Expenses'), group(...X.items.map((it) => h('button', { class: 'rowi', onclick: async () => { if (await confirmSheet('Delete expense?', it.what + ' · ' + money(it.amt), 'Delete')) { X.items.splice(X.items.indexOf(it), 1); save(); draw(); } } }, h('div', { class: 't' }, h('b', null, it.what), h('span', null, it.by + ' paid · split ' + it.among.length + ' ways')), h('b', null, money(it.amt)))))] : null)); };
  draw();
  return page({ title: 'Group expenses', sub: 'Works offline. Tap an expense to delete it.', back: 'trip/tools' }, body);
});

// ---------- Meet-up ----------
route(/^trip\/tools\/meet$/, () => {
  const M = (S.trip.meetup ||= { place: S.trip.info.meet || '', time: '' }); const body = h('div'); let iv = null; onLeave(() => clearInterval(iv));
  const target = () => { if (!M.time) return null; const [hh, mm] = M.time.split(':').map(Number); const d = new Date(); d.setHours(hh, mm, 0, 0); if (d - new Date() < -6 * 3600e3) d.setDate(d.getDate() + 1); return d; };
  const draw = () => { clearInterval(iv); const big = h('div', { class: 'big' }); const sub = h('div', { class: 'sub' });
    const tick = () => { const t = target(); if (!t) { big.textContent = 'Set a time'; sub.textContent = ''; return; } const ms = t - new Date(); const m = Math.round(Math.abs(ms) / 6e4); big.textContent = ms >= 0 ? (m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + ' min') : 'Now'; sub.textContent = ms >= 0 ? 'until we meet' : (m ? m + ' min ago' : ''); };
    tick(); iv = setInterval(tick, 10000);
    body.replaceChildren(h('div', { class: 'stack' }, h('div', { class: 'hero center' }, h('div', { class: 'k' }, M.place || 'Pick a place'), big, sub, h('div', { class: 'sub' }, M.time ? 'at ' + new Date('2000-01-01T' + M.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '')),
      h('label', { class: 'stack', style: { gap: 6 } }, h('span', { class: 'small muted', style: { fontWeight: 600, margin: '0 4px' } }, 'Where'), h('input', { value: M.place, placeholder: 'e.g. Central Park, by the carousel', oninput: (e) => { M.place = e.target.value; save(); body.querySelector('.hero .k').textContent = M.place || 'Pick a place'; } })),
      h('label', { class: 'stack', style: { gap: 6 } }, h('span', { class: 'small muted', style: { fontWeight: 600, margin: '0 4px' } }, 'When'), h('input', { type: 'time', value: M.time, onchange: (e) => { M.time = e.target.value; save(); draw(); } })),
      h('div', { class: 'flex wrap' }, [15, 30, 60, 120].map((n) => h('button', { class: 'chip', onclick: () => { const d = new Date(Date.now() + n * 6e4); M.time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); save(); draw(); } }, 'In ' + (n < 60 ? n + ' min' : n / 60 + 'h')))),
      h('p', { class: 'small dim', style: { margin: '0 6px' } }, 'Show this screen to your group. The app can\'t ring when it\'s closed, so set a phone alarm too.'))); };
  draw();
  return page({ title: 'Meet-up', back: 'trip/tools' }, body);
});

// ---------- Port photo hunt ----------
const HUNT = ['A sign in Spanish you can read', 'Someone asleep on a beach chair', 'A bird stealing food', 'The ship from the shore', 'A street dog or cat', 'The brightest building you can find', 'A local fruit you\'ve never tried', 'Your feet in the sand', 'A group jump photo', 'Someone wearing socks with sandals', 'A boat with a funny name', 'The bluest water you see', 'A sandcastle (yours or someone else\'s)', 'A selfie with the captain or crew (ask nicely)', 'Your best "I\'m on a cruise" pose', 'A palm tree that leans sideways', 'Something that costs exactly $1', 'A flag of the country you\'re in', 'A sunset from the deck', 'A towel animal', 'The weirdest souvenir in a shop', 'Someone sunburned (with permission)', 'A reflection photo', 'Matching outfits in your group', 'An iguana or lizard', 'Ice cream before noon'];
route(/^trip\/tools\/hunt$/, () => {
  const Hn = (S.trip.hunt ||= { done: {} }); const body = h('div');
  const draw = () => { const n = Object.keys(Hn.done).length;
    body.replaceChildren(h('div', { class: 'stack' }, h('div', { class: 'hero' }, h('div', { class: 'k' }, 'Found'), h('div', { class: 'big' }, n + ' / ' + HUNT.length), h('div', { class: 'sub' }, 'Take the photo, then check it off. Compete with your group.')),
      h('div', { class: 'group plain' }, HUNT.map((t) => h('button', { class: 'rowi', onclick: () => { Hn.done[t] ? delete Hn.done[t] : (Hn.done[t] = Date.now(), sfx.ok(), haptic(8)); save(); draw(); } }, h('div', { class: 'check' + (Hn.done[t] ? ' on' : '') }, Hn.done[t] ? icon('check') : null), h('div', { class: 't' }, h('b', { class: Hn.done[t] ? 'done-t' : '', style: { fontWeight: 500 } }, t))))))); };
  draw();
  return page({ title: 'Port photo hunt', back: 'trip/tools', right: h('button', { class: 'btn ghost sm', onclick: async () => { if (await confirmSheet('Start over?', 'Unchecks every challenge.', 'Reset', false)) { Hn.done = {}; save(); draw(); } } }, 'Reset') }, body);
});
