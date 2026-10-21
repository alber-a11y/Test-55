import type { Shape } from './pieces';

export const EMPTY = -1;

export interface CellRef {
  x: number;
  y: number;
  color: number;
  gem: boolean;
}

export interface Lines {
  rows: number[];
  cols: number[];
}

/** Grid of colored cells. `cells[i] = -1` is empty, otherwise a palette index. Gems sit on filled cells. */
export class Board {
  readonly cells: Int8Array;
  readonly gems: Uint8Array;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.cells = new Int8Array(w * h).fill(EMPTY);
    this.gems = new Uint8Array(w * h);
  }

  clone(): Board {
    const b = new Board(this.w, this.h);
    b.cells.set(this.cells);
    b.gems.set(this.gems);
    return b;
  }

  copyFrom(o: Board): void {
    this.cells.set(o.cells);
    this.gems.set(o.gems);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): number {
    return this.cells[y * this.w + x];
  }

  filled(x: number, y: number): boolean {
    return this.inside(x, y) && this.cells[y * this.w + x] !== EMPTY;
  }

  isGem(x: number, y: number): boolean {
    return this.inside(x, y) && this.gems[y * this.w + x] === 1;
  }

  set(x: number, y: number, color: number): void {
    this.cells[y * this.w + x] = color;
    if (color === EMPTY) this.gems[y * this.w + x] = 0;
  }

  setGem(x: number, y: number, on: boolean): void {
    this.gems[y * this.w + x] = on ? 1 : 0;
  }

  canPlace(s: Shape, x: number, y: number): boolean {
    for (const [cx, cy] of s.cells) {
      const px = x + cx;
      const py = y + cy;
      if (px < 0 || py < 0 || px >= this.w || py >= this.h) return false;
      if (this.cells[py * this.w + px] !== EMPTY) return false;
    }
    return true;
  }

  fitsAnywhere(s: Shape): boolean {
    for (let y = 0; y <= this.h - s.h; y++) for (let x = 0; x <= this.w - s.w; x++) if (this.canPlace(s, x, y)) return true;
    return false;
  }

  place(s: Shape, x: number, y: number, color: number): void {
    for (const [cx, cy] of s.cells) this.cells[(y + cy) * this.w + (x + cx)] = color;
  }

  rowFull(y: number): boolean {
    for (let x = 0; x < this.w; x++) if (this.cells[y * this.w + x] === EMPTY) return false;
    return true;
  }

  colFull(x: number): boolean {
    for (let y = 0; y < this.h; y++) if (this.cells[y * this.w + x] === EMPTY) return false;
    return true;
  }

  rowCount(y: number): number {
    let n = 0;
    for (let x = 0; x < this.w; x++) if (this.cells[y * this.w + x] !== EMPTY) n++;
    return n;
  }

  colCount(x: number): number {
    let n = 0;
    for (let y = 0; y < this.h; y++) if (this.cells[y * this.w + x] !== EMPTY) n++;
    return n;
  }

  fullLines(withCols: boolean): Lines {
    const rows: number[] = [];
    const cols: number[] = [];
    for (let y = 0; y < this.h; y++) if (this.rowFull(y)) rows.push(y);
    if (withCols) for (let x = 0; x < this.w; x++) if (this.colFull(x)) cols.push(x);
    return { rows, cols };
  }

  /** Remove the given cells (deduplicated), returning what was there. */
  remove(cells: Iterable<[number, number]>): CellRef[] {
    const out: CellRef[] = [];
    const seen = new Set<number>();
    for (const [x, y] of cells) {
      if (!this.inside(x, y)) continue;
      const i = y * this.w + x;
      if (seen.has(i) || this.cells[i] === EMPTY) continue;
      seen.add(i);
      out.push({ x, y, color: this.cells[i], gem: this.gems[i] === 1 });
      this.cells[i] = EMPTY;
      this.gems[i] = 0;
    }
    return out;
  }

  lineCells(lines: Lines): [number, number][] {
    const out: [number, number][] = [];
    for (const y of lines.rows) for (let x = 0; x < this.w; x++) out.push([x, y]);
    for (const x of lines.cols) for (let y = 0; y < this.h; y++) out.push([x, y]);
    return out;
  }

  gemCount(): number {
    let n = 0;
    for (let i = 0; i < this.gems.length; i++) n += this.gems[i];
    return n;
  }

  emptyCount(): number {
    let n = 0;
    for (let i = 0; i < this.cells.length; i++) if (this.cells[i] === EMPTY) n++;
    return n;
  }
}
