import { adjacent, type Card } from './cards';
import type { Layout } from './layouts';

/** Special tile on a slot. */
export type Special =
  | { kind: 'gold' }
  /** Can't be taken until the key slot is cleared. */
  | { kind: 'lock'; key: number }
  | { kind: 'key'; lock: number }
  /** Needs `hp` plays from the tableau while it is face up before it can be taken. */
  | { kind: 'ice'; hp: number };

export type Tier = 'easy' | 'normal' | 'hard' | 'superhard';

/** Everything needed to play a level; produced by the generator, pure data. */
export interface LevelData {
  n: number;
  seed: number;
  layoutId: string;
  layout: Layout;
  /** Card per slot. */
  tableau: Card[];
  /** Stock; the last element is drawn first. */
  stock: Card[];
  /** First card on the waste pile. */
  start: Card;
  specials: Record<number, Special>;
  tier: Tier;
  /** Estimated win rate of a human-like bot without boosters (0..1). */
  winRate: number;
}

export interface WasteCard extends Card {
  wild?: boolean;
}

interface State {
  removed: boolean[];
  stock: Card[];
  waste: WasteCard[];
  ice: Record<number, number>;
  combo: number;
  maxCombo: number;
  gold: number;
  coins: number;
  plays: number;
}

export type GameEvent =
  | {
      type: 'play';
      slot: number;
      card: Card;
      combo: number;
      coins: number;
      revealed: number[];
      unlocked: number[];
      iceCracked: number[];
      gold: boolean;
      peak: boolean;
    }
  | { type: 'draw'; card: Card }
  | { type: 'undo' }
  | { type: 'wild' }
  | { type: 'addCard'; card: Card }
  | { type: 'remove'; slot: number; revealed: number[]; unlocked: number[] };

export const STREAK_BONUS_AT = [6, 12];

/**
 * TriPeaks rules engine. No rendering, no randomness except what is passed in,
 * so the same class drives the UI, the solver checks and the difficulty bot.
 */
export class Game {
  readonly level: LevelData;
  private st: State;
  private history: string[] = [];
  /** K and A connect. */
  readonly wrap = true;

  constructor(level: LevelData) {
    this.level = level;
    const ice: Record<number, number> = {};
    for (const [k, sp] of Object.entries(level.specials)) if (sp.kind === 'ice') ice[+k] = sp.hp;
    this.st = {
      removed: level.tableau.map(() => false),
      stock: level.stock.slice(),
      waste: [{ ...level.start }],
      ice,
      combo: 0,
      maxCombo: 0,
      gold: 0,
      coins: 0,
      plays: 0,
    };
  }

  /* ---------- queries ---------- */

