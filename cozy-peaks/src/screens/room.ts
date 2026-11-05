import { audio } from '../audio/audio';
import { icon } from '../art/icons';
import { bonusThumb, itemThumb, roomMarkup, roomPreview, SCENE_H, SCENE_W } from '../art/rooms';
import { formatTime, t, tr } from '../core/i18n';
import { save } from '../core/save';
import { adProgress, bonusShopItem, cooldownLeft, doTask, isRoomUnlocked, nextTask, premiumOwned, premiumShopItem, roomComplete, roomDone, roomStage } from '../meta/economy';
import { bumpGoal } from '../meta/goals';
import { PREMIUM_VARIANT, roomById, ROOMS, type TaskDef } from '../meta/rooms';
import { h, svgEl } from '../ui/dom';
import { buyCoins, chestModal, goalsModal, heroSays, livesModal, rulesModal, settingsModal, watchFor } from '../ui/dialogs';
import { hud } from '../ui/hud';
import { go, register, type Screen } from '../ui/router';
import { stage } from '../ui/stage';
import { button, confetti, iconEl, modal, priceButton, toast } from '../ui/widgets';
import { makeoverPlaque, roomState } from './common';

register('room', (p: { room?: string; task?: string }): Screen => {
  const room = roomById(p.room ?? save.data.room);
  const rs = () => save.data.rooms[room.id];
  let selected: TaskDef = room.tasks.find((t) => t.id === p.task) ?? nextTask(room) ?? room.tasks[0];
  let variant = rs().tasks[selected.id] ?? 0;
  let panX = 0;

  const el = h('div', { class: 'scr-room' });
  const view = h('div', { class: 'room-view' });
  const svgHost = h('div', { class: 'room-svg-host' });
  const spots = h('div', { class: 'spots' });
  view.append(svgHost, spots);
  const strip = h('div', { class: 'panel meta-strip decor-strip' });
  // Makeover progress plaque on top (title + three stage checks).
  const plaqueHost = h('div', { class: 'room-plaque' });
  // "Before" photo: hold it to see the room as it was.
  let showBefore = false;
  const beforeAfter = h(
    'button',
    { class: 'before-after' },
    h('div', { class: 'ba-card' }, h('div', { class: 'ba-tag', text: t('before') }), h('div', { class: 'ba-img', html: roomPreview(room.id, { tasks: {}, bonus: [], stage: 0 }) })),
  );
  const holdBefore = (on: boolean) => {
    if (showBefore === on) return;
    showBefore = on;
    renderScene();
  };
  beforeAfter.addEventListener('pointerdown', (e) => (e.stopPropagation(), holdBefore(true)));
  beforeAfter.addEventListener('pointerup', () => holdBefore(false));
  beforeAfter.addEventListener('pointerleave', () => holdBefore(false));

  const homeBtn = button(t('home'), { variant: 'cream', icon: 'house', small: true, cls: 'room-home', onClick: () => void go('home', {}, 'to_home') });

  void plaqueHost;
  el.append(
    view,
    hud(
      { lives: livesModal, coins: () => void go('shop', { tab: 'extras' }, 'to_shop'), chest: () => chestModal(), info: rulesModal, settings: () => settingsModal(), goals: goalsModal, rooms: () => void go('rooms', {}, 'to_rooms') },
      { side: true },
    ),
    beforeAfter,
    homeBtn,
    strip,
  );

  /* ---------- scene & pan ---------- */

  const geom = () => {
    const s = Math.max(stage.w / SCENE_W, stage.h / SCENE_H);
    const extra = Math.max(0, SCENE_W * s - stage.w) / 2;
    panX = Math.max(-extra, Math.min(extra, panX));
    return { s, ox: (stage.w - SCENE_W * s) / 2 + panX, oy: (stage.h - SCENE_H * s) / 2, extra };
  };

  const renderScene = () => {
    const { s, ox, oy } = geom();
    const preview = rs().tasks[selected.id] === variant ? undefined : { task: selected.id, variant };
    const st = showBefore ? { tasks: {}, bonus: [], stage: 0 } : roomState(room, preview);
    svgHost.innerHTML = `<svg viewBox="0 0 ${SCENE_W} ${SCENE_H}" width="${SCENE_W * s}" height="${SCENE_H * s}" xmlns="http://www.w3.org/2000/svg">${roomMarkup(room.id, st)}</svg>`;
    svgHost.style.transform = `translate(${ox}px, ${oy}px)`;
    spots.style.display = showBefore ? 'none' : '';
    // Highlight the selected item.
    svgHost.querySelector(`[data-item="${selected.id}"]`)?.classList.add('sel-item');
    spots.replaceChildren();
    for (const task of room.tasks) {
      const done = task.id in rs().tasks;
      const sel = task.id === selected.id;
      spots.append(
        h(
          'button',
          {
            class: `spot ${sel ? 'sel' : ''} ${done ? 'done' : ''}`,
            style: `left:${ox + task.at.x * s}px;top:${oy + task.at.y * s}px`,
            onclick: () => select(task),
          },
          svgEl(icon(done ? 'check' : 'brush'), 'spot-ico'),
          h('span', { text: tr(task.name) }),
          done ? null : h('em', {}, svgEl(icon('star'), 'spot-star'), String(task.cost)),
        ),
      );
    }
    for (const b of room.bonus) {
      if (rs().bonus.includes(b.id)) continue;
      spots.append(
        h('button', { class: 'spot gift', style: `left:${ox + b.at.x * s}px;top:${oy + b.at.y * s}px`, onclick: () => bonusModal(b.id) }, svgEl(icon('gift'), 'spot-ico'), h('span', { text: tr(b.name) })),
      );
    }
    requestAnimationFrame(resolveLabels);
  };

  /**
   * Keep hotspot labels readable: if a label hits the HUD, panels or another label,
   * try it below the anchor or shifted sideways.
   */
  const resolveLabels = () => {
    type R = { x: number; y: number; w: number; h: number };
    const hit = (a: R, b: R) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const reserved: R[] = [...el.querySelectorAll('.hud-player, .hud .pill, .hud .chest-bar, .hud .round-btn, .side-btn, .room-plaque .makeover, .before-after, .room-home, .decor-strip')].map((e) => stage.rect(e));
    const placed: R[] = [];
    const order = ['up', 'down', 'upL', 'upR', 'downL', 'downR'];
    // The selected label goes first so it keeps the best place.
    const list = [...spots.children].sort((a, b) => Number(b.classList.contains('sel')) - Number(a.classList.contains('sel'))) as HTMLElement[];
    for (const sp of list) {
      let best = 'up';
      let bestScore = Infinity;
      for (const pos of order) {
        sp.dataset.pos = pos;
        const r = stage.rect(sp);
        const out = r.x < 0 || r.x + r.w > stage.w || r.y < 0 || r.y + r.h > stage.h;
        const score = reserved.filter((q) => hit(r, q)).length * 2 + placed.filter((q) => hit(r, q)).length + (out ? 3 : 0);
        if (score < bestScore) {
          bestScore = score;
          best = pos;
        }
        if (score === 0) break;
      }
      sp.dataset.pos = best;
      placed.push(stage.rect(sp));
    }
  };

  // Drag to pan (portrait / narrow screens).
  let drag: { x: number; pan: number } | null = null;
  view.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, pan: panX };
  });
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    const dx = (e.clientX - drag.x) / stage.scale;
    if (Math.abs(dx) < 6) return;
    panX = drag.pan + dx;
    const { ox, oy } = geom();
    svgHost.style.transform = `translate(${ox}px, ${oy}px)`;
    spots.style.transform = `translateX(${panX - (drag.pan as number)}px)`;
  };
  window.addEventListener('pointermove', onMove);
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    spots.style.transform = '';
    renderScene();
  };
  window.addEventListener('pointerup', endDrag);

  const centerOn = (task: TaskDef) => {
    const s = Math.max(stage.w / SCENE_W, stage.h / SCENE_H);
    panX = stage.w / 2 - ((stage.w - SCENE_W * s) / 2 + task.at.x * s);
  };

  /* ---------- strip ---------- */

  const renderStrip = () => {
    strip.replaceChildren();
    const done = selected.id in rs().tasks;
    const variants = h('div', { class: 'variants' });
    for (let v = 0; v <= PREMIUM_VARIANT; v++) {
      const premium = v === PREMIUM_VARIANT;
      const owned = !premium || premiumOwned(room.id, selected.id);
      const isSel = v === variant;
      const applied = rs().tasks[selected.id] === v;
      variants.append(
        h(
          'button',
          {
            class: `variant ${isSel ? 'sel' : ''}`,
            onclick: () => {
              audio.play('click');
              variant = v;
              renderScene();
              renderStrip();
            },
          },
          h('div', { class: 'v-img', html: itemThumb(room.id, selected.id, v) }),
          applied ? iconEl('check', 'v-check') : null,
          premium && !owned ? h('div', { class: 'v-ad' }, svgEl(icon('ad'))) : null,
          h('div', { class: 'v-tag', text: premium ? `★ ${tr(selected.variants[v])}` : tr(selected.variants[v]) }),
        ),
      );
    }
    let action: HTMLElement;
    const premiumLocked = variant === PREMIUM_VARIANT && !premiumOwned(room.id, selected.id);
    if (premiumLocked) {
      const item = premiumShopItem(room.id, selected.id);
      action = priceButton(item.price, adProgress(item.id), async () => {
        if (await watchFor(item, 'decor_premium')) renderStrip();
        else renderStrip();
      });
      action.classList.add('btn-big-ish');
    } else if (done) {
      action = button(rs().tasks[selected.id] === variant ? t('placed') : t('place'), {
        variant: rs().tasks[selected.id] === variant ? 'cream' : 'green',
        disabled: rs().tasks[selected.id] === variant,
        onClick: () => apply(),
      });
    } else {
      action = button(t('decorate'), { cost: { kind: 'star', n: selected.cost }, onClick: () => apply() });
    }
    strip.append(
      h('div', { class: 'ms-ico', html: itemThumb(room.id, selected.id, -1) }),
      h('div', { class: 'ms-text' }, miniStages(), h('b', { text: t('chooseNew', { item: tr(selected.name) }) })),
      variants,
      action,
    );
  };

  /** Room name + three stage checks (the top plaque is hidden on this screen to keep the scene clear). */
  const miniStages = () => {
    const done = roomDone(room);
    return h('small', { class: 'mini-stages' }, h('span', { text: `${tr(room.name)} · ${done}/${room.tasks.length}` }), ...room.stages.map((st) => h('i', { class: done >= st ? 'on' : '' })));
  };

  const select = (task: TaskDef) => {
    audio.play('click');
    selected = task;
    variant = rs().tasks[task.id] ?? 0;
    if (stage.portrait) centerOn(task);
    renderScene();
    renderStrip();
  };

  const apply = () => {
    const wasDone = selected.id in rs().tasks;
    const stageBefore = roomStage(room);
    if (!doTask(room, selected.id, variant)) {
      audio.play('error');
      toast(t('notEnoughStars'), 'bad');
      heroSays('needStarsLine', 'think');
      const m = modal({ title: t('notEnoughStars').split('—')[0].trim() });
      m.body.append(h('div', { class: 'chest-big', html: icon('star') }), button(`${t('play')} · ${t('levelN', { n: save.data.level })}`, { big: true, onClick: () => (m.close(), void go('level', { n: save.data.level }, 'level_start')) }));
      return;
    }
    audio.play('decorate');
    if (!wasDone) bumpGoal('decorate');
    renderScene();
    const node = svgHost.querySelector(`[data-item="${selected.id}"]`) as SVGGElement | null;
    node?.animate([{ opacity: 0.2, transform: 'translateY(-30px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 500, easing: 'cubic-bezier(.3,1.5,.5,1)' });
    plaqueHost.replaceChildren(makeoverPlaque(room, false));
    if (!wasDone) {
      const stageAfter = roomStage(room);
      if (roomComplete(room)) return finishRoom();
      if (stageAfter > stageBefore) {
        confetti(50);
        toast(t('stageDone'), 'good');
        heroSays('stageLine', 'wow');
      } else heroSays('taskDoneLine', 'happy');
      const next = nextTask(room);
      if (next) {
        selected = next;
        variant = 0;
        setTimeout(() => {
          if (stage.portrait) centerOn(next);
          renderScene();
          renderStrip();
        }, 900);
      }
    }
    renderStrip();
  };

  const finishRoom = () => {
    confetti(90);
    heroSays('roomLine', 'wow', 4500);
    const i = ROOMS.indexOf(room);
    const next = ROOMS[i + 1];
    if (next && isRoomUnlocked(next)) {
      save.data.room = next.id;
      save.commit();
    }
    const m = modal({ title: t('roomDone') });
    m.body.append(
      h('div', { class: 'done-preview', html: roomPreview(room.id, roomState(room)) }),
      next ? button(`${t('nextRoom')}: ${tr(next.name)}`, { onClick: () => (m.close(), void go('room', { room: next.id }, 'to_room')) }) : h('p', { text: t('soon') }),
    );
  };

  const bonusModal = (id: string) => {
    const b = room.bonus.find((x) => x.id === id)!;
    const item = bonusShopItem(room.id, id);
    const m = modal({ title: tr(b.name), cls: 'm-bonus' });
    const cd = cooldownLeft(item.id);
    m.body.append(
      h('div', { class: 'bonus-thumb', html: bonusThumb(room.id, id) }),
      h('div', { class: 'muted', text: 'ads' in item.price ? t('watchToUnlock') : t('bonusDecor') }),
      cd > 0
        ? h('div', { text: t('ready', { t: formatTime(cd) }) })
        : priceButton(item.price, adProgress(item.id), async () => {
            const ok = 'coins' in item.price ? buyCoins(item) : await watchFor(item, 'decor_bonus');
            if (ok) {
              m.close();
              audio.play('decorate');
              renderScene();
            } else if ('ads' in item.price) {
              m.close();
              bonusModal(id);
            }
          }),
    );
  };

  const layoutAll = () => {
    plaqueHost.replaceChildren(makeoverPlaque(room, false));
    renderScene();
    renderStrip();
  };
  if (stage.portrait) centerOn(selected);
  layoutAll();
  return {
    el,
    music: 'room',
    resize: layoutAll,
    destroy: () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
    },
  };
});

