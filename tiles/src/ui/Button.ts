import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { buttonTexture } from '../art/textures';
import { label } from './text';

export interface ButtonOpts {
  w: number;
  h: number;
  colors: [string, string, string];
  text?: string;
  fontSize?: number;
  icon?: string;
  iconSize?: number;
  radius?: number;
  onClick: () => void;
  /** Extra check before firing (e.g. pointer inside a scroll viewport and not dragging). */
  guard?: (p: Phaser.Input.Pointer) => boolean;
  silent?: boolean;
}

export class Button extends Phaser.GameObjects.Container {
  bg: Phaser.GameObjects.Image;
  txt?: Phaser.GameObjects.Text;
  icon?: Phaser.GameObjects.Image;
  enabled = true;
  private pressed = false;
  private baseScale = 1;
  readonly o: ButtonOpts;

  constructor(scene: Phaser.Scene, x: number, y: number, o: ButtonOpts) {
    super(scene, x, y);
    this.o = o;
    const r = o.radius ?? Math.min(40, o.h * 0.32);
    this.bg = scene.add.image(0, 6, buttonTexture(scene.textures, o.w, o.h, o.colors, r));
    this.add(this.bg);
    const fs = o.fontSize ?? Math.round(o.h * 0.4);
    if (o.icon) {
      const s = o.iconSize ?? (o.text ? o.h * 0.62 : o.h * 0.66);
      const ix = o.text ? -o.w / 2 + o.h * 0.5 : 0;
      this.icon = scene.add.image(ix, -4, o.icon).setDisplaySize(s, s);
      this.add(this.icon);
    }
    if (o.text !== undefined) {
      const tx = o.icon ? (o.h * 0.42) / 2 + 6 : 0;
      this.txt = label(scene, tx, -5, o.text, fs, { stroke: o.colors[2] });
      this.add(this.txt);
      this.fitText();
    }
    this.setSize(o.w, o.h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      this.pressed = true;
      scene.tweens.add({ targets: this, scale: this.baseScale * 0.93, duration: 70 });
    });
    this.on('pointerout', () => this.release());
    this.on('pointerup', (p: Phaser.Input.Pointer) => {
      const was = this.pressed;
      this.release();
      if (!was || !this.enabled) return;
      if (o.guard && !o.guard(p)) return;
      if (!o.silent) sfx('click');
      o.onClick();
    });
    scene.add.existing(this);
  }

  private release(): void {
    if (!this.pressed) return;
    this.pressed = false;
    this.scene?.tweens.add({ targets: this, scale: this.baseScale, duration: 90, ease: 'Back.easeOut' });
  }

  private fitText(): void {
    if (!this.txt) return;
    const max = this.o.w - (this.icon ? this.o.h * 0.95 : 36);
    if (this.txt.width > max) this.txt.setScale(max / this.txt.width);
    else this.txt.setScale(1);
  }

  setText(s: string): this {
    this.txt?.setText(s);
    this.fitText();
    return this;
  }

  setBaseScale(s: number): this {
    this.baseScale = s;
    this.setScale(s);
    return this;
  }

  setEnabled(on: boolean): this {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.6);
    return this;
  }

  setColors(colors: [string, string, string]): this {
    const r = this.o.radius ?? Math.min(40, this.o.h * 0.32);
    this.bg.setTexture(buttonTexture(this.scene.textures, this.o.w, this.o.h, colors, r));
    this.txt?.setStroke(colors[2], Math.max(2, Math.round((this.o.fontSize ?? this.o.h * 0.4) * 0.16)));
    return this;
  }

  /** Gentle attention pulse (Play buttons, rewarded offers). */
  pulse(): this {
    this.scene.tweens.add({ targets: this, scale: { from: this.baseScale, to: this.baseScale * 1.05 }, yoyo: true, repeat: -1, duration: 650, ease: 'Sine.easeInOut' });
    return this;
  }
}
