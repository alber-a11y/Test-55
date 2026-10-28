import Phaser from 'phaser';
import { audio } from '../audio/audio';

export const FONT = '"Trebuchet MS", "Segoe UI", Arial, sans-serif';
export const SERIF_FONT = 'Georgia, "Times New Roman", serif';

/** Shared palette of the card games UI: deep teal / navy panels with gold accents. */
export const UI = {
  ink: '#1a1426',
  inkN: 0x1a1426,
  gold: '#ffd166',
  goldN: 0xffd166,
  cream: '#fff6e0',
  panel: 0x1f2b48,
  panel2: 0x283a63,
  dim: 0x070b18,
};

export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  size = 40,
  color = '#ffffff',
  o: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, s, {
      fontFamily: FONT,
      fontSize: `${Math.round(size)}px`,
      fontStyle: 'bold',
      color,
      stroke: UI.ink,
      strokeThickness: Math.max(3, Math.round(size / 6)),
      align: 'center',
      ...o,
    })
    .setOrigin(0.5);
}

/** Plain (no stroke) text, for body copy on panels. */
export function body(scene: Phaser.Scene, x: number, y: number, s: string, size = 32, color = '#e8ecf8', wrap = 0): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, s, {
      fontFamily: FONT,
      fontSize: `${Math.round(size)}px`,
      color,
      align: 'center',
      wordWrap: wrap ? { width: wrap, useAdvancedWrap: true } : undefined,
      lineSpacing: 6,
    })
    .setOrigin(0.5);
}

export const COLORS = {
  gold: [0xffd166, 0xe09f1f],
  green: [0x5ad17e, 0x2c9a52],
  blue: [0x5aa9ff, 0x2f6fd0],
  purple: [0xb084ff, 0x7048c8],
  red: [0xff6b6b, 0xc8323c],
  grey: [0x98a2b8, 0x5f6a82],
  orange: [0xffa94d, 0xd9700f],
  teal: [0x3fd0c9, 0x1c8f8a],
  dark: [0x34466e, 0x1f2b48],
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
  /** Small "▶ ad" badge in the corner: the action plays a rewarded video. */
  ad?: boolean;
  /** Badge text (counter) in the top-right corner. */
  badge?: string;
  radius?: number;
}

/** Scrollers set this while a drag is in progress so buttons under the finger do not fire. */
export const dragGuard = { moved: false };

