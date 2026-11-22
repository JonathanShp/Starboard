// Impromptu topics: opinion/experience-based, no outside knowledge needed.
export const TOPIC_CATS = {
  'Hot take': ['Pineapple belongs on pizza.', 'Breakfast is the most overrated meal.', 'Cats are better than dogs.', 'Summer is the worst season.', 'Sequels are usually better than the original.', 'Texting is better than calling.', 'Everyone should learn to cook before 16.', 'Homework should be optional.', 'Being early is just as rude as being late.', 'Reality TV is secretly good.', 'Group projects do more harm than good.', 'The best seat on a plane is the aisle.', 'School should start at 10 a.m.', 'Spoilers don\'t actually ruin movies.', 'Fast food is better than restaurant food.', 'Video games are a real sport.', 'Board games are better than video games.', 'Cereal is a soup.', 'Socks with sandals are fine.', 'Winter vacations beat summer vacations.'],
  'Would you rather': ['Would you rather be able to fly or be invisible?', 'Would you rather live on a cruise ship forever or never travel again?', 'Would you rather know every language or play every instrument?', 'Would you rather always be 10 minutes late or always 20 minutes early?', 'Would you rather have no phone for a year or no music for a year?', 'Would you rather be famous or be rich and unknown?', 'Would you rather live in the city or the countryside?', 'Would you rather be the funniest or the smartest person in the room?', 'Would you rather explore space or the deep ocean?', 'Would you rather redo the last year or skip ahead five years?', 'Would you rather only eat sweet or only eat salty food forever?', 'Would you rather be a great speaker or a great writer?', 'Would you rather have a rewind button or a pause button for life?', 'Would you rather never get tired or never get hungry?'],
  'Personal story': ['Tell us about a time you were completely wrong.', 'The best meal you have ever had.', 'A moment you were really proud of.', 'The worst trip or travel mishap you\'ve had.', 'A teacher or coach who changed how you think.', 'The most embarrassing thing that happened to you (that you can share).', 'A time you had to make a hard decision.', 'Something you used to believe as a kid.', 'A skill you learned the hard way.', 'The best advice you ever got.', 'A time you got lost.', 'A risk you took that paid off.', 'Your favorite holiday memory.', 'A time you failed at something and what happened next.', 'A moment that made you laugh uncontrollably.'],
  'Defend it': ['Defend: naps should be required.', 'Defend: the best day of the week is Wednesday.', 'Defend: everyone should have a hobby they\'re bad at.', 'Defend: boredom is good for you.', 'Defend: losing is more valuable than winning.', 'Defend: you should travel without a plan.', 'Defend: handwriting still matters.', 'Defend: every kid should learn chess.', 'Defend: rainy days are the best days.', 'Defend: you should never check your phone first thing in the morning.', 'Defend: mistakes are underrated.', 'Defend: small talk is actually important.', 'Defend: the middle child has it best.', 'Defend: you should eat dessert first.'],
  'Hypothetical': ['You wake up as the captain of this ship. What do you do first?', 'You get $1 million but must spend it in 24 hours. How?', 'You can add one rule every school must follow. What is it?', 'You can master any skill overnight. Which one and why?', 'You can design a new holiday. What is it?', 'You can live in any time period for a week. When?', 'You are stuck on an island with three items. What are they?', 'You get to invent one new subject in school. What is it?', 'Animals can talk now. Which one would be the most annoying?', 'You run a restaurant with only one dish. What is it?', 'You can give one piece of advice to everyone on Earth. What is it?', 'You can delete one invention. What and why?', 'You are in charge of the cruise entertainment tonight. Pitch it.', 'You could be any age for one year. Which age?'],
  'Explain it': ['Explain how to win at your favorite game.', 'Explain how to make the perfect sandwich.', 'Teach us something you know a lot about.', 'Explain your morning routine and how to improve it.', 'Explain why your favorite movie is great to someone who hasn\'t seen it.', 'Explain how to make a new friend.', 'Explain how to pack for a trip like a pro.', 'Explain how to stay calm when you\'re nervous.', 'Explain your favorite sport to someone who has never seen it.', 'Explain how to beat procrastination.', 'Explain the perfect day on a cruise.', 'Explain the best way to study for a test.'],
  'Persuade': ['Persuade us to try your favorite food.', 'Persuade us to wake up early tomorrow.', 'Sell this ordinary object: a spoon.', 'Sell this: a pen that only writes on Tuesdays.', 'Persuade us to learn a new language.', 'Pitch your dream app.', 'Convince us to read more.', 'Persuade your parents to extend the vacation.', 'Sell us on your hometown.', 'Persuade us to go to bed on time.', 'Pitch a new flavor of ice cream.', 'Convince us to spend a day with no screens.'],
  'Big question': ['What makes someone a good friend?', 'Is it better to be liked or respected?', 'What does success mean to you?', 'Should you follow your passion or your talent?', 'Is it ever okay to lie?', 'What makes a place feel like home?', 'What would you tell your 10-year-old self?', 'Are people born confident or do they learn it?', 'What is one thing everyone should try once?', 'Is it better to be a big fish in a small pond or a small fish in a big pond?', 'What makes something funny?', 'What is the best age to be?', 'Do you control your luck?', 'What makes a good leader?'],
};
export const FORMATS = [
  { id: 'quick', name: 'Quick fire', prep: 15, talk: 60, desc: '15 s prep · 1 min talk. Fast reps.' },
  { id: 'impromptu', name: 'Impromptu', prep: 60, talk: 120, desc: '1 min prep · 2 min talk. The classic.' },
  { id: 'table', name: 'Table Topics', prep: 0, talk: 90, desc: 'No prep, 1–2 min. Toastmasters style.' },
  { id: 'prepared', name: 'Mini speech', prep: 180, talk: 180, desc: '3 min prep · 3 min talk. Full structure.' },
];
export const FRAMEWORKS = [
  { id: 'prep', name: 'PREP', best: 'Opinions & hot takes', steps: ['Point — say your answer in one sentence.', 'Reason — the one main "because".', 'Example — a story, a fact, or a picture.', 'Point — repeat your answer, stronger.'] },
  { id: 'ppf', name: 'Past · Present · Future', best: 'Personal topics, big questions', steps: ['Past — how it used to be / what you used to think.', 'Present — how it is now.', 'Future — where it is going, or what you\'ll do.'] },
  { id: 'psb', name: 'Problem · Solution · Benefit', best: 'Persuade, pitch, sell', steps: ['Problem — what\'s annoying or broken.', 'Solution — your idea.', 'Benefit — paint what life looks like with it.'] },
  { id: 'star', name: 'Story arc (STAR)', best: 'Personal stories', steps: ['Situation — where and when. One vivid detail.', 'Tension — what went wrong or what was at stake.', 'Action — what you did.', 'Result + lesson — how it ended and what it taught you.'] },
  { id: 'what', name: 'What · So what · Now what', best: 'Explain it, any topic', steps: ['What — describe the thing.', 'So what — why it matters.', 'Now what — what we should do about it.'] },
  { id: 'two', name: 'Both sides', best: 'Would you rather, debates', steps: ['Acknowledge the other side fairly.', 'Give your side with your best reason.', 'Example that tips the balance.', 'Decide clearly — don\'t sit on the fence.'] },
];
export const CAT_FRAME = { 'Hot take': 'prep', 'Would you rather': 'two', 'Personal story': 'star', 'Defend it': 'prep', Hypothetical: 'what', 'Explain it': 'what', Persuade: 'psb', 'Big question': 'ppf' };

