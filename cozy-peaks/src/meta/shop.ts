import { BOOSTERS, type BoosterId } from './boosters';
import { PREMIUM_VARIANT, ROOMS } from './rooms';
import type { L10n } from './types';

/** How an item is paid for: coins, or N rewarded views (progress is kept between sessions). */
export type Price = { coins: number } | { ads: number } | { free: true };

export type ShopTab = 'boosters' | 'decor' | 'skins' | 'extras';

export type Grant =
  | { kind: 'booster'; id: BoosterId; count: number }
  | { kind: 'boosterPack'; items: Partial<Record<BoosterId, number>> }
  | { kind: 'coins'; amount: number }
  | { kind: 'livesRefill' }
  | { kind: 'infiniteLives'; minutes: number }
  | { kind: 'cardBack'; id: string }
  | { kind: 'frame'; id: string }
  | { kind: 'premiumVariant'; room: string; task: string }
  | { kind: 'bonusDecor'; room: string; item: string };

export interface ShopItem {
  id: string;
  tab: ShopTab;
  name: L10n;
  price: Price;
  grant: Grant;
  /** Repeatable consumables vs one-time unlocks. */
  once: boolean;
  /** Minutes before a rewarded consumable can be taken again. */
  cooldownMin?: number;
  /** Badge on the card. */
  badge?: 'hit' | 'new' | 'best';
}

export interface Cosmetic {
  id: string;
  name: L10n;
  price: Price;
}

export const CARD_BACKS: Cosmetic[] = [
  { id: 'leaf', name: { ru: 'Сапфировые листья', en: 'Sapphire leaves' }, price: { free: true } },
  { id: 'rose', name: { ru: 'Алая роза', en: 'Scarlet rose' }, price: { ads: 1 } },
  { id: 'ivy', name: { ru: 'Плющ', en: 'Ivy' }, price: { coins: 1500 } },
  { id: 'lavender', name: { ru: 'Лаванда', en: 'Lavender' }, price: { ads: 2 } },
  { id: 'maple', name: { ru: 'Осенний клён', en: 'Autumn maple' }, price: { ads: 3 } },
  { id: 'sun', name: { ru: 'Золотое солнце', en: 'Golden sun' }, price: { coins: 3000 } },
  { id: 'night', name: { ru: 'Звёздная ночь', en: 'Starry night' }, price: { ads: 4 } },
  { id: 'gingham', name: { ru: 'Клетка пикник', en: 'Picnic gingham' }, price: { ads: 2 } },
  { id: 'patch', name: { ru: 'Лоскутное', en: 'Patchwork' }, price: { ads: 5 } },
];

export const FRAMES: Cosmetic[] = [
  { id: 'plain', name: { ru: 'Обычная', en: 'Plain' }, price: { free: true } },
  { id: 'wood', name: { ru: 'Деревянная', en: 'Wooden' }, price: { ads: 1 } },
  { id: 'flowers', name: { ru: 'Цветочная', en: 'Floral' }, price: { ads: 2 } },
  { id: 'hearts', name: { ru: 'Сердечки', en: 'Hearts' }, price: { ads: 3 } },
  { id: 'gold', name: { ru: 'Золотая', en: 'Golden' }, price: { coins: 5000 } },
];

const boosterItems: ShopItem[] = BOOSTERS.flatMap((b) => [
  {
    id: `ad_${b.id}`,
    tab: 'boosters' as const,
    name: b.name,
    price: { ads: 1 },
    grant: { kind: 'booster' as const, id: b.id, count: 1 },
    once: false,
    cooldownMin: 2,
  },
  {
    id: `coins_${b.id}`,
    tab: 'boosters' as const,
    name: b.name,
    price: { coins: b.price * 3 - 150 },
    grant: { kind: 'booster' as const, id: b.id, count: 3 },
    once: false,
  },
]);

