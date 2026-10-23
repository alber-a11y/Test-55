import { computeBlockers, computeNeighbours } from './tpLayouts';
import type { TPLevelDef } from './tripeaks';

/**
 * Fast mutable DFS solver used by the level generator: no cloning, incremental
 * Zobrist hashing, combo jokers ignored (the found solution never relies on luck).
 * Returns stock cards drawn in the found solution, or -1 (unsolved within budget).
 */
export function fastSolve(def: TPLevelDef, stockLimit: number, nodeLimit: number): number {
  const n = def.slots.length;
  const rank = def.slots.map((s) => (s.card.wild ? 0 : s.card.rank));
  const blockers = computeBlockers(def.slots);
  const neigh = computeNeighbours(def.slots);
  // Reverse map: which slots does i cover (to update open counts).
  const covers: number[][] = def.slots.map(() => []);
  blockers.forEach((bs, i) => bs.forEach((b) => covers[b].push(i)));
  const lock = def.slots.map((s) => (s.lock === undefined ? -1 : s.lock));
  const key = def.slots.map((s) => (s.key === undefined ? -1 : s.key));
  const gold = def.slots.map((s) => !!s.gold);
  const goldTotal = gold.filter(Boolean).length;
  const goalGold = def.goal === 'gold';
  const stock = def.stock.slice(0, stockLimit).map((c) => (c.wild ? 0 : c.rank));
  const S = stock.length;

  const removed = new Uint8Array(n);
  const ice = new Int8Array(def.slots.map((s) => s.ice ?? 0));
  const bomb = new Int16Array(def.slots.map((s) => s.bomb ?? 0));
  const hasBombs = def.slots.some((s) => s.bomb);
  const blockCount = new Int16Array(blockers.map((b) => b.length));
  let opened = 0;
  let stockPos = 0;
  let top = def.start.wild ? 0 : def.start.rank;
  let removedCount = 0;
  let goldCount = 0;

  // Zobrist tables
  let seed = 0x9e3779b9;
  const rnd = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  };
  const zRem = Array.from({ length: n }, () => [rnd(), rnd()]);
  const zIce = Array.from({ length: n }, () => [rnd(), rnd()]);
  const zPos = Array.from({ length: S + 1 }, () => [rnd(), rnd()]);
  const zTop = Array.from({ length: 14 }, () => [rnd(), rnd()]);
  const zOpen = Array.from({ length: 8 }, () => [rnd(), rnd()]);
  let h1 = 0;
  let h2 = 0;
  const seen = new Set<number>();
  let nodes = 0;

  const canPlay = (i: number): boolean => {
    if (removed[i] || blockCount[i] > 0 || ice[i] > 0) return false;
    if (lock[i] >= 0 && !(opened & (1 << lock[i]))) return false;
    const r = rank[i];
    if (r === 0 || top === 0) return true;
    const d = r > top ? r - top : top - r;
    return d === 1 || d === 12;
  };

  const tickBombs = (log: number[]): boolean => {
    let boom = false;
    for (let i = 0; i < n; i++) {
      if (bomb[i] > 0 && !removed[i] && blockCount[i] === 0) {
        bomb[i]--;
        log.push(i);
        if (bomb[i] <= 0) boom = true;
      }
    }
    return boom;
  };

  const won = () => (goalGold ? goldCount >= goldTotal : removedCount === n);

  const dfs = (): boolean => {
    if (won()) return true;
    if (++nodes > nodeLimit) return false;
    const k = (h1 >>> 0) * 2097152 + (h2 & 0x1fffff) + (hasBombs ? bomb.reduce((a, b) => a * 31 + b, 0) % 1000 : 0);
    if (seen.has(k)) return false;
    seen.add(k);

    for (let i = 0; i < n; i++) {
      if (!canPlay(i)) continue;
      // play i
      const prevTop = top;
      const prevOpened = opened;
      const prevBomb = bomb[i];
      removed[i] = 1;
      removedCount++;
      if (gold[i]) goldCount++;
      for (const c of covers[i]) blockCount[c]--;
      h1 ^= zRem[i][0];
      h2 ^= zRem[i][1];
      h1 ^= zTop[top][0] ^ zTop[rank[i]][0];
      h2 ^= zTop[top][1] ^ zTop[rank[i]][1];
      top = rank[i];
      if (key[i] >= 0 && !(opened & (1 << key[i]))) {
        opened |= 1 << key[i];
        h1 ^= zOpen[key[i] & 7][0];
        h2 ^= zOpen[key[i] & 7][1];
      }
      bomb[i] = 0;
      const cracked: number[] = [];
      for (const j of neigh[i]) {
        if (ice[j] > 0 && !removed[j]) {
          h1 ^= zIce[j][0] * ice[j];
          h2 ^= zIce[j][1] * ice[j];
          ice[j]--;
          h1 ^= zIce[j][0] * ice[j];
          h2 ^= zIce[j][1] * ice[j];
          cracked.push(j);
        }
      }
      const blog: number[] = [];
      const boom = hasBombs ? tickBombs(blog) : false;
      if (!boom && dfs()) return true;
      // undo
      for (const b of blog) bomb[b]++;
      for (const j of cracked) {
        h1 ^= zIce[j][0] * ice[j];
        h2 ^= zIce[j][1] * ice[j];
        ice[j]++;
        h1 ^= zIce[j][0] * ice[j];
        h2 ^= zIce[j][1] * ice[j];
      }
      bomb[i] = prevBomb;
      if (opened !== prevOpened) {
        h1 ^= zOpen[key[i] & 7][0];
        h2 ^= zOpen[key[i] & 7][1];
        opened = prevOpened;
      }
      h1 ^= zTop[top][0] ^ zTop[prevTop][0];
      h2 ^= zTop[top][1] ^ zTop[prevTop][1];
      top = prevTop;
      h1 ^= zRem[i][0];
      h2 ^= zRem[i][1];
      for (const c of covers[i]) blockCount[c]++;
      if (gold[i]) goldCount--;
      removedCount--;
      removed[i] = 0;
      if (nodes > nodeLimit) return false;
    }
    if (stockPos < S) {
      const prevTop = top;
      h1 ^= zPos[stockPos][0] ^ zPos[stockPos + 1][0] ^ zTop[top][0] ^ zTop[stock[stockPos]][0];
      h2 ^= zPos[stockPos][1] ^ zPos[stockPos + 1][1] ^ zTop[top][1] ^ zTop[stock[stockPos]][1];
      top = stock[stockPos];
      stockPos++;
      const blog: number[] = [];
      const boom = hasBombs ? tickBombs(blog) : false;
      if (!boom && dfs()) return true;
      for (const b of blog) bomb[b]++;
      stockPos--;
      h1 ^= zPos[stockPos][0] ^ zPos[stockPos + 1][0] ^ zTop[top][0] ^ zTop[prevTop][0];
      h2 ^= zPos[stockPos][1] ^ zPos[stockPos + 1][1] ^ zTop[top][1] ^ zTop[prevTop][1];
      top = prevTop;
    }
    return false;
  };

  h1 ^= zPos[0][0] ^ zTop[top][0];
  h2 ^= zPos[0][1] ^ zTop[top][1];
  for (let i = 0; i < n; i++) if (ice[i]) {
    h1 ^= zIce[i][0] * ice[i];
    h2 ^= zIce[i][1] * ice[i];
  }
  return dfs() ? stockPos : -1;
}
