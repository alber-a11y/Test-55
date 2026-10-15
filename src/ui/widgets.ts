import Phaser from 'phaser';
import { audio } from '../audio/audio';

export const FONT = '"Trebuchet MS", "Arial Black", Arial, sans-serif';

export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  size = 28,
  color = '#ffffff',
  o: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, s, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color,
      stroke: '#1b1530',
      strokeThickness: Math.max(3, Math.round(size / 5)),
      align: 'center',
      ...o,
    })
    .setOrigin(0.5);
}

export const COLORS = {
  yellow: [0xffd60a, 0xe0a800],
  green: [0x52d273, 0x2f9e4f],
  blue: [0x4c9aff, 0x2a62c9],
  purple: [0xa66cff, 0x6a3fc0],
  red: [0xff5a5f, 0xc0303a],
  grey: [0x8d99ae, 0x5c677d],
  orange: [0xff9f1c, 0xd27400],
  dark: [0x2b2f55, 0x1b1e3c],
} as const;
export type ColorName = keyof typeof COLORS;

export interface ButtonOpts {
  w: number;
  h: number;
  color?: ColorName;
  label?: string;
  size?: number;
  icon?: string;
  iconSize?: number;
  sub?: string;
  textColor?: string;
}

/** Chunky Brawl-style button with a darker bottom lip and press animation. */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  label?: Phaser.GameObjects.Text;
  sub?: Phaser.GameObjects.Text;
  icon?: Phaser.GameObjects.Image;
  private enabledState = true;
  private colorName: ColorName;
  private handler: (() => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, private o: ButtonOpts) {
    super(scene, x, y);
    this.colorName = o.color ?? 'yellow';
    this.bg = scene.add.graphics();
    this.add(this.bg);
    this.draw();
    const size = o.size ?? 28;
    let lx = 0;
    if (o.icon) {
      const isz = o.iconSize ?? o.h * 0.6;
      this.icon = scene.add.image(0, -3, o.icon).setDisplaySize(isz, isz);
      this.add(this.icon);
      if (o.label) {
        this.icon.x = -o.w / 2 + isz / 2 + 14;
        lx = isz / 2 + 4;
      }
    }
    if (o.label !== undefined) {
      this.label = txt(scene, lx, o.sub ? -12 : -3, o.label, size, o.textColor ?? '#ffffff');
      this.add(this.label);
    }
    if (o.sub) {
      this.sub = txt(scene, lx, 16, o.sub, Math.round(size * 0.6), '#ffffff');
      this.add(this.sub);
    }
    this.setSize(o.w, o.h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      if (!this.enabledState) return;
      scene.tweens.add({ targets: this, scale: 0.93, duration: 60 });
    });
    this.on('pointerout', () => scene.tweens.add({ targets: this, scale: 1, duration: 80 }));
    this.on('pointerup', () => {
      scene.tweens.add({ targets: this, scale: 1, duration: 80 });
      if (!this.enabledState) {
        audio.play('error', { vol: 0.4 });
        return;
      }
      audio.play('click', { vol: 0.5 });
      this.handler?.();
    });
    scene.add.existing(this);
  }

  private draw(): void {
    const [top, bot] = COLORS[this.enabledState ? this.colorName : 'grey'];
    const { w, h } = this.o;
    const g = this.bg;
    g.clear();
    g.fillStyle(0x1b1530, 1).fillRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 9, 16);
    g.fillStyle(bot, 1).fillRoundedRect(-w / 2, -h / 2, w, h + 3, 14);
    g.fillStyle(top, 1).fillRoundedRect(-w / 2, -h / 2, w, h - 5, 14);
    g.fillStyle(0xffffff, 0.25).fillRoundedRect(-w / 2 + 8, -h / 2 + 4, w - 16, Math.min(12, h / 4), 6);
  }

  onClick(fn: () => void): this {
    this.handler = fn;
    return this;
  }

  setEnabled(v: boolean): this {
    this.enabledState = v;
    this.draw();
    return this;
  }

  setColor(c: ColorName): this {
    this.colorName = c;
    this.draw();
    return this;
  }

  setLabel(s: string): this {
    this.label?.setText(s);
    return this;
  }

  setSub(s: string): this {
    this.sub?.setText(s);
    return this;
  }
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color = 0x2b2f55, alpha = 0.95): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x1b1530, 1).fillRoundedRect(x - 4, y - 4, w + 8, h + 8, 22);
  g.fillStyle(color, alpha).fillRoundedRect(x, y, w, h, 18);
  g.fillStyle(0xffffff, 0.06).fillRoundedRect(x + 6, y + 6, w - 12, 24, 10);
  return g;
}

/** Bright blue radial background with floating star pattern. */
export function background(scene: Phaser.Scene, c1 = 0x3d7bff, c2 = 0x16206b): void {
  const { width: w, height: h } = scene.scale;
  const key = `bg_${c1}_${c2}_${w}x${h}`;
  if (!scene.textures.exists(key)) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d')!;
    const g = ctx.createRadialGradient(w / 2, h * 0.35, 50, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, '#' + c1.toString(16).padStart(6, '0'));
    g.addColorStop(1, '#' + c2.toString(16).padStart(6, '0'));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    scene.textures.addCanvas(key, cv);
  }
  scene.add.image(0, 0, key).setOrigin(0);
  const n = Math.ceil(w / 160) * Math.ceil(h / 160);
  for (let i = 0; i < n; i++) {
    const s = scene.add
      .image(((i * 160) % (Math.ceil(w / 160) * 160)) + 80, Math.floor(i / Math.ceil(w / 160)) * 160 + 80, 'star4')
      .setScale(2.2)
      .setAlpha(0.06)
      .setAngle(i * 17);
    scene.tweens.add({ targets: s, y: s.y - 30, angle: s.angle + 40, duration: 4000 + (i % 5) * 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
}

export function toast(scene: Phaser.Scene, message: string, color = '#ffffff'): void {
  const { width } = scene.scale;
  const t = txt(scene, width / 2, 120, message, 26, color).setDepth(10000);
  t.setScrollFactor(0);
  scene.tweens.add({ targets: t, y: 90, alpha: { from: 1, to: 0 }, delay: 1200, duration: 500, onComplete: () => t.destroy() });
}

/** Coins counter pill. */
export class CoinPill extends Phaser.GameObjects.Container {
  private t: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene, x: number, y: number, value: number) {
    super(scene, x, y);
    const g = scene.add.graphics();
    g.fillStyle(0x1b1530, 0.85).fillRoundedRect(-80, -22, 170, 44, 22);
    const icon = scene.add.image(-78, 0, 'i_coin').setDisplaySize(52, 52);
    this.t = txt(scene, 10, 0, String(value), 26, '#ffe066');
    this.add([g, icon, this.t]);
    scene.add.existing(this);
  }
  set(v: number): void {
    this.t.setText(String(v));
    this.scene.tweens.add({ targets: this.t, scale: { from: 1.3, to: 1 }, duration: 200 });
  }
}

export function formatTime(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