/** Chunky button with a darker lip, press animation and optional icon / ad badge. */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  label?: Phaser.GameObjects.Text;
  sub?: Phaser.GameObjects.Text;
  icon?: Phaser.GameObjects.Image;
  private badgeC?: Phaser.GameObjects.Container;
  private enabledState = true;
  private colorName: ColorName;
  private handler: (() => void) | null = null;
  /** Optional extra hit test (e.g. inside a scroll viewport). */
  hitGuard: ((p: Phaser.Input.Pointer) => boolean) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, private o: ButtonOpts) {
    super(scene, x, y);
    this.colorName = o.color ?? 'gold';
    this.bg = scene.add.graphics();
    this.add(this.bg);
    this.draw();
    const size = o.size ?? 40;
    let lx = 0;
    if (o.icon) {
      const isz = o.iconSize ?? o.h * 0.62;
      this.icon = scene.add.image(0, -4, o.icon).setDisplaySize(isz, isz);
      this.add(this.icon);
      if (o.label) {
        this.icon.x = -o.w / 2 + isz / 2 + 18;
        lx = isz / 2 + 6;
      }
    }
    const tc = o.textColor ?? (this.colorName === 'gold' ? '#3b2400' : '#ffffff');
    const stroke = this.colorName === 'gold' ? { stroke: '#fff3c4', strokeThickness: 0 } : {};
    if (o.label !== undefined) {
      this.label = txt(scene, lx, o.sub ? -size * 0.36 - 4 : -4, o.label, size, tc, stroke);
      this.add(this.label);
      this.fitLabel();
    }
    if (o.sub) {
      this.sub = txt(scene, lx, size * 0.44, o.sub, Math.max(22, Math.round(size * 0.55)), tc, stroke);
      this.add(this.sub);
    }
    if (o.ad) this.addAdBadge();
    if (o.badge) this.setBadge(o.badge);
    this.setSize(o.w, o.h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      dragGuard.moved = false;
      if (!this.enabledState) return;
      scene.tweens.add({ targets: this, scale: 0.94, duration: 60 });
    });
    this.on('pointerout', () => scene.tweens.add({ targets: this, scale: 1, duration: 80 }));
    this.on('pointerup', (p: Phaser.Input.Pointer) => {
      scene.tweens.add({ targets: this, scale: 1, duration: 80 });
      if (dragGuard.moved) return;
      if (this.hitGuard && !this.hitGuard(p)) return;
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
    const r = this.o.radius ?? Math.min(26, h * 0.3);
    const g = this.bg;
    g.clear();
    g.fillStyle(UI.inkN, 0.9).fillRoundedRect(-w / 2 - 3, -h / 2 - 2, w + 6, h + 10, r + 2);
    g.fillStyle(bot, 1).fillRoundedRect(-w / 2, -h / 2, w, h + 4, r);
    g.fillStyle(top, 1).fillRoundedRect(-w / 2, -h / 2, w, h - 6, r);
    g.fillStyle(0xffffff, 0.22).fillRoundedRect(-w / 2 + 10, -h / 2 + 5, w - 20, Math.min(16, h / 4), 8);
  }

  private addAdBadge(): void {
    const s = Math.min(54, this.o.h * 0.5);
    const c = this.scene.add.container(this.o.w / 2 - s * 0.35, -this.o.h / 2 + s * 0.3);
    const g = this.scene.add.graphics();
    g.fillStyle(UI.inkN, 1).fillRoundedRect(-s / 2 - 3, -s / 2 - 3, s + 6, s * 0.8 + 6, 10);
    g.fillStyle(0xff4d6d, 1).fillRoundedRect(-s / 2, -s / 2, s, s * 0.8, 8);
    g.fillStyle(0xffffff, 1).fillTriangle(-s * 0.14, -s * 0.34, -s * 0.14, s * 0.14, s * 0.24, -s * 0.1);
    c.add(g);
    this.add(c);
  }

  setBadge(text: string | null): this {
    this.badgeC?.destroy();
    this.badgeC = undefined;
    if (!text) return this;
    const c = this.scene.add.container(this.o.w / 2 - 8, -this.o.h / 2 + 8);
    const t = txt(this.scene, 0, 0, text, 26, '#ffffff');
    const bw = Math.max(40, t.width + 18);
    const g = this.scene.add.graphics();
    g.fillStyle(UI.inkN, 1).fillRoundedRect(-bw / 2 - 3, -23, bw + 6, 46, 23);
    g.fillStyle(0xe8364f, 1).fillRoundedRect(-bw / 2, -20, bw, 40, 20);
    c.add([g, t]);
    this.badgeC = c;
    this.add(c);
    return this;
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

  get enabled(): boolean {
    return this.enabledState;
  }

  setColor(c: ColorName): this {
    this.colorName = c;
    this.draw();
    return this;
  }

  setLabel(s: string): this {
    this.label?.setText(s);
    this.fitLabel();
    return this;
  }

  /** Long labels shrink so they never spill out of the button. */
  private fitLabel(): void {
    if (!this.label) return;
    this.label.setScale(1);
    const room = this.o.w - 36 - (this.icon && this.o.label ? (this.o.iconSize ?? this.o.h * 0.62) + 6 : 0);
    if (this.label.width > room) this.label.setScale(room / this.label.width);
  }

  setSub(s: string): this {
    this.sub?.setText(s);
    return this;
  }
}

/** Round icon button (top bars, in-game tools). */
export class IconButton extends Button {
  constructor(scene: Phaser.Scene, x: number, y: number, icon: string, size = 100, color: ColorName = 'dark', opts: Partial<ButtonOpts> = {}) {
    super(scene, x, y, { w: size, h: size, color, icon, iconSize: size * 0.66, radius: size * 0.3, ...opts });
  }
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color = UI.panel, alpha = 0.96, r = 30): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(UI.inkN, 0.95).fillRoundedRect(x - 5, y - 5, w + 10, h + 12, r + 4);
  g.fillStyle(color, alpha).fillRoundedRect(x, y, w, h, r);
  g.lineStyle(3, 0xffffff, 0.08).strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, r - 6);
  return g;
}

