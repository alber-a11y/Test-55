import { BOOSTERS, type BoosterId } from '../data/boosters';
import { DEFAULT_OWNED } from '../data/cosmetics';
import { platform } from '../platform/platform';
import type { Lang } from '../platform/types';

export interface Settings {
  musicVol: number;
  soundVol: number;
  vibration: boolean;
  /** Fewer particles / effects for weak devices. */
  lowFx: boolean;
  lang: Lang | null;
}

export interface SaveData {
  v: 1;
  coins: number;
  /** Highest level the player may start (cleared + 1). */
  maxLevel: number;
  /** Best stars by level number. */
  stars: Record<string, number>;
  owned: string[];
  equipped: { balls: string; bg: string; launcher: string };
  /** Rewarded views already watched for "watch 3 ads" cosmetics. */
  adViews: Record<string, number>;
  boosters: Record<BoosterId, number>;
  settings: Settings;
  daily: { last: string; streak: number };
  /** Per-day counters for limited rewarded placements. */
  limits: { day: string; freeCoins: number; freeBooster: number };
  stats: { played: number; wins: number; popped: number; rescued: number };
  tutorialDone: boolean;
}

function fresh(): SaveData {
  const boosters = {} as Record<BoosterId, number>;
  for (const b of BOOSTERS) boosters[b.id] = 1;
  return {
    v: 1,
    coins: 200,
    maxLevel: 1,
    stars: {},
    owned: [...DEFAULT_OWNED],
    equipped: { balls: 'glossy', bg: 'jungle', launcher: 'lily' },
    adViews: {},
    boosters,
    settings: { musicVol: 0.6, soundVol: 0.85, vibration: true, lowFx: false, lang: null },
    daily: { last: '', streak: 0 },
    limits: { day: '', freeCoins: 0, freeBooster: 0 },
    stats: { played: 0, wins: 0, popped: 0, rescued: 0 },
    tutorialDone: false,
  };
}

/** Merge a loaded (possibly older / partial) save on top of defaults. */
function migrate(raw: any): SaveData {
  const base = fresh();
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return base;
  const out: SaveData = {
    ...base,
    ...raw,
    equipped: { ...base.equipped, ...(raw.equipped ?? {}) },
    boosters: { ...base.boosters, ...(raw.boosters ?? {}) },
    settings: { ...base.settings, ...(raw.settings ?? {}) },
    daily: { ...base.daily, ...(raw.daily ?? {}) },
    limits: { ...base.limits, ...(raw.limits ?? {}) },
    stats: { ...base.stats, ...(raw.stats ?? {}) },
  };
  out.owned = Array.from(new Set([...(Array.isArray(raw.owned) ? raw.owned : []), ...DEFAULT_OWNED]));
  out.maxLevel = Math.max(1, out.maxLevel | 0);
  out.coins = Math.max(0, out.coins | 0);
  return out;
}

class SaveManager {
  data: SaveData = fresh();
  private timer: number | null = null;

  async load(): Promise<void> {
    this.data = migrate(await platform.loadData());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.flush();
    });
    window.addEventListener('pagehide', () => this.flush());
  }

  /** Debounced persist. */
  save(): void {
    if (this.timer !== null) return;
    this.timer = window.setTimeout(() => this.flush(), 500);
  }

  flush(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    void platform.saveData(this.data);
  }

  reset(): void {
    const settings = this.data.settings;
    this.data = fresh();
    this.data.settings = settings;
    this.flush();
  }
}

export const save = new SaveManager();
