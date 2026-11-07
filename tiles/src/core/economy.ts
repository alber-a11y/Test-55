import Phaser from 'phaser';
import { AD_CONFIG } from '../platform/ads.config';
import { itemById, type ItemKind } from '../data/catalog';
import { store, today, type BoosterId } from './save';

/** Global event bus: 'coins' (value), 'boosters', 'equip' (kind), 'owned'. */
export const bus = new Phaser.Events.EventEmitter();

export const econ = {
  get coins(): number {
    return store.data.coins;
  },
  addCoins(n: number): void {
    store.data.coins = Math.max(0, store.data.coins + Math.round(n));
    store.save();
    bus.emit('coins', store.data.coins);
  },
  spend(n: number): boolean {
    if (store.data.coins < n) return false;
    econ.addCoins(-n);
    return true;
  },
  boosters(id: BoosterId): number {
    return store.data.boosters[id] ?? 0;
  },
  addBooster(id: BoosterId, n = 1): void {
    store.data.boosters[id] = Math.max(0, econ.boosters(id) + n);
    store.save();
    bus.emit('boosters');
  },
  useBooster(id: BoosterId): boolean {
    if (econ.boosters(id) <= 0) return false;
    econ.addBooster(id, -1);
    return true;
  },
  owns(id: string): boolean {
    return store.data.owned.includes(id);
  },
  grant(id: string): void {
    if (!econ.owns(id)) store.data.owned.push(id);
    store.save();
    bus.emit('owned', id);
  },
  equipped(kind: ItemKind): string {
    return store.data.equipped[kind];
  },
  equip(id: string): void {
    const it = itemById(id);
    if (!it || !econ.owns(id)) return;
    store.data.equipped[it.kind] = id;
    store.save();
    bus.emit('equip', it.kind);
  },
  adProgress(id: string): number {
    return store.data.adProgress[id] ?? 0;
  },
  /** One rewarded view toward an exclusive item. Returns true when the item got unlocked. */
  addAdProgress(id: string): boolean {
    const it = itemById(id);
    const need = it?.ads ?? AD_CONFIG.uniqueItemViews;
    const v = econ.adProgress(id) + 1;
    store.data.adProgress[id] = v;
    if (v >= need) econ.grant(id);
    store.save();
    return v >= need;
  },
  freeCoinsLeft(): number {
    const d = today();
    if (store.data.freeCoins.day !== d) store.data.freeCoins = { day: d, count: 0 };
    return Math.max(0, AD_CONFIG.freeCoinsPerDay - store.data.freeCoins.count);
  },
  /** Uses one daily free-coins slot; returns the amount to credit (the caller animates and adds it). */
  takeFreeCoins(): number {
    econ.freeCoinsLeft();
    store.data.freeCoins.count++;
    store.save();
    return AD_CONFIG.freeCoinsAmount;
  },
  dailyAvailable(): boolean {
    return store.data.daily.last !== today();
  },
  /** Day index 0..6 the next claim will give. */
  dailyIndex(): number {
    const last = store.data.daily.last;
    if (!last) return 0;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
    if (last === today()) return (store.data.daily.streak - 1 + 7) % 7;
    return last === yesterday ? store.data.daily.streak % 7 : 0;
  },
  claimDaily(): number {
    const idx = econ.dailyIndex();
    store.data.daily = { last: today(), streak: idx + 1 };
    store.save();
    return idx;
  },
};
