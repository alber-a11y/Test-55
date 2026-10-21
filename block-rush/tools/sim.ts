// Balance check: a greedy bot plays generated levels, a move costs SEC_PER_MOVE seconds.
import { Session } from '../src/game/session';
import { generateLevel } from '../src/game/levelgen';
import { bestPlacement } from '../src/game/solver';

const SEC_PER_MOVE = Number(process.env.SPM ?? 2.6);
const N = Number(process.env.N ?? 300);

function play(level: number): { won: boolean; moves: number; timeLeft: number; reason: string | null } {
  const s = new Session({ mode: 'levels', level });
  let guard = 0;
  while (s.state === 'playing' && guard++ < 400) {
    let best: { slot: number; x: number; y: number; score: number } | null = null;
    s.slots.forEach((sl, i) => {
      if (!sl) return;
      const p = bestPlacement(s.board, sl.shape, false);
      if (p && (!best || p.score > best.score)) best = { slot: i, x: p.x, y: p.y, score: p.score };
    });
    if (!best) break;
    const b = best as { slot: number; x: number; y: number };
    s.tryPlace(b.slot, b.x, b.y);
    s.update(SEC_PER_MOVE);
  }
  return { won: s.state === 'won', moves: s.moves, timeLeft: s.timeLeft, reason: s.loseReason };
}

let problems = 0;
for (let l = 1; l <= N; l++) {
  const d = generateLevel(l);
  for (let y = 0; y < d.board.h; y++) if (d.board.rowFull(y)) { console.log('FULL ROW at start', l, y); problems++; }
  if (d.gems < 1) { console.log('NO GEMS', l); problems++; }
}
const buckets = new Map<number, { n: number; won: number; moves: number; left: number; time: number; moves_lost: number }>();
for (let l = 1; l <= N; l++) {
  const r = play(l);
  const k = Math.floor((l - 1) / 25);
  const b = buckets.get(k) ?? { n: 0, won: 0, moves: 0, left: 0, time: 0, moves_lost: 0 };
  b.n++;
  if (r.won) { b.won++; b.moves += r.moves; b.left += r.timeLeft; }
  if (r.reason === 'moves') b.moves_lost++;
  b.time += generateLevel(l).time;
  buckets.set(k, b);
}
console.log(`sec/move=${SEC_PER_MOVE}`);
for (const [k, b] of buckets) {
  console.log(
    `lv ${k * 25 + 1}-${k * 25 + 25}: win ${(100 * b.won / b.n).toFixed(0)}%  avgMoves ${(b.moves / Math.max(1, b.won)).toFixed(1)}  avgLeft ${(b.left / Math.max(1, b.won)).toFixed(0)}s  avgTime ${(b.time / b.n).toFixed(0)}s  stuck ${b.moves_lost}`,
  );
}
console.log('problems:', problems);