export const RUBRIC = [
  ['Opening', 'Did the first sentence grab attention?'], ['Structure', 'Could someone repeat your 2–3 points?'], ['Delivery', 'Pace, volume, pauses instead of "um"'], ['Presence', 'Eye contact, posture, hands'], ['Ending', 'Did you finish strong instead of trailing off?'],
];

// Lessons: grouped tips. Each: [title, body]
export const LESSONS = {
  'Think before you speak': [
    ['Answer first, then explain', 'Lead with your conclusion in one sentence. Listeners relax when they know where you\'re going. Most people do the opposite and wander.'],
    ['Pick ONE main point', 'With 1–2 minutes you can land one idea well, not five. Ask: "If they remember one thing, what is it?"'],
    ['Use the rule of three', 'Three reasons, three examples, three words. The brain loves threes — it feels complete.'],
    ['Steal a framework', 'Don\'t invent structure under pressure. Grab PREP, Past-Present-Future, or Problem-Solution-Benefit and fill it in.'],
    ['Specific beats general', '"My grandma\'s burnt pancakes" beats "food". One concrete detail makes a story real.'],
    ['Have a "back pocket" story', 'Keep 3 stories ready (a failure, a funny moment, a proud moment). Most topics can connect to one of them.'],
  ],
  'Delivery': [
    ['Replace "um" with a pause', 'A silent pause of 1–2 seconds sounds confident. "Um" sounds unsure. Practice: every time you feel an "um" coming, close your mouth.'],
    ['Slow down by 20%', 'Nerves make you fast. Speak slower than feels natural — to the audience it sounds normal.'],
    ['End sentences down', 'Lower your pitch at the end of statements. Rising at the end makes everything sound like a question.'],
    ['Breathe at the commas', 'Short sentences give you places to breathe. Long run-on sentences make you rush and lose people.'],
    ['Vary your volume', 'Get quieter for the important line. People lean in.'],
    ['Repeat the key line', 'Say your main point at the start and again at the end, word for word.'],
  ],
  'Body & presence': [
    ['Plant your feet', 'Stand still, weight even. Swaying and pacing leak nerves. Move only with purpose.'],
    ['One person, one thought', 'Look at one person for a full sentence, then move to another. It feels like a conversation.'],
    ['Hands where they can see them', 'Gestures at waist-to-chest height. Hands in pockets or behind your back look closed off.'],
    ['Smile at the start', 'Smile before your first word. It relaxes you and the room.'],
    ['Own the silence before you start', 'Walk up, plant, pause 2 seconds, look up, then speak. It signals confidence.'],
  ],
  'Openings & endings': [
    ['Never open with "So, um, my topic is…"', 'Start with a question, a bold claim, a story ("Last summer, I…"), or a surprising fact.'],
    ['Hook formulas', '"Imagine…", "Raise your hand if…", "Here\'s something nobody tells you…", "I was wrong about…"'],
    ['Callback ending', 'End by returning to your opening image or line. It feels clever and complete.'],
    ['Finish with a clear final line', 'Plan your last sentence first. Then say it, stop, smile. Never say "So yeah… that\'s it."'],
  ],
  'Nerves': [
    ['Nerves = excitement', 'Your body reacts the same way to both. Saying "I\'m excited" out loud actually helps more than "calm down".'],
    ['Box breathing', 'In 4, hold 4, out 4, hold 4. Do two rounds before you speak.'],
    ['Focus on them, not you', 'Nerves come from thinking about how you look. Shift to: "What do they need to hear?"'],
    ['Nobody sees your nerves', 'People notice far less than you think (the "illusion of transparency").'],
  ],
};
export const DRILLS = [
  ['One-word story', 'With friends: each person adds one word to build a story. Trains thinking on your feet.'],
  ['The ban', 'Talk for 60 seconds about anything. Friends clap every time you say "um", "like", or "so".'],
  ['ABC talk', 'Talk about any topic where each sentence starts with the next letter: A, B, C…'],
  ['Object pitch', 'Grab any object nearby and sell it for 45 seconds.'],
  ['Explain to a 5-year-old', 'Pick something complicated you know and explain it with zero big words.'],
  ['Yes, and…', 'With a partner, build a story where every line starts with "Yes, and…". Great for improv confidence.'],
  ['Pause practice', 'Read a paragraph aloud and pause for a full 2 seconds at every period. Feels long, sounds great.'],
  ['Three-word summary', 'After any movie, talk, or conversation, sum it up in three words. Trains finding the core idea.'],
];
export const FILLERS = ['um', 'uh', 'like', 'so', 'you know', 'basically'];
