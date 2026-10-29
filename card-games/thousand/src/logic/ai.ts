import { Rng } from '@shared/core/rng';
import { Deal, MARRIAGE, marriagesIn, maxBidFor, next, NP, ORDER, POINTS, round5, sortHand, trickWinner, type Suit, type TAction, type TCard } from './thousand';

/**
 * Bots for «Тысяча». Weak levels use a hand-written policy; strong levels evaluate
 * moves by Monte Carlo: hidden cards are dealt at random consistently with what was
 * seen (voids, prikup, given cards) and every candidate is played out with the policy.
 */
export interface AIProfile {
  level: 1 | 2 | 3 | 4;
  /** Monte Carlo samples per decision (0 = policy only). */
  samples: number;
  /** Chance of a careless move. */
  noise: number;
  /** Quantile of the simulated points the bot bids up to (lower = bolder). */
  bidConf: number;
  /** Extra points the bot is willing to risk in bidding. */
  bidBias: number;
}

export const PROFILES: Record<'novice' | 'amateur' | 'master' | 'king', AIProfile> = {
  novice: { level: 1, samples: 0, noise: 0.25, bidConf: 0.55, bidBias: 0 },
  amateur: { level: 2, samples: 0, noise: 0.08, bidConf: 0.55, bidBias: 0 },
  master: { level: 3, samples: 14, noise: 0.02, bidConf: 0.55, bidBias: 0 },
  king: { level: 4, samples: 28, noise: 0, bidConf: 0.5, bidBias: 5 },
};

export const profileForLevel = (lv: number): AIProfile => [PROFILES.novice, PROFILES.novice, PROFILES.amateur, PROFILES.master, PROFILES.king][Math.max(1, Math.min(4, lv))];

/* ------------------------------------------------------------------ helpers */

const higher = (a: TCard, b: TCard): boolean => ORDER[a.rank] > ORDER[b.rank];

/** Cards not yet played and not in `hand`. */
function outside(d: Deal, hand: readonly TCard[]): TCard[] {
  const mine = new Set(hand.map((c) => c.id));
  const played = new Set(d.history.map((h) => h.card.id));
  return d.allCards.filter((c) => !mine.has(c.id) && !played.has(c.id));
}

/** Is `c` the highest unplayed card of its suit (given what is still outside my hand)? */
function isBoss(c: TCard, out: readonly TCard[]): boolean {
  return !out.some((o) => o.suit === c.suit && higher(o, c));
}

/** Value of keeping a card (used for the discard and for dumping). */
function keepValue(c: TCard, hand: readonly TCard[], out: readonly TCard[]): number {
  const suit = hand.filter((x) => x.suit === c.suit);
  const len = suit.length;
  const marr = (c.rank === 12 || c.rank === 13) && marriagesIn(hand).includes(c.suit);
  if (marr) return 70 + MARRIAGE[c.suit] / 4;
  if (isBoss(c, out)) return 60 + POINTS[c.rank] * 2 + len;
  if (c.rank === 10) return suit.some((x) => x.rank === 14) ? 55 : 18 + len * 6;
  return POINTS[c.rank] * 2 + len * 3 + ORDER[c.rank];
}

/* ------------------------------------------------------------------ playing policy */

