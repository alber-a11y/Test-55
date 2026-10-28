import type { Suit } from '@shared/cards/card';
import { History, isRedSuit, type Hint, type MoveRef, type Pile, type PileGame, type SCard } from './piles';

export interface FreeCellSave {
  mode: 'freecell';
  seed: number;
  piles: Pile[];
  score: number;
  moves: number;
  time: number;
}

/** Microsoft FreeCell deal #seed (1..32000 are the classic numbered games). */
export function msDeal(seed: number): SCard[][] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 214013 + 2531011) & 0x7fffffff;
    return s >> 16;
  };
  const deck = Array.from({ length: 52 }, (_, i) => i);
  const cols: SCard[][] = Array.from({ length: 8 }, () => []);
  const suitMap: Suit[] = [3, 2, 1, 0]; // MS order: clubs, diamonds, hearts, spades
  let left = 52;
  for (let i = 0; i < 52; i++) {
    const j = rand() % left;
    const c = deck[j];
    deck[j] = deck[--left];
    cols[i % 8].push({ id: c, suit: suitMap[c % 4], rank: Math.floor(c / 4) + 1, up: true });
  }
  return cols;
}

export class FreeCell implements PileGame {
  readonly mode = 'freecell';
  piles: Pile[] = [];
  score = 0;
  moves = 0;
  time = 0;
  private hist = new History();

  constructor(readonly seed: number, save?: FreeCellSave) {
    if (save) {
      this.piles = save.piles;
      this.score = save.score;
      this.moves = save.moves;
      this.time = save.time;
      return;
    }
    const mk = (id: string, kind: Pile['kind'], index: number, cards: SCard[] = []): Pile => ({ id, kind, index, cards });
    for (let i = 0; i < 4; i++) this.piles.push(mk(`c${i}`, 'cell', i));
    for (let i = 0; i < 4; i++) this.piles.push(mk(`f${i}`, 'found', i));
    msDeal(seed).forEach((col, i) => this.piles.push(mk(`t${i}`, 'tab', i, col)));
  }

  static restore(s: FreeCellSave): FreeCell {
    return new FreeCell(s.seed, s);
  }

  serialize(): FreeCellSave {
    return { mode: 'freecell', seed: this.seed, piles: this.piles, score: this.score, moves: this.moves, time: this.time };
  }

  pile(id: string): Pile {
    return this.piles.find((p) => p.id === id)!;
  }
  get tabs(): Pile[] {
    return this.piles.filter((p) => p.kind === 'tab');
  }
  get cells(): Pile[] {
    return this.piles.filter((p) => p.kind === 'cell');
  }
  get founds(): Pile[] {
    return this.piles.filter((p) => p.kind === 'found');
  }

  private isRun(cards: SCard[], index: number): boolean {
    for (let i = index + 1; i < cards.length; i++) {
      if (isRedSuit(cards[i].suit) === isRedSuit(cards[i - 1].suit) || cards[i].rank !== cards[i - 1].rank - 1) return false;
    }
    return true;
  }

  /** Max cards movable at once to `to` (supermove through free cells and empty columns). */
  capacity(to: string): number {
    const freeCells = this.cells.filter((c) => !c.cards.length).length;
    let empty = this.tabs.filter((t) => !t.cards.length).length;
    if (!this.pile(to).cards.length && this.pile(to).kind === 'tab') empty--;
    return (freeCells + 1) * Math.pow(2, Math.max(0, empty));
  }

  canPick(id: string, index: number): boolean {
    const p = this.pile(id);
    if (index < 0 || index >= p.cards.length) return false;
    if (p.kind === 'cell' || p.kind === 'found') return index === p.cards.length - 1;
    return this.isRun(p.cards, index);
  }

  canMove(m: MoveRef): boolean {
    if (m.from === m.to || !this.canPick(m.from, m.index)) return false;
    const src = this.pile(m.from);
    const dst = this.pile(m.to);
    const c = src.cards[m.index];
    const count = src.cards.length - m.index;
    const top = dst.cards[dst.cards.length - 1];
    if (dst.kind === 'cell') return count === 1 && !top;
    if (dst.kind === 'found') return count === 1 && (top ? top.suit === c.suit && top.rank === c.rank - 1 : c.rank === 1);
    if (dst.kind === 'tab') {
      if (count > this.capacity(m.to)) return false;
      return !top || (isRedSuit(top.suit) !== isRedSuit(c.suit) && top.rank === c.rank + 1);
    }
    return false;
  }

