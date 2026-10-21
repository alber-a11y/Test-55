import { audio } from '../audio/audio';
import type { TrackName } from '../audio/music';
import { t } from '../core/i18n';
import { pauseHub } from '../core/pause';
import { ads, type InterstitialTrigger } from '../platform/ads';
import { platform } from '../platform/platform';
import { modalOpen, onModalChange, toast } from './dom';

/** A full-page screen (menu, map, game). */
export interface Screen {
  el: HTMLElement;
  music: TrackName;
  frame?(dt: number): void;
  /** Is the board in active play right now (for GameplayAPI)? */
  inPlay?(): boolean;
  destroy?(): void;
  resize?(): void;
  relocalize?(): void;
}

let current: Screen | null = null;

export function currentScreen(): Screen | null {
  return current;
}

export function setScreen(s: Screen): void {
  current?.destroy?.();
  current?.el.remove();
  current = s;
  document.getElementById('app')!.prepend(s.el);
  audio.playMusic(s.music);
  s.resize?.();
  syncGameplay();
}

/** GameplayAPI start/stop: only while the board is live and nothing covers it. */
export function syncGameplay(): void {
  const live = !!current?.inPlay?.() && !modalOpen() && !pauseHub.paused && !ads.isShowing;
  if (live) platform.gameplayStart();
  else platform.gameplayStop();
}

export async function interstitial(trigger: InterstitialTrigger): Promise<void> {
  await ads.interstitial(trigger);
  syncGameplay();
}

/** Rewarded video; tells the player when no ad could be shown. */
export async function watchAd(placement: string): Promise<boolean> {
  const ok = await ads.rewarded(placement);
  if (!ok && !ads.lastOpened) toast(t('ad.unavailable'), 'bad');
  syncGameplay();
  return ok;
}

export function startLoop(): void {
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    current?.frame?.(dt);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.addEventListener('resize', () => current?.resize?.());
  window.addEventListener('orientationchange', () => setTimeout(() => current?.resize?.(), 200));
  onModalChange(syncGameplay);
  pauseHub.onChange(syncGameplay);
}