/** Ribbon title banner. */
export function ribbon(scene: Phaser.Scene, x: number, y: number, w: number, label: string, color = 0xe8364f, size = 46): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const h = size * 1.7;
  const g = scene.add.graphics();
  const dark = Phaser.Display.Color.IntegerToColor(color).darken(25).color;
  g.fillStyle(dark, 1);
  g.fillTriangle(-w / 2 - 40, -h / 2 + 14, -w / 2 + 10, -h / 2 + 14, -w / 2 + 10, h / 2 + 14);
  g.fillTriangle(-w / 2 - 40, h / 2 + 14, -w / 2 - 10, 14, -w / 2 + 10, h / 2 + 14);
  g.fillTriangle(w / 2 + 40, -h / 2 + 14, w / 2 - 10, -h / 2 + 14, w / 2 - 10, h / 2 + 14);
  g.fillTriangle(w / 2 + 40, h / 2 + 14, w / 2 + 10, 14, w / 2 - 10, h / 2 + 14);
  g.fillStyle(UI.inkN, 1).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 14);
  g.fillStyle(color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 12);
  g.fillStyle(0xffffff, 0.2).fillRoundedRect(-w / 2 + 8, -h / 2 + 5, w - 16, h * 0.25, 8);
  c.add([g, txt(scene, 0, -2, label, size, '#ffffff')]);
  return c;
}

export function toast(scene: Phaser.Scene, message: string, color = '#ffffff'): void {
  const { width, height } = scene.scale;
  const t = txt(scene, width / 2, height * 0.16, message, 40, color, { wordWrap: { width: width * 0.86 } }).setDepth(10000);
  const bg = scene.add.graphics().setDepth(9999);
  bg.fillStyle(UI.inkN, 0.85).fillRoundedRect(width / 2 - t.width / 2 - 30, t.y - t.height / 2 - 16, t.width + 60, t.height + 32, 24);
  scene.tweens.add({
    targets: [t, bg],
    y: '-=40',
    alpha: { from: 1, to: 0 },
    delay: 1500,
    duration: 500,
    onComplete: () => {
      t.destroy();
      bg.destroy();
    },
  });
}

/** Counter pill (coins, stars). */
export class Pill extends Phaser.GameObjects.Container {
  private t: Phaser.GameObjects.Text;
  readonly icon: Phaser.GameObjects.Image;
  constructor(scene: Phaser.Scene, x: number, y: number, icon: string, value: number | string, w = 230, color = '#ffe08a') {
    super(scene, x, y);
    const g = scene.add.graphics();
    g.fillStyle(UI.inkN, 0.8).fillRoundedRect(-w / 2, -32, w, 64, 32);
    this.icon = scene.add.image(-w / 2 + 6, 0, icon).setDisplaySize(78, 78);
    this.t = txt(scene, 22, 0, String(value), 38, color);
    this.add([g, this.icon, this.t]);
    this.setSize(w, 64);
    scene.add.existing(this);
  }
  set(v: number | string): void {
    if (this.t.text === String(v)) return;
    this.t.setText(String(v));
    this.scene.tweens.add({ targets: this.t, scale: { from: 1.3, to: 1 }, duration: 220 });
  }
}

