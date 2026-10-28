import { hash32, Rng } from '../core/rng';
import { COLOR_COUNT, LETTER_TO_COLOR } from '../data/colors';
import { picturesFor, type Picture } from '../data/mosaics';
import { Board, type Cell } from './board';
import { COLS, rowLen, U_LAUNCH } from './geom';
import { simulate } from './sim';

export type Goal = { type: 'clear' } | { type: 'rescue'; count: number } | { type: 'collect'; color: number; count: number };

export interface Hole {
  u: number;
  v: number;
  mult: number;
}

export type CellDef = Omit<Cell, 'id'>;

export interface LevelDef {
  level: number;
  seed: number;
  cells: (CellDef | null)[][];
  shots: number;
  goal: Goal;
  holes: Hole[];
  pictures: string[];
  boss: boolean;
}

/** Number of distinct ball colours on a level. */
export function colorsFor(level: number): number {
  if (level <= 6) return 4;
  if (level <= 15) return 5;
  if (level <= 40) return 6;
  if (level <= 90) return 7;
  return 8;
}

export const ANIMAL_KINDS = 5;

/** Picture cell for row r / col c (odd rows are one shorter: the middle column is skipped). */
function artAt(art: string[], r: number, c: number): string {
  const row = art[r] ?? '';
  const pad = 17 - row.length;
  const line = pad > 0 ? '.'.repeat(Math.floor(pad / 2)) + row + '.'.repeat(Math.ceil(pad / 2)) : row;
  const col = r % 2 === 0 ? c : c < 8 ? c : c + 1;
  return line[col] ?? '.';
}

function pictureColors(p: Picture): Map<number, number> {
  const m = new Map<number, number>();
  for (const row of p.art) for (const ch of row) if (ch in LETTER_TO_COLOR) m.set(LETTER_TO_COLOR[ch], (m.get(LETTER_TO_COLOR[ch]) ?? 0) + 1);
  return m;
}

/** Background pattern colour for a "." cell. */
type Pattern = (r: number, c: number) => number;

function makePattern(rng: Rng, bg: number[], level: number, rows: number): Pattern {
  if (bg.length === 1) return () => bg[0];
  const kind = rng.pick(level < 6 ? ['stripes', 'blobs'] : ['blobs', 'stripes', 'diag', 'checker', 'waves', 'blobs']);
  const band = level < 10 ? 3 : level < 40 ? 2 : rng.int(2, 3);
  switch (kind) {
    case 'stripes':
      return (r) => bg[Math.floor(r / band) % bg.length];
    case 'diag':
      return (r, c) => bg[Math.floor((c + r) / (band + 1)) % bg.length];
    case 'checker':
      return (r, c) => bg[(Math.floor(r / (band + 1)) + Math.floor(c / (band + 2))) % bg.length];
    case 'waves':
      return (r, c) => bg[Math.floor((r + 2.2 * Math.sin(c * 0.55)) / (band + 1) + 100) % bg.length];
    default: {
      // Cellular blobs: random noise smoothed by neighbour majority.
      let grid: number[][] = [];
      for (let r = 0; r < rows; r++) grid.push(Array.from({ length: COLS }, () => rng.int(0, bg.length - 1)));
      const passes = level < 20 ? 3 : 2;
      for (let p = 0; p < passes; p++) {
        grid = grid.map((row, r) =>
          row.map((v, c) => {
            const cnt = new Array(bg.length).fill(0);
            for (let dr = -1; dr <= 1; dr++)
              for (let dc = -1; dc <= 1; dc++) {
                const x = grid[r + dr]?.[c + dc];
                if (x !== undefined) cnt[x]++;
              }
            cnt[v] += 0.5;
            return cnt.indexOf(Math.max(...cnt));
          }),
        );
      }
      return (r, c) => bg[grid[r]?.[c] ?? 0];
    }
  }
}

/** Generate level `level` deterministically (pictures depend on owned mosaic packs). */
export function generateLevel(level: number, packs: string[]): LevelDef {
  // Re-roll smaller boards when the bot finds a layout too long to clear.
  let def = build(level, packs, 1);
  for (let attempt = 1; attempt < 3 && def.need > 60; attempt++) def = build(level, packs, 1 - attempt * 0.25);
  return def.level;
}

