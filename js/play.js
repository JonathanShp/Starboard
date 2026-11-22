import { h, icon, S, save, route, page, row, group, ftile, sec, seg, sheet, toast, go, pick, shuffle, rand, fmtTime, haptic, beep, keepAwake, onLeave, confirmSheet, $ , sfx, say } from './core.js';
import * as D from './data-party.js';
import { howTo, firstTime } from './howto.js';
import { DEPTH, HOTSEAT, DEPTHS, DEPTH_NOTE } from './data-deep.js';
import * as P2 from './data-party2.js';
const depth = () => S.party.depth || 'light';
// Light = the regular list; Closer/Deep = their own sets
const byDepth = (key, light) => depth() === 'light' ? filt(light) : DEPTH[key][depth()];
const depthCard = (redraw) => { const note = h('p', { class: 'small dim', style: { margin: '8px 4px 0' } }, DEPTH_NOTE[depth()]); return h('div', { class: 'card', style: { padding: 14 } }, seg(DEPTHS, depth(), (v) => { S.party.depth = v; save(); note.textContent = DEPTH_NOTE[v]; redraw?.(); }), note); };

const filt = (arr) => arr.filter((s) => S.party.mode === 'friends' || !String(Array.isArray(s) ? s[0] : s).startsWith('!')).map((s) => Array.isArray(s) ? s.map((x) => String(x).replace(/^!/, '')) : s.replace(/^!/, ''));

route(/^play$/, () => page({ title: 'Play', sub: 'Chess, party games and puzzles' },
  h('div', { class: 'bento' },
    h('a', { class: 't tall c-green', href: '#/play/chess' }, h('div', { class: 'ic' }, icon('knight')), h('div', null, h('div', { class: 'n', style: { fontSize: '52px' } }, 'Chess'), h('span', null, 'vs computer or a friend · openings · puzzles'), h('span', { class: 'go' }, icon('playf'), 'Play'))),
    h('a', { class: 't c-yellow', href: '#/play/party' }, h('div', { class: 'ic' }, icon('users')), h('div', null, h('b', null, 'Party'), h('span', null, '21 games'))),
    h('a', { class: 't c-blue', href: '#/play/solo' }, h('div', { class: 'ic' }, icon('grid')), h('div', null, h('b', null, 'Puzzles'), h('span', null, 'Sudoku · 2048 · more'))),
    h('a', { class: 't c-coral', href: '#/play/board' }, h('div', { class: 'ic' }, icon('globe')), h('div', null, h('b', null, 'Board games'), h('span', null, 'Seaopoly · Islanders · more'))),
    h('a', { class: 't c-purple', href: '#/music' }, h('div', { class: 'ic' }, icon('music')), h('div', null, h('b', null, 'Music'), h('span', null, 'Your offline library'))),
  ),
));

const GAMES = [
  ['imposter', 'Imposter', 'Everyone gets the secret word except one. Find the faker.', '3–12', 'eye', 'coral'],
  ['forehead', 'Forehead', 'Phone on your head, friends shout clues. Tilt or tap.', '2+', 'bolt', 'blue'],
  ['wave', 'On the Wave', 'Give a clue that lands on a hidden spot between two extremes.', '2+ teams', 'wave', 'teal'],
  ['taboo', 'Forbidden Words', 'Describe the word without the 4 banned ones.', '4+ teams', 'x', 'pink'],
  ['fishbowl', 'Fishbowl', 'Same names, three rounds: describe, one word, act it out.', '4+ teams', 'users', 'purple'],
  ['spymaster', 'Spymaster', 'Two teams, 25 words, one-word clues. Avoid the bomb.', '4+', 'grid', 'black'],
  ['draw', 'Scribble Telephone', 'Draw, guess, draw the guess. Watch it fall apart.', '3–10', 'pen', 'yellow'],
  ['bluff', 'Bluff', 'Invent fake definitions for real weird words. Fool your friends.', '3–8', 'book', 'green'],
  ['herd', 'Herd Mind', 'Answer secretly — score only if you match the majority.', '3–10', 'users', 'blue'],
  ['mafia', 'Mafia', 'Secret roles, night kills, day accusations. Narrator built in.', '5–15', 'moon', 'black'],
  ['cats', 'Categories', 'Random letter, 10 categories, 2 minutes. Unique answers score.', '2+', 'list', 'teal'],
  ['mlt', 'Most Likely To', 'Read it, count to 3, everyone points.', '3+', 'target', 'coral'],
  ['wyr', 'Would You Rather', 'Pick a side and defend it.', '2+', 'flip', 'purple'],
  ['tod', 'Truth or Dare', 'Classic. Closer and Deep make it real.', '3+', 'sparkle', 'pink'],
  ['hot', 'Hot Seat', 'One person answers, everyone listens. Icebreakers to deep talk.', '2+', 'heart', 'coral'],
  ['quips', 'Quips', 'Two players answer the same prompt. The room votes for the funnier one.', '3–10', 'mic', 'yellow'],
  ['bomb', 'Pass the Bomb', 'Say a word, pass the phone. Hidden timer. Lose if you hold it at the bang.', '3+', 'timer', 'coral'],
  ['trivia', 'Trivia Night', 'Teams answer out loud, the phone keeps score. 70 questions.', '2+ teams', 'bulb', 'blue'],
  ['nhie', 'Never Have I Ever', 'Fingers up. Put one down if you have.', '3+', 'flag', 'green'],
  ['paranoia', 'Paranoia', 'Read a secret question, answer with a name. A flip decides whether it gets revealed.', '4+', 'eye', 'purple'],
  ['twotruths', 'Two Truths, One Lie', 'Tell three stories. The group finds the lie.', '3+', 'cards', 'teal'],
];
route(/^play\/party$/, () => page({ title: 'Party games', sub: 'Pass one phone around. Works anywhere, no Wi-Fi.', back: 'play' },
  h('div', { class: 'card', style: { padding: 14 } }, seg([['family', 'Family'], ['friends', 'Friends']], S.party.mode, (v) => { S.party.mode = v; save(); }), h('p', { class: 'small dim', style: { margin: '8px 4px 0' } }, 'Friends mode adds roast-y prompts.')),
  h('div', { class: 'gap8' }), depthCard(),
  h('div', { class: 'gap16' }),
  h('div', { class: 'bento even' }, GAMES.map(([id, n, d, p, ic, col]) => h('a', { class: 't c-' + col, href: '#/play/party/' + id }, h('div', { class: 'flex', style: { justifyContent: 'space-between', alignItems: 'flex-start' } }, h('div', { class: 'ic' }, icon(ic)), h('span', { class: 'gp' }, p)), h('div', null, h('b', null, n), h('span', { class: 'gd' }, d))))),
));

