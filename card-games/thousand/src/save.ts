import { mergeDeep, Store } from '@shared/core/store';
import type { Lang } from '@shared/platform/types';

export type BoosterId = 'hint' | 'peek' | 'undo' | 'redeal' | 'shield' | 'counter' | 'xray' | 'lucky' | 'extra';
export type ModeId = 'career' | 'quick' | 'blitz' | 'dark' | 'fever' | 'cup' | 'daily' | 'etude';
export type QuestKind = 'win' | 'deals' | 'career' | 'contract' | 'marriage' | 'hearts' | 'defend' | 'etude' | 'cup' | 'daily' | 'big' | 'tricks';

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

export interface CupState {
  stage: number;
  /** Opponent seeds of the 4 stages. */
  seeds: number[];
  out: boolean;
  done: boolean;
}

export interface QuickCfg {
  level: number;
  target: 1000 | 500;
  barrel: boolean;
  bolts: boolean;
  samosval: boolean;
  rospis: boolean;
  golden: boolean;
}

export interface SaveData {
  v: 1;
  coins: number;
  coinsEarned: number;
  xp: number;
  plevel: number;
  avatar: number;
  route: { next: number; stars: Record<string, number>; trophies: number[]; chests: number[] };
  rating: number;
  bestRating: number;
  boosters: Record<BoosterId, number>;
  owned: string[];
  equip: { back: string; face: string; table: string };
  emotes: string[];
  adProgress: Record<string, number>;
  /** Modes opened ahead of time for one try with a rewarded ad. */
  trial: string[];
  settings: { soundVol: number; musicVol: number; lang: Lang | null; speed: 1 | 2 | 3; ruLetters: boolean; autoPlay: boolean; quick: QuickCfg };
  stats: Record<ModeId, ModeStats>;
  totals: { deals: number; matches: number; wins: number; contracts: number; contractsMade: number; bestContract: number; marriages: number; hearts: number; bolts: number; barrels: number; samosvals: number; defended: number; ads: number; tricks: number };
  daily: { last: string; day: number };
  wheel: { day: string; freeUsed: boolean; ads: number };
  quests: { day: string; list: QuestState[]; bonus: boolean };
  achv: Record<string, number>;
  dailyDeal: Record<string, number>;
  etudes: { solved: number };
  cup: { wins: number; played: number };
  cupState: CupState | null;
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
    route: { next: 0, stars: {}, trophies: [], chests: [] },
    rating: 1000,
    bestRating: 1000,
    boosters: { hint: 3, peek: 1, undo: 2, redeal: 1, shield: 1, counter: 1, xray: 0, lucky: 1, extra: 0 },
    owned: ['back:express', 'back:navy', 'face:deco', 'face:classic', 'table:route'],
    equip: { back: 'express', face: 'deco', table: 'route' },
    emotes: ['happy', 'angry', 'sad'],
    adProgress: {},
    trial: [],
    settings: { soundVol: 0.8, musicVol: 0.5, lang: null, speed: 2, ruLetters: false, autoPlay: true, quick: { level: 2, target: 1000, barrel: true, bolts: true, samosval: true, rospis: true, golden: false } },
    stats: { career: ms(), quick: ms(), blitz: ms(), dark: ms(), fever: ms(), cup: ms(), daily: ms(), etude: ms() },
    totals: { deals: 0, matches: 0, wins: 0, contracts: 0, contractsMade: 0, bestContract: 0, marriages: 0, hearts: 0, bolts: 0, barrels: 0, samosvals: 0, defended: 0, ads: 0, tricks: 0 },
    daily: { last: '', day: 0 },
    wheel: { day: '', freeUsed: false, ads: 0 },
    quests: { day: '', list: [], bonus: false },
    achv: {},
    dailyDeal: {},
    etudes: { solved: 0 },
    cup: { wins: 0, played: 0 },
    cupState: null,
    lastCoinAd: 0,
    tutorial: {},
  };
}

function migrate(raw: any, base: SaveData): SaveData {
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return base;
  const out = mergeDeep(base, raw);
  out.route.stars = raw.route?.stars ?? {};
  out.route.trophies = Array.isArray(raw.route?.trophies) ? raw.route.trophies : [];
  out.route.chests = Array.isArray(raw.route?.chests) ? raw.route.chests : [];
  out.adProgress = raw.adProgress ?? {};
  out.achv = raw.achv ?? {};
  out.tutorial = raw.tutorial ?? {};
  out.dailyDeal = raw.dailyDeal ?? {};
  out.trial = Array.isArray(raw.trial) ? raw.trial : [];
  out.quests.list = Array.isArray(raw.quests?.list) ? raw.quests.list : [];
  out.owned = Array.from(new Set([...base.owned, ...(Array.isArray(raw.owned) ? raw.owned : [])]));
  out.emotes = Array.from(new Set([...base.emotes, ...(Array.isArray(raw.emotes) ? raw.emotes : [])]));
  out.cupState = raw.cupState ?? null;
  return out;
}

export const save = new Store<SaveData>(fresh, migrate);
