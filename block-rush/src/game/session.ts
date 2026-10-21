import { CONFIG } from '../config';
import { Rng } from '../core/rng';
import { PALETTE_SIZE, STYLE_COUNT } from '../render/styles';
import { Board, type CellRef, type Lines } from './board';
import { boosterDef, type BoosterId } from './boosters';
import { generateLevel, type LevelDef } from './levelgen';
import { DOT, SHAPES, rotateShape, shapeWeight, type Shape } from './pieces';
import { bestPlacement } from './solver';
import { dealPieces, rankShapes, type Mode } from './tray';

export interface TraySlot {
  shape: Shape;
  color: number;
}

export type CrushKind = 'line' | 'bomb' | 'mega' | 'row' | 'col' | 'cross' | 'hammer' | 'revive';

export type SessionEvent =
  | { type: 'placed'; cells: [number, number][]; color: number }
  | { type: 'cleared'; cells: CellRef[]; lines: Lines; ox: number; oy: number; kind: CrushKind }
  | { type: 'gem'; x: number; y: number }
  | { type: 'score'; amount: number; x: number; y: number }
  | { type: 'praise'; level: number; combo: number }
  | { type: 'tray'; refill: boolean }
  | { type: 'hint'; slot: number; x: number; y: number }
  | { type: 'state' }
  | { type: 'shake'; power: number }
  | { type: 'booster'; id: BoosterId; x?: number; y?: number }
  | { type: 'tick'; sec: number };

interface Snapshot {
  board: Board;
  slots: (TraySlot | null)[];
  score: number;
  combo: number;
  grace: number;
  gemsLeft: number;
}

export type SessionState = 'playing' | 'won' | 'lost';

export class Session {
  readonly mode: Mode;
  readonly board: Board;
  readonly def: LevelDef | null;
  readonly style: number;
  /** Levels: the single color of this level. */
  readonly baseColor: number;
  slots: (TraySlot | null)[] = [];
  slotCount: number;
  score = 0;
  combo = 0;
  private grace = 0;
  moves = 0;
  timeLeft = 0;
  timeTotal = 0;
  freezeLeft = 0;
  x2Left = 0;
  gemsTotal = 0;
  gemsLeft = 0;
  state: SessionState = 'playing';
  loseReason: 'time' | 'moves' | null = null;
  revivesUsed = 0;
  elapsed = 0;
  private undoSnap: Snapshot | null = null;
  private rng = new Rng((Math.random() * 2 ** 32) >>> 0);
  private listeners: ((e: SessionEvent) => void)[] = [];
  private lastTick = -1;

  constructor(opts: { mode: 'levels'; level: number } | { mode: 'classic' }) {
    this.mode = opts.mode;
    if (opts.mode === 'levels') {
      this.def = generateLevel(opts.level);
      this.board = this.def.board.clone();
      this.style = this.def.style;
      this.baseColor = this.def.color;
      this.gemsTotal = this.gemsLeft = this.def.gems;
      this.timeLeft = this.timeTotal = this.def.time;
      this.slotCount = CONFIG.levels.traySlots;
    } else {
      this.def = null;
      const n = CONFIG.classic.size;
      this.board = new Board(n, n);
      this.style = this.rng.int(0, STYLE_COUNT - 1);
      this.baseColor = 0;
      this.slotCount = CONFIG.classic.traySlots;
    }
    this.refill();
  }

  on(l: (e: SessionEvent) => void): void {
    this.listeners.push(l);
  }

  private emit(e: SessionEvent): void {
    this.listeners.forEach((l) => l(e));
  }

  get withCols(): boolean {
    return this.mode === 'classic';
  }

  get levelNo(): number {
    return this.def?.level ?? 0;
  }

  // ---------- tray ----------

  private pieceColor(): number {
    return this.mode === 'levels' ? this.baseColor : this.rng.int(0, PALETTE_SIZE - 1);
  }

  private helpfulCount(): number {
    if (this.mode === 'levels') return this.def!.helpful;
    // Classic gets meaner as the game goes on.
    return this.rng.chance(Math.max(0.15, 0.6 - this.moves / 400)) ? 1 : 0;
  }