// ---------- shared helpers ----------
function playersSetup(body, { min = 3, title = 'Who\'s playing?', onStart, startLabel = 'Start' }) {
  const P = S.party.players;
  const inp = h('input', { placeholder: 'Add name', enterkeyhint: 'done' });
  const add = () => { const n = inp.value.trim(); if (n && !P.includes(n)) { P.push(n); save(); } draw(); setTimeout(() => body.querySelector('input')?.focus(), 0); };
  inp.onkeydown = (e) => e.key === 'Enter' && add();
  const draw = () => body.replaceChildren(h('div', { class: 'stack fade-in' }, h('b', { style: { margin: '0 4px' } }, title), h('div', { class: 'flex' }, inp, h('button', { class: 'btn primary sm', onclick: add }, 'Add')),
    h('div', { class: 'flex wrap' }, P.map((p) => h('button', { class: 'chip', onclick: () => { S.party.players = P.splice(P.indexOf(p), 1) && P; save(); draw(); } }, p, ' ×'))),
    P.length >= min ? h('button', { class: 'btn accent block', onclick: () => onStart([...P]) }, startLabel) : h('p', { class: 'small dim center' }, `Need at least ${min} players`)));
  draw();
}
// "Pass to X" → tap to reveal → tap to hide
function passReveal(body, name, content, onNext, { kicker = 'Secret', light = false } = {}) {
  body.replaceChildren(h('div', { class: 'stack fade-in' }, h('button', { class: 'reveal light', onclick: show }, h('div', { class: 'k' }, 'Pass the phone to'), h('div', { class: 'w' }, name), h('div', { class: 'muted' }, 'Tap when only ' + name + ' can see'))));
  function show() { haptic(10); body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal' + (light ? ' light' : '') }, h('div', { class: 'k' }, kicker), content), h('button', { class: 'btn primary block', onclick: onNext }, 'Hide & pass'))); }
}
function countdown(sec, el, onEnd, onTick) {
  let t = sec; el.textContent = fmtTime(t); keepAwake(true);
  const iv = setInterval(() => { t--; el.textContent = fmtTime(t); onTick?.(t); if (t <= 5 && t > 0) beep(600, .06, .12); if (t <= 0) { clearInterval(iv); beep(880, .4); haptic([200, 80, 200]); keepAwake(false); onEnd(); } }, 1000);
  onLeave(() => { clearInterval(iv); keepAwake(false); });
  return { stop: () => { clearInterval(iv); keepAwake(false); }, add: (s) => t += s, get left() { return t; } };
}
const GCOL = { coral: '#FF5A3C', blue: '#3D7BFF', teal: '#0FB5BA', pink: '#FF4F8B', purple: '#8F63FF', black: '#14130F', yellow: '#E0A800', green: '#1FCB6E' };
const gpage = (id, body, extra) => {
  const g = GAMES.find((x) => x[0] === id); const color = GCOL[g[5]] || '#14130F';
  const help = () => howTo(id, { color, title: g[1], rules: RULES[id] });
  if (firstTime(id)) setTimeout(help, 350);
  return page({ title: g[1], back: 'play/party', large: false, right: h('button', { class: 'btn sm', onclick: help }, 'How to play') },
    h('div', { class: 'gamehead' }, h('div', { class: 'gi c-' + g[5] }, icon(g[4])), h('div', null, h('h1', null, g[1]), h('p', null, g[3] + ' players'))),
    extra || null, h('div', { class: 'gbody', style: { '--gc': color } }, body));
};
const teamsUI = (teams) => h('div', { class: 'row2' }, teams.map((t, i) => h('div', { class: 'card center', style: { padding: 14 } }, h('div', { class: 'small dim' }, t.name), h('div', { class: 'big-num', style: { fontSize: '40px' } }, t.score))));
const RULES = {
  imposter: 'Everyone secretly sees the same word except the Imposter, who only sees the category.\n\nGo around: each person says ONE word or short clue related to the secret word. Not too obvious (the Imposter will guess it), not too vague (you\'ll look suspicious).\n\nAfter 2–3 rounds, vote. If you catch the Imposter, they get one chance to guess the word to steal the win.',
  forehead: 'Hold the phone on your forehead, screen facing out. Friends give clues or act it out.\n\nTilt DOWN (or tap right side) = got it. Tilt UP (or tap left side) = pass.\n\n60 seconds. Pass the phone and beat the high score.',
  wave: 'Two teams. The Psychic sees where the hidden target is between two extremes (like Cold ↔ Hot), then gives ONE clue (e.g. "Soup").\n\nTheir team drags the needle to where they think it is. Bullseye = 4, close = 3, near = 2. Then the other team guesses left or right of the needle for 1 point.\n\nFirst to 10 wins.',
  taboo: 'Describe the big word so your team guesses it — without saying any of the forbidden words (or parts of them). No rhymes, no "sounds like".\n\nThe other team watches for cheaters: tap Buzz if a forbidden word slips.\n\nCorrect +1 · Buzz −1 · Skip 0.',
  fishbowl: 'Everyone secretly writes 3 names (famous people, characters, people you all know, things).\n\nRound 1: describe with any words.\nRound 2: ONE word only.\nRound 3: act it out, no sounds.\n\nSame names every round — your memory of earlier rounds is the trick. 45 seconds per turn, teams alternate.',
  spymaster: 'Two teams (Coral and Blue), each with a Spymaster. Spymasters secretly look at the key (tap "Spymaster view").\n\nSpymaster gives ONE word + a number ("Ocean 2") linking their team\'s words. Team taps guesses. Wrong color ends the turn. The black BOMB = instant loss.\n\nCoral starts and has 9 words, Blue has 8.',
  draw: 'Player 1 gets a prompt and draws it. Pass. Player 2 sees ONLY the drawing and writes a guess. Pass. Player 3 sees ONLY that guess and draws it… and so on.\n\nAt the end, watch how the prompt changed. The worse you draw, the funnier it gets.',
  bluff: 'One real weird word appears. Everyone secretly writes a FAKE definition that sounds real.\n\nThe phone mixes the fakes with the real one. Someone reads them all aloud, then everyone secretly votes for the one they think is real.\n\n+2 for picking the real one · +1 for every vote your fake gets.',
  herd: 'A question like "Name a pizza topping." Everyone answers secretly.\n\nYou score only if your answer matches the MOST popular answer. Think like the herd, not like a genius.\n\nFirst to 8 wins.',
  mafia: 'Secret roles: Mafia (kill at night), Doctor (save one person), Detective (check one person), Villagers.\n\nThe phone is the Narrator: follow the script. At night everyone closes their eyes; the narrator calls each role to wake.\n\nDay: discuss and vote someone out. Village wins by eliminating all Mafia. Mafia wins when they equal the villagers.',
  cats: 'A random letter + a list of categories. Two minutes to write an answer for each that starts with the letter (on paper or Notes).\n\nRead answers out. You score only for answers nobody else wrote.',
  mlt: 'Read the prompt. Count 3-2-1 and everyone points at someone. Whoever gets the most points has to explain themselves.',
  wyr: 'Read it, everyone picks a side, and one person from each side has 20 seconds to defend it. The other side can switch if convinced.',
  hot: 'Pass the phone around. Whoever holds it is in the Hot Seat: read the question out loud and answer it honestly.\n\nEveryone else just listens. No interrupting, no judging. Ask one follow-up if you want.\n\nPick Light, Closer or Deep at the top. Anyone can pass on any question.',
  quips: 'Each round, two players get the same prompt and secretly type the funniest answer they can.\n\nThe phone reads both answers aloud. Everyone else votes with a show of hands, and you tap the winner.\n\nEveryone gets a turn. Most points after all rounds wins.',
  bomb: 'The phone shows a category. The holder says one thing in that category, then passes the phone to the left.\n\nNo repeats, no stalling. The timer is hidden and random, and the ticking speeds up near the end.\n\nWhoever is holding it when it goes off loses the round.',
  trivia: 'Split into teams. Read the question out loud. Teams agree on one answer and say it.\n\nTap Reveal, then tap every team that got it right. First to 10 wins, or play until you run out.',
  nhie: 'Everyone holds up five fingers. Read the statement out loud.\n\nIf you HAVE done it, put a finger down. Share the story if you want to.\n\nLast person with fingers up wins. Pick Light, Closer or Deep at the top.',
  paranoia: 'Pass the phone to one person. They read the question silently and say a name from the group out loud. Only the name.\n\nThen tap Flip. Heads: the question is read out to everyone. Tails: it stays a secret forever.\n\nThe named person reads the next one.',
  twotruths: 'The phone gives you a topic. Tell three short statements about it: two true, one made up.\n\nEveryone asks one question, then votes for the lie. You get a point for each person you fooled.',
  tod: 'Pick truth or dare. You can pass once per game. Keep it fun: nobody has to do anything they\'re uncomfortable with.',
};

// ---------- 1. Imposter ----------
route(/^play\/party\/imposter$/, () => {
  const body = h('div'); let cat = 'Random', imps = 1;
  const start = (P) => {
    const c = cat === 'Random' ? pick(Object.keys(D.IMPOSTER)) : cat; const word = pick(D.IMPOSTER[c]);
    const order = shuffle(P), impSet = new Set(shuffle(P).slice(0, Math.min(imps, P.length - 2)));
    let i = 0;
    const nextP = () => { if (i >= P.length) return discuss(); const p = P[i++]; passReveal(body, p, impSet.has(p) ? h('div', null, h('div', { class: 'w', style: { color: '#FFB4A6' } }, 'You\'re the Imposter'), h('p', null, 'Category: ' + c + '. Blend in.')) : h('div', null, h('div', { class: 'w' }, word), h('p', { style: { color: 'rgba(255,255,255,.7)' } }, c)), nextP); };
    const discuss = () => {
      const clock = h('div', { class: 'timer-big' });
      body.replaceChildren(h('div', { class: 'stack fade-in center' }, h('div', { class: 'card' }, h('div', { class: 'small dim' }, 'Goes first'), h('div', { class: 'serif', style: { fontSize: '32px' } }, order[0]), h('div', { class: 'small muted' }, 'Then go around clockwise. One word each.')), clock,
        h('button', { class: 'btn primary block', onclick: reveal }, 'Reveal the Imposter')));
      countdown(240, clock, () => toast('Time to vote!'));
    };
    const reveal = () => body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal coral' }, h('div', { class: 'k' }, impSet.size > 1 ? 'Imposters' : 'Imposter'), h('div', { class: 'w' }, [...impSet].join(' & ')), h('div', null, 'The word was: ' + word)), h('button', { class: 'btn primary block', onclick: () => start(P) }, 'Play again'), h('button', { class: 'btn block', onclick: setup }, 'Change players')));
    nextP();
  };
  const setup = () => { playersSetup(body, { min: 3, onStart: start }); body.prepend(h('div', { class: 'stack', style: { marginBottom: 16 } }, h('div', { class: 'chips' }, ['Random', ...Object.keys(D.IMPOSTER)].map((c) => h('button', { class: 'chip' + (c === cat ? ' on' : ''), onclick: (e) => { cat = c; [...e.target.parentNode.children].forEach((x) => x.classList.toggle('on', x === e.target)); } }, c))), seg([[1, '1 imposter'], [2, '2 imposters']], imps, (v) => imps = v))); };
  setup();
  return gpage('imposter', body);
});

// ---------- 2. Forehead ----------
route(/^play\/party\/forehead$/, () => {
  const body = h('div');
  const decks = Object.keys(D.HEADSUP);
  body.append(h('div', { class: 'stack' }, h('p', { class: 'muted', style: { margin: '0 4px' } }, 'Pick a deck. Hold the phone sideways on your forehead.'), group(...decks.map((d) => row({ icon: 'bolt', title: d, detail: filt(D.HEADSUP[d]).length, onclick: () => playDeck(d) })))));
  const playDeck = async (dname) => {
    try { await document.documentElement.requestFullscreen?.(); await screen.orientation?.lock?.('landscape'); } catch { }
    const words = shuffle(filt(D.HEADSUP[dname])); let i = 0; const got = [], passed = [];
    const ov = h('div', { class: 'fullgame' }); const inner = h('div', { class: 'fgin' }); let done = false, timer = null, cd = 0;
    const xb = h('button', { class: 'fgx', 'aria-label': 'Stop game', onclick: (e) => { e.stopPropagation(); end(); } }, icon('x'));
    ov.append(inner, xb); document.body.append(ov);
    const fsx = () => { if (!document.fullscreenElement) end(); }; setTimeout(() => document.addEventListener('fullscreenchange', fsx), 800);
    const end = () => { if (done) return; done = true; timer?.stop(); clearInterval(cd); document.removeEventListener('fullscreenchange', fsx); removeEventListener('deviceorientation', ori); try { screen.orientation?.unlock?.(); document.fullscreenElement && document.exitFullscreen(); } catch { } ov.remove(); keepAwake(false); const best = S.party['fh_' + dname] || 0; if (got.length > best) { S.party['fh_' + dname] = got.length; save(); }
      body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'card center' }, h('div', { class: 'big-num' }, got.length), h('div', { class: 'muted' }, 'correct · best ' + Math.max(best, got.length))), group(...[...got.map((w) => [w, 1]), ...passed.map((w) => [w, 0])].map(([w, ok]) => h('div', { class: 'rowi' }, h('div', { class: 'check' + (ok ? ' on' : '') }, ok ? icon('check') : null), h('div', { class: 't' }, h('b', { class: ok ? '' : 'dim' }, w))))), h('button', { class: 'btn accent block', onclick: () => playDeck(dname) }, 'Next player'), h('a', { class: 'btn block', href: '#/play/party' }, 'Done'))); };
    onLeave(() => ov.isConnected && end());
    let base = null, armed = true, locked = false;
    const show = () => { ov.className = 'fullgame'; inner.replaceChildren(h('div', { class: 'small', style: { position: 'absolute', top: 16, left: 0, right: 0, opacity: .7 } }, clockEl), h('div', { class: 'w' }, words[i % words.length]), h('button', { style: { position: 'absolute', inset: '0 50% 0 0' }, onclick: () => mark(false), 'aria-label': 'Pass' }), h('button', { style: { position: 'absolute', inset: '0 0 0 50%' }, onclick: () => mark(true), 'aria-label': 'Correct' })); };
    const mark = (ok) => { if (locked) return; locked = true; haptic(ok ? 30 : [20, 30, 20]); (ok ? got : passed).push(words[i % words.length]); i++; ov.className = 'fullgame ' + (ok ? 'ok' : 'pass'); inner.replaceChildren(h('div', { class: 'w' }, ok ? 'Correct!' : 'Pass')); beep(ok ? 990 : 330, .15); setTimeout(() => { locked = false; show(); }, 700); };
    const ori = (e) => { const v = Math.abs(screen.orientation?.angle || 0) === 90 ? e.gamma : e.beta; if (v == null) return; if (base == null) { base = v; return; } const d = v - base; if (armed && Math.abs(d) > 40) { armed = false; mark(d < 0 === (screen.orientation?.angle === 90)); } else if (Math.abs(d) < 15) armed = true; };
    const clockEl = h('span');
    let n = 3; inner.replaceChildren(h('div', { class: 'small', style: { opacity: .7 } }, 'Put it on your forehead'), h('div', { class: 'w' }, n));
    cd = setInterval(() => { n--; if (n > 0) { inner.lastChild.textContent = n; beep(500, .08); } else { clearInterval(cd); addEventListener('deviceorientation', ori); show(); timer = countdown(60, clockEl, end); } }, 1000);
    keepAwake(true);
  };
  return gpage('forehead', body);
});

