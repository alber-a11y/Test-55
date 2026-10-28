import type { Suit } from '@shared/cards/card';

/** Common model shape of the "column" solitaires (Klondike, Spider, FreeCell). */
export interface SCard {
  id: number;
  suit: Suit;
  rank: number;
  up: boolean;
}

export type PileKind = 'stock' | 'waste' | 'found' | 'tab' | 'cell';

export interface Pile {
  id: string;
  kind: PileKind;
  index: number;
  cards: SCard[];
}

export interface MoveRef {
  from: string;
  /** Index of the first moved card in the source pile. */
  index: number;
  to: string;
}

export type Hint = { t: 'move'; m: MoveRef } | { t: 'draw' } | null;

export interface PileGame {
  readonly mode: string;
  piles: Pile[];
  pile(id: string): Pile;
  /** Can the player pick up cards starting at `index` of pile `id`. */
  canPick(id: string, index: number): boolean;
  canMove(m: MoveRef): boolean;
  /** Apply a legal move (also flips newly exposed cards etc.). */
  move(m: MoveRef): boolean;
  /** Best destination for tap-to-move. */
  autoTarget(id: string, index: number): string | null;
  /** Stock click. */
  draw(): boolean;
  readonly canDraw: boolean;
  undo(): boolean;
  readonly canUndo: boolean;
  hint(): Hint;
  readonly won: boolean;
  /** Stuck: no useful moves (offers hints / restart). */
  readonly stuck: boolean;
  score: number;
  moves: number;
  /** Cards that can go to the foundation now (auto-complete step), or null. */
  autoStep(): MoveRef | null;
  /** Foundation move that can never hurt (auto-play), or null. */
  safeStep?(): MoveRef | null;
  /** All face-up and nothing hidden — finishing is trivial. */
  readonly canAutoComplete: boolean;
  serialize(): unknown;
}

export const isRedSuit = (s: Suit): boolean => s === 1 || s === 2;

export function clonePiles(piles: Pile[]): Pile[] {
  return piles.map((p) => ({ ...p, cards: p.cards.map((c) => ({ ...c })) }));
}

/** Shared undo stack of pile snapshots + score/moves. */
export class History {
  private stack: { piles: Pile[]; score: number; moves: number; extra?: unknown }[] = [];
  push(piles: Pile[], score: number, moves: number, extra?: unknown): void {
    this.stack.push({ piles: clonePiles(piles), score, moves, extra });
    if (this.stack.length > 400) this.stack.shift();
  }
  pop(): { piles: Pile[]; score: number; moves: number; extra?: unknown } | undefined {
    return this.stack.pop();
  }
  get size(): number {
    return this.stack.length;
  }
  clear(): void {
    this.stack = [];
  }
}