register('rooms', (): Screen => {
  const el = h('div', { class: 'scr-rooms' });
  const room = roomById(save.data.room);
  el.append(h('div', { class: 'bg-room blur', html: roomPreview(room.id, roomState(room)) }));
  el.append(
    hud({ lives: livesModal, coins: () => void go('shop', { tab: 'extras' }, 'to_shop'), chest: () => chestModal(), info: rulesModal, settings: () => settingsModal() }),
  );
  const list = h('div', { class: 'rooms-list' });
  for (const r of ROOMS) {
    const unlocked = isRoomUnlocked(r);
    const done = roomDone(r);
    list.append(
      h(
        'button',
        {
          class: `panel room-card ${unlocked ? '' : 'locked'} ${r.id === save.data.room ? 'current' : ''}`,
          onclick: () => {
            if (!unlocked) {
              const prev = ROOMS[ROOMS.indexOf(r) - 1];
              return toast(t('roomLocked', { room: tr(prev.name) }));
            }
            audio.play('click');
            save.data.room = r.id;
            save.commit();
            void go('room', { room: r.id }, 'to_room');
          },
        },
        h('div', { class: 'rc-img', html: roomPreview(r.id, roomState(r)) }),
        h('div', { class: 'rc-name', text: tr(r.name) }),
        h('div', { class: 'bar' }, h('div', { class: 'bar-fill', style: `width:${(done / r.tasks.length) * 100}%` }), h('span', { text: `${done}/${r.tasks.length}` })),
        unlocked ? null : h('div', { class: 'rc-lock' }, iconEl('lock')),
      ),
    );
  }
  list.append(h('div', { class: 'panel room-card soon' }, iconEl('sparkle'), h('div', { class: 'rc-name', text: t('soon') })));
  el.append(h('div', { class: 'rooms-head' }, h('div', { class: 'ribbon' }, h('span', { text: t('rooms') }))), list, button(t('home'), { variant: 'cream', icon: 'house', cls: 'rooms-home', onClick: () => void go('home', {}, 'to_home') }));
  return { el, music: 'room' };
});
