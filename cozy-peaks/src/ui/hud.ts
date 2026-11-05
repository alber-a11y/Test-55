import { frameSvg, heroPortrait } from '../art/heroes';
import { icon } from '../art/icons';
import { CONFIG } from '../core/config';
import { formatNum, formatTime, t } from '../core/i18n';
import { save } from '../core/save';
import { heroById } from '../meta/heroes';
import { infiniteLives, nextLifeIn, playerLevel, tickLives } from '../meta/economy';
import { claimable } from '../meta/goals';
import { h, svgEl } from './dom';
import { iconEl } from './widgets';

export interface HudHandlers {
  lives: () => void;
  coins: () => void;
  chest: () => void;
  info: () => void;
  settings: () => void;
  goals?: () => void;
  rooms?: () => void;
}

export function avatar(cls = ''): HTMLElement {
  const s = save.data;
  return h('div', { class: `avatar ${cls}` }, svgEl(heroPortrait(heroById(s.hero)), 'avatar-face'), svgEl(frameSvg(s.frame), 'avatar-frame'));
}

/** Top bar as in the references: avatar + level, lives, coins, stars, chest progress, info, settings. */
export function hud(on: HudHandlers, opts: { side?: boolean } = {}): HTMLElement {
  const lvText = h('span', { class: 'lv-text' });
  const xpFill = h('div', { class: 'xp-fill' });
  const ava = h('div', { class: 'hud-ava' });
  const livesN = h('span', { class: 'heart-n' });
  const livesT = h('span', { class: 'pill-text' });
  const coinsN = h('span', { class: 'pill-text', 'data-v': '0' });
  const starsN = h('span', { class: 'pill-text' });
  const chestFill = h('div', { class: 'chest-fill' });
  const chestT = h('span', { class: 'chest-text' });
  const goalsBadge = h('span', { class: 'badge-alert', text: '!' });

  const plus = (fn: () => void) => h('button', { class: 'pill-plus', onclick: (e: Event) => (e.stopPropagation(), fn()) }, svgEl(icon('plus')));

  const el = h(
    'div',
    { class: 'hud' },
    h('div', { class: 'hud-player' }, ava, h('div', { class: 'lv-badge' }, lvText), h('div', { class: 'xp-bar' }, xpFill)),
    h('div', { class: 'pill pill-lives', id: 'hud-lives', onclick: on.lives }, h('div', { class: 'pill-ico heart-ico' }, svgEl(icon('heart')), livesN), livesT, plus(on.lives)),
    h('div', { class: 'pill pill-coins', id: 'hud-coins', onclick: on.coins }, h('div', { class: 'pill-ico' }, svgEl(icon('coin'))), coinsN, plus(on.coins)),
    h('div', { class: 'pill pill-stars', id: 'hud-stars' }, h('div', { class: 'pill-ico' }, svgEl(icon('star'))), starsN),
    h('div', { class: 'chest-bar', id: 'hud-chest', onclick: on.chest }, h('div', { class: 'chest-ico' }, svgEl(icon('chest'))), h('div', { class: 'chest-track' }, chestFill, chestT)),
    h('button', { class: 'round-btn info-btn', onclick: on.info }, iconEl('info')),
    h('button', { class: 'round-btn gear-btn', onclick: on.settings }, iconEl('gear')),
  );

  if (opts.side) {
    const side = h(
      'div',
      { class: 'side-btns' },
      h('button', { class: 'side-btn', onclick: on.goals }, iconEl('goals'), h('span', { text: t('goals') }), goalsBadge),
      h('button', { class: 'side-btn', onclick: on.rooms }, iconEl('house'), h('span', { text: t('rooms') })),
    );
    el.append(side);
  }

  let heroKey = '';
  const update = () => {
    const s = save.data;
    tickLives();
    const pl = playerLevel();
    lvText.textContent = `${t('lvShort')} ${pl.level}`;
    xpFill.style.width = `${Math.round((pl.into / pl.need) * 100)}%`;
    const key = `${s.hero}|${s.frame}`;
    if (key !== heroKey) {
      heroKey = key;
      ava.replaceChildren(avatar());
    }
    if (infiniteLives()) {
      livesN.textContent = '∞';
      livesT.textContent = formatTime(s.infiniteUntil - Date.now());
    } else {
      livesN.textContent = String(s.lives);
      livesT.textContent = s.lives >= CONFIG.livesMax ? t('full') : formatTime(nextLifeIn());
    }
    if (coinsN.dataset.v !== String(s.coins)) {
      coinsN.dataset.v = String(s.coins);
      coinsN.textContent = formatNum(s.coins);
    }
    starsN.textContent = formatNum(s.stars);
    chestFill.style.width = `${(s.chest / CONFIG.chestSize) * 100}%`;
    chestT.textContent = `${s.chest}/${CONFIG.chestSize}`;
    goalsBadge.style.display = claimable() > 0 ? '' : 'none';
  };
  update();
  const unsub = save.subscribe(() => {
    if (!el.isConnected && started) return stop();
    update();
  });
  let started = false;
  const iv = window.setInterval(() => {
    if (el.isConnected) started = true;
    else if (started) return stop();
    update();
  }, 1000);
  const stop = () => {
    unsub();
    clearInterval(iv);
  };
  return el;
}
