import { CONFIG } from '../config';
import { pauseHub } from '../core/pause';
import { audio } from '../audio/audio';
import { platform } from './platform';

export type InterstitialTrigger =
  | 'boot'
  | 'level_complete'
  | 'level_fail'
  | 'restart'
  | 'menu'
  | 'mode_switch'
  | 'classic_break'
  | 'game_over';

/**
 * Ad policy: fullscreen ads at every natural break, throttled by a cooldown; rewarded on demand.
 * While any ad is open the game is paused, input is blocked and all audio is muted.
 */
class AdManager {
  private lastInterstitial = -Infinity;
  private lastRewarded = -Infinity;
  private busy = false;
  /** Whether the last rewarded call actually opened an ad (false = no fill / error). */
  lastOpened = false;
  /** Blocks fullscreen ads while the player is dragging a piece etc. */
  blockers = new Set<string>();
  private listeners: ((open: boolean) => void)[] = [];

  get isShowing(): boolean {
    return this.busy;
  }

  onAdState(l: (open: boolean) => void): void {
    this.listeners.push(l);
  }

  private now(): number {
    return performance.now() / 1000;
  }

  canShowInterstitial(): boolean {
    if (this.busy || this.blockers.size) return false;
    const t = this.now();
    return (
      t - this.lastInterstitial >= CONFIG.ads.interstitialCooldownSec &&
      t - this.lastRewarded >= CONFIG.ads.afterRewardedCooldownSec
    );
  }

  /** Seconds of play since the last ad of any kind. */
  sinceLastAd(): number {
    return this.now() - Math.max(this.lastInterstitial, this.lastRewarded, 0);
  }

  private setOpen(open: boolean): void {
    pauseHub.set('ad', open);
    audio.setMuted('ad', open);
    document.body.classList.toggle('ad-open', open);
    this.listeners.forEach((l) => l(open));
  }

  async interstitial(trigger: InterstitialTrigger): Promise<boolean> {
    if (!this.canShowInterstitial()) return false;
    this.busy = true;
    console.info('[ads] interstitial:', trigger);
    platform.gameplayStop();
    let shown = false;
    try {
      shown = await platform.showInterstitial({
        onOpen: () => this.setOpen(true),
        onClose: () => this.setOpen(false),
      });
    } catch (e) {
      console.warn('[ads] interstitial failed', e);
    } finally {
      this.busy = false;
      this.setOpen(false);
    }
    // Count the attempt even if nothing was shown so a broken network doesn't retry every click.
    this.lastInterstitial = this.now();
    return shown;
  }

  /** Resolves true only when the reward must be granted. */
  async rewarded(placement: string): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    console.info('[ads] rewarded:', placement);
    platform.gameplayStop();
    let ok = false;
    this.lastOpened = false;
    try {
      ok = await platform.showRewarded({
        onOpen: () => {
          this.lastOpened = true;
          this.setOpen(true);
        },
        onClose: () => this.setOpen(false),
      });
    } catch (e) {
      console.warn('[ads] rewarded failed', e);
    } finally {
      this.busy = false;
      this.setOpen(false);
    }
    this.lastRewarded = this.now();
    return ok;
  }
}

export const ads = new AdManager();
