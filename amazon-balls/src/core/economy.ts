import type { BoosterId } from '../data/boosters';
import { cosmeticById, type Cosmetic, type CosmeticKind } from '../data/cosmetics';
import { AD_CONFIG } from '../platform/ads.config';
import { save } from './save';

type Listener = () => void;
const listeners = new Set<Listener>();

/** Subscribe to coin / inventory changes (UI counters). Returns unsubscribe. */
export function onEconomy(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function changed(): void {
  save.save();
  listeners.forEach((l) => l());
}

export function coins(): number {
  return save.data.coins;
}

export function addCoins(n: number): void {
  save.data.coins = Math.max(0, save.data.coins + Math.round(n));
  changed();
}

export function spend(n: number): boolean {
  if (save.data.coins < n) return false;
  save.data.coins -= n;
  changed();
  return true;
}

export function boosterCount(id: BoosterId): number {
  return save.data.boosters[id] ?? 0;
}

export function addBooster(id: BoosterId, n = 1): void {
  save.data.boosters[id] = Math.max(0, (save.data.boosters[id] ?? 0) + n);
  changed();
}

export function useBooster(id: BoosterId): boolean {
  if (boosterCount(id) <= 0) return false;
  save.data.boosters[id] -= 1;
  changed();
  return true;
}

export function owns(id: string): boolean {
  return save.data.owned.includes(id);
}

export function grant(id: string): void {
  if (!owns(id)) save.data.owned.push(id);
  changed();
}

export function equipped(kind: Exclude<CosmeticKind, 'mosaic'>): string {
  return save.data.equipped[kind];
}

export function equip(c: Cosmetic): void {
  if (c.kind === 'mosaic' || !owns(c.id)) return;
  save.data.equipped[c.kind] = c.id;
  changed();
}

export function adViews(id: string): number {
  return save.data.adViews[id] ?? 0;
}

/** Count one rewarded view toward an exclusive cosmetic; grants it when complete. */
export function addAdView(id: string): boolean {
  const c = cosmeticById(id);
  if (!c || c.unlock.type !== 'ads') return false;
  const n = adViews(id) + 1;
  save.data.adViews[id] = n;
  if (n >= c.unlock.views) {
    grant(id);
    return true;
  }
  changed();
  return false;
}

export function ownedMosaicPacks(): string[] {
  return save.data.owned.filter((id) => cosmeticById(id)?.kind === 'mosaic');
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function limits() {
  const l = save.data.limits;
  if (l.day !== today()) {
    l.day = today();
    l.freeCoins = 0;
    l.freeBooster = 0;
  }
  return l;
}

export function freeCoinsLeft(): number {
  return Math.max(0, AD_CONFIG.freeCoins.perDay - limits().freeCoins);
}

export function useFreeCoins(): void {
  limits().freeCoins += 1;
  addCoins(AD_CONFIG.freeCoins.amount);
}

export function freeBoosterLeft(): number {
  return Math.max(0, AD_CONFIG.freeBooster.perDay - limits().freeBooster);
}

export function useFreeBooster(id: BoosterId): void {
  limits().freeBooster += 1;
  addBooster(id, 1);
}

/** Daily gift rewards by streak day (1..7, then repeats the last). */
export const DAILY_REWARDS: { coins: number; booster?: BoosterId }[] = [
  { coins: 50 },
  { coins: 80 },
  { coins: 100, booster: 'bomb' },
  { coins: 120 },
  { coins: 150, booster: 'rainbow' },
  { coins: 200 },
  { coins: 300, booster: 'lightning' },
];

export function dailyAvailable(): boolean {
  return save.data.daily.last !== today();
}

/** Streak day (1-based) the next claim will give. */
export function dailyDay(): number {
  const { last, streak } = save.data.daily;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
  if (last === yesterday) return Math.min(streak + 1, DAILY_REWARDS.length);
  if (last === today()) return Math.max(1, streak);
  return 1;
}

export function claimDaily(mult: number): void {
  const day = dailyDay();
  const r = DAILY_REWARDS[day - 1];
  save.data.daily = { last: today(), streak: day };
  addCoins(r.coins * mult);
  if (r.booster) addBooster(r.booster, mult);
}
