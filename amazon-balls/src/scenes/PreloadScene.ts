import Phaser from 'phaser';
import { makeAllBallTextures, makeSpecialTextures } from '../art/balls';
import { makeCharacterTextures } from '../art/characters';
import { makeIconTextures } from '../art/icons';
import { makeDecoTextures } from '../art/scenery';
import { hideBootLoader, setBootProgress } from '../core/bootui';
import { ads } from '../platform/AdManager';
import { platform } from '../platform/platform';

/** Generates every texture in code (no asset files), then shows the preroll ad. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    const steps: (() => void)[] = [
      () => makeSpecialTextures(this),
      () => makeIconTextures(this),
      () => makeCharacterTextures(this),
      () => makeDecoTextures(this),
      () => makeAllBallTextures(this),
    ];
    let i = 0;
    const next = () => {
      if (i >= steps.length) {
        setBootProgress(1);
        void this.finish();
        return;
      }
      steps[i++]();
      setBootProgress(0.15 + (0.85 * i) / steps.length);
      this.time.delayedCall(16, next);
    };
    next();
  }

  private async finish(): Promise<void> {
    hideBootLoader();
    platform.loadingReady();
    await ads.interstitial('preroll', 0);
    const q = new URLSearchParams(location.search);
    const lvl = Number(q.get('level'));
    if (q.has('debug') && lvl > 0) this.scene.start('Game', { level: lvl });
    else this.scene.start(q.get('scene') ?? 'Menu');
  }
}
