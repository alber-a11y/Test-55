import type { BackStyle } from '@shared/cards/backs';
import type { TableStyle } from '@shared/cards/tables';
import { railBack } from '../art/cards';
import type { BoosterId, ModeId, QuestKind } from '../save';
import { WORLDS } from './route';

export type Reward = { coins?: number; boosters?: Partial<Record<BoosterId, number>>; xp?: number };

export interface BoosterDef {
  id: BoosterId;
  icon: string;
  price: number;
  /** Used before a station starts (LevelIntro) or at the table. */
  where: 'pre' | 'table';
}

export const BOOSTERS: BoosterDef[] = [
  { id: 'hint', icon: 'hint', price: 60, where: 'table' },
  { id: 'peek', icon: 'eye', price: 100, where: 'table' },
  { id: 'undo', icon: 'undo', price: 60, where: 'table' },
  { id: 'xray', icon: 'xray', price: 150, where: 'table' },
  { id: 'counter', icon: 'stats', price: 90, where: 'table' },
  { id: 'redeal', icon: 'shuffle', price: 100, where: 'table' },
  { id: 'lucky', icon: 'clover', price: 150, where: 'pre' },
  { id: 'shield', icon: 'shield', price: 200, where: 'pre' },
  { id: 'extra', icon: 'plusdeal', price: 180, where: 'pre' },
];
export const boosterDef = (id: BoosterId): BoosterDef => BOOSTERS.find((b) => b.id === id)!;

export const DAILY_REWARDS: Reward[] = [
  { coins: 60 },
  { boosters: { hint: 2 } },
  { coins: 120 },
  { boosters: { peek: 1, undo: 1 } },
  { coins: 180 },
  { boosters: { lucky: 1, shield: 1 } },
  { coins: 350, boosters: { xray: 1, extra: 1 } },
];

export const WHEEL: { reward: Reward; weight: number; color: number }[] = [
  { reward: { coins: 50 }, weight: 22, color: 0x3b5bab },
  { reward: { boosters: { hint: 2 } }, weight: 16, color: 0xd9a23a },
  { reward: { coins: 100 }, weight: 16, color: 0x2f7d5a },
  { reward: { boosters: { peek: 1 } }, weight: 10, color: 0xa3213a },
  { reward: { coins: 250 }, weight: 8, color: 0x6a5a8c },
  { reward: { boosters: { lucky: 1 } }, weight: 8, color: 0x4caf50 },
  { reward: { coins: 500 }, weight: 3, color: 0xc92a2a },
  { reward: { boosters: { undo: 2 } }, weight: 9, color: 0x2f5d62 },
  { reward: { boosters: { xray: 1 } }, weight: 8, color: 0x5b2a5e },
];
export const WHEEL_AD_SPINS_PER_DAY = 5;

export const QUESTS: { kind: QuestKind; targets: number[]; coins: number }[] = [
  { kind: 'win', targets: [1, 2, 3], coins: 100 },
  { kind: 'deals', targets: [5, 8, 12], coins: 80 },
  { kind: 'career', targets: [1, 2, 3], coins: 120 },
  { kind: 'contract', targets: [2, 3, 5], coins: 100 },
  { kind: 'marriage', targets: [1, 2, 3], coins: 100 },
  { kind: 'hearts', targets: [1], coins: 150 },
  { kind: 'defend', targets: [1, 2, 3], coins: 100 },
  { kind: 'etude', targets: [1, 3], coins: 100 },
  { kind: 'cup', targets: [1], coins: 150 },
  { kind: 'daily', targets: [1], coins: 120 },
  { kind: 'big', targets: [1], coins: 150 },
  { kind: 'tricks', targets: [15, 25], coins: 90 },
];

export const ACHIEVEMENTS: { id: string; icon: string; tiers: number[]; coins: number[] }[] = [
  { id: 'wins', icon: 'trophy', tiers: [5, 25, 100], coins: [100, 300, 800] },
  { id: 'route', icon: 'train', tiers: [10, 40, 80], coins: [150, 400, 1000] },
  { id: 'bosses', icon: 'crown', tiers: [1, 4, 8], coins: [150, 400, 1000] },
  { id: 'contracts', icon: 'ticket', tiers: [10, 50, 200], coins: [100, 300, 800] },
  { id: 'bigContract', icon: 'lightning', tiers: [150, 200, 260], coins: [150, 400, 1000] },
  { id: 'marriages', icon: 'ring', tiers: [10, 50, 200], coins: [100, 300, 800] },
  { id: 'hearts', icon: 'heart', tiers: [3, 15, 50], coins: [120, 300, 700] },
  { id: 'defended', icon: 'shield', tiers: [5, 30, 100], coins: [100, 250, 600] },
  { id: 'barrels', icon: 'barrel', tiers: [1, 5, 20], coins: [150, 400, 900] },
  { id: 'etudes', icon: 'hint', tiers: [5, 25, 100], coins: [100, 300, 800] },
  { id: 'cups', icon: 'podium', tiers: [1, 5, 20], coins: [150, 400, 1000] },
  { id: 'deals', icon: 'deck', tiers: [50, 300, 1500], coins: [100, 300, 800] },
];

