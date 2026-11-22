// Animated "How to play" demos: a few auto-advancing scenes, then the written steps.
import { h, icon, S, save, sheet } from './core.js';

// tiny visual vocabulary for scenes
const ph = (text, style) => h('div', { class: 'ph', style }, text);
const avs = (names, hl = -1) => h('div', { class: 'row' }, names.map((n, i) => h('div', { class: 'av' + (i === hl || (Array.isArray(hl) && hl.includes(i)) ? ' hl' : '') }, n)));
const bub = (...t) => h('div', { class: 'row' }, t.map((x, i) => h('div', { class: 'pop', style: { background: '#fff', color: '#14130F', padding: '8px 12px', borderRadius: '16px 16px 16px 4px', fontWeight: 800, fontSize: '14px', animationDelay: i * 0.35 + 's' } }, x)));
const big = (t, style) => h('b', { class: 'pop', style: { fontSize: '54px', ...style } }, t);
const ic = (n, cls = '') => h('div', { class: cls, style: { width: '72px', height: '72px', borderRadius: '22px', background: 'rgba(255,255,255,.2)', display: 'grid', placeItems: 'center' } }, icon(n, 'x'));
const tag = (t, bg = '#fff', fg = '#14130F') => h('span', { style: { background: bg, color: fg, padding: '6px 12px', borderRadius: '99px', fontWeight: 900, fontSize: '14px' } }, t);