/** Fast deterministic-ish policy used for weak bots and for Monte Carlo playouts. */
export function policyCard(d: Deal, p: number, rng: Rng | null, noise = 0): TCard {
  const legal = d.legalCards(p);
  if (legal.length === 1) return legal[0];
  if (rng && noise > 0 && rng.chance(noise)) return rng.pick(legal);
  const hand = d.hands[p];
  const out = outside(d, hand);
  const trump = d.trump;
  const decl = d.declarer;
  const partner = p === decl ? -1 : [0, 1, 2].find((i) => i !== p && i !== decl)!;
  const low = (cs: TCard[]) => cs.slice().sort((a, b) => keepValue(a, hand, out) - keepValue(b, hand, out))[0];

  if (!d.trick.length) {
    // Declare the most valuable marriage.
    if (d.trickNo > 0) {
      const ms = marriagesIn(hand).sort((a, b) => MARRIAGE[b] - MARRIAGE[a]);
      if (ms.length) {
        const s = ms[0];
        // Lead the king if it is safe, otherwise the queen.
        const k = hand.find((c) => c.suit === s && c.rank === 13)!;
        const q = hand.find((c) => c.suit === s && c.rank === 12)!;
        return isBoss(k, out) ? k : q;
      }
    }
    // Pull trumps with a top trump when declarer.
    if (trump !== null && p === decl) {
      const tr = hand.filter((c) => c.suit === trump);
      const oppTr = out.filter((c) => c.suit === trump).length;
      const top = tr.find((c) => isBoss(c, out));
      if (top && oppTr > 0) return top;
    }
    // Cash winners (but not into a suit an opponent may trump).
    const bosses = hand.filter((c) => isBoss(c, out) && !(marriagesIn(hand).includes(c.suit) && (c.rank === 12 || c.rank === 13)));
    if (bosses.length) return bosses.sort((a, b) => POINTS[b.rank] - POINTS[a.rank])[0];
    // Otherwise a cheap card, preferably from a short side suit.
    const noMarr = hand.filter((c) => !((c.rank === 12 || c.rank === 13) && marriagesIn(hand).includes(c.suit)));
    const pool = noMarr.length ? noMarr : hand;
    return pool.slice().sort((a, b) => keepValue(a, hand, out) - keepValue(b, hand, out) + (hand.filter((x) => x.suit === a.suit).length - hand.filter((x) => x.suit === b.suit).length) * 2)[0];
  }

  const wi = trickWinner(d.trick, trump);
  const winning = d.trick[wi];
  const last = d.trick.length === NP - 1;
  const trickPts = d.trick.reduce((a, x) => a + POINTS[x.card.rank], 0);
  const beats = (c: TCard) => trickWinner([...d.trick, { p, card: c }], trump) === d.trick.length;
  const winners = legal.filter(beats);
  const partnerWins = winning.p === partner;

  if (partnerWins) {
    // Partner holds the trick: give points if it is safe.
    const safe = last || isBoss(winning.card, out) || (trump !== null && winning.card.suit === trump && d.trick[0].card.suit !== trump);
    if (safe) return legal.slice().sort((a, b) => POINTS[b.rank] - POINTS[a.rank] || keepValue(a, hand, out) - keepValue(b, hand, out))[0];
    return low(legal);
  }
  if (winners.length) {
    const cheapest = winners.slice().sort((a, b) => (a.suit === trump ? 10 : 0) - (b.suit === trump ? 10 : 0) || ORDER[a.rank] - ORDER[b.rank])[0];
    if (last) {
      // Take it with the cheapest winner if it is worth something.
      if (trickPts + POINTS[cheapest.rank] > 0 || winners.length === legal.length) return cheapest;
      return low(legal);
    }
    // Second hand: take with a sure winner, or when the trick is rich.
    const sure = winners.filter((c) => isBoss(c, out) || (trump !== null && c.suit === trump && d.trick[0].card.suit !== trump));
    if (sure.length && (trickPts >= 10 || p === decl || d.trick[0].p === decl)) return sure.sort((a, b) => ORDER[a.rank] - ORDER[b.rank])[0];
    if (trickPts >= 10 && winners.length) return cheapest;
  }
  return low(legal);
}

/** Simple discard: give away the two least useful cards. Returns [toFirst, toSecond]. */
export function policyDiscard(d: Deal, p: number): [TCard, TCard] {
  const hand = d.hands[p];
  const out = outside(d, hand);
  const sorted = hand.slice().sort((a, b) => keepValue(a, hand, out) - keepValue(b, hand, out));
  return [sorted[0], sorted[1]];
}

/* ------------------------------------------------------------------ sampling */

/** Known locations of hidden cards from player `p`'s point of view. */
function knownOwner(d: Deal, p: number): Map<number, number> {
  const m = new Map<number, number>();
  if (d.declarer >= 0 && d.phase !== 'bid') {
    // The prikup was shown: its cards are with the declarer unless given away.
    for (const c of d.prikupShown) m.set(c.id, d.declarer);
    for (let i = 0; i < NP; i++) {
      const g = d.given[i];
      if (g === null) continue;
      // The declarer knows both, each receiver knows its own card.
      if (p === d.declarer || p === i) m.set(g, i);
      else if (m.get(g) === d.declarer) m.delete(g);
    }
  }
  return m;
}

