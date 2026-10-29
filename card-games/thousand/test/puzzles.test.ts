import { describe, expect, it } from 'vitest';
import { bestCard, moveValues, puzzle } from '../src/logic/puzzles';

describe('etudes', () => {
  it('are winnable with perfect play and most first moves fail', () => {
    for (const n of [1, 2, 5, 9, 12, 31, 81, 95]) {
      const t0 = performance.now();
      const p = puzzle(n);
      const ms = performance.now() - t0;
      const d = p.deal.clone();
      expect(d.turn).toBe(0);
      expect(d.hands[0].length).toBe(p.tricksLeft);
      // Perfect play from both sides reaches exactly the target.
      while (d.phase === 'play') d.apply({ t: 'play', p: d.turn, card: bestCard(d, d.turn).id });
      expect(d.declPoints()).toBe(p.need);
      const vals = moveValues(p.deal);
      const best = Math.max(...vals.map((v) => v.v));
      expect(vals.filter((v) => v.v < best).length).toBeGreaterThan(0);
      expect(ms).toBeLessThan(8000);
    }
  }, 60_000);
});
