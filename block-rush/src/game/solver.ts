import type { Board } from './board';
import type { Shape } from './pieces';

export interface Placement {
  x: number;
  y: number;
  score: number;
  lines: number;
  gems: number;
}

/**
 * Heuristic value of putting `s` at (x, y): completed lines (and gems they free) dominate,
 * then how snugly the piece fills a hole and how close it brings rows/columns to completion.
 * Used for the hint and magic-piece boosters and for dealing helpful pieces.
 */
export function evaluate(board: Board, s: Shape, x: number, y: number, withCols: boolean): Placement {
  const w = board.w;
  const touchedRows = new Set<number>();
  const touchedCols = new Set<number>();
  const mine = new Set<number>();
  for (const [cx, cy] of s.cells) {
    touchedRows.add(y + cy);
    touchedCols.add(x + cx);
    mine.add((y + cy) * w + (x + cx));
  }
  let score = 0;
  let lines = 0;
  let gems = 0;
  for (const ry of touchedRows) {
    let n = 0;
    let g = 0;
    for (let rx = 0; rx < w; rx++) {
      const i = ry * w + rx;
      if (board.cells[i] !== -1 || mine.has(i)) n++;
      g += board.gems[i];
    }
    if (n === w) {
      lines++;
      gems += g;
    } else score += Math.pow(n / w, 3) * 12;
  }
  if (withCols) {
    for (const cx of touchedCols) {
      let n = 0;
      for (let cy = 0; cy < board.h; cy++) {
        const i = cy * w + cx;
        if (board.cells[i] !== -1 || mine.has(i)) n++;
      }
      if (n === board.h) lines++;
      else score += Math.pow(n / board.h, 3) * 12;
    }
  }
  // Snugness: neighbours that are walls or blocks.
  let snug = 0;
  for (const [cx, cy] of s.cells) {
    const px = x + cx;
    const py = y + cy;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = px + dx;
      const ny = py + dy;
      if (!board.inside(nx, ny)) snug += 0.6;
      else if (mine.has(ny * w + nx)) continue;
      else if (board.cells[ny * w + nx] !== -1) snug += 1;
    }
  }
  score += snug * 1.5 + lines * 120 + gems * 400;
  return { x, y, score, lines, gems };
}

export function bestPlacement(board: Board, s: Shape, withCols: boolean): Placement | null {
  let best: Placement | null = null;
  for (let y = 0; y <= board.h - s.h; y++) {
    for (let x = 0; x <= board.w - s.w; x++) {
      if (!board.canPlace(s, x, y)) continue;
      const p = evaluate(board, s, x, y, withCols);
      if (!best || p.score > best.score) best = p;
    }
  }
  return best;
}
