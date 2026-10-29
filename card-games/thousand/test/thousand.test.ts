import { describe, expect, it } from 'vitest';
import { Rng } from '@shared/core/rng';
import { chooseBid, chooseCard, chooseContract, chooseDiscard, decide, PROFILES, sampleWorld, type AIProfile } from '../src/logic/ai';
import { cardPoints, Deal, DEFAULT_RULES, makeDeck, Match, maxBidFor, round5, trickWinner, type TCard, type TRules } from '../src/logic/thousand';

const C = (suit: number, rank: number): TCard => ({ id: suit * 6 + [9, 10, 11, 12, 13, 14].indexOf(rank), suit: suit as 0, rank });

/** Plays a deal to the end with the given bot profiles. */
function playDeal(d: Deal, profs: AIProfile[], rng: Rng): void {
  let guard = 0;
  while (d.phase !== 'done' && guard++ < 200) {
    const p = d.turn;
    const acts = decide(d, p, profs[p], rng);
    for (const a of acts) expect(d.apply(a)).toBe(true);
  }
  expect(d.phase).toBe('done');
}

describe('deck and basics', () => {
  it('has 24 cards worth 120 points', () => {
    const deck = makeDeck();
    expect(deck.length).toBe(24);
    expect(cardPoints(deck)).toBe(120);
  });
  it('rounds to 5', () => {
    expect(round5(12)).toBe(10);
    expect(round5(13)).toBe(15);
    expect(round5(0)).toBe(0);
    expect(round5(117)).toBe(115);
  });
  it('max bid counts marriages', () => {
    expect(maxBidFor([C(1, 13), C(1, 12), C(0, 14)])).toBe(220);
    expect(maxBidFor([C(0, 13), C(0, 12), C(3, 13), C(3, 12)])).toBe(220);
    expect(maxBidFor([C(2, 13), C(0, 14)])).toBe(120);
  });
  it('trick winner: lead suit, trumps, order A > 10 > K', () => {
    const t = (cs: TCard[]) => cs.map((card, p) => ({ p, card }));
    expect(trickWinner(t([C(0, 13), C(0, 10), C(0, 14)]), null)).toBe(2);
    expect(trickWinner(t([C(0, 13), C(0, 10), C(1, 14)]), null)).toBe(1);
    expect(trickWinner(t([C(0, 14), C(1, 9), C(0, 10)]), 1)).toBe(1);
  });
});

describe('deal flow', () => {
  it('deals 7/7/7 + 3 and opens with 100 after the dealer', () => {
    const d = new Deal(DEFAULT_RULES, 2, 123);
    expect(d.hands.map((h) => h.length)).toEqual([7, 7, 7]);
    expect(d.prikup.length).toBe(3);
    expect(d.bid).toBe(100);
    expect(d.bidder).toBe(0);
    expect(d.turn).toBe(1);
  });
  it('two passes give the contract to the forced bidder', () => {
    const d = new Deal(DEFAULT_RULES, 2, 5);
    expect(d.apply({ t: 'pass', p: 1 })).toBe(true);
    expect(d.apply({ t: 'pass', p: 2 })).toBe(true);
    expect(d.phase).toBe('discard');
    expect(d.declarer).toBe(0);
    expect(d.hands[0].length).toBe(10);
  });
  it('rejects bids above the marriage limit and illegal cards', () => {
    const d = new Deal(DEFAULT_RULES, 2, 9);
    expect(d.apply({ t: 'bid', p: 1, v: d.maxBid(1) + 5 })).toBe(false);
    expect(d.apply({ t: 'bid', p: 1, v: 103 })).toBe(false);
    expect(d.apply({ t: 'bid', p: 2, v: 105 })).toBe(false); // not his turn
  });
  it('declares a marriage only after the first trick and sets the trump', () => {
    const d = new Deal(DEFAULT_RULES, 2, null);
    d.hands = [
      [C(1, 13), C(1, 12), C(0, 14), C(2, 9), C(3, 9), C(0, 9), C(2, 10), C(3, 10)],
      [C(0, 10), C(0, 13), C(0, 12), C(0, 11), C(2, 14), C(2, 13), C(2, 12), C(2, 11)],
      [C(1, 14), C(1, 10), C(1, 11), C(1, 9), C(3, 14), C(3, 13), C(3, 12), C(3, 11)],
    ];
    d.phase = 'play';
    d.declarer = 0;
    d.contract = 100;
    d.turn = 0;
    expect(d.isMarriageLead(0, d.hands[0][0])).toBe(false);
    d.apply({ t: 'play', p: 0, card: C(0, 14).id });
    d.apply({ t: 'play', p: 1, card: C(0, 9 + 1).id });
    d.apply({ t: 'play', p: 2, card: C(1, 9).id });
    expect(d.turn).toBe(0);
    expect(d.isMarriageLead(0, C(1, 13))).toBe(true);
    d.apply({ t: 'play', p: 0, card: C(1, 13).id });
    expect(d.trump).toBe(1);
    expect(d.marriages[0]).toBe(100);
    // Player 1 has no hearts: must play a trump if he has one — he has none, any card.
    expect(d.legalCards(1).length).toBe(7);
  });
});

