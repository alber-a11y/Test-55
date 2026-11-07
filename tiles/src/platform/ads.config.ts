/**
 * Ad aggressiveness — one place to tune it. Current preset: "above average".
 * Platforms may enforce their own minimum gap between fullscreen ads on top of this.
 */
export const AD_CONFIG = {
  /** Minimal gap between two fullscreen (interstitial) ads. */
  interstitialCooldownMs: 50_000,
  /** No fullscreen ad right after the player voluntarily watched a rewarded one. */
  afterRewardedGraceMs: 25_000,
  /** Fullscreen ad once the game has loaded (preroll). */
  onBoot: true,
  /** After a won level, starting from this level. */
  onWinFromLevel: 3,
  /** When the player presses "Retry" after losing. */
  onRetry: true,
  /** When the player leaves a level to the map / menu. */
  onExitLevel: true,
  /** Every N-th transition between menu screens (menu ↔ map ↔ shop ↔ settings). 0 = off. */
  menuTransitionsEvery: 3,

  /** Rewarded placements. */
  rewardedWinMultiplier: 3,
  freeCoinsAmount: 60,
  freeCoinsPerDay: 6,
  /** Views needed to unlock an ad-only shop item. */
  uniqueItemViews: 3,
  /** Continue after losing for coins (alternative to watching an ad). */
  continueCoinPrice: 250,
};
