import type { BackStyle } from '@shared/cards/backs';
import type { TableStyle } from '@shared/cards/tables';
import type { BoosterId, QuestKind } from '../save';
import { LOCATIONS } from './locations';

export type Reward = { coins?: number; boosters?: Partial<Record<BoosterId, number>>; xp?: number };

export interface BoosterDef {
  id: BoosterId;
  icon: string;
  price: number;
}

export const BOOSTERS: BoosterDef[] = [
  { id: 'hint', icon: 'hint', price: 60 },
  { id: 'peek', icon: 'eye', price: 120 },
  { id: 'redeal', icon: 'shuffle', price: 100 },
  { id: 'swap', icon: 'refresh', price: 120 },
  { id: 'counter', icon: 'stats', price: 80 },
  { id: 'shield', icon: 'medal', price: 200 },
  { id: 'bribe', icon: 'coins', price: 150 },
];
export const boosterDef = (id: BoosterId): BoosterDef => BOOSTERS.find((b) => b.id === id)!;

export const DAILY_REWARDS: Reward[] = [
  { coins: 50 },
  { boosters: { hint: 2 } },
  { coins: 100 },
  { boosters: { peek: 1, counter: 1 } },
  { coins: 150 },
  { boosters: { shield: 1, redeal: 1 } },
  { coins: 300, boosters: { swap: 1, bribe: 1 } },
];

export const WHEEL: { reward: Reward; weight: number; color: number }[] = [
  { reward: { coins: 50 }, weight: 22, color: 0x5aa9ff },
  { reward: { boosters: { hint: 2 } }, weight: 16, color: 0xffd166 },
  { reward: { coins: 100 }, weight: 16, color: 0x5ad17e },
  { reward: { boosters: { peek: 1 } }, weight: 10, color: 0xff6b6b },
  { reward: { coins: 250 }, weight: 8, color: 0xb084ff },
  { reward: { boosters: { shield: 1 } }, weight: 8, color: 0xffa94d },
  { reward: { coins: 500 }, weight: 3, color: 0xff4d6d },
  { reward: { boosters: { redeal: 1 } }, weight: 9, color: 0x3fd0c9 },
  { reward: { boosters: { counter: 1 } }, weight: 8, color: 0x98a2b8 },
];
export const WHEEL_AD_SPINS_PER_DAY = 5;

export const QUESTS: { kind: QuestKind; targets: number[]; coins: number }[] = [
  { kind: 'win', targets: [2, 3, 5], coins: 100 },
  { kind: 'play', targets: [3, 5, 8], coins: 80 },
  { kind: 'career', targets: [1, 2, 3], coins: 120 },
  { kind: 'transfer', targets: [2, 4], coins: 90 },
  { kind: 'beat', targets: [20, 40], coins: 90 },
  { kind: 'catch', targets: [1, 2], coins: 120 },
  { kind: 'puzzle', targets: [1, 3], coins: 100 },
  { kind: 'tournament', targets: [1], coins: 150 },
  { kind: 'noPogony', targets: [2, 3], coins: 80 },
  { kind: 'quickWin', targets: [1, 2], coins: 90 },
  { kind: 'daily', targets: [1], coins: 120 },
  { kind: 'trumpWin', targets: [1], coins: 100 },
];

export const ACHIEVEMENTS: { id: string; icon: string; tiers: number[]; coins: number[] }[] = [
  { id: 'wins', icon: 'trophy', tiers: [10, 50, 200], coins: [100, 300, 800] },
  { id: 'career', icon: 'map', tiers: [9, 36, 72], coins: [150, 400, 1000] },
  { id: 'bosses', icon: 'crown', tiers: [1, 4, 8], coins: [150, 400, 1000] },
  { id: 'rating', icon: 'medal', tiers: [1250, 1600, 1850], coins: [150, 400, 1000] },
  { id: 'transfers', icon: 'shuffle', tiers: [10, 50, 200], coins: [100, 250, 600] },
  { id: 'beaten', icon: 'cards', tiers: [100, 500, 2000], coins: [100, 250, 600] },
  { id: 'caught', icon: 'eye', tiers: [3, 15, 50], coins: [120, 300, 700] },
  { id: 'puzzles', icon: 'hint', tiers: [5, 25, 100], coins: [100, 300, 800] },
  { id: 'tournaments', icon: 'podium', tiers: [1, 5, 20], coins: [150, 400, 1000] },
  { id: 'daily', icon: 'calendar', tiers: [3, 15, 50], coins: [100, 300, 700] },
  { id: 'coins', icon: 'coins', tiers: [1000, 10000, 50000], coins: [100, 300, 1000] },
  { id: 'played', icon: 'deck', tiers: [10, 100, 500], coins: [100, 300, 800] },
];