function build(level: number, packs: string[], rowScale: number): { level: LevelDef; need: number } {
  const seed = hash32('level', level, rowScale);
  const rng = new Rng(seed);
  const boss = level % 10 === 0;
  const nColors = colorsFor(level);
  const pool = picturesFor(packs.length ? packs : ['amazon']);

  // Pick pictures that fit the colour budget (leave room for the background).
  const fits = (p: Picture) => pictureColors(p).size <= Math.max(1, nColors - 1);
  let candidates = pool.filter(fits);
  if (!candidates.length) candidates = pool;
  // Walk a fixed shuffled order so consecutive levels show different pictures.
  const order = new Rng(hash32('order', candidates.length, packs.join())).shuffle([...candidates]);
  const pic1 = order[(level - 1) % order.length];
  const pictures = [pic1];

  const totalRows = Math.round(Math.min(44, 13 + Math.floor(level * 0.3) + rng.int(0, 3) + (boss ? 6 : 0)) * rowScale);
  const bottomFill = rng.int(1, 2);
  let layout: { pic: Picture; at: number }[] = [];
  let topFill = totalRows - pic1.art.length - bottomFill;
  if (topFill > pic1.art.length + 4 && pool.length > 1) {
    const others = (candidates.length > 1 ? candidates : pool).filter((p) => p !== pic1);
    const pic2 = others[hash32('pic2', level) % Math.max(1, others.length)] ?? pic1;
    pictures.push(pic2);
    const gap = rng.int(1, 3);
    const at2 = Math.max(0, topFill - pic2.art.length - gap);
    layout.push({ pic: pic2, at: at2 });
  }
  layout.push({ pic: pic1, at: Math.max(0, topFill) });
  const rows = Math.max(totalRows, pic1.art.length + bottomFill);

  // Colours: picture colours plus background colours up to the budget.
  const used = new Set<number>();
  for (const l of layout) for (const k of pictureColors(l.pic).keys()) used.add(k);
  const all = rng.shuffle(Array.from({ length: COLOR_COUNT }, (_, i) => i));
  // Background: at least two colours (a single solid colour would pop in one shot).
  const bgWanted = level < 20 ? 2 : 3;
  const bg = all.filter((c) => !used.has(c)).slice(0, Math.max(0, Math.min(bgWanted, nColors - used.size)));
  const leastUsed = [...used].sort((a, b) => sum(layout, a) - sum(layout, b));
  while (bg.length < bgWanted && leastUsed.length) bg.push(leastUsed.shift()!);
  if (!bg.length) bg.push(all[0]);
  const allowed = new Set<number>([...used, ...bg]);
  // Too many colours (small budget): fold extra picture colours into kept ones.
  const remap = new Map<number, number>();
  if (allowed.size > nColors) {
    const keep = [...bg, ...[...used].sort((a, b) => sum(layout, b) - sum(layout, a))].slice(0, nColors);
    for (const c of allowed) if (!keep.includes(c)) remap.set(c, keep.reduce((best, k) => (ringDist(k, c) < ringDist(best, c) ? k : best), keep[0]));
  }
  const pattern = makePattern(rng, bg, level, rows);

  const cells: (CellDef | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: (CellDef | null)[] = [];
    for (let c = 0; c < rowLen(r); c++) {
      let ch = '.';
      for (const l of layout) if (r >= l.at && r < l.at + l.pic.art.length) ch = artAt(l.pic.art, r - l.at, c);
      if (ch === ' ') {
        row.push(null);
        continue;
      }
      let color = ch in LETTER_TO_COLOR ? LETTER_TO_COLOR[ch] : pattern(r, c);
      color = remap.get(color) ?? color;
      row.push({ kind: 'ball', color, lock: 'none', animal: 0 });
    }
    cells.push(row);
  }
  // Row 0 must hold something to hang from.
  if (!cells[0].some((c) => c)) cells[0] = cells[0].map(() => ({ kind: 'ball', color: bg[0], lock: 'none', animal: 0 }));

  // Goal.
  let goal: LevelDef['goal'] = { type: 'clear' };
  if (level >= 5 && level % 3 === 2) goal = { type: 'rescue', count: Math.min(8, 3 + Math.floor(level / 20)) };
  else if (level >= 8 && level % 4 === 0) {
    const counts = new Map<number, number>();
    cells.flat().forEach((c) => c && counts.set(c.color, (counts.get(c.color) ?? 0) + 1));
    const [color, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[rng.int(0, Math.min(1, counts.size - 1))];
    goal = { type: 'collect', color, count: Math.max(15, Math.round((n * 0.6) / 5) * 5) };
  }

  // Specials.
  const ballCells = () => {
    const out: [number, number][] = [];
    cells.forEach((row, r) => row.forEach((c, i) => c && c.kind === 'ball' && c.lock === 'none' && out.push([r, i])));
    return out;
  };
  if (goal.type === 'rescue') {
    const spots = rng.shuffle(ballCells().filter(([r]) => r <= Math.max(2, rows * 0.65)));
    for (let i = 0; i < goal.count && i < spots.length; i++) {
      const [r, c] = spots[i];
      cells[r][c] = { kind: 'animal', color: -1, lock: 'none', animal: rng.int(0, ANIMAL_KINDS - 1) };
    }
  }
  if (level >= 3) {
    const spots = rng.shuffle(ballCells());
    for (let i = 0; i < rng.int(1, 3) && i < spots.length; i++) {
      const [r, c] = spots[i];
      cells[r][c] = { kind: 'coin', color: -1, lock: 'none', animal: 0 };
    }
  }
  if (level >= 7) {
    const frac = Math.min(0.12, 0.03 + (level - 7) * 0.003);
    for (const [r, c] of ballCells()) if (rng.chance(frac)) cells[r][c]!.lock = 'vine';
  }
  if (level >= 12) {
    const frac = Math.min(0.1, 0.03 + (level - 12) * 0.003);
    for (const [r, c] of ballCells()) if (rng.chance(frac)) cells[r][c]!.lock = 'ice';
  }
  if (level >= 17) {
    const clusters = Math.min(5, 1 + Math.floor((level - 17) / 12));
    const b = Board.fromDefs(cells);
    for (let k = 0; k < clusters; k++) {
      let [r, c] = rng.pick(ballCells());
      for (let s = 0; s < rng.int(2, 4); s++) {
        if (cells[r]?.[c]?.kind === 'ball') cells[r][c] = { kind: 'stone', color: -1, lock: 'none', animal: 0 };
        const nb = b.neighbors(r, c);
        [r, c] = rng.pick(nb);
      }
    }
  }

  // Shot budget from the bot's playthrough.
  const start = Board.fromDefs(cells);
  const runs = [1, 2, 3].map((k) => simulate(start, goal, seed ^ (0x5bd1e995 * k))).sort((a, b) => a - b);
  const need = runs[1];
  const slack = level <= 5 ? 1.7 : level <= 15 ? 1.5 : level <= 40 ? 1.38 : Math.max(1.22, 1.32 - level * 0.0005);
  const minShots = level <= 10 ? 20 : 16;
  const shots = Math.max(minShots, Math.min(99, Math.ceil(need * slack) + 3));

  return { level: { level, seed, cells, shots, goal, holes: makeHoles(rng), pictures: pictures.map((p) => p.id), boss }, need };
}

function sum(layout: { pic: Picture }[], color: number): number {
  return layout.reduce((s, l) => s + (pictureColors(l.pic).get(color) ?? 0), 0);
}

function ringDist(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, COLOR_COUNT - d);
}

/** Pockets on the lane floor that catch rolling balls for coins. */
function makeHoles(rng: Rng): Hole[] {
  const mults = rng.shuffle([1, 2, 2, 3, 5]);
  const holes: Hole[] = [];
  let guard = 0;
  while (holes.length < mults.length && guard++ < 400) {
    const u = rng.int(55, 605);
    const v = rng.int(-270, -70);
    if (Math.abs(u - U_LAUNCH) < 95 && v < -190) continue;
    if (holes.some((h) => Math.hypot(h.u - u, h.v - v) < 120)) continue;
    holes.push({ u, v, mult: mults[holes.length] });
  }
  return holes;
}
