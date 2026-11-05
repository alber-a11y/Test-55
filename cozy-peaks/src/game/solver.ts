import { adjacent } from './cards';
import type { LevelData } from './model';

/**
 * Compact simulation of a level for the solver and the difficulty bot.
 * The removed-set is a 64-bit mask split into two 32-bit halves (layouts have ≤ 40 cards).
 * Locks are modelled as an extra "cover": the lock slot is free only after its key is gone.
 */
interface Compiled {
  n: number;
  ranks: number[];
  /** Cards that must be removed before slot i is visible (face up). */
  visLo: number[];
  visHi: number[];
  /** Same plus the key for locked slots: removed before slot i can be taken. */
  freeLo: number[];
  freeHi: number[];
  /** Stock in draw order. */
  stock: number[];
  start: number;
  iceSlots: number[];
  iceHp: number[];
  fullLo: number;
  fullHi: number;
}

const bitLo = (i: number) => (i < 32 ? (1 << i) >>> 0 : 0);
const bitHi = (i: number) => (i >= 32 ? (1 << (i - 32)) >>> 0 : 0);

export function compile(level: LevelData): Compiled {
  const n = level.tableau.length;
  if (n > 64) throw new Error('layout too large');
  const visLo: number[] = [];
  const visHi: number[] = [];
  const freeLo: number[] = [];
  const freeHi: number[] = [];
  for (let i = 0; i < n; i++) {
    let lo = 0;
    let hi = 0;
    for (const j of level.layout.coveredBy[i]) {
      lo |= bitLo(j);
      hi |= bitHi(j);
    }
    visLo.push(lo >>> 0);
    visHi.push(hi >>> 0);
    const sp = level.specials[i];
    if (sp?.kind === 'lock') {
      lo |= bitLo(sp.key);
      hi |= bitHi(sp.key);
    }
    freeLo.push(lo >>> 0);
    freeHi.push(hi >>> 0);
  }
  let fullLo = 0;
  let fullHi = 0;
  for (let i = 0; i < n; i++) {
    fullLo |= bitLo(i);
    fullHi |= bitHi(i);
  }
  const iceSlots: number[] = [];
  const iceHp: number[] = [];
  for (const [k, sp] of Object.entries(level.specials))
    if (sp.kind === 'ice') {
      iceSlots.push(+k);
      iceHp.push(sp.hp);
    }
  return {
    n,
    ranks: level.tableau.map((c) => c.r),
    visLo,
    visHi,
    freeLo,
    freeHi,
    stock: level.stock.map((c) => c.r).reverse(),
    start: level.start.r,
    iceSlots,
    iceHp,
    fullLo: fullLo >>> 0,
    fullHi: fullHi >>> 0,
  };
}

const has = (lo: number, hi: number, i: number) => (i < 32 ? (lo >>> i) & 1 : (hi >>> (i - 32)) & 1) === 1;
const covered = (lo: number, hi: number, mLo: number, mHi: number) => ((lo & mLo) >>> 0) === mLo && ((hi & mHi) >>> 0) === mHi;

/** Ice hp of slot i (0 if no ice). */
function iceOf(c: Compiled, ice: number[], i: number): number {
  const k = c.iceSlots.indexOf(i);
  return k < 0 ? 0 : ice[k];
}

/** After taking `slot`, crack ice on iced cards that were already face up. */
function crackIce(c: Compiled, ice: number[], lo: number, hi: number, slot: number): number[] {
  if (!c.iceSlots.length) return ice;
  const out = ice.slice();
  c.iceSlots.forEach((s, k) => {
    if (s !== slot && out[k] > 0 && !has(lo, hi, s) && covered(lo, hi, c.visLo[s], c.visHi[s])) out[k] -= 1;
  });
  return out;
}

export interface SolveResult {
  /** true — winnable, false — proven unwinnable, null — gave up (node limit). */
  solvable: boolean | null;
  nodes: number;
  /** Fewest stock cards needed by the found solution (search is depth-first, so it is an upper bound). */
  stockUsed: number;
}