export const xpForLevel = (n: number): number => 100 + 60 * (n - 1);

/** Ranks of the express crew (rating leagues). */
export const RANKS = [
  { id: 'passenger', min: 0 },
  { id: 'stoker', min: 1100 },
  { id: 'conductor', min: 1250 },
  { id: 'engineer', min: 1400 },
  { id: 'chief', min: 1600 },
  { id: 'master', min: 1850 },
];
export const rankOf = (rating: number): number => {
  let k = 0;
  RANKS.forEach((l, i) => {
    if (rating >= l.min) k = i;
  });
  return k;
};

/** Modes on the Modes screen and the route station that opens them. */
export const MODES: { id: ModeId; icon: string; color: number; unlock: number }[] = [
  { id: 'quick', icon: 'cards', color: 0x2b3d78, unlock: 0 },
  { id: 'blitz', icon: 'lightning', color: 0xc4782a, unlock: 3 },
  { id: 'daily', icon: 'calendar', color: 0xa3213a, unlock: 5 },
  { id: 'etude', icon: 'hint', color: 0x2f6b4f, unlock: 8 },
  { id: 'cup', icon: 'podium', color: 0x6a5a8c, unlock: 12 },
  { id: 'dark', icon: 'eye', color: 0x1f2747, unlock: 16 },
  { id: 'fever', icon: 'ring', color: 0xc92a2a, unlock: 20 },
];

/* ---------------- Skins ---------------- */

export type Unlock = { t: 'free' } | { t: 'coins'; price: number } | { t: 'ads'; n: number } | { t: 'boss'; world: number };
export type SkinKind = 'back' | 'face' | 'table' | 'emote';
export interface SkinItem {
  id: string;
  kind: SkinKind;
  ru: string;
  en: string;
  unlock: Unlock;
}

export const BACK_STYLES: BackStyle[] = [
  railBack('express', '#2b3d78', '#141d40', '#f3d48a', 'lattice', 'loco'),
  railBack('navy', '#1f2f5c', '#0d1430', '#c9a55c', 'rings', 'wheel'),
  railBack('burgundy', '#8c2f39', '#4a1220', '#ffd6a5', 'chevron', 'plate'),
  railBack('emerald', '#2f6b4f', '#123826', '#c9f2d8', 'scales', 'loco'),
  railBack('ticket', '#f2dfae', '#d9b978', '#8a3a2a', 'stripes', 'plate', '#fffaf0'),
  railBack('rails', '#3a3f58', '#1c1f30', '#d9a23a', 'plain', 'rails'),
  railBack('sunset', '#e76f51', '#7a2a3a', '#ffe08a', 'waves', 'wheel'),
  railBack('night', '#1b2350', '#070b22', '#ffe08a', 'stars', 'loco'),
  railBack('deco', '#1d1d22', '#0b0b0e', '#e6c36a', 'mandala', 'plate', '#121214'),
  railBack('mint', '#3fb8a8', '#1a6b62', '#fff6e0', 'dots', 'wheel'),
  railBack('royal', '#5b2a86', '#2e1350', '#ffd166', 'hex', 'loco'),
  ...WORLDS.map((w) => railBack(`w_${w.id}`, w.wall, '#111827', w.accent, 'lattice', 'loco')),
];

export const TABLE_STYLES: TableStyle[] = [
  { id: 'green', kind: 'felt', c1: '#1f7a55', c2: '#0b3324' },
  { id: 'navy', kind: 'felt', c1: '#2b3d78', c2: '#0b1026' },
  { id: 'burgundy', kind: 'felt', c1: '#8c2335', c2: '#360b14' },
  { id: 'wood', kind: 'wood', c1: '#9a6235', c2: '#3e2210', detail: '#2a160a' },
  { id: 'marble', kind: 'marble', c1: '#e9e6df', c2: '#a9a49a', detail: '#7d7a73' },
  { id: 'night', kind: 'night', c1: '#25306b', c2: '#060a22' },
];

export const EMOTE_IDS = ['happy', 'angry', 'sad', 'smug', 'surprised', 'say_gg', 'say_hurry', 'say_luck', 'say_oops', 'say_barrel', 'say_thousand'];