// ---------- 3. On the Wave ----------
route(/^play\/party\/wave$/, () => {
  const body = h('div'); const T = [{ name: 'Coral', score: 0 }, { name: 'Blue', score: 0 }]; let turn = 0; const deck = shuffle(filt(D.SPECTRA));
  const dial = (target, needle, showTarget, onMove) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 200 112');
    const pol = (a, r) => [100 + r * Math.cos(Math.PI - a * Math.PI / 180), 104 - r * Math.sin(Math.PI - a * Math.PI / 180)];
    const wedge = (a0, a1, col) => { const [x0, y0] = pol(a0, 96), [x1, y1] = pol(a1, 96); return `<path d="M100 104 L${x0} ${y0} A96 96 0 0 1 ${x1} ${y1}Z" fill="${col}"/>`; };
    const draw = () => { const [nx, ny] = pol(needle, 90); svg.innerHTML = `<path d="M4 104 A96 96 0 0 1 196 104Z" fill="#E3F3F6"/>` + (showTarget ? wedge(target - 14, target - 8.5, '#FFE08A') + wedge(target - 8.5, target - 3, '#FFC21A') + wedge(target - 3, target + 3, '#FF5A3C') + wedge(target + 3, target + 8.5, '#FFC21A') + wedge(target + 8.5, target + 14, '#FFE08A') : '') + (needle != null ? `<line x1="100" y1="104" x2="${nx}" y2="${ny}" stroke="#14130F" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="104" r="8" fill="#14130F"/>` : ''); };
    if (onMove) { const mv = (e) => { const r = svg.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 200 - 100, y = 104 - (e.clientY - r.top) / r.height * 112; needle = Math.max(2, Math.min(178, 180 - Math.atan2(y, x) * 180 / Math.PI)); onMove(needle); draw(); }; svg.onpointerdown = (e) => { svg.setPointerCapture(e.pointerId); mv(e); svg.onpointermove = mv; }; svg.onpointerup = () => svg.onpointermove = null; }
    draw(); return h('div', { class: 'dial' }, svg);
  };
  const round = () => {
    const [l, r] = deck.pop() || pick(D.SPECTRA); const target = 14 + Math.random() * 152; const team = T[turn % 2];
    const ends = h('div', { class: 'flex', style: { justifyContent: 'space-between', fontWeight: 700 } }, h('span', null, '← ' + l), h('span', null, r + ' →'));
    body.replaceChildren(h('div', { class: 'stack fade-in' }, teamsUI(T), h('div', { class: 'reveal light', style: { minHeight: 'auto' } }, h('div', { class: 'k' }, team.name + ' team'), h('div', null, 'Pick a Psychic. Only they look at the next screen.')), h('button', { class: 'btn primary block', onclick: psychic }, 'I\'m the Psychic')));
    function psychic() { body.replaceChildren(h('div', { class: 'stack fade-in' }, ends, dial(target, null, true), h('p', { class: 'center muted' }, 'Think of ONE clue that sits right on the red spot. Say it out loud, then hide.'), h('button', { class: 'btn primary block', onclick: guess }, 'Hide target'))); }
    function guess() { let nd = 90; body.replaceChildren(h('div', { class: 'stack fade-in' }, ends, dial(target, nd, false, (v) => nd = v), h('p', { class: 'center muted' }, team.name + ': drag the needle to the clue.'), h('button', { class: 'btn primary block', onclick: () => reveal(nd) }, 'Lock it in'))); }
    function reveal(nd) { const d = Math.abs(nd - target); const pts = d <= 3 ? 4 : d <= 8.5 ? 3 : d <= 14 ? 2 : 0; team.score += pts; haptic(pts ? [30, 40, 30] : 60);
      body.replaceChildren(h('div', { class: 'stack fade-in' }, ends, dial(target, nd, true), h('div', { class: 'card center' }, h('div', { class: 'big-num' }, '+' + pts), h('div', { class: 'muted' }, pts === 4 ? 'Bullseye!' : pts ? 'Close!' : 'Missed')), T.some((t) => t.score >= 10) ? h('div', { class: 'reveal coral', style: { minHeight: 'auto' } }, h('div', { class: 'w' }, T.find((t) => t.score >= 10).name + ' wins')) : null, h('button', { class: 'btn primary block', onclick: () => { if (T.some((t) => t.score >= 10)) T.forEach((t) => t.score = 0); turn++; round(); } }, 'Next team'))); }
  };
  round();
  return gpage('wave', body);
});

