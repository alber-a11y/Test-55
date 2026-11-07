import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import '@fontsource/nunito/cyrillic-800.css';
import '@fontsource/nunito/cyrillic-900.css';
import Phaser from 'phaser';
import { engine } from './audio/engine';
import { computeSize } from './config';
import { detectLang, setLang } from './core/i18n';
import { store } from './core/save';
import { ads } from './platform/ads';
import { installGuards, installPauseHooks } from './platform/guards';
import { platform } from './platform/platform';
import { GameScene } from './scenes/game/GameScene';
import { MapScene } from './scenes/MapScene';
import { MenuScene } from './scenes/MenuScene';
import { PreloadScene } from './scenes/PreloadScene';
import { SettingsScene } from './scenes/SettingsScene';
import { ShopScene } from './scenes/ShopScene';

async function boot(): Promise<void> {
  installGuards();
  store.load();
  try {
    await platform.init();
  } catch (e) {
    console.warn('platform init failed', e);
  }
  setLang(detectLang(store.data.settings.lang, platform.getLang()));
  engine.installUnlock();
  engine.setVolumes(store.data.settings.music, store.data.settings.sfx);
  const title = document.getElementById('boot-title');
  if (title) title.textContent = document.title.split(':')[0];
  // make sure the heavy rounded font is ready before any text is rasterised
  try {
    await Promise.race([
      Promise.all([document.fonts.load('900 40px Nunito', 'АаAa'), document.fonts.load('800 40px Nunito', 'АаAa')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* fall back to system fonts */
  }

  const { w, h } = computeSize();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    width: w,
    height: h,
    backgroundColor: '#2f7fc4',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
    render: { antialias: true, powerPreference: 'high-performance' },
    input: { activePointers: 2, mouse: { preventDefaultWheel: true } },
    disableContextMenu: true,
    banner: false,
    scene: [PreloadScene, MenuScene, MapScene, GameScene, ShopScene, SettingsScene],
  });
  ads.attach(game);
  installPauseHooks();

  let timer: number | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const s = computeSize();
      if (s.w !== game.scale.width || s.h !== game.scale.height) game.scale.setGameSize(s.w, s.h);
      else game.scale.refresh();
    }, 150);
  });
  window.addEventListener('beforeunload', () => store.flush());
  if (new URLSearchParams(location.search).has('debug')) Object.assign(window, { __game: game, __store: store, __audio: engine });
}

void boot();
