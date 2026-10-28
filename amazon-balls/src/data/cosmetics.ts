import type { Lang } from '../platform/types';

export type CosmeticKind = 'balls' | 'bg' | 'launcher' | 'mosaic';

export type Unlock = { type: 'free' } | { type: 'coins'; price: number } | { type: 'ads'; views: number };

export interface Cosmetic {
  id: string;
  kind: CosmeticKind;
  name: Record<Lang, string>;
  unlock: Unlock;
}

const coins = (price: number): Unlock => ({ type: 'coins', price });
const ads: Unlock = { type: 'ads', views: 3 };
const free: Unlock = { type: 'free' };

export const BALL_SKINS: Cosmetic[] = [
  { id: 'glossy', kind: 'balls', name: { ru: 'Глянец', en: 'Glossy' }, unlock: free },
  { id: 'candy', kind: 'balls', name: { ru: 'Леденцы', en: 'Candy' }, unlock: coins(400) },
  { id: 'smile', kind: 'balls', name: { ru: 'Смайлики', en: 'Smileys' }, unlock: coins(600) },
  { id: 'gem', kind: 'balls', name: { ru: 'Самоцветы', en: 'Gems' }, unlock: coins(900) },
  { id: 'fruit', kind: 'balls', name: { ru: 'Фрукты', en: 'Fruits' }, unlock: coins(1200) },
  { id: 'beetle', kind: 'balls', name: { ru: 'Жуки', en: 'Beetles' }, unlock: coins(1500) },
  { id: 'pearl', kind: 'balls', name: { ru: 'Перламутр', en: 'Pearls' }, unlock: coins(2000) },
  { id: 'faces', kind: 'balls', name: { ru: 'Мордочки', en: 'Critters' }, unlock: ads },
  { id: 'neon', kind: 'balls', name: { ru: 'Неон', en: 'Neon' }, unlock: ads },
  { id: 'planet', kind: 'balls', name: { ru: 'Планеты', en: 'Planets' }, unlock: ads },
];

export const BACKGROUNDS: Cosmetic[] = [
  { id: 'jungle', kind: 'bg', name: { ru: 'Джунгли', en: 'Jungle' }, unlock: free },
  { id: 'sunset', kind: 'bg', name: { ru: 'Закат на реке', en: 'River Sunset' }, unlock: coins(500) },
  { id: 'mangrove', kind: 'bg', name: { ru: 'Мангровые заросли', en: 'Mangroves' }, unlock: coins(800) },
  { id: 'waterfall', kind: 'bg', name: { ru: 'Водопад', en: 'Waterfall' }, unlock: coins(1100) },
  { id: 'temple', kind: 'bg', name: { ru: 'Затерянный храм', en: 'Lost Temple' }, unlock: coins(1500) },
  { id: 'night', kind: 'bg', name: { ru: 'Ночные джунгли', en: 'Jungle Night' }, unlock: ads },
  { id: 'carnival', kind: 'bg', name: { ru: 'Карнавал', en: 'Carnival' }, unlock: ads },
  { id: 'eldorado', kind: 'bg', name: { ru: 'Эльдорадо', en: 'El Dorado' }, unlock: ads },
];

export const LAUNCHERS: Cosmetic[] = [
  { id: 'lily', kind: 'launcher', name: { ru: 'Кувшинка', en: 'Water Lily' }, unlock: free },
  { id: 'shell', kind: 'launcher', name: { ru: 'Ракушка', en: 'Seashell' }, unlock: coins(600) },
  { id: 'idol', kind: 'launcher', name: { ru: 'Каменный идол', en: 'Stone Idol' }, unlock: coins(1000) },
  { id: 'sun', kind: 'launcher', name: { ru: 'Солнце инков', en: 'Inca Sun' }, unlock: coins(1400) },
  { id: 'flower', kind: 'launcher', name: { ru: 'Орхидея', en: 'Orchid' }, unlock: ads },
  { id: 'crystal', kind: 'launcher', name: { ru: 'Кристалл', en: 'Crystal' }, unlock: ads },
];

/** Mosaic packs: owning a pack adds its pictures to the level generator. */
export const MOSAIC_PACKS: Cosmetic[] = [
  { id: 'amazon', kind: 'mosaic', name: { ru: 'Амазония', en: 'Amazonia' }, unlock: free },
  { id: 'fruits', kind: 'mosaic', name: { ru: 'Фрукты', en: 'Fruits' }, unlock: coins(500) },
  { id: 'birds', kind: 'mosaic', name: { ru: 'Птицы', en: 'Birds' }, unlock: coins(800) },
  { id: 'patterns', kind: 'mosaic', name: { ru: 'Узоры племён', en: 'Tribal Patterns' }, unlock: coins(1000) },
  { id: 'predators', kind: 'mosaic', name: { ru: 'Хищники', en: 'Predators' }, unlock: coins(1300) },
  { id: 'river', kind: 'mosaic', name: { ru: 'Подводный мир', en: 'River Life' }, unlock: ads },
  { id: 'sweets', kind: 'mosaic', name: { ru: 'Сладости', en: 'Sweets' }, unlock: ads },
];

export const ALL_COSMETICS: Cosmetic[] = [...BALL_SKINS, ...BACKGROUNDS, ...LAUNCHERS, ...MOSAIC_PACKS];

export function cosmeticById(id: string): Cosmetic | undefined {
  return ALL_COSMETICS.find((c) => c.id === id);
}

export const DEFAULT_OWNED = ALL_COSMETICS.filter((c) => c.unlock.type === 'free').map((c) => c.id);
