import type { Suit } from '@shared/cards/card';
import { Rng } from '@shared/core/rng';

/** Durak card: rank 2..14 (Ace = 14). */
export interface DCard {
  id: number;
  suit: Suit;
  rank: number;
}

export interface DRules {
  players: number;
  /** 24, 36 or 52 cards. */
  deck: 24 | 36 | 52;
  /** Переводной: the defender may pass the attack on with a card of the same rank. */
  transfer: boolean;
  /** 2×2: players 0 & 2 vs 1 & 3. */
  teams: boolean;
  /** Шулер: illegal moves are possible and can be caught. */
  cheat: boolean;
  /** First bout of the game is limited to 5 cards. */
  firstBoutFive: boolean;
}

export const DEFAULT_RULES: DRules = { players: 2, deck: 36, transfer: false, teams: false, cheat: false, firstBoutFive: true };

export interface Pair {
  atk: DCard;
  def: DCard | null;
  /** Player who placed the attack card. */
  by: number;
  /** Cheat flags (only in cheat mode). */
  atkCheat?: boolean;
  defCheat?: boolean;
}

export type Phase = 'attack' | 'defend' | 'take' | 'over';

export type DAction =
  | { t: 'attack'; p: number; card: number }
  | { t: 'defend'; p: number; card: number; pair: number }
  | { t: 'transfer'; p: number; card: number }
  | { t: 'take'; p: number }
  | { t: 'pass'; p: number }
  | { t: 'catch'; p: number };

export interface DEvent {
  kind: 'attack' | 'defend' | 'transfer' | 'take' | 'pass' | 'beaten' | 'took' | 'draw' | 'out' | 'over' | 'caught' | 'falseCatch';
  p?: number;
  cards?: DCard[];
}

export interface PlayerState {
  hand: DCard[];
  out: boolean;
  /** Finished position (1 = first out). */
  place: number;
}

export const RANK_MIN: Record<24 | 36 | 52, number> = { 24: 9, 36: 6, 52: 2 };

export class Durak {
  players: PlayerState[];
  talon: DCard[];
  trump: DCard;
  discard: DCard[] = [];
  table: Pair[] = [];
  attacker = 0;
  defender = 1;
  /** Player whose move it is. */
  actor = 0;
  phase: Phase = 'attack';
  /** Attackers who passed since the last change on the table. */
  passed = new Set<number>();
  /** Hand size of the defender when the bout started (throw-in limit). */
  boutLimit = 6;
  firstBout = true;
  /** Order in which players got rid of their cards. */
  finished: number[] = [];
  loser: number | null = null;
  draw = false;
  /** Cards each player has been seen holding (taken from the table) — for AI memory. */
  known: Set<number>[];
  /** Cards removed from play (discard) are public. */
  bouts = 0;
  events: DEvent[] = [];
  /** Who placed a cheat card that can still be caught. */
  catchable: { p: number; pair: number } | null = null;

  constructor(readonly rules: DRules, readonly seed: number, firstAttacker?: number) {
    const rng = new Rng(seed);
    const min = RANK_MIN[rules.deck];
    const deck: DCard[] = [];
    let id = 0;
    for (let s = 0; s < 4; s++) for (let r = min; r <= 14; r++) deck.push({ id: id++, suit: s as Suit, rank: r });
    rng.shuffle(deck);
    this.players = Array.from({ length: rules.players }, () => ({ hand: [], out: false, place: 0 }));
    this.known = this.players.map(() => new Set<number>());
    // Talon: index 0 is the bottom (trump shown face up), last is the top.
    this.talon = deck;
    for (let k = 0; k < 6; k++) for (const p of this.players) p.hand.push(this.talon.pop()!);
    this.trump = this.talon[0] ?? this.players[rules.players - 1].hand[0];
    let first = firstAttacker;
    if (first === undefined) {
      // Lowest trump starts.
      let best = 99;
      first = 0;
      this.players.forEach((p, i) =>
        p.hand.forEach((c) => {
          if (c.suit === this.trump.suit && c.rank < best) {
            best = c.rank;
            first = i;
          }
        }),
      );
    }
    this.attacker = first;
    this.defender = this.nextOpponent(first);
    this.actor = first;
    this.boutLimit = Math.min(this.players[this.defender].hand.length, this.maxBout());
    for (const p of this.players) this.sortHand(p.hand);
  }

  get trumpSuit(): Suit {
    return this.trump.suit;
  }

  maxBout(): number {
    return this.firstBout && this.rules.firstBoutFive ? 5 : 6;
  }

  sortHand(h: DCard[]): void {
    const ts = this.trump.suit;
    h.sort((a, b) => (a.suit === ts ? 1 : 0) - (b.suit === ts ? 1 : 0) || a.suit - b.suit || a.rank - b.rank);
  }

