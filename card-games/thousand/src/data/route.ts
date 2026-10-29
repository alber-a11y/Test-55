import { Rng } from '@shared/core/rng';
import { faceFromSeed, type FaceParams } from '../art/faces';
import { PROFILES, profileForLevel, type AIProfile } from '../logic/ai';
import { DEFAULT_RULES, type TRules } from '../logic/thousand';
import { BOSS_FACES, NAMES_F_EN, NAMES_F_RU, NAMES_M_EN, NAMES_M_RU, TRAITS } from './opponents';

/** Window scenery of a carriage. */
export type Scenery = 'birches' | 'fields' | 'river' | 'city' | 'autumn' | 'mountains' | 'desert' | 'night';

export interface World {
  id: string;
  ru: string;
  en: string;
  /** Wall panels, wood trim, tablecloth (playing surface), accent. */
  wall: string;
  wood: string;
  cloth: string;
  accent: string;
  scenery: Scenery;
  sky: [string, string];
  boss: { ru: string; en: string };
}

/** The line of the Thousand Express: eight carriages, each with its own view and boss. */
export const WORLDS: World[] = [
  { id: 'suburban', ru: 'Пригородный', en: 'Suburban', wall: '#3f6b55', wood: '#8a5a33', cloth: '#2f7d5a', accent: '#ffe08a', scenery: 'birches', sky: ['#9fd3f5', '#e7f6ff'], boss: { ru: 'Контролёр Семёныч', en: 'Inspector Semyonych' } },
  { id: 'sleeper', ru: 'Плацкарт', en: 'Sleeper Car', wall: '#6a5a8c', wood: '#7a4f2e', cloth: '#3b5bab', accent: '#ffd6a5', scenery: 'fields', sky: ['#ffd29a', '#fff4dc'], boss: { ru: 'Проводница Люба', en: 'Attendant Lyuba' } },
  { id: 'coupe', ru: 'Купе', en: 'Compartment', wall: '#7a3b3b', wood: '#5e3820', cloth: '#8c2f39', accent: '#ffe8b0', scenery: 'river', sky: ['#7cc4e8', '#d6f0fb'], boss: { ru: 'Профессор Вяземский', en: 'Professor Vyazemsky' } },
  { id: 'dining', ru: 'Вагон-ресторан', en: 'Dining Car', wall: '#2f5d62', wood: '#6b3f22', cloth: '#f1e6cf', accent: '#ffcf70', scenery: 'city', sky: ['#4a3f7a', '#f2a65a'], boss: { ru: 'Шеф Гоги', en: 'Chef Gogi' } },
  { id: 'mail', ru: 'Почтовый', en: 'Mail Car', wall: '#5a4632', wood: '#3e2a1a', cloth: '#7b5e3b', accent: '#ffd166', scenery: 'autumn', sky: ['#f6c177', '#fff1d6'], boss: { ru: 'Почтмейстер Фрол', en: 'Postmaster Frol' } },
  { id: 'mountain', ru: 'Горный экспресс', en: 'Mountain Express', wall: '#33495e', wood: '#4a3423', cloth: '#355c7d', accent: '#d8f3ff', scenery: 'mountains', sky: ['#7fb2e5', '#eef6ff'], boss: { ru: 'Машинист Гром', en: 'Engineer Grom' } },
  { id: 'orient', ru: 'Восточный экспресс', en: 'Orient Express', wall: '#5b2a5e', wood: '#3a1d1a', cloth: '#6b1f3a', accent: '#f3d48a', scenery: 'desert', sky: ['#f7b267', '#fde4b8'], boss: { ru: 'Графиня Орлова', en: 'Countess Orlova' } },
  { id: 'night', ru: 'Ночной экспресс', en: 'Night Express', wall: '#1f2747', wood: '#2a1c14', cloth: '#1e3a5f', accent: '#9ad1ff', scenery: 'night', sky: ['#0b1026', '#2b3d78'], boss: { ru: 'Маэстро Туз', en: 'Maestro Ace' } },
];

export const STATIONS = 10;

export type GoalKind = 'score' | 'contract' | 'marriage' | 'lead' | 'race' | 'defend' | 'tricks' | 'barrel' | 'clean';

export interface Goal {
  k: GoalKind;
  n: number;
  /** Specific marriage suit. */
  suit?: number;
}

export type Mod = 'golden' | 'dark' | 'fever' | 'noRospis';

export interface Opponent {
  name: string;
  face: FaceParams;
  ai: AIProfile;
  trait: string;
  boss: boolean;
}

