import { Rng } from '@shared/core/rng';

/**
 * «Тысяча» (1000) for three players: 24-card deck, bidding from 100, prikup of 3 cards,
 * giving one card to each opponent, marriages that set the trump, scoring with barrel,
 * bolts and the 555 "dump truck". Pure logic, deterministic by seed.
 */

/** 0 ♠, 1 ♥, 2 ♦, 3 ♣ (same order as the shared card art). */
export type Suit = 0 | 1 | 2 | 3;

export interface TCard {
  id: number;
  suit: Suit;
  /** 9, 10, 11 = J, 12 = Q, 13 = K, 14 = A. */
  rank: number;
}

export const RANKS = [9, 10, 11, 12, 13, 14];
/** Card points: A 11, 10 10, K 4, Q 3, J 2, 9 0 — 120 in a deal. */
export const POINTS: Record<number, number> = { 9: 0, 10: 10, 11: 2, 12: 3, 13: 4, 14: 11 };
/** Trick strength inside a suit: A > 10 > K > Q > J > 9. */
export const ORDER: Record<number, number> = { 9: 0, 11: 1, 12: 2, 13: 3, 10: 4, 14: 5 };
/** Marriage value by suit: ♠ 40, ♥ 100, ♦ 80, ♣ 60. */
export const MARRIAGE: readonly number[] = [40, 100, 80, 60];

export const NP = 3;
export const HAND = 7;
export const TRICKS = 8;

export interface TRules {
  /** Points to win the match. */
  target: number;
  /** Barrel: at target-120 a player can only gain points with an own contract, 3 tries. */
  barrel: boolean;
  /** Three zero-trick deals cost 120. */
  bolts: boolean;
  /** Exactly 555 resets the score to zero. */
  samosval: boolean;
  /** Declarer may concede after the prikup ("расписать"). */
  rospis: boolean;
  /** What each opponent gets when the declarer concedes. */
  rospisPay: 'sixty' | 'half';
  /** First deal of the match counts double ("золотой кон"). */
  golden: boolean;
  /** Redeal when somebody gets all four nines. */
  redeal9: boolean;
  /** Declarer result multiplier ("тёмная": ×2). */
  contractX: 1 | 2;
  /** Marriage value multiplier ("марьяжная лихорадка": ×2). */
  marriageX: 1 | 2;
}

export const DEFAULT_RULES: TRules = {
  target: 1000,
  barrel: true,
  bolts: true,
  samosval: true,
  rospis: true,
  rospisPay: 'sixty',
  golden: false,
  redeal9: true,
  contractX: 1,
  marriageX: 1,
};

export const barrelAt = (r: TRules): number => r.target - 120;

export type Phase = 'bid' | 'discard' | 'contract' | 'play' | 'done';

export type TAction =
  | { t: 'bid'; p: number; v: number }
  | { t: 'pass'; p: number }
  | { t: 'give'; p: number; card: number; to: number }
  | { t: 'contract'; p: number; v: number }
  | { t: 'rospis'; p: number }
  | { t: 'play'; p: number; card: number };

export interface TEvent {
  kind: 'bid' | 'pass' | 'won' | 'prikup' | 'give' | 'contract' | 'rospis' | 'play' | 'marriage' | 'trick' | 'done';
  p: number;
  v?: number;
  card?: TCard;
  suit?: Suit;
  /** Trick winner / receiver of a card. */
  to?: number;
}

export interface Played {
  p: number;
  card: TCard;
}

export const cardPoints = (cs: readonly TCard[]): number => cs.reduce((a, c) => a + POINTS[c.rank], 0);
export const round5 = (x: number): number => Math.round(x / 5) * 5;
export const next = (p: number, k = 1): number => (p + k) % NP;

export function makeDeck(): TCard[] {
  const out: TCard[] = [];
  let id = 0;
  for (let s = 0; s < 4; s++) for (const r of RANKS) out.push({ id: id++, suit: s as Suit, rank: r });
  return out;
}

/** Suits in which the hand holds both K and Q. */
export function marriagesIn(hand: readonly TCard[]): Suit[] {
  const out: Suit[] = [];
  for (let s = 0; s < 4; s++) if (hand.some((c) => c.suit === s && c.rank === 13) && hand.some((c) => c.suit === s && c.rank === 12)) out.push(s as Suit);
  return out;
}

