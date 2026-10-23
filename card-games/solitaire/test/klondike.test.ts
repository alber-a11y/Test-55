import { describe, expect, it } from 'vitest';
import { findSolvableKlondike, Klondike, solveKlondike } from '../src/logic/klondike';

describe('Klondike', () => {
  it('deals correctly', () => {
    const g = new Klondike(42, 1);
    expect(g.pile('stock').cards.length).toBe(24);
    g.tabs.forEach((t, i) => {
      expect(t.cards.length).toBe(i + 1);
      expect(t.cards[i].up).toBe(true);
    });
    const ids = new Set(g.piles.flatMap((p) => p.cards.map((c) => c.id)));
    expect(ids.size).toBe(52);
  });

  it('draw / recycle / undo', () => {
    const g = new Klondike(7, 3);
    g.draw();
    expect(g.pile('waste').cards.length).toBe(3);
    for (let i = 0; i < 8; i++) g.draw();
    expect(g.pile('stock').cards.length).toBe(24);
    expect(g.passes).toBe(1);
    g.undo();
    expect(g.pile('waste').cards.length).toBe(24);
  });

  it('solver finds solvable deals and following hints wins', () => {
    let solved = 0;
    let wins = 0;
    const t0 = Date.now();
    for (let s = 1; s <= 20; s++) {
      const r = solveKlondike(new Klondike(s, 1), 30_000);
      if (r.result === 'solved') {
        solved++;
        const g = new Klondike(s, 1);
        for (let k = 0; k < 600 && !g.won; k++) {
          if (g.canAutoComplete) {
            const m = g.autoStep();
            if (m) {
              g.move(m);
              continue;
            }
          }
          const h = g.hint();
          if (!h) break;
          if (h.t === 'draw') g.draw();
          else g.move(h.m);
        }
        if (g.won) wins++;
      }
    }
    console.log('draw1 solved', solved, '/30, hint-play wins', wins, 'ms', Date.now() - t0);
    expect(solved).toBeGreaterThan(10);
    expect(wins).toBeGreaterThanOrEqual(solved - 2);
  }, 120000);

  it('finds solvable draw-3 deals quickly', () => {
    const t0 = Date.now();
    let ok = 0;
    for (let s = 100; s < 110; s++) {
      const seed = findSolvableKlondike(s * 1000, 3);
      if (solveKlondike(new Klondike(seed, 3), 30_000).result === 'solved') ok++;
    }
    console.log('draw3 solvable found', ok, '/10 in', Date.now() - t0, 'ms');
    expect(ok).toBeGreaterThan(7);
  }, 120000);
});
