import { audio } from '../audio/audio';
import { track } from '../core/analytics';
import { CONFIG } from '../core/config';
import { pauseHub } from '../core/pause';
import { platform } from './platform';

export type AdResult = 'shown' | 'skipped';

/**
 * Ad policy, modelled on Yandex Games rules so the game passes moderation on any portal:
 *  - fullscreen ads only at natural pauses between screens, never during an active deal;
 *  - no more than once per CONFIG.adCooldownSec, nothing during onboarding (first wins);
 *  - not right after a rewarded ad or a purchase;
 *  - rewarded only from a direct player action, the reward only for a full view;
 *  - game paused, sound muted and GameplayAPI stopped for the whole ad.
 * Callers just "try" at every transition; the manager decides.
 */
class AdManagerImpl {
  /** 0 = the very first fullscreen ad (at start) is allowed at once. */
  private lastInterstitial = 0;
  private lastRewarded = 0;
  private busy = false;
  private attempts = 0;
  private gameplay = false;
  /** Number of won levels (onboarding gate). Set by the save layer. */
  winsProvider: () => number = () => 0;
  /** "No ads" purchase: removes fullscreen ads, rewarded stays. */
  noAds = false;

  get isBusy(): boolean {
    return this.busy;
  }

  /** The level screen reports whether a deal is actively being played. */
  setGameplay(on: boolean): void {
    if (this.gameplay === on) return;
    this.gameplay = on;
    if (!this.busy) on ? platform.gameplayStart() : platform.gameplayStop();
  }

  /** A purchase also postpones fullscreen ads. */
  notePurchase(): void {
    this.lastRewarded = Date.now();
  }

  private open(): void {
    pauseHub.set('ad', true);
    audio.setMuted('ad', true);
    if (this.gameplay) platform.gameplayStop();
  }

  private close(): void {
    audio.setMuted('ad', false);
    pauseHub.set('ad', false);
    if (this.gameplay) platform.gameplayStart();
  }

  /** Why a fullscreen ad would be refused right now, or null if it may be shown. */
  blockReason(placement: string): string | null {
    const now = Date.now();
    if (this.noAds) return 'no_ads_purchased';
    if (this.busy) return 'busy';
    if (this.gameplay) return 'gameplay_active';
    if (placement !== 'start' && this.winsProvider() < CONFIG.adFirstAfterWins) return 'onboarding';
    if (placement === 'start' && (!CONFIG.adOnStart || this.winsProvider() < CONFIG.adFirstAfterWins)) return 'start_disabled';
    if (now - this.lastInterstitial < CONFIG.adCooldownSec * 1000) return 'cooldown';
    if (now - this.lastRewarded < CONFIG.adAfterRewardedSec * 1000) return 'after_rewarded';
    return null;
  }

  /** Try a fullscreen ad at a screen transition. Always resolves; never throws. */
  async interstitial(placement: string): Promise<AdResult> {
    const reason = this.blockReason(placement);
    if (reason) {
      if (reason !== 'onboarding') track('ad_interstitial_skip', { placement, reason });
      return 'skipped';
    }
    this.attempts++;
    if (CONFIG.adEveryKth > 1 && this.attempts % CONFIG.adEveryKth !== 0) return 'skipped';
    this.busy = true;
    // Mute at once: some SDKs start audio before onOpen fires.
    this.open();
    let shown = false;
    try {
      shown = await platform.showInterstitial({});
    } catch {
      shown = false;
    } finally {
      if (shown) this.lastInterstitial = Date.now();
      this.close();
      this.busy = false;
    }
    track(shown ? 'ad_interstitial_shown' : 'ad_interstitial_nofill', { placement });
    return shown ? 'shown' : 'skipped';
  }

  /** Rewarded video for `placement`. Must be called from a click handler. Resolves true if earned. */
  async rewarded(placement: string): Promise<boolean> {
    if (this.busy) return false;
    const ua = (navigator as any).userActivation;
    if (ua && !ua.isActive) {
      console.warn('[ads] rewarded requested without a user gesture — refused');
      return false;
    }
    this.busy = true;
    track('ad_rewarded_start', { placement });
    this.open();
    let ok = false;
    try {
      ok = await platform.showRewarded({});
    } catch {
      ok = false;
    } finally {
      this.lastRewarded = Date.now();
      this.close();
      this.busy = false;
    }
    track(ok ? 'ad_rewarded_reward' : 'ad_rewarded_cancel', { placement });
    return ok;
  }
}

export const ads = new AdManagerImpl();
(window as any).__ads = ads;