/** Highest bid a hand may make: 120 plus its marriages. */
export function maxBidFor(hand: readonly TCard[], marriageX = 1): number {
  return 120 + marriagesIn(hand).reduce<number>((a, s) => a + MARRIAGE[s] * marriageX, 0);
}

/** Sort for display: by suit (♠ ♥ ♣ ♦ alternate colors), strongest first. */
export function sortHand(hand: TCard[]): TCard[] {
  const so = [0, 1, 3, 2];
  return hand.sort((a, b) => so.indexOf(a.suit) - so.indexOf(b.suit) || ORDER[b.rank] - ORDER[a.rank]);
}

/** Winner index (into `trick`) of a complete or partial trick. */
export function trickWinner(trick: readonly Played[], trump: Suit | null): number {
  let best = 0;
  for (let i = 1; i < trick.length; i++) {
    const a = trick[best].card;
    const b = trick[i].card;
    if (b.suit === a.suit) {
      if (ORDER[b.rank] > ORDER[a.rank]) best = i;
    } else if (trump !== null && b.suit === trump) best = i;
  }
  return best;
}

/** One deal: bidding → prikup & discard → contract → eight tricks. */
export class Deal {
  hands: TCard[][] = [[], [], []];
  prikup: TCard[] = [];
  /** The prikup as it was dealt (public once revealed). */
  prikupShown: TCard[] = [];
  phase: Phase = 'bid';
  turn = 0;
  bid = 100;
  bidder = 0;
  passed = [false, false, false];
  /** Bids made per player (for display), 0 = none, -1 = passed. */
  lastBid = [0, 0, 0];
  declarer = -1;
  contract = 0;
  /** Card id given to each player during the discard (by the declarer). */
  given: (number | null)[] = [null, null, null];
  trick: Played[] = [];
  /** Last completed trick (for display). */
  lastTrick: Played[] = [];
  leader = 0;
  trickNo = 0;
  trump: Suit | null = null;
  taken = [0, 0, 0];
  tricks = [0, 0, 0];
  marriages = [0, 0, 0];
  marriageLog: { p: number; suit: Suit }[] = [];
  history: Played[] = [];
  rospis = false;
  events: TEvent[] = [];

  constructor(public rules: TRules, public dealer: number, seed: number | null) {
    if (seed === null) return;
    const rng = new Rng(seed);
    for (let guard = 0; guard < 50; guard++) {
      const deck = rng.shuffle(makeDeck());
      // Classic dealing: 7 each, three to the prikup.
      this.hands = [deck.slice(0, 7), deck.slice(7, 14), deck.slice(14, 21)];
      this.prikup = deck.slice(21, 24);
      if (!rules.redeal9 || !this.hands.some((h) => h.filter((c) => c.rank === 9).length === 4)) break;
    }
    this.hands.forEach((h) => sortHand(h));
    this.prikupShown = this.prikup.slice();
    // The player after the dealer opens with the obligatory 100.
    this.bidder = next(dealer);
    this.bid = 100;
    this.lastBid[this.bidder] = 100;
    this.turn = next(this.bidder);
  }

  clone(): Deal {
    const d = new Deal(this.rules, this.dealer, null);
    d.hands = this.hands.map((h) => h.slice());
    d.prikup = this.prikup.slice();
    d.prikupShown = this.prikupShown.slice();
    d.phase = this.phase;
    d.turn = this.turn;
    d.bid = this.bid;
    d.bidder = this.bidder;
    d.passed = this.passed.slice();
    d.lastBid = this.lastBid.slice();
    d.declarer = this.declarer;
    d.contract = this.contract;
    d.given = this.given.slice();
    d.trick = this.trick.slice();
    d.lastTrick = this.lastTrick.slice();
    d.leader = this.leader;
    d.trickNo = this.trickNo;
    d.trump = this.trump;
    d.taken = this.taken.slice();
    d.tricks = this.tricks.slice();
    d.marriages = this.marriages.slice();
    d.marriageLog = this.marriageLog.slice();
    d.history = this.history.slice();
    d.rospis = this.rospis;
    return d;
  }

  get allCards(): TCard[] {
    return [...this.hands.flat(), ...this.prikup, ...this.history.map((h) => h.card)];
  }

  /** Points of the declarer so far (cards + marriages). */
  declPoints(): number {
    return this.declarer < 0 ? 0 : this.taken[this.declarer] + this.marriages[this.declarer];
  }

  maxBid(p: number): number {
    return maxBidFor(this.hands[p], this.rules.marriageX);
  }

  /** Smallest raise allowed now. */
  get minRaise(): number {
    return this.bid + 5;
  }

