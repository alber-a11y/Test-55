import { track } from '../core/analytics';
import { CONFIG } from '../core/config';
import { save } from '../core/save';
import type { BoosterId } from './boosters';
import { roomById, ROOMS, type RoomDef } from './rooms';
import { bonusItemId, premiumItemId, shopItem, type Grant, type ShopItem } from './shop';

const d = () => save.data;

/* ---------- coins & stars ---------- */

export function addCoins(n: number): void {
  d().coins += n;
  save.commit();
}

export function spendCoins(n: number): boolean {
  if (d().coins < n) return false;
  d().coins -= n;
  save.commit();
  return true;
}

/* ---------- lives ---------- */

const regenMs = () => CONFIG.lifeRegenMin * 60_000;

export function infiniteLives(): boolean {
  return d().infiniteUntil > Date.now();
}

/** Apply regeneration up to now. */
export function tickLives(): void {
  const s = d();
  if (s.lives >= CONFIG.livesMax) {
    s.lifeTs = Date.now();
    return;
  }
  const gained = Math.floor((Date.now() - s.lifeTs) / regenMs());
  if (gained > 0) {
    s.lives = Math.min(CONFIG.livesMax, s.lives + gained);
    s.lifeTs += gained * regenMs();
    save.commit();
  }
}

/** Milliseconds until the next life (0 if full). */
export function nextLifeIn(): number {
  tickLives();
  if (d().lives >= CONFIG.livesMax) return 0;
  return Math.max(0, d().lifeTs + regenMs() - Date.now());
}

export function hasLife(): boolean {
  tickLives();
  return infiniteLives() || d().lives > 0;
}

export function loseLife(): void {
  if (infiniteLives()) return;
  tickLives();
  if (d().lives >= CONFIG.livesMax) d().lifeTs = Date.now();
  d().lives = Math.max(0, d().lives - 1);
  save.commit();
}

export function refillLives(): void {
  d().lives = CONFIG.livesMax;
  d().lifeTs = Date.now();
  save.commit();
}

/* ---------- XP / player level ---------- */

export function playerLevel(xp = d().xp): { level: number; into: number; need: number } {
  let level = 1;
  let rest = xp;
  let need = 100;
  while (rest >= need) {
    rest -= need;
    level++;
    need = 100 + 40 * (level - 1);
  }
  return { level, into: rest, need };
}

/* ---------- boosters ---------- */

export function boosterCount(id: BoosterId): number {
  return d().boosters[id] ?? 0;
}

export function useBooster(id: BoosterId): boolean {
  if (boosterCount(id) <= 0) return false;
  d().boosters[id] -= 1;
  save.commit();
  track('booster_use', { id });
  return true;
}

export function addBooster(id: BoosterId, n: number): void {
  d().boosters[id] = (d().boosters[id] ?? 0) + n;
  save.commit();
}

/* ---------- rooms & decor ---------- */

export function currentRoom(): RoomDef {
  return roomById(d().room);
}

export function roomDone(room: RoomDef): number {
  return room.tasks.filter((t) => t.id in d().rooms[room.id].tasks).length;
}

export function roomComplete(room: RoomDef): boolean {
  return roomDone(room) === room.tasks.length;
}

/** 0..3 — how many makeover stages (check marks) are done. */
export function roomStage(room: RoomDef): number {
  const done = roomDone(room);
  return room.stages.filter((s) => done >= s).length;
}

/** First task not done yet (tasks are taken in order). */
export function nextTask(room: RoomDef = currentRoom()) {
  return room.tasks.find((t) => !(t.id in d().rooms[room.id].tasks)) ?? null;
}

export function isRoomUnlocked(room: RoomDef): boolean {
  const i = ROOMS.indexOf(room);
  return i === 0 || roomComplete(ROOMS[i - 1]);
}

export function premiumOwned(room: string, task: string): boolean {
  return d().premium.includes(`${room}:${task}`);
}

/** Complete a task for its star cost. Returns false if not enough stars. */
export function doTask(room: RoomDef, taskId: string, variant: number): boolean {
  const task = room.tasks.find((t) => t.id === taskId)!;
  if (taskId in d().rooms[room.id].tasks) {
    d().rooms[room.id].tasks[taskId] = variant;
    save.commit();
    return true;
  }
  if (d().stars < task.cost) return false;
  d().stars -= task.cost;
  d().rooms[room.id].tasks[taskId] = variant;
  d().stats.decorated += 1;
  save.commit();
  track('decor_task_done', { room: room.id, task: taskId, variant });
  return true;
}

