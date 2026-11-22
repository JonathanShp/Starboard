import { h, icon, S, save, route, page, row, group, ftile, sec, seg, sheet, toast, go, pick, shuffle, fmtTime, haptic, beep, keepAwake, onLeave, idb, uid, markActive, Q, confirmSheet, promptSheet , sfx } from './core.js';
import { TOPIC_CATS, FORMATS, FRAMEWORKS, CAT_FRAME, RUBRIC, LESSONS, DRILLS } from './data-speak.js';

const CATS = Object.keys(TOPIC_CATS);
export function topicOfDay() { const d = Math.floor(Date.now() / 864e5); const cat = CATS[d % CATS.length]; const list = TOPIC_CATS[cat]; return { cat, text: list[(d * 7) % list.length] }; }
const fmt = () => FORMATS.find((f) => f.id === (S.speak.format || 'impromptu')) || FORMATS[1];
const frameFor = (cat) => FRAMEWORKS.find((f) => f.id === CAT_FRAME[cat]) || FRAMEWORKS[0];

route(/^speak$/, () => {
  const log = S.speak.log; const last = log.slice(-5);
  const avg = last.length ? (last.reduce((a, l) => a + l.avg, 0) / last.length).toFixed(1) : null;
  return page({ title: 'Speak', sub: 'Spin a topic anyone can talk about. Prep, talk, review, improve.' },
    h('div', { class: 'hero' }, h('div', { class: 'k' }, 'Impromptu practice'), h('div', { class: 'big' }, 'Spin the wheel'), h('div', { class: 'sub' }, fmt().name + ' · ' + fmt().desc), h('div', { class: 'gap16' }), h('a', { class: 'btn primary', href: '#/speak/spin' }, icon('wheel'), 'Spin')),
    sec('Format'), seg(FORMATS.map((f) => [f.id, f.name]), fmt().id, (v) => { S.speak.format = v; save(); }),
    h('div', { class: 'gap16' }),
    h('div', { class: 'row2' },
      ftile({ icon: 'users', tone: 'c', title: 'Judge mode', sub: 'Friends take turns and score each other', href: '#/speak/judge' }),
      ftile({ icon: 'bulb', tone: 'n', title: 'Lessons', sub: 'Tips, frameworks, drills', href: '#/speak/lessons' }),
      ftile({ icon: 'mic', title: 'My talks', sub: log.length ? `${log.length} talks · avg ${avg}/5` : 'Recordings & scores', href: '#/speak/history' }),
      ftile({ icon: 'list', tone: 's', title: 'All topics', sub: 'Pick one yourself', href: '#/speak/topics' })),
    sec('Tip of the day'), (() => { const all = Object.values(LESSONS).flat(); const t = all[Math.floor(Date.now() / 864e5) % all.length]; return h('div', { class: 'card' }, h('div', { class: 'tip' }, h('b', null, t[0]), h('span', { class: 'muted' }, t[1]))); })(),
  );
});

