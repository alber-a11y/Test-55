import './styles.css';
import { audio } from './audio/audio';
import { CONFIG } from './config';
import { onLangChange, setLang } from './core/i18n';
import { loadSave, save } from './core/save';
import { ads } from './platform/ads';
import { installGuards } from './platform/guards';
import { initPlatform } from './platform/platform';
import type { Lang } from './platform/types';
import { currentScreen, startLoop, syncGameplay } from './ui/app';
import { closeAllModals } from './ui/dom';
import { GameScreen } from './ui/game';
import { nav } from './ui/nav';
import { bestPlacement } from './game/solver';
import { applyAudioSettings, openSettings } from './ui/settings';

function bootProgress(p: number): void {
  const f = document.getElementById('boot-fill');
  if (f) f.style.width = `${Math.round(p * 100)}%`;
}

function pickLang(platformLang: Lang | null): Lang {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'ru' || q === 'en') return q;
  if (save.settings.lang) return save.settings.lang;
  if (platformLang) return platformLang;
  const n = (navigator.language || 'ru').toLowerCase();
  return /^(ru|be|kk|uk|uz)/.test(n) ? 'ru' : 'en';
}

async function boot(): Promise<void> {
  bootProgress(0.15);
  const platform = await initPlatform();
  bootProgress(0.55);
  installGuards();
  await loadSave();
  bootProgress(0.85);
  setLang(pickLang(platform.getLang()));
  applyAudioSettings();

  // Browsers allow audio only after a gesture.
  const unlock = () => audio.unlock();
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });

  onLangChange(() => {
    if (currentScreen() instanceof GameScreen) return;
    closeAllModals();
    nav.menu();
    openSettings();
  });
  ads.onAdState(() => syncGameplay());

  startLoop();
  nav.menu();
  bootProgress(1);
  document.getElementById('boot')?.classList.add('done');
  window.setTimeout(() => document.getElementById('boot')?.remove(), 500);
  platform.loadingReady();

  if (new URLSearchParams(location.search).has('debug')) {
    (window as any).__br = { save, nav, currentScreen, ads, bestPlacement };
  }
  if (CONFIG.ads.onBoot) void ads.interstitial('boot');
}

void boot();
