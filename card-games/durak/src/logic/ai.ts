import { Rng } from '@shared/core/rng';
import { Durak, type DAction, type DCard } from './durak';

export interface AIProfile {
  /** 1 novice … 4 Monte-Carlo. */
  level: 1 | 2 | 3 | 4;
  /** 0..1 — how eagerly cards are thrown in. */
  aggression: number;
  /** 0..1 — preference for transferring. */
  transferLove: number;
  /** 0..1 — chance to cheat when stuck (cheat mode). */
  cheatRate: number;
  /** 0..1 — chance to catch a cheat. */
  attention: number;
}

export const PROFILES: Record<string, AIProfile> = {
  novice: { level: 1, aggression: 0.4, transferLove: 0.3, cheatRate: 0.15, attention: 0.25 },
  amateur: { level: 2, aggression: 0.5, transferLove: 0.5, cheatRate: 0.25, attention: 0.45 },
  master: { level: 3, aggression: 0.6, transferLove: 0.7, cheatRate: 0.3, attention: 0.65 },
  king: { level: 4, aggression: 0.65, transferLove: 0.8, cheatRate: 0.35, attention: 0.85 },
};

const value = (g: Durak, c: DCard): number => c.rank + (c.suit === g.trumpSuit ? 13 : 0);

/** Cards not visible to player p: other hands + talon (except the shown trump). */
function unseen(g: Durak, p: number): DCard[] {
  const out: DCard[] = [];
  g.players.forEach((pl, i) => {
    if (i !== p) out.push(...pl.hand);
  });
  out.push(...g.talon.slice(1));
  return out;
}

/** Heuristic move choice (levels 1–3). Also used as the rollout policy for level 4. */
export function heuristic(g: Durak, p: number, prof: AIProfile, rng: Rng): DAction | null {
  const acts = g.legal(p);
  if (!acts.length) return null;
  const hand = g.players[p].hand;
  const byId = (id: number) => hand.find((c) => c.id === id)!;
  const lvl = prof.level;
  const endgame = g.talon.length === 0;

  if (g.phase === 'defend' && p === g.defender) {
    const defs = acts.filter((a): a is Extract<DAction, { t: 'defend' }> => a.t === 'defend');
    const trans = acts.filter((a): a is Extract<DAction, { t: 'transfer' }> => a.t === 'transfer');
    // Transfer with a cheap card if we like it.
    if (trans.length && rng.next() < prof.transferLove) {
      const best = trans.map((a) => ({ a, v: value(g, byId(a.card)) })).sort((x, y) => x.v - y.v)[0];
      if (best.v < 14 + (endgame ? 13 : 0) || lvl === 1) return best.a;
    }
    // Pair with the fewest options first, cheapest card that beats it.
    const pairs = g.unbeaten;
    let pick: Extract<DAction, { t: 'defend' }> | null = null;
    let fewest = 99;
    for (const pi of pairs) {
      const opts = defs.filter((d) => d.pair === pi);
      if (!opts.length) return { t: 'take', p };
      if (opts.length < fewest) {
        fewest = opts.length;
        pick = opts.sort((x, y) => value(g, byId(x.card)) - value(g, byId(y.card)))[0];
      }
    }
    if (!pick) return { t: 'take', p };
    // Can we cover everything? Greedy check.
    if (lvl >= 2) {
      const used = new Set<number>();
      let cost = 0;
      for (const pi of pairs) {
        const atk = g.table[pi].atk;
        const opt = hand.filter((c) => !used.has(c.id) && g.beats(atk, c)).sort((x, y) => value(g, x) - value(g, y))[0];
        if (!opt) return { t: 'take', p };
        used.add(opt.id);
        cost += value(g, opt) - value(g, atk);
      }
      // Taking cheap cards early is better than burning high trumps.
      const tableVal = g.table.reduce((a, x) => a + value(g, x.atk), 0) / Math.max(1, g.table.length);
      const highTrump = [...used].some((id) => {
        const c = byId(id);
        return c.suit === g.trumpSuit && c.rank >= 12;
      });
      if (!endgame && highTrump && tableVal < 10 && g.talon.length > 8 && rng.next() < 0.7) return { t: 'take', p };
      if (lvl >= 3 && !endgame && cost > 18 && g.talon.length > 10 && tableVal < 9) return { t: 'take', p };
    }
    return pick;
  }

  // Attacking / throwing in
  const atks = acts.filter((a): a is Extract<DAction, { t: 'attack' }> => a.t === 'attack');
  const pass = acts.find((a) => a.t === 'pass') ?? null;
  if (!atks.length) return pass;
  const sorted = atks.map((a) => ({ a, c: byId(a.card) })).sort((x, y) => value(g, x.c) - value(g, y.c));
  if (!g.table.length) {
    // Opening: lowest non-trump, prefer a rank we hold twice.
    if (lvl >= 2) {
      const counts = new Map<number, number>();
      for (const c of hand) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
      const nonTrump = sorted.filter((x) => x.c.suit !== g.trumpSuit);
      const pairs = nonTrump.filter((x) => (counts.get(x.c.rank) ?? 0) >= 2 && x.c.rank <= 11);
      if (pairs.length && rng.next() < 0.7) return pairs[0].a;
      if (endgame && lvl >= 3) {
        // Lead with a card the defender is least likely to beat.
        const opp = g.players[g.defender].hand.length;
        void opp;
      }
      if (nonTrump.length) return nonTrump[0].a;
    }
    return sorted[0].a;
  }
  // Throw in: cheap non-trumps, more eagerly when the defender is taking or in the endgame.
  const taking = g.phase === 'take';
  const teamDefender = g.isTeammate(p, g.defender);
  if (teamDefender) return pass;
  const limit = endgame ? 30 : taking ? 11 + prof.aggression * 4 : 8 + prof.aggression * 4;
  const cand = sorted.filter((x) => value(g, x.c) <= limit && (x.c.suit !== g.trumpSuit || endgame));
  if (cand.length && (lvl === 1 ? rng.next() < 0.5 : true)) return cand[0].a;
  return pass;
}

