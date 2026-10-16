import Phaser from 'phaser';
import { audio } from './audio/audio';
import { setBootProgress } from './core/bootui';
import { setLang } from './core/i18n';
import { save } from './core/save';
import { installGuards } from './platform/guards';
import { initPlatform, platform } from './platform/platform';
import { GameScene } from './scenes/GameScene';
import { HeroesScene } from './scenes/HeroesScene';
import { HudScene } from './scenes/HudScene';
import { MapScene } from './scenes/MapScene';
import { MenuScene } from './scenes/MenuScene';
import { PreloadScene } from './scenes/PreloadScene';
import { PrepScene } from './scenes/PrepScene';
import { ResultScene } from './scenes/ResultScene';
import { ShopScene } from './scenes/ShopScene';

export const GAME_H = 720;

/** Fixed logical height; width follows the screen aspect (landscape) within limits. */
export function computeWidth(): number {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  return Math.round(Phaser.Math.Clamp(GAME_H * aspect, 1024, 1640));
}

async function boot(): Promise<void> {
  setBootProgress(0.03);
  await initPlatform();
  installGuards();
  await save.load();
  setLang(save.data.settings.lang ?? platform.getLang());
  audio.init();
  audio.setVolumes(save.data.settings.soundVol, save.data.settings.musicVol);
  setBootProgress(0.1);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: computeWidth(),
    height: GAME_H,
    backgroundColor: '#0d1b4c',
    disableContextMenu: true,
    audio: { noAudio: true },
    input: { activePointers: 4 },
    render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [PreloadScene, MenuScene, MapScene, HeroesScene, ShopScene, PrepScene, GameScene, HudScene, ResultScene],
  });

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = window.setTimeout(() => {
      const w = computeWidth();
      if (w !== game.scale.gameSize.width) game.scale.setGameSize(w, GAME_H);
      else game.scale.refresh();
    }, 150);
  });
  if (new URLSearchParams(location.search).has('debug')) Object.assign(window as any, { __game: game, __save: save });
}

void boot();
