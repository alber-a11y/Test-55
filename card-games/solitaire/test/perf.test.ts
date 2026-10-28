import { it } from 'vitest';
import { generateLevel } from '../src/logic/tpGenerator';

it.skipIf(!process.env.BALANCE)('perf high levels', () => {
  const t = Date.now();
  let worst = 0;
  for (const lv of [100, 150, 199, 200, 240, 241, 300, 480, 500, 999, 1500, 5000]) {
    const t1 = Date.now();
    const d = generateLevel(lv);
    worst = Math.max(worst, Date.now() - t1);
    console.log(lv, d.template, d.slots.length, 'stock', d.stock.length, 'ice', d.slots.filter((s) => s.ice).length, 'locks', d.slots.filter((s) => s.lock !== undefined).length, 'bombs', d.slots.filter((s) => s.bomb).length, d.goal);
  }
  console.log('total', Date.now() - t, 'worst', worst);
}, 600000);