  private refill(): void {
    const shapes = dealPieces(this.board, this.mode, this.slotCount, this.helpfulCount(), this.rng);
    this.slots = shapes.map((shape) => ({ shape, color: this.pieceColor() }));
    this.emit({ type: 'tray', refill: true });
  }

  canPlace(slot: number, x: number, y: number): boolean {
    const s = this.slots[slot];
    return !!s && this.state === 'playing' && this.board.canPlace(s.shape, x, y);
  }

  /** Rows/columns that would complete if the piece were dropped here (for the preview). */
  previewLines(slot: number, x: number, y: number): Lines {
    const s = this.slots[slot];
    if (!s || !this.board.canPlace(s.shape, x, y)) return { rows: [], cols: [] };
    const b = this.board.clone();
    b.place(s.shape, x, y, s.color);
    return b.fullLines(this.withCols);
  }

  private snapshot(): Snapshot {
    return {
      board: this.board.clone(),
      slots: this.slots.map((s) => (s ? { ...s } : null)),
      score: this.score,
      combo: this.combo,
      grace: this.grace,
      gemsLeft: this.gemsLeft,
    };
  }

  tryPlace(slot: number, x: number, y: number): boolean {
    const s = this.slots[slot];
    if (!s || !this.canPlace(slot, x, y)) return false;
    this.undoSnap = this.snapshot();
    this.board.place(s.shape, x, y, s.color);
    this.slots[slot] = null;
    this.moves++;
    const cells = s.shape.cells.map(([cx, cy]) => [x + cx, y + cy] as [number, number]);
    this.emit({ type: 'placed', cells, color: s.color });
    const cx = x + s.shape.w / 2;
    const cy = y + s.shape.h / 2;
    let gained = CONFIG.score.perCell * s.shape.cells.length;

    const lines = this.board.fullLines(this.withCols);
    const nLines = lines.rows.length + lines.cols.length;
    if (nLines > 0) {
      this.combo++;
      this.grace = 0;
      const sc = CONFIG.score;
      const base = sc.perLine * nLines * (1 + sc.multiLineBonus * (nLines - 1));
      gained += Math.round(base * (1 + sc.comboStep * (this.combo - 1)));
      const removed = this.board.remove(this.board.lineCells(lines));
      gained += this.collectGems(removed);
      this.emit({ type: 'cleared', cells: removed, lines, ox: cx, oy: cy, kind: 'line' });
      this.emit({ type: 'shake', power: Math.min(1, 0.25 + nLines * 0.2 + this.combo * 0.03) });
      if (nLines >= 2 || this.combo >= 2) {
        this.emit({ type: 'praise', level: Math.min(4, nLines - 1 + Math.floor((this.combo - 1) / 2)), combo: this.combo });
      }
    } else if (++this.grace >= CONFIG.score.comboGraceMoves) {
      this.combo = 0;
    }
    this.addScore(gained, cx, cy);

    if (this.slots.every((v) => v === null)) this.refill();
    else this.emit({ type: 'tray', refill: false });
    this.checkEnd();
    return true;
  }

  private addScore(amount: number, x: number, y: number): void {
    if (amount <= 0) return;
    const a = this.x2Left > 0 ? amount * 2 : amount;
    this.score += a;
    this.emit({ type: 'score', amount: a, x, y });
  }

  private collectGems(removed: CellRef[]): number {
    let bonus = 0;
    for (const c of removed) {
      if (!c.gem) continue;
      this.gemsLeft = Math.max(0, this.gemsLeft - 1);
      bonus += CONFIG.score.gemBonus;
      this.emit({ type: 'gem', x: c.x, y: c.y });
    }
    return bonus;
  }

  private anyFits(): boolean {
    return this.slots.some((s) => s && this.board.fitsAnywhere(s.shape));
  }

  private checkEnd(): void {
    if (this.state !== 'playing') return;
    if (this.mode === 'levels' && this.gemsLeft <= 0) {
      this.state = 'won';
      const bonus = Math.round(this.timeLeft) * CONFIG.score.timeBonusPerSec;
      this.score += bonus;
      this.emit({ type: 'state' });
      return;
    }
    if (!this.anyFits()) {
      this.state = 'lost';
      this.loseReason = 'moves';
      this.emit({ type: 'state' });
    }
  }

