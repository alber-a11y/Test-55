import { Rng } from '../core/rng';
import { fullDeck, type Card } from './cards';
import { CLASSIC, PEAK_LAYOUTS, SPECIAL_LAYOUTS, type Layout } from './layouts';
import type { BonusGoal, LevelData, Special, Tier } from './model';
import { botWinRate, solve } from './solver';

/** Bump to reshuffle every procedural level (e.g. after a balance change). */
export const GEN_VERSION = 1;

/** Levels where a new mechanic first appears (with a tutorial hint). */
export const INTRO = { gold: 8, bonus: 12, lock: 16, ice: 26, bomb: 40 } as const;

export function hash(...xs: number[]): number {
  let h = 2166136261 >>> 0;
  for (const x of xs) {
    h ^= x >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995) >>> 0;
  }
  return h >>> 0 || 1;
}

/** Every 5th level is hard, every 10th very hard; the first 10 are gentle. */
export function tierOf(n: number): Tier {
  if (n <= 10) return 'easy';
  if (n % 10 === 0) return 'superhard';
  if (n % 5 === 0) return 'hard';
  return 'normal';
}

/** Target bot win-rate corridor for level n (the difficulty "saw"). */
export function targetBand(n: number): [number, number] {
  const tier = tierOf(n);
  if (tier === 'easy') return [0.85, 1];
  if (tier === 'superhard') return [0.28, 0.42];
  if (tier === 'hard') return [0.42, 0.56];
  // Normal levels: slowly harder towards a plateau, a breather right after a hard level.
  const t = Math.min(1, (n - 10) / 490);
  let mid = 0.8 - 0.18 * t;
  if (n % 5 === 1) mid += 0.06;
  return [mid - 0.08, Math.min(1, mid + 0.08)];
}

function pickLayout(n: number, rng: Rng): Layout {
  if (n <= 3) return CLASSIC;
  const r = rng.next();
  if (r < 0.2) return CLASSIC;
  if (n >= 12 && r < 0.35) return rng.pick(SPECIAL_LAYOUTS);
  // Smaller layouts early on.
  const pool = n < 20 ? PEAK_LAYOUTS.filter((l) => l.slots.length <= 26) : PEAK_LAYOUTS;
  return rng.pick(pool);
}

function placeSpecials(n: number, layout: Layout, rng: Rng): Record<number, Special> {
  const out: Record<number, Special> = {};
  const count = layout.slots.length;
  const freeSlot = (filter: (i: number) => boolean = () => true): number => {
    for (let k = 0; k < 50; k++) {
      const i = rng.int(0, count - 1);
      if (!(i in out) && filter(i)) return i;
    }
    return -1;
  };
  if (n >= INTRO.gold && (n === INTRO.gold || rng.chance(0.55))) {
    const g = n === INTRO.gold ? 3 : rng.int(1, 3);
    for (let k = 0; k < g; k++) {
      const i = freeSlot();
      if (i >= 0) out[i] = { kind: 'gold' };
    }
  }
  if (n >= INTRO.lock && (n === INTRO.lock || rng.chance(0.4))) {
    const pairs = n < 60 ? 1 : rng.int(1, 2);
    for (let k = 0; k < pairs; k++) {
      // The lock sits on a covered card; the key is in the same row or below so it is always reachable.
      const lock = freeSlot((i) => layout.coveredBy[i].length > 0);
      if (lock < 0) continue;
      const key = freeSlot((i) => i !== lock && layout.slots[i].row >= layout.slots[lock].row);
      if (key < 0) continue;
      out[lock] = { kind: 'lock', key };
      out[key] = { kind: 'key', lock };
    }
  }
  if (n >= INTRO.ice && (n === INTRO.ice || rng.chance(0.4))) {
    const c = n === INTRO.ice ? 2 : rng.int(1, n < 80 ? 2 : 4);
    for (let k = 0; k < c; k++) {
      const i = freeSlot();
      if (i >= 0) out[i] = { kind: 'ice', hp: n < 60 ? 1 : rng.int(1, 2) };
    }
  }
  if (n >= INTRO.bomb && (n === INTRO.bomb || rng.chance(0.35))) {
    const c = n < 100 ? 1 : rng.int(1, 2);
    for (let k = 0; k < c; k++) {
      // Bombs sit on covered cards so the player has to dig towards them.
      const i = freeSlot((j) => layout.coveredBy[j].length > 0 && layout.slots[j].row <= layout.rows - 2);
      if (i >= 0) out[i] = { kind: 'bomb', timer: n === INTRO.bomb ? 14 : rng.int(9, 14) };
    }
  }
  return out;
}

