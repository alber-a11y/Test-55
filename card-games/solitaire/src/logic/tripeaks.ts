import type { Suit } from '@shared/cards/card';
import { computeBlockers, computeNeighbours, type TPSlotPos } from './tpLayouts';

export interface PCard {
  id: number;
  suit: Suit;
  rank: number;
  /** Wild (joker) card — matches anything. */
  wild?: boolean;
}

export interface TPSlotDef extends TPSlotPos {
  card: PCard;
  /** Locked until the key with the same id is played. */
  lock?: number;
  /** Playing this card opens the lock with this id. */
  key?: number;
  /** Ice layers: cracked by plays of neighbouring cards. */
  ice?: number;
  /** Bomb: explodes after this many moves while open. */
  bomb?: number;
  gold?: boolean;
  /** Bonus coins when played. */
  coins?: number;
}

export type TPGoal = 'clear' | 'gold';

export interface TPLevelDef {
  level: number;
  template: string;
  slots: TPSlotDef[];
  /** Stock in draw order (stock[0] is drawn first). */
  stock: PCard[];
  start: PCard;
  goal: TPGoal;
  /** Stock cards left at win needed for 2 / 3 stars. */
  star2: number;
  star3: number;
  boss?: boolean;
  /** Cards appended by "+5 cards" (deterministic). */
  extra: PCard[];
}

interface Snapshot {
  removed: boolean[];
  ice: number[];
  bomb: number[];
  opened: number[];
  stockPos: number;
  stockLen: number;
  waste: PCard[];
  jokers: number;
  combo: number;
  bestCombo: number;
  score: number;
  moves: number;
  gold: number;
  coins: number;
  comboMeter: number;
}

export type TPMove = { t: 'play'; slot: number } | { t: 'draw' } | { t: 'joker' };

export interface TPEvent {
  /** Slots whose face state changed (newly opened). */
  opened: number[];
  /** Slots whose ice cracked. */
  cracked: number[];
  unlocked: number[];
  jokerEarned: boolean;
  exploded: number | null;
  coins: number;
  gold: boolean;
}

export const COMBO_FOR_JOKER = 7;

export function ranksAdjacent(a: number, b: number): boolean {
  const d = Math.abs(a - b);
  return d === 1 || d === 12;
}

export class TriPeaks {
  readonly blockers: number[][];
  readonly neighbours: number[][];
  removed: boolean[];
  ice: number[];
  bomb: number[];
  /** Opened lock ids. */
  opened: number[] = [];
  stockPos = 0;
  /** Number of stock cards available (grows with "+5"). */
  stockLen: number;
  stockCards: PCard[];
  waste: PCard[];
  jokers = 0;
  combo = 0;
  bestCombo = 0;
  comboMeter = 0;
  score = 0;
  moves = 0;
  gold = 0;
  coins = 0;
  exploded = false;
  /** Combo meter awards jokers (off in the generator's solver: stricter and faster search). */
  comboJokers = true;
  private history: Snapshot[] = [];
  readonly goldTotal: number;

  constructor(readonly def: TPLevelDef) {
    this.blockers = computeBlockers(def.slots);
    this.neighbours = computeNeighbours(def.slots);
    this.removed = def.slots.map(() => false);
    this.ice = def.slots.map((s) => s.ice ?? 0);
    this.bomb = def.slots.map((s) => s.bomb ?? 0);
    this.stockCards = [...def.stock, ...def.extra];
    this.stockLen = def.stock.length;
    this.waste = [def.start];
    this.goldTotal = def.slots.filter((s) => s.gold).length;
  }

  get n(): number {
    return this.def.slots.length;
  }

  get top(): PCard {
    return this.waste[this.waste.length - 1];
  }

  get stockLeft(): number {
    return this.stockLen - this.stockPos;
  }

  isOpen(i: number): boolean {
    if (this.removed[i]) return false;
    for (const b of this.blockers[i]) if (!this.removed[b]) return false;
    return true;
  }

  isLocked(i: number): boolean {
    const l = this.def.slots[i].lock;
    return l !== undefined && !this.opened.includes(l);
  }

  canPlay(i: number): boolean {
    if (!this.isOpen(i) || this.ice[i] > 0 || this.isLocked(i)) return false;
    const c = this.def.slots[i].card;
    const t = this.top;
    return !!c.wild || !!t.wild || ranksAdjacent(c.rank, t.rank);
  }