/* ---------- shop ---------- */

export function itemOwned(item: ShopItem): boolean {
  const g = item.grant;
  switch (g.kind) {
    case 'cardBack':
    case 'frame':
      return d().owned.includes(g.id);
    case 'premiumVariant':
      return premiumOwned(g.room, g.task);
    case 'bonusDecor':
      return d().rooms[g.room].bonus.includes(g.item);
    default:
      return false;
  }
}

export function cooldownLeft(itemId: string): number {
  return Math.max(0, (d().cooldowns[itemId] ?? 0) - Date.now());
}

export function adProgress(itemId: string): number {
  return d().adProgress[itemId] ?? 0;
}

export function grant(g: Grant): void {
  const s = d();
  switch (g.kind) {
    case 'booster':
      addBooster(g.id, g.count);
      return;
    case 'boosterPack':
      for (const [id, n] of Object.entries(g.items)) addBooster(id as BoosterId, n!);
      return;
    case 'coins':
      addCoins(g.amount);
      return;
    case 'livesRefill':
      refillLives();
      return;
    case 'infiniteLives':
      s.infiniteUntil = Math.max(Date.now(), s.infiniteUntil) + g.minutes * 60_000;
      break;
    case 'cardBack':
    case 'frame':
      if (!s.owned.includes(g.id)) s.owned.push(g.id);
      if (g.kind === 'cardBack') s.cardBack = g.id;
      else s.frame = g.id;
      break;
    case 'premiumVariant':
      if (!s.premium.includes(`${g.room}:${g.task}`)) s.premium.push(`${g.room}:${g.task}`);
      break;
    case 'bonusDecor':
      if (!s.rooms[g.room].bonus.includes(g.item)) s.rooms[g.room].bonus.push(g.item);
      break;
  }
  save.commit();
}

/** Paying by coins: spend and grant. */
export function buyWithCoins(item: ShopItem): boolean {
  if (!('coins' in item.price)) return false;
  if (!spendCoins(item.price.coins)) return false;
  grant(item.grant);
  track('shop_buy', { id: item.id, coins: item.price.coins });
  return true;
}

/**
 * One rewarded view counted towards an item. Returns true when the item was granted
 * (all views collected); progress is kept otherwise.
 */
export function countAdView(item: ShopItem): boolean {
  if (!('ads' in item.price)) return false;
  const s = d();
  const p = (s.adProgress[item.id] ?? 0) + 1;
  if (p >= item.price.ads) {
    delete s.adProgress[item.id];
    if (item.cooldownMin) s.cooldowns[item.id] = Date.now() + item.cooldownMin * 60_000;
    grant(item.grant);
    track('shop_ad_grant', { id: item.id });
    return true;
  }
  s.adProgress[item.id] = p;
  save.commit();
  return false;
}

export const premiumShopItem = (room: string, task: string) => shopItem(premiumItemId(room, task))!;
export const bonusShopItem = (room: string, item: string) => shopItem(bonusItemId(room, item))!;

/* ---------- chest ---------- */

export interface ChestReward {
  coins: number;
  boosters: Partial<Record<BoosterId, number>>;
  infiniteMin: number;
}

/** +1 chest segment; returns the reward when the chest fills up. */
export function chestStep(): ChestReward | null {
  const s = d();
  s.chest += 1;
  if (s.chest < CONFIG.chestSize) {
    save.commit();
    return null;
  }
  s.chest = 0;
  const pool: BoosterId[] = ['undo', 'wild', 'plusCard', 'hammer', 'peek', 'lucky'];
  const a = pool[Math.floor(Math.random() * pool.length)];
  const b = pool[Math.floor(Math.random() * pool.length)];
  const r: ChestReward = { coins: 400, boosters: { [a]: 1 }, infiniteMin: Math.random() < 0.3 ? 30 : 0 };
  r.boosters[b] = (r.boosters[b] ?? 0) + 1;
  addCoins(r.coins);
  for (const [id, n] of Object.entries(r.boosters)) addBooster(id as BoosterId, n!);
  if (r.infiniteMin) grant({ kind: 'infiniteLives', minutes: r.infiniteMin });
  return r;
}
