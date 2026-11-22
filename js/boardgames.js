// Board games: hub, shared 3D dice, Word Race (Alias-style), rule guides and a scorekeeper.
import { h, icon, S, save, route, page, sec, group, row, seg, sheet, toast, pick, shuffle, rand, haptic, beep, keepAwake, onLeave, fmtTime, confirmSheet , sfx } from './core.js';
import { howTo, firstTime } from './howto.js';
import './bg-opoly.js';
import './bg-isle.js';

export const bg = () => (S.bg ||= {});

// ---------- 3D dice ----------
// A real CSS 3D cube. dice(n) → { el, roll() → Promise<number[]> }
const ROT = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const face = (n, cls) => h('div', { class: 'face ' + cls }, Array.from({ length: 9 }, (_, i) => h('i', { class: PIPS[n].includes(i) ? 'on' : '' })));
export function dice(n = 2, { size = 54, values } = {}) {
  let spins = 0; let vals = values || Array.from({ length: n }, () => 1 + rand(6));
  const cubes = vals.map(() => h('div', { class: 'cube' }, face(1, 'f1'), face(2, 'f2'), face(3, 'f3'), face(4, 'f4'), face(5, 'f5'), face(6, 'f6')));
  const set = (c, v, k, anim) => { const [x, y] = ROT[v]; c.style.transition = anim ? `transform ${0.9 + k * 0.15}s cubic-bezier(.2,.75,.25,1)` : 'none'; c.style.transform = `rotateX(${x + spins * 360 * (k % 2 ? 1 : 2)}deg) rotateY(${y + spins * 360 * (k % 2 ? 2 : 1)}deg)`; };
  cubes.forEach((c, k) => set(c, vals[k], k, false));
  const el = h('div', { class: 'dice', style: { '--s': size + 'px' } }, cubes.map((c) => h('div', { class: 'die' }, c)));
  return {
    el, get values() { return vals; },
    roll() { spins += 2; vals = vals.map(() => 1 + rand(6)); cubes.forEach((c, k) => set(c, vals[k], k, true)); haptic([10, 30, 10, 30, 20]); sfx.dice(cubes.length);
      return new Promise((r) => setTimeout(() => r(vals), 950 + n * 150)); },
  };
}

// ---------- Hub ----------
export const BOARD = [
  ['race', 'Word Race', 'Alias-style: explain words without saying them. Race your team around the board.', 'Teams', 'bolt', 'blue'],
  ['opoly', 'Seaopoly', 'Monopoly-style: roll, buy Caribbean ports, build cabins and charge rent.', '2–6', 'wallet', 'green'],
  ['isle', 'Islanders', 'Catan-style: collect resources, trade, build roads and towns. First to 10 wins.', '2–4', 'globe', 'coral'],
  ['dice', 'Dice roller', '3D dice for any game you brought or found on the ship.', 'Any', 'grid', 'purple'],
  ['keep', 'Scorekeeper', 'Track points for any game: Uno, cards, mini golf…', 'Any', 'list', 'yellow'],
  ['rules', 'Rule guides', 'Quick rules for famous games: Uno, Monopoly, Catan, Scrabble and more.', 'Any', 'book', 'teal'],
];
route(/^play\/board$/, () => page({ title: 'Board games', sub: 'Pass-and-play on one phone. No board, no pieces, no Wi-Fi.', back: 'play' },
  h('div', { class: 'bento even' }, BOARD.map(([id, n, d, p, ic, col]) => h('a', { class: 't c-' + col, href: '#/play/board/' + id }, h('div', { class: 'flex', style: { justifyContent: 'space-between', alignItems: 'flex-start' } }, h('div', { class: 'ic' }, icon(ic)), h('span', { class: 'gp' }, p)), h('div', null, h('b', null, n), h('span', { class: 'gd' }, d))))),
));
const COLS = { blue: '#3D7BFF', green: '#1FCB6E', coral: '#FF5A3C', purple: '#8F63FF', yellow: '#E0A800', teal: '#0FB5BA' };
export function bpage(id, rules, body, { right, extra } = {}) {
  const g = BOARD.find((x) => x[0] === id); const color = COLS[g[5]];
  const help = () => howTo(id, { color, title: g[1], rules });
  if (rules && firstTime(id)) setTimeout(help, 350);
  return page({ title: g[1], back: 'play/board', large: false, right: right || (rules ? h('button', { class: 'btn sm', onclick: help }, 'How to play') : null) },
    extra || null, h('div', { class: 'gbody', style: { '--gc': color } }, body));
}