export const DEMOS = {
  quips: [
    [() => avs(['A', 'B', 'C', 'D'], [0, 1]), 'Two players, one prompt', 'Each types an answer in secret.'],
    [() => bub('a ship called Floaty', 'the SS Maybe'), 'Read them out', 'The phone reads both answers aloud.'],
    [() => avs(['A', 'B', 'C', 'D'], [2, 3]), 'The room votes', 'Hands up. Tap the winner for a point.'],
  ],
  bomb: [
    [() => ph('THINGS AT THE BEACH', { fontSize: '13px' }), 'Say one, pass it', 'One answer in the category, then hand it left.'],
    [() => big('?'), 'The timer is hidden', 'It ticks faster near the end.'],
    [() => big('Boom'), 'Holding it? You lose', 'Start the next round.'],
  ],
  trivia: [
    [() => h('div', { class: 'row' }, tag('Team 1'), tag('Team 2', '#3D7BFF', '#fff')), 'Teams', 'Two to four teams.'],
    [() => bub('the Pacific!'), 'Answer out loud', 'Agree on one answer per team.'],
    [() => big('10'), 'First to 10', 'Tap Reveal, then tap who got it.'],
  ],
  nhie: [
    [() => big('5'), 'Five fingers up', 'Everyone starts with five.'],
    [() => bub('…I have'), 'Done it? Finger down', 'Share the story if you want.'],
    [() => h('div', { class: 'row' }, tag('Light'), tag('Closer', '#FF5A3C', '#fff'), tag('Deep', '#14130F', '#fff')), 'Pick the depth', 'Anyone can pass.'],
  ],
  paranoia: [
    [() => avs(['A', 'B', 'C', 'D'], 0), 'Read it silently', 'Answer with just a name.'],
    [() => big('?'), 'Flip', 'Heads: everyone hears the question. Tails: secret forever.'],
  ],
  twotruths: [
    [() => h('div', { class: 'row' }, tag('True'), tag('True'), tag('Lie', '#FF5A3C', '#fff')), 'Three statements', 'Two true, one made up.'],
    [() => avs(['A', 'B', 'C', 'D'], [1, 2, 3]), 'Find the lie', 'One point for everyone you fool.'],
  ],
  hot: [
    [() => avs(['A', 'B', 'C', 'D'], 0), 'One person in the Hot Seat', 'Whoever holds the phone reads the question out loud.'],
    [() => bub('honestly…'), 'Answer for real', 'Everyone else listens. No judging, one follow-up allowed.'],
    [() => h('div', { class: 'row' }, tag('Light'), tag('Closer', '#FF5A3C', '#fff'), tag('Deep', '#14130F', '#fff')), 'Pick the depth', 'Light for strangers, Deep for real talk. Anyone can pass.'],
  ],
  race: [
    [() => ph('SUNBURN', { fontSize: '16px' }), 'Explain the word', 'Don\'t say it, or any part of it.'],
    [() => h('div', { class: 'row' }, tag('Got it +1', '#1FCB6E', '#fff'), tag('Skip −1', '#FF5A3C', '#fff')), '60 seconds', 'Every word your team gets moves you one step.'],
    [() => bub('ME!', 'no, me!'), 'Last word is open', 'When time runs out, any team can steal it.'],
    [() => big('Finish'), 'First to the finish wins', 'Choose a short, normal or long board.'],
  ],
  opoly: [
    [() => h('div', { class: 'row' }, tag('2'), tag('+'), tag('4'), tag('= 6', '#1FCB6E', '#fff')), 'Roll and sail', 'Move around the Caribbean. Passing Embark pays $200.'],
    [() => h('div', { class: 'row' }, tag('Buy $140', '#14130F', '#fff'), tag('Pass')), 'Buy what you land on', 'Or pass. Owners collect rent from everyone else.'],
    [() => h('div', { class: 'row' }, tag('Full set', '#E0569B', '#fff'), tag('+ cabins', '#1FA85A', '#fff')), 'Own a color set', 'Rent doubles and you can build cabins, then a resort.'],
    [() => big('$0'), 'Last one standing wins', 'Trade, mortgage and bankrupt your friends.'],
  ],
  isle: [
    [() => h('div', { class: 'row' }, tag('Timber', '#2E8B57', '#fff'), tag('Clay', '#D0623F', '#fff'), tag('Wool', '#9AD16B'), tag('Grain', '#F2C14E'), tag('Stone', '#8C96A3', '#fff')), 'Five resources', 'Each island hex produces one.'],
    [() => big('8'), 'Roll the dice', 'Hexes with that number pay everyone with a town touching them.'],
    [() => h('div', { class: 'row' }, tag('Road'), tag('Town'), tag('City')), 'Build and expand', 'Spend resources. Trade with friends or the bank.'],
    [() => big('10'), 'First to 10 points', 'Towns 1, cities 2, plus bonus cards.'],
  ],
  imposter: [
    [() => avs(['A', 'B', 'C', 'D'], [0, 1, 3]), 'Everyone sees the word', 'Except one person: the Imposter. They only see the category.'],
    [() => ph('PIZZA', { fontSize: '18px' }), 'Pass, peek, hide', 'Each person looks at the phone alone, then passes it on.'],
    [() => bub('cheesy', 'round', 'um… hot?'), 'One clue each', 'Not too obvious, not too vague. Go around 2–3 times.'],
    [() => avs(['A', 'B', 'C', 'D'], 2), 'Vote out the faker', 'Caught? The Imposter gets one guess at the word to steal the win.'],
  ],
  forehead: [
    [() => h('div', { class: 'tilt' }, ph('PENGUIN', { fontSize: '16px' })), 'Phone on your forehead', 'Screen facing your friends. You can\'t see the word.'],
    [() => bub('black & white!', 'can\'t fly!', 'waddles'), 'Friends shout clues', 'Or act it out. Anything goes except saying the word.'],
    [() => h('div', { class: 'row' }, tag('Tilt down = Got it', '#1FCB6E', '#fff'), tag('Tilt up = Pass', '#FF5A3C', '#fff')), 'Tilt to answer', 'No tilt sensor? Tap the right side for got it, left side to pass.'],
    [() => big('60s'), 'Beat the high score', 'Most words in 60 seconds wins. Pass the phone.'],
  ],
  wave: [
    [() => h('div', { class: 'row' }, tag('COLD'), h('div', { style: { width: '80px', height: '6px', borderRadius: '9px', background: '#fff' } }), tag('HOT')), 'A scale between two extremes', 'A hidden target sits somewhere on it.'],
    [() => ph('Target: ¾ of the way to HOT', { fontSize: '12px' }), 'The Psychic peeks', 'Only they see where the target is.'],
    [() => bub('"Soup"'), 'One clue', 'They say one thing that sits at that spot on the scale.'],
    [() => big('+4'), 'Move the needle', 'Their team drags the needle. Bullseye 4, close 3, near 2. First to 10.'],
  ],
  taboo: [
    [() => ph(h('div', null, h('div', { style: { fontSize: '17px' } }, 'PIZZA'), h('div', { style: { fontSize: '11px', color: '#FF5A3C', marginTop: '6px', lineHeight: 1.3 } }, 'cheese · slice · Italy · pepperoni'))), 'Describe the word', 'Get your team to say the big word.'],
    [() => ic('x'), 'Never say the red words', 'Or any part of them. No rhymes, no "sounds like".'],
    [() => tag('BUZZ!', '#FF5A3C', '#fff'), 'The other team watches', 'They tap Buzz if a forbidden word slips out.'],
    [() => h('div', { class: 'row' }, tag('Correct +1', '#1FCB6E', '#fff'), tag('Buzz −1', '#FF5A3C', '#fff'), tag('Skip 0')), 'Score as many as you can', 'Teams take turns against the clock.'],
  ],
  fishbowl: [
    [() => h('div', { class: 'row' }, ['Beyoncé', 'Shrek', 'Mr. Cohen'].map((x) => tag(x))), 'Everyone writes 3 names', 'Famous people, characters, people you all know.'],
    [() => h('div', null, big('1'), h('div', { class: 'cap' }, 'Describe with any words')), 'Round 1', ''],
    [() => h('div', null, big('2'), h('div', { class: 'cap' }, 'ONE word only')), 'Round 2', ''],
    [() => h('div', null, big('3'), h('div', { class: 'cap' }, 'Act it out, no sounds')), 'Round 3', 'Same names all game, so remember the clues from earlier rounds.'],
  ],
  spymaster: [
    [() => h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5,18px)', gap: '4px' } }, [...Array(25)].map((_, i) => h('i', { style: { width: '18px', height: '18px', borderRadius: '4px', background: [3, 7, 11, 18].includes(i) ? '#FF5A3C' : [1, 9, 15].includes(i) ? '#3D7BFF' : i === 22 ? '#14130F' : '#fff' } }))), '25 words, two teams', 'Each team has a Spymaster.'],
    [() => ph('THE KEY'), 'Spymasters see the key', 'Which words belong to which team, and where the bomb is.'],
    [() => bub('"Ocean, 2"'), 'One word + a number', 'The number says how many words it links.'],
    [() => tag('BOMB = instant loss', '#14130F', '#fff'), 'Guess carefully', 'Wrong color ends your turn. The bomb ends the game.'],
  ],
  draw: [
    [() => ph('a cat surfing'), 'Get a prompt and draw it', ''],
    [() => ph(icon('pen')), 'Next player sees only the drawing', 'They write what they think it is.'],
    [() => ph('a dog skiing?'), 'Next player draws the guess', 'And so on around the group.'],
    [() => big('?!'), 'Watch it fall apart', 'At the end you see how the prompt changed. Bad drawers are the best.'],
  ],
  bluff: [
    [() => ph('SNOLLY­GOSTER', { fontSize: '12px' }), 'A real weird word', 'Nobody knows what it means. Probably.'],
    [() => bub('"a small snow lizard"'), 'Write a fake meaning', 'Make it sound like a real dictionary.'],
    [() => h('div', { class: 'row' }, tag('A'), tag('B'), tag('C'), tag('D')), 'Mixed with the real one', 'Someone reads them all out loud.'],
    [() => h('div', { class: 'row' }, tag('Pick real +2', '#1FCB6E', '#fff'), tag('Fool someone +1', '#3D7BFF', '#fff')), 'Vote secretly', ''],
  ],
  herd: [
    [() => ph('Name a pizza topping', { fontSize: '13px' }), 'One question', ''],
    [() => avs(['Ham', 'Chz', 'Chz', 'Egg']), 'Everyone answers secretly', ''],
    [() => avs(['Ham', 'Chz', 'Chz', 'Egg'], [1, 2]), 'Match the majority', 'You only score if you said the most popular answer. First to 8.'],
  ],
  mafia: [
    [() => ic('moon'), 'Secret roles', 'Mafia, Doctor, Detective and Villagers.'],
    [() => bub('Mafia, wake up…'), 'The phone narrates', 'At night everyone closes their eyes. Each role wakes when called.'],
    [() => avs(['A', 'B', 'C', 'D', 'E'], 3), 'Day: argue and vote', 'Vote someone out. Village wins when the Mafia is gone.'],
  ],
  cats: [
    [() => big('B'), 'A random letter', ''],
    [() => h('div', { class: 'row' }, ['Food', 'Animal', 'Country', 'Movie'].map((x) => tag(x))), '10 categories, 2 minutes', 'Write an answer for each that starts with the letter.'],
    [() => h('div', { class: 'row' }, tag('Banana', '#1FCB6E', '#fff'), tag('Bear', '#FF5A3C', '#fff')), 'Only unique answers score', 'If someone else wrote it too, nobody gets the point.'],
  ],
  mlt: [
    [() => ph('Most likely to miss the boat', { fontSize: '12px' }), 'Read the prompt', ''],
    [() => big('3·2·1'), 'Count down', ''],
    [() => avs(['A', 'B', 'C', 'D'], 1), 'Everyone points', 'Most fingers explains themselves.'],
  ],
  wyr: [
    [() => h('div', { class: 'row' }, tag('Fly', '#3D7BFF', '#fff'), tag('or'), tag('Be invisible', '#FF5A3C', '#fff')), 'Two options', ''],
    [() => avs(['A', 'B', 'C', 'D'], [0, 1]), 'Pick a side', ''],
    [() => big('20s'), 'Defend it', 'One person per side argues. The other side can switch.'],
  ],
  tod: [
    [() => h('div', { class: 'row' }, tag('Truth', '#3D7BFF', '#fff'), tag('Dare', '#FF5A3C', '#fff')), 'Pick one', ''],
    [() => ph('Show your last photo', { fontSize: '12px' }), 'Do it', ''],
    [() => tag('1 pass per game'), 'Pass once', 'Nobody has to do anything they\'re not comfortable with.'],
  ],
  sudoku: [
    [() => h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,30px)', gap: '3px' } }, [5, 3, '', 6, '', '', '', 9, 8].map((n) => h('i', { style: { width: '30px', height: '30px', borderRadius: '6px', background: '#fff', color: '#14130F', display: 'grid', placeItems: 'center', fontStyle: 'normal', fontWeight: 900 } }, String(n)))), 'Fill the grid with 1–9', ''],
    [() => h('div', { class: 'row' }, tag('Row'), tag('Column'), tag('Box')), 'No repeats', 'Each number appears once in every row, column and 3×3 box.'],
    [() => tag('Tap a cell, then a number'), 'How to play', 'Mistakes show in red. Tap Hint if you\'re stuck.'],
  ],
  '2048': [
    [() => h('div', { class: 'row' }, tag('2'), tag('+'), tag('2'), tag('='), tag('4', '#FFC21A')), 'Swipe to slide all tiles', 'Matching numbers merge into one.'],
    [() => big('2048'), 'Reach 2048', 'Keep your biggest tile in a corner.'],
  ],
  word: [
    [() => h('div', { class: 'row' }, ['C', 'R', 'A', 'N', 'E'].map((x, i) => tag(x, ['#1FCB6E', '#8C969F', '#FFC21A', '#8C969F', '#1FCB6E'][i], i === 2 ? '#14130F' : '#fff'))), 'Guess the 5-letter word', 'You get 6 tries.'],
    [() => h('div', { class: 'row' }, tag('Green = right spot', '#1FCB6E', '#fff'), tag('Yellow = wrong spot', '#FFC21A'), tag('Grey = not in it', '#8C969F', '#fff')), 'Read the colors', ''],
  ],
  mines: [
    [() => ic('flag'), 'Clear the board', 'Tap to open squares without hitting a mine.'],
    [() => big('3'), 'Numbers count neighbours', 'A 3 means three of the eight squares around it are mines.'],
    [() => tag('Long-press to flag'), 'Flag the mines', ''],
  ],
  chess: [
    [() => ic('knight'), 'Tap or drag to move', 'Legal moves show as dots.'],
    [() => tag('Blunder check ON', '#FF5A3C', '#fff'), 'Blunder guard', 'If your move loses a lot, Starboard warns you first so you can take it back.'],
    [() => h('div', { class: 'row' }, tag('Hint'), tag('Undo'), tag('Review')), 'Learn from every game', 'After the game, Review shows your mistakes and the better move.'],
  ],
};