const packs: ShopItem[] = [
  {
    id: 'pack_starter',
    tab: 'boosters',
    name: { ru: 'Набор новичка', en: 'Starter pack' },
    price: { ads: 2 },
    grant: { kind: 'boosterPack', items: { undo: 2, wild: 1, plusCard: 2 } },
    once: false,
    cooldownMin: 30,
    badge: 'hit',
  },
  {
    id: 'pack_big',
    tab: 'boosters',
    name: { ru: 'Большой набор', en: 'Big pack' },
    price: { ads: 4 },
    grant: { kind: 'boosterPack', items: { undo: 3, wild: 2, plusCard: 3, hammer: 2, peek: 2 } },
    once: false,
    cooldownMin: 60,
    badge: 'best',
  },
  {
    id: 'pack_start',
    tab: 'boosters',
    name: { ru: 'Удачный старт', en: 'Lucky start' },
    price: { ads: 3 },
    grant: { kind: 'boosterPack', items: { lucky: 2, startWild: 2, plus3: 2 } },
    once: false,
    cooldownMin: 60,
  },
];

const extras: ShopItem[] = [
  { id: 'coins_ad', tab: 'extras', name: { ru: '150 монет', en: '150 coins' }, price: { ads: 1 }, grant: { kind: 'coins', amount: 150 }, once: false, cooldownMin: 3, badge: 'hit' },
  { id: 'coins_ad3', tab: 'extras', name: { ru: '800 монет', en: '800 coins' }, price: { ads: 3 }, grant: { kind: 'coins', amount: 800 }, once: false, cooldownMin: 20 },
  { id: 'coins_ad6', tab: 'extras', name: { ru: '2000 монет', en: '2000 coins' }, price: { ads: 6 }, grant: { kind: 'coins', amount: 2000 }, once: false, cooldownMin: 60, badge: 'best' },
  { id: 'lives_ad', tab: 'extras', name: { ru: 'Все жизни', en: 'Full lives' }, price: { ads: 1 }, grant: { kind: 'livesRefill' }, once: false, cooldownMin: 5 },
  { id: 'lives_coins', tab: 'extras', name: { ru: 'Все жизни', en: 'Full lives' }, price: { coins: 600 }, grant: { kind: 'livesRefill' }, once: false },
  { id: 'inf_lives', tab: 'extras', name: { ru: 'Бесконечные жизни 30 мин', en: 'Unlimited lives 30 min' }, price: { ads: 2 }, grant: { kind: 'infiniteLives', minutes: 30 }, once: false, cooldownMin: 60 },
];

const skins: ShopItem[] = [
  ...CARD_BACKS.map((c) => ({
    id: `back_${c.id}`,
    tab: 'skins' as const,
    name: c.name,
    price: c.price,
    grant: { kind: 'cardBack' as const, id: c.id },
    once: true,
  })),
  ...FRAMES.map((c) => ({
    id: `frame_${c.id}`,
    tab: 'skins' as const,
    name: c.name,
    price: c.price,
    grant: { kind: 'frame' as const, id: c.id },
    once: true,
  })),
];

const decor: ShopItem[] = ROOMS.flatMap((r) => [
  ...r.bonus.map((b) => ({
    id: `bonus_${r.id}_${b.id}`,
    tab: 'decor' as const,
    name: b.name,
    price: b.coins ? { coins: b.coins } : { ads: b.ads ?? 2 },
    grant: { kind: 'bonusDecor' as const, room: r.id, item: b.id },
    once: true,
    badge: 'new' as const,
  })),
  ...r.tasks.map((t) => ({
    id: `premium_${r.id}_${t.id}`,
    tab: 'decor' as const,
    name: { ru: `${t.name.ru}: ${t.variants[PREMIUM_VARIANT].ru}`, en: `${t.name.en}: ${t.variants[PREMIUM_VARIANT].en}` },
    price: { ads: 2 },
    grant: { kind: 'premiumVariant' as const, room: r.id, task: t.id },
    once: true,
  })),
]);

export const SHOP: ShopItem[] = [...packs, ...boosterItems, ...extras, ...skins, ...decor];

export const shopItem = (id: string): ShopItem | undefined => SHOP.find((s) => s.id === id);
export const premiumItemId = (room: string, task: string) => `premium_${room}_${task}`;
export const bonusItemId = (room: string, item: string) => `bonus_${room}_${item}`;