  get layout(): Layout {
    return this.level.layout;
  }
  get top(): WasteCard {
    return this.st.waste[this.st.waste.length - 1];
  }
  get stockCount(): number {
    return this.st.stock.length;
  }
  get combo(): number {
    return this.st.combo;
  }
  get maxCombo(): number {
    return this.st.maxCombo;
  }
  get goldCollected(): number {
    return this.st.gold;
  }
  get goldTotal(): number {
    return Object.values(this.level.specials).filter((s) => s.kind === 'gold').length;
  }
  get coinsEarned(): number {
    return this.st.coins;
  }
  get canUndo(): boolean {
    return this.history.length > 0;
  }
  get remaining(): number {
    return this.st.removed.filter((r) => !r).length;
  }
  get won(): boolean {
    return this.remaining === 0;
  }
  /** Out of cards and no moves left (boosters may still save the game). */
  get stuck(): boolean {
    return !this.won && this.stockCount === 0 && this.playable().length === 0;
  }
  isRemoved(slot: number): boolean {
    return this.st.removed[slot];
  }
  /** Card face up: nothing covering it. */
  isOpen(slot: number): boolean {
    if (this.st.removed[slot]) return false;
    return this.layout.coveredBy[slot].every((j) => this.st.removed[j]);
  }
  iceHp(slot: number): number {
    return this.st.ice[slot] ?? 0;
  }
  isLocked(slot: number): boolean {
    const sp = this.level.specials[slot];
    return sp?.kind === 'lock' && !this.st.removed[sp.key];
  }
  /** Open and free of ice / locks: may be taken by a matching card or a hammer. */
  isFree(slot: number): boolean {
    return this.isOpen(slot) && this.iceHp(slot) <= 0 && !this.isLocked(slot);
  }
  canPlay(slot: number): boolean {
    if (!this.isFree(slot)) return false;
    const top = this.top;
    return !!top.wild || adjacent(top.r, this.level.tableau[slot].r, this.wrap);
  }
  playable(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.level.tableau.length; i++) if (this.canPlay(i)) out.push(i);
    return out;
  }
  /** Next stock cards from the top (for the "peek" booster). */
  peekStock(n: number): Card[] {
    return this.st.stock.slice(-n).reverse();
  }

  /* ---------- actions ---------- */

  private snapshot(): void {
    this.history.push(JSON.stringify(this.st));
    if (this.history.length > 200) this.history.shift();
  }

  private openSet(): Set<number> {
    const s = new Set<number>();
    for (let i = 0; i < this.level.tableau.length; i++) if (this.isFree(i)) s.add(i);
    return s;
  }

  private takeSlot(slot: number): { revealed: number[]; unlocked: number[]; peak: boolean } {
    const before = new Set<number>();
    for (let i = 0; i < this.level.tableau.length; i++) if (this.isOpen(i)) before.add(i);
    const lockedBefore = new Set(Object.keys(this.level.specials).map(Number).filter((i) => this.isLocked(i)));
    this.st.removed[slot] = true;
    const revealed: number[] = [];
    for (let i = 0; i < this.level.tableau.length; i++) if (this.isOpen(i) && !before.has(i)) revealed.push(i);
    const unlocked = [...lockedBefore].filter((i) => !this.isLocked(i));
    return { revealed, unlocked, peak: this.layout.peakTops.includes(slot) };
  }

  play(slot: number): GameEvent | null {
    if (!this.canPlay(slot)) return null;
    this.snapshot();
    const card = this.level.tableau[slot];
    // Ice on other open cards cracks with every play.
    const iceCracked: number[] = [];
    const { revealed, unlocked, peak } = this.takeSlot(slot);
    for (const k of Object.keys(this.st.ice).map(Number)) {
      if (k !== slot && this.st.ice[k] > 0 && this.isOpen(k) && !revealed.includes(k)) {
        this.st.ice[k] -= 1;
        iceCracked.push(k);
      }
    }
    this.st.waste.push({ ...card });
    this.st.combo += 1;
    this.st.plays += 1;
    this.st.maxCombo = Math.max(this.st.maxCombo, this.st.combo);
    let coins = Math.min(this.st.combo, 10);
    const gold = this.level.specials[slot]?.kind === 'gold';
    if (gold) {
      this.st.gold += 1;
      coins += 10;
    }
    if (peak) coins += 15;
    this.st.coins += coins;
    return { type: 'play', slot, card, combo: this.st.combo, coins, revealed, unlocked, iceCracked, gold, peak };
  }

  draw(): GameEvent | null {
    if (!this.st.stock.length) return null;
    this.snapshot();
    const card = this.st.stock.pop()!;
    this.st.waste.push({ ...card });
    this.st.combo = 0;
    return { type: 'draw', card };
  }

  undo(): GameEvent | null {
    const prev = this.history.pop();
    if (!prev) return null;
    this.st = JSON.parse(prev);
    return { type: 'undo' };
  }

  /* ---------- boosters (not undoable: they clear the undo history) ---------- */

  /** Joker on the waste pile: any card fits on it. */
  wild(): GameEvent {
    this.history = [];
    this.st.waste.push({ r: 0, s: 0, wild: true });
    return { type: 'wild' };
  }

  /** Put a card on top of the stock that matches one of the free cards when possible. */
  addCard(card: Card): GameEvent {
    this.history = [];
    this.st.stock.push({ ...card });
    return { type: 'addCard', card };
  }

  /** Suggest the card "+1 Card" should add: neighbour of a free tableau card. */
  helpfulCard(rand: () => number): Card {
    const free = [...this.openSet()].map((i) => this.level.tableau[i]);
    if (free.length) {
      const c = free[Math.floor(rand() * free.length)];
      const r = c.r === 13 ? 12 : c.r + 1;
      return { r, s: ((c.s + 1) % 4) as Card['s'] };
    }
    return { r: 1 + Math.floor(rand() * 13), s: Math.floor(rand() * 4) as Card['s'] };
  }

  /** Hammer: take any open card (locks and ice included) without changing the waste or combo. */
  remove(slot: number): GameEvent | null {
    if (!this.isOpen(slot)) return null;
    this.history = [];
    delete this.st.ice[slot];
    const { revealed, unlocked } = this.takeSlot(slot);
    if (this.level.specials[slot]?.kind === 'gold') this.st.gold += 1;
    return { type: 'remove', slot, revealed, unlocked };
  }

  /** Add several random cards to the stock (the "+5 cards" rescue). */
  addStock(cards: Card[]): void {
    this.history = [];
    for (const c of cards) this.st.stock.unshift({ ...c });
  }

  /** Lucky hand (pre-level booster): clear `n` free cards at the start. */
  clearRandomFree(n: number, rand: () => number): number[] {
    const out: number[] = [];
    for (let k = 0; k < n; k++) {
      const free = [...this.openSet()];
      if (!free.length) break;
      const s = free[Math.floor(rand() * free.length)];
      this.remove(s);
      out.push(s);
    }
    return out;
  }

  /* ---------- serialization (resume after reload) ---------- */

  serialize(): string {
    return JSON.stringify(this.st);
  }
  restore(raw: string): void {
    try {
      this.st = JSON.parse(raw);
      this.history = [];
    } catch {
      /* corrupted — keep fresh state */
    }
  }
}
