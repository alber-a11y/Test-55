import type { L10n } from './types';

/** In-level boosters (buttons next to the waste pile). */
export type LevelBooster = 'undo' | 'wild' | 'plusCard' | 'hammer' | 'peek';
/** Taken before the level starts. */
export type StartBooster = 'lucky' | 'startWild' | 'plus3' | 'doubleCoins';
export type BoosterId = LevelBooster | StartBooster;

export interface BoosterDef {
  id: BoosterId;
  kind: 'level' | 'start';
  name: L10n;
  desc: L10n;
  /** Coin price of one in the shop. */
  price: number;
  /** Player level that unlocks it. */
  unlockAt: number;
}

export const BOOSTERS: BoosterDef[] = [
  { id: 'undo', kind: 'level', price: 300, unlockAt: 1, name: { ru: 'Отмена', en: 'Undo' }, desc: { ru: 'Вернуть последний ход', en: 'Take back your last move' } },
  { id: 'wild', kind: 'level', price: 500, unlockAt: 1, name: { ru: 'Джокер', en: 'Wild' }, desc: { ru: 'Карта, на которую ложится любая', en: 'Any card can go on it' } },
  { id: 'plusCard', kind: 'level', price: 400, unlockAt: 1, name: { ru: '+1 карта', en: '+1 Card' }, desc: { ru: 'Полезная карта сверху колоды', en: 'A helpful card on top of the stock' } },
  { id: 'hammer', kind: 'level', price: 600, unlockAt: 4, name: { ru: 'Молоток', en: 'Hammer' }, desc: { ru: 'Снять любую открытую карту', en: 'Remove any open card' } },
  { id: 'peek', kind: 'level', price: 350, unlockAt: 6, name: { ru: 'Подсмотреть', en: 'Peek' }, desc: { ru: 'Показать 3 следующие карты колоды', en: 'See the next 3 stock cards' } },
  { id: 'lucky', kind: 'start', price: 450, unlockAt: 3, name: { ru: 'Рука удачи', en: 'Lucky Hand' }, desc: { ru: 'Снять 3 карты на старте', en: 'Clear 3 cards at the start' } },
  { id: 'startWild', kind: 'start', price: 450, unlockAt: 3, name: { ru: 'Старт с джокером', en: 'Wild Start' }, desc: { ru: 'Первая карта — джокер', en: 'Begin with a wild card' } },
  { id: 'plus3', kind: 'start', price: 400, unlockAt: 5, name: { ru: '+3 в колоду', en: '+3 Stock' }, desc: { ru: 'Колода больше на 3 карты', en: 'Three more stock cards' } },
  { id: 'doubleCoins', kind: 'start', price: 350, unlockAt: 7, name: { ru: 'Двойные монеты', en: 'Double Coins' }, desc: { ru: 'Монеты за уровень ×2', en: 'Level coins ×2' } },
];

export const LEVEL_BOOSTERS = BOOSTERS.filter((b) => b.kind === 'level');
export const START_BOOSTERS = BOOSTERS.filter((b) => b.kind === 'start');
export const boosterDef = (id: BoosterId): BoosterDef => BOOSTERS.find((b) => b.id === id)!;