  /** Legal cards for player p in the play phase. */
  legalCards(p: number): TCard[] {
    const hand = this.hands[p];
    if (this.phase !== 'play' || this.turn !== p) return [];
    if (!this.trick.length) return hand.slice();
    const lead = this.trick[0].card.suit;
    const follow = hand.filter((c) => c.suit === lead);
    if (follow.length) return follow;
    if (this.trump !== null) {
      const tr = hand.filter((c) => c.suit === this.trump);
      if (tr.length) return tr;
    }
    return hand.slice();
  }

  /** Would leading this card declare a marriage? */
  isMarriageLead(p: number, card: TCard): boolean {
    if (this.trick.length || this.trickNo === 0 || this.turn !== p) return false;
    if (card.rank !== 12 && card.rank !== 13) return false;
    const other = card.rank === 12 ? 13 : 12;
    return this.hands[p].some((c) => c.suit === card.suit && c.rank === other);
  }

  legal(p: number): TAction[] {
    const out: TAction[] = [];
    if (this.turn !== p) return out;
    switch (this.phase) {
      case 'bid': {
        const max = this.maxBid(p);
        for (let v = this.minRaise; v <= max; v += 5) out.push({ t: 'bid', p, v });
        out.push({ t: 'pass', p });
        break;
      }
      case 'discard': {
        for (const to of [next(p), next(p, 2)]) if (this.given[to] === null) for (const c of this.hands[p]) out.push({ t: 'give', p, card: c.id, to });
        break;
      }
      case 'contract': {
        const max = Math.max(this.bid, this.maxBid(p));
        for (let v = this.bid; v <= max; v += 5) out.push({ t: 'contract', p, v });
        if (this.rules.rospis) out.push({ t: 'rospis', p });
        break;
      }
      case 'play':
        for (const c of this.legalCards(p)) out.push({ t: 'play', p, card: c.id });
        break;
    }
    return out;
  }

  private activeBidders(): number[] {
    return [0, 1, 2].filter((i) => !this.passed[i]);
  }

  apply(a: TAction): boolean {
    this.events = [];
    if (a.p !== this.turn || this.phase === 'done') return false;
    switch (a.t) {
      case 'bid': {
        if (this.phase !== 'bid' || a.v < this.minRaise || a.v > this.maxBid(a.p) || a.v % 5 !== 0) return false;
        this.bid = a.v;
        this.bidder = a.p;
        this.lastBid[a.p] = a.v;
        this.events.push({ kind: 'bid', p: a.p, v: a.v });
        this.advanceBid();
        return true;
      }
      case 'pass': {
        if (this.phase !== 'bid') return false;
        this.passed[a.p] = true;
        this.lastBid[a.p] = -1;
        this.events.push({ kind: 'pass', p: a.p });
        this.advanceBid();
        return true;
      }
      case 'give': {
        if (this.phase !== 'discard' || a.p !== this.declarer || a.to === a.p || this.given[a.to] !== null) return false;
        const hand = this.hands[a.p];
        const i = hand.findIndex((c) => c.id === a.card);
        if (i < 0) return false;
        const [c] = hand.splice(i, 1);
        this.hands[a.to].push(c);
        sortHand(this.hands[a.to]);
        this.given[a.to] = c.id;
        this.events.push({ kind: 'give', p: a.p, card: c, to: a.to });
        if (this.given[next(a.p)] !== null && this.given[next(a.p, 2)] !== null) this.phase = 'contract';
        return true;
      }
      case 'contract': {
        if (this.phase !== 'contract' || a.v < this.bid || a.v % 5 !== 0 || a.v > Math.max(this.bid, this.maxBid(a.p))) return false;
        this.contract = a.v;
        this.phase = 'play';
        this.leader = a.p;
        this.turn = a.p;
        this.events.push({ kind: 'contract', p: a.p, v: a.v });
        return true;
      }
      case 'rospis': {
        if (this.phase !== 'contract' || !this.rules.rospis) return false;
        this.contract = this.bid;
        this.rospis = true;
        this.phase = 'done';
        this.events.push({ kind: 'rospis', p: a.p, v: this.bid });
        return true;
      }
      case 'play': {
        if (this.phase !== 'play') return false;
        const card = this.legalCards(a.p).find((c) => c.id === a.card);
        if (!card) return false;
        if (this.isMarriageLead(a.p, card)) {
          const v = MARRIAGE[card.suit] * this.rules.marriageX;
          this.marriages[a.p] += v;
          this.trump = card.suit;
          this.marriageLog.push({ p: a.p, suit: card.suit });
          this.events.push({ kind: 'marriage', p: a.p, suit: card.suit, v });
        }
        const hand = this.hands[a.p];
        hand.splice(hand.indexOf(card), 1);
        this.trick.push({ p: a.p, card });
        this.history.push({ p: a.p, card });
        this.events.push({ kind: 'play', p: a.p, card });
        if (this.trick.length < NP) {
          this.turn = next(a.p);
          return true;
        }
        const w = this.trick[trickWinner(this.trick, this.trump)].p;
        this.taken[w] += cardPoints(this.trick.map((x) => x.card));
        this.tricks[w]++;
        this.lastTrick = this.trick;
        this.trick = [];
        this.trickNo++;
        this.leader = w;
        this.turn = w;
        this.events.push({ kind: 'trick', p: w });
        if (this.trickNo >= TRICKS) {
          this.phase = 'done';
          this.events.push({ kind: 'done', p: this.declarer });
        }
        return true;
      }
    }
    return false;
  }