// ---------- 4. Forbidden Words ----------
route(/^play\/party\/taboo$/, () => {
  const body = h('div'); const T = [{ name: 'Team A', score: 0 }, { name: 'Team B', score: 0 }]; let turn = 0; let deck = shuffle(D.TABOO);
  const ready = () => body.replaceChildren(h('div', { class: 'stack fade-in' }, teamsUI(T), h('div', { class: 'reveal light', style: { minHeight: 'auto' } }, h('div', { class: 'k' }, 'Up next'), h('div', { class: 'w' }, T[turn % 2].name), h('div', { class: 'muted' }, 'One describer · 60 seconds')), h('button', { class: 'btn accent block', onclick: go1 }, 'Start round')));
  const go1 = () => {
    const team = T[turn % 2]; let card; const clock = h('span', { class: 'num' }); const cardEl = h('div');
    const nextCard = () => { if (!deck.length) deck = shuffle(D.TABOO); card = deck.pop(); cardEl.replaceChildren(h('div', { class: 'reveal', style: { minHeight: '40dvh' } }, h('div', { class: 'w' }, card[0]), h('div', { style: { borderTop: '1px solid #2F4C73', paddingTop: 12, marginTop: 6, color: '#FFB4A6', fontWeight: 600, lineHeight: 1.7 } }, card.slice(1).map((w) => h('div', null, w))))); };
    const sc = h('b', null, '0'); let pts = 0;
    const act = (d, msg) => { pts += d; team.score += d; sc.textContent = pts; haptic(d > 0 ? 20 : [20, 30, 20]); if (d < 0) beep(220, .25); nextCard(); };
    nextCard();
    body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'flex', style: { justifyContent: 'space-between' } }, h('b', null, team.name, ' · ', sc), h('span', { class: 'serif', style: { fontSize: '26px' } }, clock)), cardEl,
      h('div', { class: 'row3' }, h('button', { class: 'btn', onclick: () => act(-1) }, 'Buzz'), h('button', { class: 'btn', onclick: () => act(0) }, 'Skip'), h('button', { class: 'btn accent', onclick: () => act(1) }, 'Got it'))));
    countdown(60, clock, () => { turn++; ready(); });
  };
  ready();
  return gpage('taboo', body);
});

// ---------- 5. Fishbowl ----------
route(/^play\/party\/fishbowl$/, () => {
  const body = h('div'); let bowl = [], P = [], T, roundN = 0, turn = 0, remaining = [];
  const RN = ['Describe it', 'One word only', 'Act it out'];
  const collect = (players) => { P = players; bowl = []; let i = 0;
    const ask = () => { if (i >= P.length) return startGame(); const p = P[i]; const ins = [0, 1, 2].map(() => h('input', { placeholder: 'A name or thing' }));
      body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal light', style: { minHeight: 'auto' } }, h('div', { class: 'k' }, 'Pass to'), h('div', { class: 'w' }, p), h('div', { class: 'muted' }, 'Write 3 names secretly: celebrities, characters, people you all know, things.')), ...ins, h('button', { class: 'btn primary block', onclick: () => { const v = ins.map((x) => x.value.trim()).filter(Boolean); if (v.length < 3) return toast('Write all 3'); bowl.push(...v); i++; ask(); } }, 'Into the bowl'))); };
    ask(); };
  const startGame = () => { const sh = shuffle(P); T = [{ name: 'Team A', score: 0, p: sh.filter((_, i) => i % 2 === 0) }, { name: 'Team B', score: 0, p: sh.filter((_, i) => i % 2) }]; roundN = 0; remaining = shuffle(bowl); ready(); };
  const ready = () => { const team = T[turn % 2]; const giver = team.p[Math.floor(turn / 2) % team.p.length];
    body.replaceChildren(h('div', { class: 'stack fade-in' }, teamsUI(T), h('div', { class: 'small muted center' }, 'Team A: ' + T[0].p.join(', ') + ' · Team B: ' + T[1].p.join(', ')), h('div', { class: 'reveal light', style: { minHeight: 'auto' } }, h('div', { class: 'k' }, 'Round ' + (roundN + 1) + ': ' + RN[roundN]), h('div', { class: 'w' }, giver), h('div', { class: 'muted' }, team.name + ' · ' + remaining.length + ' left in the bowl')), h('button', { class: 'btn accent block', onclick: () => play(team) }, 'Start 45s'))); };
  const play = (team) => { const clock = h('span'); const w = h('div', { class: 'w' }); let cur;
    const draw = () => { if (!remaining.length) { tm.stop(); return roundOver(); } cur = remaining.pop(); w.textContent = cur; };
    body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'flex', style: { justifyContent: 'space-between' } }, h('b', null, RN[roundN]), h('span', { class: 'serif', style: { fontSize: '26px' } }, clock)), h('div', { class: 'reveal' }, w),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => { remaining.unshift(cur); draw(); } }, 'Skip'), h('button', { class: 'btn accent', onclick: () => { team.score++; haptic(20); draw(); } }, 'Got it'))));
    const tm = countdown(45, clock, () => { remaining.push(cur); remaining = shuffle(remaining); turn++; ready(); }); draw(); };
  const roundOver = () => { roundN++; turn++; if (roundN >= 3) return body.replaceChildren(h('div', { class: 'stack fade-in' }, teamsUI(T), h('div', { class: 'reveal coral' }, h('div', { class: 'w' }, T[0].score === T[1].score ? 'Tie!' : (T[0].score > T[1].score ? T[0] : T[1]).name + ' wins')), h('button', { class: 'btn primary block', onclick: () => playersSetup(body, { min: 4, onStart: collect }) }, 'New game')));
    remaining = shuffle(bowl); body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal light' }, h('div', { class: 'k' }, 'Bowl refilled'), h('div', { class: 'w' }, 'Round ' + (roundN + 1)), h('div', null, RN[roundN])), h('button', { class: 'btn primary block', onclick: ready }, 'Continue'))); };
  playersSetup(body, { min: 4, onStart: collect });
  return gpage('fishbowl', body);
});

