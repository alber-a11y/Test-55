import { audio } from '../audio/audio';
import { icon } from '../art/icons';
import { roomSvg, SCENE_H, SCENE_W } from '../art/rooms';
import { t, tr } from '../core/i18n';
import { save } from '../core/save';
import { currentRoom, hasLife, nextTask, roomComplete } from '../meta/economy';
import { shopItem } from '../meta/shop';
import { h, svgEl } from '../ui/dom';
import { chestModal, goalsModal, livesModal, rulesModal, settingsModal, watchFor } from '../ui/dialogs';
import { hud } from '../ui/hud';
import { go, register, type Screen } from '../ui/router';
import { stage } from '../ui/stage';
import { button, iconEl } from '../ui/widgets';
import { makeoverPlaque, roomState } from './common';

/** Scene point → stage point for a room drawn with preserveAspectRatio "slice". */
export function scenePoint(x: number, y: number, w = stage.w, hgt = stage.h, panX = 0): { x: number; y: number; s: number } {
  const s = Math.max(w / SCENE_W, hgt / SCENE_H);
  return { x: (w - SCENE_W * s) / 2 + x * s + panX, y: (hgt - SCENE_H * s) / 2 + y * s, s };
}

register('home', (): Screen => {
  const room = currentRoom();
  const el = h('div', { class: 'scr-home' });
  const bg = h('div', { class: 'bg-room', html: roomSvg(room.id, roomState(room)) });
  const spots = h('div', { class: 'spots' });
  const task = nextTask(room);

  const playBtn = button(save.data.current?.n === save.data.level ? `${t('continue')} · ${save.data.level}` : `${t('play')} · ${t('levelN', { n: save.data.level })}`, {
    big: true,
    cls: 'play-btn',
    onClick: () => {
      if (!hasLife()) return livesModal();
      void go('level', { n: save.data.level }, 'level_start');
    },
  });

  const decorBtn = task
    ? button(t('decorate'), { variant: save.data.stars >= task.cost ? 'green' : 'cream', cost: { kind: 'star', n: task.cost }, onClick: () => void go('room', { room: room.id, task: task.id }, 'to_room') })
    : roomComplete(room)
      ? button(t('nextRoom'), { variant: 'blue', icon: 'house', onClick: () => void go('rooms', {}, 'to_rooms') })
      : null;

  const gift = shopItem('coins_ad')!;
  const right = h(
    'div',
    { class: 'right-btns' },
    h('button', { class: 'side-btn', onclick: () => void go('shop', {}, 'to_shop') }, iconEl('shop'), h('span', { text: t('shop') })),
    h(
      'button',
      {
        class: 'side-btn',
        onclick: async () => {
          if (await watchFor(gift, 'home_gift')) audio.play('coin');
        },
      },
      iconEl('gift'),
      h('span', { text: t('freeGift') }),
      h('span', { class: 'badge-ad' }, svgEl(icon('ad'))),
    ),
  );

  el.append(
    bg,
    spots,
    hud(
      {
        lives: livesModal,
        coins: () => void go('shop', { tab: 'extras' }, 'to_shop'),
        chest: () => chestModal(),
        info: rulesModal,
        settings: () => settingsModal(),
        goals: goalsModal,
        rooms: () => void go('rooms', {}, 'to_rooms'),
      },
      { side: true },
    ),
    makeoverPlaque(room),
    right,
    h('div', { class: 'home-bottom' }, decorBtn, playBtn),
  );

  const placeSpots = () => {
    spots.replaceChildren();
    if (!task) return;
    const p = scenePoint(task.at.x, task.at.y);
    const s = h('button', { class: 'spot pulse', style: `left:${p.x}px;top:${p.y}px`, onclick: () => void go('room', { room: room.id, task: task.id }, 'to_room') }, svgEl(icon('brush'), 'spot-ico'), h('span', { text: tr(task.name) }));
    spots.append(s);
  };
  placeSpots();
  return { el, music: 'home', resize: placeSpots };
});
