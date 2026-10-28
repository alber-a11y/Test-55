import { cellU, NEIGHBORS_EVEN, NEIGHBORS_ODD, R, ROW_H, rowLen } from './geom';

export type CellKind = 'ball' | 'stone' | 'animal' | 'coin';
export type Lock = 'none' | 'vine' | 'ice';

export interface Cell {
  id: number;
  kind: CellKind;
  /** Ball color id, -1 for non-ball cells. */
  color: number;
  lock: Lock;
  /** Which baby animal sits in an "animal" cell. */
  animal: number;
}

export interface CellRef {
  r: number;
  c: number;
  cell: Cell;
}

export type RemoveHow = 'pop' | 'drop' | 'blast';

export interface Removed extends CellRef {
  how: RemoveHow;
}

export interface Resolution {
  placed: CellRef | null;
  removed: Removed[];
  unlocked: (CellRef & { lock: Lock })[];
  /** Size of the matched color group (0 when nothing matched). */
  matched: number;
}

export type ShotKind = 'normal' | 'bomb' | 'rainbow';

const emptyRes = (): Resolution => ({ placed: null, removed: [], unlocked: [], matched: 0 });

/** Pure hex-grid model shared by the game scene and the level difficulty bot. */
export class Board {
  rows: (Cell | null)[][] = [];
  private nextId = 1;

  static fromDefs(defs: (Omit<Cell, 'id'> | null)[][]): Board {
    const b = new Board();
    defs.forEach((row, r) => {
      b.ensureRow(r);
      row.forEach((d, c) => {
        if (d && c < rowLen(r)) b.rows[r][c] = { ...d, id: b.nextId++ };
      });
    });
    return b;
  }

  clone(): Board {
    const b = new Board();
    b.nextId = this.nextId;
    b.rows = this.rows.map((row) => row.map((c) => (c ? { ...c } : null)));
    return b;
  }

  ensureRow(r: number): void {
    while (this.rows.length <= r) this.rows.push(new Array(rowLen(this.rows.length)).fill(null));
  }

  get(r: number, c: number): Cell | null {
    if (r < 0 || r >= this.rows.length || c < 0 || c >= rowLen(r)) return null;
    return this.rows[r][c];
  }

  inBounds(r: number, c: number): boolean {
    return r >= 0 && c >= 0 && c < rowLen(r);
  }

  neighbors(r: number, c: number): [number, number][] {
    const out: [number, number][] = [];
    for (const [dr, dc] of r % 2 === 0 ? NEIGHBORS_EVEN : NEIGHBORS_ODD) {
      const nr = r + dr;
      const nc = c + dc;
      if (this.inBounds(nr, nc)) out.push([nr, nc]);
    }
    return out;
  }

  makeCell(kind: CellKind, color: number, lock: Lock = 'none', animal = 0): Cell {
    return { id: this.nextId++, kind, color, lock, animal };
  }

  forEach(fn: (cell: Cell, r: number, c: number) => void): void {
    this.rows.forEach((row, r) => row.forEach((cell, c) => cell && fn(cell, r, c)));
  }

  count(pred: (c: Cell) => boolean = () => true): number {
    let n = 0;
    this.forEach((c) => {
      if (pred(c)) n++;
    });
    return n;
  }

  isEmpty(): boolean {
    return this.count() === 0;
  }

  /** Last row index that holds anything (-1 when empty). */
  maxRow(): number {
    for (let r = this.rows.length - 1; r >= 0; r--) if (this.rows[r].some((c) => c)) return r;
    return -1;
  }

  colorsPresent(): number[] {
    const set = new Set<number>();
    this.forEach((c) => {
      if (c.kind === 'ball') set.add(c.color);
    });
    return [...set];
  }

  canAttach(r: number, c: number): boolean {
    if (!this.inBounds(r, c) || this.get(r, c)) return false;
    if (r === 0) return true;
    return this.neighbors(r, c).some(([nr, nc]) => this.get(nr, nc));
  }

  /** Flat-plane center of a cell for a given ceiling position. */
  static cellV(r: number, vTop: number): number {
    return vTop - r * ROW_H;
  }

  /** Nearest attachable cell to a flat point. */
  snap(u: number, v: number, vTop: number): [number, number] | null {
    const r0 = Math.round((vTop - v) / ROW_H);
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (let rad = 1; rad <= 3 && !best; rad++) {
      for (let r = Math.max(0, r0 - rad); r <= r0 + rad; r++) {
        this.ensureRow(r);
        for (let c = 0; c < rowLen(r); c++) {
          if (!this.canAttach(r, c)) continue;
          const du = cellU(r, c) - u;
          const dv = Board.cellV(r, vTop) - v;
          const d = du * du + dv * dv;
          if (d < bestD) {
            bestD = d;
            best = [r, c];
          }
        }
      }
    }
    return best;
  }

