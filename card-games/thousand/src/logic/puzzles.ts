import { Rng } from '@shared/core/rng';
import { decide, policyCard, PROFILES } from './ai';
import { Deal, DEFAULT_RULES, MARRIAGE, NP, POINTS, trickWinner, type Played, type Suit, type TCard } from './thousand';

/**
 * Etudes: open-hand endgames where the player (declarer, seat 0) must collect a number of
 * points in the remaining tricks. Defenders play perfectly; every puzzle is checked by an
 * exact solver to be winnable while most first moves fail.
 */

interface SState {
  hands: TCard[][];
  trick: Played[];
  turn: number;
  trump: Suit | null;
  trickNo: number;
  marriageX: number;
}

function legal(s: SState, p: number): TCard[] {
  const h = s.hands[p];
  if (!s.trick.length) return h;
  const lead = s.trick[0].card.suit;
  const f = h.filter((c) => c.suit === lead);
  if (f.length) return f;
  if (s.trump !== null) {
    const t = h.filter((c) => c.suit === s.trump);
    if (t.length) return t;
  }
  return h;
}

function keyOf(s: SState): string {
  return s.hands.map((h) => h.map((c) => c.id).sort((a, b) => a - b).join('.')).join('|') + `#${s.turn}#${s.trump}`;
}

/** Best future points of the declarer (seat 0) from a trick boundary or mid-trick state. */
function solve(s: SState, memo: Map<string, number>): number {
  if (!s.hands[0].length && !s.trick.length) return 0;
  const atStart = s.trick.length === 0;
  const key = atStart ? keyOf(s) : '';
  if (atStart) {
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
  }
  const p = s.turn;
  const max = p === 0;
  let best = max ? -Infinity : Infinity;
  for (const c of legal(s, p).slice()) {
    const v = step(s, p, c, memo);
    if (max ? v > best : v < best) best = v;
  }
  if (atStart) memo.set(key, best);
  return best;
}

/** Value of playing card `c` (declarer gain from here on). */
function step(s: SState, p: number, c: TCard, memo: Map<string, number>): number {
  let gain = 0;
  const prevTrump = s.trump;
  if (!s.trick.length && s.trickNo > 0 && (c.rank === 12 || c.rank === 13)) {
    const other = c.rank === 12 ? 13 : 12;
    if (s.hands[p].some((x) => x.suit === c.suit && x.rank === other)) {
      s.trump = c.suit;
      if (p === 0) gain += MARRIAGE[c.suit] * s.marriageX;
    }
  }
  const hand = s.hands[p];
  const idx = hand.indexOf(c);
  hand.splice(idx, 1);
  s.trick.push({ p, card: c });
  const prevTurn = s.turn;
  let v: number;
  if (s.trick.length < NP) {
    s.turn = (p + 1) % NP;
    v = gain + solve(s, memo);
  } else {
    const trick = s.trick;
    const w = trick[trickWinner(trick, s.trump)].p;
    const pts = trick.reduce((a, x) => a + POINTS[x.card.rank], 0);
    s.trick = [];
    s.turn = w;
    s.trickNo++;
    v = gain + (w === 0 ? pts : 0) + solve(s, memo);
    s.trickNo--;
    s.trick = trick;
  }
  s.trick.pop();
  hand.splice(idx, 0, c);
  s.turn = prevTurn;
  s.trump = prevTrump;
  return v;
}

function stateOf(d: Deal): SState {
  return { hands: d.hands.map((h) => h.slice()), trick: d.trick.slice(), turn: d.turn, trump: d.trump, trickNo: d.trickNo, marriageX: d.rules.marriageX };
}

/** Exact best move for player p (declarer maximises, defenders minimise the declarer's points). */
export function bestCard(d: Deal, p: number): TCard {
  const s = stateOf(d);
  const memo = new Map<string, number>();
  const cards = legal(s, p).slice();
  let best = cards[0];
  let bv = p === 0 ? -Infinity : Infinity;
  for (const c of cards) {
    const v = step(s, p, c, memo);
    if (p === 0 ? v > bv : v < bv) {
      bv = v;
      best = c;
    }
  }
  return best;
}

/** Values of each legal first move of the declarer. */
export function moveValues(d: Deal): { card: TCard; v: number }[] {
  const s = stateOf(d);
  const memo = new Map<string, number>();
  return legal(s, 0)
    .slice()
    .map((c) => ({ card: c, v: step(s, 0, c, memo) }));
}

export interface Puzzle {
  n: number;
  deal: Deal;
  /** Points the declarer must reach in total. */
  need: number;
  tricksLeft: number;
}

const cache = new Map<number, Puzzle>();

/** Rotate seats so that `decl` becomes seat 0. */
function rotate(d: Deal, decl: number): void {
  const r = <T>(a: T[]) => [0, 1, 2].map((i) => a[(i + decl) % NP]);
  d.hands = r(d.hands);
  d.taken = r(d.taken);
  d.tricks = r(d.tricks);
  d.marriages = r(d.marriages);
  d.given = r(d.given);
  const m = (p: number) => (p - decl + NP) % NP;
  d.turn = m(d.turn);
  d.leader = m(d.leader);
  d.declarer = 0;
  d.dealer = m(d.dealer);
  d.history = d.history.map((h) => ({ p: m(h.p), card: h.card }));
  d.marriageLog = d.marriageLog.map((x) => ({ p: m(x.p), suit: x.suit }));
}

/** Puzzle number n (1-based), deterministic and verified. */
export function puzzle(n: number): Puzzle {
  const hit = cache.get(n);
  if (hit) return hit;
  const left = n <= 8 ? 3 : n <= 30 ? 4 : n <= 80 ? 5 : 6;
  const rng = new Rng(n * 7349 + 17);
  let fallback: Puzzle | null = null;
  for (let attempt = 0; attempt < 400; attempt++) {
    const d = new Deal({ ...DEFAULT_RULES }, rng.int(0, 2), rng.int(1, 2 ** 30));
    let guard = 0;
    while (d.phase !== 'play' && d.phase !== 'done' && guard++ < 50) for (const a of decide(d, d.turn, PROFILES.amateur, rng)) d.apply(a);
    if (d.phase !== 'play') continue;
    rotate(d, d.declarer);
    while (d.phase === 'play' && d.trickNo < 8 - left) d.apply({ t: 'play', p: d.turn, card: policyCard(d, d.turn, rng, 0.1).id });
    if (d.phase !== 'play' || d.turn !== 0 || d.trick.length) continue;
    const vals = moveValues(d);
    if (vals.length < 3) continue;
    const best = Math.max(...vals.map((x) => x.v));
    if (best < 10) continue;
    const winners = vals.filter((x) => x.v >= best).length;
    const cur = d.declPoints();
    const p: Puzzle = { n, deal: d, need: cur + best, tricksLeft: left };
    if (!fallback) fallback = p;
    // Hard enough: a single (or at most two) winning first moves out of several.
    if (winners <= Math.max(1, Math.floor(vals.length / 3))) {
      cache.set(n, p);
      return p;
    }
  }
  cache.set(n, fallback!);
  return fallback!;
}

/** Remaining points in the hands (for the puzzle panel). */
export function pointsLeft(d: Deal): number {
  return d.hands.flat().reduce((a, c) => a + POINTS[c.rank], 0);
}
