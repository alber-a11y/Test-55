/**
 * Generates levels 1..N and replays each planted solution with the real game rules
 * (cover, ice, locks, tray capacity). Fails if any level is unwinnable.
 *   npm run verify-levels -- 2000
 */
declare const process: { argv: string[]; exit(code: number): never };

import { BoardState } from '../src/game/board.ts';
import { generateLevel } from '../src/game/generator.ts';

const max = Number(process.argv[2] ?? 1000);
let failed = 0;
const rows: string[] = [];
const t0 = Date.now();
for (let n = 1; n <= max; n++) {
  const lvl = generateLevel(n);
  const b = new BoardState(lvl);
  let maxTray = 0;
  let err = '';
  const typeCount = new Map<number, number>();
  for (const t of lvl.tiles) typeCount.set(t.type, (typeCount.get(t.type) ?? 0) + 1);
  for (const [t, c] of typeCount) if (c % 3) err = `type ${t} count ${c}`;
  for (const id of lvl.solution) {
    if (err) break;
    if (!b.canTake(id)) {
      err = `step blocked at tile ${id} (free=${b.isFree(id)} ice=${b.ice[id]} locked=${b.locked[id]})`;
      break;
    }
    b.take(id);
    maxTray = Math.max(maxTray, b.tray.length);
    if (b.lost) err = 'tray overflow';
  }
  if (!err && !b.won) err = 'not won after solution';
  if (err) {
    failed++;
    console.error(`level ${n}: ${err}`);
  }
  if (n <= 12 || n % 50 === 0) {
    const ice = lvl.tiles.filter((t) => t.ice).length;
    const locks = lvl.tiles.filter((t) => t.lock >= 0).length;
    const hidden = lvl.tiles.filter((t) => t.hidden).length;
    const stacks = new Set(lvl.tiles.filter((t) => t.stack >= 0).map((t) => t.stack)).size;
    const layers = Math.max(...lvl.tiles.map((t) => t.z)) + 1;
    rows.push(`${String(n).padStart(5)} tiles=${String(lvl.tiles.length).padStart(3)} types=${String(lvl.typeCount).padStart(2)} layers=${layers} stacks=${stacks} hidden=${hidden} ice=${ice} locks=${locks} maxTray=${maxTray}${lvl.hard ? ' HARD' : ''}`);
  }
}
console.log(rows.join('\n'));
console.log(`\n${max} levels checked in ${Date.now() - t0} ms, ${failed} failed`);
process.exit(failed ? 1 : 0);
