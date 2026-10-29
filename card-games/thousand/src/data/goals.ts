import type { Deal, Match, Row } from '../logic/thousand';
import type { LevelCfg } from './route';

/** Progress of a route station's goal, updated after every deal. */
export interface GoalState {
  deals: number;
  contractMade: number;
  marriages: number;
  marriageSuits: number[];
  defended: number;
  tricks: number;
  bolts: number;
  failed: number;
  fellOffBarrel: boolean;
}

export const newGoalState = (): GoalState => ({ deals: 0, contractMade: 0, marriages: 0, marriageSuits: [], defended: 0, tricks: 0, bolts: 0, failed: 0, fellOffBarrel: false });

export function goalUpdate(gs: GoalState, row: Row, d: Deal): void {
  gs.deals++;
  if (row.declarer === 0 && row.made && !row.rospis) gs.contractMade = Math.max(gs.contractMade, row.contract);
  if (row.declarer === 0 && !row.made) gs.failed++;
  if (row.declarer !== 0 && !row.made) gs.defended++;
  for (const m of d.marriageLog)
    if (m.p === 0) {
      gs.marriages++;
      gs.marriageSuits.push(m.suit);
    }
  gs.tricks += d.tricks[0];
  if (row.notes[0].includes('bolt')) gs.bolts++;
  if (row.notes[0].includes('barrelFail') || row.notes[0].includes('barrelOff')) gs.fellOffBarrel = true;
}

export const myGain = (cfg: LevelCfg, m: Match): number => m.scores[0] - (cfg.start?.[0] ?? 0);

/** Current value and target for the goal bar. */
export function goalProgress(cfg: LevelCfg, gs: GoalState, m: Match): { cur: number; need: number } {
  const g = cfg.goal;
  switch (g.k) {
    case 'score':
    case 'clean':
      return { cur: Math.max(0, myGain(cfg, m)), need: g.n };
    case 'contract':
      return { cur: gs.contractMade >= g.n ? 1 : 0, need: 1 };
    case 'marriage':
      return { cur: g.suit === undefined ? gs.marriages : gs.marriageSuits.filter((s) => s === g.suit).length, need: g.n };
    case 'defend':
      return { cur: gs.defended, need: g.n };
    case 'tricks':
      return { cur: gs.tricks, need: g.n };
    case 'race':
      return { cur: Math.max(0, m.scores[0]), need: g.n };
    case 'barrel':
      return { cur: Math.max(0, m.scores[0]), need: 1000 };
    case 'lead':
      return { cur: gs.deals, need: cfg.deals };
  }
}

export type GoalStatus = 'going' | 'won' | 'lost';

export function goalStatus(cfg: LevelCfg, gs: GoalState, m: Match, extraDeals = 0): GoalStatus {
  const g = cfg.goal;
  const limit = cfg.deals + extraDeals;
  const out = gs.deals >= limit;
  const pr = goalProgress(cfg, gs, m);
  switch (g.k) {
    case 'race':
      if (m.over) return m.winner === 0 ? 'won' : 'lost';
      return out ? (m.scores[0] > Math.max(m.scores[1], m.scores[2]) ? 'won' : 'lost') : 'going';
    case 'barrel':
      if (m.over && m.winner === 0) return 'won';
      if (m.over || gs.fellOffBarrel) return 'lost';
      return out ? 'lost' : 'going';
    case 'lead':
      if (!out) return 'going';
      return m.scores[0] > Math.max(m.scores[1], m.scores[2]) ? 'won' : 'lost';
    case 'clean':
      if (gs.bolts > 0) return 'lost';
      break;
  }
  if (pr.cur >= pr.need) return 'won';
  return out ? 'lost' : 'going';
}

/** 1–3 stars: the faster (or the bigger the margin), the better. */
export function goalStars(cfg: LevelCfg, gs: GoalState, m: Match): number {
  const k = cfg.goal.k;
  if (k === 'lead' || k === 'race') {
    const margin = m.scores[0] - Math.max(m.scores[1], m.scores[2]);
    return margin >= 150 ? 3 : margin >= 60 ? 2 : 1;
  }
  const used = gs.deals / cfg.deals;
  return used <= 0.5 ? 3 : used <= 0.76 ? 2 : 1;
}