  get stars(): number {
    if (this.mode !== 'levels' || this.state !== 'won') return 0;
    const f = this.timeLeft / this.timeTotal;
    return f >= 0.45 ? 3 : f >= 0.2 ? 2 : 1;
  }

  update(dt: number): void {
    if (this.state !== 'playing') return;
    this.elapsed += dt;
    if (this.x2Left > 0) this.x2Left = Math.max(0, this.x2Left - dt);
    if (this.mode !== 'levels') return;
    if (this.freezeLeft > 0) {
      this.freezeLeft = Math.max(0, this.freezeLeft - dt);
      return;
    }
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    const sec = Math.ceil(this.timeLeft);
    if (sec !== this.lastTick) {
      this.lastTick = sec;
      if (sec <= 10 && sec > 0) this.emit({ type: 'tick', sec });
    }
    if (this.timeLeft <= 0) {
      this.state = 'lost';
      this.loseReason = 'time';
      this.emit({ type: 'state' });
    }
  }

  // ---------- revive ----------

  revive(): void {
    if (this.mode === 'levels') {
      if (this.loseReason === 'time') this.timeLeft += CONFIG.levels.reviveSeconds;
      else this.timeLeft = Math.max(this.timeLeft, 15);
    } else {
      // Smash the 4×4 center so there is room again.
      const n = this.board.w;
      const c0 = Math.floor(n / 2) - 2;
      const cells: [number, number][] = [];
      for (let y = c0; y < c0 + 4; y++) for (let x = c0; x < c0 + 4; x++) cells.push([x, y]);
      this.crush(cells, 'revive', n / 2, n / 2);
    }
    this.revivesUsed++;
    this.state = 'playing';
    this.loseReason = null;
    if (!this.anyFits()) this.dealFitting();
    this.emit({ type: 'state' });
  }

  /** New pieces that are guaranteed to fit. */
  private dealFitting(): void {
    this.refill();
    if (!this.anyFits()) {
      this.slots = this.slots.map(() => ({ shape: DOT, color: this.pieceColor() }));
      this.emit({ type: 'tray', refill: true });
    }
  }

  // ---------- boosters ----------

  private crush(cells: [number, number][], kind: CrushKind, ox: number, oy: number): CellRef[] {
    const removed = this.board.remove(cells);
    const gained = removed.length * CONFIG.score.perCell + this.collectGems(removed);
    this.emit({ type: 'cleared', cells: removed, lines: { rows: [], cols: [] }, ox, oy, kind });
    this.addScore(gained, ox, oy);
    return removed;
  }

