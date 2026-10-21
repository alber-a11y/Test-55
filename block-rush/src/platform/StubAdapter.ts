import { CONFIG } from '../config';
import { t } from '../core/i18n';
import { localLoad, localSave } from './storage';
import type { AdCallbacks, Lang, PlatformAdapter } from './types';

/**
 * Local stand-in for a games portal. Ads are a fake fullscreen overlay with a countdown, so every
 * ad flow (pause, mute, reward granted / not granted) can be tested without a platform.
 * Rewarded can be closed early to test the "no reward" path.
 */
export class StubAdapter implements PlatformAdapter {
  readonly name = 'stub';
  private readonly fast = new URLSearchParams(location.search).has('fastads');

  async init(): Promise<void> {}
  loadingReady(): void {
    console.info('[platform:stub] loading ready');
  }
  gameplayStart(): void {
    console.info('[platform:stub] gameplay start');
  }
  gameplayStop(): void {
    console.info('[platform:stub] gameplay stop');
  }

  showInterstitial(cb: AdCallbacks): Promise<boolean> {
    return this.fakeAd(false, cb);
  }

  showRewarded(cb: AdCallbacks): Promise<boolean> {
    return this.fakeAd(true, cb);
  }

  private fakeAd(rewarded: boolean, cb: AdCallbacks): Promise<boolean> {
    return new Promise((resolve) => {
      const total = this.fast ? 1 : rewarded ? CONFIG.ads.stubRewardedSec : CONFIG.ads.stubInterstitialSec;
      cb.onOpen?.();
      const el = document.createElement('div');
      el.className = 'stub-ad';
      el.innerHTML = `
        <div class="stub-ad-box">
          <div class="stub-ad-tag">${t('ad.label')} · ${rewarded ? 'rewarded' : 'fullscreen'}</div>
          <div class="stub-ad-title">${t('ad.stubTitle')}</div>
          ${rewarded ? `<div class="stub-ad-sub">${t('ad.stubRewarded')}</div>` : ''}
          <div class="stub-ad-timer">${total}</div>
          <div class="stub-ad-bar"><i></i></div>
          <button class="btn btn-ghost stub-ad-close">${rewarded ? t('ad.closeNoReward') : t('ad.skip')}</button>
        </div>`;
      document.body.appendChild(el);
      const timerEl = el.querySelector('.stub-ad-timer') as HTMLElement;
      const bar = el.querySelector('.stub-ad-bar i') as HTMLElement;
      const closeBtn = el.querySelector('.stub-ad-close') as HTMLButtonElement;
      if (!rewarded) closeBtn.style.visibility = 'hidden';
      const start = performance.now();
      let finished = false;
      const finish = (granted: boolean) => {
        if (finished) return;
        finished = true;
        clearInterval(iv);
        el.remove();
        cb.onClose?.();
        resolve(granted);
      };
      const iv = window.setInterval(() => {
        const el2 = (performance.now() - start) / 1000;
        const left = Math.max(0, Math.ceil(total - el2));
        timerEl.textContent = String(left);
        bar.style.width = `${Math.min(100, (el2 / total) * 100)}%`;
        if (el2 >= total) {
          if (rewarded) finish(true);
          else {
            // Fullscreen: show a close button at the end, like real interstitials.
            closeBtn.style.visibility = 'visible';
            timerEl.textContent = '✓';
          }
        }
      }, 100);
      closeBtn.addEventListener('click', () => finish(!rewarded));
    });
  }

  async loadData(): Promise<unknown | null> {
    return localLoad();
  }

  async saveData(data: unknown): Promise<void> {
    localSave(data);
  }

  getLang(): Lang | null {
    return null;
  }

  onPauseChange(): void {}
}
