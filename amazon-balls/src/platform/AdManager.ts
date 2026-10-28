import { audio } from '../audio/audio';
import { pauseHub } from '../core/pause';
import { AD_CONFIG } from './ads.config';
import { platform } from './platform';

export type InterstitialTrigger = 'preroll' | 'win' | 'lose' | 'restart' | 'exitLevel' | 'mapToMenu';

/**
 * Single entry point for every ad. While an ad is open the whole game is frozen
 * (Phaser loop paused via pauseHub), all audio is muted and input is blocked by a
 * full-screen DOM shield; everything is restored when the ad closes.
 */
class AdManagerImpl {
  private lastInterstitial = 0;
  private lastRewarded = 0;
  private busy = false;
  private wasInGameplay = false;
  private shield: HTMLDivElement | null = null;
  /** Set by the game scene so ads can stop/resume the platform gameplay markers. */
  inGameplay = false;

  get isBusy(): boolean {
    return this.busy;
  }

  private open(): void {
    pauseHub.set('ad', true);
    audio.setMuted('ad', true);
    this.wasInGameplay = this.inGameplay;
    if (this.wasInGameplay) platform.gameplayStop();
    if (!this.shield) {
      const s = document.createElement('div');
      s.style.cssText = 'position:fixed;inset:0;z-index:999;background:transparent;touch-action:none';
      const stop = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
      };
      for (const ev of ['pointerdown', 'pointerup', 'mousedown', 'touchstart', 'wheel', 'contextmenu']) s.addEventListener(ev, stop, { passive: false });
      document.body.appendChild(s);
      this.shield = s;
    }
  }

  private close(): void {
    this.shield?.remove();
    this.shield = null;
    audio.setMuted('ad', false);
    pauseHub.set('ad', false);
    if (this.wasInGameplay && this.inGameplay) platform.gameplayStart();
  }

  /** Would a fullscreen ad be shown right now for this trigger? */
  canInterstitial(trigger: InterstitialTrigger, level: number): boolean {
    if (this.busy) return false;
    if (trigger !== 'preroll') {
      if (!AD_CONFIG.on[trigger]) return false;
      if (level < AD_CONFIG.interstitialFromLevel) return false;
    } else if (!AD_CONFIG.preroll) return false;
    const now = Date.now();
    if (this.lastInterstitial && now - this.lastInterstitial < AD_CONFIG.interstitialCooldownMs) return false;
    if (this.lastRewarded && now - this.lastRewarded < AD_CONFIG.afterRewardedGraceMs) return false;
    return true;
  }

  /** Fullscreen ad at a level transition, if cooldowns allow. Always resolves. */
  async interstitial(trigger: InterstitialTrigger, level: number): Promise<void> {
    if (!this.canInterstitial(trigger, level)) return;
    this.busy = true;
    // Mute/pause immediately — some SDKs start audio before onOpen fires.
    this.open();
    try {
      await platform.showInterstitial({});
    } catch {
      /* ad failed — just continue */
    } finally {
      this.lastInterstitial = Date.now();
      this.close();
      this.busy = false;
    }
  }

  /** Rewarded ad — only from a direct player action. Resolves true if the reward must be granted. */
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
