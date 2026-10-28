import { Rng } from '@shared/core/rng';
import { Durak, DEFAULT_RULES, type DAction, type DCard } from './durak';

export interface PuzzleDef {
  n: number;
  hands: DCard[][];
  trump: DCard;
  attacker: number;
  /** A winning first move for the player (hint). */
  solution: DAction;
}

function key(g: Durak): string {
  const h = g.players.map((p) => p.hand.map((c) => c.id).sort((a, b) => a - b).join(',')).join('|');
  const tb = g.table.map((x) => `${x.atk.id}:${x.def?.id ?? ''}`).join(',');
  return `${h}#${tb}#${g.phase}${g.attacker}${g.defender}${g.actor}#${[...g.passed].join(',')}`;
}

/** Who acts now (defender while defending, otherwise the actor). */
export function whoActs(g: Durak): number {
  if (g.phase === 'defend') return g.defender;
  return g.actor;
}

/**
 * Perfect-information minimax for 2-player endgames (talon empty).
 * Returns +1 if player 0 wins, -1 if player 0 is the fool, 0 draw.
 */
export function solve(g: Durak, memo = new Map<string, number>(), budget = { n: 200_000 }): number {
  if (g.over) return g.draw ? 0 : g.loser === 1 ? 1 : -1;
  if (--budget.n < 0) return 0;
  const k = key(g);
  const hit = memo.get(k);
  if (hit !== undefined) return hit;
  let who = whoActs(g);
  let acts = g.legal(who);
  if (!acts.length) {
    const c = g.clone();
    c.autoResolve();
    if (c.over || key(c) !== k) {
      const v = solve(c, memo, budget);
      memo.set(k, v);
      return v;
    }
    who = c.players.findIndex((_, i) => c.legal(i).length > 0);
    if (who < 0) return 0;
    acts = c.legal(who);
  }
  let best = who === 0 ? -2 : 2;
  for (const a of acts) {
    const c = g.clone();
    if (!c.apply(a)) continue;
    c.autoResolve();
    const v = solve(c, memo, budget);
    if (who === 0 ? v > best : v < best) best = v;
    if ((who === 0 && best === 1) || (who !== 0 && best === -1)) break;
  }
  memo.set(k, best);
  return best;
}

/** Best action for player `p` in a solved endgame. */
export function bestMove(g: Durak, p: number): DAction | null {
  const acts = g.legal(p);
  let best: DAction | null = null;
  let bestV = p === 0 ? -2 : 2;
  const memo = new Map<string, number>();
  for (const a of acts) {
    const c = g.clone();
    if (!c.apply(a)) continue;
    c.autoResolve();
    const v = solve(c, memo);
    if (p === 0 ? v > bestV : v < bestV) {
      bestV = v;
      best = a;
    }
  }
  return best;
}

const cache = new Map<number, PuzzleDef>();

/** Deterministic puzzle #n: the player attacks first, a win exists but not every move wins. */
export function puzzle(n: number): PuzzleDef {
  const hit = cache.get(n);
  if (hit) return hit;
  const size = Math.min(5, 2 + Math.floor(n / 6));
  for (let attempt = 0; attempt < 400; attempt++) {
    const rng = new Rng(n * 7919 + attempt * 104729 + 3);
    const base = new Durak({ ...DEFAULT_RULES, players: 2 }, n * 31 + attempt);
    const deck = rng.shuffle([...base.players[0].hand, ...base.players[1].hand, ...base.talon]);
    const trump = deck.pop()!;
    const mySize = Math.max(2, size - rng.int(0, 1));
    const oppSize = size + rng.int(0, 1);
    const hands = [deck.slice(0, mySize), deck.slice(mySize, mySize + oppSize)];
    const g = new Durak({ ...DEFAULT_RULES, players: 2, firstBoutFive: false }, 1, 0);
    g.talon = [];
    g.trump = trump;
    g.players[0].hand = hands[0].map((c) => ({ ...c }));
    g.players[1].hand = hands[1].map((c) => ({ ...c }));
    g.firstBout = false;
    g.boutLimit = Math.min(6, g.players[1].hand.length);
    const acts = g.legal(0);
    let wins = 0;
    let sol: DAction | null = null;
    const memo = new Map<string, number>();
    for (const a of acts) {
      const c = g.clone();
      c.apply(a);
      c.autoResolve();
      const v = solve(c, memo);
      if (v === 1) {
        wins++;
        sol ??= a;
      }
    }
    // Interesting: winnable, but most first moves lose.
    if (sol && wins <= Math.max(1, Math.floor(acts.length / 3))) {
      const def: PuzzleDef = { n, hands: hands.map((h) => h.map((c) => ({ ...c }))), trump, attacker: 0, solution: sol };
      cache.set(n, def);
      return def;
    }
  }
  // Fallback: any winnable deal.
  const g = new Durak({ ...DEFAULT_RULES, players: 2 }, n);
  const def: PuzzleDef = { n, hands: [g.players[0].hand.slice(0, 3), g.players[1].hand.slice(0, 4)], trump: g.trump, attacker: 0, solution: { t: 'pass', p: 0 } };
  cache.set(n, def);
  return def;
}