// ---------- 6. Spymaster ----------
route(/^play\/party\/spymaster$/, () => {
  const body = h('div');
  const newGame = () => {
    const words = shuffle(D.SPY_WORDS).slice(0, 25); const key = shuffle([...Array(9).fill('red'), ...Array(8).fill('blue'), ...Array(7).fill('neu'), 'bomb']);
    const shown = Array(25).fill(false); let spy = false, turn = 'red', over = null;
    const left = (c) => key.filter((k, i) => k === c && !shown[i]).length;
    const draw = () => body.replaceChildren(h('div', { class: 'stack' },
      h('div', { class: 'flex', style: { justifyContent: 'space-between' } }, h('span', { class: 'pill', style: { background: '#FF5A3C', color: '#fff' } }, 'Coral ' + left('red')), h('b', null, over || (turn === 'red' ? 'Coral\'s turn' : 'Blue\'s turn')), h('span', { class: 'pill', style: { background: '#3D7BFF', color: '#fff' } }, 'Blue ' + left('blue'))),
      h('div', { class: 'grid5' }, words.map((w, i) => h('button', { class: (shown[i] ? key[i] + ' revealed' : '') + (spy && !shown[i] ? ' k-' + key[i] : ''), onclick: () => tap(i) }, w))),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn' + (spy ? ' primary' : ''), onclick: async () => { if (!spy && !(await confirmSheet('Spymaster view', 'Only Spymasters should look. Show the key?', 'Show key', false))) return; spy = !spy; draw(); } }, spy ? 'Hide key' : 'Spymaster view'), h('button', { class: 'btn', onclick: () => { turn = turn === 'red' ? 'blue' : 'red'; draw(); } }, 'End turn')),
      over ? h('button', { class: 'btn accent block', onclick: newGame }, 'New game') : null));
    const tap = (i) => { if (shown[i] || over || spy) return; shown[i] = true; haptic(15); const k = key[i];
      if (k === 'bomb') over = (turn === 'red' ? 'Blue' : 'Coral') + ' wins (bomb!)'; else if (!left('red')) over = 'Coral wins!'; else if (!left('blue')) over = 'Blue wins!'; else if (k !== turn) turn = turn === 'red' ? 'blue' : 'red';
      if (over) { spy = true; beep(880, .3); } draw(); };
    draw();
  };
  newGame();
  return gpage('spymaster', body);
});

// ---------- 7. Scribble Telephone ----------
function drawPad() {
  const cv = h('canvas', { class: 'draw', width: 800, height: 800 }); const ctx = cv.getContext('2d'); ctx.lineCap = ctx.lineJoin = 'round'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 800, 800);
  let color = '#14130F', size = 8, drawing = false, last, hist = [];
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 800 / r.width, (e.clientY - r.top) * 800 / r.height]; };
  cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); hist.push(ctx.getImageData(0, 0, 800, 800)); if (hist.length > 20) hist.shift(); drawing = true; last = pos(e); ctx.beginPath(); ctx.arc(...last, size / 2, 0, 7); ctx.fillStyle = color; ctx.fill(); };
  cv.onpointermove = (e) => { if (!drawing) return; const p = pos(e); ctx.strokeStyle = color; ctx.lineWidth = size; ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; };
  cv.onpointerup = cv.onpointercancel = () => drawing = false;
  const tools = h('div', { class: 'flex wrap', style: { justifyContent: 'center' } }, ['#14130F', '#FF5A3C', '#1FCB6E', '#3D7BFF', '#FFC21A', '#ffffff'].map((c) => h('button', { 'aria-label': c === '#ffffff' ? 'Eraser' : 'Color', style: { width: 34, height: 34, borderRadius: '50%', background: c, border: '2px solid var(--line)' }, onclick: () => { color = c; size = c === '#ffffff' ? 30 : 8; } })), h('button', { class: 'btn sm', onclick: () => hist.length && ctx.putImageData(hist.pop(), 0, 0) }, 'Undo'));
  return { el: h('div', { class: 'stack' }, cv, tools), url: () => cv.toDataURL('image/jpeg', .7) };
}
route(/^play\/party\/draw$/, () => {
  const body = h('div');
  const start = (P) => { const chain = [{ t: 'text', v: pick(D.DRAW_PROMPTS), by: 'Prompt' }]; let i = 0;
    const step = () => { if (i >= P.length) return show(); const p = P[i]; const prev = chain[chain.length - 1]; const drawTurn = prev.t === 'text';
      body.replaceChildren(h('div', { class: 'stack fade-in' }, h('button', { class: 'reveal light', onclick: go1 }, h('div', { class: 'k' }, 'Pass to'), h('div', { class: 'w' }, p), h('div', { class: 'muted' }, drawTurn ? 'You\'ll draw' : 'You\'ll guess the drawing'))));
      function go1() { if (drawTurn) { const pad = drawPad(); body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'card center' }, h('div', { class: 'small dim' }, 'Draw this'), h('div', { class: 'serif', style: { fontSize: '24px' } }, prev.v)), pad.el, h('button', { class: 'btn primary block', onclick: () => { chain.push({ t: 'img', v: pad.url(), by: p }); i++; step(); } }, 'Done drawing'))); }
        else { const inp = h('input', { placeholder: 'What is this?' }); body.replaceChildren(h('div', { class: 'stack fade-in' }, h('img', { src: prev.v, class: 'draw', alt: 'Drawing to guess' }), inp, h('button', { class: 'btn primary block', onclick: () => { if (!inp.value.trim()) return toast('Write a guess'); chain.push({ t: 'text', v: inp.value.trim(), by: p }); i++; step(); } }, 'Submit guess'))); setTimeout(() => inp.focus(), 100); } }
    };
    const show = () => body.replaceChildren(h('div', { class: 'stack fade-in' }, h('h2', { class: 'serif', style: { fontWeight: 500, margin: '0 4px' } }, 'The chain'), chain.map((c) => h('div', { class: 'card' }, h('div', { class: 'small dim' }, c.by), c.t === 'text' ? h('div', { class: 'serif', style: { fontSize: '24px' } }, c.v) : h('img', { src: c.v, style: { width: '100%', borderRadius: 12 }, alt: 'Drawing' }))), h('button', { class: 'btn accent block', onclick: () => start(shuffle(P)) }, 'Play again')));
    step(); };
  playersSetup(body, { min: 3, onStart: start });
  return gpage('draw', body);
});

// ---------- 8. Bluff ----------
route(/^play\/party\/bluff$/, () => {
  const body = h('div'); const score = {}; let used = [];
  const start = (P) => { P.forEach((p) => score[p] ??= 0); const pool = D.BLUFF.filter((b) => !used.includes(b[0])); const [word, real] = pick(pool.length ? pool : D.BLUFF); used.push(word); const fakes = {}; let i = 0;
    const ask = () => { if (i >= P.length) return reading(); const p = P[i]; passReveal(body, p, h('div', { class: 'stack', style: { width: '100%' } }, h('div', { class: 'w' }, word), (() => { const ta = h('textarea', { placeholder: 'Write a believable fake definition', style: { minHeight: '90px', color: 'var(--ink)' } }); ta.id = 'fk'; return ta; })(), h('p', { style: { color: 'rgba(255,255,255,.7)', margin: 0, fontSize: 13 } }, 'Tip: sound like a dictionary.')), () => { const v = $('#fk')?.value.trim(); if (!v) return toast('Write something'); fakes[p] = v; i++; ask(); }, { kicker: 'Fake definition for' }); };
    const reading = () => { const opts = shuffle([...Object.entries(fakes).map(([p, v]) => ({ p, v })), { p: null, v: real }]);
      body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'card' }, h('div', { class: 'small dim' }, 'Read these aloud'), h('div', { class: 'serif', style: { fontSize: '28px' } }, word), h('ol', { style: { paddingLeft: 20, margin: '8px 0 0' } }, opts.map((o) => h('li', { style: { marginBottom: 8 } }, o.v)))), h('button', { class: 'btn primary block', onclick: () => vote(opts) }, 'Everyone vote secretly'))); };
    const vote = (opts) => { const votes = {}; let j = 0; const nx = () => { if (j >= P.length) return result(opts, votes); const p = P[j];
      passReveal(body, p, h('div', { class: 'mc', style: { width: '100%' } }, opts.map((o, k) => h('button', { style: { color: 'var(--ink)' }, disabled: o.p === p, onclick: () => { votes[p] = k; j++; nx(); } }, (k + 1) + '. ' + o.v + (o.p === p ? ' (yours)' : '')))), () => toast('Tap an option'), { kicker: 'Which is real?' }); }; nx(); };
    const result = (opts, votes) => { Object.entries(votes).forEach(([p, k]) => { const o = opts[k]; if (o.p === null) score[p] += 2; else score[o.p] += 1; });
      body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal coral', style: { minHeight: 'auto' } }, h('div', { class: 'k' }, 'Real definition'), h('div', { class: 'w', style: { fontSize: '24px' } }, real)),
        group(...opts.filter((o) => o.p).map((o) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', null, o.p + '\'s fake'), h('span', { style: { whiteSpace: 'normal' } }, o.v)), h('div', { class: 'd' }, Object.values(votes).filter((k) => opts[k] === o).length + ' votes')))),
        sec('Scores'), group(...Object.entries(score).sort((a, b) => b[1] - a[1]).map(([p, s]) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', null, p)), h('b', { class: 'serif', style: { fontSize: '22px' } }, s)))), h('button', { class: 'btn accent block', onclick: () => start(P) }, 'Next word'))); };
    ask(); };
  playersSetup(body, { min: 3, onStart: start });
  return gpage('bluff', body);
});