  private advanceBid(): void {
    const act = this.activeBidders();
    if (act.length === 1 || (act.length === 0 && this.bidder >= 0)) {
      this.finishBidding();
      return;
    }
    let t = next(this.turn);
    while (this.passed[t]) t = next(t);
    // Everyone else passed and it's back to the top bidder: bidding is over.
    if (t === this.bidder && act.length === 1) return this.finishBidding();
    this.turn = t;
  }

  private finishBidding(): void {
    const d = this.bidder;
    this.declarer = d;
    this.contract = this.bid;
    this.events.push({ kind: 'won', p: d, v: this.bid });
    this.events.push({ kind: 'prikup', p: d });
    this.hands[d].push(...this.prikup);
    this.prikup = [];
    sortHand(this.hands[d]);
    this.phase = 'discard';
    this.turn = d;
  }

  /** Raw deal result before match rules (barrel, bolts, 555): per-player delta. */
  rawResult(): { deltas: number[]; made: boolean; declPts: number; bolts: boolean[] } {
    const d = this.declarer;
    const deltas = [0, 0, 0];
    const bolts = [false, false, false];
    if (this.rospis) {
      for (let i = 0; i < NP; i++) {
        if (i === d) deltas[i] = -this.contract * this.rules.contractX;
        else deltas[i] = this.rules.rospisPay === 'sixty' ? 60 : round5(this.contract / 2);
      }
      return { deltas, made: false, declPts: 0, bolts };
    }
    const declPts = this.declPoints();
    const made = declPts >= this.contract;
    for (let i = 0; i < NP; i++) {
      if (i === d) deltas[i] = (made ? this.contract : -this.contract) * this.rules.contractX;
      else {
        deltas[i] = round5(this.taken[i] + this.marriages[i]);
        bolts[i] = this.tricks[i] === 0;
      }
    }
    return { deltas, made, declPts, bolts };
  }
}

export type Note = 'bolt' | 'bolt3' | 'barrelOn' | 'barrelWin' | 'barrelFail' | 'barrelOff' | 'samosval' | 'rospis' | 'made' | 'failed' | 'golden';

export interface Row {
  deal: number;
  declarer: number;
  contract: number;
  made: boolean;
  rospis: boolean;
  declPts: number;
  deltas: number[];
  scores: number[];
  notes: Note[][];
}

/** A whole match: deals until somebody reaches the target. */
export class Match {
  scores = [0, 0, 0];
  bolts = [0, 0, 0];
  /** Deals already spent on the barrel per player; -1 = not on the barrel. */
  barrel = [-1, -1, -1];
  dealer: number;
  dealNo = 0;
  deal!: Deal;
  rows: Row[] = [];
  over = false;
  winner = -1;

  constructor(public rules: TRules, public seed: number, dealer = 2, start?: number[]) {
    this.dealer = dealer;
    if (start) {
      this.scores = start.slice();
      if (rules.barrel) this.scores.forEach((s, i) => s >= barrelAt(rules) && s < rules.target && (this.barrel[i] = 0));
    }
  }