// ---------- Wheel ----------
const WCOL = ['#3D7BFF', '#FF5A3C', '#1FCB6E', '#FFC21A', '#8F63FF', '#FF4F8B', '#0FB5BA', '#14130F'];
const WINK = ['#fff', '#fff', '#fff', '#14130F', '#fff', '#fff', '#fff', '#fff'];
function drawWheel(cv, rot) {
  const ctx = cv.getContext('2d'), s = cv.width, r = s / 2, n = CATS.length, a = 2 * Math.PI / n;
  ctx.clearRect(0, 0, s, s); ctx.save(); ctx.translate(r, r); ctx.rotate(rot);
  CATS.forEach((c, i) => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r - 4, i * a, (i + 1) * a); ctx.closePath(); ctx.fillStyle = WCOL[i % 8]; ctx.fill(); ctx.save(); ctx.rotate(i * a + a / 2); ctx.textAlign = 'right'; ctx.fillStyle = WINK[i % 8]; ctx.font = `600 ${s / 24}px system-ui, sans-serif`; ctx.fillText(c, r - 22, s / 70); ctx.restore(); });
  ctx.restore(); ctx.beginPath(); ctx.arc(r, r, r - 3, 0, 7); ctx.lineWidth = 6; ctx.strokeStyle = '#FFFDF8'; ctx.stroke();
}
route(/^speak\/spin$/, () => {
  const preset = Q.get('t');
  const body = h('div');
  if (preset) { showTopic(body, Q.get('c') || 'Big question', preset); return page({ title: 'Your topic', back: 'speak', large: false }, body); }
  const cv = h('canvas', { width: 720, height: 720, 'aria-label': 'Topic wheel' });
  let rot = -Math.PI / 2 - Math.PI / CATS.length, spinning = false;
  requestAnimationFrame(() => drawWheel(cv, rot));
  const btn = h('button', { class: 'btn accent', style: { minWidth: 180 } }, 'Spin');
  const spin = () => {
    if (spinning) return; spinning = true; btn.disabled = true;
    const start = rot, target = start + 6 * Math.PI * 2 + Math.random() * Math.PI * 2, T = 4200, t0 = performance.now(), a = 2 * Math.PI / CATS.length; let lastSeg = -1;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / T), e = 1 - Math.pow(1 - k, 4); rot = start + (target - start) * e; drawWheel(cv, rot);
      const seg = Math.floor(((-Math.PI / 2 - rot) % (2 * Math.PI) + 4 * Math.PI) % (2 * Math.PI) / a); if (seg !== lastSeg) { lastSeg = seg; haptic(3); }
      if (k < 1) requestAnimationFrame(step); else { spinning = false; haptic([30, 50, 30]); const cat = CATS[seg]; setTimeout(() => showTopic(body, cat), 350); }
    };
    requestAnimationFrame(step);
  };
  btn.onclick = spin; cv.onclick = spin;
  body.append(h('div', { class: 'wheel-wrap' }, h('div', { class: 'wheel-ptr' }), cv), h('div', { class: 'gap24' }), h('div', { class: 'center' }, btn), h('p', { class: 'center small dim' }, fmt().name + ' · ' + fmt().desc));
  return page({ title: 'Spin', back: 'speak', large: false }, body);
});
function showTopic(body, cat, preset) {
  let rerolls = 1;
  let text = preset || pick(TOPIC_CATS[cat]);
  const fw = frameFor(cat);
  const tEl = h('div', { class: 'topic' }, text);
  const reroll = h('button', { class: 'btn ghost sm', onclick: () => { if (!rerolls) return; rerolls--; text = pick(TOPIC_CATS[cat].filter((x) => x !== text)); tEl.textContent = text; reroll.textContent = 'No re-rolls left'; reroll.disabled = true; } }, 'Re-roll (1 left)');
  body.replaceChildren(h('div', { class: 'fade-in stack' },
    h('div', { class: 'card' }, h('span', { class: 'pill c' }, cat), tEl, h('div', { class: 'gap8' }), preset ? null : reroll),
    h('div', { class: 'card' }, h('div', { class: 'small dim', style: { fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' } }, 'Use this structure'), h('div', { class: 'serif', style: { fontSize: '21px', margin: '4px 0 8px' } }, fw.name), h('ol', { style: { margin: 0, paddingLeft: 20 }, class: 'muted' }, fw.steps.map((s) => h('li', { style: { marginBottom: 4 } }, s)))),
    h('button', { class: 'btn primary block', onclick: () => runTalk({ topic: text, cat, fw, mount: body }) }, fmt().prep ? 'Start prep · ' + fmtTime(fmt().prep) : 'Start talking'),
  ));
}

// ---------- Talk flow ----------
function runTalk({ topic, cat, fw, mount, judge, onDone }) {
  const F = fmt();
  let phase = F.prep ? 'prep' : 'talk', t = F.prep, iv, rec = null, chunks = [], recOn = !judge && S.speak.rec !== false, fillers = 0, notes = '';
  keepAwake(true);
  const stopAll = () => { clearInterval(iv); keepAwake(false); try { rec?.state === 'recording' && rec.stop(); } catch { } rec?.stream?.getTracks().forEach((x) => x.stop()); };
  onLeave(stopAll);
  const greenAt = Math.round(F.talk * 0.5), yellowAt = Math.round(F.talk * 0.75), redAt = F.talk;
  const draw = () => {
    if (phase === 'prep') {
      const big = h('div', { class: 'timer-big' }, fmtTime(t));
      const ta = h('textarea', { placeholder: 'Jot 3 keywords — not sentences', style: { minHeight: '90px' }, oninput: (e) => notes = e.target.value }, notes);
      const recT = h('label', { class: 'flex small muted' }, h('input', { type: 'checkbox', checked: recOn, style: { width: 'auto' }, onchange: (e) => { recOn = e.target.checked; S.speak.rec = recOn; save(); } }), 'Record my talk (stays on this phone)');
      mount.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'center small dim' }, 'PREP'), h('div', { class: 'topic center', style: { fontSize: '21px' } }, topic), big,
        h('div', { class: 'card small' }, h('b', null, fw.name + ': '), fw.steps.map((s) => s.split(' — ')[0]).join(' → ')), ta, judge ? null : recT,
        h('button', { class: 'btn primary block', onclick: () => { phase = 'talk'; t = 0; start(); } }, 'I\'m ready — start talking')));
      clearInterval(iv); iv = setInterval(() => { t--; big.textContent = fmtTime(t); if (t === 10) beep(660, .1); if (t <= 0) { beep(880, .3); haptic([80, 60, 80]); phase = 'talk'; t = 0; start(); } }, 1000);
    }
  };
  const start = async () => {
    clearInterval(iv); t = 0;
    if (recOn && navigator.mediaDevices?.getUserMedia && window.MediaRecorder) {
      try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); rec = new MediaRecorder(stream); rec.stream = stream; chunks = []; rec.ondataavailable = (e) => chunks.push(e.data); rec.start(); } catch { toast('Mic blocked — not recording'); rec = null; }
    }
    const big = h('div', { class: 'timer-big' }, '0:00');
    const lights = h('div', { class: 'lights' }, h('i', { class: 'g' }), h('i', { class: 'y' }), h('i', { class: 'r' }));
    const fc = h('span', null, '0');
    const stage = h('div', { class: 'card center', style: { padding: '28px 16px', transition: 'background .4s' } }, h('div', { class: 'small dim' }, rec ? '● REC' : 'TALK'), big, h('div', { class: 'gap8' }), lights, h('p', { class: 'small muted', style: { marginBottom: 0 } }, `Green at ${fmtTime(greenAt)} · Yellow ${fmtTime(yellowAt)} · Red ${fmtTime(redAt)}`));
    mount.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'topic center', style: { fontSize: '21px' } }, topic), stage,
      h('button', { class: 'btn line block', onclick: () => { fillers++; fc.textContent = fillers; haptic(5); } }, 'Filler heard (um / like) · ', fc),
      h('button', { class: 'btn primary block', onclick: finish }, 'Finish')));
    const L = lights.children;
    iv = setInterval(() => {
      t++; big.textContent = fmtTime(t);
      if (t === greenAt) { L[0].classList.add('on'); haptic(40); stage.style.background = '#E4F1E8'; }
      if (t === yellowAt) { L[1].classList.add('on'); haptic([40, 40, 40]); beep(700, .12); stage.style.background = '#FBF0D6'; }
      if (t === redAt) { L[2].classList.add('on'); haptic([100, 50, 100]); beep(900, .25); stage.style.background = '#F8E0DA'; }
      if (t > redAt + 30) finish();
    }, 1000);
  };
  const finish = async () => {
    clearInterval(iv); keepAwake(false);
    let recId = null;
    if (rec && rec.state === 'recording') { await new Promise((r) => { rec.onstop = r; rec.stop(); }); rec.stream.getTracks().forEach((x) => x.stop()); const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' }); recId = uid(); await idb.put('recs', recId, blob).catch(() => recId = null); }
    const dur = t;
    if (judge) return onDone({ dur, fillers });
    review({ topic, cat, dur, fillers, recId, notes, mount, F });
  };
  if (phase === 'prep') draw(); else start();
}
function review({ topic, cat, dur, fillers, recId, mount, F }) {
  const scores = {};
  const audioEl = recId ? h('audio', { controls: true, style: { width: '100%' } }) : null;
  if (recId) idb.get('recs', recId).then((b) => b && (audioEl.src = URL.createObjectURL(b)));
  const timing = dur < F.talk * 0.5 ? 'Short — aim to reach green. Add an example or a story.' : dur > F.talk + 15 ? 'Over time — plan your last line so you can land it.' : 'Good timing — inside the window.';
  const improve = h('input', { placeholder: 'One thing to do better next time' });
  mount.replaceChildren(h('div', { class: 'stack fade-in' },
    h('div', { class: 'hero' }, h('div', { class: 'k' }, 'Done'), h('div', { class: 'big' }, fmtTime(dur)), h('div', { class: 'sub' }, timing + (fillers ? ` · ${fillers} filler${fillers > 1 ? 's' : ''}` : ''))),
    audioEl ? h('div', { class: 'card' }, h('div', { class: 'small dim', style: { marginBottom: 8 } }, 'Listen back. Notice pace, fillers, and how you ended.'), audioEl) : null,
    sec('Rate yourself 1–5'),
    group(...RUBRIC.map(([k, q]) => { const st = h('div', { class: 'stars' }); const draw = () => st.replaceChildren(...[1, 2, 3, 4, 5].map((n) => h('button', { class: scores[k] >= n ? 'on' : '', onclick: () => { scores[k] = n; haptic(4); draw(); } }, n))); draw(); return h('div', { class: 'rowi', style: { flexWrap: 'wrap' } }, h('div', { class: 't', style: { minWidth: '160px' } }, h('b', null, k), h('span', { style: { whiteSpace: 'normal' } }, q)), st); })),
    improve,
    h('button', { class: 'btn primary block', onclick: () => {
      const vals = RUBRIC.map(([k]) => scores[k] || 3); const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      S.speak.log.push({ id: uid(), at: Date.now(), topic, cat, dur, fillers, recId, scores: vals, avg: +avg.toFixed(2), improve: improve.value }); markActive(); save();
      const weak = RUBRIC[vals.indexOf(Math.min(...vals))][0];
      const map = { Opening: 'Openings & endings', Ending: 'Openings & endings', Structure: 'Think before you speak', Delivery: 'Delivery', Presence: 'Body & presence' };
      const tip = pick(LESSONS[map[weak]]);
      mount.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'card' }, h('div', { class: 'small dim', style: { fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' } }, 'Work on: ' + weak), h('div', { class: 'gap8' }), h('div', { class: 'tip' }, h('b', null, tip[0]), h('span', { class: 'muted' }, tip[1]))),
        h('a', { class: 'btn primary block', href: '#/speak/spin', onclick: () => setTimeout(() => dispatchEvent(new HashChangeEvent('hashchange')), 0) }, 'Spin again'), h('a', { class: 'btn block', href: '#/speak/history' }, 'See my progress')));
    } }, 'Save & get a tip')));
}