// ---------- 9. Herd Mind ----------
route(/^play\/party\/herd$/, () => {
  const body = h('div'); const score = {}; const qs = shuffle(D.HERD);
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/^(the|a|an) /, '').replace(/s$/, '').trim();
  const start = (P) => { P.forEach((p) => score[p] ??= 0); const q = qs.pop() || pick(D.HERD); const ans = {}; let i = 0;
    const ask = () => { if (i >= P.length) return reveal(); const p = P[i]; passReveal(body, p, h('div', { class: 'stack', style: { width: '100%' } }, h('div', { class: 'w', style: { fontSize: '28px' } }, q), (() => { const x = h('input', { id: 'hm', placeholder: 'Your answer', style: { color: 'var(--ink)' } }); return x; })()), () => { const v = $('#hm')?.value.trim(); if (!v) return toast('Answer first'); ans[p] = v; i++; ask(); }, { kicker: 'Answer secretly' }); };
    const reveal = () => { const groups = {}; Object.entries(ans).forEach(([p, a]) => (groups[norm(a)] ||= { label: a, ps: [] }).ps.push(p)); const sorted = Object.values(groups).sort((a, b) => b.ps.length - a.ps.length); const top = sorted[0].ps.length; const tie = sorted.filter((g) => g.ps.length === top).length > 1;
      if (!tie && top > 1) sorted[0].ps.forEach((p) => score[p]++);
      const winner = Object.entries(score).find(([, s]) => s >= 8);
      body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'card' }, h('div', { class: 'small dim' }, q), h('div', { class: 'serif', style: { fontSize: '24px' } }, tie || top === 1 ? 'No herd this time' : 'The herd says: ' + sorted[0].label)),
        group(...sorted.map((g, k) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', null, g.label), h('span', null, g.ps.join(', '))), h('div', { class: 'd' }, k === 0 && !tie && top > 1 ? '+1' : '')))),
        sec('Scores (first to 8)'), group(...Object.entries(score).sort((a, b) => b[1] - a[1]).map(([p, s]) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', null, p)), h('b', { class: 'serif', style: { fontSize: '22px' } }, s)))),
        winner ? h('div', { class: 'reveal coral', style: { minHeight: 'auto' } }, h('div', { class: 'w' }, winner[0] + ' wins')) : null,
        h('button', { class: 'btn accent block', onclick: () => { if (winner) Object.keys(score).forEach((k) => score[k] = 0); start(P); } }, winner ? 'New game' : 'Next question'))); };
    ask(); };
  playersSetup(body, { min: 3, onStart: start });
  return gpage('herd', body);
});

