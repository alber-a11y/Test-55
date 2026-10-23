/** Booster inventory items. */
export type BoosterId = 'startJoker' | 'plus5' | 'xray' | 'breaker' | 'hint' | 'undo' | 'joker';

export interface BoosterDef {
  id: BoosterId;
  icon: string;
  /** Coin price in the shop. */
  price: number;
  /** Shown in the pre-level window of the adventure. */
  pre: boolean;
}

export const BOOSTERS: BoosterDef[] = [
  { id: 'startJoker', icon: 'joker', price: 200, pre: true },
  { id: 'plus5', icon: 'deck', price: 250, pre: true },
  { id: 'xray', icon: 'eye', price: 150, pre: true },
  { id: 'breaker', icon: 'lightning', price: 300, pre: true },
  { id: 'hint', icon: 'hint', price: 60, pre: false },
  { id: 'undo', icon: 'undo', price: 60, pre: false },
  { id: 'joker', icon: 'wand', price: 180, pre: false },
];

export const booster = (id: BoosterId): BoosterDef => BOOSTERS.find((b) => b.id === id)!;
