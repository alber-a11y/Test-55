import type Phaser from 'phaser';
import { attachPause, setPaused } from '../core/pause';
import { AD_CONFIG } from './ads.config';
import { platform } from './platform';

/**
 * All ad calls go through here. While an ad is open the Phaser loop sleeps (scenes, tweens and
 * timers freeze), all audio is muted and the platform is told gameplay stopped.
 */
class AdManager {
  private lastInterstitial = -Infinity;
  private lastRewarded = -Infinity;
  private busy = false;
  private menuHops = 0;
  /** True while a level is actively being played (for the platform's gameplay API). */
  inGameplay = false;

  attach(game: Phaser.Game): void {
    attachPause(game);
  }

  get isBusy(): boolean {
    return this.busy;
  }

  private open(): void {
    this.busy = true;
    setPaused('ad', true);
    if (this.inGameplay) platform.gameplayStop();
  }

  private close(): void {
    setPaused('ad', false);
    if (this.inGameplay) platform.gameplayStart();
    this.busy = false;
  }

  canInterstitial(): boolean {
    const now = performance.now();
    return (
      !this.busy &&
      now - this.lastInterstitial >= AD_CONFIG.interstitialCooldownMs &&
      now - this.lastRewarded >= AD_CONFIG.afterRewardedGraceMs
    );
  }

  /** Fullscreen ad if cooldowns allow. Always resolves (never throws). */
  async interstitial(reason: string): Promise<void> {
    if (!this.canInterstitial()) return;
    console.info('[ads] interstitial:', reason);
    this.open();
    try {
      await platform.showInterstitial();
    } catch {
      /* ad failed — just continue */
    } finally {
      this.lastInterstitial = performance.now();
      this.close();
    }
  }

  /** Called on every menu-screen transition; shows a fullscreen ad every N-th hop. */
  async menuHop(): Promise<void> {
    if (!AD_CONFIG.menuTransitionsEvery) return;
    this.menuHops++;
    if (this.menuHops % AD_CONFIG.menuTransitionsEvery === 0) await this.interstitial('menu');
  }

  /** Rewarded video — call only from a direct player action. Resolves true if the reward is earned. */
  async rewarded(reason: string): Promise<boolean> {
    if (this.busy) return false;
    console.info('[ads] rewarded:', reason);
    this.open();
    try {
      const ok = await platform.showRewarded();
      if (ok) this.lastRewarded = performance.now();
      return ok;
    } catch {
      return false;
    } finally {
      this.close();
    }
  }
}

export const ads = new AdManager();