// ---------- 10. Mafia ----------
route(/^play\/party\/mafia$/, () => {
  const body = h('div');
  const start = (P) => { const n = P.length, m = n >= 10 ? 3 : n >= 7 ? 2 : 1; const roles = shuffle([...Array(m).fill('mafia'), 'doctor', 'detective', ...Array(Math.max(0, n - m - 2)).fill('villager')]); const asg = Object.fromEntries(shuffle(P).map((p, i) => [p, roles[i]])); let i = 0;
    const DESC = { mafia: 'Each night, wake with the other Mafia and silently pick someone to eliminate.' + (m > 1 ? ' Your team: ' : ''), doctor: 'Each night, pick one person to save (can be yourself).', detective: 'Each night, point at one person. The narrator nods if they\'re Mafia.', villager: 'Find the Mafia. Vote them out during the day.' };
    const nx = () => { if (i >= P.length) return narrator(); const p = P[i++]; const r = asg[p]; passReveal(body, p, h('div', null, h('div', { class: 'w', style: { color: r === 'mafia' ? '#FFB4A6' : '#fff' } }, D.MAFIA_ROLES[r]), h('p', { style: { color: 'rgba(255,255,255,.8)' } }, DESC[r] + (r === 'mafia' && m > 1 ? P.filter((x) => asg[x] === 'mafia' && x !== p).join(', ') : ''))), nx, { kicker: 'Your role' }); };
    const alive = new Set(P);
    let nightNo = 0, playing = false; onLeave(() => { playing = false; speechSynthesis?.cancel(); });
    const NIGHT = [['Night falls on the ship. Everyone, close your eyes.', 3], ['Mafia, open your eyes. Silently agree on someone to eliminate.', 12], ['Mafia, close your eyes.', 3], ['Doctor, open your eyes. Point to someone to save. You may choose yourself.', 9], ['Doctor, close your eyes.', 3], ['Detective, open your eyes. Point to someone. The narrator will nod if they are Mafia.', 10], ['Detective, close your eyes.', 3], ['Morning arrives. Everyone, open your eyes.', 1]];
    const narrator = () => { const night = NIGHT.map((x) => x[0]); const lis = night.map((t) => h('li', null, t));
      const runVoice = async (btn) => { if (playing) { playing = false; speechSynthesis.cancel(); btn.textContent = 'Narrate the night'; lis.forEach((l) => l.classList.remove('on')); return; } playing = true; nightNo++; btn.textContent = 'Stop narrating'; keepAwake(true);
        for (let k = 0; k < NIGHT.length && playing; k++) { lis.forEach((l, j) => l.classList.toggle('on', j === k)); await say((k === 0 ? `Night ${nightNo}. ` : '') + NIGHT[k][0], 0.9); for (let s = 0; s < NIGHT[k][1] * 10 && playing; s++) await new Promise((r) => setTimeout(r, 100)); }
        if (playing) { playing = false; btn.textContent = 'Narrate the night'; sfx.pop(); } keepAwake(false); };
      body.replaceChildren(h('div', { class: 'stack fade-in' }, h('button', { class: 'btn accent block', onclick: (e) => runVoice(e.currentTarget) }, icon('vol'), 'Narrate the night'), h('div', { class: 'card' }, h('div', { class: 'small dim' }, 'The phone reads this aloud with pauses. Or read it yourself.'), h('ol', { class: 'narr', style: { paddingLeft: 20, margin: '8px 0 0', lineHeight: 1.6 } }, lis)),
        sec('Narrator only: who did what?'), h('button', { class: 'btn block', onclick: async () => { if (await confirmSheet('Show roles?', 'Only the narrator should look.', 'Show', false)) sheet('Roles', group(...P.map((p) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', { class: alive.has(p) ? '' : 'done-t' }, p)), h('div', { class: 'd' }, D.MAFIA_ROLES[asg[p]]))))); } }, 'Peek at roles'),
        sec('Alive — tap to eliminate'), h('div', { class: 'flex wrap' }, P.map((p) => h('button', { class: 'chip' + (alive.has(p) ? '' : ' on'), onclick: () => { const was = alive.has(p); was ? alive.delete(p) : alive.add(p); if (was) say(`${p} has been eliminated.`); check(); narrator(); } }, p))),
        h('div', { class: 'gap8' }), h('button', { class: 'btn primary block', onclick: day }, 'Start day discussion (3 min)')));
    };
    const day = () => { say('Good morning. Discuss what happened and vote someone out. You have three minutes.'); const clock = h('div', { class: 'timer-big' }); body.replaceChildren(h('div', { class: 'stack fade-in center' }, h('p', { class: 'muted' }, 'Announce who was eliminated (if anyone). Discuss, then vote.'), clock, h('button', { class: 'btn primary block', onclick: narrator }, 'Back to night'))); countdown(180, clock, () => { toast('Vote now!'); say('Time is up. Vote now.'); }); };
    const check = () => { const mafia = [...alive].filter((p) => asg[p] === 'mafia').length, others = alive.size - mafia; if (!mafia) say('The village wins! All the Mafia are gone.'); else if (mafia >= others) say('The Mafia wins!'); if (!mafia) sheet('Village wins!', h('p', { class: 'muted' }, 'All Mafia are out.')); else if (mafia >= others) sheet('Mafia wins!', h('p', { class: 'muted' }, 'Mafia: ' + P.filter((p) => asg[p] === 'mafia').join(', '))); };
    nx(); };
  playersSetup(body, { min: 5, title: 'Players (not counting the narrator holding the phone)', onStart: start });
  return gpage('mafia', body);
});

// ---------- 11. Categories ----------
route(/^play\/party\/cats$/, () => {
  const body = h('div');
  const round = () => { const L = pick('ABCDEFGHIJKLMNOPRSTW'.split('')); const cats = shuffle(D.CATEGORIES).slice(0, 10); const clock = h('div', { class: 'serif num center', style: { fontSize: '40px' } });
    body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal', style: { minHeight: 'auto', padding: 20 } }, h('div', { class: 'k' }, 'Letter'), h('div', { class: 'w', style: { fontSize: '72px' } }, L)), clock, h('div', { class: 'group plain' }, cats.map((c, i) => h('div', { class: 'rowi' }, h('b', { class: 'dim', style: { width: 20 } }, i + 1), h('div', { class: 't' }, h('b', { style: { fontWeight: 500 } }, c))))), h('button', { class: 'btn accent block', onclick: round }, 'New round')));
    countdown(120, clock, () => toast('Pens down!')); };
  body.append(h('div', { class: 'stack' }, h('p', { class: 'muted', style: { margin: '0 4px' } }, 'Everyone needs paper or their own Notes app.'), h('button', { class: 'btn accent block', onclick: round }, 'Roll the letter')));
  return gpage('cats', body);
});

// ---------- 12–14. Card games ----------
function cardGame(id, list, kicker, extra, key) {
  const body = h('div'); const src = () => key ? byDepth(key, list) : filt(list); let deck = shuffle(src());
  const draw = () => { if (!deck.length) deck = shuffle(src()); const t = deck.pop(); haptic(8);
    body.replaceChildren(h('div', { class: 'stack fade-in' }, h('button', { class: 'reveal', onclick: draw }, h('div', { class: 'k' }, kicker), h('div', { class: 'w', style: { fontSize: 'clamp(24px,6.5vw,36px)' } }, t), h('div', { style: { color: 'rgba(255,255,255,.7)', fontSize: 13 } }, 'Tap for next')), extra?.() || null)); };
  draw(); return gpage(id, body, key ? depthCard(() => { deck = shuffle(src()); draw(); }) : null);
}
route(/^play\/party\/mlt$/, () => cardGame('mlt', D.MOST_LIKELY, 'Who\'s most likely…', () => h('p', { class: 'center muted' }, '3… 2… 1… point!'), 'mlt'));
route(/^play\/party\/wyr$/, () => cardGame('wyr', D.WYR, 'Would you rather', null, 'wyr'));
route(/^play\/party\/tod$/, () => {
  const body = h('div');
  const show = (kind) => { const t = pick(kind === 'Truth' ? byDepth('truth', D.TRUTH) : byDepth('dare', D.DARE)); haptic(10); body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal' + (kind === 'Dare' ? ' coral' : '') }, h('div', { class: 'k' }, kind), h('div', { class: 'w', style: { fontSize: 'clamp(22px,6vw,34px)' } }, t)), pickUI())); };
  const pickUI = () => h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: () => show('Truth') }, 'Truth'), h('button', { class: 'btn accent', onclick: () => show('Dare') }, 'Dare'));
  body.append(h('div', { class: 'stack' }, h('div', { class: 'reveal light' }, h('div', { class: 'k' }, 'Your turn'), h('div', { class: 'w' }, 'Truth or Dare?')), pickUI()));
  return gpage('tod', body, depthCard());
});
route(/^play\/party\/hot$/, () => {
  const body = h('div'); let deck = [];
  const draw = () => { if (!deck.length) deck = shuffle(HOTSEAT[depth()]); const t = deck.pop(); haptic(8);
    body.replaceChildren(h('div', { class: 'stack fade-in' }, h('button', { class: 'reveal', onclick: draw }, h('div', { class: 'k' }, 'Hot Seat'), h('div', { class: 'w', style: { fontSize: 'clamp(22px,6vw,34px)' } }, t), h('div', { style: { color: 'rgba(255,255,255,.7)', fontSize: 13 } }, 'Answer, then pass the phone and tap')), h('p', { class: 'center muted small' }, 'Listen, don\'t judge. Anyone can pass.'))); };
  draw();
  return gpage('hot', body, depthCard(() => { deck = []; draw(); }));
});

// ---------- Quips (Quiplash-style) ----------
route(/^play\/party\/quips$/, () => {
  const body = h('div'); let score = {}, prompts = [];
  const start = (P) => { score = Object.fromEntries(P.map((p) => [p, 0])); prompts = shuffle(P2.QUIPS); const order = shuffle(P); let r = 0;
    const round = () => { if (r >= order.length) return final(); const a = order[r], b = order[(r + 1) % order.length]; const q = prompts[r % prompts.length]; r++; const ans = {};
      const ask = (who, next) => passReveal(body, who, (() => { const inp = h('textarea', { rows: 2, placeholder: 'Your answer', maxlength: 80, style: { marginTop: 12 } }); setTimeout(() => inp.focus(), 50); inp.oninput = () => { ans[who] = inp.value.trim(); }; return h('div', null, h('div', { class: 'w', style: { fontSize: 'clamp(20px,5.5vw,28px)' } }, q), inp); })(), () => { if (!ans[who]) ans[who] = '(nothing)'; next(); }, { kicker: 'Write something funny' });
      const vote = () => { const sides = shuffle([a, b]); const cards = sides.map((p, i) => h('button', { class: 'reveal light', style: { minHeight: 0, padding: 20 }, onclick: () => win(p) }, h('div', { class: 'k' }, 'Answer ' + (i + 1)), h('div', { class: 'w', style: { fontSize: 'clamp(20px,5.5vw,28px)' } }, ans[p])));
        body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'card center' }, h('div', { class: 'small dim' }, 'Prompt'), h('b', { style: { fontSize: 18 } }, q)), ...cards, h('p', { class: 'small dim center' }, 'Hands up for your favorite, then tap the winner.'), h('button', { class: 'btn block', onclick: () => say(q + '. Answer one: ' + ans[sides[0]] + '. Answer two: ' + ans[sides[1]]) }, icon('vol'), 'Read aloud')));
        say(q + '. Answer one: ' + ans[sides[0]] + '. Answer two: ' + ans[sides[1]]); };
      const win = (p) => { speechSynthesis?.cancel(); score[p]++; sfx.ok(); haptic(10); body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal' }, h('div', { class: 'k' }, 'Point to'), h('div', { class: 'w' }, p), h('p', { style: { color: 'rgba(255,255,255,.7)' } }, ans[p])), board(), h('button', { class: 'btn accent block', onclick: round }, r >= order.length ? 'Final scores' : 'Next round'))); };
      ask(a, () => ask(b, vote)); };
    const board = () => group(...Object.entries(score).sort((x, y) => y[1] - x[1]).map(([p, s]) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', null, p)), h('b', null, s))));
    const final = () => { const top = Object.entries(score).sort((x, y) => y[1] - x[1])[0][0]; sfx.win(); body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal coral' }, h('div', { class: 'k' }, 'Funniest person here'), h('div', { class: 'w' }, top)), board(), h('button', { class: 'btn primary block', onclick: () => start(P) }, 'Play again'))); };
    round(); };
  playersSetup(body, { min: 3, onStart: start });
  return gpage('quips', body);
});

// ---------- Pass the Bomb (hidden timer) ----------
route(/^play\/party\/bomb$/, () => {
  const body = h('div'); let tk = null; onLeave(() => clearTimeout(tk));
  const idle = () => body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal light' }, h('div', { class: 'k' }, 'Ready'), h('div', { class: 'w' }, 'Sit in a circle'), h('div', { class: 'muted' }, 'Say one thing in the category, then pass left.')), h('button', { class: 'btn accent block', onclick: go1 }, 'Start the bomb')));
  const go1 = () => { const cat = pick(P2.BOMB); const total = 25000 + Math.random() * 40000; const t0 = Date.now(); keepAwake(true);
    body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal coral', style: { minHeight: 260 } }, h('div', { class: 'k' }, 'Category'), h('div', { class: 'w' }, cat), h('div', { style: { color: 'rgba(255,255,255,.75)' } }, 'Say one, then pass')), h('button', { class: 'btn block', onclick: () => { clearTimeout(tk); keepAwake(false); idle(); } }, 'Stop')));
    const tick = () => { const el = Date.now() - t0; if (el >= total) { keepAwake(false); haptic([300, 100, 300]); try { [140, 110, 80].forEach((f, i) => setTimeout(() => beep(f, .5, .3), i * 120)); } catch { } sfx.bad();
        body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal', style: { background: '#14130F', minHeight: 260 } }, h('div', { class: 'k' }, 'Boom'), h('div', { class: 'w' }, 'You\'re out!'), h('div', { style: { color: 'rgba(255,255,255,.7)' } }, 'Whoever is holding the phone loses this round.')), h('button', { class: 'btn accent block', onclick: go1 }, 'Next round'))); return; }
      const left = 1 - el / total; beep(left < .2 ? 1100 : 900, .03, .12); tk = setTimeout(tick, Math.max(160, 900 * left + 120)); };
    tick(); };
  idle();
  return gpage('bomb', body);
});

// ---------- Trivia Night ----------
route(/^play\/party\/trivia$/, () => {
  const body = h('div'); let teams = [], deck = [], nTeams = 2;
  const setup = () => body.replaceChildren(h('div', { class: 'stack fade-in' }, h('b', { style: { margin: '0 4px' } }, 'Teams'), seg([[2, '2'], [3, '3'], [4, '4']], nTeams, (v) => nTeams = v), h('button', { class: 'btn accent block', onclick: () => { teams = Array.from({ length: nTeams }, (_, i) => ({ name: 'Team ' + (i + 1), score: 0 })); deck = shuffle(P2.TRIVIA); next(); } }, 'Start')));
  const next = () => { if (!deck.length) return over(); const [q, a, cat] = deck.pop(); const got = new Set();
    const ans = h('div', { class: 'card center', style: { display: 'none' } }, h('div', { class: 'small dim' }, 'Answer'), h('div', { class: 'serif', style: { fontSize: 28 } }, a));
    const picks = h('div', { class: 'stack', style: { display: 'none' } }, h('p', { class: 'small dim center', style: { margin: 0 } }, 'Tap every team that got it'), h('div', { class: 'row2' }, teams.map((t) => h('button', { class: 'btn', onclick: (e) => { got.has(t) ? got.delete(t) : got.add(t); e.currentTarget.classList.toggle('primary', got.has(t)); } }, t.name))), h('button', { class: 'btn accent block', onclick: () => { got.forEach((t) => t.score++); got.size ? sfx.ok() : sfx.bad(); const w = teams.find((t) => t.score >= 10); w ? over(w) : next(); } }, 'Next question'));
    const rv = h('button', { class: 'btn primary block', onclick: () => { ans.style.display = ''; picks.style.display = ''; rv.remove(); sfx.pop(); } }, 'Reveal answer');
    body.replaceChildren(h('div', { class: 'stack fade-in' }, teamsUI(teams), h('div', { class: 'reveal light', style: { minHeight: 0, padding: 24 } }, h('div', { class: 'k' }, cat + ' · ' + (P2.TRIVIA.length - deck.length) + '/' + P2.TRIVIA.length), h('div', { class: 'w', style: { fontSize: 'clamp(20px,5.5vw,28px)' } }, q)), rv, ans, picks)); };
  const over = (w) => { w ||= [...teams].sort((x, y) => y.score - x.score)[0]; sfx.win(); body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal coral' }, h('div', { class: 'k' }, 'Winner'), h('div', { class: 'w' }, w.name)), teamsUI(teams), h('button', { class: 'btn primary block', onclick: setup }, 'Play again'))); };
  setup();
  return gpage('trivia', body);
});

// ---------- Never Have I Ever ----------
route(/^play\/party\/nhie$/, () => {
  const body = h('div'); let deck = [];
  const src = () => depth() === 'light' ? P2.NHIE.light : P2.NHIE[depth()];
  const draw = () => { if (!deck.length) deck = shuffle(src()); const t = deck.pop(); haptic(8);
    body.replaceChildren(h('div', { class: 'stack fade-in' }, h('button', { class: 'reveal', onclick: draw }, h('div', { class: 'k' }, 'Read it out loud'), h('div', { class: 'w', style: { fontSize: 'clamp(22px,6vw,34px)' } }, t), h('div', { style: { color: 'rgba(255,255,255,.7)', fontSize: 13 } }, 'Tap for next')), h('p', { class: 'center muted small' }, 'Done it? Put a finger down.'))); };
  draw();
  return gpage('nhie', body, depthCard(() => { deck = []; draw(); }));
});

// ---------- Paranoia ----------
route(/^play\/party\/paranoia$/, () => {
  const body = h('div'); let deck = [];
  const src = () => P2.PARANOIA[depth()];
  const turn = () => { if (!deck.length) deck = shuffle(src()); const q = deck.pop();
    body.replaceChildren(h('div', { class: 'stack fade-in' }, h('button', { class: 'reveal light', onclick: () => {
      body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal' }, h('div', { class: 'k' }, 'Read silently'), h('div', { class: 'w', style: { fontSize: 'clamp(22px,6vw,32px)' } }, q), h('div', { style: { color: 'rgba(255,255,255,.7)', fontSize: 13 } }, 'Say only a name out loud')), h('button', { class: 'btn accent block', onclick: () => flip(q) }, 'I said a name. Flip.')));
    } }, h('div', { class: 'k' }, 'Secret question'), h('div', { class: 'w' }, 'Only the reader looks'), h('div', { class: 'muted' }, 'Tap when nobody else can see')))); };
  const flip = (q) => { const heads = Math.random() < .5; haptic(20); heads ? sfx.ok() : sfx.pop();
    body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal' + (heads ? ' coral' : '') }, h('div', { class: 'k' }, heads ? 'Heads: revealed' : 'Tails: stays secret'), h('div', { class: 'w', style: { fontSize: 'clamp(22px,6vw,32px)' } }, heads ? q : 'Nobody will ever know')), h('button', { class: 'btn primary block', onclick: turn }, 'Named person goes next'))); };
  turn();
  return gpage('paranoia', body, depthCard(() => { deck = []; turn(); }));
});

// ---------- Two Truths, One Lie ----------
route(/^play\/party\/twotruths$/, () => {
  const body = h('div'); let deck = [];
  const draw = () => { if (!deck.length) deck = shuffle(P2.TWO_TRUTHS); const t = deck.pop(); const clock = h('div', { class: 'timer-big' }); let cd = null;
    body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal' }, h('div', { class: 'k' }, 'Your topic'), h('div', { class: 'w', style: { fontSize: 'clamp(22px,6vw,34px)' } }, t), h('div', { style: { color: 'rgba(255,255,255,.7)', fontSize: 13 } }, 'Two true, one made up')), clock, h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: () => { cd?.stop(); cd = countdown(30, clock, () => toast('Time to vote')); } }, 'Thinking time'), h('button', { class: 'btn', onclick: () => { cd?.stop(); draw(); } }, 'Next person'))));
    clock.textContent = '0:30'; };
  draw();
  return gpage('twotruths', body);
});
