import { StubAdapter } from './StubAdapter';
import { YandexAdapter } from './YandexAdapter';
import type { PlatformAdapter } from './types';

/** Try to load Yandex SDK from the host (`/sdk.js` exists only on Yandex Games). */
function loadYandexSdk(timeoutMs: number): Promise<any | null> {
  return new Promise((resolve) => {
    if ((window as any).YaGames) return resolve((window as any).YaGames);
    const forced = new URLSearchParams(location.search).get('platform');
    const onYandex = /yandex|playhop/.test(location.hostname);
    if (forced === 'stub' || (!onYandex && forced !== 'yandex')) return resolve(null);
    const s = document.createElement('script');
    s.src = '/sdk.js';
    s.async = true;
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    s.onload = () => {
      clearTimeout(timer);
      resolve((window as any).YaGames ?? null);
    };
    s.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    document.head.appendChild(s);
  });
}

export let platform: PlatformAdapter = new StubAdapter();

export async function initPlatform(): Promise<PlatformAdapter> {
  const ya = await loadYandexSdk(6000);
  if (ya) {
    const adapter = new YandexAdapter(ya);
    try {
      await adapter.init();
      platform = adapter;
      return platform;
    } catch (e) {
      console.warn('[platform] Yandex init failed, falling back to stub', e);
    }
  }
  platform = new StubAdapter();
  await platform.init();
  return platform;
}