// ---------- Lessons ----------
route(/^speak\/lessons$/, () => page({ title: 'Lessons', sub: 'Short, practical. Read one, then spin and try it.', back: 'speak' },
  Object.entries(LESSONS).map(([g, items]) => [sec(g), h('div', { class: 'group plain' }, items.map(([t, b]) => { const body = h('p', { class: 'muted', style: { margin: '6px 0 0', display: 'none', whiteSpace: 'normal' } }, b); return h('button', { class: 'rowi', style: { flexDirection: 'column', alignItems: 'stretch' }, onclick: () => body.style.display = body.style.display ? '' : 'none' }, h('b', null, t), body); }))]),
  sec('Frameworks'), h('div', { class: 'stack' }, FRAMEWORKS.map((f) => h('div', { class: 'card' }, h('div', { class: 'flex' }, h('b', { class: 'grow' }, f.name), h('span', { class: 'pill' }, f.best)), h('ol', { class: 'muted small', style: { margin: '8px 0 0', paddingLeft: 18 } }, f.steps.map((s) => h('li', null, s)))))),
  sec('Drills (with friends or solo)'), group(...DRILLS.map(([t, b]) => h('div', { class: 'rowi' }, h('div', { class: 'tile c' }, icon('bolt')), h('div', { class: 't' }, h('b', null, t), h('span', { style: { whiteSpace: 'normal' } }, b))))),
));

