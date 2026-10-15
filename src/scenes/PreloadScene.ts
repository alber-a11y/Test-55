import Phaser from 'phaser';
import { buildTextures } from '../art/textures';
import { hideBootLoader, setBootProgress } from '../core/bootui';
import { platform } from '../platform/platform';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    void buildTextures(this, (p) => setBootProgress(0.1 + p * 0.9)).then(() => {
      hideBootLoader();
      platform.loadingReady();
      this.scene.start('Menu');
    });
  }
}