describe('match scoring', () => {
  const rules: TRules = { ...DEFAULT_RULES };
  it('declarer gets ±contract, defenders rounded points', () => {
    const m = new Match(rules, 1);
    const d = m.newDeal();
    d.declarer = 0;
    d.contract = 120;
    d.taken = [70, 33, 17];
    d.tricks = [5, 2, 1];
    d.marriages = [60, 0, 0];
    d.phase = 'done';
    const row = m.finishDeal();
    expect(row.deltas).toEqual([120, 35, 15]);
    expect(row.made).toBe(true);
  });
  it('failed contract is negative and bolts accumulate', () => {
    const m = new Match(rules, 1);
    for (let k = 0; k < 3; k++) {
      const d = m.newDeal();
      d.declarer = 0;
      d.contract = 100;
      d.taken = [60, 60, 0];
      d.tricks = [4, 4, 0];
      d.phase = 'done';
      m.finishDeal();
    }
    expect(m.scores[0]).toBe(-300);
    expect(m.scores[2]).toBe(-120);
    expect(m.bolts[2]).toBe(0);
  });
  it('barrel: defenders stop at 880, three tries then -120', () => {
    const m = new Match(rules, 1, 2, [860, 0, 0]);
    const finish = (decl: number, made: boolean, taken: number[]) => {
      const d = m.newDeal();
      d.declarer = decl;
      d.contract = 100;
      d.taken = made ? taken : taken;
      d.tricks = [2, 3, 3];
      d.phase = 'done';
      return m.finishDeal();
    };
    finish(1, true, [40, 80, 0]);
    expect(m.scores[0]).toBe(880);
    expect(m.onBarrel(0)).toBe(true);
    finish(1, true, [30, 90, 0]);
    expect(m.scores[0]).toBe(880);
    finish(1, true, [30, 90, 0]);
    finish(1, true, [30, 90, 0]);
    expect(m.onBarrel(0)).toBe(false);
    expect(m.scores[0]).toBe(760);
  });
  it('barrel: own contract finishes the match', () => {
    const m = new Match(rules, 1, 2, [880, 0, 0]);
    const d = m.newDeal();
    d.declarer = 0;
    d.contract = 120;
    d.taken = [125, 0, 0];
    d.tricks = [8, 0, 0];
    d.phase = 'done';
    m.finishDeal();
    expect(m.over).toBe(true);
    expect(m.winner).toBe(0);
  });
  it('555 resets to zero', () => {
    const m = new Match(rules, 1, 2, [455, 0, 0]);
    const d = m.newDeal();
    d.declarer = 0;
    d.contract = 100;
    d.taken = [100, 10, 10];
    d.tricks = [6, 1, 1];
    d.phase = 'done';
    const row = m.finishDeal();
    expect(m.scores[0]).toBe(0);
    expect(row.notes[0]).toContain('samosval');
  });
  it('rospis: declarer -bid, others 60', () => {
    const m = new Match(rules, 1);
    const d = m.newDeal();
    d.apply({ t: 'pass', p: d.turn });
    d.apply({ t: 'pass', p: d.turn });
    const p = d.declarer;
    const [a, b] = [d.hands[p][0].id, d.hands[p][1].id];
    d.apply({ t: 'give', p, card: a, to: (p + 1) % 3 });
    d.apply({ t: 'give', p, card: b, to: (p + 2) % 3 });
    expect(d.apply({ t: 'rospis', p })).toBe(true);
    const row = m.finishDeal();
    expect(row.deltas[p]).toBe(-100);
    expect(row.deltas[(p + 1) % 3]).toBe(60);
  });
});

describe('bots', () => {
  it('play full deals legally at every level and keep 120 card points', () => {
    const rng = new Rng(77);
    const levels = [PROFILES.novice, PROFILES.amateur, PROFILES.master];
    for (let s = 0; s < 12; s++) {
      const d = new Deal(DEFAULT_RULES, s % 3, 1000 + s);
      playDeal(d, [0, 1, 2].map((i) => levels[(i + s) % 3]), rng);
      if (!d.rospis) {
        expect(d.taken.reduce((a, b) => a + b, 0)).toBe(120);
        expect(d.tricks.reduce((a, b) => a + b, 0)).toBe(8);
      }
    }
  });
  it('sampled worlds keep hand sizes and never move my cards', () => {
    const rng = new Rng(3);
    const d = new Deal(DEFAULT_RULES, 0, 42);
    const w = sampleWorld(d, 1, rng);
    expect(w.hands[1].map((c) => c.id)).toEqual(d.hands[1].map((c) => c.id));
    expect(w.hands[0].length).toBe(7);
    expect(w.prikup.length).toBe(3);
    const ids = new Set([...w.hands.flat(), ...w.prikup].map((c) => c.id));
    expect(ids.size).toBe(24);
  });
  it('a strong bot outscores weak bots over many deals', () => {
    const rng = new Rng(11);
    let strong = 0;
    let weak = 0;
    for (let s = 0; s < 30; s++) {
      const m = new Match(DEFAULT_RULES, 500 + s, s % 3);
      const d = m.newDeal();
      const profs = [PROFILES.master, PROFILES.novice, PROFILES.novice];
      let guard = 0;
      while (d.phase !== 'done' && guard++ < 200) {
        const p = d.turn;
        const prof = profs[p];
        if (d.phase === 'bid') d.apply(chooseBid(d, p, prof, rng));
        else if (d.phase === 'discard') chooseDiscard(d, p, prof, rng).forEach((g) => d.apply({ t: 'give', p, card: g.card, to: g.to }));
        else if (d.phase === 'contract') d.apply(chooseContract(d, p, prof, rng));
        else d.apply({ t: 'play', p, card: chooseCard(d, p, prof, rng).id });
      }
      const row = m.finishDeal();
      strong += row.deltas[0];
      weak += (row.deltas[1] + row.deltas[2]) / 2;
    }
    expect(strong).toBeGreaterThan(weak);
  }, 60_000);
});
