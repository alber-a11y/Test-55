import { describe, expect, it } from 'vitest';
import { Rng } from '@shared/core/rng';
import { decide, PROFILES, type AIProfile } from '../src/logic/ai';
import { DEFAULT_RULES, Durak, type DRules } from '../src/logic/durak';

function play(rules: DRules, seed: number, profs: AIProfile[]): Durak {
  const g = new Durak(rules, seed);
  const rng = new Rng(seed * 7 + 1);
  let guard = 0;
  while (!g.over && guard++ < 3000) {
    let a = decide(g, g.actor, profs[g.actor], rng);
    if (!a) {
      g.autoResolve();
      const who = g.players.findIndex((_, i) => g.legal(i).length > 0);
      if (who < 0) break;
      a = decide(g, who, profs[who], rng);
      if (!a) break;
    }
    const ok = g.apply(a);
    if (!ok) throw new Error('illegal action ' + JSON.stringify(a) + ' phase ' + g.phase);
  }
  return g;
}

describe('Durak engine', () => {
  it('deals and picks trump', () => {
    const g = new Durak(DEFAULT_RULES, 1);
    expect(g.players[0].hand.length).toBe(6);
    expect(g.talon.length).toBe(24);
    expect(g.defender).not.toBe(g.attacker);
  });

  it('beats() respects trumps', () => {
    const g = new Durak(DEFAULT_RULES, 2);
    const ts = g.trumpSuit;
    const os = ((ts + 1) % 4) as 0;
    expect(g.beats({ id: 0, suit: os, rank: 10 }, { id: 1, suit: os, rank: 11 })).toBe(true);
    expect(g.beats({ id: 0, suit: os, rank: 14 }, { id: 1, suit: ts, rank: 6 })).toBe(true);
    expect(g.beats({ id: 0, suit: ts, rank: 7 }, { id: 1, suit: os, rank: 14 })).toBe(false);
  });

  for (const [name, rules] of [
    ['2p podkidnoy', { ...DEFAULT_RULES }],
    ['3p transfer', { ...DEFAULT_RULES, players: 3, transfer: true }],
    ['4p teams', { ...DEFAULT_RULES, players: 4, teams: true }],
    ['4p 52 cards', { ...DEFAULT_RULES, players: 4, deck: 52 }],
    ['2p 24 cards transfer', { ...DEFAULT_RULES, deck: 24, transfer: true }],
  ] as [string, DRules][]) {
    it(`bots finish games: ${name}`, () => {
      let over = 0;
      for (let s = 1; s <= 60; s++) {
        const g = play(rules, s, Array(rules.players).fill(PROFILES.amateur));
        if (g.over) over++;
        // Card conservation
        const total = g.players.reduce((a, p) => a + p.hand.length, 0) + g.talon.length + g.discard.length + g.table.reduce((a, x) => a + 1 + (x.def ? 1 : 0), 0);
        expect(total).toBe(rules.deck);
      }
      expect(over).toBe(60);
    });
  }

  it('stronger AI beats weaker more often', () => {
    let kingWins = 0;
    const N = 40;
    for (let s = 1; s <= N; s++) {
      const profs = s % 2 ? [PROFILES.master, PROFILES.novice] : [PROFILES.novice, PROFILES.master];
      const g = play(DEFAULT_RULES, 1000 + s, profs);
      const strong = s % 2 ? 0 : 1;
      if (g.loser !== null && g.loser !== strong) kingWins++;
    }
    console.log('master vs novice wins', kingWins, '/', N);
    expect(kingWins).toBeGreaterThan(N * 0.5);
  });
});
