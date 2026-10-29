import { Rng } from '@shared/core/rng';
import { faceFromSeed } from '../art/faces';
import { profileForLevel } from '../logic/ai';
import { NAMES_F_EN, NAMES_F_RU, NAMES_M_EN, NAMES_M_RU, TRAITS } from './opponents';
import type { Opponent } from './route';

/** Random fellow passengers of a given AI level for quick games, the cup and the daily deal. */
export function randomOpponents(level: number, seed: number, lang: 'ru' | 'en', levels?: number[]): Opponent[] {
  const rng = new Rng(seed);
  const used = new Set<string>();
  return [0, 1].map((k) => {
    const female = rng.chance(0.42);
    const pool = female ? (lang === 'en' ? NAMES_F_EN : NAMES_F_RU) : lang === 'en' ? NAMES_M_EN : NAMES_M_RU;
    let name = rng.pick(pool);
    while (used.has(name)) name = rng.pick(pool);
    used.add(name);
    return { name, face: faceFromSeed(seed * 31 + k * 7 + 3, female), ai: { ...profileForLevel(levels?.[k] ?? level) }, trait: rng.pick(TRAITS), boss: false };
  });
}
