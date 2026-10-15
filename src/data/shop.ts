import { HEROES } from './heroes';

export interface SkinDef {
  id: string;
  hero: string;
  /** Palette overrides for the hero look. */
  palette: Partial<{ skin: string; hair: string; outfit: string; accent: string }>;
  accessory?: 'crown' | 'shades' | 'pirate' | 'halo' | 'horns' | 'cap' | 'tiara' | 'mask';
  nameKey: string;
  price: { type: 'coins'; price: number } | { type: 'ads'; count: number } | { type: 'free' };
  /** Golden glow effect in game. */
  shiny?: boolean;
}

const VARIANTS: { key: string; palette: SkinDef['palette']; accessory?: SkinDef['accessory']; shiny?: boolean }[] = [
  { key: 'gold', palette: { outfit: '#ffbe0b', accent: '#fff3b0', hair: '#7f5539' }, accessory: 'crown', shiny: true },
  { key: 'neon', palette: { outfit: '#3a0ca3', accent: '#4cc9f0', hair: '#f72585' }, accessory: 'shades' },
  { key: 'pirate', palette: { outfit: '#2b2d42', accent: '#d90429', hair: '#3d2b1f' }, accessory: 'pirate' },
  { key: 'angel', palette: { outfit: '#f8f9fa', accent: '#ffd166', hair: '#ffe8a3' }, accessory: 'halo' },
  { key: 'demon', palette: { outfit: '#6a040f', accent: '#ff5400', hair: '#1b1b1b' }, accessory: 'horns' },
  { key: 'sport', palette: { outfit: '#06d6a0', accent: '#ffffff', hair: '#073b4c' }, accessory: 'cap' },
  { key: 'royal', palette: { outfit: '#7b2cbf', accent: '#ffd60a', hair: '#e5e5e5' }, accessory: 'tiara' },
  { key: 'ninja', palette: { outfit: '#1b263b', accent: '#e63946', hair: '#0d1b2a' }, accessory: 'mask' },
];

/** Each hero: default skin + 2 extra (one for coins, one for 3 rewarded ads). */
export const SKINS: SkinDef[] = HEROES.flatMap((h, i) => {
  const a = VARIANTS[i % VARIANTS.length];
  const b = VARIANTS[(i + 3) % VARIANTS.length];
  return [
    { id: `${h.id}_0`, hero: h.id, palette: {}, nameKey: 'skin_default', price: { type: 'free' } } as SkinDef,
    { id: `${h.id}_1`, hero: h.id, palette: a.palette, accessory: a.accessory, shiny: a.shiny, nameKey: `skin_${a.key}`, price: { type: 'coins', price: 400 + i * 60 } } as SkinDef,
    { id: `${h.id}_2`, hero: h.id, palette: b.palette, accessory: b.accessory, shiny: b.shiny, nameKey: `skin_${b.key}`, price: { type: 'ads', count: 3 } } as SkinDef,
  ];
});

export const skinsOf = (hero: string) => SKINS.filter((s) => s.hero === hero);
export const skinById = (id: string) => SKINS.find((s) => s.id === id);

export type BoosterId = 'shield' | 'damage' | 'speed' | 'super' | 'life';

export interface BoosterDef {
  id: BoosterId;
  price: number;
}

export const BOOSTERS: BoosterDef[] = [
  { id: 'shield', price: 120 },
  { id: 'damage', price: 160 },
  { id: 'speed', price: 100 },
  { id: 'super', price: 140 },
  { id: 'life', price: 220 },
];

export const COIN_AD_REWARD = 150;
export const COIN_AD_COOLDOWN_MS = 3 * 60 * 1000;
export const FREE_BOOSTER_COOLDOWN_MS = 10 * 60 * 1000;
