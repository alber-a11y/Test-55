import { Rng, hashSeed } from '../core/rng.ts';
import { ICONS_PER_SET } from './types.ts';

export interface LevelParams {
  n: number;
  hard: boolean;
  /** Target tile count (generator gets as close as the layout allows, always a multiple of 3). */
  tiles: number;
  types: number;
  layers: number;
  cols: number;
  rows: number;
  /** How many triples are "open" at once in the planted solution (1..3) — higher = more tray pressure. */
  interleave: number;
  hiddenShare: number;
  stacks: number;
  stackDepth: number;
  ice: number;
  locks: number;
}

export const isHard = (n: number) => n >= 10 && n % 10 === 0;

/** Difficulty curve: ramps up over the first ~60 levels, then oscillates so play never gets monotonous. */
export function levelParams(n: number): LevelParams {
  const rng = new Rng(hashSeed(n, 7177));
  const hard = isHard(n);
  if (n <= 3) {
    const t = [9, 18, 27][n - 1];
    return {
      n, hard, tiles: t, types: [3, 4, 5][n - 1], layers: n === 1 ? 1 : 2,
      cols: n === 1 ? 3 : 4, rows: n === 1 ? 3 : n === 2 ? 3 : 4,
      interleave: 1, hiddenShare: 0, stacks: 0, stackDepth: 0, ice: 0, locks: 0,
    };
  }
  const ramp = Math.min(1, (n - 4) / 56);
  // gentle wave on top of the ramp: easier breather levels between harder ones
  const wave = Math.sin(n * 1.7) * 0.12 + (rng.next() - 0.5) * 0.1;
  let tiles = 33 + ramp * 87;
  tiles *= 1 + wave;
  if (hard) tiles *= 1.18;
  tiles = Math.max(30, Math.min(hard ? 156 : 138, Math.round(tiles)));

  const types = Math.min(ICONS_PER_SET, Math.max(5, Math.round(5 + ramp * 6 + (hard ? 1 : 0) + rng.int(-1, 1))));
  const layers = Math.min(6, 2 + Math.floor(ramp * 4) + (hard ? 1 : 0));
  const cols = n < 8 ? rng.int(4, 5) : rng.int(5, 6);
  const rows = n < 8 ? rng.int(4, 5) : rng.int(5, 7);
  const interleave = n < 6 ? 1 : n < 20 ? 2 : hard ? 3 : rng.pick([2, 3, 3]);
  const hiddenShare = n >= 8 ? Math.min(0.3, 0.08 + (n - 8) * 0.004) : 0;
  const stacks = n >= 12 && (hard || n % 3 !== 1) ? rng.int(2, n > 40 ? 4 : 3) : 0;
  const stackDepth = stacks ? Math.min(6, 3 + Math.floor(n / 25)) : 0;
  const ice = n >= 20 ? Math.min(4, 1 + Math.floor((n - 20) / 20) + (hard ? 1 : 0)) : 0;
  const locks = n >= 30 ? Math.min(3, 1 + Math.floor((n - 30) / 30)) : 0;
  return { n, hard, tiles, types, layers, cols, rows, interleave, hiddenShare, stacks, stackDepth, ice, locks };
}
