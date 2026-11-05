import type { ItemArt } from './common';
import { SCENE_H, SCENE_W } from './common';
import { GARDEN_BONUS, GARDEN_ITEMS, gardenBack, gardenLawn, gardenRuins, gardenTree, gardenWall } from './garden';
import { BEDROOM, LIVING } from './interior';

export { SCENE_H, SCENE_W };

export interface SceneState {
  /** task id → variant (missing = not done). */
  tasks: Record<string, number>;
  bonus: string[];
  /** 0..3 makeover stage. */
  stage: number;
  /** Show a variant in place without saving (decor screen preview). */
  preview?: { task: string; variant: number };
}

interface RoomArt {
  items: Record<string, ItemArt>;
  bonus: Record<string, ItemArt>;
  /** Ordered layers: item ids or functions of the state. */
  layers: (string | ((st: SceneState, v: (id: string) => number) => string))[];
}

const ROOM_ART: Record<string, RoomArt> = {
  garden: {
    items: GARDEN_ITEMS,
    bonus: GARDEN_BONUS,
    layers: [() => gardenBack(), 'fence', (s) => gardenLawn(s.stage), (s) => gardenWall(s.stage), 'arch', () => gardenTree(), 'lights', 'path', 'fountain', 'lamps', 'flowers', 'bench', (s) => gardenRuins(s.stage)],
  },
  living: {
    items: LIVING.items,
    bonus: LIVING.bonus,
    layers: [(s, v) => LIVING.back(s.stage, v('walls') < 0 ? undefined : v('walls')), 'art', 'shelf', 'curtains', 'lamp', 'rug', 'sofa', 'table', (s) => LIVING.ruins(s.stage)],
  },
  bedroom: {
    items: BEDROOM.items,
    bonus: BEDROOM.bonus,
    layers: [(s, v) => BEDROOM.back(s.stage, v('walls') < 0 ? undefined : v('walls')), 'painting', 'chandelier', 'wardrobe', 'curtains', 'rug', 'bed', 'lamp', (s) => BEDROOM.ruins(s.stage)],
  },
};

const cache = new Map<string, string>();

/** Inner SVG markup of a whole room (no <svg> wrapper), in 1600×1000 scene coordinates. */
export function roomMarkup(roomId: string, st: SceneState): string {
  const key = `${roomId}|${JSON.stringify(st)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const art = ROOM_ART[roomId];
  const v = (id: string) => (st.preview?.task === id ? st.preview.variant : (st.tasks[id] ?? -1));
  let out = '';
  for (const layer of art.layers) {
    if (typeof layer === 'function') out += layer(st, v);
    else if (layer !== 'walls') out += `<g data-item="${layer}">${art.items[layer].draw(v(layer))}</g>`;
  }
  for (const b of st.bonus) if (art.bonus[b]) out += `<g data-bonus="${b}">${art.bonus[b].draw(0)}</g>`;
  if (cache.size > 60) cache.clear();
  cache.set(key, out);
  return out;
}

/** Full-bleed room SVG: `slice` covers the box (cropping), `meet` shows everything. */
export function roomSvg(roomId: string, st: SceneState, fit: 'slice' | 'meet' = 'slice', cls = 'room-svg'): string {
  return `<svg viewBox="0 0 ${SCENE_W} ${SCENE_H}" preserveAspectRatio="xMidYMid ${fit}" xmlns="http://www.w3.org/2000/svg" class="${cls}">${roomMarkup(roomId, st)}</svg>`;
}

function thumbSvg(item: ItemArt, variant: number, bg: string): string {
  const [x, y, w, h] = item.box;
  const pad = Math.max(w, h) * 0.06;
  return `<svg viewBox="${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" class="thumb-svg">
    <rect x="${x - pad}" y="${y - pad}" width="${w + pad * 2}" height="${h + pad * 2}" fill="${bg}"/>${item.draw(variant)}</svg>`;
}

const THUMB_BG: Record<string, string> = { garden: '#d9f0c8', living: '#f3e6d2', bedroom: '#f3e3ee' };

/** Thumbnail of one task variant for the carousels. */
export function itemThumb(roomId: string, taskId: string, variant: number): string {
  const art = ROOM_ART[roomId];
  const item = art.items[taskId];
  if (!item) return '';
  if (taskId === 'walls') {
    return `<svg viewBox="300 0 700 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" class="thumb-svg">${item.draw(variant)}</svg>`;
  }
  return thumbSvg(item, variant, THUMB_BG[roomId]);
}

export function bonusThumb(roomId: string, itemId: string): string {
  const item = ROOM_ART[roomId]?.bonus[itemId];
  return item ? thumbSvg(item, 0, THUMB_BG[roomId]) : '';
}

/** Small room preview card ("before" or current state). */
export function roomPreview(roomId: string, st: SceneState): string {
  return roomSvg(roomId, st, 'slice', 'room-preview');
}
