import { describe, expect, it } from 'vitest';
import { generateLevel } from '../src/logic/tpGenerator';
import { solveTriPeaks, TriPeaks } from '../src/logic/tripeaks';

describe('TriPeaks generator', () => {
  it('generates solvable deterministic levels', { timeout: 120000 }, () => {
    const t0 = Date.now();
    for (let lv = 1; lv <= 60; lv++) {
      const def = generateLevel(lv);
      const g = new TriPeaks(def);
      const res = solveTriPeaks(g, 200_000);
      expect(res.draws, `level ${lv}`).toBeGreaterThanOrEqual(0);
      expect(def.stock.length).toBeGreaterThan(0);
    }
    const ms = Date.now() - t0;
    console.log('60 levels in', ms, 'ms');
  });

  it('is deterministic', () => {
    const a = generateLevel(137);
    const b = JSON.parse(JSON.stringify(generateLevel(137)));
    expect(JSON.parse(JSON.stringify(a))).toEqual(b);
  });

  it('plays, undoes and detects loss', () => {
    const g = new TriPeaks(generateLevel(3));
    const before = g.key();
    g.apply({ t: 'draw' });
    expect(g.key()).not.toBe(before);
    g.undo();
    expect(g.key()).toBe(before);
    while (g.stockLeft > 0) g.apply({ t: 'draw' });
    if (g.playable().length === 0 && g.jokers === 0) expect(g.lost).toBe(true);
  });

  it('greedy hint player wins easy levels', () => {
    let wins = 0;
    for (let lv = 1; lv <= 10; lv++) {
      const g = new TriPeaks(generateLevel(lv));
      for (let k = 0; k < 400 && !g.won && !g.lost; k++) {
        const h = g.hint();
        if (!h) break;
        g.apply(h);
      }
      if (g.won) wins++;
    }
    console.log('greedy wins', wins, '/ 10');
    expect(wins).toBeGreaterThanOrEqual(3);
  });
});
