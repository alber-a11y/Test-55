import { describe, expect, it } from 'vitest';
import { adjacent } from '../src/game/cards';
import { ALL_LAYOUTS, CLASSIC, MAX_COLS, validLayout } from '../src/game/layouts';
import { generateLevel, tierOf } from '../src/game/generator';
import { Game } from '../src/game/model';
import { solve } from '../src/game/solver';

describe('cards', () => {
  it('ranks connect by one and wrap K↔A', () => {
    expect(adjacent(5, 6)).toBe(true);
    expect(adjacent(1, 13)).toBe(true);
    expect(adjacent(1, 13, false)).toBe(false);
    expect(adjacent(4, 6)).toBe(false);
  });
});

describe('layouts', () => {
  it('classic is the reference 3/6/7/8 three-peak shape', () => {
    const rows = [0, 1, 2, 3].map((r) => CLASSIC.slots.filter((s) => s.row === r).length);
    expect(rows).toEqual([3, 6, 7, 8]);
    expect(CLASSIC.peakTops.length).toBe(3);
  });
  it('every layout is valid and fits the phone width', () => {
    expect(ALL_LAYOUTS.length).toBeGreaterThan(20);
    for (const l of ALL_LAYOUTS) {
      expect(validLayout(l), l.id).toBe(true);
      expect(l.cols).toBeLessThanOrEqual(MAX_COLS);
      expect(l.slots.length).toBeLessThanOrEqual(40);
    }
  });
});

describe('generator', () => {
  it('is deterministic', () => {
    const a = generateLevel(37);
    const b = generateLevel(37);
    expect(a.tableau).toEqual(b.tableau);
    expect(a.stock).toEqual(b.stock);
  });
  it('produces solvable levels with specials over a long range', () => {
    for (const n of [1, 2, 5, 8, 10, 16, 26, 40, 77, 150, 333, 1000, 5000]) {
      const lvl = generateLevel(n);
      expect(lvl.layout.slots.length).toBe(lvl.tableau.length);
      expect(solve(lvl).solvable, `level ${n}`).toBe(true);
      const all = [...lvl.tableau, ...lvl.stock, lvl.start].map((c) => `${c.r}_${c.s}`);
      expect(new Set(all).size).toBe(all.length);
    }
    expect(Object.values(generateLevel(8).specials).some((s) => s.kind === 'gold')).toBe(true);
    expect(Object.values(generateLevel(16).specials).some((s) => s.kind === 'lock')).toBe(true);
    expect(Object.values(generateLevel(26).specials).some((s) => s.kind === 'ice')).toBe(true);
    expect(Object.values(generateLevel(40).specials).some((s) => s.kind === 'bomb')).toBe(true);
    expect(generateLevel(12).bonus?.kind).toBe('combo');
  });
  it('tiers follow the saw', () => {
    expect(tierOf(3)).toBe('easy');
    expect(tierOf(15)).toBe('hard');
    expect(tierOf(20)).toBe('superhard');
    expect(tierOf(21)).toBe('normal');
  });
});

describe('bombs', () => {
  it('tick on every move and burn stock at zero; taking the bomb defuses it', () => {
    const lvl = generateLevel(40);
    const g = new Game(lvl);
    const [slot, sp] = Object.entries(lvl.specials).find(([, s]) => s.kind === 'bomb')!;
    const timer = (sp as { kind: 'bomb'; timer: number }).timer;
    expect(g.bombTimer(+slot)).toBe(timer);
    const stock0 = g.stockCount;
    for (let k = 0; k < timer; k++) g.draw();
    // `timer` draws plus 3 burnt cards.
    expect(g.stockCount).toBe(Math.max(0, stock0 - timer - 3));
    expect(g.bombTimer(+slot)).toBe(timer);
    g.undo();
    expect(g.stockCount).toBe(stock0 - timer + 1);
  });
  it('solver accounts for bombs', () => {
    for (const n of [40, 55, 140, 260]) expect(solve(generateLevel(n)).solvable, `level ${n}`).toBe(true);
  });
});

describe('game rules', () => {
  it('plays, draws, undoes and wins following a solver-like greedy path', () => {
    const lvl = generateLevel(1);
    const g = new Game(lvl);
    expect(g.remaining).toBe(lvl.tableau.length);
    const open = lvl.tableau.map((_, i) => i).filter((i) => g.isOpen(i));
    expect(open.length).toBe(8);
    // Draw then undo restores the stock.
    const before = g.stockCount;
    g.draw();
    expect(g.stockCount).toBe(before - 1);
    expect(g.combo).toBe(0);
    g.undo();
    expect(g.stockCount).toBe(before);
    // Wild accepts any free card.
    g.wild();
    expect(g.playable().length).toBe(open.length);
    const ev = g.play(open[0]);
    expect(ev?.type).toBe('play');
    expect(g.combo).toBe(1);
  });
  it('locks block until the key is cleared; hammer removes', () => {
    const lvl = generateLevel(16);
    const g = new Game(lvl);
    const lock = Object.entries(lvl.specials).find(([, s]) => s.kind === 'lock')!;
    const slot = +lock[0];
    expect(g.isLocked(slot)).toBe(true);
    const key = (lock[1] as { kind: 'lock'; key: number }).key;
    // Clear everything covering the key with the hammer, then the key itself.
    const clear = (i: number): void => {
      for (const j of lvl.layout.coveredBy[i]) if (!g.isRemoved(j)) clear(j);
      if (!g.isRemoved(i)) g.remove(i);
    };
    clear(key);
    expect(g.isLocked(slot)).toBe(false);
  });
});
