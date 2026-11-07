import type { Rng } from '../core/rng.ts';
import { overlaps, type Level, type Tile } from './types.ts';

export interface TakeResult {
  /** Tray index the tile was inserted at. */
  index: number;
  /** Ids of the three tiles that formed a triple (null — no match). */
  matched: number[] | null;
  /** Tiles that became free (uncovered) because of this pick. */
  freed: number[];
  /** Tiles whose ice counter changed / that got unlocked by this pick. */
  iceChanged: number[];
  unlocked: number[];
}

export interface MagnetResult {
  type: number;
  fromTray: number[];
  fromBoard: number[];
  freed: number[];
  iceChanged: number[];
  unlocked: number[];
}

/** Pure game state — no rendering. Views read it after each action and animate the difference. */
export class BoardState {
  readonly tiles: Tile[];
  readonly coverers: number[][];
  readonly covering: number[][];
  /** Taken from the board (sitting in the tray or already matched). */
  readonly removed: boolean[];
  readonly ice: number[];
  readonly locked: boolean[];
  tray: number[] = [];
  cap: number;
  triples = 0;
  /** Pick order of tiles still sitting in the tray (for Undo / Continue). */
  history: number[] = [];

  constructor(level: Level) {
    this.tiles = level.tiles.map((t) => ({ ...t }));
    const N = this.tiles.length;
    this.coverers = this.tiles.map(() => []);
    this.covering = this.tiles.map(() => []);
    for (const a of this.tiles)
      for (const b of this.tiles)
        if (a !== b && b.z > a.z && overlaps(a, b)) {
          this.coverers[a.id].push(b.id);
          this.covering[b.id].push(a.id);
        }
    this.removed = new Array<boolean>(N).fill(false);
    this.ice = this.tiles.map((t) => t.ice);
    this.locked = this.tiles.map((t) => t.lock >= 0);
    this.cap = level.trayCap;
  }

  isFree(id: number): boolean {
    for (const c of this.coverers[id]) if (!this.removed[c]) return false;
    return true;
  }
  canTake(id: number): boolean {
    return !this.removed[id] && this.isFree(id) && this.ice[id] <= 0 && !this.locked[id];
  }
  boardLeft(): number {
    let n = 0;
    for (const r of this.removed) if (!r) n++;
    return n;
  }
  get won(): boolean {
    return this.boardLeft() === 0 && this.tray.length === 0;
  }
  get lost(): boolean {
    return this.tray.length >= this.cap;
  }
  /** Tiles still on the board that sit on top of their stack (stack index → tile ids, top first). */
  stackOrder(stack: number): number[] {
    return this.tiles
      .filter((t) => t.stack === stack && !this.removed[t.id])
      .sort((a, b) => b.z - a.z)
      .map((t) => t.id);
  }

  private freedBy(id: number): number[] {
    return this.covering[id].filter((u) => !this.removed[u] && this.isFree(u));
  }

  private onTriple(type: number, iceChanged: number[], unlocked: number[]): void {
    this.triples++;
    for (let i = 0; i < this.ice.length; i++) {
      if (this.ice[i] > 0 && !this.removed[i]) {
        this.ice[i]--;
        iceChanged.push(i);
      }
      if (this.locked[i] && this.tiles[i].lock === type) {
        this.locked[i] = false;
        unlocked.push(i);
      }
    }
  }

  take(id: number): TakeResult | null {
    if (!this.canTake(id) || this.lost) return null;
    const type = this.tiles[id].type;
    this.removed[id] = true;
    let index = this.tray.length;
    for (let i = this.tray.length - 1; i >= 0; i--) {
      if (this.tiles[this.tray[i]].type === type) {
        index = i + 1;
        break;
      }
    }
    this.tray.splice(index, 0, id);
    this.history.push(id);
    const res: TakeResult = { index, matched: null, freed: this.freedBy(id), iceChanged: [], unlocked: [] };
    const same = this.tray.filter((t) => this.tiles[t].type === type);
    if (same.length >= 3) {
      const m = same.slice(0, 3);
      this.tray = this.tray.filter((t) => !m.includes(t));
      this.history = this.history.filter((t) => !m.includes(t));
      res.matched = m;
      this.onTriple(type, res.iceChanged, res.unlocked);
    }
    return res;
  }

  /** Put the last picked tile (still in the tray) back on the board. */
  undo(): number | null {
    const id = this.history.pop();
    if (id === undefined) return null;
    this.tray = this.tray.filter((t) => t !== id);
    this.removed[id] = false;
    return id;
  }

  /** Continue after losing: up to `count` most recent tray tiles go back to the board. */
  giveBack(count: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      const id = this.undo();
      if (id === null) break;
      out.push(id);
    }
    return out;
  }

  /** Swap pictures among the tiles still on the board. Returns ids whose type changed. */
  shuffle(rng: Rng): number[] {
    const ids = this.tiles.filter((t) => !this.removed[t.id]).map((t) => t.id);
    const types = rng.shuffle(ids.map((id) => this.tiles[id].type));
    const changed: number[] = [];
    ids.forEach((id, i) => {
      if (this.tiles[id].type !== types[i]) changed.push(id);
      this.tiles[id].type = types[i];
    });
    return changed.length ? changed : ids;
  }

  /** Collect one full triple instantly, finishing the biggest group already in the tray. */
  magnet(): MagnetResult | null {
    const counts = new Map<number, number>();
    for (const id of this.tray) counts.set(this.tiles[id].type, (counts.get(this.tiles[id].type) ?? 0) + 1);
    const onBoard = this.tiles.filter((t) => !this.removed[t.id]);
    let type = -1;
    let best = -1;
    for (const [t, c] of counts) if (c > best) [type, best] = [t, c];
    if (type < 0) {
      const free = onBoard.filter((t) => this.canTake(t.id));
      const pool = free.length ? free : onBoard;
      if (!pool.length) return null;
      type = pool[0].type;
    }
    const fromTray = this.tray.filter((id) => this.tiles[id].type === type).slice(0, 3);
    const need = 3 - fromTray.length;
    const cands = onBoard
      .filter((t) => t.type === type)
      .sort((a, b) => Number(this.canTake(b.id)) - Number(this.canTake(a.id)) || b.z - a.z);
    if (cands.length < need) return null;
    const fromBoard = cands.slice(0, need).map((t) => t.id);
    for (const id of fromBoard) this.removed[id] = true;
    this.tray = this.tray.filter((id) => !fromTray.includes(id));
    this.history = this.history.filter((id) => !fromTray.includes(id));
    const freed = new Set<number>();
    for (const id of fromBoard) for (const f of this.freedBy(id)) freed.add(f);
    const res: MagnetResult = { type, fromTray, fromBoard, freed: [...freed], iceChanged: [], unlocked: [] };
    this.onTriple(type, res.iceChanged, res.unlocked);
    return res;
  }

  /** Free board tiles the player could pick right now. */
  takeable(): number[] {
    return this.tiles.filter((t) => this.canTake(t.id)).map((t) => t.id);
  }
}