export const SKINS: SkinItem[] = [
  { id: 'express', kind: 'back', ru: 'Экспресс', en: 'Express', unlock: { t: 'free' } },
  { id: 'navy', kind: 'back', ru: 'Крылатое колесо', en: 'Winged Wheel', unlock: { t: 'free' } },
  { id: 'burgundy', kind: 'back', ru: 'Бордо', en: 'Burgundy', unlock: { t: 'coins', price: 300 } },
  { id: 'ticket', kind: 'back', ru: 'Билет', en: 'Ticket', unlock: { t: 'coins', price: 400 } },
  { id: 'emerald', kind: 'back', ru: 'Изумрудный', en: 'Emerald', unlock: { t: 'ads', n: 2 } },
  { id: 'rails', kind: 'back', ru: 'Рельсы', en: 'Rails', unlock: { t: 'coins', price: 500 } },
  { id: 'sunset', kind: 'back', ru: 'Закат', en: 'Sunset', unlock: { t: 'ads', n: 2 } },
  { id: 'night', kind: 'back', ru: 'Ночной рейс', en: 'Night Run', unlock: { t: 'ads', n: 3 } },
  { id: 'mint', kind: 'back', ru: 'Мята', en: 'Mint', unlock: { t: 'coins', price: 600 } },
  { id: 'royal', kind: 'back', ru: 'Королевский', en: 'Royal', unlock: { t: 'coins', price: 900 } },
  { id: 'deco', kind: 'back', ru: 'Ар-деко', en: 'Art Deco', unlock: { t: 'coins', price: 1500 } },
  ...WORLDS.map((w, i): SkinItem => ({ id: `w_${w.id}`, kind: 'back', ru: w.ru, en: w.en, unlock: { t: 'boss', world: i } })),
  { id: 'deco', kind: 'face', ru: 'Ар-деко', en: 'Art Deco', unlock: { t: 'free' } },
  { id: 'classic', kind: 'face', ru: 'Классика', en: 'Classic', unlock: { t: 'free' } },
  { id: 'big', kind: 'face', ru: 'Крупные', en: 'Large', unlock: { t: 'coins', price: 200 } },
  { id: 'four', kind: 'face', ru: '4 цвета', en: '4 colors', unlock: { t: 'coins', price: 300 } },
  { id: 'ticket', kind: 'face', ru: 'Билетные', en: 'Ticket', unlock: { t: 'ads', n: 2 } },
  { id: 'retro', kind: 'face', ru: 'Ретро', en: 'Retro', unlock: { t: 'coins', price: 600 } },
  { id: 'minimal', kind: 'face', ru: 'Минимал', en: 'Minimal', unlock: { t: 'ads', n: 2 } },
  { id: 'neon', kind: 'face', ru: 'Неон', en: 'Neon', unlock: { t: 'ads', n: 3 } },
  { id: 'brass', kind: 'face', ru: 'Латунь', en: 'Brass', unlock: { t: 'coins', price: 1500 } },
  { id: 'route', kind: 'table', ru: 'Вагон маршрута', en: 'Route carriage', unlock: { t: 'free' } },
  { id: 'green', kind: 'table', ru: 'Сукно', en: 'Felt', unlock: { t: 'coins', price: 200 } },
  { id: 'navy', kind: 'table', ru: 'Синее сукно', en: 'Navy felt', unlock: { t: 'coins', price: 300 } },
  { id: 'burgundy', kind: 'table', ru: 'Бордо', en: 'Burgundy', unlock: { t: 'ads', n: 2 } },
  { id: 'wood', kind: 'table', ru: 'Дуб', en: 'Oak', unlock: { t: 'coins', price: 800 } },
  { id: 'marble', kind: 'table', ru: 'Мрамор', en: 'Marble', unlock: { t: 'ads', n: 3 } },
  { id: 'night', kind: 'table', ru: 'Ночь', en: 'Night', unlock: { t: 'coins', price: 1000 } },
  { id: 'happy', kind: 'emote', ru: 'Улыбка', en: 'Smile', unlock: { t: 'free' } },
  { id: 'angry', kind: 'emote', ru: 'Злость', en: 'Anger', unlock: { t: 'free' } },
  { id: 'sad', kind: 'emote', ru: 'Грусть', en: 'Sadness', unlock: { t: 'free' } },
  { id: 'smug', kind: 'emote', ru: 'Ухмылка', en: 'Smirk', unlock: { t: 'coins', price: 200 } },
  { id: 'surprised', kind: 'emote', ru: 'Удивление', en: 'Surprise', unlock: { t: 'ads', n: 1 } },
  { id: 'say_gg', kind: 'emote', ru: '«Хорошая игра»', en: '"Good game"', unlock: { t: 'coins', price: 150 } },
  { id: 'say_hurry', kind: 'emote', ru: '«Поезд не ждёт!»', en: '"The train won\'t wait!"', unlock: { t: 'ads', n: 1 } },
  { id: 'say_luck', kind: 'emote', ru: '«Ни пуха!»', en: '"Good luck!"', unlock: { t: 'coins', price: 150 } },
  { id: 'say_oops', kind: 'emote', ru: '«Упс!»', en: '"Oops!"', unlock: { t: 'ads', n: 2 } },
  { id: 'say_barrel', kind: 'emote', ru: '«Я на бочке!»', en: '"I\'m on the barrel!"', unlock: { t: 'coins', price: 400 } },
  { id: 'say_thousand', kind: 'emote', ru: '«Тысяча моя!»', en: '"The thousand is mine!"', unlock: { t: 'ads', n: 3 } },
];

export const backStyle = (id: string): BackStyle => BACK_STYLES.find((b) => b.id === id) ?? BACK_STYLES[0];
export const tableStyle = (id: string): TableStyle | null => TABLE_STYLES.find((b) => b.id === id) ?? null;
export const skinKey = (s: { kind: SkinKind; id: string }): string => `${s.kind}:${s.id}`;
