import { Rng } from '@shared/core/rng';
import { faceFromSeed } from '../art/faces';
import { PROFILES, type AIProfile } from '../logic/ai';
import { TRAITS, NAMES_F_EN, NAMES_F_RU, NAMES_M_EN, NAMES_M_RU } from './opponents';
import type { Opponent } from './locations';

const LEVELS: AIProfile[] = [PROFILES.novice, PROFILES.novice, PROFILES.amateur, PROFILES.master, PROFILES.king];

/** Random opponents of a given AI level for quick games, tournaments and daily tables. */
export function randomOpponents(count: number, level: number, seed: number, lang: 'ru' | 'en'): Opponent[] {
  const rng = new Rng(seed);
  const used = new Set<string>();
  return Array.from({ length: count }, (_, k) => {
    const female = rng.chance(0.4);
    const pool = female ? (lang === 'en' ? NAMES_F_EN : NAMES_F_RU) : lang === 'en' ? NAMES_M_EN : NAMES_M_RU;
    let name = rng.pick(pool);
    while (used.has(name)) name = rng.pick(pool);
    used.add(name);
    return { name, face: faceFromSeed(seed * 31 + k * 7, female), ai: { ...LEVELS[Math.max(1, Math.min(4, level))] }, trait: rng.pick(TRAITS), boss: false };
  });
}
