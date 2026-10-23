import { mergeDeep, Store } from '@shared/core/store';
import type { Lang } from '@shared/platform/types';

export type BoosterId = 'hint' | 'peek' | 'redeal' | 'swap' | 'counter' | 'shield' | 'bribe';
export type ModeId = 'career' | 'quick' | 'tournament' | 'puzzle' | 'daily';
export type QuestKind = 'win' | 'play' | 'career' | 'transfer' | 'beat' | 'catch' | 'puzzle' | 'tournament' | 'noPogony' | 'quickWin' | 'daily' | 'trumpWin';

export interface ModeStats {
  played: number;
  won: number;
  streak: number;
  bestStreak: number;
}

export interface QuestState {
  kind: QuestKind;
  target: number;
  progress: number;
  coins: number;
  claimed: boolean;
}

export interface TourState {
  /** 8 entrants, index 0 is the player: name, face seed, AI level. */
  entrants: { name: string; seed: number; female: boolean; level: number }[];
  /** Entrant indices still in, per round (round 0 has all 8). */
  rounds: number[][];
  round: number;
  out: boolean;
  done: boolean;
}

export interface SaveData {
  v: 1;
  coins: number;
  coinsEarned: number;
  xp: number;
  plevel: number;
  avatar: number;
  career: { next: number; stars: Record<string, number>; trophies: number[] };
  rating: number;
  bestRating: number;
  boosters: Record<BoosterId, number>;
  owned: string[];
  equip: { back: string; face: string; table: string };
  emotes: string[];
  adProgress: Record<string, number>;
  settings: { soundVol: number; musicVol: number; lang: Lang | null; speed: 1 | 2 | 3; ruLetters: boolean; quick: { players: number; deck: 24 | 36 | 52; transfer: boolean; teams: boolean; cheat: boolean; level: number } };
  stats: Record<ModeId, ModeStats>;
  totals: { deals: number; wins: number; fools: number; pogony: number; caught: number; caughtBy: number; transfers: number; beaten: number; ads: number; draws: number };
  daily: { last: string; day: number };
  wheel: { day: string; freeUsed: boolean; ads: number };
  quests: { day: string; list: QuestState[]; bonus: boolean };
  achv: Record<string, number>;
  dailyTable: string[];
  puzzles: { solved: number };
  tournament: { wins: number; played: number };
  tour: TourState | null;
  lastCoinAd: number;
  tutorial: Record<string, boolean>;
}

const ms = (): ModeStats => ({ played: 0, won: 0, streak: 0, bestStreak: 0 });

export function fresh(): SaveData {
  return {
    v: 1,
    coins: 300,
    coinsEarned: 0,
    xp: 0,
    plevel: 1,
    avatar: 0,
    career: { next: 0, stars: {}, trophies: [] },
    rating: 1000,
    bestRating: 1000,
    boosters: { hint: 3, peek: 1, redeal: 1, swap: 0, counter: 1, shield: 0, bribe: 0 },
    owned: ['back:red', 'back:blue', 'face:classic', 'face:big', 'table:loc'],
    equip: { back: 'red', face: 'classic', table: 'loc' },
    emotes: ['happy', 'angry', 'sad'],
    adProgress: {},
    settings: { soundVol: 0.8, musicVol: 0.5, lang: null, speed: 2, ruLetters: false, quick: { players: 2, deck: 36, transfer: false, teams: false, cheat: false, level: 2 } },
    stats: { career: ms(), quick: ms(), tournament: ms(), puzzle: ms(), daily: ms() },
    totals: { deals: 0, wins: 0, fools: 0, pogony: 0, caught: 0, caughtBy: 0, transfers: 0, beaten: 0, ads: 0, draws: 0 },
    daily: { last: '', day: 0 },
    wheel: { day: '', freeUsed: false, ads: 0 },
    quests: { day: '', list: [], bonus: false },
    achv: {},
    dailyTable: [],
    puzzles: { solved: 0 },
    tournament: { wins: 0, played: 0 },
    tour: null,
    lastCoinAd: 0,
    tutorial: {},
  };
}

function migrate(raw: any, base: SaveData): SaveData {
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return base;
  const out = mergeDeep(base, raw);
  out.career.stars = raw.career?.stars ?? {};
  out.career.trophies = Array.isArray(raw.career?.trophies) ? raw.career.trophies : [];
  out.adProgress = raw.adProgress ?? {};
  out.achv = raw.achv ?? {};
  out.tutorial = raw.tutorial ?? {};
  out.quests.list = Array.isArray(raw.quests?.list) ? raw.quests.list : [];
  out.owned = Array.from(new Set([...base.owned, ...(Array.isArray(raw.owned) ? raw.owned : [])]));
  out.tour = raw.tour ?? null;
  out.emotes = Array.from(new Set([...base.emotes, ...(Array.isArray(raw.emotes) ? raw.emotes : [])]));
  return out;
}

export const save = new Store<SaveData>(fresh, migrate);