export interface LevelCfg {
  idx: number;
  world: number;
  lap: number;
  st: number;
  boss: boolean;
  goal: Goal;
  deals: number;
  rules: TRules;
  mods: Mod[];
  opponents: Opponent[];
  start?: number[];
  prize: number;
  xp: number;
  rating: number;
  /** Lucky deals for the tutorial stations. */
  lucky: boolean;
  /** Tutorial topic shown at the start. */
  tut?: string;
}

export const worldOf = (idx: number): World => WORLDS[Math.floor(idx / STATIONS) % WORLDS.length];
export const tierOf = (idx: number): number => Math.floor(idx / STATIONS);

/** Handmade first ten stations: they introduce one mechanic each. */
const INTRO: { goal: Goal; deals: number; lucky?: boolean; tut?: string; start?: number[]; lvl: number }[] = [
  { goal: { k: 'score', n: 40 }, deals: 3, lucky: true, tut: 'basics', lvl: 1 },
  { goal: { k: 'tricks', n: 4 }, deals: 3, lucky: true, tut: 'tricks', lvl: 1 },
  { goal: { k: 'contract', n: 100 }, deals: 3, lucky: true, tut: 'bid', lvl: 1 },
  { goal: { k: 'marriage', n: 1 }, deals: 4, lucky: true, tut: 'marriage', lvl: 1 },
  { goal: { k: 'defend', n: 1 }, deals: 4, tut: 'defend', lvl: 1 },
  { goal: { k: 'score', n: 120 }, deals: 4, lvl: 1 },
  { goal: { k: 'contract', n: 120 }, deals: 4, lucky: true, tut: 'raise', lvl: 2 },
  { goal: { k: 'barrel', n: 1 }, deals: 3, lucky: true, tut: 'barrel', start: [880, 340, 410], lvl: 2 },
  { goal: { k: 'lead', n: 0 }, deals: 4, tut: 'bolt', lvl: 2 },
  { goal: { k: 'race', n: 300 }, deals: 40, lvl: 2 },
];

function opponentsFor(idx: number, world: number, boss: boolean, lvl: number, rng: Rng, lang: 'ru' | 'en'): Opponent[] {
  const out: Opponent[] = [];
  const used = new Set<string>();
  for (let k = 0; k < 2; k++) {
    const isBoss = boss && k === 0;
    const female = isBoss ? BOSS_FACES[world].female : rng.chance(0.42);
    const pool = female ? (lang === 'en' ? NAMES_F_EN : NAMES_F_RU) : lang === 'en' ? NAMES_M_EN : NAMES_M_RU;
    let name = rng.pick(pool);
    while (used.has(name)) name = rng.pick(pool);
    used.add(name);
    const trait = rng.pick(TRAITS);
    const base = profileForLevel(Math.min(4, lvl + (isBoss ? 1 : 0)));
    const ai: AIProfile = {
      ...base,
      bidBias: base.bidBias + (trait === 'bold' ? 10 : trait === 'careful' ? -5 : trait === 'marriages' ? 5 : 0),
      bidConf: Math.max(0.35, Math.min(0.7, base.bidConf + (trait === 'bold' ? -0.08 : trait === 'careful' ? 0.08 : 0))),
    };
    const lap = Math.floor(idx / (STATIONS * WORLDS.length));
    out.push({
      name: isBoss ? WORLDS[world].boss[lang] + (lap ? ` ${'★'.repeat(Math.min(lap, 3))}` : '') : name,
      face: isBoss ? BOSS_FACES[world] : faceFromSeed(idx * 31 + k * 977 + 5, female),
      ai,
      trait,
      boss: isBoss,
    });
  }
  return out;
}

function aiLevel(tier: number): number {
  return tier < 1 ? 1 : tier < 3 ? 2 : tier < 6 ? 3 : 4;
}

const cache = new Map<string, LevelCfg>();

