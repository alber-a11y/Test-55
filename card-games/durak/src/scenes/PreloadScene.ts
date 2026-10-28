import Phaser from 'phaser';
import { hideBootLoader, setBootProgress } from '@shared/core/bootui';
import { platform } from '@shared/platform/platform';
import { registerIcons } from '@shared/ui/icons';
import { faceTex, PLAYER_FACES } from '../art/avatars';
import { refreshDay } from '../progress';
import { skin } from '../skin';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    const steps: (() => void)[] = [
      () => registerIcons(this.textures),
      () => skin.init(this.textures),
      () => PLAYER_FACES.forEach((f, i) => faceTex(this.textures, `me${i}`, f)),
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
