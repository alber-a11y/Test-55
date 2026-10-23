import { Rng } from '@shared/core/rng';
import { PROFILES, type AIProfile } from '../logic/ai';
import { DEFAULT_RULES, type DRules } from '../logic/durak';
import { faceFromSeed, type FaceParams } from '../art/faces';
import { BOSS_FACES, NAMES_F_EN, NAMES_F_RU, NAMES_M_EN, NAMES_M_RU, TRAITS } from './opponents';

export interface Location {
  id: string;
  ru: string;
  en: string;
  /** Sky / wall gradient, floor, accent. */
  c1: string;
  c2: string;
  accent: string;
  table: string;
  boss: { ru: string; en: string };
}

export const LOCATIONS: Location[] = [
  { id: 'yard', ru: 'Двор', en: 'The Yard', c1: '#f4a261', c2: '#6d3b2a', accent: '#ffd166', table: '#7b5a3a', boss: { ru: 'Бабка Зина', en: 'Granny Zina' } },
  { id: 'train', ru: 'Электричка', en: 'Local Train', c1: '#8ecae6', c2: '#2b4f6e', accent: '#ffb703', table: '#4a5a6a', boss: { ru: 'Проводница Галя', en: 'Conductor Galya' } },
  { id: 'beach', ru: 'Пляж', en: 'The Beach', c1: '#90e0ef', c2: '#e9c46a', accent: '#ff6b6b', table: '#d4a373', boss: { ru: 'Спасатель Стас', en: 'Lifeguard Stas' } },
  { id: 'dorm', ru: 'Общага', en: 'The Dorm', c1: '#b8c0ff', c2: '#3c3a6e', accent: '#ffd6a5', table: '#6b5b95', boss: { ru: 'Вахтёрша Петровна', en: 'Warden Petrovna' } },
  { id: 'dacha', ru: 'Дача', en: 'Country House', c1: '#a7c957', c2: '#386641', accent: '#f2e8cf', table: '#6a4f2c', boss: { ru: 'Дед Михалыч', en: 'Grandpa Mikhalych' } },
  { id: 'boat', ru: 'Теплоход', en: 'Riverboat', c1: '#4cc9f0', c2: '#1d3557', accent: '#ffffff', table: '#3a506b', boss: { ru: 'Капитан Немо', en: 'Captain Nemo' } },
  { id: 'casino', ru: 'Казино', en: 'Casino', c1: '#7b2cbf', c2: '#10002b', accent: '#ffd60a', table: '#14532d', boss: { ru: 'Крупье Жорж', en: 'Croupier Georges' } },
  { id: 'champ', ru: 'Чемпионат', en: 'Championship', c1: '#ffd166', c2: '#2b2d42', accent: '#ef476f', table: '#22333b', boss: { ru: 'Чемпион Король', en: 'Champion King' } },
];

export const TABLES_PER_LOC = 9;

export interface Opponent {
  name: string;
  face: FaceParams;
  ai: AIProfile;
  trait: string;
  boss: boolean;
}

export interface TableCfg {
  idx: number;
  loc: number;
  lap: number;
  t: number;
  boss: boolean;
  rules: DRules;
  opponents: Opponent[];
  stake: number;
  prize: number;
  rating: number;
  /** Deals to win (boss matches are best of 3). */
  winsNeeded: number;
}

export const locOf = (idx: number): Location => LOCATIONS[Math.floor(idx / TABLES_PER_LOC) % LOCATIONS.length];

function profileFor(lap: number, loc: number, t: number, rng: Rng): AIProfile {
  const tier = lap * 8 + loc;
  const base = tier < 1 ? PROFILES.novice : tier < 3 ? PROFILES.amateur : tier < 6 ? PROFILES.master : PROFILES.king;
  // Small per-character variation.
  return {
    ...base,
    level: (tier === 0 && t > 5 ? 2 : base.level) as AIProfile['level'],
    aggression: Math.min(1, base.aggression + (rng.next() - 0.5) * 0.3),
    transferLove: Math.min(1, base.transferLove + (rng.next() - 0.5) * 0.3),
    cheatRate: Math.min(0.6, base.cheatRate + (rng.next() - 0.5) * 0.2),
    attention: Math.min(0.95, base.attention + (rng.next() - 0.5) * 0.2),
  };
}