  /** Next player clockwise who still has cards (or can still get them). */
  nextActive(i: number): number {
    const n = this.players.length;
    for (let k = 1; k <= n; k++) {
      const j = (i + k) % n;
      if (!this.players[j].out) return j;
    }
    return i;
  }

  /** Next active player who is not on i's team (the one i attacks). */
  nextOpponent(i: number): number {
    const n = this.players.length;
    for (let k = 1; k <= n; k++) {
      const j = (i + k) % n;
      if (!this.players[j].out && !this.isTeammate(i, j)) return j;
    }
    return this.nextActive(i);
  }

  isTeammate(a: number, b: number): boolean {
    return this.rules.teams && a % 2 === b % 2;
  }

  beats(atk: DCard, def: DCard): boolean {
    const ts = this.trump.suit;
    if (def.suit === atk.suit) return def.rank > atk.rank;
    return def.suit === ts && atk.suit !== ts;
  }

  get unbeaten(): number[] {
    return this.table.map((p, i) => (p.def ? -1 : i)).filter((i) => i >= 0);
  }

  get tableRanks(): Set<number> {
    const s = new Set<number>();
    for (const p of this.table) {
      s.add(p.atk.rank);
      if (p.def) s.add(p.def.rank);
    }
    return s;
  }

  /** Players allowed to throw in (everyone except the defender, and teammates of the defender in 2×2). */
  isAttackerSide(p: number): boolean {
    return p !== this.defender && !this.players[p].out && !this.isTeammate(p, this.defender);
  }

  private card(p: number, id: number): DCard | undefined {
    return this.players[p].hand.find((c) => c.id === id);
  }

  canAttackWith(p: number, c: DCard): boolean {
    if (this.phase === 'over' || this.phase === 'defend') return false;
    if (!this.isAttackerSide(p)) return false;
    if (!this.table.length) return p === this.attacker && this.phase === 'attack';
    if (this.table.length >= this.boutLimit) return false;
    // Unbeaten cards may not exceed what the defender can still cover.
    if (this.phase === 'attack' && this.unbeaten.length >= this.players[this.defender].hand.length) return false;
    return this.tableRanks.has(c.rank);
  }

  canTransferWith(p: number, c: DCard): boolean {
    if (!this.rules.transfer || this.phase !== 'defend' || p !== this.defender) return false;
    if (!this.table.length || this.table.some((x) => x.def)) return false;
    if (this.table.some((x) => x.atk.rank !== c.rank)) return false;
    const next = this.nextOpponent(this.defender);
    if (next === this.defender) return false;
    return this.players[next].hand.length >= this.table.length + 1 && this.table.length + 1 <= this.maxBout();
  }

  /** All legal actions of player p right now. */
  legal(p: number): DAction[] {
    const out: DAction[] = [];
    if (this.phase === 'over' || this.players[p].out) return out;
    const hand = this.players[p].hand;
    if (this.phase === 'defend' && p === this.defender) {
      for (const pi of this.unbeaten) for (const c of hand) if (this.beats(this.table[pi].atk, c)) out.push({ t: 'defend', p, card: c.id, pair: pi });
      for (const c of hand) if (this.canTransferWith(p, c)) out.push({ t: 'transfer', p, card: c.id });
      out.push({ t: 'take', p });
      return out;
    }
    if ((this.phase === 'attack' || this.phase === 'take') && this.isAttackerSide(p)) {
      for (const c of hand) if (this.canAttackWith(p, c)) out.push({ t: 'attack', p, card: c.id });
      if (this.table.length) out.push({ t: 'pass', p });
    }
    return out;
  }

  /** Players who may act now (for UI: the human can throw in out of turn). */
  canAct(p: number): boolean {
    return this.legal(p).length > 0;
  }

  apply(a: DAction): boolean {
    this.events = [];
    switch (a.t) {
      case 'attack':
        return this.doAttack(a.p, a.card, false);
      case 'defend':
        return this.doDefend(a.p, a.card, a.pair, false);
      case 'transfer':
        return this.doTransfer(a.p, a.card);
      case 'take':
        return this.doTake(a.p);
      case 'pass':
        return this.doPass(a.p);
      case 'catch':
        return this.doCatch(a.p);
    }
  }

  /** Cheat mode: play an illegal card on purpose. */
  cheat(a: { t: 'attack'; p: number; card: number } | { t: 'defend'; p: number; card: number; pair: number }): boolean {
    if (!this.rules.cheat) return false;
    this.events = [];
    return a.t === 'attack' ? this.doAttack(a.p, a.card, true) : this.doDefend(a.p, a.card, a.pair, true);
  }

