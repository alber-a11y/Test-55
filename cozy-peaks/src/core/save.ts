import { BOOSTERS, type BoosterId } from '../meta/boosters';
import { ROOMS } from '../meta/rooms';
import { platform } from '../platform/platform';
import type { Lang } from '../platform/types';
import { CONFIG } from './config';

export interface RoomState {
  /** task id → chosen variant index. */
  tasks: Record<string, number>;
  /** Owned bonus decor items placed in this room. */
  bonus: string[];
}

export interface SaveData {
  v: 1;
  hero: string | null;
  lang: Lang | null;
  coins: number;
  stars: number;
  xp: number;
  /** Next level to play. */
  level: number;
  wins: number;
  losses: number;
  lives: number;
  /** When regeneration of the next life started (ms). */
  lifeTs: number;
  infiniteUntil: number;
  boosters: Record<BoosterId, number>;
  room: string;
  rooms: Record<string, RoomState>;
  /** Unlocked premium variants, "room:task". */
  premium: string[];
  cardBack: string;
  frame: string;
  /** Owned cosmetics: card backs and frames by id. */
  owned: string[];
  /** Rewarded views collected towards an item. */
  adProgress: Record<string, number>;
  /** Item id → time it becomes available again. */
  cooldowns: Record<string, number>;
  chest: number;
  daily: { day: string; progress: Record<string, number>; claimed: string[] };
  settings: { sound: number; music: number; hint: boolean };
  /** One-time hints already shown. */
  seen: Record<string, boolean>;
  /** Level in progress (resumes after reload). */
  current: { n: number; state: string; boosters: string[] } | null;
  stats: { played: number; bestCombo: number; peaks: number; decorated: number };
}

export function freshSave(): SaveData {
  const boosters = {} as Record<BoosterId, number>;
  for (const b of BOOSTERS) boosters[b.id] = b.kind === 'level' ? CONFIG.startBoosters : 1;
  const rooms: Record<string, RoomState> = {};
  for (const r of ROOMS) rooms[r.id] = { tasks: {}, bonus: [] };
  return {
    v: 1,
    hero: null,
    lang: null,
    coins: CONFIG.startCoins,
    stars: 0,
    xp: 0,
    level: 1,
    wins: 0,
    losses: 0,
    lives: CONFIG.livesMax,
    lifeTs: Date.now(),
    infiniteUntil: 0,
    boosters,
    room: ROOMS[0].id,
    rooms,
    premium: [],
    cardBack: 'leaf',
    frame: 'plain',
    owned: ['leaf', 'plain'],
    adProgress: {},
    cooldowns: {},
    chest: 0,
    daily: { day: '', progress: {}, claimed: [] },
    settings: { sound: 0.8, music: 0.5, hint: true },
    seen: {},
    current: null,
    stats: { played: 0, bestCombo: 0, peaks: 0, decorated: 0 },
  };
}

function migrate(raw: any): SaveData {
  const base = freshSave();
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return base;
  const out: SaveData = { ...base, ...raw };
  out.boosters = { ...base.boosters, ...(raw.boosters ?? {}) };
  out.rooms = { ...base.rooms };
  for (const [k, r] of Object.entries(raw.rooms ?? {})) out.rooms[k] = { ...{ tasks: {}, bonus: [] }, ...(r as Partial<RoomState>) };
  out.settings = { ...base.settings, ...(raw.settings ?? {}) };
  out.stats = { ...base.stats, ...(raw.stats ?? {}) };
  out.daily = { ...base.daily, ...(raw.daily ?? {}) };
  return out;
}

const LOCAL_KEY = 'cozy_peaks_backup_v1';

class SaveStore {
  data: SaveData = freshSave();
  private timer: number | null = null;
  private listeners = new Set<() => void>();

  async load(): Promise<void> {
    let raw: unknown = null;
    try {
      raw = await platform.loadData();
    } catch {
      raw = null;
    }
    if (!raw) {
      try {
        const s = localStorage.getItem(LOCAL_KEY);
        raw = s ? JSON.parse(s) : null;
      } catch {
        raw = null;
      }
    }
    this.data = migrate(raw);
  }

  /** Persist soon (debounced) and notify the HUD. */
  commit(): void {
    this.listeners.forEach((l) => l());
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.flush(), 300);
  }

  flush(): void {
    this.timer = null;
    void platform.saveData(this.data).catch(() => {});
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(this.data));
    } catch {
      /* ignore */
    }
  }

  subscribe(l: () => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  reset(): void {
    this.data = freshSave();
    this.commit();
  }
}

export const save = new SaveStore();
(window as any).__save = save;