// ---------- Word Race (Alias-style) ----------
const WORDS = ('Airport Alarm Anchor Apple Astronaut Avocado Backpack Bakery Balloon Banana Bandage Barbecue Battery Beach Bicycle Birthday Blanket Blender Bookshelf Bowling Bracelet Bridge Bubble Bucket Buffet Butterfly Cactus Calendar Camera Campfire Candle Captain Carpet Castle Caterpillar Ceiling Charger Cheese Chimney Chocolate Circus Cliff Closet Cloud Coconut Compass Cookie Coral Cowboy Crab Crayon Crocodile Crown Cupcake Curtain Dentist Desert Diamond Dinosaur Dolphin Doorbell Dragon Drum Earthquake Elevator Envelope Escalator Eyebrow Factory Feather Fireworks Flashlight Flamingo Football Fountain Garage Garden Ghost Giraffe Glasses Glove Goalkeeper Grandma Guitar Hairdryer Hammer Hammock Helicopter Highway Homework Honey Horse Hospital Hotel Iceberg Igloo Island Jellyfish Jungle Kangaroo Karaoke Ketchup Keyboard Kitchen Kite Ladder Laptop Lemonade Library Lifeguard Lighthouse Lightning Lion Lipstick Lobster Lollipop Magician Magnet Mailbox Map Marathon Mermaid Microwave Mirror Monkey Moon Mosquito Mountain Mustache Necklace Newspaper Ninja Ocean Octopus Orchestra Painter Pajamas Pancake Parachute Parrot Passport Peanut Penguin Piano Picnic Pillow Pilot Pineapple Pirate Pizza Planet Playground Plumber Popcorn Postcard Pumpkin Puppet Pyramid Queen Rainbow Receipt Referee Robot Rocket Rollercoaster Sandcastle Sandwich Saxophone Scarecrow School Scissors Scuba Seagull Shadow Shark Shampoo Shower Skeleton Skyscraper Sleeping Snorkel Snowman Soccer Spaghetti Spider Sponge Stadium Starfish Statue Submarine Suitcase Sunburn Sunglasses Sunset Superhero Surfboard Sushi Swimsuit Taxi Teacher Telescope Tennis Tent Thunder Ticket Tiger Toaster Toothbrush Tornado Tractor Traffic Treasure Trophy Trumpet Tsunami Turtle Umbrella Unicorn Vacation Vampire Vacuum Volcano Waffle Waiter Wallet Waterfall Watermelon Wedding Whale Whistle Window Wizard Yoga Zebra Zipline Zombie').split(' ')
  .concat(['Seasick', 'Room service', 'Life jacket', 'Ice cream', 'Sun cream', 'Hot tub', 'Movie night', 'Water slide', 'Group chat', 'Selfie stick', 'Time zone', 'Jet lag', 'Fire alarm', 'Bunk bed', 'Road trip', 'Gift shop', 'Video game', 'Shooting star', 'Lost luggage', 'Snow day', 'Pool party', 'Magic trick', 'Haunted house', 'Treasure map', 'Tooth fairy', 'Bubble gum', 'Paper plane', 'Hide and seek', 'Rock band', 'Card trick']);
