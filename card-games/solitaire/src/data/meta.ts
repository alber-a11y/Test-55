import type { BoosterId } from './boosters';

export type Reward = { coins?: number; boosters?: Partial<Record<BoosterId, number>>; xp?: number };

/** 7-day login calendar; missing a day restarts from day 1. */
export const DAILY_REWARDS: Reward[] = [
  { coins: 50 },
  { boosters: { hint: 2 } },
  { coins: 100 },
  { boosters: { startJoker: 1 } },
  { coins: 150 },
  { boosters: { plus5: 1, undo: 2 } },
  { coins: 300, boosters: { breaker: 1, joker: 1 } },
];

export interface WheelSeg {
  reward: Reward;
  weight: number;
  color: number;
}

export const WHEEL: WheelSeg[] = [
  { reward: { coins: 50 }, weight: 22, color: 0x5aa9ff },
  { reward: { boosters: { hint: 2 } }, weight: 16, color: 0xffd166 },
  { reward: { coins: 100 }, weight: 16, color: 0x5ad17e },
  { reward: { boosters: { startJoker: 1 } }, weight: 10, color: 0xff6b6b },
  { reward: { coins: 250 }, weight: 8, color: 0xb084ff },
  { reward: { boosters: { plus5: 1 } }, weight: 10, color: 0xffa94d },
  { reward: { coins: 500 }, weight: 3, color: 0xff4d6d },
  { reward: { boosters: { breaker: 1 } }, weight: 8, color: 0x3fd0c9 },
  { reward: { boosters: { xray: 1 } }, weight: 7, color: 0x98a2b8 },
];

export const WHEEL_AD_SPINS_PER_DAY = 5;

export type QuestKind =
  | 'tpWin'
  | 'play'
  | 'winKlondike'
  | 'winSpider'
  | 'winFreecell'
  | 'combo'
  | 'stars'
  | 'gold'
  | 'ice'
  | 'daily'
  | 'blitz'
  | 'cards';

export interface QuestDef {
  kind: QuestKind;
  targets: number[];
  coins: number;
}

export const QUESTS: QuestDef[] = [
  { kind: 'tpWin', targets: [2, 3, 5], coins: 100 },
  { kind: 'play', targets: [3, 5, 8], coins: 80 },
  { kind: 'winKlondike', targets: [1, 2], coins: 120 },
  { kind: 'winSpider', targets: [1], coins: 150 },
  { kind: 'winFreecell', targets: [1, 2], coins: 120 },
  { kind: 'combo', targets: [7, 9, 12], coins: 100 },
  { kind: 'stars', targets: [4, 6, 9], coins: 100 },
  { kind: 'gold', targets: [3, 6], coins: 90 },
  { kind: 'ice', targets: [6, 12], coins: 90 },
  { kind: 'daily', targets: [1], coins: 120 },
  { kind: 'blitz', targets: [2000, 4000], coins: 110 },
  { kind: 'cards', targets: [100, 200], coins: 80 },
];

/** Max-value quests track a best value instead of a sum. */
export const MAX_QUESTS: QuestKind[] = ['combo', 'blitz'];

export interface AchvDef {
  id: string;
  icon: string;
  tiers: number[];
  coins: number[];
}

export const ACHIEVEMENTS: AchvDef[] = [
  { id: 'levels', icon: 'map', tiers: [10, 50, 200], coins: [100, 300, 800] },
  { id: 'stars', icon: 'star', tiers: [30, 150, 500], coins: [100, 300, 800] },
  { id: 'klondike', icon: 'cards', tiers: [5, 25, 100], coins: [100, 250, 600] },
  { id: 'spider', icon: 'cards', tiers: [3, 15, 50], coins: [120, 300, 700] },
  { id: 'freecell', icon: 'cards', tiers: [3, 15, 50], coins: [120, 300, 700] },
  { id: 'combo', icon: 'fire', tiers: [10, 15, 20], coins: [100, 250, 500] },
  { id: 'daily', icon: 'calendar', tiers: [3, 15, 50], coins: [100, 300, 700] },
  { id: 'cities', icon: 'globe', tiers: [1, 4, 12], coins: [150, 400, 1000] },
  { id: 'postcards', icon: 'album', tiers: [3, 15, 36], coins: [100, 300, 800] },
  { id: 'blitz', icon: 'timer', tiers: [3000, 8000, 15000], coins: [100, 250, 600] },
  { id: 'coins', icon: 'coins', tiers: [1000, 10000, 50000], coins: [100, 300, 1000] },
  { id: 'played', icon: 'deck', tiers: [10, 100, 500], coins: [100, 300, 800] },
];

/** XP needed to go from player level n to n+1. */
export const xpForLevel = (n: number): number => 100 + 60 * (n - 1);
