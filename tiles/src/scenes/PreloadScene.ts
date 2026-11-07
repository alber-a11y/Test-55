import Phaser from 'phaser';
import { ensureBg, ensureIcons, ensureSkin, ensureUi } from '../art/textures';
import { store } from '../core/save';
import { AD_CONFIG } from '../platform/ads.config';
import { ads } from '../platform/ads';
import { platform } from '../platform/platform';

/** Rasterises the art the first screen needs, then hands over to the menu. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  async create(): Promise<void> {
    const bar = document.getElementById('boot-bar');
    const eq = store.data.equipped;
    const jobs: Array<Promise<unknown>> = [
      ensureUi(this.textures),
      ensureSkin(this.textures, eq.skin),
      ensureIcons(this.textures, eq.icons),
      ensureBg(this.textures, eq.bg, this.scale.width, this.scale.height),
    ];
    let done = 0;
    jobs.forEach((j) =>
      j.then(() => {
        done++;
        if (bar) bar.style.width = `${10 + (done / jobs.length) * 90}%`;
      }),
    );
    await Promise.all(jobs);
    const boot = document.getElementById('boot');
    if (boot) {
      boot.style.opacity = '0';
      setTimeout(() => boot.remove(), 400);
    }
    platform.loadingReady();
    if (AD_CONFIG.onBoot) await ads.interstitial('boot');
    this.scene.start('Menu');
  }
}
