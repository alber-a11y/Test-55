import { Rng } from '@shared/core/rng';
import { dayKey, daysBetween, hashStr } from '@shared/core/time';
import { platform } from '@shared/platform/platform';
import type { BoosterId } from './data/boosters';
import { CITIES, POSTCARD_AT } from './data/cities';
import { ACHIEVEMENTS, DAILY_REWARDS, MAX_QUESTS, QUESTS, xpForLevel, type QuestKind, type Reward } from './data/meta';
import { SKINS, skinKey, type SkinItem } from './data/skins';
import { save, type ModeId } from './save';

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

/** Returns number of player levels gained. */
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

/** Reward for reaching a player level. */
export function levelUpReward(level: number): Reward {
  const boosters: BoosterId[] = ['hint', 'startJoker', 'plus5', 'undo', 'breaker', 'joker', 'xray'];
  return { coins: 100 + level * 10, boosters: { [boosters[level % boosters.length]]: 1 } };
}

export function grant(r: Reward): void {
  if (r.coins) addCoins(r.coins);
  if (r.boosters) for (const [k, v] of Object.entries(r.boosters)) addBooster(k as BoosterId, v ?? 0);
  if (r.xp) addXp(r.xp);
}

/* ---------------- Skins ---------------- */

export function owns(s: SkinItem): boolean {
  return d().owned.includes(skinKey(s));
}

export function unlockSkin(s: SkinItem): void {
  const k = skinKey(s);
  if (!d().owned.includes(k)) d().owned.push(k);
  save.save();
}

export function equip(s: SkinItem): void {
  d().equip[s.kind] = s.id;
  save.save();
}

export function isEquipped(s: SkinItem): boolean {
  return d().equip[s.kind] === s.id;
}

/** Rewarded-ad progress for "watch N ads" items. Returns true when unlocked. */
export function adProgress(key: string, need: number): boolean {
  const p = (d().adProgress[key] ?? 0) + 1;
  d().adProgress[key] = p;
  save.save();
  return p >= need;
}

/** Auto-unlock skins whose condition (city, achievement) is met. Returns newly unlocked. */
export function checkSkinUnlocks(): SkinItem[] {
  const out: SkinItem[] = [];
  for (const s of SKINS) {
    if (owns(s)) continue;
    const u = s.unlock;
    if ((u.t === 'city' && cityCompleted(u.city)) || (u.t === 'achv' && (d().achv[u.id] ?? 0) >= 1) || (u.t === 'level' && d().plevel >= u.level)) {
      unlockSkin(s);
      out.push(s);
    }
  }
  return out;
}

/* ---------------- Adventure ---------------- */

export function cityCompleted(i: number): boolean {
  return d().adv.max > (i + 1) * 20;
}

export function totalStars(): number {
  return Object.values(d().adv.stars).reduce((a, b) => a + b, 0);
}

/** Stars needed for the next map star-chest, every 30 stars. */
export const STAR_CHEST_STEP = 30;

export function postcardFor(level: number): string | null {
  const ci = Math.floor((level - 1) / 20);
  const pos = ((level - 1) % 20) + 1;
  const idx = POSTCARD_AT.indexOf(pos);
  if (idx < 0) return null;
  return `${ci % CITIES.length}:${idx}`;
}

/** Record an adventure win. Returns what happened for result screens. */
export function recordAdventureWin(level: number, stars: number): { firstClear: boolean; postcard: string | null; cityDone: number | null } {
  const a = d().adv;
  const prev = a.stars[level] ?? 0;
  if (stars > prev) a.stars[level] = stars;
  const firstClear = level >= a.max;
  if (firstClear) a.max = level + 1;
  let postcard: string | null = null;
  const pc = postcardFor(level);
  if (pc && !a.postcards.includes(pc)) {
    a.postcards.push(pc);
    postcard = pc;
  }
  let cityDone: number | null = null;
  if (firstClear && level % 20 === 0) cityDone = level / 20 - 1;
  save.save();
  return { firstClear, postcard, cityDone };
}

/* ---------------- Stats ---------------- */

export function recordGame(mode: ModeId, won: boolean, score = 0, timeMs = 0): void {
  const s = d().stats[mode];
  s.played++;
  d().totals.played++;
  if (won) {
    s.won++;
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    if (timeMs > 0 && (s.bestTime === 0 || timeMs < s.bestTime)) s.bestTime = timeMs;
  } else s.streak = 0;
  if (score > s.best) s.best = score;
  track('play', 1);
  save.save();
  if (mode === 'blitz' || mode === 'tripeaks') void platform.setScore(mode === 'blitz' ? 'blitz' : 'levels', mode === 'blitz' ? s.best : d().adv.max - 1);
}

/* ---------------- Daily things ---------------- */

export function refreshDay(): void {
  const today = dayKey();
  const s = d();
  if (s.wheel.day !== today) s.wheel = { day: today, freeUsed: false, ads: 0 };
  if (s.quests.day !== today) {
    const rng = new Rng(hashStr(today) ^ 0x5bd1e995);
    const pool = rng.shuffle(QUESTS.slice());
    s.quests = {
      day: today,
      bonus: false,
      list: pool.slice(0, 3).map((q) => ({ kind: q.kind, target: rng.pick(q.targets), progress: 0, coins: q.coins, claimed: false })),
    };
  }
  save.save();
}

export function track(kind: QuestKind, amount: number): void {
  refreshDay();
  for (const q of d().quests.list) {
    if (q.kind !== kind || q.claimed) continue;
    q.progress = MAX_QUESTS.includes(kind) ? Math.max(q.progress, amount) : q.progress + amount;
  }
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
  const day = gap === 1 ? (s.day % DAILY_REWARDS.length) + 1 : 1;
  return { can: true, day };
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

/* ---------------- Achievements ---------------- */

export function achvValue(id: string): number {
  const s = d();
  switch (id) {
    case 'levels':
      return s.adv.max - 1;
    case 'stars':
      return totalStars();
    case 'klondike':
      return s.stats.klondike.won;
    case 'spider':
      return s.stats.spider.won;
    case 'freecell':
      return s.stats.freecell.won;
    case 'combo':
      return s.totals.bestCombo;
    case 'daily':
      return s.dailyCh.length;
    case 'cities':
      return Math.floor((s.adv.max - 1) / 20);
    case 'postcards':
      return s.adv.postcards.length;
    case 'blitz':
      return s.stats.blitz.best;
    case 'coins':
      return s.coinsEarned;
    case 'played':
      return s.totals.played;
  }
  return 0;
}

export function achvClaimable(): number {
  let n = 0;
  for (const a of ACHIEVEMENTS) {
    const claimed = d().achv[a.id] ?? 0;
    if (claimed < a.tiers.length && achvValue(a.id) >= a.tiers[claimed]) n++;
  }
  return n;
}

/** Daily challenge seed for a date. */
export function dailySeed(day: string): number {
  return hashStr('daily:' + day);
}
