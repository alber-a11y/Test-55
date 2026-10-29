import Phaser from 'phaser';
import { audio } from '@shared/audio/audio';
import { setBootProgress } from '@shared/core/bootui';
import { setLang } from '@shared/core/i18n';
import { adConfig, ads } from '@shared/platform/ads';
import { installGuards } from '@shared/platform/guards';
import { initPlatform, platform } from '@shared/platform/platform';
import { platformConfig } from '@shared/platform/types';
import './strings';
import { save } from './save';
import { SCENES } from './scenes';
import { SFX, TRACKS } from './sounds';

/** Short side of the logical canvas; the long side follows the screen aspect. */
export const SHORT = 1080;

export function computeSize(): { w: number; h: number } {
  const ww = Math.max(1, window.innerWidth);
  const wh = Math.max(1, window.innerHeight);
  if (wh > ww) {
    const h = Math.round(Phaser.Math.Clamp((SHORT * wh) / ww, 1500, 2400));
    return { w: SHORT, h };
  }
  const w = Math.round(Phaser.Math.Clamp((SHORT * ww) / wh, 1500, 2300));
  return { w, h: SHORT };
}

async function boot(): Promise<void> {
  platformConfig.saveKey = 'thousand_express_save_v1';
  platformConfig.title = 'Thousand Express';
  setBootProgress(0.05);
  await initPlatform();
  installGuards();
  await save.load();
  setLang(save.data.settings.lang ?? platform.getLang());
  audio.init(SFX, TRACKS);
  audio.setVolumes(save.data.settings.soundVol, save.data.settings.musicVol);
  ads.gamesFinished = () => save.data.totals.deals;
  setBootProgress(0.15);

  const { w, h } = computeSize();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: w,
    height: h,
    backgroundColor: '#101833',
    disableContextMenu: true,
    audio: { noAudio: true },
    input: { activePointers: 2 },
    render: { antialias: true, roundPixels: false, powerPreference: 'high-performance', mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: SCENES,
  });

  let rt = 0;
  const onResize = () => {
    clearTimeout(rt);
    rt = window.setTimeout(() => {
      const s = computeSize();
      if (s.w !== game.scale.gameSize.width || s.h !== game.scale.gameSize.height) game.scale.setGameSize(s.w, s.h);
      else game.scale.refresh();
    }, 150);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  if (new URLSearchParams(location.search).has('debug')) Object.assign(window as any, { __game: game, __save: save, __ads: ads, __adConfig: adConfig });
}

void boot();
