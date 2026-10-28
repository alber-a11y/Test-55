/**
 * All ad tuning in one place. Aggressiveness is "above average": a fullscreen ad
 * at launch and after almost every level transition, with a short cooldown.
 * Ads are never shown in the middle of active gameplay.
 */
export const AD_CONFIG = {
  /** Fullscreen ad right after loading, before the main menu becomes interactive. */
  preroll: true,
  /** No fullscreen ads while the player is on levels below this one. */
  interstitialFromLevel: 3,
  /** Minimum gap between two fullscreen ads. */
  interstitialCooldownMs: 45_000,
  /** Quiet period after the player voluntarily watched a rewarded ad. */
  afterRewardedGraceMs: 20_000,
  /** Where fullscreen ads are allowed. */
  on: {
    win: true,
    lose: true,
    restart: true,
    exitLevel: true,
    mapToMenu: false,
  },
  /** Stub ad durations (seconds). */
  stub: { interstitialSec: 3, rewardedSec: 5 },

  /** Rewarded placements. */
  freeCoins: { amount: 100, perDay: 5 },
  freeBooster: { perDay: 5 },
  continueShots: 5,
  maxContinues: 2,
  /** Values of the moving multiplier needle on the victory screen. */
  winMultipliers: [2, 3, 5, 3, 2],
  /** Rewarded views needed for "exclusive" cosmetics. */
  exclusiveViews: 3,
} as const;