  private area(x: number, y: number, r: number): [number, number][] {
    const out: [number, number][] = [];
    for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) out.push([xx, yy]);
    return out;
  }

  /** Apply a booster. Returns true when it was used (and must be taken from the inventory). */
  useBooster(id: BoosterId, target?: { x?: number; y?: number; slot?: number }): boolean {
    if (this.state !== 'playing' || !boosterDef(id).modes.includes(this.mode)) return false;
    const x = target?.x ?? 0;
    const y = target?.y ?? 0;
    const slot = target?.slot ?? -1;
    const W = this.board.w;
    const H = this.board.h;
    switch (id) {
      case 'hammer':
        if (!this.board.filled(x, y)) return false;
        this.crush([[x, y]], 'hammer', x + 0.5, y + 0.5);
        break;
      case 'bomb':
        this.crush(this.area(x, y, 1), 'bomb', x + 0.5, y + 0.5);
        this.emit({ type: 'shake', power: 0.7 });
        break;
      case 'mega':
        this.crush(this.area(x, y, 2), 'mega', x + 0.5, y + 0.5);
        this.emit({ type: 'shake', power: 1 });
        break;
      case 'rowRocket': {
        const cells: [number, number][] = [];
        for (let i = 0; i < W; i++) cells.push([i, y]);
        this.crush(cells, 'row', x + 0.5, y + 0.5);
        this.emit({ type: 'shake', power: 0.5 });
        break;
      }
      case 'colRocket': {
        const cells: [number, number][] = [];
        for (let i = 0; i < H; i++) cells.push([x, i]);
        this.crush(cells, 'col', x + 0.5, y + 0.5);
        this.emit({ type: 'shake', power: 0.5 });
        break;
      }
      case 'cross': {
        const cells: [number, number][] = [];
        for (let i = 0; i < W; i++) cells.push([i, y]);
        for (let i = 0; i < H; i++) cells.push([x, i]);
        this.crush(cells, 'cross', x + 0.5, y + 0.5);
        this.emit({ type: 'shake', power: 0.8 });
        break;
      }
      case 'refresh':
        this.refill();
        break;
      case 'rotate': {
        const s = this.slots[slot];
        if (!s) return false;
        const r = rotateShape(s.shape);
        if (r.id === s.shape.id) return false;
        s.shape = r;
        this.emit({ type: 'tray', refill: false });
        break;
      }
      case 'cube': {
        const s = this.slots[slot];
        if (!s || s.shape.cells.length === 1) return false;
        s.shape = DOT;
        this.emit({ type: 'tray', refill: false });
        break;
      }
      case 'magic': {
        const s = this.slots[slot];
        if (!s) return false;
        const best = rankShapes(this.board, this.mode)[0];
        if (!best) return false;
        s.shape = best.shape;
        this.emit({ type: 'tray', refill: false });
        break;
      }
      case 'hint': {
        let best: { slot: number; x: number; y: number; score: number } | null = null;
        this.slots.forEach((s, i) => {
          if (!s) return;
          const p = bestPlacement(this.board, s.shape, this.withCols);
          if (p && (!best || p.score > best.score)) best = { slot: i, x: p.x, y: p.y, score: p.score };
        });
        if (!best) return false;
        const b = best as { slot: number; x: number; y: number };
        this.emit({ type: 'hint', slot: b.slot, x: b.x, y: b.y });
        break;
      }
      case 'undo': {
        const snap = this.undoSnap;
        if (!snap) return false;
        this.board.copyFrom(snap.board);
        this.slots = snap.slots;
        this.score = snap.score;
        this.combo = snap.combo;
        this.grace = snap.grace;
        this.gemsLeft = snap.gemsLeft;
        this.undoSnap = null;
        this.emit({ type: 'tray', refill: true });
        break;
      }
      case 'time':
        this.timeLeft += 30;
        break;
      case 'freeze':
        this.freezeLeft += 15;
        break;
      case 'x2':
        this.x2Left += 30;
        break;
      case 'slot': {
        const max = this.mode === 'levels' ? CONFIG.levels.traySlots + 1 : CONFIG.classic.traySlots + 1;
        if (this.slotCount >= max) return false;
        this.slotCount++;
        const pool = rankShapes(this.board, this.mode).slice(0, 6);
        const shape = pool.length ? this.rng.pick(pool).shape : this.rng.weighted(SHAPES, (s) => shapeWeight(s, this.mode));
        this.slots.push({ shape, color: this.pieceColor() });
        this.emit({ type: 'tray', refill: false });
        break;
      }
      case 'magnet': {
        // Take the crystal closest to the open top; the block under it stays.
        const i = this.board.gems.indexOf(1);
        if (i < 0) return false;
        const gx = i % W;
        const gy = Math.floor(i / W);
        this.board.setGem(gx, gy, false);
        this.gemsLeft = Math.max(0, this.gemsLeft - 1);
        this.emit({ type: 'gem', x: gx, y: gy });
        this.addScore(CONFIG.score.gemBonus, gx + 0.5, gy + 0.5);
        break;
      }
    }
    // Boosters change the board: an undo across them would be inconsistent.
    if (id !== 'hint' && id !== 'undo') this.undoSnap = null;
    this.emit({ type: 'booster', id, x: target?.x, y: target?.y });
    // A crush may collect the last crystal or leave the tray stuck — same rules as after a move.
    this.checkEnd();
    return true;
  }

  get canUndo(): boolean {
    return !!this.undoSnap;
  }
}
