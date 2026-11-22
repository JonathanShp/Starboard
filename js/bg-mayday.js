// Mayday!: an Uno-style shedding card game, pass-and-play. Hands stay hidden behind a "pass the phone" screen.
import { h, S, save, route, sheet, toast, shuffle, haptic, confirmSheet, onLeave, sfx } from './core.js';
import { bg, bpage } from './boardgames.js';

const C = { r: ['Coral', '#FF5A3C'], b: ['Blue', '#3D7BFF'], g: ['Green', '#1FA85A'], y: ['Yellow', '#F2B705'] };
const RULES = 'Everyone gets 7 cards. On your turn, play one card that matches the top card\'s color, number or symbol. Can\'t play? Draw one. If it fits, you can play it right away.\n\nSkip: the next player misses a turn. Reverse: play goes the other way (with 2 players it works like Skip). +2: the next player draws 2 and misses a turn.\n\nWild: pick the new color. Wild +4: pick the color, and the next player draws 4 and misses a turn. You can only play +4 when you have no card of the current color.\n\nDown to your last card? Tap MAYDAY before you play your second-to-last card. Forget, and you draw 2.\n\nFirst to empty their hand wins the round.';
const newDeck = () => { const d = []; for (const c of 'rbgy') { d.push(c + '0'); for (let n = 1; n <= 9; n++) d.push(c + n, c + n); for (const s of ['S', 'R', 'D']) d.push(c + s, c + s); } for (let i = 0; i < 4; i++) d.push('wW', 'wF'); return shuffle(d); };
const col = (c) => c[0], val = (c) => c.slice(1);
const ICON = {
  S: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><circle cx="12" cy="12" r="8"/><path d="M6.5 17.5l11-11"/></svg>',
  R: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h13l-3-3M20 15H7l3 3"/></svg>',
  W: '<svg viewBox="0 0 24 24"><path d="M12 12V3a9 9 0 0 1 9 9z" fill="#FF5A3C"/><path d="M12 12h9a9 9 0 0 1-9 9z" fill="#3D7BFF"/><path d="M12 12v9a9 9 0 0 1-9-9z" fill="#1FA85A"/><path d="M12 12H3a9 9 0 0 1 9-9z" fill="#F2B705"/></svg>',
};
const label = (c) => { const v = val(c); return v === 'D' ? '+2' : v === 'F' ? '+4' : v === 'S' ? 'Skip' : v === 'R' ? 'Reverse' : v === 'W' ? 'Wild' : v; };
const cardEl = (c, { color, onclick, dim, sm } = {}) => { const v = val(c), wild = col(c) === 'w'; const bgc = wild ? (color ? C[color][1] : '#14130F') : C[col(c)][1];
  const mid = v === 'S' || v === 'R' ? h('i', { class: 'md-ic', html: ICON[v] }) : v === 'W' ? h('i', { class: 'md-ic', html: ICON.W }) : v === 'F' ? h('i', { class: 'md-ic md-f', html: ICON.W + '<b>+4</b>' }) : h('b', { class: 'md-n' }, v === 'D' ? '+2' : v);
  return h(onclick ? 'button' : 'div', { class: 'md-card' + (sm ? ' sm' : '') + (dim ? ' dim' : '') + (wild ? ' wild' : ''), style: { '--cc': bgc }, onclick, 'aria-label': (wild ? '' : C[col(c)][0] + ' ') + label(c) }, h('span', { class: 'md-tl' }, v === 'D' ? '+2' : v === 'F' ? '+4' : /\d/.test(v) ? v : ''), mid); };

