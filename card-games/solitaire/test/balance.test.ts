import { it } from 'vitest';
import { generateLevel } from '../src/logic/tpGenerator';
import { TriPeaks } from '../src/logic/tripeaks';

function play(lv: number, smart: boolean): { won: boolean; stars: number } {
  const g = new TriPeaks(generateLevel(lv));
  for (let k = 0; k < 500 && !g.won && !g.lost; k++) {
    let m = smart ? g.hint() : null;
    if (!smart) {
      const p = g.playable();
      m = p.length ? { t: 'play', slot: p[0] } : g.stockLeft > 0 ? { t: 'draw' } : g.jokers > 0 ? { t: 'joker' } : null;
    }
    if (!m) break;
    g.apply(m);
  }
  return { won: g.won, stars: g.stars };
}

it.skipIf(!process.env.BALANCE)('balance', () => {
  for (const [a, b] of [[1, 10], [11, 30], [31, 60], [61, 120], [121, 240], [241, 400]]) {
    let ws = 0, wn = 0, st = 0, cnt = 0;
    for (let lv = a; lv <= b; lv++) {
      const s = play(lv, true);
      const n = play(lv, false);
      ws += +s.won; wn += +n.won; st += s.stars; cnt++;
    }
    console.log(`${a}-${b}: smart ${Math.round(ws / cnt * 100)}% (avg stars ${(st / cnt).toFixed(1)}), naive ${Math.round(wn / cnt * 100)}%`);
  }
}, 600000);