/** Suits each player is known to be void in (from play). */
function voids(d: Deal): boolean[][] {
  const v = [0, 1, 2].map(() => [false, false, false, false]);
  // Replay tricks to know the trump at each moment.
  let trick: { p: number; card: TCard }[] = [];
  let trump: Suit | null = null;
  let mi = 0;
  for (const h of d.history) {
    if (!trick.length && mi < d.marriageLog.length && d.marriageLog[mi].p === h.p && h.card.suit === d.marriageLog[mi].suit && (h.card.rank === 12 || h.card.rank === 13)) {
      trump = d.marriageLog[mi].suit;
      mi++;
    }
    if (trick.length) {
      const lead = trick[0].card.suit;
      if (h.card.suit !== lead) {
        v[h.p][lead] = true;
        if (trump !== null && h.card.suit !== trump) v[h.p][trump] = true;
      }
    }
    trick.push(h);
    if (trick.length === NP) trick = [];
  }
  return v;
}

/**
 * A full-information copy of the deal where cards hidden from `p` are dealt at random,
 * consistent with hand sizes, known locations and voids.
 */
export function sampleWorld(d: Deal, p: number, rng: Rng): Deal {
  const w = d.clone();
  const known = knownOwner(d, p);
  const vd = voids(d);
  const others = [0, 1, 2].filter((i) => i !== p);
  const sizes = others.map((i) => d.hands[i].length);
  const prikupN = d.prikup.length;
  const fixed: TCard[][] = others.map(() => []);
  const pool: TCard[] = [];
  const hidden = [...others.flatMap((i) => d.hands[i]), ...d.prikup];
  for (const c of hidden) {
    const o = known.get(c.id);
    const oi = o === undefined ? -1 : others.indexOf(o);
    if (oi >= 0) fixed[oi].push(c);
    else pool.push(c);
  }
  for (let attempt = 0; attempt < 30; attempt++) {
    rng.shuffle(pool);
    const hands = fixed.map((f) => f.slice());
    const rest: TCard[] = [];
    let ok = true;
    for (const c of pool) {
      // Place into a random player who can hold it.
      const cand = [0, 1].filter((k) => hands[k].length < sizes[k] && !(attempt < 25 && vd[others[k]][c.suit]));
      if (cand.length) hands[rng.pick(cand)].push(c);
      else rest.push(c);
    }
    // Remaining cards go to the prikup (only during the bidding) or wherever there is room.
    const prik: TCard[] = [];
    for (const c of rest) {
      if (prik.length < prikupN) prik.push(c);
      else {
        const k = [0, 1].find((q) => hands[q].length < sizes[q]);
        if (k === undefined) {
          ok = false;
          break;
        }
        hands[k].push(c);
      }
    }
    if (!ok || prik.length !== prikupN) continue;
    others.forEach((i, k) => (w.hands[i] = sortHand(hands[k])));
    w.prikup = prik;
    return w;
  }
  // Fallback: plain shuffle ignoring voids.
  rng.shuffle(hidden);
  let o = 0;
  others.forEach((i, k) => {
    w.hands[i] = sortHand(hidden.slice(o, o + sizes[k]));
    o += sizes[k];
  });
  w.prikup = hidden.slice(o, o + prikupN);
  return w;
}

/** Play a deal to the end with the policy. */
export function playout(w: Deal, rng: Rng): void {
  let guard = 0;
  while (w.phase === 'play' && guard++ < 40) {
    const p = w.turn;
    const c = policyCard(w, p, rng, 0.03);
    w.apply({ t: 'play', p, card: c.id });
  }
}