export const xpForLevel = (n: number): number => 100 + 60 * (n - 1);

export const LEAGUES = [
  { id: 'novice', min: 0 },
  { id: 'amateur', min: 1100 },
  { id: 'expert', min: 1250 },
  { id: 'master', min: 1400 },
  { id: 'gm', min: 1600 },
  { id: 'king', min: 1850 },
];
export const leagueOf = (rating: number): number => {
  let k = 0;
  LEAGUES.forEach((l, i) => {
    if (rating >= l.min) k = i;
  });
  return k;
};

/* ---------------- Skins ---------------- */

export type Unlock = { t: 'free' } | { t: 'coins'; price: number } | { t: 'ads'; n: number } | { t: 'boss'; loc: number };
export type SkinKind = 'back' | 'face' | 'table' | 'emote';
export interface SkinItem {
  id: string;
  kind: SkinKind;
  ru: string;
  en: string;
  unlock: Unlock;
}

const B = (id: string, c1: string, c2: string, accent: string, pattern: BackStyle['pattern'], emblem: BackStyle['emblem'] = 'none', margin?: string): BackStyle => ({ id, c1, c2, accent, pattern, emblem, margin });

export const BACK_STYLES: BackStyle[] = [
  B('red', '#c8323c', '#7f1d26', '#ffb3b3', 'lattice', 1),
  B('blue', '#2f5fd0', '#1c3a8a', '#9cc3ff', 'lattice', 0),
  B('royal', '#5b2a86', '#2e1350', '#ffd166', 'mandala', 'star'),
  B('emerald', '#1f8a5b', '#0d4a30', '#9ff0c8', 'scales', 3),
  B('ocean', '#1d7fb8', '#0b3d63', '#bde6ff', 'waves', 'none'),
  B('sunset', '#ff7a45', '#b5175a', '#ffe08a', 'stripes', 'star'),
  B('starry', '#1b2350', '#070b22', '#ffe08a', 'stars', 'none'),
  B('checker', '#3a4568', '#1f2b48', '#ffffff', 'checker', 2),
  B('hex', '#334155', '#0f172a', '#7dd3fc', 'hex', 'star'),
  B('suits', '#f4efe2', '#e2d7bd', '#b0303a', 'suits', 'none', '#ffffff'),
  B('noir', '#1d1d22', '#0b0b0e', '#e6c36a', 'lattice', 'star', '#121214'),
  ...LOCATIONS.map((l) => B(`loc_${l.id}`, l.c1, l.c2, l.accent, 'rings', 'star')),
];

export const TABLE_STYLES: TableStyle[] = [
  { id: 'green', kind: 'felt', c1: '#1f7a55', c2: '#0b3324' },
  { id: 'blue', kind: 'felt', c1: '#2763a8', c2: '#0c2244' },
  { id: 'burgundy', kind: 'felt', c1: '#8c2335', c2: '#360b14' },
  { id: 'wood', kind: 'wood', c1: '#9a6235', c2: '#3e2210', detail: '#2a160a' },
  { id: 'marble', kind: 'marble', c1: '#e9e6df', c2: '#a9a49a', detail: '#7d7a73' },
  { id: 'night', kind: 'night', c1: '#25306b', c2: '#060a22' },
];

export const EMOTE_IDS = ['happy', 'angry', 'sad', 'smug', 'surprised', 'say_bito', 'say_hurry', 'say_gg', 'say_oops', 'say_king', 'say_fool'];

