import { Rng } from '../core/rng';
import { Board, type Resolution } from './board';
import { cellU, R } from './geom';
import type { Goal } from './levelgen';

/** Cells a straight-ish shot from below can reach: attachable and not covered by nearer balls. */
export function exposedCells(b: Board): [number, number][] {
  const maxR = b.maxRow();
  const out: [number, number][] = [];
  const occupied: { r: number; u: number }[] = [];
  b.forEach((_c, r, c) => occupied.push({ r, u: cellU(r, c) }));
  for (let r = 0; r <= maxR + 1; r++) {
    b.ensureRow(r);
    for (let c = 0; c < b.rows[r].length; c++) {
      if (!b.canAttach(r, c)) continue;
      const u = cellU(r, c);
      if (occupied.some((o) => o.r > r && Math.abs(o.u - u) < R * 1.7)) continue;
      out.push([r, c]);
    }
  }
  return out;
}

/** Size of the group a ball of `color` would complete at (r,c). */
export function wouldMatch(b: Board, r: number, c: number, color: number): number {
  const seen = new Set<string>();
  let n = 1;
  for (const [nr, nc] of b.neighbors(r, c)) {
    const cell = b.get(nr, nc);
    if (!cell || cell.kind !== 'ball' || cell.color !== color || cell.lock === 'ice') continue;
    if (seen.has(`${nr},${nc}`)) continue;
    for (const [gr, gc] of b.group(nr, nc, color)) {
      const k = `${gr},${gc}`;
      if (!seen.has(k)) {
        seen.add(k);
        n++;
      }
    }
  }
  return n;
}

/** Colour for the next ball: mostly colours the player can actually hit. */
export function nextBallColor(b: Board, rng: Rng, exposed?: [number, number][]): number {
  const present = b.colorsPresent();
  if (!present.length) return 0;
  const ex = exposed ?? exposedCells(b);
  if (rng.chance(0.7) && ex.length) {
    const front = new Set<number>();
    for (const [r, c] of ex) {
      for (const [nr, nc] of b.neighbors(r, c)) {
        const cell = b.get(nr, nc);
        if (cell?.kind === 'ball') front.add(cell.color);
      }
    }
    if (front.size) return rng.pick([...front]);
  }
  return rng.pick(present);
}

export interface GoalProgress {
  rescued: number;
  collected: number;
}

export function applyProgress(res: Resolution, goal: Goal, p: GoalProgress): void {
  for (const rm of res.removed) {
    if (rm.cell.kind === 'animal') p.rescued++;
    if (goal.type === 'collect' && rm.cell.kind === 'ball' && rm.cell.color === goal.color) p.collected++;
  }
}

export function goalDone(goal: Goal, b: Board, p: GoalProgress): boolean {
  if (goal.type === 'rescue') return p.rescued >= goal.count;
  if (goal.type === 'collect') return p.collected >= goal.count;
  return b.isEmpty();
}

/** Greedy bot that plays a level; returns shots it needed (used to size the shot budget). */
export function simulate(start: Board, goal: Goal, seed: number, cap = 220): number {
  const b = start.clone();
  const rng = new Rng(seed);
  const prog: GoalProgress = { rescued: 0, collected: 0 };
  let cur = nextBallColor(b, rng);
  let next = nextBallColor(b, rng);
  for (let shot = 1; shot <= cap; shot++) {
    const ex = exposedCells(b);
    if (!ex.length) return shot;
    let best: { r: number; c: number; swap: boolean; score: number } | null = null;
    for (const [r, c] of ex) {
      for (const swap of [false, true]) {
        const color = swap ? next : cur;
        const m = wouldMatch(b, r, c, color);
        // Human-like: take any decent match, preferring the front of the board over deep digging.
        let score = m >= 3 ? 10 + Math.min(m, 12) * 0.25 : m;
        score += r * 0.06;
        if (swap) score -= 0.1;
        if (!best || score > best.score) best = { r, c, swap, score };
      }
    }
    const pick = best!;
    const color = pick.swap ? next : cur;
    const res = b.resolveShot(pick.r, pick.c, color, 'normal');
    applyProgress(res, goal, prog);
    if (goalDone(goal, b, prog)) return shot;
    if (pick.swap) next = nextBallColor(b, rng);
    else {
      cur = next;
      next = nextBallColor(b, rng);
    }
    if (!b.colorsPresent().includes(cur)) cur = nextBallColor(b, rng);
  }
  return cap;
}
