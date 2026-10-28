import { expect, it } from 'vitest';
import { bestMove, puzzle, solve } from '../src/logic/puzzles';
import { Durak, DEFAULT_RULES } from '../src/logic/durak';

it('generates winnable puzzles quickly', () => {
  const t0 = Date.now();
  for (const n of [1, 2, 3, 7, 12, 20, 30]) {
    const p = puzzle(n);
    const g = new Durak({ ...DEFAULT_RULES, players: 2, firstBoutFive: false }, 1, 0);
    g.talon = [];
    g.trump = p.trump;
    g.players[0].hand = p.hands[0].map((c) => ({ ...c }));
    g.players[1].hand = p.hands[1].map((c) => ({ ...c }));
    g.firstBout = false;
    g.boutLimit = Math.min(6, g.players[1].hand.length);
    expect(solve(g.clone())).toBe(1);
    // Play the solution against a perfect opponent.
    let guard = 0;
    while (!g.over && guard++ < 200) {
      const who = g.phase === 'defend' ? g.defender : g.actor;
      const a = bestMove(g, who);
      if (!a) {
        g.autoResolve();
        continue;
      }
      g.apply(a);
      g.autoResolve();
    }
    expect(g.loser).toBe(1);
    console.log('puzzle', n, 'hands', p.hands[0].length, p.hands[1].length);
  }
  console.log('ms', Date.now() - t0);
}, 120000);