  private take(p: number, id: number): DCard | null {
    const h = this.players[p].hand;
    const i = h.findIndex((c) => c.id === id);
    if (i < 0) return null;
    return h.splice(i, 1)[0];
  }

  private doAttack(p: number, id: number, cheat: boolean): boolean {
    const c = this.card(p, id);
    if (!c) return false;
    const legal = this.canAttackWith(p, c);
    if (!legal) {
      if (!cheat || !this.isAttackerSide(p) || this.phase === 'defend' || this.phase === 'over' || !this.table.length || this.table.length >= this.boutLimit) return false;
    }
    this.take(p, id);
    const isCheat = !legal;
    this.table.push({ atk: c, def: null, by: p, atkCheat: isCheat || undefined });
    if (isCheat) this.catchable = { p, pair: this.table.length - 1 };
    this.passed.clear();
    this.events.push({ kind: 'attack', p, cards: [c] });
    if (this.phase === 'attack') {
      this.phase = 'defend';
      this.actor = this.defender;
    }
    // In 'take' phase cards just pile up; the actor stays in the throw-in rotation.
    else this.actor = this.nextThrower(p);
    this.checkPlayerOut(p);
    return true;
  }

  private doDefend(p: number, id: number, pair: number, cheat: boolean): boolean {
    if (this.phase !== 'defend' || p !== this.defender) return false;
    const c = this.card(p, id);
    const pr = this.table[pair];
    if (!c || !pr || pr.def) return false;
    const legal = this.beats(pr.atk, c);
    if (!legal && !cheat) return false;
    this.take(p, id);
    pr.def = c;
    if (!legal) {
      pr.defCheat = true;
      this.catchable = { p, pair };
    }
    this.events.push({ kind: 'defend', p, cards: [c] });
    if (!this.unbeaten.length) {
      this.phase = 'attack';
      this.passed.clear();
      this.actor = this.attacker;
      if (!this.isAttackerSide(this.actor)) this.actor = this.nextThrower(this.actor);
    }
    this.checkPlayerOut(p);
    return true;
  }

  private doTransfer(p: number, id: number): boolean {
    const c = this.card(p, id);
    if (!c || !this.canTransferWith(p, c)) return false;
    this.take(p, id);
    this.table.push({ atk: c, def: null, by: p });
    this.events.push({ kind: 'transfer', p, cards: [c] });
    this.attacker = p;
    this.defender = this.nextOpponent(p);
    this.boutLimit = Math.min(this.maxBout(), this.players[this.defender].hand.length + this.table.length);
    this.actor = this.defender;
    this.passed.clear();
    this.checkPlayerOut(p);
    return true;
  }

  private doTake(p: number): boolean {
    if (this.phase !== 'defend' || p !== this.defender) return false;
    this.phase = 'take';
    this.passed.clear();
    this.events.push({ kind: 'take', p });
    // The limit for throwing in "вдогонку": defender's cards at bout start.
    this.actor = this.attacker;
    if (!this.isAttackerSide(this.actor)) this.actor = this.nextThrower(this.actor);
    return true;
  }

  private doPass(p: number): boolean {
    if (!this.isAttackerSide(p) || !this.table.length || this.phase === 'defend' || this.phase === 'over') return false;
    this.passed.add(p);
    this.events.push({ kind: 'pass', p });
    const throwers = this.players.map((_, i) => i).filter((i) => this.isAttackerSide(i));
    if (throwers.every((i) => this.passed.has(i) || !this.legal(i).some((a) => a.t === 'attack'))) {
      this.endBout();
    } else this.actor = this.nextThrower(p);
    return true;
  }

  /** Accuse the last cheater. Success: the cheater takes the table. Failure: the accuser draws a card. */
  private doCatch(p: number): boolean {
    if (!this.rules.cheat || this.phase === 'over') return false;
    const c = this.catchable;
    if (c && c.p !== p && !this.isTeammate(c.p, p)) {
      this.events.push({ kind: 'caught', p: c.p });
      const cards = this.table.flatMap((x) => (x.def ? [x.atk, x.def] : [x.atk]));
      this.players[c.p].hand.push(...cards);
      for (const k of cards) this.known[c.p].add(k.id);
      this.sortHand(this.players[c.p].hand);
      this.table = [];
      this.catchable = null;
      const cheaterWasDefender = c.p === this.defender;
      this.finishBout(cheaterWasDefender);
      return true;
    }
    this.events.push({ kind: 'falseCatch', p });
    if (this.talon.length) {
      const k = this.talon.pop()!;
      this.players[p].hand.push(k);
      this.sortHand(this.players[p].hand);
    }
    return true;
  }