  /** Start the next deal (dealer moves clockwise). `pick` may choose among candidate seeds (lucky deal). */
  newDeal(pick?: (cands: Deal[]) => number, candidates = 1): Deal {
    this.dealNo++;
    if (this.dealNo > 1) this.dealer = next(this.dealer);
    const base = (this.seed + this.dealNo * 7919) >>> 0;
    if (pick && candidates > 1) {
      const cands = Array.from({ length: candidates }, (_, k) => new Deal(this.rules, this.dealer, (base + k * 104729) >>> 0));
      this.deal = cands[Math.max(0, Math.min(cands.length - 1, pick(cands)))];
    } else this.deal = new Deal(this.rules, this.dealer, base);
    return this.deal;
  }

  /** Reshuffle the current deal (redeal booster). */
  redeal(salt: number): Deal {
    this.deal = new Deal(this.rules, this.dealer, (this.seed + this.dealNo * 7919 + salt * 15485863) >>> 0);
    return this.deal;
  }

  onBarrel(p: number): boolean {
    return this.barrel[p] >= 0;
  }

  /** Apply the finished deal to the score sheet. */
  finishDeal(): Row {
    const r = this.rules;
    const d = this.deal;
    const raw = d.rawResult();
    const mult = r.golden && this.dealNo === 1 ? 2 : 1;
    const notes: Note[][] = [[], [], []];
    const deltas = [0, 0, 0];
    const before = this.scores.slice();
    const bAt = barrelAt(r);
    if (mult > 1) notes.forEach((n) => n.push('golden'));
    for (let p = 0; p < NP; p++) {
      const isDecl = p === d.declarer;
      let delta = raw.deltas[p] * mult;
      if (isDecl) notes[p].push(d.rospis ? 'rospis' : raw.made ? 'made' : 'failed');
      if (r.barrel && this.onBarrel(p)) {
        if (isDecl && !d.rospis && raw.made) {
          // Contract played from the barrel.
          const ns = this.scores[p] + delta;
          if (ns >= r.target) {
            this.scores[p] = ns;
            this.barrel[p] = -1;
            notes[p].push('barrelWin');
          } else this.scores[p] = Math.max(this.scores[p], Math.min(ns, bAt));
        } else if (isDecl) {
          this.scores[p] += delta;
          this.barrel[p] = -1;
          notes[p].push('barrelOff');
        } else delta = 0; // Defender points do not count on the barrel.
        deltas[p] = this.scores[p] - before[p];
        continue;
      }
      let ns = this.scores[p] + delta;
      if (ns >= r.target && (!r.barrel || (isDecl && raw.made && !d.rospis))) {
        this.scores[p] = ns;
      } else if (r.barrel && ns >= bAt) {
        this.scores[p] = bAt;
        this.barrel[p] = 0;
        notes[p].push('barrelOn');
        // Only one player sits on the barrel: the previous one falls off.
        for (let q = 0; q < NP; q++)
          if (q !== p && this.onBarrel(q)) {
            this.barrel[q] = -1;
            this.scores[q] -= 120;
            notes[q].push('barrelOff');
          }
      } else this.scores[p] = ns;
      deltas[p] = this.scores[p] - before[p];
    }
    // Bolts
    if (r.bolts && !d.rospis)
      for (let p = 0; p < NP; p++)
        if (raw.bolts[p]) {
          this.bolts[p]++;
          notes[p].push('bolt');
          if (this.bolts[p] >= 3) {
            this.bolts[p] = 0;
            this.scores[p] -= 120;
            if (this.onBarrel(p)) this.barrel[p] = -1;
            notes[p].push('bolt3');
          }
        }
    // Barrel tries
    if (r.barrel)
      for (let p = 0; p < NP; p++) {
        if (!this.onBarrel(p) || notes[p].includes('barrelOn')) continue;
        this.barrel[p]++;
        if (this.barrel[p] >= 3 && this.scores[p] < r.target) {
          this.barrel[p] = -1;
          this.scores[p] -= 120;
          notes[p].push('barrelFail');
        }
      }
    // Dump truck
    if (r.samosval)
      for (let p = 0; p < NP; p++)
        if (this.scores[p] === 555) {
          this.scores[p] = 0;
          notes[p].push('samosval');
        }
    for (let p = 0; p < NP; p++) deltas[p] = this.scores[p] - before[p];
    const row: Row = { deal: this.dealNo, declarer: d.declarer, contract: d.contract, made: raw.made, rospis: d.rospis, declPts: raw.declPts, deltas, scores: this.scores.slice(), notes };
    this.rows.push(row);
    const top = Math.max(...this.scores);
    if (top >= r.target) {
      this.over = true;
      this.winner = this.scores.indexOf(top);
    }
    return row;
  }
}
