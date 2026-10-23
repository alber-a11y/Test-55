import Phaser from 'phaser';
import type { Card } from './card';
import { PAD_SCALE_X, PAD_SCALE_Y, type CardTextures } from './textures';

/**
 * Visual card: shadow + face/back image + optional glow and overlay badges.
 * Size is set in logical pixels; flips animate scaleX.
 */
export class CardView extends Phaser.GameObjects.Container {
  readonly img: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image | null = null;
  faceUp: boolean;
  /** Extra overlay objects (locks, ice, timers) owned by the game. */
  overlays: Phaser.GameObjects.GameObject[] = [];
  private flipping = false;
  /** Card shown as a wild/joker texture. */
  wild = false;

  constructor(scene: Phaser.Scene, public card: Card, private tex: CardTextures, public cw: number, public ch: number, faceUp: boolean) {
    super(scene, 0, 0);
    this.faceUp = faceUp;
    this.shadow = scene.add.image(4, 7, 'card_shadow').setAlpha(0.5);
    this.img = scene.add.image(0, 0, this.textureKey());
    this.add([this.shadow, this.img]);
    this.setCardSize(cw, ch);
    scene.add.existing(this);
  }

  textureKey(): string {
    if (!this.faceUp) return this.tex.back;
    return this.wild ? this.tex.wild : this.tex.face(this.card.suit, this.card.rank);
  }

  setCardSize(cw: number, ch: number): this {
    this.cw = cw;
    this.ch = ch;
    this.img.setDisplaySize(cw, ch);
    this.shadow.setDisplaySize(cw * PAD_SCALE_X, ch * PAD_SCALE_Y);
    this.glow?.setDisplaySize(cw * PAD_SCALE_X, ch * PAD_SCALE_Y);
    this.setSize(cw, ch);
    return this;
  }

  /** Re-read textures (after a skin change). */
  refresh(): void {
    this.img.setTexture(this.textureKey());
    this.img.setDisplaySize(this.cw, this.ch);
  }

  setFaceUp(up: boolean, animate = true, delay = 0): void {
    if (up === this.faceUp && !this.flipping) return;
    this.faceUp = up;
    if (!animate) {
      this.refresh();
      return;
    }
    this.flipping = true;
    const sx = this.scaleX || 1;
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      duration: 90,
      delay,
      ease: 'Sine.In',
      onComplete: () => {
        this.refresh();
        this.scene.tweens.add({
          targets: this,
          scaleX: sx,
          duration: 110,
          ease: 'Sine.Out',
          onComplete: () => (this.flipping = false),
        });
      },
    });
  }

  setGlow(on: boolean, color = 0xffffff): void {
    if (on && !this.glow) {
      this.glow = this.scene.add.image(0, 0, 'card_glow').setDisplaySize(this.cw * PAD_SCALE_X, this.ch * PAD_SCALE_Y);
      this.addAt(this.glow, 1);
      this.scene.tweens.add({ targets: this.glow, alpha: { from: 1, to: 0.35 }, duration: 520, yoyo: true, repeat: -1 });
    }
    if (this.glow) this.glow.setTint(color);
    if (!on && this.glow) {
      this.scene.tweens.killTweensOf(this.glow);
      this.glow.destroy();
      this.glow = null;
    }
  }

  /** Lift effect while dragging. */
  setLifted(on: boolean): void {
    this.shadow.setPosition(on ? 10 : 4, on ? 16 : 7).setAlpha(on ? 0.7 : 0.5);
  }

  /** Darken (non-playable look). */
  setDim(on: boolean): void {
    this.img.setTint(on ? 0xb8b8c8 : 0xffffff);
  }

  clearOverlays(): void {
    this.overlays.forEach((o) => o.destroy());
    this.overlays = [];
  }

  addOverlay(o: Phaser.GameObjects.GameObject): void {
    this.overlays.push(o);
    this.add(o);
  }

  /** Tween to a position. */
  moveTo(x: number, y: number, duration = 220, delay = 0, ease = 'Cubic.Out'): Phaser.Tweens.Tween | null {
    if (duration <= 0) {
      this.setPosition(x, y);
      return null;
    }
    return this.scene.tweens.add({ targets: this, x, y, duration, delay, ease });
  }
}
