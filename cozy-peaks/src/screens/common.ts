import { itemThumb, roomPreview, type SceneState } from '../art/rooms';
import { tr } from '../core/i18n';
import { save } from '../core/save';
import { nextTask, roomDone, roomStage } from '../meta/economy';
import type { RoomDef } from '../meta/rooms';
import { h } from '../ui/dom';
import { go } from '../ui/router';

export function roomState(room: RoomDef, preview?: SceneState['preview']): SceneState {
  const rs = save.data.rooms[room.id];
  return { tasks: rs.tasks, bonus: rs.bonus, stage: roomStage(room), preview };
}

/** "Garden Makeover" plaque: photo, title, 3 stage checks, the next item. */
export function makeoverPlaque(room: RoomDef, clickable = true): HTMLElement {
  const done = roomDone(room);
  const total = room.tasks.length;
  const stages = room.stages;
  const steps = h('div', { class: 'steps' }, h('div', { class: 'steps-track' }, h('div', { class: 'steps-fill', style: `width:${(done / total) * 100}%` })));
  stages.forEach((s) => steps.append(h('div', { class: `dot ${done >= s ? 'on' : ''}`, style: `left:calc(8px + ${(s / total) * 100}% - ${(s / total) * 16}px)` })));
  const task = nextTask(room);
  return h(
    'div',
    { class: 'panel makeover', onclick: clickable ? () => void go('room', { room: room.id }, 'to_room') : undefined },
    h('div', { class: 'makeover-thumb', html: roomPreview(room.id, roomState(room)) }),
    h('div', { class: 'makeover-main' }, h('div', { class: 'makeover-title', text: tr(room.makeover) }), steps),
    task ? h('div', { class: 'makeover-item', html: itemThumb(room.id, task.id, 0) }) : null,
  );
}
