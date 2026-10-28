import type { Layer } from './synth';

/** Card-game sound effects shared by both games (synthesized from layers). */
export const CARD_SFX: Record<string, Layer[]> = {
  click: [{ w: 'sin', f: 1100, f2: 1500, dur: 0.045, vol: 0.25 }],
  flip: [
    { w: 'noise', f: 9000, dur: 0.045, vol: 0.32, lp: 0.55, curve: 2.5 },
    { w: 'sin', f: 260, f2: 120, dur: 0.05, vol: 0.18 },
  ],
  place: [
    { w: 'noise', f: 3000, dur: 0.07, vol: 0.45, lp: 0.28, curve: 3 },
    { w: 'sin', f: 150, f2: 70, dur: 0.08, vol: 0.32 },
  ],
  draw: [
    { w: 'noise', f: 6000, dur: 0.09, vol: 0.3, lp: 0.4, attack: 0.02, curve: 1.5 },
    { w: 'sin', f: 320, f2: 160, dur: 0.06, vol: 0.12, delay: 0.04 },
  ],
  deal: [
    { w: 'noise', f: 7000, dur: 0.035, vol: 0.28, lp: 0.5, curve: 2 },
    { w: 'noise', f: 7000, dur: 0.035, vol: 0.24, lp: 0.5, curve: 2, delay: 0.06 },
  ],
  shuffle: Array.from({ length: 10 }, (_, i) => ({ w: 'noise' as const, f: 5000 + (i % 3) * 1500, dur: 0.05, vol: 0.22, lp: 0.45, delay: i * 0.045, curve: 2 })),
  combo: [
    { w: 'tri', f: 784, dur: 0.12, vol: 0.32, curve: 1.2 },
    { w: 'sin', f: 1568, dur: 0.18, vol: 0.12, delay: 0.02 },
  ],
  joker: [
    { w: 'tri', f: 523, f2: 1046, dur: 0.25, vol: 0.3 },
    { w: 'sin', f: 1318, dur: 0.3, vol: 0.18, delay: 0.12, vib: { rate: 9, depth: 0.03 } },
  ],
  error: [
    { w: 'sq', f: 220, dur: 0.08, vol: 0.16, duty: 0.3 },
    { w: 'sq', f: 175, dur: 0.12, vol: 0.16, delay: 0.09, duty: 0.3 },
  ],
  coin: [
    { w: 'sq', f: 1318, dur: 0.06, vol: 0.14, curve: 0.5, duty: 0.25 },
    { w: 'sq', f: 1760, dur: 0.18, vol: 0.14, delay: 0.06, duty: 0.25 },
  ],
  coins: Array.from({ length: 6 }, (_, i) => ({ w: 'sq' as const, f: 1318 + (i % 2) * 440, dur: 0.07, vol: 0.11, delay: i * 0.06, duty: 0.25, curve: 0.8 })),
  star: [
    { w: 'tri', f: 1046, dur: 0.1, vol: 0.3, curve: 0.6 },
    { w: 'tri', f: 1568, dur: 0.3, vol: 0.28, delay: 0.08 },
    { w: 'sin', f: 2093, dur: 0.25, vol: 0.12, delay: 0.12 },
  ],
  win: [
    { w: 'tri', f: 523, dur: 0.14, vol: 0.3, curve: 0.5 },
    { w: 'tri', f: 659, dur: 0.14, vol: 0.3, delay: 0.13, curve: 0.5 },
    { w: 'tri', f: 784, dur: 0.14, vol: 0.3, delay: 0.26, curve: 0.5 },
    { w: 'tri', f: 1046, dur: 0.7, vol: 0.3, delay: 0.39, vib: { rate: 6, depth: 0.015 } },
    { w: 'sin', f: 262, dur: 1.0, vol: 0.25, delay: 0.39 },
    { w: 'sin', f: 330, dur: 1.0, vol: 0.18, delay: 0.39 },
  ],
  lose: [
    { w: 'tri', f: 392, dur: 0.22, vol: 0.28, curve: 0.5 },
    { w: 'tri', f: 349, dur: 0.22, vol: 0.28, delay: 0.22, curve: 0.5 },
    { w: 'tri', f: 311, dur: 0.22, vol: 0.28, delay: 0.44, curve: 0.5 },
    { w: 'tri', f: 262, dur: 0.7, vol: 0.28, delay: 0.66, vib: { rate: 5, depth: 0.03 } },
  ],
  unlock: [
    { w: 'tri', f: 659, dur: 0.1, vol: 0.3, curve: 0.4 },
    { w: 'tri', f: 880, dur: 0.1, vol: 0.3, delay: 0.1, curve: 0.4 },
    { w: 'tri', f: 1175, dur: 0.4, vol: 0.3, delay: 0.2 },
  ],
  buy: [
    { w: 'sq', f: 988, dur: 0.06, vol: 0.14, curve: 0.5, duty: 0.25 },
    { w: 'sq', f: 1318, dur: 0.06, vol: 0.14, delay: 0.06, curve: 0.5, duty: 0.25 },
    { w: 'sq', f: 1976, dur: 0.22, vol: 0.14, delay: 0.12, duty: 0.25 },
  ],
  chest: [
    { w: 'noise', f: 1800, dur: 0.25, vol: 0.4, lp: 0.2 },
    { w: 'tri', f: 523, f2: 1046, dur: 0.5, vol: 0.3, delay: 0.15 },
    { w: 'sin', f: 1568, dur: 0.6, vol: 0.15, delay: 0.3, vib: { rate: 8, depth: 0.03 } },
  ],
  tick: [{ w: 'sq', f: 2200, dur: 0.018, vol: 0.12, duty: 0.2 }],
  wheelWin: [
    { w: 'tri', f: 784, dur: 0.1, vol: 0.3 },
    { w: 'tri', f: 988, dur: 0.1, vol: 0.3, delay: 0.1 },
    { w: 'tri', f: 1175, dur: 0.1, vol: 0.3, delay: 0.2 },
    { w: 'tri', f: 1568, dur: 0.45, vol: 0.3, delay: 0.3 },
  ],
  ice: [
    { w: 'noise', f: 12000, dur: 0.12, vol: 0.4, lp: 0.8, curve: 3 },
    { w: 'sin', f: 2600, f2: 1800, dur: 0.1, vol: 0.12 },
  ],
  lockOpen: [
    { w: 'sq', f: 600, dur: 0.04, vol: 0.18, duty: 0.2 },
    { w: 'noise', f: 5000, dur: 0.05, vol: 0.25, delay: 0.05 },
    { w: 'tri', f: 1046, dur: 0.25, vol: 0.25, delay: 0.1 },
  ],
  bombTick: [{ w: 'sq', f: 880, dur: 0.05, vol: 0.14, duty: 0.4 }],
  explode: [
    { w: 'noise', f: 3500, dur: 0.8, vol: 0.8, lp: 0.1, curve: 2 },
    { w: 'sin', f: 120, f2: 30, dur: 0.6, vol: 0.6 },
  ],
  gold: [
    { w: 'tri', f: 1318, dur: 0.08, vol: 0.25 },
    { w: 'tri', f: 1760, dur: 0.08, vol: 0.25, delay: 0.07 },
    { w: 'tri', f: 2637, dur: 0.25, vol: 0.2, delay: 0.14 },
  ],
  levelup: [
    { w: 'tri', f: 523, dur: 0.1, vol: 0.3 },
    { w: 'tri', f: 784, dur: 0.1, vol: 0.3, delay: 0.1 },
    { w: 'tri', f: 1046, dur: 0.1, vol: 0.3, delay: 0.2 },
    { w: 'tri', f: 1318, dur: 0.1, vol: 0.3, delay: 0.3 },
    { w: 'tri', f: 1568, dur: 0.6, vol: 0.3, delay: 0.4, vib: { rate: 7, depth: 0.02 } },
  ],
  hint: [
    { w: 'sin', f: 1568, dur: 0.12, vol: 0.2 },
    { w: 'sin', f: 2093, dur: 0.2, vol: 0.16, delay: 0.08 },
  ],
  whoosh: [{ w: 'noise', f: 4000, f2: 900, dur: 0.25, vol: 0.22, lp: 0.35, attack: 0.08, curve: 1.2 }],
  booster: [
    { w: 'saw', f: 300, f2: 1200, dur: 0.3, vol: 0.18 },
    { w: 'sin', f: 1568, dur: 0.3, vol: 0.18, delay: 0.2 },
  ],
};
