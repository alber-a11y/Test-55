import { Rng } from '@shared/core/rng';
import { dayKey, daysBetween, hashStr } from '@shared/core/time';
import { platform } from '@shared/platform/platform';
import { ACHIEVEMENTS, DAILY_REWARDS, LEAGUES, leagueOf, QUESTS, SKINS, skinKey, xpForLevel, type Reward, type SkinItem } from './data/meta';
import { save, type BoosterId, type ModeId, type QuestKind } from './save';

const d = () => save.data;

export function addCoins(n: number): void {
  d().coins += n;
  if (n > 0) d().coinsEarned += n;
  save.save();
}

export function spendCoins(n: number): boolean {
  if (d().coins < n) return false;
  d().coins -= n;
  save.save();
  return true;
}

export function addBooster(id: BoosterId, n = 1): void {
  d().boosters[id] = (d().boosters[id] ?? 0) + n;
  save.save();
}

export function useBooster(id: BoosterId): boolean {
  if ((d().boosters[id] ?? 0) <= 0) return false;
  d().boosters[id]--;
  save.save();
  return true;
}

export function addXp(n: number): number {
  const s = d();
  s.xp += n;
  let gained = 0;
  while (s.xp >= xpForLevel(s.plevel)) {
    s.xp -= xpForLevel(s.plevel);
    s.plevel++;
    gained++;
  }
  save.save();
  return gained;
}

export function levelUpReward(level: number): Reward {
  const ids: BoosterId[] = ['hint', 'peek', 'redeal', 'counter', 'shield', 'swap', 'bribe'];
  return { coins: 100 + level * 10, boosters: { [ids[level % ids.length]]: 1 } };
}

export function grant(r: Reward): void {
  if (r.coins) addCoins(r.coins);
  if (r.boosters) for (const [k, v] of Object.entries(r.boosters)) addBooster(k as BoosterId, v ?? 0);
  if (r.xp) addXp(r.xp);
}

/* Skins */
export const owns = (s: SkinItem): boolean => (s.kind === 'emote' ? d().emotes.includes(s.id) : d().owned.includes(skinKey(s)));
export function unlockSkin(s: SkinItem): void {
  if (s.kind === 'emote') {
    if (!d().emotes.includes(s.id)) d().emotes.push(s.id);
  } else if (!d().owned.includes(skinKey(s))) d().owned.push(skinKey(s));
  save.save();
}
export function equip(s: SkinItem): void {
  if (s.kind === 'emote') return;
  d().equip[s.kind] = s.id;
  save.save();
}
export const isEquipped = (s: SkinItem): boolean => s.kind !== 'emote' && d().equip[s.kind] === s.id;
export function adProgress(key: string, need: number): boolean {
  const p = (d().adProgress[key] ?? 0) + 1;
  d().adProgress[key] = p;
  save.save();
  return p >= need;
}
export function checkSkinUnlocks(): SkinItem[] {
  const out: SkinItem[] = [];
  for (const s of SKINS) {
    if (owns(s)) continue;
    if (s.unlock.t === 'boss' && d().career.trophies.includes(s.unlock.loc)) {
      unlockSkin(s);
      out.push(s);
    }
  }
  return out;
}

/* Rating */
export function changeRating(delta: number): { before: number; after: number; leagueUp: boolean } {
  const before = d().rating;
  const after = Math.max(0, before + delta);
  d().rating = after;
  d().bestRating = Math.max(d().bestRating, after);
  save.save();
  void platform.setScore('rating', after);
  return { before, after, leagueUp: leagueOf(after) > leagueOf(before) };
}
export const leagueName = (rating: number): string => LEAGUES[leagueOf(rating)].id;

/* Stats */
export function recordDeal(mode: ModeId, won: boolean, fool: boolean, draw: boolean): void {
  const s = d().stats[mode];
  s.played++;
  d().totals.deals++;
  if (won) {
    s.won++;
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    d().totals.wins++;
    track('win', 1);
  } else if (!draw) s.streak = 0;
  if (fool) d().totals.fools++;
  if (draw) d().totals.draws++;
  track('play', 1);
  save.save();
}

/* Daily */
export function refreshDay(): void {
  const today = dayKey();
  const s = d();
  if (s.wheel.day !== today) s.wheel = { day: today, freeUsed: false, ads: 0 };
  if (s.quests.day !== today) {
    const rng = new Rng(hashStr(today) ^ 0x2545f491);
    const pool = rng.shuffle(QUESTS.slice());
    s.quests = { day: today, bonus: false, list: pool.slice(0, 3).map((q) => ({ kind: q.kind, target: rng.pick(q.targets), progress: 0, coins: q.coins, claimed: false })) };
  }
  save.save();
}

export function track(kind: QuestKind, amount: number): void {
  refreshDay();
  for (const q of d().quests.list) if (q.kind === kind && !q.claimed) q.progress += amount;
  save.save();
}

export function questsReady(): number {
  refreshDay();
  const q = d().quests;
  return q.list.filter((x) => !x.claimed && x.progress >= x.target).length + (!q.bonus && q.list.every((x) => x.claimed) ? 1 : 0);
}

export function dailyBonusState(): { can: boolean; day: number } {
  const s = d().daily;
  const today = dayKey();
  if (s.last === today) return { can: false, day: s.day };
  const gap = s.last ? daysBetween(s.last, today) : 99;
  return { can: true, day: gap === 1 ? (s.day % DAILY_REWARDS.length) + 1 : 1 };
}

export function claimDailyBonus(mult: number): Reward {
  const st = dailyBonusState();
  if (!st.can) return {};
  const r = DAILY_REWARDS[st.day - 1];
  const scaled: Reward = { coins: r.coins ? r.coins * mult : undefined, boosters: r.boosters ? Object.fromEntries(Object.entries(r.boosters).map(([k, v]) => [k, (v ?? 0) * mult])) : undefined };
  grant(scaled);
  d().daily = { last: dayKey(), day: st.day };
  save.save();
  return scaled;
}

export function wheelFreeAvailable(): boolean {
  refreshDay();
  return !d().wheel.freeUsed;
}

/* Achievements */
export function achvValue(id: string): number {
  const s = d();
  switch (id) {
    case 'wins':
      return s.totals.wins;
    case 'career':
      return s.career.next;
    case 'bosses':
      return s.career.trophies.length;
    case 'rating':
      return s.bestRating;
    case 'transfers':
      return s.totals.transfers;
    case 'beaten':
      return s.totals.beaten;
    case 'caught':
      return s.totals.caught;
    case 'puzzles':
      return s.puzzles.solved;
    case 'tournaments':
      return s.tournament.wins;
    case 'daily':
      return s.dailyTable.length;
    case 'coins':
      return s.coinsEarned;
    case 'played':
      return s.totals.deals;
  }
  return 0;
}

export function achvClaimable(): number {
  let n = 0;
  for (const a of ACHIEVEMENTS) {
    const c = d().achv[a.id] ?? 0;
    if (c < a.tiers.length && achvValue(a.id) >= a.tiers[c]) n++;
  }
  return n;
}
