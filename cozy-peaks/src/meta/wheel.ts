import { save } from '../core/save';
import type { BoosterId } from './boosters';
import { addBooster, addCoins, grant } from './economy';
import type { L10n } from './types';

export type WheelPrize =
  | { kind: 'coins'; n: number }
  | { kind: 'booster'; id: BoosterId; n: number }
  | { kind: 'stars'; n: number }
  | { kind: 'lives'; minutes: number };

export interface WheelSegment {
  prize: WheelPrize;
  weight: number;
  color: string;
  label: L10n;
}

/** Eight segments, clockwise from the top. */
export const WHEEL: WheelSegment[] = [
  { prize: { kind: 'coins', n: 100 }, weight: 22, color: '#ffd166', label: { ru: '100', en: '100' } },
  { prize: { kind: 'booster', id: 'undo', n: 1 }, weight: 16, color: '#b892e8', label: { ru: 'Отмена', en: 'Undo' } },
  { prize: { kind: 'coins', n: 250 }, weight: 12, color: '#7ed957', label: { ru: '250', en: '250' } },
  { prize: { kind: 'booster', id: 'wild', n: 1 }, weight: 12, color: '#5ec7ff', label: { ru: 'Джокер', en: 'Wild' } },
  { prize: { kind: 'stars', n: 1 }, weight: 8, color: '#ff9f43', label: { ru: '★ 1', en: '★ 1' } },
  { prize: { kind: 'booster', id: 'hammer', n: 1 }, weight: 12, color: '#ff8fb1', label: { ru: 'Молоток', en: 'Hammer' } },
  { prize: { kind: 'lives', minutes: 30 }, weight: 8, color: '#e8574a', label: { ru: '∞ 30′', en: '∞ 30′' } },
  { prize: { kind: 'coins', n: 1000 }, weight: 3, color: '#f6c443', label: { ru: '1000!', en: '1000!' } },
];

/** Extra rewarded spins allowed per day after the free one. */
export const EXTRA_SPINS = 3;

const today = () => new Date().toISOString().slice(0, 10);

function state(): { day: string; spins: number } {
  const s = save.data;
  if (!s.wheel || s.wheel.day !== today()) s.wheel = { day: today(), spins: 0 };
  return s.wheel;
}

export const freeSpinReady = (): boolean => state().spins === 0;
export const extraSpinsLeft = (): number => Math.max(0, EXTRA_SPINS + 1 - state().spins);

/** Pick a segment (weighted) and grant its prize. */
export function spin(rand: () => number = Math.random): number {
  const total = WHEEL.reduce((a, s) => a + s.weight, 0);
  let r = rand() * total;
  let idx = 0;
  for (; idx < WHEEL.length - 1; idx++) {
    r -= WHEEL[idx].weight;
    if (r < 0) break;
  }
  const p = WHEEL[idx].prize;
  switch (p.kind) {
    case 'coins':
      addCoins(p.n);
      break;
    case 'booster':
      addBooster(p.id, p.n);
      break;
    case 'stars':
      save.data.stars += p.n;
      break;
    case 'lives':
      grant({ kind: 'infiniteLives', minutes: p.minutes });
      break;
  }
  state().spins += 1;
  save.commit();
  return idx;
}