/** Score of a finished (or played-out) deal from `p`'s point of view. */
function valueFor(w: Deal, p: number): number {
  const decl = w.declarer;
  const dp = w.declPoints();
  const made = dp >= w.contract;
  if (p === decl) return (made ? w.contract : -w.contract) + dp * 0.25;
  return (made ? -w.contract : w.contract) * 0.8 + (w.taken[p] + w.marriages[p]) * 0.4 - dp * 0.05;
}

/* ------------------------------------------------------------------ decisions */

/** Card choice for the play phase. */
export function chooseCard(d: Deal, p: number, prof: AIProfile, rng: Rng): TCard {
  const legal = d.legalCards(p);
  if (legal.length === 1 || prof.samples <= 0) return policyCard(d, p, rng, prof.noise);
  const scores = legal.map(() => 0);
  for (let s = 0; s < prof.samples; s++) {
    const world = sampleWorld(d, p, rng);
    legal.forEach((c, i) => {
      const w = world.clone();
      w.apply({ t: 'play', p, card: c.id });
      playout(w, rng);
      scores[i] += valueFor(w, p);
    });
  }
  let best = 0;
  for (let i = 1; i < legal.length; i++) if (scores[i] > scores[best]) best = i;
  return legal[best];
}

/**
 * Simulated points the declarer `p` would make from the current state (bidding or contract phase),
 * sorted ascending. During bidding the prikup is unknown and drawn at random.
 */
export function simulateDeclarer(d: Deal, p: number, rng: Rng, n: number): number[] {
  const out: number[] = [];
  for (let s = 0; s < n; s++) {
    const w = sampleWorld(d, p, rng);
    if (w.phase === 'bid') {
      w.passed = [true, true, true];
      w.passed[p] = false;
      w.bidder = p;
      w.declarer = p;
      w.hands[p].push(...w.prikup);
      w.prikup = [];
      sortHand(w.hands[p]);
      w.phase = 'discard';
      w.turn = p;
    }
    if (w.phase === 'discard') {
      w.declarer = p;
      while (w.phase === 'discard') {
        const [a, b] = policyDiscard(w, p);
        const tos = [next(p), next(p, 2)].filter((i) => w.given[i] === null);
        w.apply({ t: 'give', p, card: a.id, to: tos[0] });
        if (w.phase === 'discard') w.apply({ t: 'give', p, card: b.id, to: tos[1] ?? tos[0] });
      }
    }
    if (w.phase === 'contract') {
      w.contract = w.bid;
      w.phase = 'play';
      w.leader = p;
      w.turn = p;
    }
    playout(w, rng);
    out.push(w.declPoints());
  }
  return out.sort((a, b) => a - b);
}

/** Quick static estimate of a 7-card hand (used for lucky deals and the weakest bots). */
export function handEstimate(hand: readonly TCard[], marriageX = 1): number {
  let v = 0;
  for (let s = 0; s < 4; s++) {
    const cs = hand.filter((c) => c.suit === s);
    const has = (r: number) => cs.some((c) => c.rank === r);
    if (has(14)) v += 22;
    if (has(10)) v += has(14) ? 18 : cs.length >= 3 ? 9 : 3;
    if (has(13) && has(12)) v += MARRIAGE[s] * marriageX * 0.85;
    else if (has(13) || has(12)) v += 3;
    v += Math.max(0, cs.length - 2) * 4;
  }
  return v + 18;
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))];
}

/** Bidding decision. */
export function chooseBid(d: Deal, p: number, prof: AIProfile, rng: Rng, ctx: { onBarrel?: boolean; scoreGap?: number } = {}): TAction {
  const max = d.maxBid(p);
  const need = d.minRaise;
  if (need > max) return { t: 'pass', p };
  let est: number;
  if (prof.samples <= 0) est = handEstimate(d.hands[p], d.rules.marriageX) + (rng.next() - 0.5) * 30 * (prof.noise * 2 + 0.2);
  else est = quantile(simulateDeclarer(d, p, rng, Math.max(10, Math.round(prof.samples * 0.9))), 1 - prof.bidConf);
  est += prof.bidBias;
  if (ctx.onBarrel) est += 10;
  const limit = Math.min(max, Math.floor(est / 5) * 5);
  if (need > limit) return { t: 'pass', p };
  // Usually raise by 5; strong hands sometimes jump straight to their value.
  const v = rng.chance(prof.level >= 3 ? 0.25 : 0.1) ? limit : need;
  return { t: 'bid', p, v };
}

