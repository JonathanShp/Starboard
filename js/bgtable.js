// Table view: the whole phone is the board. Players + turn buttons on top, a slim tab on the right edge opens the menu,
// and real 3D dice are thrown onto the board itself. Shared by Seaopoly and Islanders.
import { h, icon, seg, haptic } from './core.js';
import { dice } from './boardgames.js';

export const LOOKS = [['table', 'Deck table'], ['print', 'Printed board']];
const light = (c) => /^#?(fff|ffffff)$/i.test(c.replace('#', '')) || c.toUpperCase() === '#FFFFFF';

export function tableView({ bg, look, onLook, menu }) {
  const players = h('div', { class: 'tv-pl' }), acts = h('div', { class: 'tv-acts' }), tip = h('div', { class: 'tv-tip', role: 'status' });
  const hud = h('div', { class: 'tv-hud' }, players, acts, tip);
  const stage = h('div', { class: 'tv-stage' });
  const root = h('div', { class: 'tv ' + bg(look), 'data-noswipe': '' }, stage, hud, h('button', { class: 'tv-tab', 'aria-label': 'Game menu', onclick: () => openMenu() }, h('i'), h('i'), h('i')));
  document.body.append(root);
  const fit = () => { stage.style.top = hud.offsetTop + hud.offsetHeight + 8 + 'px'; };
  const ro = new ResizeObserver(() => { fit(); onResize?.(); }); ro.observe(hud); ro.observe(root);
  let onResize = null;

  function openMenu() {
    haptic(8);
    const scrim = h('div', { class: 'scrim' });
    const box = h('div', { class: 'tv-drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Game menu' });
    const close = () => { scrim.classList.remove('in'); box.classList.remove('in'); setTimeout(() => { scrim.remove(); box.remove(); }, 300); };
    scrim.onclick = close;
    const items = menu();
    box.append(h('h3', null, 'Menu'),
      h('div', { class: 'group' }, items.filter((x) => x).map(([label, ic, fn, sub]) => h('button', { class: 'rowi', onclick: () => { close(); setTimeout(fn, 60); } }, h('div', { class: 'tile' }, icon(ic)), h('div', { class: 't' }, h('b', null, label), sub ? h('span', null, sub) : null)))),
      h('div', { class: 'k' }, 'Board look'), seg(LOOKS, look, (v) => { look = v; root.className = 'tv ' + bg(v); onLook(v); }));
    document.body.append(scrim, box);
    requestAnimationFrame(() => { scrim.classList.add('in'); box.classList.add('in'); });
  }

  return {
    root, stage,
    get look() { return look; },
    set onResize(fn) { onResize = fn; },
    players(list, active) {
      players.className = 'tv-pl' + (list.length > 4 ? ' many' : '');
      players.replaceChildren(...list.map((p, i) => h('div', { class: 'tv-p' + (i === active ? ' on' : '') + (p.out ? ' out' : ''), 'aria-current': i === active ? 'true' : null },
        h('div', { class: 'av' + (light(p.c) ? ' lt' : ''), style: { background: p.c } }, p.n[0].toUpperCase()), h('div', { class: 't' }, h('b', null, p.n), h('span', null, p.v)))));
    },
    acts(list) { acts.replaceChildren(...list.filter(Boolean)); acts.hidden = !acts.children.length; fit(); },
    tip(t) { tip.textContent = t || ''; fit(); },
    close() { ro.disconnect(); root.remove(); document.querySelectorAll('.tv-drawer, .tv-drawer ~ .scrim').forEach((x) => x.remove()); },
  };
}

// A turn button. opts: { go: primary, on: toggled, sub: small second line, dis: disabled }
export const act = (label, fn, { go, on, sub, dis } = {}) => h('button', { class: 'tv-act' + (go ? ' go' : '') + (on ? ' on' : ''), onclick: fn, disabled: !!dis }, h('span', null, label), sub ? h('small', null, sub) : null);

// Dice that rest on the board. Place `el` inside the tilted plane; roll() throws them in from the player's edge.
export function boardDice(n, size, values) {
  const d = dice(n, { size, values });
  const el = h('div', { class: 'tv-dice', style: { '--s': size + 'px' } }, h('div', { class: 'tv-dsh' }), d.el);
  return {
    el, get values() { return d.values; },
    roll() { el.classList.remove('throw'); void el.offsetWidth; el.classList.add('throw'); return d.roll(); },
  };
}

// An upright pawn that stands on a tilted board (counter-rotated by the tilt).
export const pawnSVG = (col) => `<svg width="22" height="34" viewBox="0 0 22 34" aria-hidden="true"><path d="M11 2a5 5 0 0 1 3.2 8.9c2.3 1.4 3.4 4 3.4 7.1 0 3-1.2 5.6-2.6 7.6h2.5c1.4 0 2.5 1.1 2.5 2.5V31H1v-2.9c0-1.4 1.1-2.5 2.5-2.5H6C4.6 23.6 3.4 21 3.4 18c0-3.1 1.1-5.7 3.4-7.1A5 5 0 0 1 11 2z" fill="${col}" stroke="rgba(0,0,0,.5)" stroke-width="1.2"/><path d="M8 6a3 3 0 0 1 3-2" stroke="rgba(255,255,255,.7)" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M6 14c.5-1 1.5-2 2.5-2.3" stroke="rgba(255,255,255,.5)" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`;
