import { t } from '../core/i18n';
import type { PlatformAdapter } from './types';

/**
 * Local stand-in for an ad network: shows a fake fullscreen ad as a DOM overlay so the whole
 * flow (pause, mute, reward, cooldowns) can be tested before a real platform SDK is plugged in.
 */
export class StubAdapter implements PlatformAdapter {
  readonly name = 'stub';
  async init(): Promise<void> {}
  loadingReady(): void {}
  gameplayStart(): void {}
  gameplayStop(): void {}
  getLang() {
    return null;
  }
  onPauseChange(): void {}

  showInterstitial(): Promise<void> {
    return this.fake(false).then(() => undefined);
  }
  showRewarded(): Promise<boolean> {
    return this.fake(true);
  }

  private fake(rewarded: boolean): Promise<boolean> {
    // ?noads — instant "watched" ads for quick local testing
    if (new URLSearchParams(location.search).has('noads')) return Promise.resolve(true);
    return new Promise((resolve) => {
      const total = rewarded ? 5 : 3;
      const el = document.createElement('div');
      el.style.cssText = `position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;
        background:radial-gradient(circle at 50% 40%,#3b3f6b,#121427);color:#fff;font:800 20px/1.3 Nunito,Arial,sans-serif;text-align:center;
        user-select:none;-webkit-user-select:none;touch-action:none`;
      el.innerHTML = `
        <div style="position:absolute;top:14px;left:16px;font-size:13px;opacity:.6;letter-spacing:1px">${t('adStubLabel')}</div>
        <button data-x style="position:absolute;top:10px;right:12px;width:40px;height:40px;border-radius:50%;border:0;
          background:rgba(255,255,255,.15);color:#fff;font:800 20px Nunito,Arial;opacity:.35;cursor:pointer">✕</button>
        <div style="width:min(78vw,340px);aspect-ratio:1;border-radius:28px;background:linear-gradient(135deg,#ffcf5a,#ff6f91 55%,#7a6bff);
          display:flex;align-items:center;justify-content:center;font-size:64px;box-shadow:0 20px 60px rgba(0,0,0,.4)">▶</div>
        <div style="margin-top:22px;font-size:22px">${rewarded ? t('adStubRewarded') : t('adStubInterstitial')}</div>
        <div data-c style="margin-top:10px;font-size:16px;opacity:.75"></div>
        <div style="margin-top:18px;width:min(70vw,300px);height:10px;border-radius:6px;background:rgba(255,255,255,.15);overflow:hidden">
          <i data-p style="display:block;height:100%;width:0;background:linear-gradient(90deg,#ffe36b,#ffb82e);transition:width .25s linear"></i></div>`;
      document.body.appendChild(el);
      const x = el.querySelector('[data-x]') as HTMLButtonElement;
      const c = el.querySelector('[data-c]') as HTMLElement;
      const p = el.querySelector('[data-p]') as HTMLElement;
      let left = total;
      let done = false;
      const finish = (ok: boolean) => {
        clearInterval(timer);
        el.remove();
        resolve(ok);
      };
      const render = () => {
        p.style.width = `${((total - left) / total) * 100}%`;
        c.textContent = left > 0 ? t('adStubLeft', { s: left }) : rewarded ? t('adStubReward') : t('adStubClose');
      };
      render();
      const timer = window.setInterval(() => {
        left--;
        if (left <= 0) {
          done = true;
          x.style.opacity = '1';
          x.style.background = '#2ecc71';
        }
        render();
        if (left <= 0) clearInterval(timer);
      }, 1000);
      // Interstitials can be skipped after the countdown; rewarded grants only when watched to the end.
      x.addEventListener('click', () => {
        if (!done && !rewarded) return;
        finish(done);
      });
      el.addEventListener('click', (e) => {
        if (done && e.target !== x) finish(true);
      });
    });
  }
}