const RACE_RULES = 'Split into 2–4 teams. On your turn, one player explains words to their own team for 60 seconds.\n\nYou can say anything EXCEPT the word itself or part of it (for "Sunburn" you can\'t say sun or burn). No "rhymes with", no other languages, no spelling.\n\nGot it = +1 step on the board. Skip = −1 step.\n\nWhen time runs out, the last word is open to EVERY team: whoever shouts it first gets the step.\n\nFirst team to reach the finish wins.';
const TEAMC = ['#3D7BFF', '#FF5A3C', '#1FCB6E', '#FFC21A'];
route(/^play\/board\/race$/, () => {
  const body = h('div'); const st = bg(); let goal = st.raceGoal || 30, secs = st.raceSecs || 60, nT = st.raceTeams || 2;
  let T, turn, deck;
  const track = () => { const cells = Array.from({ length: goal + 1 }, (_, i) => h('div', { class: 'rc' + (i === goal ? ' fin' : '') + (i % 5 === 0 ? ' five' : '') }, i === goal ? icon('flag') : T.filter((t) => Math.min(goal, Math.max(0, t.pos)) === i).map((t) => h('i', { style: { background: t.c } })))); return h('div', { class: 'rtrack' }, cells); };
  const setup = () => body.replaceChildren(h('div', { class: 'stack fade-in' },
    h('b', null, 'Teams'), seg([[2, '2'], [3, '3'], [4, '4']], nT, (v) => { nT = v; st.raceTeams = v; save(); }),
    h('b', null, 'Board length'), seg([[20, 'Short'], [30, 'Normal'], [45, 'Long']], goal, (v) => { goal = v; st.raceGoal = v; save(); }),
    h('b', null, 'Seconds per turn'), seg([[45, '45'], [60, '60'], [90, '90']], secs, (v) => { secs = v; st.raceSecs = v; save(); }),
    h('button', { class: 'btn accent block', onclick: () => { T = Array.from({ length: nT }, (_, i) => ({ name: ['Blue', 'Coral', 'Green', 'Yellow'][i] + ' team', c: TEAMC[i], pos: 0 })); turn = 0; deck = shuffle(WORDS); ready(); } }, 'Start')));
  const ready = () => { const t = T[turn % T.length]; body.replaceChildren(h('div', { class: 'stack fade-in' }, track(),
    h('div', { class: 'reveal light', style: { minHeight: 'auto', padding: 24 } }, h('div', { class: 'k' }, 'Up next'), h('div', { class: 'w', style: { color: t.c } }, t.name), h('div', { class: 'muted' }, 'Pick an explainer. Your team guesses.')),
    h('button', { class: 'btn accent block', onclick: play }, 'Start ' + secs + 's turn'),
    h('button', { class: 'btn ghost block', onclick: async () => { if (await confirmSheet('Restart the race?', 'Every team goes back to the start.', 'Restart', false)) setup(); } }, 'Restart race'))); };
  const play = () => {
    const t = T[turn % T.length]; let pts = 0, ended = false; const clock = h('span', { class: 'num' }); const wordEl = h('div', { class: 'w' }); const sc = h('b', null, '0');
    const next = () => { if (!deck.length) deck = shuffle(WORDS); wordEl.textContent = deck.pop(); };
    const act = (d) => { if (ended) return; pts += d; t.pos = Math.max(0, t.pos + d); sc.textContent = (pts > 0 ? '+' : '') + pts; haptic(d > 0 ? 15 : [20, 30, 20]); if (d < 0) beep(220, .15); next(); if (t.pos >= goal) finishTurn(); };
    next(); keepAwake(true);
    body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'flex', style: { justifyContent: 'space-between' } }, h('b', { style: { color: '#fff' } }, t.name, ' · ', sc), h('span', { class: 'serif', style: { fontSize: '30px', color: '#fff' } }, clock)),
      h('div', { class: 'reveal', style: { minHeight: '36dvh' } }, h('div', { class: 'k' }, 'Explain'), wordEl),
      h('div', { class: 'row2' }, h('button', { class: 'btn', style: { height: 64 }, onclick: () => act(-1) }, 'Skip −1'), h('button', { class: 'btn accent', style: { height: 64 }, onclick: () => act(1) }, 'Got it +1'))));
    let left = secs; clock.textContent = fmtTime(left);
    const iv = setInterval(() => { left--; clock.textContent = fmtTime(left); if (left <= 5 && left > 0) beep(600, .06, .12); if (left <= 0) finishTurn(); }, 1000);
    onLeave(() => { clearInterval(iv); keepAwake(false); });
    function finishTurn() { if (ended) return; ended = true; clearInterval(iv); keepAwake(false); beep(880, .4); haptic([200, 80, 200]);
      if (t.pos >= goal) return win(t);
      const last = wordEl.textContent;
      body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal coral', style: { minHeight: 'auto', padding: 24 } }, h('div', { class: 'k' }, 'Time! Last word is open to everyone'), h('div', { class: 'w' }, last), h('div', null, 'Who shouted it first?')),
        h('div', { class: 'stack', style: { gap: 8 } }, T.map((x) => h('button', { class: 'btn block', style: { background: x.c, color: '#fff' }, onclick: () => { x.pos++; if (x.pos >= goal) return win(x); turn++; ready(); } }, x.name)), h('button', { class: 'btn block', onclick: () => { turn++; ready(); } }, 'Nobody'))));
    }
  };
  const win = (t) => { haptic([60, 40, 60, 40, 120]); beep(990, .3); body.replaceChildren(h('div', { class: 'stack fade-in' }, track(), h('div', { class: 'reveal', style: { background: t.c, minHeight: 'auto', padding: 28 } }, h('div', { class: 'k', style: { color: 'rgba(255,255,255,.8)' } }, 'Winner'), h('div', { class: 'w' }, t.name)), h('button', { class: 'btn accent block', onclick: setup }, 'Play again'))); };
  setup();
  return bpage('race', RACE_RULES, body);
});