  playable(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.n; i++) if (this.canPlay(i)) out.push(i);
    return out;
  }

  get won(): boolean {
    if (this.exploded) return false;
    if (this.def.goal === 'gold') return this.gold >= this.goldTotal;
    return this.removed.every((r) => r);
  }

  /** No moves left (stock empty, no jokers, nothing playable) or a bomb went off. */
  get lost(): boolean {
    if (this.exploded) return true;
    if (this.won) return false;
    return this.stockLeft <= 0 && this.jokers <= 0 && this.playable().length === 0;
  }

  get stars(): number {
    if (!this.won) return 0;
    const left = this.stockLeft;
    return left >= this.def.star3 ? 3 : left >= this.def.star2 ? 2 : 1;
  }

  private snap(): Snapshot {
    return {
      removed: this.removed.slice(),
      ice: this.ice.slice(),
      bomb: this.bomb.slice(),
      opened: this.opened.slice(),
      stockPos: this.stockPos,
      stockLen: this.stockLen,
      waste: this.waste.slice(),
      jokers: this.jokers,
      combo: this.combo,
      bestCombo: this.bestCombo,
      score: this.score,
      moves: this.moves,
      gold: this.gold,
      coins: this.coins,
      comboMeter: this.comboMeter,
    };
  }

  private restore(s: Snapshot): void {
    Object.assign(this, {
      removed: s.removed,
      ice: s.ice,
      bomb: s.bomb,
      opened: s.opened,
      stockPos: s.stockPos,
      stockLen: s.stockLen,
      waste: s.waste,
      jokers: s.jokers,
      combo: s.combo,
      bestCombo: s.bestCombo,
      score: s.score,
      moves: s.moves,
      gold: s.gold,
      coins: s.coins,
      comboMeter: s.comboMeter,
    });
    this.exploded = false;
  }

  get canUndo(): boolean {
    return this.history.length > 0;
  }

  undo(): boolean {
    const s = this.history.pop();
    if (!s) return false;
    this.restore(s);
    return true;
  }

  private openSet(): boolean[] {
    return this.def.slots.map((_, i) => this.isOpen(i));
  }

  /** Bomb timers tick after every move; returns slot of an exploded bomb. */
  private tickBombs(): number | null {
    for (let i = 0; i < this.n; i++) {
      if (this.bomb[i] > 0 && !this.removed[i] && this.isOpen(i)) {
        this.bomb[i]--;
        if (this.bomb[i] <= 0) {
          this.exploded = true;
          return i;
        }
      }
    }
    return null;
  }

  apply(m: TPMove): TPEvent | null {
    const ev: TPEvent = { opened: [], cracked: [], unlocked: [], jokerEarned: false, exploded: null, coins: 0, gold: false };
    if (this.exploded) return null;
    const before = this.openSet();
    if (m.t === 'play') {
      if (!this.canPlay(m.slot)) return null;
      this.history.push(this.snap());
      const s = this.def.slots[m.slot];
      this.removed[m.slot] = true;
      this.waste.push(s.card);
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.score += 10 + 5 * Math.min(this.combo - 1, 20);
      if (this.comboJokers) this.comboMeter++;
      if (this.comboMeter >= COMBO_FOR_JOKER) {
        this.comboMeter = 0;
        this.jokers++;
        ev.jokerEarned = true;
      }
      if (s.key !== undefined && !this.opened.includes(s.key)) {
        this.opened.push(s.key);
        for (let i = 0; i < this.n; i++) if (this.def.slots[i].lock === s.key && !this.removed[i]) ev.unlocked.push(i);
      }
      if (s.gold) {
        this.gold++;
        ev.gold = true;
        this.score += 50;
      }
      if (s.coins) {
        this.coins += s.coins;
        ev.coins = s.coins;
      }
      this.bomb[m.slot] = 0;
      for (const j of this.neighbours[m.slot]) {
        if (this.ice[j] > 0 && !this.removed[j]) {
          this.ice[j]--;
          ev.cracked.push(j);
        }
      }
    } else if (m.t === 'draw') {
      if (this.stockLeft <= 0) return null;
      this.history.push(this.snap());
      this.waste.push(this.stockCards[this.stockPos++]);
      this.combo = 0;
    } else {
      if (this.jokers <= 0) return null;
      this.history.push(this.snap());
      this.jokers--;
      this.waste.push({ id: -1000 - this.moves, suit: 0, rank: 0, wild: true });
    }
    this.moves++;
    ev.exploded = this.tickBombs();
    const after = this.openSet();
    for (let i = 0; i < this.n; i++) if (after[i] && !before[i]) ev.opened.push(i);
    if (this.won) {
      // Leftover stock is converted into bonus points.
      this.score += this.stockLeft * 25 + 250;
    }
    return ev;
  }

  /** "+N cards" booster / continue: extend the stock with deterministic extra cards. */
  addStock(n: number): number {
    const add = Math.min(n, this.stockCards.length - this.stockLen);
    this.stockLen += add;
    this.exploded = false;
    return add;
  }

  /** Defuse all bombs (continue after an explosion): resets timers by `by` moves. */
  defuse(by = 8): void {
    for (let i = 0; i < this.n; i++) if (this.bomb[i] > 0 || (this.def.slots[i].bomb && !this.removed[i])) this.bomb[i] = Math.max(this.bomb[i], by);
    this.exploded = false;
  }

  /** Booster: remove all ice, open all locks. */
  breakObstacles(): number[] {
    const changed: number[] = [];
    for (let i = 0; i < this.n; i++) {
      if (this.removed[i]) continue;
      if (this.ice[i] > 0 || this.isLocked(i)) changed.push(i);
      this.ice[i] = 0;
    }
    for (const s of this.def.slots) if (s.lock !== undefined && !this.opened.includes(s.lock)) this.opened.push(s.lock);
    return changed;
  }

  /** Cheap lookahead hint: the playable slot starting the longest run, else draw / joker. */
  hint(): TPMove | null {
    const plays = this.playable();
    if (plays.length) {
      let best = plays[0];
      let bestScore = -1;
      for (const p of plays) {
        const sim = this.cloneState();
        sim.apply({ t: 'play', slot: p });
        const run = sim.longestRun(6);
        // Prefer uncovering cards and collecting goals.
        const s = run * 10 + (this.def.slots[p].key !== undefined ? 5 : 0) + (this.def.slots[p].gold ? 4 : 0) + (this.def.slots[p].bomb ? 8 : 0) - this.def.slots[p].z;
        if (s > bestScore) {
          bestScore = s;
          best = p;
        }
      }
      return { t: 'play', slot: best };
    }
    if (this.stockLeft > 0) return { t: 'draw' };
    if (this.jokers > 0) return { t: 'joker' };
    return null;
  }

  private longestRun(depth: number): number {
    if (depth <= 0) return 0;
    let best = 0;
    for (const p of this.playable()) {
      const sim = this.cloneState();
      sim.apply({ t: 'play', slot: p });
      best = Math.max(best, 1 + sim.longestRun(depth - 1));
      if (best >= depth) break;
    }
    return best;
  }

  /** Copy of the live state without undo history (for search). */
  cloneState(): TriPeaks {
    const c = Object.create(TriPeaks.prototype) as TriPeaks;
    Object.assign(c, this);
    c.restore(this.snap());
    c.exploded = this.exploded;
    (c as any).history = [];
    return c;
  }

  /** Compact key of the search-relevant state. */
  key(): string {
    let k = '';
    for (let i = 0; i < this.n; i++) k += this.removed[i] ? '1' : this.ice[i] ? String(this.ice[i]) : '0';
    const t = this.top;
    return `${k}|${this.stockPos}|${t.wild ? 'w' : t.rank}|${this.jokers}|${this.comboMeter}|${this.opened.join(',')}|${this.bomb.join(',')}`;
  }
}

