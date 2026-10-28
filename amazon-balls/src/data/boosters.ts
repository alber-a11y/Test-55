export type InLevelBooster = 'bomb' | 'rainbow' | 'lightning' | 'fire' | 'shots5';
export type PreBooster = 'aim' | 'startBomb' | 'shots3';
export type BoosterId = InLevelBooster | PreBooster;

export interface BoosterDef {
  id: BoosterId;
  pre: boolean;
  /** Price in coins for one charge in the shop. */
  price: number;
  /** Icon texture key. */
  icon: string;
}

export const BOOSTERS: BoosterDef[] = [
  { id: 'bomb', pre: false, price: 150, icon: 'ic_bomb' },
  { id: 'rainbow', pre: false, price: 120, icon: 'ic_rainbow' },
  { id: 'lightning', pre: false, price: 200, icon: 'ic_lightning' },
  { id: 'fire', pre: false, price: 150, icon: 'ic_fire' },
  { id: 'shots5', pre: false, price: 100, icon: 'ic_shots5' },
  { id: 'aim', pre: true, price: 100, icon: 'ic_aim' },
  { id: 'startBomb', pre: true, price: 120, icon: 'ic_startBomb' },
  { id: 'shots3', pre: true, price: 80, icon: 'ic_shots3' },
];

export const IN_LEVEL: InLevelBooster[] = ['bomb', 'rainbow', 'lightning', 'fire', 'shots5'];
export const PRE_LEVEL: PreBooster[] = ['aim', 'startBomb', 'shots3'];
