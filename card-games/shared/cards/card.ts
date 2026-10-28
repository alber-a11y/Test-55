import { Rng } from '../core/rng';

/** 0 ♠ spades, 1 ♥ hearts, 2 ♦ diamonds, 3 ♣ clubs. */
export type Suit = 0 | 1 | 2 | 3;

export interface Card {
  /** Unique within one game (0..n-1). */
  id: number;
  suit: Suit;
  /** 1 = Ace … 11 = Jack, 12 = Queen, 13 = King. */
  rank: number;
}

export const SUITS: readonly Suit[] = [0, 1, 2, 3];
export const SUIT_CHARS = ['♠', '♥', '♦', '♣'];
export const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const RANK_LABELS_RU = ['', 'Т', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'В', 'Д', 'К'];

export const isRed = (s: Suit): boolean => s === 1 || s === 2;

export function cardName(c: { suit: Suit; rank: number }): string {
  return RANK_LABELS[c.rank] + SUIT_CHARS[c.suit];
}

/**
 * Build `decks` full decks. `suits` limits the suits used (Spider 1/2 suits): the deck
 * size stays 52 per deck, suits are repeated.
 */
export function makeDeck(decks = 1, suits: readonly Suit[] = SUITS, minRank = 1): Card[] {
  const out: Card[] = [];
  let id = 0;
  const perDeckSuits = 4;
  for (let d = 0; d < decks; d++) {
    for (let s = 0; s < perDeckSuits; s++) {
      const suit = suits[s % suits.length];
      for (let r = minRank; r <= 13; r++) out.push({ id: id++, suit, rank: r });
    }
  }
  return out;
}

export function shuffled<T>(arr: T[], seed: number): T[] {
  return new Rng(seed).shuffle(arr.slice());
}

/** Texture key of a card face for the given face style. */
export const faceKey = (styleId: string, suit: Suit, rank: number): string => `face_${styleId}_${suit}_${rank}`;
export const backKey = (styleId: string): string => `back_${styleId}`;