/** Monte-Carlo with determinization over the hidden cards (level 4). */
function monteCarlo(g: Durak, p: number, prof: AIProfile, rng: Rng): DAction | null {
  const acts = g.legal(p);
  if (acts.length <= 1) return acts[0] ?? null;
  // Trim the candidate list: heuristic pick + all defends/transfers/take/pass, distinct attack ranks.
  const cands: DAction[] = [];
  const seen = new Set<string>();
  for (const a of acts) {
    let k = a.t;
    if (a.t === 'attack' || a.t === 'transfer') k += ':' + g.players[p].hand.find((c) => c.id === a.card)!.rank + ':' + g.players[p].hand.find((c) => c.id === a.card)!.suit;
    if (a.t === 'defend') k += ':' + a.card + ':' + a.pair;
    if (!seen.has(k)) {
      seen.add(k);
      cands.push(a);
    }
  }
  if (cands.length > 8) cands.length = 8;
  const base = prof;
  const rollouts = Math.max(6, Math.floor(160 / cands.length));
  let best: DAction | null = null;
  let bestScore = -Infinity;
  for (const a of cands) {
    let score = 0;
    for (let r = 0; r < rollouts; r++) {
      const sim = determinize(g, p, rng);
      sim.apply(a);
      score += playout(sim, p, base, rng);
    }
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
}

/** Shuffle unknown cards among opponents and talon (keeping counts and known cards). */
function determinize(g: Durak, p: number, rng: Rng): Durak {
  const sim = g.clone();
  const pool = unseen(g, p).filter((c) => !g.players.some((pl, i) => i !== p && g.known[i].has(c.id) && pl.hand.includes(c)));
  rng.shuffle(pool);
  let k = 0;
  sim.players.forEach((pl, i) => {
    if (i === p) return;
    pl.hand = pl.hand.map((c) => (g.known[i].has(c.id) ? c : pool[k++]));
  });
  sim.talon = [sim.talon[0], ...sim.talon.slice(1).map(() => pool[k++])].filter(Boolean) as DCard[];
  if (!g.talon.length) sim.talon = [];
  return sim;
}

const ROLL_PROFILE: AIProfile = { level: 2, aggression: 0.5, transferLove: 0.5, cheatRate: 0, attention: 0 };

/** +1 if p is not the fool, -1 if p is the fool, 0 draw. */
function playout(sim: Durak, p: number, _prof: AIProfile, rng: Rng): number {
  for (let step = 0; step < 400 && !sim.over; step++) {
    const a = heuristic(sim, sim.actor, ROLL_PROFILE, rng);
    if (!a) {
      sim.autoResolve();
      // Find anyone who can act.
      const who = sim.players.findIndex((_, i) => sim.legal(i).length > 0);
      if (who < 0) break;
      const b = heuristic(sim, who, ROLL_PROFILE, rng);
      if (!b) break;
      sim.apply(b);
      continue;
    }
    sim.apply(a);
  }
  if (!sim.over) return 0;
  if (sim.draw) return 0;
  if (sim.rules.teams) return sim.loser !== null && sim.loser % 2 === p % 2 ? -1 : 1;
  return sim.loser === p ? -1 : 1;
}

export function decide(g: Durak, p: number, prof: AIProfile, rng: Rng): DAction | null {
  if (prof.level === 4) return monteCarlo(g, p, prof, rng);
  return heuristic(g, p, prof, rng);
}

/** Cheat mode: illegal move when the bot would otherwise take or has nothing to throw. */
export function maybeCheat(g: Durak, p: number, prof: AIProfile, rng: Rng, planned: DAction | null): { t: 'attack'; p: number; card: number } | { t: 'defend'; p: number; card: number; pair: number } | null {
  if (!g.rules.cheat || rng.next() >= prof.cheatRate) return null;
  const hand = g.players[p].hand;
  if (!hand.length) return null;
  const lowest = hand.slice().sort((a, b) => value(g, a) - value(g, b));
  if (g.phase === 'defend' && p === g.defender && planned?.t === 'take') {
    const pi = g.unbeaten[0];
    if (pi === undefined) return null;
    // Cover with a cheap card of the same suit (looks plausible).
    const atk = g.table[pi].atk;
    const same = lowest.find((c) => c.suit === atk.suit) ?? lowest[0];
    return { t: 'defend', p, card: same.id, pair: pi };
  }
  if ((g.phase === 'attack' || g.phase === 'take') && g.table.length && planned?.t === 'pass' && g.isAttackerSide(p) && g.table.length < g.boutLimit) {
    const c = lowest.find((x) => x.suit !== g.trumpSuit) ?? null;
    if (c && !g.tableRanks.has(c.rank)) return { t: 'attack', p, card: c.id };
  }
  return null;
}
