import { Session } from '../src/game/session';
import { bestPlacement } from '../src/game/solver';
import { BOOSTERS } from '../src/game/boosters';

let total = 0, movesT = 0;
for (let g = 0; g < 40; g++) {
  const s = new Session({ mode: 'classic' });
  while (s.state === 'playing' && s.moves < 2000) {
    let best: any = null;
    s.slots.forEach((sl, i) => {
      if (!sl) return;
      const p = bestPlacement(s.board, sl.shape, true);
      if (p && (!best || p.score > best.score)) best = { slot: i, ...p };
    });
    if (!best) break;
    s.tryPlace(best.slot, best.x, best.y);
  }
  total += s.score; movesT += s.moves;
}
console.log('classic avg score', Math.round(total / 40), 'avg moves', Math.round(movesT / 40));
// Boosters smoke test on both modes.
for (const mode of ['levels', 'classic'] as const) {
  const s = mode === 'levels' ? new Session({ mode, level: 30 }) : new Session({ mode });
  for (const b of BOOSTERS) {
    const r = s.useBooster(b.id, { x: 5, y: 7, slot: 0 });
    if (s.state !== 'playing') s.revive();
    console.log(mode, b.id, r);
  }
}
