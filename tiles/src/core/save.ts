import type { Lang } from './i18n';

export type BoosterId = 'undo' | 'magnet' | 'shuffle' | 'slot';
export const BOOSTERS: BoosterId[] = ['undo', 'magnet', 'shuffle', 'slot'];

export interface SaveData {
  v: 1;
  /** Highest unlocked level (the one the player plays next). */
  level: number;
  /** Best stars per level, index = level - 1. */
  stars: number[];
  coins: number;
  boosters: Record<BoosterId, number>;
  owned: string[];
  equipped: { bg: string; skin: string; icons: string; theme: string };
  /** Rewarded views collected toward ad-only shop items. */
  adProgress: Record<string, number>;
  settings: { music: number; sfx: number; vibro: boolean; lang: Lang | null };
  daily: { last: string; streak: number };
  freeCoins: { day: string; count: number };
  tutorial: Record<string, boolean>;
  stats: { wins: number; losses: number };
}

const KEY = 'tile_master_save_v1';

export function defaultSave(): SaveData {
  return {
    v: 1,
    level: 1,
    stars: [],
    coins: 150,
    boosters: { undo: 1, magnet: 1, shuffle: 1, slot: 1 },
    owned: ['bg_meadow', 'skin_classic', 'icons_garden', 'theme_sky'],
    equipped: { bg: 'bg_meadow', skin: 'skin_classic', icons: 'icons_garden', theme: 'theme_sky' },
    adProgress: {},
    settings: { music: 0.6, sfx: 0.8, vibro: true, lang: null },
    daily: { last: '', streak: 0 },
    freeCoins: { day: '', count: 0 },
    tutorial: {},
    stats: { wins: 0, losses: 0 },
  };
}

function merge(base: SaveData, raw: Partial<SaveData>): SaveData {
  const out = { ...base, ...raw } as SaveData;
  out.boosters = { ...base.boosters, ...(raw.boosters ?? {}) };
  out.equipped = { ...base.equipped, ...(raw.equipped ?? {}) };
  out.settings = { ...base.settings, ...(raw.settings ?? {}) };
  out.daily = { ...base.daily, ...(raw.daily ?? {}) };
  out.freeCoins = { ...base.freeCoins, ...(raw.freeCoins ?? {}) };
  out.stats = { ...base.stats, ...(raw.stats ?? {}) };
  out.owned = Array.from(new Set([...base.owned, ...(raw.owned ?? [])]));
  if (!Array.isArray(out.stars)) out.stars = [];
  if (!(out.level >= 1)) out.level = 1;
  if (!(out.coins >= 0)) out.coins = 0;
  return out;
}

class SaveStore {
  data: SaveData = defaultSave();
  private timer: number | undefined;

  load(): void {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = merge(defaultSave(), JSON.parse(raw));
    } catch {
      this.data = defaultSave();
    }
  }

  /** Debounced write — many small changes in a row cost one localStorage write. */
  save(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.flush(), 250);
  }

  flush(): void {
    this.timer = undefined;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage unavailable (private mode) — progress lives for this session only */
    }
  }

  reset(): void {
    const lang = this.data.settings.lang;
    this.data = defaultSave();
    this.data.settings.lang = lang;
    this.flush();
  }
}

export const store = new SaveStore();

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
