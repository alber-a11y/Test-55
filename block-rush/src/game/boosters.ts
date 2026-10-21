import type { I18nKey } from '../core/i18n';
import type { Mode } from './tray';

export type BoosterId =
  | 'hammer'
  | 'bomb'
  | 'mega'
  | 'rowRocket'
  | 'colRocket'
  | 'cross'
  | 'refresh'
  | 'rotate'
  | 'cube'
  | 'magic'
  | 'hint'
  | 'undo'
  | 'time'
  | 'freeze'
  | 'x2'
  | 'slot'
  | 'magnet';

export type BoosterTarget = 'cell' | 'piece' | 'instant';

export interface BoosterDef {
  id: BoosterId;
  target: BoosterTarget;
  modes: Mode[];
  price: number;
  /** Amount granted by one rewarded video. */
  adAmount: number;
}

const both: Mode[] = ['levels', 'classic'];

export const BOOSTERS: BoosterDef[] = [
  { id: 'bomb', target: 'cell', modes: both, price: 120, adAmount: 1 },
  { id: 'rowRocket', target: 'cell', modes: both, price: 100, adAmount: 1 },
  { id: 'time', target: 'instant', modes: ['levels'], price: 90, adAmount: 1 },
  { id: 'magic', target: 'piece', modes: both, price: 110, adAmount: 1 },
  { id: 'hammer', target: 'cell', modes: both, price: 50, adAmount: 2 },
  { id: 'refresh', target: 'instant', modes: both, price: 70, adAmount: 1 },
  { id: 'magnet', target: 'instant', modes: ['levels'], price: 150, adAmount: 1 },
  { id: 'colRocket', target: 'cell', modes: both, price: 100, adAmount: 1 },
  { id: 'cross', target: 'cell', modes: both, price: 160, adAmount: 1 },
  { id: 'mega', target: 'cell', modes: both, price: 220, adAmount: 1 },
  { id: 'freeze', target: 'instant', modes: ['levels'], price: 90, adAmount: 1 },
  { id: 'rotate', target: 'piece', modes: both, price: 40, adAmount: 2 },
  { id: 'cube', target: 'piece', modes: both, price: 60, adAmount: 2 },
  { id: 'hint', target: 'instant', modes: both, price: 30, adAmount: 2 },
  { id: 'undo', target: 'instant', modes: both, price: 60, adAmount: 1 },
  { id: 'x2', target: 'instant', modes: both, price: 100, adAmount: 1 },
  { id: 'slot', target: 'instant', modes: both, price: 180, adAmount: 1 },
];

export const boosterDef = (id: BoosterId) => BOOSTERS.find((b) => b.id === id)!;
export const boosterName = (id: BoosterId) => `b.${id}` as I18nKey;
export const boosterDesc = (id: BoosterId) => `b.${id}.d` as I18nKey;

/** Inventory every new player starts with. */
export const START_BOOSTERS: Partial<Record<BoosterId, number>> = {
  hammer: 2,
  bomb: 1,
  rowRocket: 1,
  hint: 2,
  rotate: 1,
  time: 1,
};
