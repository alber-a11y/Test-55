import type { AdCallbacks, Lang, PlatformAdapter } from './types';

const SAVE_KEY = 'arena_rush_save_v1';

/**
 * Local stand-in for a real ad platform. Shows a fake ad overlay so the whole
 * ad flow (pause, mute, reward, cooldowns) can be tested without an SDK.
 */
export class StubAdapter implements PlatformAdapter {
  readonly name = 'stub';
  private pauseHandlers: ((p: boolean) => void)[] = [];

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
      /* storage unavailable — progress lives in memory only */
    }
  }

  getLang(): Lang {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'ru') return q;
    return (navigator.language || 'ru').toLowerCase().startsWith('ru') ? 'ru' : 'en';
  }

  onPauseChange(handler: (paused: boolean) => void): void {
    this.pauseHandlers.push(handler);
  }

  private fakeAd(kind: 'interstitial' | 'rewarded', cb: AdCallbacks): Promise<boolean> {
    return new Promise((resolve) => {
      cb.onOpen?.();
      const ru = this.getLang() === 'ru';
      const seconds = kind === 'rewarded' ? 4 : 3;
      const el = document.createElement('div');
      el.style.cssText =
        'position:fixed;inset:0;z-index:1000;background:rgba(5,8,20,.94);display:flex;flex-direction:column;' +
        "align-items:center;justify-content:center;color:#fff;font:700 22px 'Trebuchet MS',Arial,sans-serif;gap:16px;";
      const title = document.createElement('div');
      title.style.cssText = 'font-size:34px;font-weight:900;letter-spacing:2px;color:#ffd166';
      title.textContent = kind === 'rewarded' ? (ru ? 'РЕКЛАМА ЗА НАГРАДУ' : 'REWARDED AD') : ru ? 'РЕКЛАМА' : 'ADVERTISEMENT';
      const sub = document.createElement('div');
      sub.style.opacity = '0.7';
      sub.textContent = ru ? '(заглушка платформы)' : '(platform stub)';
      const timer = document.createElement('div');
      timer.style.fontSize = '48px';
      const btn = document.createElement('button');
      btn.style.cssText =
        'font:800 20px inherit;padding:10px 28px;border-radius:12px;border:none;background:#e63946;color:#fff;cursor:pointer';
      btn.textContent = ru ? 'Закрыть' : 'Close';
      el.append(title, sub, timer, btn);
      document.body.appendChild(el);

      let left = seconds;
      let done = false;
      timer.textContent = String(left);
      const finish = (rewarded: boolean) => {
        if (done) return;
        done = true;
        clearInterval(iv);
        el.remove();
        cb.onClose?.();
        resolve(rewarded);
      };
      const iv = window.setInterval(() => {
        left -= 1;
        timer.textContent = String(Math.max(0, left));
        if (left <= 0) {
          if (kind === 'rewarded') {
            finish(true);
          } else {
            btn.style.background = '#2a9d8f';
          }
        }
      }, 1000);
      // Rewarded closed early → no reward; interstitial can be closed any time after it ends.
      btn.onclick = () => {
        if (kind === 'interstitial' && left > 0) return;
        finish(false);
      };
      // Expose for automated tests.
      (window as any).__stubAdSkip = () => finish(kind === 'rewarded');
    });
  }
}