route(/^speak\/topics$/, () => page({ title: 'All topics', back: 'speak' },
  CATS.map((c) => [sec(c), h('div', { class: 'group plain' }, TOPIC_CATS[c].map((t) => h('a', { class: 'rowi', href: '#/speak/spin?t=' + encodeURIComponent(t) + '&c=' + encodeURIComponent(c) }, h('div', { class: 't' }, h('b', { style: { whiteSpace: 'normal', fontWeight: 500 } }, t)), icon('chev', 'chev'))))])));

route(/^speak\/history$/, () => {
  const log = [...S.speak.log].reverse();
  const pts = S.speak.log.slice(-20).map((l) => l.avg);
  const spark = pts.length > 1 ? (() => { const w = 320, hh = 80; const d = pts.map((v, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1) * w).toFixed(1)},${(hh - (v - 1) / 4 * (hh - 8) - 4).toFixed(1)}`).join(''); const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', `0 0 ${w} ${hh}`); s.style.width = '100%'; s.innerHTML = `<path d="${d}" fill="none" stroke="#FF5A3C" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`; return h('div', { class: 'card' }, h('div', { class: 'small dim' }, 'Average self-score (last 20)'), h('div', { class: 'gap8' }), s); })() : null;
  return page({ title: 'My talks', back: 'speak', right: log.length ? h('button', { class: 'btn sm', onclick: async () => { if (await confirmSheet('Delete all talks?', 'All ' + log.length + ' talks and their recordings will be deleted.', 'Delete all')) { S.speak.log.forEach((l) => l.recId && idb.del('recs', l.recId)); S.speak.log = []; save(); dispatchEvent(new HashChangeEvent('hashchange')); } } }, 'Delete all') : null }, spark, h('div', { class: 'gap16' }),
    log.length ? group(...log.map((l) => row({ icon: l.recId ? 'playf' : 'mic', tone: l.recId ? 'n' : 's', title: l.topic, sub: `${new Date(l.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${fmtTime(l.dur)} · ${l.avg.toFixed(1)}/5${l.fillers ? ' · ' + l.fillers + ' fillers' : ''}`, chev: false, onclick: async () => {
      const a = h('audio', { controls: true, style: { width: '100%' } }); if (l.recId) { const b = await idb.get('recs', l.recId); if (b) a.src = URL.createObjectURL(b); }
      const close = sheet(l.topic, h('div', { class: 'stack' }, l.recId ? a : h('p', { class: 'muted' }, 'No recording.'), h('div', { class: 'card small' }, RUBRIC.map(([k], i) => h('div', { class: 'flex', style: { justifyContent: 'space-between' } }, h('span', null, k), h('b', null, l.scores[i] + '/5'))), l.improve ? h('p', { style: { marginBottom: 0 } }, h('b', null, 'Next time: '), l.improve) : null),
        h('button', { class: 'btn block', onclick: async () => { if (await confirmSheet('Delete this talk?', 'The recording will be deleted.')) { if (l.recId) idb.del('recs', l.recId); S.speak.log = S.speak.log.filter((x) => x.id !== l.id); save(); close(); dispatchEvent(new HashChangeEvent('hashchange')); } } }, 'Delete')));
    } }))) : h('div', { class: 'empty' }, 'No talks yet. Spin one!'));
});

// ---------- Judge mode (friends) ----------
route(/^speak\/judge$/, () => {
  const J = (S.speak.judge ||= { players: [], scores: {}, turn: 0 });
  const body = h('div');
  const setup = () => {
    const inp = h('input', { placeholder: 'Add a player name' });
    const add = () => { const n = inp.value.trim(); if (n && !J.players.includes(n)) { J.players.push(n); J.scores[n] ||= []; save(); } inp.value = ''; setup(); setTimeout(() => body.querySelector('input')?.focus(), 0); };
    inp.onkeydown = (e) => { if (e.key === 'Enter') add(); };
    body.replaceChildren(h('div', { class: 'stack' }, h('p', { class: 'muted', style: { margin: '0 4px' } }, 'Each player spins and talks. Everyone else scores them 1–10. Highest average wins.'),
      h('div', { class: 'flex' }, inp, h('button', { class: 'btn primary sm', onclick: add }, 'Add')),
      J.players.length ? group(...J.players.map((p) => { const sc = J.scores[p] || []; return h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', null, p), h('span', null, sc.length ? `${sc.length} talks · avg ${(sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(1)}` : 'No talks yet')), h('button', { class: 'iconbtn', onclick: () => { J.players = J.players.filter((x) => x !== p); save(); setup(); }, 'aria-label': 'Remove' }, icon('x'))); })) : null,
      J.players.length >= 2 ? h('button', { class: 'btn accent block', onclick: turn }, `Start · ${J.players[J.turn % J.players.length]} goes first`) : h('p', { class: 'small dim center' }, 'Add at least 2 players'),
      J.players.length ? h('button', { class: 'btn ghost', onclick: () => { J.scores = Object.fromEntries(J.players.map((p) => [p, []])); J.turn = 0; save(); setup(); } }, 'Reset scores') : null));
  };
  const turn = () => {
    const sp = J.players[J.turn % J.players.length];
    const cat = pick(CATS), topic = pick(TOPIC_CATS[cat]);
    body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'reveal' }, h('div', { class: 'k' }, sp + '\'s topic'), h('div', { class: 'w', style: { fontSize: '28px' } }, topic), h('span', { class: 'pill c' }, cat)),
      h('button', { class: 'btn primary block', onclick: () => runTalk({ topic, cat, fw: frameFor(cat), mount: body, judge: true, onDone: ({ dur, fillers }) => scoreIt(sp, dur, fillers) }) }, 'Go')));
  };
  const scoreIt = (sp, dur, fillers) => {
    const judges = J.players.filter((p) => p !== sp); const vals = {};
    const draw = () => body.replaceChildren(h('div', { class: 'stack fade-in' }, h('div', { class: 'card center' }, h('div', { class: 'small dim' }, sp + ' talked for'), h('div', { class: 'big-num' }, fmtTime(dur)), fillers ? h('div', { class: 'small muted' }, fillers + ' fillers') : null),
      sec('Judges: score 1–10'), group(...judges.map((j) => h('div', { class: 'rowi' }, h('div', { class: 't' }, h('b', null, j)), h('div', { class: 'flex' }, h('button', { class: 'iconbtn', onclick: () => { vals[j] = Math.max(1, (vals[j] || 7) - 1); draw(); } }, '−'), h('b', { class: 'serif num', style: { fontSize: '24px', minWidth: 30, textAlign: 'center' } }, vals[j] || 7), h('button', { class: 'iconbtn', onclick: () => { vals[j] = Math.min(10, (vals[j] || 7) + 1); draw(); } }, '+'))))),
      h('button', { class: 'btn primary block', onclick: () => { const avg = judges.reduce((a, j) => a + (vals[j] || 7), 0) / judges.length; J.scores[sp].push(+avg.toFixed(1)); J.turn++; save(); toast(`${sp}: ${avg.toFixed(1)}`); setup(); } }, 'Submit scores')));
    draw();
  };
  setup();
  return page({ title: 'Judge mode', back: 'speak' }, body);
});
