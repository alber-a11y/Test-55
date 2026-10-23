import { mergeDeep, Store } from '@shared/core/store';
import type { Lang } from '@shared/platform/types';
import { BOOSTERS, type BoosterId } from './data/boosters';
import type { QuestKind } from './data/meta';

export type ModeId = 'tripeaks' | 'klondike' | 'spider' | 'freecell' | 'blitz' | 'daily';

export interface ModeStats {
  played: number;
  won: number;
  best: number;
  bestTime: number;
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

export interface SaveData {
  v: 1;
  coins: number;
  coinsEarned: number;
  xp: number;
  plevel: number;
  avatar: number;
  name: string;
  adv: {
    max: number;
    stars: Record<string, number>;
    starChests: number;
    postcards: string[];
    cityRewards: number[];
  };
  boosters: Record<BoosterId, number>;
  owned: string[];
  equip: { back: string; face: string; table: string };
  adProgress: Record<string, number>;
  settings: {
    soundVol: number;
    musicVol: number;
    lang: Lang | null;
    klDraw: 1 | 3;
    spSuits: 1 | 2 | 4;
    solvable: boolean;
    autoMove: boolean;
    leftHand: boolean;
    timer: boolean;
  };
  stats: Record<ModeId, ModeStats>;
  totals: { played: number; cards: number; gold: number; ice: number; bestCombo: number; ads: number };
  daily: { last: string; day: number };
  wheel: { day: string; freeUsed: boolean; ads: number };
  quests: { day: string; list: QuestState[]; bonus: boolean };
  achv: Record<string, number>;
  dailyCh: string[];
  lastCoinAd: number;
  resume: unknown | null;
  tutorial: Record<string, boolean>;
}

const modeStats = (): ModeStats => ({ played: 0, won: 0, best: 0, bestTime: 0, streak: 0, bestStreak: 0 });

export function fresh(): SaveData {
  const boosters = {} as Record<BoosterId, number>;
  for (const b of BOOSTERS) boosters[b.id] = 0;
  boosters.hint = 3;
  boosters.startJoker = 1;
  return {
    v: 1,
    coins: 300,
    coinsEarned: 0,
    xp: 0,
    plevel: 1,
    avatar: 0,
    name: '',
    adv: { max: 1, stars: {}, starChests: 0, postcards: [], cityRewards: [] },
    boosters,
    owned: ['back:blue', 'back:red', 'face:classic', 'face:big', 'table:green'],
    equip: { back: 'blue', face: 'classic', table: 'green' },
    adProgress: {},
    settings: { soundVol: 0.8, musicVol: 0.5, lang: null, klDraw: 1, spSuits: 1, solvable: true, autoMove: true, leftHand: false, timer: true },
    stats: { tripeaks: modeStats(), klondike: modeStats(), spider: modeStats(), freecell: modeStats(), blitz: modeStats(), daily: modeStats() },
    totals: { played: 0, cards: 0, gold: 0, ice: 0, bestCombo: 0, ads: 0 },
    daily: { last: '', day: 0 },
    wheel: { day: '', freeUsed: false, ads: 0 },
    quests: { day: '', list: [], bonus: false },
    achv: {},
    dailyCh: [],
    lastCoinAd: 0,
    resume: null,
    tutorial: {},
  };
}

function migrate(raw: any, base: SaveData): SaveData {
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return base;
  const out = mergeDeep(base, raw);
  // Records with dynamic keys are taken as-is.
  out.adv.stars = raw.adv?.stars ?? {};
  out.adProgress = raw.adProgress ?? {};
  out.achv = raw.achv ?? {};
  out.tutorial = raw.tutorial ?? {};
  out.quests.list = Array.isArray(raw.quests?.list) ? raw.quests.list : [];
  out.owned = Array.from(new Set([...base.owned, ...(Array.isArray(raw.owned) ? raw.owned : [])]));
  out.adv.max = Math.max(1, out.adv.max | 0);
  return out;
}

export const save = new Store<SaveData>(fresh, migrate);
