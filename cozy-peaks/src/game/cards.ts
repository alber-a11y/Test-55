/** Suits: 0 ♠ spades, 1 ♥ hearts, 2 ♦ diamonds, 3 ♣ clubs. Ranks 1 (A) … 13 (K). */
export type Suit = 0 | 1 | 2 | 3;

export interface Card {
  r: number;
  s: Suit;
}

export const SUIT_CHARS = ['♠', '♥', '♦', '♣'] as const;
export const RANK_NAMES = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export const isRed = (s: Suit): boolean => s === 1 || s === 2;
export const cardKey = (c: Card): string => `${c.r}_${c.s}`;
export const cardLabel = (c: Card): string => `${RANK_NAMES[c.r]}${SUIT_CHARS[c.s]}`;

/** Ranks are playable on each other when they differ by one; K and A wrap around. */
export function adjacent(a: number, b: number, wrap = true): boolean {
  const d = Math.abs(a - b);
  return d === 1 || (wrap && d === 12);
}

export function fullDeck(): Card[] {
  const out: Card[] = [];
  for (let s = 0 as Suit; s < 4; s = (s + 1) as Suit) for (let r = 1; r <= 13; r++) out.push({ r, s });
  return out;
}