// ---------- Dice roller ----------
route(/^play\/board\/dice$/, () => {
  const st = bg(); let n = st.diceN || 2; const wrap = h('div'); const total = h('div', { class: 'dtotal' });
  let d;
  const build = () => { d = dice(n, { size: n > 3 ? 48 : 64 }); total.textContent = ''; wrap.replaceChildren(d.el); };
  const roll = async () => { total.textContent = ''; const v = await d.roll(); total.textContent = n > 1 ? v.join(' + ') + ' = ' + v.reduce((a, b) => a + b, 0) : String(v[0]); };
  build();
  return bpage('dice', '', h('div', { class: 'stack' }, h('b', null, 'How many dice'), seg([[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], n, (v) => { n = v; st.diceN = v; save(); build(); }),
    h('button', { class: 'card dicecard', onclick: roll, 'aria-label': 'Roll' }, wrap, total, h('div', { class: 'small muted' }, 'Tap to roll'))));
});

// ---------- Scorekeeper ----------
route(/^play\/board\/keep$/, () => {
  const st = bg(); st.keep ||= { players: [], hist: [] }; const K = st.keep; const body = h('div');
  const inp = h('input', { placeholder: 'Add player or team', enterkeyhint: 'done' });
  const add = () => { const n = inp.value.trim(); if (n) { K.players.push({ n, s: 0 }); inp.value = ''; save(); draw(); } };
  inp.onkeydown = (e) => { if (e.key === 'Enter') add(); };
  const bump = (p, d) => { p.s += d; K.hist.push([K.players.indexOf(p), d]); haptic(8); save(); draw(); };
  const custom = (p) => { const i = h('input', { type: 'number', inputmode: 'numeric', placeholder: 'e.g. 35 or -10' }); const close = sheet('Add to ' + p.n, h('div', { class: 'stack' }, i, h('button', { class: 'btn primary block', onclick: () => { const v = parseInt(i.value); if (v) bump(p, v); close(); } }, 'Add'))); setTimeout(() => i.focus(), 250); };
  const draw = () => { const max = Math.max(...K.players.map((p) => p.s));
    body.replaceChildren(h('div', { class: 'stack' }, h('div', { class: 'flex' }, inp, h('button', { class: 'btn primary sm', onclick: add }, 'Add')),
      K.players.length ? h('div', { class: 'stack', style: { gap: 10 } }, K.players.map((p) => h('div', { class: 'card keep' }, h('div', { class: 'kn' }, h('b', null, p.n, p.s === max && K.players.length > 1 && max !== 0 ? h('span', { class: 'pill g', style: { marginLeft: 8 } }, 'Leading') : null), h('button', { class: 'iconbtn sm', 'aria-label': 'Remove', onclick: async () => { if (await confirmSheet('Remove ' + p.n + '?', '', 'Remove')) { K.players.splice(K.players.indexOf(p), 1); save(); draw(); } } }, icon('x'))),
        h('div', { class: 'kr' }, h('button', { class: 'btn', onclick: () => bump(p, -1) }, '−1'), h('button', { class: 'ks', onclick: () => custom(p) }, String(p.s)), h('button', { class: 'btn', onclick: () => bump(p, 1) }, '+1'), h('button', { class: 'btn', onclick: () => bump(p, 5) }, '+5'))))) : h('div', { class: 'empty' }, 'Add players to start. Tap a score to add any amount.'),
      K.players.length ? h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => { const l = K.hist.pop(); if (l && K.players[l[0]]) { K.players[l[0]].s -= l[1]; save(); draw(); } } }, 'Undo'), h('button', { class: 'btn', onclick: async () => { if (await confirmSheet('Reset all scores?', 'Players stay.', 'Reset')) { K.players.forEach((p) => p.s = 0); K.hist = []; save(); draw(); } } }, 'Reset scores')) : null)); };
  draw();
  return bpage('keep', '', body);
});

