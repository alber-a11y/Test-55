import Phaser from 'phaser';
import { ads } from '../platform/ads';

/**
 * Base for every screen: logical size helpers, rebuild on resize, fade transitions.
 * `go()` is the single navigation entry: when a transition is marked as an ad point,
 * the AdManager decides whether a fullscreen ad plays before the next screen.
 */
export abstract class BaseScene extends Phaser.Scene {
  protected sceneData: any = {};
  private leaving = false;

  init(data: any): void {
    this.sceneData = data ?? {};
    this.leaving = false;
  }

  get W(): number {
    return this.scale.width;
  }
  get H(): number {
    return this.scale.height;
  }
  get portrait(): boolean {
    return this.scale.height > this.scale.width;
  }
  get cx(): number {
    return this.scale.width / 2;
  }

  /** Call at the end of create(). */
  protected setupScene(opts: { resize?: boolean; fade?: boolean } = {}): void {
    if (opts.fade !== false) this.cameras.main.fadeIn(160, 7, 11, 24);
    if (opts.resize !== false) {
      const handler = () => {
        if (this.scene.isActive() && !this.leaving) this.onResize();
      };
      this.scale.on('resize', handler);
      this.events.once('shutdown', () => this.scale.off('resize', handler));
    }
  }

  /** Default: rebuild the screen with the same data. */
  protected onResize(): void {
    this.scene.restart(this.sceneData);
  }

  /** Navigate to another screen; `adPlacement` marks the transition as a fullscreen-ad point. */
  async go(key: string, data: any = {}, adPlacement?: string): Promise<void> {
    if (this.leaving) return;
    this.leaving = true;
    this.input.enabled = false;
    await new Promise<void>((res) => {
      this.cameras.main.fadeOut(140, 7, 11, 24);
      this.cameras.main.once('camerafadeoutcomplete', () => res());
      // Fallback in case the camera is not rendering (hidden tab).
      window.setTimeout(res, 400);
    });
    if (adPlacement) await ads.interstitial(adPlacement);
    this.input.enabled = true;
    this.scene.start(key, data);
  }
}