export function howTo(id, { color = '#14130F', title, rules, onDone } = {}) {
  const scenes = DEMOS[id] || [];
  const stage = h('div', { class: 'stage-demo', style: { '--c': color } });
  const dots = h('div', { class: 'dots' }, scenes.map(() => h('i')));
  let i = -1, iv;
  const els = scenes.map(([v, t, c]) => h('div', { class: 'scene' }, v(), h('b', { style: { fontSize: '22px' } }, t), c ? h('div', { class: 'cap' }, c) : null));
  stage.append(...els);
  const show = (n) => { els.forEach((e, k) => { e.classList.toggle('on', k === n); e.classList.toggle('out', k < n); }); [...dots.children].forEach((d, k) => d.classList.toggle('on', k === n)); };
  const next = () => { i = (i + 1) % els.length; show(i); };
  stage.onclick = () => { clearInterval(iv); next(); iv = setInterval(next, 3200); };
  next(); iv = setInterval(next, 3200);
  const steps = String(rules || '').split(/\n\n+/).filter(Boolean);
  const body = h('div', { class: 'howto', style: { '--c': color } }, stage, dots,
    h('div', { class: 'card stack' }, steps.map((s, k) => h('div', { class: 'step' }, h('div', { class: 'no' }, String(k + 1)), h('p', { style: { whiteSpace: 'pre-line' } }, s)))),
    h('button', { class: 'btn primary block', onclick: () => close() }, 'Got it, let\'s play'));
  const close = sheet(title || 'How to play', body, { onClose: () => { clearInterval(iv); onDone?.(); } });
  S.seen = S.seen || {}; if (!S.seen[id]) { S.seen[id] = 1; save(); }
}
export const firstTime = (id) => !(S.seen && S.seen[id]);
