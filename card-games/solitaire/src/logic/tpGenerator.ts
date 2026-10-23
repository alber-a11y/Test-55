import { makeDeck } from '@shared/cards/card';
import { Rng } from '@shared/core/rng';
import { TEMPLATES, templateSlots, type TPTemplate } from './tpLayouts';
import { fastSolve } from './tpSolver';
import { type PCard, type TPLevelDef, type TPSlotDef } from './tripeaks';

export const LEVELS_PER_CITY = 20;

interface Params {
  template: string;
  ice: number;
  ice2: number;
  locks: number;
  bombs: number;
  bombTimer: number;
  gold: number;
  coins: number;
  wilds: number;
  slack: number;
  boss: boolean;
}

/** Hand-tuned introduction of mechanics for the first levels, procedural growth afterwards. */
export function levelParams(level: number): Params {
  const rng = new Rng(level * 2654435761);
  const boss = level % 10 === 0;
  const lap = Math.floor((level - 1) / (LEVELS_PER_CITY * 12));
  const early: Record<number, Partial<Params>> = {
    1: { template: 'peaks3', slack: 12, coins: 0 },
    2: { template: 'pyramid', slack: 11, coins: 1 },
    3: { template: 'peaks2', slack: 10, coins: 2 },
    4: { template: 'peaks3', slack: 10, wilds: 1 },
    5: { template: 'wall', slack: 9 },
    6: { template: 'peaks3', ice: 2, slack: 9 },
    7: { template: 'pyramid', ice: 3, slack: 8 },
    8: { template: 'diamond', ice: 3, slack: 8 },
    9: { template: 'peaks2', ice: 4, ice2: 1, slack: 7 },
    10: { template: 'wall', ice: 4, slack: 6, boss: true },
    11: { template: 'peaks3', locks: 1, slack: 10 },
    12: { template: 'valley', locks: 1, ice: 2, slack: 9 },
    13: { template: 'towers', locks: 2, slack: 9 },
    14: { template: 'heart', ice: 3, locks: 1, slack: 8 },
    15: { template: 'pyramid', locks: 2, ice: 3, slack: 8 },
    16: { template: 'peaks3', gold: 3, slack: 7 },
    17: { template: 'arrow', gold: 4, ice: 2, slack: 6 },
    18: { template: 'bridge', gold: 3, locks: 1, slack: 6 },
    19: { template: 'diamond', ice: 4, ice2: 2, slack: 6 },
    20: { template: 'heart', locks: 2, ice: 3, gold: 0, slack: 5, boss: true },
    21: { template: 'peaks3', bombs: 1, bombTimer: 18, slack: 7 },
    22: { template: 'cross', bombs: 1, bombTimer: 16, slack: 6 },
    23: { template: 'wall', bombs: 1, ice: 2, bombTimer: 16, slack: 6 },
  };
  const avail = TEMPLATES.filter((t: TPTemplate) => t.minLevel <= level);
  const base: Params = {
    template: rng.pick(avail).id,
    ice: Math.min(7, Math.floor(level / 8) + rng.int(0, 2)),
    ice2: level > 25 ? rng.int(0, 2) : 0,
    locks: level > 12 ? rng.int(0, Math.min(3, 1 + Math.floor(level / 30))) : 0,
    bombs: level > 24 ? (rng.chance(0.4) ? rng.int(1, level > 80 ? 2 : 1) : 0) : 0,
    bombTimer: Math.max(10, 20 - Math.floor(level / 25)),
    gold: level > 16 && rng.chance(0.3) ? rng.int(3, 5) : 0,
    coins: rng.int(1, 3),
    wilds: rng.chance(0.15) ? 1 : 0,
    slack: level <= 40 ? 5 : level <= 100 ? 4 : 3,
    boss,
  };
  const p: Params = { ...base, ...(early[level] ?? {}) };
  if (boss && !early[level]) {
    p.slack -= 1;
    p.ice += 2;
    p.locks = Math.max(p.locks, 1);
  }
  p.slack = Math.max(1, p.slack - lap);
  return p;
}

