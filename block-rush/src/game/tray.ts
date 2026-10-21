import type { Rng } from '../core/rng';
import type { Board } from './board';
import { SHAPES, shapeWeight, type Shape } from './pieces';
import { bestPlacement } from './solver';

export type Mode = 'levels' | 'classic';

/** Shapes ranked by how good their best placement is on this board. */
export function rankShapes(board: Board, mode: Mode): { shape: Shape; score: number; lines: number }[] {
  const withCols = mode === 'classic';
  const out: { shape: Shape; score: number; lines: number }[] = [];
  for (const s of SHAPES) {
    if (shapeWeight(s, mode) <= 0) continue;
    const p = bestPlacement(board, s, withCols);
    if (p) out.push({ shape: s, score: p.score, lines: p.lines });
  }
  return out.sort((a, b) => b.score - a.score);
}

/**
 * Deal `n` pieces: `helpful` of them come from the shapes that complete lines / fill holes best,
 * the rest are random by weight but still fit somewhere on the board.
 */
export function dealPieces(board: Board, mode: Mode, n: number, helpful: number, rng: Rng): Shape[] {
  const ranked = rankShapes(board, mode);
  const out: Shape[] = [];
  const usedBases = new Set<string>();
  const good = ranked.filter((r) => r.lines > 0);
  const top = (good.length ? good : ranked).slice(0, 10);
  for (let i = 0; i < helpful && top.length; i++) {
    const pool = top.filter((r) => !usedBases.has(r.shape.base));
    const pick = rng.weighted(pool.length ? pool : top, (r) => 1 + r.score / 50);
    out.push(pick.shape);
    usedBases.add(pick.shape.base);
  }
  const fitting = ranked.map((r) => r.shape);
  while (out.length < n) {
    const pool = fitting.length ? fitting : SHAPES.filter((s) => s.cells.length === 1);
    out.push(rng.weighted(pool, (s) => shapeWeight(s, mode)));
  }
  return rng.shuffle(out);
}