/** Perfect-information solver (knows every card): checks that a deal can be cleared without boosters. */
export function solve(level: LevelData, nodeLimit = 300_000): SolveResult {
  const c = compile(level);
  const seen = new Set<string>();
  let nodes = 0;
  let stockUsed = 0;
  const LIMIT = {};

  const dfs = (lo: number, hi: number, ptr: number, top: number, ice: number[]): boolean => {
    if (lo === c.fullLo && hi === c.fullHi) {
      stockUsed = ptr;
      return true;
    }
    const key = `${lo},${hi},${ptr},${top}${ice.length ? ',' + ice.join('') : ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    if (++nodes > nodeLimit) throw LIMIT;
    // Plays first, most-revealing first.
    const moves: number[] = [];
    for (let i = 0; i < c.n; i++) {
      if (has(lo, hi, i)) continue;
      if (!covered(lo, hi, c.freeLo[i], c.freeHi[i])) continue;
      if (iceOf(c, ice, i) > 0) continue;
      if (adjacent(top, c.ranks[i])) moves.push(i);
    }
    for (const i of moves) {
      const nlo = (lo | bitLo(i)) >>> 0;
      const nhi = (hi | bitHi(i)) >>> 0;
      if (dfs(nlo, nhi, ptr, c.ranks[i], crackIce(c, ice, lo, hi, i))) return true;
    }
    if (ptr < c.stock.length) return dfs(lo, hi, ptr + 1, c.stock[ptr], ice);
    return false;
  };

  try {
    const ok = dfs(0, 0, 0, c.start, c.iceHp.slice());
    return { solvable: ok, nodes, stockUsed };
  } catch (e) {
    if (e === LIMIT) return { solvable: null, nodes, stockUsed: 0 };
    throw e;
  }
}

/**
 * Human-like player: sees only face-up cards, prefers moves that flip cards and keep the
 * chain going, sometimes makes a sub-optimal choice. Returns the share of won playouts.
 */
export function botWinRate(level: LevelData, playouts: number, rand: () => number, mistake = 0.12): number {
  const c = compile(level);
  let wins = 0;
  for (let p = 0; p < playouts; p++) if (botPlay(c, rand, mistake)) wins++;
  return wins / playouts;
}

function botPlay(c: Compiled, rand: () => number, mistake: number): boolean {
  let lo = 0;
  let hi = 0;
  let ptr = 0;
  let top = c.start;
  let ice = c.iceHp.slice();
  for (let guard = 0; guard < 400; guard++) {
    if (lo === c.fullLo && hi === c.fullHi) return true;
    const free: number[] = [];
    for (let i = 0; i < c.n; i++) {
      if (has(lo, hi, i) || !covered(lo, hi, c.freeLo[i], c.freeHi[i]) || iceOf(c, ice, i) > 0) continue;
      free.push(i);
    }
    const moves = free.filter((i) => adjacent(top, c.ranks[i]));
    if (!moves.length) {
      if (ptr >= c.stock.length) return false;
      top = c.stock[ptr++];
      continue;
    }
    let pick = moves[0];
    if (moves.length > 1) {
      if (rand() < mistake) pick = moves[Math.floor(rand() * moves.length)];
      else {
        let best = -1e9;
        for (const i of moves) {
          const nlo = (lo | bitLo(i)) >>> 0;
          const nhi = (hi | bitHi(i)) >>> 0;
          let flips = 0;
          let chain = 0;
          for (let j = 0; j < c.n; j++) {
            if (has(nlo, nhi, j)) continue;
            const visNow = covered(nlo, nhi, c.visLo[j], c.visHi[j]);
            if (visNow && !covered(lo, hi, c.visLo[j], c.visHi[j])) flips++;
            else if (visNow && j !== i && adjacent(c.ranks[i], c.ranks[j])) chain++;
          }
          const score = flips * 2 + chain * 1.2 + rand() * 1.5;
          if (score > best) {
            best = score;
            pick = i;
          }
        }
      }
    }
    ice = crackIce(c, ice, lo, hi, pick);
    lo = (lo | bitLo(pick)) >>> 0;
    hi = (hi | bitHi(pick)) >>> 0;
    top = c.ranks[pick];
  }
  return false;
}
