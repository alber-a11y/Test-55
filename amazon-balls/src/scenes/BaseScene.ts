import Phaser from 'phaser';
import { backdropTexture, theme, type Theme } from '../art/scenery';
import { equipped } from '../core/economy';
import { save } from '../core/save';

/** Common helpers: logical size, backdrop, ambient particles, fade transitions. */
export class BaseScene extends Phaser.Scene {
  protected sceneData: any = {};

  get W(): number {
    return this.scale.width;
  }
  get H(): number {
    return this.scale.height;
  }

  init(data: any): void {
    this.sceneData = data ?? {};
  }

  protected baseCreate(): void {
    this.cameras.main.fadeIn(220, 16, 5, 31);
    const onResize = () => this.onResize();
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize));
  }

  /** Default: rebuild the screen at the new size. */
  protected onResize(): void {
    if (this.scene.isActive()) this.scene.restart(this.sceneData);
  }

  protected get theme(): Theme {
    return theme(equipped('bg'));
  }

  /** Backdrop image covering the given rectangle (defaults to the whole view). */
  protected addBackdrop(x = 0, y = 0, w = this.W, h = this.H, themeId = equipped('bg')): Phaser.GameObjects.Image {
    const key = backdropTexture(this, themeId, Math.round(w), Math.round(h));
    return this.add.image(x, y, key).setOrigin(0).setDepth(-100);
  }

  /** Floating leaves / fireflies / confetti for the current theme. */
  protected addAmbient(x: number, y: number, w: number, h: number, depth = 10): void {
    if (save.data.settings.lowFx) return;
    const t = this.theme;
    const cfg: Record<string, Phaser.Types.GameObjects.Particles.ParticleEmitterConfig> = {
      leaves: { x: { min: x, max: x + w }, y: y - 20, speedY: { min: 30, max: 70 }, speedX: { min: -30, max: 30 }, rotate: { min: 0, max: 360 }, scale: { min: 0.8, max: 1.4 }, lifespan: 9000, frequency: 900, alpha: 0.9 },
      petals: { x: { min: x, max: x + w }, y: y - 20, speedY: { min: 30, max: 60 }, speedX: { min: -20, max: 40 }, rotate: { min: 0, max: 360 }, scale: { min: 0.6, max: 1 }, lifespan: 9000, frequency: 700, tint: [0xffa0c8, 0xffd0e0] },
      fireflies: { x: { min: x, max: x + w }, y: { min: y + h * 0.2, max: y + h }, speed: { min: 5, max: 25 }, scale: { start: 0.25, end: 0 }, lifespan: 4000, frequency: 250, tint: [0xfff07a, 0xb6ff7a], blendMode: 'ADD' },
      confetti: { x: { min: x, max: x + w }, y: y - 20, speedY: { min: 60, max: 120 }, speedX: { min: -30, max: 30 }, rotate: { min: 0, max: 360 }, scale: { min: 0.5, max: 0.9 }, lifespan: 9000, frequency: 260, tint: [0xff2d3d, 0xffd60a, 0x2fcb3a, 0x18c8e8, 0x9a3dff] },
      sparkles: { x: { min: x, max: x + w }, y: { min: y, max: y + h }, scale: { start: 0.5, end: 0 }, lifespan: 1600, frequency: 160, tint: [0xfff3a0, 0xffffff], blendMode: 'ADD' },
      spray: { x: { min: x, max: x + w }, y: { min: y, max: y + h * 0.5 }, speedY: { min: 10, max: 40 }, scale: { start: 0.35, end: 0 }, alpha: { start: 0.6, end: 0 }, lifespan: 3000, frequency: 200 },
    };
    const tex = t.particles === 'leaves' || t.particles === 'petals' ? 'leafp' : t.particles === 'confetti' ? 'shard' : 'spark';
    this.add.particles(0, 0, tex, cfg[t.particles]).setDepth(depth);
  }

  /** Fade out, then switch scene. */
  protected go(key: string, data: any = {}): void {
    if ((this as any)._leaving) return;
    (this as any)._leaving = true;
    this.input.enabled = false;
    this.cameras.main.fadeOut(200, 16, 5, 31);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(key, data));
  }
}
