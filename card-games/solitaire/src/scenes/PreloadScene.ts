import Phaser from 'phaser';
import { hideBootLoader, setBootProgress } from '@shared/core/bootui';
import { platform } from '@shared/platform/platform';
import { faceStyle, renderPortrait } from '@shared/cards/faces';
import { registerIcons } from '@shared/ui/icons';
import { refreshDay } from '../progress';
import { skin } from '../skin';

/** Generates every texture in code (icons, cards, table), then opens the menu. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    const steps: (() => void)[] = [
      () => registerIcons(this.textures),
      () => skin.init(this.textures),
      () => skin.table(this.scale.width, this.scale.height),
      () => {
        // 12 avatars: J/Q/K of every suit.
        for (let i = 0; i < 12; i++) {
          const key = `avatar_${i}`;
          if (!this.textures.exists(key)) this.textures.addCanvas(key, renderPortrait(faceStyle('classic'), (i % 4) as 0, 11 + Math.floor(i / 4), 200));
        }
      },
      () => refreshDay(),
    ];
    let i = 0;
    const run = () => {
      steps[i++]();
      setBootProgress(0.2 + (0.8 * i) / steps.length);
      if (i < steps.length) window.setTimeout(run, 0);
      else {
        hideBootLoader();
        platform.loadingReady();
        this.scene.start('Menu');
      }
    };
    run();
  }
}