function rulesFor(loc: number, t: number, lap: number, rng: Rng): DRules {
  const r: DRules = { ...DEFAULT_RULES };
  if (lap > 0) {
    // Later laps mix everything.
    r.players = rng.pick([2, 2, 3, 4]);
    r.transfer = rng.chance(0.5);
    r.deck = rng.pick([36, 36, 36, 24, 52]) as DRules['deck'];
    r.teams = r.players === 4 && rng.chance(0.4);
    r.cheat = rng.chance(0.25);
    return r;
  }
  switch (LOCATIONS[loc].id) {
    case 'yard':
      break;
    case 'train':
      r.players = t >= 4 ? 3 : 2;
      break;
    case 'beach':
      r.transfer = true;
      break;
    case 'dorm':
      r.players = t >= 5 ? 4 : 3;
      break;
    case 'dacha':
      r.players = 4;
      r.teams = t % 2 === 0;
      break;
    case 'boat':
      r.cheat = true;
      r.players = t >= 5 ? 3 : 2;
      break;
    case 'casino':
      r.deck = t % 3 === 2 ? 52 : 36;
      r.players = t >= 4 ? 3 : 2;
      r.transfer = t % 2 === 1;
      break;
    case 'champ':
      r.transfer = true;
      r.players = t % 3 === 2 ? 3 : 2;
      break;
  }
  return r;
}

const cache = new Map<number, TableCfg>();

/** Deterministic career table by its global index (infinite). */
export function tableCfg(idx: number, lang: 'ru' | 'en' = 'ru'): TableCfg {
  const key = idx * 2 + (lang === 'en' ? 1 : 0);
  const hit = cache.get(key);
  if (hit) return hit;
  const loc = Math.floor(idx / TABLES_PER_LOC) % LOCATIONS.length;
  const lap = Math.floor(idx / (TABLES_PER_LOC * LOCATIONS.length));
  const t = idx % TABLES_PER_LOC;
  const boss = t === TABLES_PER_LOC - 1;
  const rng = new Rng(idx * 9973 + 31);
  const rules = rulesFor(loc, t, lap, rng);
  const opponents: Opponent[] = [];
  for (let k = 0; k < rules.players - 1; k++) {
    const isBoss = boss && k === 0;
    const female = isBoss ? BOSS_FACES[loc].female : rng.chance(0.4);
    const pool = female ? (lang === 'en' ? NAMES_F_EN : NAMES_F_RU) : lang === 'en' ? NAMES_M_EN : NAMES_M_RU;
    const prof = profileFor(lap, loc, t, rng);
    if (isBoss) prof.level = Math.min(4, prof.level + 1) as AIProfile['level'];
    opponents.push({
      name: isBoss ? LOCATIONS[loc].boss[lang] + (lap ? ` ${'★'.repeat(Math.min(lap, 3))}` : '') : rng.pick(pool),
      face: isBoss ? BOSS_FACES[loc] : faceFromSeed(idx * 17 + k * 101, female),
      ai: prof,
      trait: rng.pick(TRAITS),
      boss: isBoss,
    });
  }
  const tier = lap * 8 + loc;
  const stake = 20 + tier * 15 + t * 5 + (boss ? 50 : 0);
  const cfg: TableCfg = {
    idx,
    loc,
    lap,
    t,
    boss,
    rules,
    opponents,
    stake,
    prize: stake * 2 + (boss ? 150 : 0),
    rating: 15 + tier * 2 + (boss ? 20 : 0),
    winsNeeded: boss ? 2 : 1,
  };
  cache.set(key, cfg);
  return cfg;
}