/** Deterministic route station by its global index (endless). */
export function levelCfg(idx: number, lang: 'ru' | 'en' = 'ru'): LevelCfg {
  const ck = `${idx}_${lang}`;
  const hit = cache.get(ck);
  if (hit) return hit;
  const world = Math.floor(idx / STATIONS) % WORLDS.length;
  const lap = Math.floor(idx / (STATIONS * WORLDS.length));
  const st = idx % STATIONS;
  const tier = tierOf(idx);
  const boss = st === STATIONS - 1;
  const rng = new Rng(idx * 7919 + 101);
  const rules: TRules = { ...DEFAULT_RULES };
  const mods: Mod[] = [];
  let goal: Goal;
  let deals: number;
  let lucky = false;
  let tut: string | undefined;
  let start: number[] | undefined;
  let lvl = aiLevel(tier);
  if (idx < INTRO.length) {
    const it = INTRO[idx];
    goal = it.goal;
    deals = it.deals;
    lucky = !!it.lucky;
    tut = it.tut;
    start = it.start;
    lvl = it.lvl;
  } else if (boss) {
    goal = { k: 'race', n: Math.min(500, 300 + tier * 25) };
    deals = 40;
    if (tier >= 3) mods.push(rng.pick(['golden', 'fever', 'dark'] as Mod[]));
  } else {
    const kinds: [GoalKind, number][] = [
      ['score', 5],
      ['contract', 4],
      ['marriage', 3],
      ['defend', 2],
      ['tricks', 2],
      ['lead', 3],
      ['clean', 2],
      ['barrel', 1],
    ];
    const total = kinds.reduce((a, k) => a + k[1], 0);
    let r = rng.next() * total;
    let kind: GoalKind = 'score';
    for (const [k, w] of kinds) {
      r -= w;
      if (r <= 0) {
        kind = k;
        break;
      }
    }
    switch (kind) {
      case 'score': {
        const n = Math.min(300, 80 + tier * 15 + st * 5);
        goal = { k: 'score', n: Math.round(n / 10) * 10 };
        deals = 3 + Math.floor(n / 100);
        break;
      }
      case 'contract':
        goal = { k: 'contract', n: 110 + 5 * Math.min(12, Math.floor(tier / 2) + rng.int(0, 3)) };
        deals = goal.n >= 140 ? 5 : 4;
        break;
      case 'marriage':
        if (tier >= 4 && rng.chance(0.5)) {
          goal = { k: 'marriage', n: 2 };
          deals = 6;
        } else if (tier >= 2 && rng.chance(0.4)) {
          goal = { k: 'marriage', n: 1, suit: rng.pick([1, 2]) };
          deals = 6;
        } else {
          goal = { k: 'marriage', n: 1 };
          deals = 4;
        }
        break;
      case 'defend':
        goal = { k: 'defend', n: tier >= 5 ? 2 : 1 };
        deals = goal.n * 3 + 1;
        break;
      case 'tricks': {
        const n = Math.min(16, 6 + tier);
        goal = { k: 'tricks', n };
        deals = Math.ceil(n / 2.6) + 1;
        break;
      }
      case 'lead':
        goal = { k: 'lead', n: 0 };
        deals = 4 + (tier >= 4 ? 1 : 0);
        break;
      case 'clean':
        goal = { k: 'clean', n: Math.min(220, 90 + tier * 10) };
        deals = 4 + (tier >= 6 ? 1 : 0);
        break;
      default:
        goal = { k: 'barrel', n: 1 };
        deals = 3;
        start = [880, rng.int(30, 70) * 10, rng.int(30, 75) * 10];
        break;
    }
    if (world >= 1 || lap > 0) {
      const pool: Mod[] = ['golden', 'dark', 'fever', 'noRospis'];
      const n = tier >= 4 ? rng.int(0, 2) : rng.int(0, 1);
      for (let k = 0; k < n; k++) {
        const m = rng.pick(pool);
        if (!mods.includes(m)) mods.push(m);
      }
    }
  }
  if (mods.includes('golden')) rules.golden = true;
  if (mods.includes('dark')) rules.contractX = 2;
  if (mods.includes('fever')) rules.marriageX = 2;
  if (mods.includes('noRospis')) rules.rospis = false;
  if (goal.k === 'race') rules.target = goal.n;
  if (goal.k !== 'barrel' && goal.k !== 'race') rules.barrel = false;
  const cfg: LevelCfg = {
    idx,
    world,
    lap,
    st,
    boss,
    goal,
    deals,
    rules,
    mods,
    opponents: opponentsFor(idx, world, boss, lvl, rng, lang),
    start,
    prize: 40 + tier * 10 + st * 4 + (boss ? 120 : 0),
    xp: 20 + Math.min(40, tier * 3) + (boss ? 30 : 0),
    rating: 10 + Math.min(30, tier * 2) + (boss ? 15 : 0),
    lucky,
    tut,
  };
  cache.set(ck, cfg);
  return cfg;
}

/** Stations with a chest after them (every fifth). */
export const hasChest = (idx: number): boolean => idx % 5 === 4;

export const PROFILE_BY_LEVEL = [PROFILES.novice, PROFILES.novice, PROFILES.amateur, PROFILES.master, PROFILES.king];