/**
 * Depth-first solver with memoisation. Returns the number of stock cards drawn in the
 * solution found (tableau plays are tried before drawing, so draws are kept low), or -1.
 */
export function solveTriPeaks(game: TriPeaks, nodeLimit = 80_000, comboJokers = true): { draws: number; nodes: number } {
  const seen = new Set<string>();
  let nodes = 0;
  let found = -1;
  const dfs = (g: TriPeaks): boolean => {
    if (g.won) {
      found = g.stockPos;
      return true;
    }
    if (g.exploded || ++nodes > nodeLimit) return false;
    const k = g.key();
    if (seen.has(k)) return false;
    seen.add(k);
    const plays = g.playable();
    // Order: bombs first (urgent), keys, then lower z (frees more), wilds last.
    plays.sort((a, b) => order(g, a) - order(g, b));
    for (const p of plays) {
      const s = g.cloneState();
      s.apply({ t: 'play', slot: p });
      if (dfs(s)) return true;
    }
    if (g.stockLeft > 0) {
      const s = g.cloneState();
      s.apply({ t: 'draw' });
      if (dfs(s)) return true;
    }
    if (g.jokers > 0) {
      const s = g.cloneState();
      s.apply({ t: 'joker' });
      if (dfs(s)) return true;
    }
    return false;
  };
  const root = game.cloneState();
  root.comboJokers = comboJokers;
  dfs(root);
  return { draws: found, nodes };
}

function order(g: TriPeaks, i: number): number {
  const s = g.def.slots[i];
  let o = 0;
  if (s.bomb) o -= 100;
  if (s.key !== undefined) o -= 50;
  if (s.card.wild) o += 100;
  o -= s.z * 3;
  return o;
}