export const SKINS: SkinItem[] = [
  { id: 'red', kind: 'back', ru: 'Классика', en: 'Classic', unlock: { t: 'free' } },
  { id: 'blue', kind: 'back', ru: 'Синяя', en: 'Blue', unlock: { t: 'free' } },
  { id: 'suits', kind: 'back', ru: 'Масти', en: 'Suits', unlock: { t: 'coins', price: 250 } },
  { id: 'royal', kind: 'back', ru: 'Королевская', en: 'Royal', unlock: { t: 'coins', price: 400 } },
  { id: 'ocean', kind: 'back', ru: 'Океан', en: 'Ocean', unlock: { t: 'ads', n: 2 } },
  { id: 'emerald', kind: 'back', ru: 'Изумруд', en: 'Emerald', unlock: { t: 'coins', price: 500 } },
  { id: 'sunset', kind: 'back', ru: 'Закат', en: 'Sunset', unlock: { t: 'coins', price: 600 } },
  { id: 'starry', kind: 'back', ru: 'Звёздная ночь', en: 'Starry Night', unlock: { t: 'ads', n: 3 } },
  { id: 'checker', kind: 'back', ru: 'Шахматы', en: 'Checker', unlock: { t: 'coins', price: 500 } },
  { id: 'hex', kind: 'back', ru: 'Соты', en: 'Hexagon', unlock: { t: 'ads', n: 2 } },
  { id: 'noir', kind: 'back', ru: 'Нуар', en: 'Noir', unlock: { t: 'coins', price: 1500 } },
  ...LOCATIONS.map((l, i): SkinItem => ({ id: `loc_${l.id}`, kind: 'back', ru: l.ru, en: l.en, unlock: { t: 'boss', loc: i } })),
  { id: 'classic', kind: 'face', ru: 'Классика', en: 'Classic', unlock: { t: 'free' } },
  { id: 'big', kind: 'face', ru: 'Крупные', en: 'Large', unlock: { t: 'free' } },
  { id: 'four', kind: 'face', ru: '4 цвета', en: '4 colors', unlock: { t: 'coins', price: 300 } },
  { id: 'retro', kind: 'face', ru: 'Ретро', en: 'Retro', unlock: { t: 'coins', price: 600 } },
  { id: 'minimal', kind: 'face', ru: 'Минимал', en: 'Minimal', unlock: { t: 'ads', n: 2 } },
  { id: 'candy', kind: 'face', ru: 'Карамель', en: 'Caramel', unlock: { t: 'ads', n: 2 } },
  { id: 'neon', kind: 'face', ru: 'Неон', en: 'Neon', unlock: { t: 'ads', n: 3 } },
  { id: 'noir', kind: 'face', ru: 'Золото', en: 'Gold', unlock: { t: 'coins', price: 1500 } },
  { id: 'loc', kind: 'table', ru: 'Стол локации', en: 'Location table', unlock: { t: 'free' } },
  { id: 'green', kind: 'table', ru: 'Сукно', en: 'Felt', unlock: { t: 'coins', price: 200 } },
  { id: 'blue', kind: 'table', ru: 'Синее сукно', en: 'Blue felt', unlock: { t: 'coins', price: 300 } },
  { id: 'burgundy', kind: 'table', ru: 'Бордо', en: 'Burgundy', unlock: { t: 'ads', n: 2 } },
  { id: 'wood', kind: 'table', ru: 'Дуб', en: 'Oak', unlock: { t: 'coins', price: 800 } },
  { id: 'marble', kind: 'table', ru: 'Мрамор', en: 'Marble', unlock: { t: 'ads', n: 3 } },
  { id: 'night', kind: 'table', ru: 'Ночь', en: 'Night', unlock: { t: 'coins', price: 1000 } },
  { id: 'happy', kind: 'emote', ru: 'Улыбка', en: 'Smile', unlock: { t: 'free' } },
  { id: 'angry', kind: 'emote', ru: 'Злость', en: 'Anger', unlock: { t: 'free' } },
  { id: 'sad', kind: 'emote', ru: 'Грусть', en: 'Sadness', unlock: { t: 'free' } },
  { id: 'smug', kind: 'emote', ru: 'Ухмылка', en: 'Smirk', unlock: { t: 'coins', price: 200 } },
  { id: 'surprised', kind: 'emote', ru: 'Удивление', en: 'Surprise', unlock: { t: 'ads', n: 1 } },
  { id: 'say_bito', kind: 'emote', ru: '«Бито!»', en: '"Beaten!"', unlock: { t: 'coins', price: 150 } },
  { id: 'say_hurry', kind: 'emote', ru: '«Ходи давай!»', en: '"Hurry up!"', unlock: { t: 'ads', n: 1 } },
  { id: 'say_gg', kind: 'emote', ru: '«Хорошая игра»', en: '"Good game"', unlock: { t: 'coins', price: 150 } },
  { id: 'say_oops', kind: 'emote', ru: '«Упс!»', en: '"Oops!"', unlock: { t: 'ads', n: 2 } },
  { id: 'say_king', kind: 'emote', ru: '«Я король!»', en: '"I am the king!"', unlock: { t: 'coins', price: 400 } },
  { id: 'say_fool', kind: 'emote', ru: '«Ну ты и дурак!»', en: '"What a fool!"', unlock: { t: 'ads', n: 3 } },
];

export const backStyle = (id: string): BackStyle => BACK_STYLES.find((b) => b.id === id) ?? BACK_STYLES[0];
export const tableStyle = (id: string): TableStyle | null => TABLE_STYLES.find((b) => b.id === id) ?? null;
export const skinKey = (s: { kind: SkinKind; id: string }): string => `${s.kind}:${s.id}`;
