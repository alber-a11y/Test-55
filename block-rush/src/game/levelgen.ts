import { CONFIG } from '../config';
import { Rng, hashSeed } from '../core/rng';
import { clamp } from '../core/util';
import { Board } from './board';
import { SHAPES, shapeWeight, type Shape } from './pieces';
import { STYLE_COUNT, PALETTE_SIZE } from '../render/styles';

export type Silhouette = 'v' | 'hill' | 'w' | 'wave' | 'steps' | 'bowl' | 'slope' | 'flat';
const SILHOUETTES: Silhouette[] = ['v', 'hill', 'w', 'wave', 'steps', 'bowl', 'slope', 'flat'];

export interface LevelDef {
  level: number;
  board: Board;
  gems: number;
  time: number;
  style: number;
  color: number;
  /** How many of the dealt pieces are chosen to fit the board well. */
  helpful: number;
  silhouette: Silhouette;
  seed: number;
}

function profile(sil: Silhouette, u: number, rng: Rng, phase: number, freq: number): number {
  switch (sil) {
    case 'v':
      return 1 - Math.abs(2 * u - 1);
    case 'hill':
      return Math.abs(2 * u - 1);
    case 'w':
      return u < 0.5 ? Math.max(0, 1 - Math.abs(4 * u - 1)) : Math.max(0, 1 - Math.abs(4 * u - 3));
    case 'wave':
      return 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * freq + phase);
    case 'steps':
      return Math.floor(u * 3.999) / 3;
    case 'bowl':
      return 1 - Math.pow(2 * u - 1, 2);
    case 'slope':
      return phase > Math.PI ? u : 1 - u;
    case 'flat':
      return rng.chance(0.25) ? 0.5 : 0.15;
  }
}

/** Is every 4-neighbour of the carved shape (outside the shape) a block or a wall? */
function enclosed(board: Board, s: Shape, x: number, y: number): boolean {
  const own = new Set(s.cells.map(([cx, cy]) => `${x + cx},${y + cy}`));
  for (const [cx, cy] of s.cells) {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + cx + dx;
      const ny = y + cy + dy;
      if (!board.inside(nx, ny) || own.has(`${nx},${ny}`)) continue;
      if (!board.filled(nx, ny)) return false;
    }
  }
  return true;
}

function canCarve(board: Board, s: Shape, x: number, y: number): boolean {
  for (const [cx, cy] of s.cells) {
    const px = x + cx;
    const py = y + cy;
    if (!board.filled(px, py) || board.isGem(px, py)) return false;
  }
  return enclosed(board, s, x, y);
}

/** Carve a piece-shaped hole that covers row `row`. Returns false when nothing fits. */
function carveInRow(board: Board, row: number, rng: Rng, maxSize: number): boolean {
  const pool = SHAPES.filter((s) => s.cells.length <= maxSize && shapeWeight(s, 'levels') > 0);
  for (let attempt = 0; attempt < 60; attempt++) {
    const s = rng.weighted(pool, (p) => shapeWeight(p, 'levels'));
    const anchor = rng.pick(s.cells);
    const y = row - anchor[1];
    const x = rng.int(0, board.w - s.w);
    if (canCarve(board, s, x, y)) {
      for (const [cx, cy] of s.cells) board.set(x + cx, y + cy, -1);
      return true;
    }
  }
  // Fallback: a single enclosed cell.
  const dot = SHAPES.find((s) => s.base === 'dot')!;
  const xs = rng.shuffle([...Array(board.w).keys()]);
  for (const x of xs) {
    if (canCarve(board, dot, x, row)) {
      board.set(x, row, -1);
      return true;
    }
  }
  return false;
}

export function levelTime(level: number, gems: number): number {
  const c = CONFIG.levels;
  const factor = Math.max(c.timeMinFactor, 1 - (level - 1) * c.timeFactorPerLevel);
  return Math.round((c.timeBase + c.timePerGem * gems) * factor);
}

export function generateLevel(level: number): LevelDef {
  const seed = hashSeed('block-rush-level', level);
  const rng = new Rng(seed);
  const W = CONFIG.levels.cols;
  const H = CONFIG.levels.rows;
  const d = clamp((level - 1) / 60, 0, 1);
  const board = new Board(W, H);

  // 1. Terrain silhouette: depth[c] = number of empty rows at the top of column c.
  const sil: Silhouette = level === 1 ? 'v' : rng.pick(SILHOUETTES);
  const minE = rng.int(2, 3);
  const maxE = rng.int(Math.round(H * 0.4), Math.round(H * 0.55));
  const phase = rng.range(0, Math.PI * 2);
  const freq = rng.range(0.8, 1.6);
  const depth: number[] = [];
  for (let c = 0; c < W; c++) {
    const u = c / (W - 1);
    let v = Math.round(minE + (maxE - minE) * profile(sil, u, rng, phase, freq));
    if (level > 2 && rng.chance(0.2)) v += rng.int(-1, 1);
    depth.push(clamp(v, 1, H - 6));
  }
  const color = rng.int(0, PALETTE_SIZE - 1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) board.set(x, y, y >= depth[x] ? color : -1);
  const terrainTop = Math.max(...depth); // first row that is solid across the board

  // 2. Crystals: in solid rows, deeper as levels progress.
  const gems = Math.min(8, 1 + Math.floor((level + 1) / 4));
  const rows: number[] = [];
  for (let y = terrainTop; y < H; y++) rows.push(y);
  // Allow a few partly-open rows on harder levels.
  if (d > 0.25) for (let y = Math.min(...depth) + 1; y < terrainTop; y++) if (W - board.rowCount(y) <= 5) rows.push(y);
  const depthBias = 0.3 + d * 2.5;
  const gemRows = new Set<number>();
  for (let g = 0; g < gems && rows.length; g++) {
    const free = rows.filter((r) => !gemRows.has(r));
    const pickFrom = free.length ? free : rows;
    const r = rng.weighted(pickFrom, (y) => Math.pow(1 / (1 + Math.abs(y - terrainTop) / 3), 1 / depthBias) + 0.02);
    gemRows.add(r);
    const xs = [...Array(W).keys()].filter((x) => board.filled(x, r) && !board.isGem(x, r));
    if (xs.length) board.setGem(rng.pick(xs), r, true);
  }

  // 3. Holes: every solid row gets at least one enclosed, piece-shaped hole.
  const maxSize = level <= 3 ? 3 : level <= 8 ? 4 : 5;
  for (let y = terrainTop; y < H; y++) if (board.rowFull(y)) carveInRow(board, y, rng, maxSize);
  const extra = rng.int(0, 1 + Math.floor(d * 5));
  for (let i = 0; i < extra; i++) carveInRow(board, rng.int(terrainTop, H - 1), rng, maxSize);
  // Safety: nothing may be complete at start.
  for (let y = 0; y < H; y++) if (board.rowFull(y)) carveInRow(board, y, rng, 1);

  const realGems = board.gemCount();
  const helpful = clamp(Math.round(4 - d * 2.4 + rng.range(-0.4, 0.4)), 1, 4);
  return {
    level,
    board,
    gems: realGems,
    time: levelTime(level, realGems),
    style: level === 1 ? 0 : (rng.int(0, STYLE_COUNT - 1) + level) % STYLE_COUNT,
    color,
    helpful,
    silhouette: sil,
    seed,
  };
}
