import { makeDeck, type Suit } from '@shared/cards/card';
import { Rng } from '@shared/core/rng';
import { History, type Hint, type MoveRef, type Pile, type PileGame, type SCard } from './piles';

export interface SpiderSave {
  mode: 'spider';
  seed: number;
  suits: 1 | 2 | 4;
  piles: Pile[];
  score: number;
  moves: number;
  time: number;
}

const SUIT_SETS: Record<1 | 2 | 4, Suit[]> = { 1: [0], 2: [0, 1], 4: [0, 1, 2, 3] };

export class Spider implements PileGame {
  readonly mode = 'spider';
  piles: Pile[] = [];
  score = 500;
  moves = 0;
  time = 0;
  private hist = new History();

  constructor(readonly seed: number, readonly suits: 1 | 2 | 4, save?: SpiderSave) {
    if (save) {
      this.piles = save.piles;
      this.score = save.score;
      this.moves = save.moves;
      this.time = save.time;
      return;
    }
    const deck = new Rng(seed).shuffle(makeDeck(2, SUIT_SETS[suits])).map((c): SCard => ({ ...c, up: false }));
    const mk = (id: string, kind: Pile['kind'], index: number): Pile => ({ id, kind, index, cards: [] });
    this.piles.push(mk('stock', 'stock', 0));
    for (let i = 0; i < 8; i++) this.piles.push(mk(`f${i}`, 'found', i));
    for (let i = 0; i < 10; i++) this.piles.push(mk(`t${i}`, 'tab', i));
    for (let i = 0; i < 54; i++) this.pile(`t${i % 10}`).cards.push(deck.pop()!);
    for (const t of this.tabs) t.cards[t.cards.length - 1].up = true;
    this.pile('stock').cards = deck;
  }

  static restore(s: SpiderSave): Spider {
    return new Spider(s.seed, s.suits, s);
  }

  serialize(): SpiderSave {
    return { mode: 'spider', seed: this.seed, suits: this.suits, piles: this.piles, score: this.score, moves: this.moves, time: this.time };
  }

  pile(id: string): Pile {
    return this.piles.find((p) => p.id === id)!;
  }
  get tabs(): Pile[] {
    return this.piles.filter((p) => p.kind === 'tab');
  }
  get founds(): Pile[] {
    return this.piles.filter((p) => p.kind === 'found');
  }
  get completed(): number {
    return this.founds.filter((f) => f.cards.length).length;
  }

  /** Cards index..end form a face-up same-suit descending run. */
  private isRun(cards: SCard[], index: number): boolean {
    for (let i = index; i < cards.length; i++) {
      if (!cards[i].up) return false;
      if (i > index && (cards[i].suit !== cards[i - 1].suit || cards[i].rank !== cards[i - 1].rank - 1)) return false;
    }
    return true;
  }

  canPick(id: string, index: number): boolean {
    const p = this.pile(id);
    return p.kind === 'tab' && index >= 0 && index < p.cards.length && this.isRun(p.cards, index);
  }

  canMove(m: MoveRef): boolean {
    if (m.from === m.to || !this.canPick(m.from, m.index)) return false;
    const dst = this.pile(m.to);
    if (dst.kind !== 'tab') return false;
    const top = dst.cards[dst.cards.length - 1];
    const c = this.pile(m.from).cards[m.index];
    return !top || (top.up && top.rank === c.rank + 1);
  }

  /** Remove completed K..A runs; returns ids of moved cards. */
  private collect(): void {
    for (const t of this.tabs) {
      const n = t.cards.length;
      if (n < 13) continue;
      const start = n - 13;
      if (t.cards[start].rank === 13 && this.isRun(t.cards, start)) {
        const run = t.cards.splice(start);
        const f = this.founds.find((x) => !x.cards.length)!;
        f.cards.push(...run);
        this.score += 100;
        const top = t.cards[t.cards.length - 1];
        if (top && !top.up) top.up = true;
      }
    }
  }