/** Discard decision: two cards for the two opponents. */
export function chooseDiscard(d: Deal, p: number, prof: AIProfile, rng: Rng): { card: number; to: number }[] {
  const tos = [next(p), next(p, 2)];
  const [a, b] = policyDiscard(d, p);
  if (prof.samples <= 0) return [{ card: a.id, to: tos[0] }, { card: b.id, to: tos[1] }];
  const hand = d.hands[p];
  const out = outside(d, hand);
  const cand = hand.slice().sort((x, y) => keepValue(x, hand, out) - keepValue(y, hand, out)).slice(0, 5);
  let best: [TCard, TCard] = [a, b];
  let bestV = -Infinity;
  const n = Math.max(4, Math.round(prof.samples / 3));
  for (let i = 0; i < cand.length; i++)
    for (let j = i + 1; j < cand.length; j++) {
      let v = 0;
      for (let s = 0; s < n; s++) {
        const w = d.clone();
        w.apply({ t: 'give', p, card: cand[i].id, to: tos[0] });
        w.apply({ t: 'give', p, card: cand[j].id, to: tos[1] });
        const pts = simulateDeclarer(w, p, rng, 1)[0];
        v += Math.min(pts, d.bid + 40) + (pts >= d.bid ? 30 : 0);
      }
      if (v > bestV) {
        bestV = v;
        best = [cand[i], cand[j]];
      }
    }
  return [{ card: best[0].id, to: tos[0] }, { card: best[1].id, to: tos[1] }];
}

/** Final contract (or concede) after the discard. */
export function chooseContract(d: Deal, p: number, prof: AIProfile, rng: Rng): TAction {
  const sims = prof.samples > 0 ? simulateDeclarer(d, p, rng, Math.max(12, prof.samples)) : null;
  const max = Math.max(d.bid, d.maxBid(p));
  if (!sims) {
    const est = handEstimate(d.hands[p], d.rules.marriageX) + 10;
    if (d.rules.rospis && est < d.bid - 50 && d.bid >= 130) return { t: 'rospis', p };
    return { t: 'contract', p, v: d.bid };
  }
  const makeP = sims.filter((x) => x >= d.bid).length / sims.length;
  // Concede when the contract is hopeless and conceding is cheaper than failing.
  if (d.rules.rospis && makeP < 0.18 && d.bid >= 120) return { t: 'rospis', p };
  const safe = quantile(sims, 1 - prof.bidConf - 0.1);
  const v = Math.max(d.bid, Math.min(max, Math.floor(safe / 5) * 5));
  return { t: 'contract', p, v: prof.level >= 3 ? v : d.bid };
}

/** Any decision for player p in the current phase (bots and hints). */
export function decide(d: Deal, p: number, prof: AIProfile, rng: Rng, ctx: { onBarrel?: boolean } = {}): TAction[] {
  switch (d.phase) {
    case 'bid':
      return [chooseBid(d, p, prof, rng, ctx)];
    case 'discard':
      return chooseDiscard(d, p, prof, rng).map((g) => ({ t: 'give', p, card: g.card, to: g.to }) as TAction);
    case 'contract':
      return [chooseContract(d, p, prof, rng)];
    case 'play':
      return [{ t: 'play', p, card: chooseCard(d, p, prof, rng).id }];
  }
  return [];
}

/** Expected declarer points for the hint panel: [pessimistic, typical, optimistic]. */
export function bidAdvice(d: Deal, p: number, rng: Rng): { low: number; mid: number; high: number; advice: number } {
  const sims = simulateDeclarer(d, p, rng, 40);
  const low = round5(quantile(sims, 0.2));
  const mid = round5(quantile(sims, 0.5));
  const high = round5(quantile(sims, 0.8));
  const max = maxBidFor(d.hands[p], d.rules.marriageX);
  const advice = Math.min(max, Math.floor(quantile(sims, 0.45) / 5) * 5);
  return { low, mid, high, advice };
}
