import { audio } from '../audio/audio';
import { pauseHub } from '../core/pause';
import { platform } from './platform';

/**
 * All fullscreen-ad frequency rules in one place. Screens only declare
 * "this transition may show an ad"; whether it does is decided here.
 */
export const adConfig = {
  /** Minimum gap between fullscreen ads (Yandex also enforces its own limit). */
  interstitialCooldownMs: 60_000,
  /** No fullscreen right after the player voluntarily watched a rewarded ad. */
  afterRewardedGraceMs: 30_000,
  /** No fullscreen during the first seconds of a session. */
  sessionGraceMs: 45_000,
  /** No fullscreen until the player has finished this many games in total. */
  minGamesFinished: 1,
};

class AdManagerImpl {
  private lastInterstitial = 0;
  private lastRewarded = 0;
  private readonly sessionStart = Date.now();
  private busy = false;
  private wasInGameplay = false;
  /** Set by gameplay scenes so ads can stop/resume the GameplayAPI correctly. */
  inGameplay = false;
  /** Supplied by the game: how many games the player has finished overall. */
  gamesFinished: () => number = () => 0;
  /** Counters for tests / debugging. */
  readonly stats = { interstitials: 0, rewarded: 0 };

  get isBusy(): boolean {
    return this.busy;
  }

  private open(): void {
    pauseHub.set('ad', true);
    audio.setMuted('ad', true);
    this.wasInGameplay = this.inGameplay;
    if (this.wasInGameplay) platform.gameplayStop();
  }

  private close(): void {
    audio.setMuted('ad', false);
    pauseHub.set('ad', false);
    if (this.wasInGameplay && this.inGameplay) platform.gameplayStart();
  }

  /** Whether a fullscreen ad would be shown right now. */
  canInterstitial(): boolean {
    if (this.busy || this.inGameplay) return false;
    const now = Date.now();
    if (now - this.sessionStart < adConfig.sessionGraceMs) return false;
    if (this.gamesFinished() < adConfig.minGamesFinished) return false;
    if (now - this.lastInterstitial < adConfig.interstitialCooldownMs) return false;
    if (now - this.lastRewarded < adConfig.afterRewardedGraceMs) return false;
    return true;
  }

  /** Fullscreen ad at a screen transition, if the rules allow it. */
  async interstitial(placement: string): Promise<void> {
    if (!this.canInterstitial()) return;
    this.busy = true;
    // Mute/pause immediately — some SDKs start audio before onOpen fires.
    this.open();
    try {
      console.info('[ads] interstitial at', placement);
      const shown = await platform.showInterstitial({});
      if (shown) this.stats.interstitials++;
    } finally {
      this.lastInterstitial = Date.now();
      this.close();
      this.busy = false;
    }
  }

  /** Rewarded ad — must only be called from a direct player action. Resolves true if reward earned. */
  async rewarded(placement: string): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    this.open();
    try {
      console.info('[ads] rewarded at', placement);
      const ok = await platform.showRewarded({});
      if (ok) {
        this.lastRewarded = Date.now();
        this.stats.rewarded++;
      }
      return ok;
    } catch {
      return false;
    } finally {
      this.close();
      this.busy = false;
    }
  }
}

export const ads = new AdManagerImpl();
