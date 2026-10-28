import { AD_CONFIG } from './ads.config';
import type { AdCallbacks, Lang, PlatformAdapter } from './types';

const SAVE_KEY = 'amazon_balls_save_v1';

/**
 * Local stand-in for a real ad platform: shows a fake ad overlay so the whole
 * ad flow (pause, mute, input lock, reward, cooldowns) works without an SDK.
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
      const ru = document.documentElement.lang !== 'en';
      const seconds = kind === 'rewarded' ? AD_CONFIG.stub.rewardedSec : AD_CONFIG.stub.interstitialSec;
      const el = document.createElement('div');
      el.style.cssText =
        'position:fixed;inset:0;z-index:1000;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'gap:18px;color:#fff;font:800 22px "Trebuchet MS",Arial,sans-serif;text-align:center;' +
        'background:radial-gradient(circle at 50% 35%,#1d6b4f,#06251c 70%);';
      const title = document.createElement('div');
      title.style.cssText = 'font-size:34px;font-weight:900;letter-spacing:2px;color:#ffd166;text-shadow:0 3px 0 #0006';
      title.textContent = kind === 'rewarded' ? (ru ? 'РЕКЛАМА ЗА НАГРАДУ' : 'REWARDED AD') : ru ? 'РЕКЛАМА' : 'ADVERTISEMENT';
      const sub = document.createElement('div');
      sub.style.cssText = 'opacity:.7;font-size:16px';
      sub.textContent = ru ? 'заглушка — здесь будет реклама платформы' : 'stub — the platform ad goes here';
      const timer = document.createElement('div');
      timer.style.cssText =
        'width:96px;height:96px;border-radius:50%;border:6px solid #ffd166;display:flex;align-items:center;justify-content:center;font-size:44px';
      const btn = document.createElement('button');
      btn.style.cssText =
        'font:800 18px "Trebuchet MS",Arial,sans-serif;padding:12px 30px;border-radius:14px;border:none;color:#fff;cursor:pointer;background:#666';
      btn.textContent = kind === 'rewarded' ? (ru ? 'Закрыть (без награды)' : 'Close (no reward)') : ru ? 'Закрыть' : 'Close';
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
          if (kind === 'rewarded') finish(true);
          else btn.style.background = '#2a9d8f';
        }
      }, 1000);
      // Rewarded closed early → no reward; an interstitial can be closed once its timer ends.
      btn.onclick = () => {
        if (kind === 'interstitial' && left > 0) return;
        finish(kind === 'interstitial');
      };
      // Hook for automated tests: finish the ad immediately (as if watched to the end).
      (window as any).__stubAdSkip = () => finish(true);
    });
  }
}
