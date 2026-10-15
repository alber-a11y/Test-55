import { audio } from '../audio/audio';
import { pauseHub } from '../core/pause';
import { platform } from './platform';

/** Minimum gap between fullscreen ads (Yandex also enforces its own limit). */
const INTERSTITIAL_COOLDOWN_MS = 60_000;
/** Do not show a fullscreen ad right after the player voluntarily watched a rewarded one. */
const AFTER_REWARDED_GRACE_MS = 30_000;

class AdManagerImpl {
  private lastInterstitial = Date.now();
  private lastRewarded = 0;
  private busy = false;
  private wasInGameplay = false;
  /** Set by the game scene so ads can stop/resume the GameplayAPI correctly. */
  inGameplay = false;

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

  /**
   * Show a fullscreen ad between levels if allowed by cooldowns.
   * @param levelJustPlayed level number the player finished (no ads after level 1).
   */
  async interstitial(levelJustPlayed: number): Promise<void> {
    if (this.busy || levelJustPlayed < 2) return;
    const now = Date.now();
    if (now - this.lastInterstitial < INTERSTITIAL_COOLDOWN_MS) return;
    if (now - this.lastRewarded < AFTER_REWARDED_GRACE_MS) return;
    this.busy = true;
    // Mute/pause immediately — some SDKs start audio before onOpen fires.
    this.open();
    try {
      await platform.showInterstitial({});
    } finally {
      this.lastInterstitial = Date.now();
      this.close();
      this.busy = false;
    }
  }

  /** Rewarded ad — must only be called from a direct player action. Resolves true if reward earned. */
  async rewarded(): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    this.open();
    try {
      const ok = await platform.showRewarded({});
      if (ok) this.lastRewarded = Date.now();
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
