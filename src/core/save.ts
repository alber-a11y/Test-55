import { HEROES } from '../data/heroes';
import { BOOSTERS, type BoosterId } from '../data/shop';
import { platform } from '../platform/platform';
import type { Lang } from '../platform/types';

export interface HeroState {
  owned: boolean;
  level: number;
  skin: string;
  skins: string[];
}

export interface SaveData {
  v: 1;
  coins: number;
  /** Highest level the player may start (cleared + 1). */
  maxLevel: number;
  /** Level currently chosen in the menu. */
  level: number;
  selectedHero: string;
  heroes: Record<string, HeroState>;
  boosters: Record<BoosterId, number>;
  /** Rewarded-ad progress for "watch 3 ads" unlocks, by item key. */
  ads: Record<string, number>;
  stars: Record<string, number>;
  settings: { soundVol: number; musicVol: number; lang: Lang | null };
  lastCoinAd: number;
  lastFreeBooster: number;
  stats: { kills: number; bosses: number; played: number };
}

function fresh(): SaveData {
  const heroes: Record<string, HeroState> = {};
  for (const h of HEROES) {
    heroes[h.id] = { owned: h.unlock.type === 'start', level: 1, skin: `${h.id}_0`, skins: [`${h.id}_0`] };
  }
  const boosters = {} as Record<BoosterId, number>;
  for (const b of BOOSTERS) boosters[b.id] = 0;
  boosters.shield = 1;
  return {
    v: 1,
    coins: 150,
    maxLevel: 1,
    level: 1,
    selectedHero: 'rocky',
    heroes,
    boosters,
    ads: {},
    stars: {},
    settings: { soundVol: 0.8, musicVol: 0.6, lang: null },
    lastCoinAd: 0,
    lastFreeBooster: 0,
    stats: { kills: 0, bosses: 0, played: 0 },
  };
}

/** Merge a loaded (possibly older / partial) save on top of defaults. */
function migrate(raw: any): SaveData {
  const base = fresh();
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return base;
  const out: SaveData = { ...base, ...raw, settings: { ...base.settings, ...(raw.settings ?? {}) }, stats: { ...base.stats, ...(raw.stats ?? {}) } };
  out.heroes = { ...base.heroes };
  for (const id of Object.keys(base.heroes)) if (raw.heroes?.[id]) out.heroes[id] = { ...base.heroes[id], ...raw.heroes[id] };
  out.boosters = { ...base.boosters, ...(raw.boosters ?? {}) };
  // v0 settings stored on/off flags instead of volumes.
  const rs = raw.settings ?? {};
  if (typeof rs.soundVol !== 'number') out.settings.soundVol = rs.sound === false ? 0 : 0.8;
  if (typeof rs.musicVol !== 'number') out.settings.musicVol = rs.music === false ? 0 : 0.6;
  delete (out.settings as any).sound;
  delete (out.settings as any).music;
  if (!out.heroes[out.selectedHero]?.owned) out.selectedHero = 'rocky';
  out.level = Math.min(Math.max(1, out.level | 0), out.maxLevel);
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
  }

  /** Debounced persist. */
  save(): void {
    if (this.timer !== null) return;
    this.timer = window.setTimeout(() => this.flush(), 600);
  }

  flush(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    void platform.saveData(this.data);
  }

  reset(): void {
    this.data = fresh();
    this.flush();
  }
}

export const save = new SaveManager();
