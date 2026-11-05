/**
 * Tunables ("remote config"). Defaults live here; a platform can override them at start
 * (e.g. Yandex getFlags), and for testing any key can be set from the URL: ?cfg.adCooldownSec=10
 */
export const CONFIG = {
  /* ---- ads (rules modelled on Yandex Games requirements) ---- */
  /** Minimum gap between fullscreen ads. */
  adCooldownSec: 60,
  /** No fullscreen ads until this many levels have been won (onboarding is ad-free). */
  adFirstAfterWins: 2,
  /** No fullscreen ad this soon after a rewarded ad or a purchase. */
  adAfterRewardedSec: 30,
  /** Fullscreen ad right after loading, before the first screen (returning players only). */
  adOnStart: true,
  /** Each interstitial point fires only on every k-th attempt (1 = every time the cooldown allows). */
  adEveryKth: 1,

  /* ---- economy ---- */
  livesMax: 5,
  lifeRegenMin: 25,
  startCoins: 1000,
  startBoosters: 3,
  plusFivePrices: [300, 600, 900],
  refillLivesPrice: 600,
  winCoinsBase: 30,
  coinsPerStockCard: 5,
  chestSize: 15,
  /** Minutes between rewarded coin packs in the shop. */
  freeCoinsCooldownMin: 3,
};

export type Config = typeof CONFIG;

export function applyOverrides(over: Partial<Record<keyof Config, unknown>>): void {
  for (const [k, v] of Object.entries(over)) {
    if (!(k in CONFIG)) continue;
    const cur = (CONFIG as any)[k];
    if (typeof cur === 'number') {
      const n = Number(v);
      if (Number.isFinite(n)) (CONFIG as any)[k] = n;
    } else if (typeof cur === 'boolean') (CONFIG as any)[k] = v === true || v === 'true' || v === '1';
  }
}

export function applyUrlOverrides(): void {
  const q = new URLSearchParams(location.search);
  const over: Record<string, string> = {};
  q.forEach((v, k) => {
    if (k.startsWith('cfg.')) over[k.slice(4)] = v;
  });
  applyOverrides(over as any);
}
