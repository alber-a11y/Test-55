import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './styles.css';
import './screens.css';
import { audio } from './audio/audio';
import { track } from './core/analytics';
import { applyOverrides, applyUrlOverrides } from './core/config';
import { detectLang, setGender, setLang } from './core/i18n';
import { save } from './core/save';
import { heroById } from './meta/heroes';
import { tickLives } from './meta/economy';
import { ads } from './platform/AdManager';
import { installGuards } from './platform/guards';
import { initPlatform, platform } from './platform/platform';
import './screens/heroes';
import './screens/home';
import './screens/level';
import './screens/room';
import './screens/shop';
import { go } from './ui/router';
import { stage } from './ui/stage';

const fill = (p: number) => {
  const el = document.getElementById('boot-fill');
  if (el) el.style.width = `${p}%`;
};

async function boot(): Promise<void> {
  fill(10);
  stage.mount(document.getElementById('stage')!);
  try {
    await initPlatform();
  } catch (e) {
    console.warn('[platform] init failed', e);
  }
  fill(35);
  try {
    applyOverrides(await platform.getFlags());
  } catch {
    /* no remote config */
  }
  applyUrlOverrides();
  await save.load();
  fill(60);
  const s = save.data;
  if (new URLSearchParams(location.search).has('reset')) save.reset();
  setLang(detectLang(platform.getLang(), s.lang));
  setGender(heroById(s.hero).gender);
  ads.winsProvider = () => save.data.wins;
  audio.init();
  audio.setVolumes(s.settings.sound, s.settings.music);
  installGuards();
  tickLives();
  await document.fonts?.ready;
  fill(100);
  document.getElementById('boot')?.remove();
  platform.loadingReady();
  track('session_start', { wins: s.wins, level: s.level });
  // Returning players may see a fullscreen ad at start (allowed by portal rules).
  await ads.interstitial('start');
  await go(s.hero ? 'home' : 'heroes');
  window.addEventListener('pagehide', () => save.flush());
  document.addEventListener('visibilitychange', () => document.hidden && save.flush());
}

void boot();
if (new URLSearchParams(location.search).has('debug')) (window as any).__go = go;
