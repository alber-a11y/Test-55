import { it } from 'vitest';
import { Rng } from '@shared/core/rng';
import { decide, PROFILES, type AIProfile } from '../src/logic/ai';
import { DEFAULT_RULES, Durak } from '../src/logic/durak';

it.skipIf(!process.env.BALANCE)('king vs master', () => {
  let wins = 0;
  const N = 30;
  const t0 = Date.now();
  let decisions = 0;
  for (let s = 1; s <= N; s++) {
    const kingSeat = s % 2;
    const profs: AIProfile[] = kingSeat === 0 ? [PROFILES.king, PROFILES.master] : [PROFILES.master, PROFILES.king];
    const g = new Durak(DEFAULT_RULES, 5000 + s);
    const rng = new Rng(s);
    let guard = 0;
    while (!g.over && guard++ < 3000) {
      let a = decide(g, g.actor, profs[g.actor], rng);
      if (profs[g.actor].level === 4) decisions++;
      if (!a) {
        g.autoResolve();
        const who = g.players.findIndex((_, i) => g.legal(i).length > 0);
        if (who < 0) break;
        a = decide(g, who, profs[who], rng);
        if (!a) break;
      }
      g.apply(a);
    }
    if (g.loser !== null && g.loser !== kingSeat) wins++;
  }
  console.log('king wins', wins, '/', N, 'ms per king decision', ((Date.now() - t0) / decisions).toFixed(1));
}, 600000);
