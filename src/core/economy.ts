import { HEROES, MAX_HERO_LEVEL, upgradeCost } from '../data/heroes';
import { BOOSTERS, skinById, type BoosterId } from '../data/shop';
import { ads } from '../platform/AdManager';
import { save } from './save';

export const econ = {
  get coins(): number {
    return save.data.coins;
  },

  add(n: number): void {
    save.data.coins += Math.round(n);
    save.save();
  },

  spend(n: number): boolean {
    if (save.data.coins < n) return false;
    save.data.coins -= n;
    save.save();
    return true;
  },

  adProgress(key: string): number {
    return save.data.ads[key] ?? 0;
  },

  /**
   * Watch one rewarded ad toward a "watch N ads" unlock.
   * Returns 'done' when the requirement is now met, 'progress' after a counted view, 'fail' otherwise.
   */
  async watchFor(key: string, need: number): Promise<'done' | 'progress' | 'fail'> {
    const ok = await ads.rewarded();
    if (!ok) return 'fail';
    const n = (save.data.ads[key] ?? 0) + 1;
    save.data.ads[key] = n;
    save.save();
    return n >= need ? 'done' : 'progress';
  },

  ownsHero(id: string): boolean {
    return !!save.data.heroes[id]?.owned;
  },

  grantHero(id: string): void {
    save.data.heroes[id].owned = true;
    save.save();
  },

  buyHero(id: string): boolean {
    const h = HEROES.find((x) => x.id === id);
    if (!h || h.unlock.type !== 'coins' || this.ownsHero(id)) return false;
    if (!this.spend(h.unlock.price)) return false;
    this.grantHero(id);
    return true;
  },

  /** Heroes unlocked by clearing `level`. */
  unlockByLevel(level: number): string[] {
    const out: string[] = [];
    for (const h of HEROES) {
      if (h.unlock.type === 'level' && level >= h.unlock.level && !this.ownsHero(h.id)) {
        this.grantHero(h.id);
        out.push(h.id);
      }
    }
    return out;
  },

  upgradeHero(id: string): boolean {
    const st = save.data.heroes[id];
    if (!st.owned || st.level >= MAX_HERO_LEVEL) return false;
    if (!this.spend(upgradeCost(st.level))) return false;
    st.level++;
    save.save();
    return true;
  },

  ownsSkin(id: string): boolean {
    const s = skinById(id);
    return !!s && save.data.heroes[s.hero].skins.includes(id);
  },

  grantSkin(id: string): void {
    const s = skinById(id)!;
    const st = save.data.heroes[s.hero];
    if (!st.skins.includes(id)) st.skins.push(id);
    save.save();
  },

  buySkin(id: string): boolean {
    const s = skinById(id);
    if (!s || s.price.type !== 'coins' || this.ownsSkin(id)) return false;
    if (!this.spend(s.price.price)) return false;
    this.grantSkin(id);
    return true;
  },

  equipSkin(id: string): void {
    const s = skinById(id);
    if (!s || !this.ownsSkin(id)) return;
    save.data.heroes[s.hero].skin = id;
    save.save();
  },

  buyBooster(id: BoosterId): boolean {
    const b = BOOSTERS.find((x) => x.id === id);
    if (!b || !this.spend(b.price)) return false;
    save.data.boosters[id] = (save.data.boosters[id] ?? 0) + 1;
    save.save();
    return true;
  },

  giveBooster(id: BoosterId, n = 1): void {
    save.data.boosters[id] = (save.data.boosters[id] ?? 0) + n;
    save.save();
  },
};