  /** First occupied cell within `radius` of a flat point (or the ceiling). */
  hit(u: number, v: number, vTop: number, radius: number): CellRef | 'ceiling' | null {
    if (v >= vTop) return 'ceiling';
    const rf = (vTop - v) / ROW_H;
    for (let r = Math.max(0, Math.floor(rf) - 1); r <= Math.ceil(rf) + 1 && r < this.rows.length; r++) {
      const cv = Board.cellV(r, vTop);
      const cf = (u - R - (r % 2 === 1 ? R : 0)) / (2 * R);
      for (let c = Math.max(0, Math.floor(cf) - 1); c <= Math.ceil(cf) + 1 && c < rowLen(r); c++) {
        const cell = this.rows[r][c];
        if (!cell) continue;
        const du = cellU(r, c) - u;
        const dv = cv - v;
        if (du * du + dv * dv < radius * radius) return { r, c, cell };
      }
    }
    return null;
  }

  /** Same-color connected group (ice-locked balls do not match). */
  group(r: number, c: number, color: number): [number, number][] {
    const out: [number, number][] = [];
    const seen = new Set<string>();
    const stack: [number, number][] = [[r, c]];
    while (stack.length) {
      const [cr, cc] = stack.pop()!;
      const k = `${cr},${cc}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const cell = this.get(cr, cc);
      if (!cell || cell.kind !== 'ball' || cell.color !== color || cell.lock === 'ice') continue;
      out.push([cr, cc]);
      for (const n of this.neighbors(cr, cc)) stack.push(n);
    }
    return out;
  }

  private take(r: number, c: number, how: RemoveHow, res: Resolution): void {
    const cell = this.get(r, c);
    if (!cell) return;
    this.rows[r][c] = null;
    res.removed.push({ r, c, cell, how });
  }

  /** Pop a matched group: vines break instead of popping; neighbours react. */
  private popGroup(cells: [number, number][], res: Resolution): void {
    const popped: [number, number][] = [];
    for (const [r, c] of cells) {
      const cell = this.get(r, c);
      if (!cell) continue;
      if (cell.lock === 'vine') {
        cell.lock = 'none';
        res.unlocked.push({ r, c, cell, lock: 'vine' });
      } else {
        this.take(r, c, 'pop', res);
        popped.push([r, c]);
      }
    }
    for (const [r, c] of popped) {
      for (const [nr, nc] of this.neighbors(r, c)) {
        const n = this.get(nr, nc);
        if (!n) continue;
        if (n.kind === 'ball' && n.lock === 'ice') {
          n.lock = 'none';
          res.unlocked.push({ r: nr, c: nc, cell: n, lock: 'ice' });
        } else if (n.kind === 'animal' || n.kind === 'coin') {
          this.take(nr, nc, 'pop', res);
        }
      }
    }
  }

  /** Remove everything no longer connected to the ceiling row. */
  dropFloating(res: Resolution): void {
    const seen = new Set<number>();
    const stack: [number, number][] = [];
    if (this.rows.length) this.rows[0].forEach((cell, c) => cell && stack.push([0, c]));
    while (stack.length) {
      const [r, c] = stack.pop()!;
      const cell = this.get(r, c);
      if (!cell || seen.has(cell.id)) continue;
      seen.add(cell.id);
      for (const n of this.neighbors(r, c)) stack.push(n);
    }
    this.forEach((cell, r, c) => {
      if (!seen.has(cell.id)) this.take(r, c, 'drop', res);
    });
  }

  /** Attach a shot at (r,c) and resolve matches / booster effects. */
  resolveShot(r: number, c: number, color: number, kind: ShotKind): Resolution {
    const res = emptyRes();
    this.ensureRow(r + 1);
    if (kind === 'bomb') {
      this.blast(r, c, 2.6, res);
      this.dropFloating(res);
      return res;
    }
    if (kind === 'rainbow') {
      const union = new Map<string, [number, number]>();
      for (const [nr, nc] of this.neighbors(r, c)) {
        const n = this.get(nr, nc);
        if (!n || n.kind !== 'ball' || n.lock === 'ice') continue;
        for (const p of this.group(nr, nc, n.color)) union.set(`${p[0]},${p[1]}`, p);
      }
      res.matched = union.size + 1;
      // The rainbow ball itself pops too: place a transient cell so neighbours react to it.
      const self = this.makeCell('ball', -2);
      this.rows[r][c] = self;
      this.popGroup([[r, c], ...union.values()], res);
      this.dropFloating(res);
      return res;
    }
    const cell = this.makeCell('ball', color);
    this.rows[r][c] = cell;
    res.placed = { r, c, cell };
    const g = this.group(r, c, color);
    if (g.length >= 3) {
      res.matched = g.length;
      this.popGroup(g, res);
      this.dropFloating(res);
    }
    return res;
  }

  /** Remove every cell whose center is within `cells` cell-diameters of (r,c). */
  blast(r: number, c: number, cells: number, res: Resolution, vTop = 0): void {
    const cu = cellU(r, c);
    const cv = Board.cellV(r, vTop);
    const rad = cells * 2 * R;
    this.forEach((_cell, rr, cc) => {
      const du = cellU(rr, cc) - cu;
      const dv = Board.cellV(rr, vTop) - cv;
      if (du * du + dv * dv <= rad * rad) this.take(rr, cc, 'blast', res);
    });
  }

  /** Remove specific cells (fire / lightning boosters) and drop floating ones. */
  removeCells(cells: [number, number][]): Resolution {
    const res = emptyRes();
    for (const [r, c] of cells) this.take(r, c, 'blast', res);
    this.dropFloating(res);
    return res;
  }
}