  move(m: MoveRef): boolean {
    if (!this.canMove(m)) return false;
    this.hist.push(this.piles, this.score, this.moves);
    const dst = this.pile(m.to);
    dst.cards.push(...this.pile(m.from).cards.splice(m.index));
    if (dst.kind === 'found') this.score += 10;
    this.moves++;
    return true;
  }

  get canDraw(): boolean {
    return false;
  }
  draw(): boolean {
    return false;
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
    const src = this.pile(id);
    const single = index === src.cards.length - 1;
    if (single) for (const f of this.founds) if (this.canMove({ from: id, index, to: f.id })) return f.id;
    let empty: string | null = null;
    for (const t of this.tabs) {
      if (!this.canMove({ from: id, index, to: t.id })) continue;
      if (t.cards.length) return t.id;
      if (!(src.kind === 'tab' && index === 0)) empty ??= t.id;
    }
    if (empty) return empty;
    if (single && src.kind === 'tab') for (const c of this.cells) if (this.canMove({ from: id, index, to: c.id })) return c.id;
    return null;
  }

  get won(): boolean {
    return this.founds.every((f) => f.cards.length === 13);
  }

  private foundRank(s: Suit): number {
    for (const f of this.founds) if (f.cards.length && f.cards[0].suit === s) return f.cards.length;
    return 0;
  }

  safeStep(): MoveRef | null {
    return this.autoSafe();
  }

  /** Any foundation move (auto-complete). */
  autoStep(): MoveRef | null {
    for (const p of [...this.cells, ...this.tabs]) {
      if (!p.cards.length) continue;
      const i = p.cards.length - 1;
      for (const f of this.founds) if (this.canMove({ from: p.id, index: i, to: f.id })) return { from: p.id, index: i, to: f.id };
    }
    return null;
  }

  /** Next safe foundation move (no card could ever need it back), for auto-play. */
  private autoSafe(): MoveRef | null {
    for (const p of [...this.cells, ...this.tabs]) {
      if (!p.cards.length) continue;
      const i = p.cards.length - 1;
      const c = p.cards[i];
      const opp: Suit[] = isRedSuit(c.suit) ? [0, 3] : [1, 2];
      const safe = c.rank <= 2 || (this.foundRank(opp[0]) >= c.rank - 1 && this.foundRank(opp[1]) >= c.rank - 1);
      if (!safe) continue;
      for (const f of this.founds) if (this.canMove({ from: p.id, index: i, to: f.id })) return { from: p.id, index: i, to: f.id };
    }
    return null;
  }

  get canAutoComplete(): boolean {
    if (this.won) return false;
    // Every column already in descending order → trivially finishable.
    return this.tabs.every((t) => t.cards.every((c, i) => i === 0 || c.rank < t.cards[i - 1].rank));
  }

  private allMoves(): MoveRef[] {
    const out: MoveRef[] = [];
    for (const src of [...this.cells, ...this.tabs]) {
      for (let i = 0; i < src.cards.length; i++) {
        if (!this.canPick(src.id, i)) continue;
        for (const d of this.piles) {
          const m = { from: src.id, index: i, to: d.id };
          if (this.canMove(m)) out.push(m);
        }
      }
    }
    return out;
  }

  hint(): Hint {
    let best: MoveRef | null = null;
    let bestS = -999;
    for (const m of this.allMoves()) {
      const src = this.pile(m.from);
      const dst = this.pile(m.to);
      let s = 0;
      if (dst.kind === 'found') s += 50;
      if (src.kind === 'cell' && dst.kind === 'tab' && dst.cards.length) s += 30;
      if (dst.kind === 'tab' && dst.cards.length) s += 10 + (src.cards.length - m.index) * 2;
      if (dst.kind === 'tab' && !dst.cards.length) s -= 5;
      if (dst.kind === 'cell') s -= 15;
      if (src.kind === 'tab' && m.index === 0) s -= 8;
      // Moving a run onto an equivalent spot is pointless.
      const below = src.cards[m.index - 1];
      if (src.kind === 'tab' && below && isRedSuit(below.suit) !== isRedSuit(src.cards[m.index].suit) && below.rank === src.cards[m.index].rank + 1) s -= 40;
      if (s > bestS) {
        bestS = s;
        best = m;
      }
    }
    return best ? { t: 'move', m: best } : null;
  }

  get stuck(): boolean {
    return !this.won && this.allMoves().length === 0;
  }
}