/** Optional skill objective (+1 star). Not required to win, so it never affects solvability. */
function pickBonus(n: number, stockSize: number, rng: Rng): BonusGoal | undefined {
  if (n < INTRO.bonus || (n !== INTRO.bonus && !rng.chance(0.6))) return undefined;
  const kinds: BonusGoal['kind'][] = ['combo', 'colorRun', 'stockLeft', 'noBoosters'];
  const kind = n === INTRO.bonus ? 'combo' : rng.pick(kinds);
  switch (kind) {
    case 'combo':
      return { kind, n: 6 + Math.floor(Math.min(n, 300) / 60) };
    case 'colorRun':
      return { kind, n: n < 150 ? 4 : 5 };
    case 'stockLeft':
      return { kind, n: Math.max(3, Math.min(8, Math.round(stockSize * 0.22))) };
    default:
      return { kind: 'noBoosters' };
  }
}

function baseStock(tier: Tier, tableau: number): number {
  const want = { easy: 26, normal: 22, hard: 19, superhard: 17 }[tier];
  return Math.max(10, Math.min(want, 51 - tableau));
}

function deal(layout: Layout, stockSize: number, rng: Rng): { tableau: Card[]; stock: Card[]; start: Card } {
  const deck = rng.shuffle(fullDeck());
  const tableau = deck.splice(0, layout.slots.length);
  const start = deck.pop()!;
  const stock = deck.slice(0, stockSize);
  return { tableau, stock, start };
}

/**
 * Deterministic level n: pick a layout and specials, deal, verify with the solver that it can be
 * cleared, then tune the stock size until the human-like bot's win rate lands in the target band.
 */
export function generateLevel(n: number, opts: { playouts?: number; attempts?: number } = {}): LevelData {
  const playouts = opts.playouts ?? 80;
  const attempts = opts.attempts ?? 30;
  const tier = tierOf(n);
  const [lo, hi] = targetBand(n);
  const mid = (lo + hi) / 2;
  const shapeRng = new Rng(hash(n, GEN_VERSION, 7));
  const layout = pickLayout(n, shapeRng);
  const specials = placeSpecials(n, layout, shapeRng);
  let stockSize = baseStock(tier, layout.slots.length);
  const maxStock = 51 - layout.slots.length;
  let best: LevelData | null = null;
  let bestErr = Infinity;
  for (let a = 0; a < attempts; a++) {
    const seed = hash(n, GEN_VERSION, a);
    const rng = new Rng(seed);
    const d = deal(layout, stockSize, rng);
    const level: LevelData = { n, seed, layoutId: layout.id, layout, ...d, specials, tier, winRate: 0 };
    const sol = solve(level, 120_000);
    // Unwinnable deal: try another shuffle with the same stock size.
    if (sol.solvable !== true) continue;
    const w = botWinRate(level, playouts, () => rng.next());
    level.winRate = w;
    const err = w < lo ? lo - w : w > hi ? w - hi : 0;
    if (err < bestErr || (err === bestErr && Math.abs(w - mid) < Math.abs((best?.winRate ?? 0) - mid))) {
      best = level;
      bestErr = err;
    }
    if (err === 0) break;
    // Steer the next deal: more stock is easier.
    if (w < lo) stockSize = Math.min(maxStock, stockSize + (lo - w > 0.2 ? 2 : 1));
    else stockSize = Math.max(8, stockSize - (w - hi > 0.2 ? 2 : 1));
  }
  if (best) {
    best.bonus = pickBonus(n, best.stock.length, shapeRng);
    return best;
  }
  // Fallback (practically never): a generous classic deal.
  const rng = new Rng(hash(n, GEN_VERSION, 999));
  const d = deal(CLASSIC, 51 - CLASSIC.slots.length, rng);
  return { n, seed: 0, layoutId: CLASSIC.id, layout: CLASSIC, ...d, specials: {}, tier, winRate: 1 };
}
