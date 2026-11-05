import { save } from '../core/save';
import { hash } from '../game/generator';
import type { BoosterId } from './boosters';
import { addBooster, addCoins } from './economy';
import type { L10n } from './types';

export type GoalKind = 'win' | 'combo' | 'booster' | 'gold' | 'peaks' | 'decorate' | 'ads';

export interface GoalDef {
  id: string;
  kind: GoalKind;
  target: number;
  text: L10n;
  reward: { coins?: number; booster?: BoosterId };
}

const POOL: GoalDef[] = [
  { id: 'win3', kind: 'win', target: 3, text: { ru: 'Пройди 3 уровня', en: 'Win 3 levels' }, reward: { coins: 150 } },
  { id: 'win6', kind: 'win', target: 6, text: { ru: 'Пройди 6 уровней', en: 'Win 6 levels' }, reward: { coins: 300, booster: 'wild' } },
  { id: 'combo8', kind: 'combo', target: 8, text: { ru: 'Сделай серию из 8 карт', en: 'Make an 8-card streak' }, reward: { booster: 'undo' } },
  { id: 'combo12', kind: 'combo', target: 12, text: { ru: 'Сделай серию из 12 карт', en: 'Make a 12-card streak' }, reward: { coins: 250 } },
  { id: 'boost2', kind: 'booster', target: 2, text: { ru: 'Используй 2 бустера', en: 'Use 2 boosters' }, reward: { booster: 'plusCard' } },
  { id: 'gold3', kind: 'gold', target: 3, text: { ru: 'Собери 3 золотые карты', en: 'Collect 3 gold cards' }, reward: { coins: 200 } },
  { id: 'peaks6', kind: 'peaks', target: 6, text: { ru: 'Сними 6 вершин', en: 'Clear 6 peaks' }, reward: { coins: 150, booster: 'hammer' } },
  { id: 'decor1', kind: 'decorate', target: 1, text: { ru: 'Обнови предмет в доме', en: 'Decorate one item' }, reward: { coins: 200 } },
  { id: 'ads2', kind: 'ads', target: 2, text: { ru: 'Получи 2 подарка за рекламу', en: 'Claim 2 ad gifts' }, reward: { booster: 'lucky' } },
];

const today = () => new Date().toISOString().slice(0, 10);

/** Three goals of the day, the same for everyone on a given date. */
export function dailyGoals(): GoalDef[] {
  const s = save.data;
  if (s.daily.day !== today()) {
    s.daily = { day: today(), progress: {}, claimed: [] };
    save.commit();
  }
  const h = hash(...today().split('-').map(Number));
  const picks: GoalDef[] = [];
  const kinds = new Set<GoalKind>();
  for (let i = 0; picks.length < 3 && i < 40; i++) {
    const g = POOL[(h + i * 7) % POOL.length];
    if (kinds.has(g.kind)) continue;
    kinds.add(g.kind);
    picks.push(g);
  }
  return picks;
}

export function goalProgress(g: GoalDef): number {
  return Math.min(g.target, save.data.daily.progress[g.id] ?? 0);
}

/** Report an event; `value` for "best of" goals (combo) or an amount. */
export function bumpGoal(kind: GoalKind, value = 1): void {
  for (const g of dailyGoals()) {
    if (g.kind !== kind) continue;
    const p = save.data.daily.progress;
    p[g.id] = kind === 'combo' ? Math.max(p[g.id] ?? 0, value) : (p[g.id] ?? 0) + value;
  }
  save.commit();
}

export function claimable(): number {
  return dailyGoals().filter((g) => goalProgress(g) >= g.target && !save.data.daily.claimed.includes(g.id)).length;
}

export function claimGoal(g: GoalDef): boolean {
  if (goalProgress(g) < g.target || save.data.daily.claimed.includes(g.id)) return false;
  save.data.daily.claimed.push(g.id);
  if (g.reward.coins) addCoins(g.reward.coins);
  if (g.reward.booster) addBooster(g.reward.booster, 1);
  save.commit();
  return true;
}