  move(m: MoveRef): boolean {
    if (!this.canMove(m)) return false;
    this.hist.push(this.piles, this.score, this.moves);
    const src = this.pile(m.from);
    this.pile(m.to).cards.push(...src.cards.splice(m.index));
    const top = src.cards[src.cards.length - 1];
    if (top && !top.up) top.up = true;
    this.score = Math.max(0, this.score - 1);
    this.moves++;
    this.collect();
    return true;
  }

  get canDraw(): boolean {
    return this.pile('stock').cards.length > 0;
  }

  /** Classic rule: every column must have a card before dealing. */
  get dealBlocked(): boolean {
    return this.tabs.some((t) => !t.cards.length);
  }

  draw(): boolean {
    const st = this.pile('stock');
    if (!st.cards.length || this.dealBlocked) return false;
    this.hist.push(this.piles, this.score, this.moves);
    for (const t of this.tabs) {
      const c = st.cards.pop()!;
      c.up = true;
      t.cards.push(c);
    }
    this.score = Math.max(0, this.score - 1);
    this.moves++;
    this.collect();
    return true;
  }

  get canUndo(): boolean {
    return this.hist.size > 0;
  }

  undo(): boolean {
    const s = this.hist.pop();
    if (!s) return false;
    this.piles = s.piles;
    this.score = s.score;
    this.moves = s.moves;
    return true;
  }

  autoTarget(id: string, index: number): string | null {
    if (!this.canPick(id, index)) return null;
    const c = this.pile(id).cards[index];
    let any: string | null = null;
    let empty: string | null = null;
    for (const t of this.tabs) {
      if (!this.canMove({ from: id, index, to: t.id })) continue;
      const top = t.cards[t.cards.length - 1];
      if (!top) {
        if (index > 0) empty ??= t.id;
        continue;
      }
      if (top.suit === c.suit) return t.id;
      any ??= t.id;
    }
    return any ?? empty;
  }

  get won(): boolean {
    return this.completed === 8;
  }

  get canAutoComplete(): boolean {
    return false;
  }
  autoStep(): MoveRef | null {
    return null;
  }

  private scoreMove(m: MoveRef): number {
    const src = this.pile(m.from);
    const dst = this.pile(m.to);
    const c = src.cards[m.index];
    const top = dst.cards[dst.cards.length - 1];
    const below = src.cards[m.index - 1];
    let s = 0;
    if (top && top.suit === c.suit) s += 30; // builds a same-suit run
    if (below && !below.up) s += 25; // reveals a card
    if (m.index === 0) s += 8; // empties a column
    if (below && below.up && below.suit === c.suit && below.rank === c.rank + 1) s -= 60; // breaks a run
    if (!top) s -= 10; // uses an empty column
    if (top && below && below.up && below.rank === c.rank + 1 && top.suit !== c.suit) s -= 20; // pointless shuffle
    return s;
  }

  private bestMove(): { m: MoveRef; s: number } | null {
    let best: { m: MoveRef; s: number } | null = null;
    for (const src of this.tabs) {
      for (let i = 0; i < src.cards.length; i++) {
        if (!this.canPick(src.id, i)) continue;
        for (const d of this.tabs) {
          const m = { from: src.id, index: i, to: d.id };
          if (!this.canMove(m)) continue;
          const s = this.scoreMove(m);
          if (!best || s > best.s) best = { m, s };
        }
      }
    }
    return best;
  }

  hint(): Hint {
    const b = this.bestMove();
    if (b && b.s > -15) return { t: 'move', m: b.m };
    if (this.canDraw && !this.dealBlocked) return { t: 'draw' };
    return b ? { t: 'move', m: b.m } : null;
  }

  get stuck(): boolean {
    if (this.won) return false;
    if (this.canDraw && !this.dealBlocked) return false;
    return this.bestMove() === null;
  }
}
