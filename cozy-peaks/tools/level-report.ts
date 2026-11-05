// Prints the difficulty curve: npm run levels -- 1 60
import { generateLevel, targetBand } from '../src/game/generator';

const from = +(process.argv[2] ?? 1);
const to = +(process.argv[3] ?? 40);
let total = 0;
for (let n = from; n <= to; n++) {
  const t0 = performance.now();
  const l = generateLevel(n);
  const ms = performance.now() - t0;
  total += ms;
  const [lo, hi] = targetBand(n);
  const sp = Object.values(l.specials).map((s) => s.kind[0]).join('');
  const ok = l.winRate >= lo && l.winRate <= hi ? ' ' : '!';
  console.log(
    `${String(n).padStart(5)} ${l.tier.padEnd(9)} ${l.layoutId.slice(0, 22).padEnd(22)} cards ${String(l.tableau.length).padStart(2)} stock ${String(l.stock.length).padStart(2)}  win ${(l.winRate * 100).toFixed(0).padStart(3)}% [${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}]${ok} ${sp.padEnd(5)} ${ms.toFixed(0)}ms`,
  );
}
console.log(`avg ${(total / (to - from + 1)).toFixed(0)} ms/level`);