// ---------- Rule guides (short summaries in our own words) ----------
const GUIDES = [
  ['uno', 'Uno', '2–10', 'Match the top card by color or number. Get rid of all your cards first.', ['Deal 7 cards each. Flip one to start the discard pile.', 'On your turn, play a card that matches the top card\'s color, number or symbol. Can\'t play? Draw one. If it fits you can play it.', 'Skip: next player loses a turn. Reverse: change direction. Draw Two: next player draws 2 and loses their turn.', 'Wild: pick the color. Wild Draw Four: pick the color and the next player draws 4.', 'When you have one card left, say "Uno!" If someone catches you not saying it before the next turn, draw 2.', 'Scoring (optional): the winner gets points for cards left in other hands. Numbers = face value, action cards 20, wilds 50. First to 500.']],
  ['monopoly', 'Monopoly', '2–8', 'Buy property, build houses and hotels, bankrupt everyone else.', ['Everyone starts with $1,500. Roll two dice and move. Doubles = roll again; three doubles in a row = go to jail.', 'Land on an unowned property: buy it at the printed price or it goes to auction (the house rule many people skip).', 'Land on an owned property: pay rent. Own the whole color set: rent doubles on empty lots and you can build houses evenly, then a hotel.', 'Passing GO pays $200. Chance and Community Chest cards do what they say.', 'Jail: pay $50, use a Get Out of Jail Free card, or try to roll doubles (up to 3 turns).', 'Can\'t pay? Sell houses at half price and mortgage properties. Still can\'t? You\'re bankrupt and out. Last player standing wins.', 'Free Parking money is a house rule, not the official rule. It makes games longer.']],
  ['catan', 'Catan', '3–4', 'Collect resources, build roads, settlements and cities. First to 10 points wins.', ['Setup: in snake order, each player places 2 settlements, each with a road. The second settlement gives you one of each adjacent resource.', 'Each turn, roll 2 dice. Every hex with that number pays its resource to settlements (1) and cities (2) touching it.', 'Rolling a 7: anyone with more than 7 cards discards half. The roller moves the robber (that hex stops producing) and steals a card from a player next to it.', 'Costs: road = wood + brick. Settlement = wood + brick + sheep + wheat. City = 2 wheat + 3 ore. Development card = sheep + wheat + ore.', 'Settlements must be 2 edges apart from any other settlement, and connect to your road.', 'Trade with other players on your turn, or with the bank at 4:1 (3:1 or 2:1 at harbors).', 'Points: settlement 1, city 2, longest road (5+) 2, largest army (3+ knights) 2, victory point cards 1.']],
  ['scrabble', 'Scrabble', '2–4', 'Make words on the grid with letter tiles. Highest score wins.', ['Everyone draws 7 tiles. The first word must cover the center star.', 'Each new word must connect to tiles already on the board, in a straight line across or down.', 'Score = sum of letter values, with bonus squares: double/triple letter, double/triple word.', 'Use all 7 tiles in one turn = +50 bonus ("bingo").', 'You can swap tiles instead of playing (lose your turn).', 'Game ends when the bag is empty and one player is out of tiles. Subtract unplayed tiles from each player\'s score.']],
  ['jenga', 'Stacking tower', '2+', 'Pull a block, put it on top. Don\'t knock the tower over.', ['Build the tower: 18 levels of 3 blocks, each level crossed.', 'On your turn, take one block from any level below the top finished level, using only one hand.', 'Place it on top to continue building the top level.', 'You can tap blocks to find loose ones, but fix any you move before taking another.', 'Whoever makes the tower fall loses.']],
  ['connect4', 'Four in a row', '2', 'Drop discs; first to line up four wins.', ['Take turns dropping one disc into a column.', 'Discs fall to the lowest open spot.', 'Four in a row across, down or diagonal wins.', 'Tip: control the middle column, and watch for your opponent setting up two threats at once.']],
  ['checkers', 'Checkers', '2', 'Jump and capture all your opponent\'s pieces.', ['12 pieces each on the dark squares of the first 3 rows.', 'Move diagonally forward one square.', 'Capture by jumping over an opponent\'s piece into an empty square. If you can capture, you must. Keep jumping if you can.', 'Reach the far row and you become a king: kings move and jump backward too.', 'Win by capturing everything or leaving your opponent with no moves.']],
  ['spoons', 'Spoons', '3–10', 'Get four of a kind, then grab a spoon. Last without one is out.', ['Put spoons in the middle: one fewer than players.', 'Deal 4 cards each. The dealer draws from the deck, keeps or passes one card to the left, and so on around fast.', 'When you have 4 of a kind, quietly take a spoon. Once anyone grabs, everyone grabs.', 'No spoon = you get a letter (S-P-O-O-N). Spell it and you\'re out.']],
  ['crazy8', 'Crazy Eights', '2–7', 'Like Uno with a normal deck. Eights are wild.', ['Deal 5 cards each (7 for 2 players).', 'Play a card matching the top card\'s suit or rank.', 'An 8 can be played anytime; choose the new suit.', 'Can\'t play? Draw until you can (or up to 3).', 'First to empty their hand wins.']],
  ['gofish', 'Go Fish', '2–6', 'Collect sets of four by asking other players.', ['Deal 7 cards each (5 for 4+ players). The rest is the pond.', 'Ask a player for a rank you hold ("Got any 7s?"). If they have any, they give you all of them and you go again.', 'If not: "Go fish!" Draw one. If it\'s what you asked for, go again.', 'Lay down sets of 4. Most sets when the cards run out wins.']],
  ['president', 'President', '4–8', 'Get rid of your cards first to become President.', ['Deal all the cards. The player with 3 of clubs leads.', 'Play a single, pair, triple or four of a kind. Next players must play the same amount, higher rank (2 is highest). Or pass.', 'When everyone passes, the last player to play clears the pile and leads.', 'Finish order sets the ranks: President, Vice, …, Scum. Next round Scum gives their best 2 cards to the President, who gives back any 2.']],
  ['dominoes', 'Dominoes', '2–4', 'Match ends of tiles; first to play all tiles wins.', ['Each player takes 7 tiles (5 with 4 players).', 'Highest double starts.', 'Play a tile whose end matches an open end of the line.', 'Can\'t play? Draw from the boneyard (or pass if it\'s empty).', 'First out wins the round and scores the pips left in other hands.']],
];
route(/^play\/board\/rules$/, () => page({ title: 'Rule guides', sub: 'Quick rules for games you might find in the ship\'s game room.', back: 'play/board' },
  group(...GUIDES.map(([id, n, p, d]) => row({ icon: 'book', tone: 'b', title: n, sub: d, detail: p, href: '#/play/board/rules/' + id })))));
route(/^play\/board\/rules\/(\w+)$/, (id) => { const G = GUIDES.find((x) => x[0] === id); if (!G) return page({ title: 'Not found', back: 'play/board/rules' });
  return page({ title: G[1], sub: G[3], back: 'play/board/rules', large: false }, h('div', { class: 'card', style: { padding: 0 } }, h('div', { class: 'gamehead', style: { padding: '16px 16px 0' } }, h('div', { class: 'gi', style: { background: '#0FB5BA' } }, icon('book')), h('div', null, h('h1', null, G[1]), h('p', null, G[2] + ' players'))),
    h('ol', { class: 'rulelist' }, G[4].map((s) => h('li', null, s)))), h('div', { class: 'gap16' }), h('a', { class: 'btn primary block', href: '#/play/board/keep' }, 'Open the scorekeeper')); });
