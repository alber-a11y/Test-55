import type { BoosterId } from '../core/save';

export type ItemKind = 'bg' | 'skin' | 'icons' | 'theme';

export interface ShopItem {
  id: string;
  kind: ItemKind;
  /** Price in coins (0 = free starter item). Ignored for ad-only items. */
  price: number;
  /** Ad-only exclusive: number of rewarded views needed. */
  ads?: number;
}

export const ITEMS: ShopItem[] = [
  { id: 'bg_meadow', kind: 'bg', price: 0 },
  { id: 'bg_sakura', kind: 'bg', price: 600 },
  { id: 'bg_tropics', kind: 'bg', price: 900 },
  { id: 'bg_autumn', kind: 'bg', price: 1200 },
  { id: 'bg_winter', kind: 'bg', price: 1500 },
  { id: 'bg_reef', kind: 'bg', price: 1800 },
  { id: 'bg_candy', kind: 'bg', price: 2200 },
  { id: 'bg_sunset', kind: 'bg', price: 2600 },
  { id: 'bg_aurora', kind: 'bg', price: 0, ads: 3 },
  { id: 'bg_space', kind: 'bg', price: 0, ads: 3 },

  { id: 'skin_classic', kind: 'skin', price: 0 },
  { id: 'skin_wood', kind: 'skin', price: 800 },
  { id: 'skin_marble', kind: 'skin', price: 1200 },
  { id: 'skin_glass', kind: 'skin', price: 1500 },
  { id: 'skin_caramel', kind: 'skin', price: 1800 },
  { id: 'skin_gold', kind: 'skin', price: 2500 },
  { id: 'skin_neon', kind: 'skin', price: 0, ads: 3 },
  { id: 'skin_cloud', kind: 'skin', price: 0, ads: 3 },

  { id: 'icons_garden', kind: 'icons', price: 0 },
  { id: 'icons_sweets', kind: 'icons', price: 1500 },
  { id: 'icons_sea', kind: 'icons', price: 2000 },
  { id: 'icons_animals', kind: 'icons', price: 2500 },
  { id: 'icons_holiday', kind: 'icons', price: 3000 },
  { id: 'icons_space', kind: 'icons', price: 0, ads: 3 },

  { id: 'theme_sky', kind: 'theme', price: 0 },
  { id: 'theme_sunset', kind: 'theme', price: 400 },
  { id: 'theme_mint', kind: 'theme', price: 600 },
  { id: 'theme_lavender', kind: 'theme', price: 800 },
  { id: 'theme_caramel', kind: 'theme', price: 1000 },
  { id: 'theme_night', kind: 'theme', price: 0, ads: 3 },
];

export const itemById = (id: string) => ITEMS.find((i) => i.id === id);

export const BOOSTER_PRICE: Record<BoosterId, number> = { undo: 100, shuffle: 150, magnet: 200, slot: 250 };
/** A pack of 5 costs as much as 4. */
export const PACK_SIZE = 5;
export const packPrice = (b: BoosterId) => BOOSTER_PRICE[b] * 4;

export const BOOSTER_ICON: Record<BoosterId, string> = { undo: 'ui_undo', magnet: 'ui_magnet', shuffle: 'ui_shuffle', slot: 'ui_slot' };

/** Daily gift ladder (day 1..7, then repeats from day 1). */
export const DAILY: Array<{ coins: number; booster?: BoosterId }> = [
  { coins: 50 },
  { coins: 75 },
  { coins: 100, booster: 'undo' },
  { coins: 125 },
  { coins: 150, booster: 'shuffle' },
  { coins: 200 },
  { coins: 300, booster: 'magnet' },
];

/** Coins for a won level. */
export function levelReward(level: number, stars: number, hard: boolean): number {
  const base = 20 + Math.min(20, Math.floor(level / 10)) + stars * 5;
  return hard ? base * 2 : base;
}

/** Chest every 10 levels. */
export const chestReward = (level: number) => ({ coins: 100 + Math.min(200, level * 2), booster: (['undo', 'magnet', 'shuffle', 'slot'] as BoosterId[])[(level / 10) % 4] });