function attempt(level: number, p: Params, seed: number): TPLevelDef | null {
  const rng = new Rng(seed);
  const tpl = TEMPLATES.find((t) => t.id === p.template) ?? TEMPLATES[0];
  const pos = templateSlots(tpl);
  const deck = rng.shuffle(makeDeck(1));
  const second = rng.shuffle(makeDeck(1));
  const third = rng.shuffle(makeDeck(1));
  let nextId = 0;
  const take = (c: { suit: 0 | 1 | 2 | 3; rank: number }): PCard => ({ id: nextId++, suit: c.suit, rank: c.rank });
  const pool = [...deck, ...second, ...third];
  const slots: TPSlotDef[] = pos.map((s) => ({ ...s, card: take(pool.shift()!) }));
  const start = take(pool.shift()!);
  const stockPool = pool.map(take);

  // Obstacles on distinct random slots.
  const free = rng.shuffle(slots.map((_, i) => i));
  const grab = (pred: (i: number) => boolean = () => true): number | null => {
    const k = free.findIndex(pred);
    if (k < 0) return null;
    return free.splice(k, 1)[0];
  };
  const coveredAtStart = (i: number) => slots.some((b) => b.z > slots[i].z && Math.abs(b.x - slots[i].x) < 0.99 && Math.abs(b.y - slots[i].y) < 0.99);
  for (let k = 0; k < p.wilds; k++) {
    const i = grab(coveredAtStart);
    if (i !== null) slots[i].card = { ...slots[i].card, wild: true };
  }
  for (let k = 0; k < p.locks; k++) {
    const li = grab(coveredAtStart);
    const ki = grab();
    if (li === null || ki === null) break;
    slots[li].lock = k;
    slots[ki].key = k;
  }
  for (let k = 0; k < p.ice; k++) {
    const i = grab();
    if (i !== null) slots[i].ice = k < p.ice2 ? 2 : 1;
  }
  for (let k = 0; k < p.bombs; k++) {
    const i = grab(coveredAtStart);
    if (i !== null) slots[i].bomb = p.bombTimer;
  }
  for (let k = 0; k < p.gold; k++) {
    const i = grab(coveredAtStart);
    if (i !== null) slots[i].gold = true;
  }
  for (let k = 0; k < p.coins; k++) {
    const i = grab();
    if (i !== null) slots[i].coins = 5 * rng.int(1, 3);
  }

  const def: TPLevelDef = {
    level,
    template: tpl.id,
    slots,
    stock: stockPool,
    start,
    goal: p.gold > 0 ? 'gold' : 'clear',
    star2: 1,
    star3: 2,
    boss: p.boss,
    extra: [],
  };
  // Search with a bounded stock and without combo jokers: faster and leaves the jokers as a bonus.
  const draws = fastSolve(def, 34, 40_000);
  if (draws < 0) return null;
  const len = Math.min(stockPool.length - 15, draws + p.slack);
  def.stock = stockPool.slice(0, len);
  def.extra = stockPool.slice(len, len + 15);
  def.star3 = Math.max(2, Math.ceil(p.slack * 0.6));
  def.star2 = Math.max(1, Math.ceil(p.slack * 0.25));
  if (def.star2 >= def.star3) def.star2 = def.star3 - 1;
  return def;
}

const cache = new Map<number, TPLevelDef>();

/** Deterministic, verified-solvable level for any level number ≥ 1. */
export function generateLevel(level: number): TPLevelDef {
  const hit = cache.get(level);
  if (hit) return hit;
  const p = levelParams(level);
  let def: TPLevelDef | null = null;
  for (let a = 0; a < 40 && !def; a++) {
    // Soften obstacles if the board keeps failing.
    const q = a < 12 ? p : { ...p, bombs: 0, locks: Math.max(0, p.locks - 1), ice2: 0 };
    def = attempt(level, q, level * 1_000_003 + a * 7919 + 17);
  }
  if (!def) def = attempt(level, { ...p, ice: 0, ice2: 0, locks: 0, bombs: 0, gold: 0, slack: 30 }, level * 31 + 5)!;
  cache.set(level, def);
  return def;
}
