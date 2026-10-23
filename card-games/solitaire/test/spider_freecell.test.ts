import { describe, expect, it } from 'vitest';
import { FreeCell, msDeal } from '../src/logic/freecell';
import { Spider } from '../src/logic/spider';

describe('FreeCell', () => {
  it('reproduces Microsoft deal #1', () => {
    const cols = msDeal(1);
    // Game #1 first column: J♦ K♦ 2♠ 4♣ 3♠ 6♦ 6♠
    const name = (c: { suit: number; rank: number }) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'][c.rank - 1] + 'SHDC'[c.suit];
    expect(cols[0].map(name).join(' ')).toBe('JD KD 2S 4C 3S 6D 6S');
  });
  it('supermove capacity', () => {
    const g = new FreeCell(1);
    expect(g.capacity('t0')).toBe(5);
  });
});

describe('Spider', () => {
  it('deals 54 + 50', () => {
    const g = new Spider(5, 1);
    expect(g.tabs.reduce((a, t) => a + t.cards.length, 0)).toBe(54);
    expect(g.pile('stock').cards.length).toBe(50);
  });
  it('hint-play makes progress on 1 suit', () => {
    let done = 0;
    for (let s = 1; s <= 5; s++) {
      const g = new Spider(s, 1);
      for (let k = 0; k < 1500 && !g.won; k++) {
        const h = g.hint();
        if (!h) break;
        if (h.t === 'draw') g.draw();
        else g.move(h.m);
      }
      done += g.completed;
    }
    console.log('spider completed suits by hint bot', done, '/ 40');
    expect(done).toBeGreaterThan(0);
  });
});
