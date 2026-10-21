import { CONFIG } from '../config';
import { BOOSTERS, START_BOOSTERS, type BoosterId } from '../game/boosters';
import { platform } from '../platform/platform';
import type { Lang } from '../platform/types';

export interface SaveData {
  v: 1;
  /** Highest unlocked level. */
  level: number;
  stars: Record<string, number>;
  coins: number;
  boosters: Partial<Record<BoosterId, number>>;
  bestClassic: number;
  settings: {
    music: boolean;
    sfx: boolean;
    musicVol: number;
    sfxVol: number;
    vibro: boolean;
    lang: Lang | null;
  };
  daily: {
    chest: string;
    wheelFree: string;
    wheelAdDate: string;
    wheelAdUsed: number;
  };
  stats: { played: number; wins: number; classicGames: number };
}

function fresh(): SaveData {
  return {
    v: 1,
    level: 1,
    stars: {},
    coins: CONFIG.economy.startCoins,
    boosters: { ...START_BOOSTERS },
    bestClassic: 0,
    settings: { music: true, sfx: true, musicVol: 0.6, sfxVol: 0.8, vibro: true, lang: null },
    daily: { chest: '', wheelFree: '', wheelAdDate: '', wheelAdUsed: 0 },
    stats: { played: 0, wins: 0, classicGames: 0 },
  };
}

export let save: SaveData = fresh();

function merge(raw: any): SaveData {
  const d = fresh();
  if (!raw || typeof raw !== 'object') return d;
  const num = (v: unknown, def: number) => (typeof v === 'number' && isFinite(v) ? v : def);
  d.level = Math.max(1, Math.floor(num(raw.level, 1)));
  d.coins = Math.max(0, Math.floor(num(raw.coins, d.coins)));
  d.bestClassic = Math.max(0, num(raw.bestClassic, 0));
  if (raw.stars && typeof raw.stars === 'object') d.stars = { ...raw.stars };
  if (raw.boosters && typeof raw.boosters === 'object') {
    d.boosters = {};
    for (const b of BOOSTERS) d.boosters[b.id] = Math.max(0, Math.floor(num(raw.boosters[b.id], 0)));
  }
  if (raw.settings) Object.assign(d.settings, raw.settings);
  if (raw.daily) Object.assign(d.daily, raw.daily);
  if (raw.stats) Object.assign(d.stats, raw.stats);
  return d;
}

export async function loadSave(): Promise<void> {
  try {
    save = merge(await platform.loadData());
  } catch {
    save = fresh();
  }
}

let timer = 0;
/** Debounced write through the platform (cloud on Yandex, localStorage otherwise). */
export function persist(now = false): void {
  clearTimeout(timer);
  const run = () => void platform.saveData(save);
  if (now) run();
  else timer = window.setTimeout(run, 400);
}

export function resetSave(): void {
  const lang = save.settings.lang;
  save = fresh();
  save.settings.lang = lang;
  persist(true);
}

// ---------- economy ----------

const coinListeners: (() => void)[] = [];
export function onCoins(f: () => void): void {
  coinListeners.push(f);
}

export function addCoins(n: number): void {
  save.coins = Math.max(0, save.coins + Math.round(n));
  coinListeners.forEach((f) => f());
  persist();
}

export function spendCoins(n: number): boolean {
  if (save.coins < n) return false;
  addCoins(-n);
  return true;
}

export function boosterCount(id: BoosterId): number {
  return save.boosters[id] ?? 0;
}

export function addBooster(id: BoosterId, n = 1): void {
  save.boosters[id] = boosterCount(id) + n;
  persist();
}

export function takeBooster(id: BoosterId): void {
  save.boosters[id] = Math.max(0, boosterCount(id) - 1);
  persist();
}
