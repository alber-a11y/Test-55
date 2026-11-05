import type { AdCallbacks, Lang, PlatformAdapter } from './types';

const SAVE_KEY = 'cozy_peaks_save_v1';

/**
 * Stand-in for a real portal until one is chosen. Shows a fake ad overlay so the whole
 * ad flow (pause, mute, cooldowns, reward only for a full view) works and can be tested.
 * URL switches: ?ads=fast (1 s ads), ?ads=fail (SDK error), ?ads=nofill (no ad available).
 */
export class StubAdapter implements PlatformAdapter {
  readonly name = 'stub';
  private mode = new URLSearchParams(location.search).get('ads') ?? '';

  async init(): Promise<void> {}
  loadingReady(): void {
    console.info('[platform:stub] loadingReady');
  }
  gameplayStart(): void {
    console.info('[platform:stub] gameplayStart');
  }
  gameplayStop(): void {
    console.info('[platform:stub] gameplayStop');
  }
  showInterstitial(cb: AdCallbacks): Promise<boolean> {
    return this.fakeAd('interstitial', cb);
  }
  showRewarded(cb: AdCallbacks): Promise<boolean> {
    return this.fakeAd('rewarded', cb);
  }
  async loadData(): Promise<unknown | null> {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  async saveData(data: unknown): Promise<void> {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* storage blocked — progress lives in memory */
    }
  }
  getLang(): Lang | null {
    return null;
  }
  async getFlags(): Promise<Record<string, string>> {
    return {};
  }
  onPauseChange(): void {}

  private fakeAd(kind: 'interstitial' | 'rewarded', cb: AdCallbacks): Promise<boolean> {
    if (this.mode === 'fail' || (this.mode === 'nofill' && kind === 'interstitial')) return Promise.resolve(false);
    return new Promise((resolve) => {
      cb.onOpen?.();
      const ru = (document.documentElement.lang || 'ru') === 'ru';
      const seconds = this.mode === 'fast' ? 1 : kind === 'rewarded' ? 5 : 3;
      const el = document.createElement('div');
      el.className = 'fake-ad';
      el.innerHTML = `
        <div class="fake-ad__tag">${kind === 'rewarded' ? (ru ? 'Реклама за награду' : 'Rewarded ad') : ru ? 'Реклама' : 'Advertisement'}</div>
        <div class="fake-ad__box"><div class="fake-ad__logo">AD</div><div class="fake-ad__sub">${ru ? 'заглушка рекламной площадки' : 'ad network stub'}</div></div>
        <div class="fake-ad__timer"></div>
        <button class="fake-ad__close">${kind === 'rewarded' ? (ru ? 'Закрыть без награды' : 'Close, no reward') : ru ? 'Закрыть' : 'Close'}</button>`;
      document.body.appendChild(el);
      const timer = el.querySelector('.fake-ad__timer') as HTMLElement;
      const btn = el.querySelector('.fake-ad__close') as HTMLButtonElement;
      let left = seconds;
      let done = false;
      const tick = () => (timer.textContent = left > 0 ? String(left) : '✓');
      tick();
      const finish = (reward: boolean) => {
        if (done) return;
        done = true;
        clearInterval(iv);
        el.remove();
        cb.onClose?.();
        resolve(reward);
      };
      if (kind === 'interstitial') btn.style.visibility = 'hidden';
      const iv = window.setInterval(() => {
        left--;
        tick();
        if (left <= 0) {
          if (kind === 'rewarded') finish(true);
          else btn.style.visibility = 'visible';
        }
      }, 1000);
      btn.onclick = () => finish(kind === 'interstitial');
      (window as any).__adSkip = () => finish(true);
    });
  }
}
