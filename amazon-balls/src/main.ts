import Phaser from 'phaser';
import { audio } from './audio/audio';
import { setBootProgress } from './core/bootui';
import { setLang } from './core/i18n';
import { pauseHub } from './core/pause';
import { save } from './core/save';
import { COL_H, COL_W } from './gameplay/geom';
import { installGuards } from './platform/guards';
import { initPlatform, platform } from './platform/platform';
import { GameScene } from './scenes/GameScene';
import { MapScene } from './scenes/MapScene';
import { MenuScene } from './scenes/MenuScene';
import { PreloadScene } from './scenes/PreloadScene';
import { SettingsScene } from './scenes/SettingsScene';
import { ShopScene } from './scenes/ShopScene';

/**
 * Portrait design (720×1280). Wider screens (PC) get a wider world with the
 * play column centred; taller phones get extra height.
 */
function computeSize(): { w: number; h: number } {
  const a = window.innerWidth / Math.max(1, window.innerHeight);
  if (a >= COL_W / COL_H) return { w: Math.round(Math.min(COL_H * a, 2560)), h: COL_H };
  return { w: COL_W, h: Math.round(Math.min(COL_W / a, 1600)) };
}

async function boot(): Promise<void> {
  setBootProgress(0.04);
  await initPlatform();
  installGuards();
  await save.load();
  setLang(save.data.settings.lang ?? platform.getLang());
  audio.init();
  audio.setVolumes(save.data.settings.soundVol, save.data.settings.musicVol);
  setBootProgress(0.12);

  const size = computeSize();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: size.w,
    height: size.h,
    backgroundColor: '#0b2a1a',
    disableContextMenu: true,
    audio: { noAudio: true },
    input: { activePointers: 2, mouse: { preventDefaultWheel: true } },
    render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [PreloadScene, MenuScene, MapScene, GameScene, ShopScene, SettingsScene],
  });

  // Ads, hidden tab and platform pauses freeze the whole game loop.
  pauseHub.subscribe(() => {
    if (pauseHub.systemPaused) game.loop.sleep();
    else game.loop.wake();
  });

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = window.setTimeout(() => {
      const s = computeSize();
      if (s.w !== game.scale.gameSize.width || s.h !== game.scale.gameSize.height) game.scale.setGameSize(s.w, s.h);
      else game.scale.refresh();
    }, 200);
  });
  if (new URLSearchParams(location.search).has('debug')) Object.assign(window as any, { __game: game, __save: save });
}

void boot();