route(/^play\/board\/mayday$/, () => {
  const st = bg(); const body = h('div'); let G = st.mayday;
  const persist = () => { st.mayday = G; save(); };
  const deal = (names) => { st.mdNames = names; let deck = newDeck(); const hands = names.map(() => deck.splice(0, 7)); let top; while (true) { top = deck.shift(); if (/\d/.test(val(top))) break; deck.push(top); }
    G = { names, hands, deck, pile: [top], color: col(top), turn: 0, dir: 1, called: false, drew: null, note: names[0] + ' starts.', wins: G?.wins || {}, shown: false }; persist(); render(); };
  const setup = () => { const names = [...(st.mdNames || S.party.players || []).slice(0, 6)];
    const inp = h('input', { placeholder: 'Add player', enterkeyhint: 'done' });
    const add = () => { const v = inp.value.trim(); if (v && names.length < 6 && !names.includes(v)) names.push(v); inp.value = ''; draw(); };
    inp.onkeydown = (e) => { if (e.key === 'Enter') add(); };
    const draw = () => body.replaceChildren(h('div', { class: 'stack fade-in' }, h('b', null, 'Players (2–6)'), h('div', { class: 'flex' }, inp, h('button', { class: 'btn primary sm', onclick: add }, 'Add')),
      h('div', { class: 'flex wrap' }, names.map((v, i) => h('button', { class: 'chip', onclick: () => { names.splice(i, 1); draw(); } }, v, ' ×'))),
      names.length >= 2 ? h('button', { class: 'btn accent block', onclick: () => deal(names) }, 'Deal') : h('p', { class: 'small dim center' }, 'Add at least 2 players')));
    draw(); };
  const n = () => G.names.length;
  const nextIdx = (k = 1) => (G.turn + G.dir * k + n() * 4) % n();
  const top = () => G.pile.at(-1);
  const draw1 = (pi, k) => { for (let i = 0; i < k; i++) { if (!G.deck.length) { const t = G.pile.pop(); G.deck = shuffle(G.pile.map((c) => c)); G.pile = [t]; } if (G.deck.length) G.hands[pi].push(G.deck.shift()); } };
  const fits = (c) => col(c) === 'w' ? (val(c) === 'W' || !G.hands[G.turn].some((x) => col(x) === G.color)) : col(c) === G.color || val(c) === val(top());
  const pickColor = () => new Promise((res) => { let done = false; const close = sheet('Pick the new color', h('div', { class: 'md-colors' }, Object.entries(C).map(([k, [nm, hex]]) => h('button', { style: { background: hex }, onclick: () => { done = true; close(); res(k); } }, nm))), { onClose: () => !done && res('r') }); });
  const play = async (i) => { const pi = G.turn, hand = G.hands[pi], c = hand[i]; if (!fits(c)) return toast(col(c) === 'w' && val(c) === 'F' ? '+4 only when you have no ' + C[G.color][0] : 'That card doesn\'t match');
    let color = col(c); if (color === 'w') color = await pickColor();
    hand.splice(i, 1); G.pile.push(c); G.color = color; sfx.card(); haptic(10); const me = G.names[pi]; let note = col(c) === 'w' ? `${me} played ${label(c) === '+4' ? 'Wild +4' : 'Wild'} and picked ${C[color][0]}.` : `${me} played ${C[col(c)][0]} ${label(c)}.`;
    if (!hand.length) { G.wins[me] = (G.wins[me] || 0) + 1; G.over = me; persist(); sfx.win(); return render(); }
    if (hand.length === 1) { if (!G.called) { draw1(pi, 2); note += ` Forgot to call MAYDAY: +2 cards!`; sfx.bad(); } else note += ' MAYDAY! One card left.'; }
    const v = val(c); let skip = 0;
    if (v === 'R') { if (n() === 2) skip = 1; else G.dir *= -1; }
    if (v === 'S') skip = 1;
    if (v === 'D') { draw1(nextIdx(), 2); note += ` ${G.names[nextIdx()]} draws 2 and misses a turn.`; skip = 1; }
    if (v === 'F') { draw1(nextIdx(), 4); note += ` ${G.names[nextIdx()]} draws 4 and misses a turn.`; skip = 1; }
    if (v === 'S') note += ` ${G.names[nextIdx()]} misses a turn.`;
    if (v === 'R' && n() > 2) note += ' Play goes the other way.';
    G.turn = nextIdx(1 + skip); G.called = false; G.drew = null; G.note = note; G.shown = false; persist(); render(); };
  const drawCard = () => { if (G.drew) return; draw1(G.turn, 1); G.drew = G.hands[G.turn].length - 1; sfx.card(); const c = G.hands[G.turn][G.drew];
    if (!fits(c)) { G.note = `${G.names[G.turn]} drew a card and passed.`; G.turn = nextIdx(); G.drew = null; G.called = false; G.shown = false; toast('No match. Turn over.'); }
    persist(); render(); };
  const keep = () => { G.note = `${G.names[G.turn]} drew a card and kept it.`; G.turn = nextIdx(); G.drew = null; G.called = false; G.shown = false; persist(); render(); };
  const restart = async () => { if (await confirmSheet('Restart?', 'New deal, same players. The round in progress is lost.', 'Restart', false)) deal(G.names); };
  function render() {
    if (!G) return setup();
    const counts = h('div', { class: 'md-counts' }, G.names.map((nm, i) => h('div', { class: 'md-who' + (i === G.turn ? ' on' : '') }, h('b', null, nm), h('span', null, G.hands[i].length + (G.hands[i].length === 1 ? ' card' : ' cards')))));
    if (G.over) { body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal coral', style: { minHeight: 'auto', padding: 28 } }, h('div', { class: 'k' }, 'Out of cards'), h('div', { class: 'w' }, G.over + ' wins')),
      h('div', { class: 'group' }, G.names.map((nm) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', null, nm)), h('b', null, (G.wins[nm] || 0) + ((G.wins[nm] || 0) === 1 ? ' win' : ' wins'))))),
      h('button', { class: 'btn accent block', onclick: () => { G.over = null; deal(G.names); } }, 'Next round'), h('button', { class: 'btn block', onclick: () => { G = null; st.mayday = null; save(); setup(); } }, 'Change players'))); return; }
    const me = G.names[G.turn];
    if (!G.shown) { body.replaceChildren(h('div', { class: 'stack fade-in' }, counts, G.note ? h('div', { class: 'card small', style: { padding: 12 } }, G.note) : null,
      h('button', { class: 'reveal light', style: { minHeight: '40dvh' }, onclick: () => { G.shown = true; haptic(10); persist(); render(); } }, h('div', { class: 'k' }, 'Pass the phone to'), h('div', { class: 'w' }, me), h('div', { class: 'muted' }, 'Tap when only ' + me + ' can see')),
      h('button', { class: 'btn ghost block', onclick: restart }, 'Restart round'))); return; }
    const hand = G.hands[G.turn];
    const may = h('button', { class: 'md-may' + (G.called ? ' on' : ''), disabled: hand.length !== 2, onclick: () => { G.called = !G.called; if (G.called) { sfx.ok(); haptic([20, 30, 20]); } persist(); render(); } }, G.called ? 'MAYDAY called' : 'MAYDAY');
    body.replaceChildren(h('div', { class: 'stack fade-in' }, counts,
      h('div', { class: 'md-table' }, h('button', { class: 'md-deck', disabled: G.drew != null, onclick: drawCard, 'aria-label': 'Draw a card' }, h('b', null, 'Draw'), h('span', null, G.deck.length + ' left')),
        cardEl(top(), { color: G.color }), h('div', { class: 'md-now' }, h('span', null, 'Color'), h('i', { style: { background: C[G.color][1] } }), h('b', null, C[G.color][0]))),
      h('div', { class: 'flex', style: { justifyContent: 'space-between', alignItems: 'center' } }, h('b', null, me + '’s hand'), may),
      h('div', { class: 'md-hand' }, hand.map((c, i) => cardEl(c, { onclick: () => (G.drew != null && i !== G.drew ? toast('Play the card you drew, or keep it') : play(i)), dim: !fits(c) || (G.drew != null && i !== G.drew) }))),
      G.drew != null ? h('button', { class: 'btn block', onclick: keep }, 'Keep it and pass') : h('p', { class: 'small dim center', style: { margin: 0 } }, 'No card fits? Tap Draw.'),
      h('button', { class: 'btn ghost block', onclick: () => { G.shown = false; persist(); render(); } }, 'Hide my cards'))); }
  onLeave(() => { if (G) { G.shown = false; persist(); } });
  if (G) G.shown = false; G ? render() : setup();
  return bpage('mayday', RULES, body);
});