  private nextThrower(from: number): number {
    const n = this.players.length;
    for (let k = 1; k <= n; k++) {
      const j = (from + k) % n;
      if (this.isAttackerSide(j) && !this.passed.has(j)) return j;
    }
    return this.attacker;
  }

  private endBout(): void {
    if (this.phase === 'take') {
      const cards = this.table.flatMap((x) => (x.def ? [x.atk, x.def] : [x.atk]));
      const d = this.defender;
      this.players[d].hand.push(...cards);
      for (const k of cards) this.known[d].add(k.id);
      this.sortHand(this.players[d].hand);
      this.events.push({ kind: 'took', p: d, cards });
      this.table = [];
      this.finishBout(true);
    } else {
      const cards = this.table.flatMap((x) => (x.def ? [x.atk, x.def] : [x.atk]));
      this.discard.push(...cards);
      this.events.push({ kind: 'beaten', cards });
      this.table = [];
      this.finishBout(false);
    }
  }

  /** Refill hands, decide who is out, set up the next bout. */
  private finishBout(defenderTook: boolean): void {
    this.catchable = null;
    this.firstBout = false;
    this.bouts++;
    // Refill: attacker first, then other throwers clockwise, defender last.
    const order: number[] = [];
    const n = this.players.length;
    for (let k = 0; k < n; k++) {
      const j = (this.attacker + k) % n;
      if (j !== this.defender) order.push(j);
    }
    order.push(this.defender);
    for (const i of order) {
      const h = this.players[i].hand;
      const got: DCard[] = [];
      while (h.length < 6 && this.talon.length) got.push(this.talon.pop()!);
      if (got.length) {
        h.push(...got);
        this.sortHand(h);
        this.events.push({ kind: 'draw', p: i, cards: got });
      }
    }
    for (let i = 0; i < n; i++) this.checkPlayerOut(i);
    if (this.checkOver()) return;
    // Next attacker
    const prevDef = this.defender;
    let next = defenderTook ? this.nextActive(prevDef) : this.players[prevDef].out ? this.nextActive(prevDef) : prevDef;
    if (this.players[next].out) next = this.nextActive(next);
    this.attacker = next;
    this.defender = this.nextOpponent(next);
    this.phase = 'attack';
    this.actor = next;
    this.passed.clear();
    this.boutLimit = Math.min(this.players[this.defender].hand.length, this.maxBout());
  }

  private checkPlayerOut(i: number): void {
    const p = this.players[i];
    if (p.out || p.hand.length || this.talon.length) return;
    // A defender with cards on the table to beat is still in the game.
    if (i === this.defender && this.table.length && this.phase !== 'over' && this.unbeaten.length) return;
    p.out = true;
    this.finished.push(i);
    p.place = this.finished.length;
    this.events.push({ kind: 'out', p: i });
  }

  private checkOver(): boolean {
    const active = this.players.map((p, i) => (p.out ? -1 : i)).filter((i) => i >= 0);
    let over = false;
    if (this.rules.teams) {
      const teamsLeft = new Set(active.map((i) => i % 2));
      if (teamsLeft.size <= 1) over = true;
    } else if (active.length <= 1) over = true;
    if (!over) return false;
    this.phase = 'over';
    if (active.length === 0) this.draw = true;
    else this.loser = active[0];
    this.events.push({ kind: 'over' });
    return true;
  }

  /** Mid-bout end check (everyone ran out of cards during a bout). */
  get over(): boolean {
    return this.phase === 'over';
  }

  /** The defender beat everything and has no cards: the bout ends automatically. */
  autoResolve(): void {
    if (this.phase === 'attack' && this.table.length && !this.unbeaten.length) {
      const throwers = this.players.map((_, i) => i).filter((i) => this.isAttackerSide(i));
      const anyCan = throwers.some((i) => this.legal(i).some((a) => a.t === 'attack'));
      if (!anyCan) this.endBout();
    }
    if (this.phase === 'take') {
      const throwers = this.players.map((_, i) => i).filter((i) => this.isAttackerSide(i));
      const anyCan = throwers.some((i) => this.legal(i).some((a) => a.t === 'attack'));
      if (!anyCan) this.endBout();
    }
  }

  /** Deep copy for search. */
  clone(): Durak {
    const c = Object.create(Durak.prototype) as Durak;
    Object.assign(c, this);
    c.players = this.players.map((p) => ({ ...p, hand: p.hand.slice() }));
    c.talon = this.talon.slice();
    c.discard = this.discard.slice();
    c.table = this.table.map((p) => ({ ...p }));
    c.passed = new Set(this.passed);
    c.finished = this.finished.slice();
    c.known = this.known.map((k) => new Set(k));
    c.events = [];
    c.catchable = this.catchable ? { ...this.catchable } : null;
    return c;
  }
}
