import Phaser from 'phaser';
import { ensureBg } from '../art/textures';
import { BG_BASE } from '../art/backgrounds';
import { store } from '../core/save';
import { THEMES, type Theme } from '../data/themes';
import { ads } from '../platform/ads';

export abstract class BaseScene extends Phaser.Scene {
  protected sceneData: Record<string, unknown> = {};
  private leaving = false;

  get W(): number {
    return this.scale.width;
  }
  get H(): number {
    return this.scale.height;
  }
  get cx(): number {
    return this.scale.width / 2;
  }
  /** Left edge of the 1080-wide content column. */
  get colX(): number {
    return (this.scale.width - 1080) / 2;
  }
  get theme(): Theme {
    return THEMES[store.data.equipped.theme] ?? THEMES.theme_sky;
  }

  init(data: Record<string, unknown>): void {
    this.sceneData = data ?? {};
    this.leaving = false;
  }

  /** Call first in create(): resize handling + fade in. */
  protected setup(): void {
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
    this.cameras.main.fadeIn(180, 10, 20, 48);
  }

  protected onResize(): void {
    this.scene.restart(this.sceneData);
  }

  /** Back button: return to the sleeping level if opened from the pause menu, else to the previous screen. */
  back(): void {
    if (this.sceneData.from === 'Game' && this.scene.isSleeping('Game')) {
      if (this.leaving) return;
      this.leaving = true;
      this.cameras.main.fadeOut(150, 10, 20, 48);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.wake('Game');
        this.scene.stop();
      });
      return;
    }
    void this.go((this.sceneData.from as string) ?? 'Menu', {}, { hop: true });
  }

  /** Full-screen scenic background (solid color first, bitmap fades in when ready). */
  protected addBackground(id = store.data.equipped.bg, depth = -100): void {
    const base = this.add.rectangle(this.cx, this.H / 2, this.W, this.H, BG_BASE[id] ?? 0x7fd0ff).setDepth(depth).setScrollFactor(0);
    void ensureBg(this.textures, id, this.W, this.H).then((key) => {
      if (!this.sys.isActive() && !this.sys.isPaused()) return;
      const img = this.add.image(this.cx, this.H / 2, key).setDepth(depth + 1).setScrollFactor(0).setAlpha(0);
      this.tweens.add({ targets: img, alpha: 1, duration: 200, onComplete: () => base.destroy() });
    });
  }

  /** Switch scenes with a fade; `hop` counts as a menu transition for interstitial pacing. */
  async go(key: string, data: Record<string, unknown> = {}, opts: { hop?: boolean; ad?: string } = {}): Promise<void> {
    if (this.leaving) return;
    this.leaving = true;
    // opened over a sleeping level (from the pause menu) and now going elsewhere: drop that level
    if (this.sceneData.from === 'Game' && this.scene.key !== 'Game' && this.scene.isSleeping('Game')) this.scene.stop('Game');
    this.input.enabled = false;
    if (opts.ad) await ads.interstitial(opts.ad);
    else if (opts.hop) await ads.menuHop();
    this.cameras.main.fadeOut(150, 10, 20, 48);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.input.enabled = true;
      this.scene.start(key, data);
    });
  }
}
