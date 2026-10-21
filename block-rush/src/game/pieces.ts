export type Cell = readonly [number, number]; // [x, y]

export interface Shape {
  /** Base shape id, shared by all rotations. */
  base: string;
  /** Unique id of this rotation. */
  id: string;
  cells: Cell[];
  w: number;
  h: number;
}

interface BaseDef {
  base: string;
  rows: string[];
  /** Relative frequency in the levels / classic generators. */
  wLevels: number;
  wClassic: number;
}

// Rows use '#' for a cell. Rotations are generated automatically.
const BASES: BaseDef[] = [
  { base: 'dot', rows: ['#'], wLevels: 3, wClassic: 2 },
  { base: 'i2', rows: ['##'], wLevels: 5, wClassic: 4 },
  { base: 'i3', rows: ['###'], wLevels: 6, wClassic: 5 },
  { base: 'l3', rows: ['#.', '##'], wLevels: 7, wClassic: 5 },
  { base: 'i4', rows: ['####'], wLevels: 4, wClassic: 4 },
  { base: 'o4', rows: ['##', '##'], wLevels: 4, wClassic: 6 },
  { base: 't4', rows: ['###', '.#.'], wLevels: 6, wClassic: 4 },
  { base: 's4', rows: ['.##', '##.'], wLevels: 5, wClassic: 3 },
  { base: 'z4', rows: ['##.', '.##'], wLevels: 5, wClassic: 3 },
  { base: 'l4', rows: ['#.', '#.', '##'], wLevels: 6, wClassic: 4 },
  { base: 'j4', rows: ['.#', '.#', '##'], wLevels: 6, wClassic: 4 },
  { base: 'i5', rows: ['#####'], wLevels: 2, wClassic: 3 },
  { base: 'v5', rows: ['#..', '#..', '###'], wLevels: 3, wClassic: 4 },
  { base: 'p5', rows: ['##', '##', '#.'], wLevels: 3, wClassic: 0 },
  { base: 'u5', rows: ['#.#', '###'], wLevels: 3, wClassic: 0 },
  { base: 't5', rows: ['###', '.#.', '.#.'], wLevels: 2, wClassic: 0 },
  { base: 'x5', rows: ['.#.', '###', '.#.'], wLevels: 2, wClassic: 0 },
  { base: 'r6', rows: ['###', '###'], wLevels: 0, wClassic: 3 },
  { base: 'o9', rows: ['###', '###', '###'], wLevels: 0, wClassic: 2 },
];

function normalize(cells: Cell[]): Cell[] {
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  return cells
    .map((c) => [c[0] - minX, c[1] - minY] as Cell)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

function key(cells: Cell[]): string {
  return cells.map((c) => c.join(',')).join(';');
}

export function makeShape(base: string, cells: Cell[], idx: number): Shape {
  const n = normalize(cells);
  return {
    base,
    id: `${base}_${idx}`,
    cells: n,
    w: Math.max(...n.map((c) => c[0])) + 1,
    h: Math.max(...n.map((c) => c[1])) + 1,
  };
}

/** Rotate 90° clockwise. */
export function rotateShape(s: Shape): Shape {
  const cells = s.cells.map(([x, y]) => [s.h - 1 - y, x] as Cell);
  const r = makeShape(s.base, cells, 0);
  const variant = SHAPES.find((v) => v.base === s.base && key(v.cells) === key(r.cells));
  return variant ?? r;
}

function build(): Shape[] {
  const out: Shape[] = [];
  for (const b of BASES) {
    let cells: Cell[] = [];
    b.rows.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && cells.push([x, y])));
    const seen = new Set<string>();
    for (let r = 0; r < 4; r++) {
      const n = normalize(cells);
      const k = key(n);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(makeShape(b.base, n, seen.size - 1));
      }
      const h = Math.max(...n.map((c) => c[1])) + 1;
      cells = n.map(([x, y]) => [h - 1 - y, x] as Cell);
    }
  }
  return out;
}

export const SHAPES: Shape[] = build();
const BASE_BY_ID = new Map(BASES.map((b) => [b.base, b]));

export function shapeWeight(s: Shape, mode: 'levels' | 'classic'): number {
  const b = BASE_BY_ID.get(s.base)!;
  const rotations = SHAPES.filter((v) => v.base === s.base).length;
  return (mode === 'levels' ? b.wLevels : b.wClassic) / rotations;
}

export const DOT: Shape = SHAPES.find((s) => s.base === 'dot')!;

export function shapeById(id: string): Shape | undefined {
  return SHAPES.find((s) => s.id === id);
}
