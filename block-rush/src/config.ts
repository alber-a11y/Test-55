/** All tunable numbers in one place: board sizes, balance, economy and ad policy. */
export const CONFIG = {
  levels: {
    cols: 12,
    rows: 20,
    traySlots: 5,
    /** Seconds per level = (base + perGem * gems) * speedFactor(level). */
    timeBase: 32,
    timePerGem: 17,
    timeMinFactor: 0.62,
    timeFactorPerLevel: 0.006,
    revivesPerAttempt: 2,
    reviveSeconds: 30,
  },
  classic: {
    size: 8,
    traySlots: 3,
    revivesPerGame: 2,
  },
  score: {
    perCell: 10,
    perLine: 100,
    multiLineBonus: 0.5, // +50% per extra line in one move
    comboStep: 0.25, // +25% per combo level
    comboGraceMoves: 2, // moves without a clear before the combo resets
    gemBonus: 150,
    timeBonusPerSec: 20,
  },
  economy: {
    startCoins: 150,
    winBase: 20,
    winPerStar: 8,
    winPerLevel: 0.5,
    classicCoinsPerScore: 1 / 120,
    dailyMin: 60,
    dailyMax: 160,
    wheelAdSpinsPerDay: 6,
    freeCoinsAd: 60,
  },
  ads: {
    /** Minimum gap between fullscreen ads (the platform may enforce its own, e.g. 60 s on Yandex). */
    interstitialCooldownSec: 45,
    /** After a rewarded video, hold fullscreen ads for a while. */
    afterRewardedCooldownSec: 25,
    /** Classic mode: an ad break at a natural pause (tray refill) after this much play. */
    classicBreakSec: 150,
    /** Show a fullscreen ad right after loading. */
    onBoot: true,
    /** Stub ad duration (seconds). */
    stubInterstitialSec: 3,
    stubRewardedSec: 5,
  },
} as const;