/** Horizontal 0..1 slider with a draggable knob and percentage readout. */
export class Slider extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private dragging = false;

  constructor(scene: Phaser.Scene, x: number, y: number, private trackW: number, private value: number, private onChange: (v: number, final: boolean) => void) {
    super(scene, x, y);
    this.g = scene.add.graphics();
    this.label = txt(scene, trackW / 2 + 70, 0, '', 32, '#ffffff');
    const zone = scene.add.zone(0, 0, trackW + 60, 80).setInteractive({ useHandCursor: true });
    this.add([this.g, this.label, zone]);
    const setFrom = (p: Phaser.Input.Pointer, final: boolean) => {
      const m = this.getWorldTransformMatrix();
      const v = Phaser.Math.Clamp((p.x - m.tx + this.trackW / 2) / this.trackW, 0, 1);
      this.value = Math.round(v * 20) / 20;
      this.draw();
      this.onChange(this.value, final);
    };
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = true;
      setFrom(p, false);
    });
    const move = (p: Phaser.Input.Pointer) => this.dragging && setFrom(p, false);
    const up = (p: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      this.dragging = false;
      setFrom(p, true);
    };
    scene.input.on('pointermove', move);
    scene.input.on('pointerup', up);
    this.once('destroy', () => {
      scene.input.off('pointermove', move);
      scene.input.off('pointerup', up);
    });
    this.draw();
    scene.add.existing(this);
  }

  private draw(): void {
    const w = this.trackW;
    const g = this.g;
    g.clear();
    g.fillStyle(UI.inkN, 1).fillRoundedRect(-w / 2 - 4, -17, w + 8, 34, 17);
    g.fillStyle(0x3a4a70, 1).fillRoundedRect(-w / 2, -13, w, 26, 13);
    if (this.value > 0) g.fillStyle(0x5ad17e, 1).fillRoundedRect(-w / 2, -13, Math.max(26, w * this.value), 26, 13);
    const kx = -w / 2 + w * this.value;
    g.fillStyle(UI.inkN, 1).fillCircle(kx, 0, 28);
    g.fillStyle(UI.goldN, 1).fillCircle(kx, 0, 23);
    g.fillStyle(0xffffff, 0.5).fillCircle(kx - 6, -7, 7);
    this.label.setText(this.value <= 0 ? 'OFF' : `${Math.round(this.value * 100)}%`);
  }
}

/** On/off switch. */
export class Toggle extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene, x: number, y: number, private isOn: boolean, private onChange: (v: boolean) => void) {
    super(scene, x, y);
    this.g = scene.add.graphics();
    this.add(this.g);
    this.setSize(120, 64);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerup', () => {
      this.isOn = !this.isOn;
      audio.play('click', { vol: 0.5 });
      this.draw();
      this.onChange(this.isOn);
    });
    this.draw();
    scene.add.existing(this);
  }
  private draw(): void {
    const g = this.g;
    g.clear();
    g.fillStyle(UI.inkN, 1).fillRoundedRect(-60, -32, 120, 64, 32);
    g.fillStyle(this.isOn ? 0x5ad17e : 0x58627c, 1).fillRoundedRect(-56, -28, 112, 56, 28);
    g.fillStyle(0xffffff, 1).fillCircle(this.isOn ? 28 : -28, 0, 23);
  }
}

/** Progress bar. */
export function progressBar(scene: Phaser.Scene, x: number, y: number, w: number, h: number, p: number, color = 0x5ad17e): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(UI.inkN, 1).fillRoundedRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, (h + 6) / 2);
  g.fillStyle(0x34466e, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
  const pw = Math.max(0, Math.min(1, p)) * w;
  if (pw > 0) g.fillStyle(color, 1).fillRoundedRect(x - w / 2, y - h / 2, Math.max(h, pw), h, h / 2);
  return g;
}
