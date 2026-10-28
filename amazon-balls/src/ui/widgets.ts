import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { coins, onEconomy } from '../core/economy';

export const FONT = '"Trebuchet MS", "Arial Rounded MT Bold", "Arial Black", Arial, sans-serif';

export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  size = 28,
  color = '#ffffff',
  o: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.GameObjects.Text {
  const t = scene.add
    .text(x, y, s, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color,
      stroke: '#2a1640',
      strokeThickness: Math.max(3, Math.round(size / 5)),
      align: 'center',
      ...o,
    })
    .setOrigin(0.5);
  t.setShadow(0, Math.max(2, size / 10), 'rgba(20,0,40,0.45)', 0, true, false);
  return t;
}

export const PALETTE = {
  green: [0x7be35a, 0x2fa83a, 0x1d6e25],
  orange: [0xffc04a, 0xff8a12, 0xb3540a],
  blue: [0x6fd0ff, 0x2d8cff, 0x1a4fb3],
  purple: [0xc59bff, 0x8a4dff, 0x4f22b3],
  red: [0xff8a8a, 0xff3d5a, 0xa8102e],
  pink: [0xffa8dd, 0xff4fb4, 0xa8106a],
  grey: [0xc2c8d6, 0x8b93a8, 0x535a6e],
  cream: [0xfff6dc, 0xffe3a6, 0xc49a52],
} as const;
export type Tint = keyof typeof PALETTE;

export interface ButtonOpts {
  w: number;
  h: number;
  color?: Tint;
  label?: string;
  size?: number;
  icon?: string;
  iconSize?: number;
  sub?: string;
  /** Small "watch ad" badge in the corner. */
  ad?: boolean;
  textColor?: string;
}

/** Chunky glossy button with a darker lip, press animation and click sound. */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  label?: Phaser.GameObjects.Text;
  sub?: Phaser.GameObjects.Text;
  icon?: Phaser.GameObjects.Image;
  private enabledState = true;
  private handler: (() => void) | null = null;
  private pressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, private o: ButtonOpts) {
    super(scene, x, y);
    this.bg = scene.add.graphics();
    this.add(this.bg);
    this.draw();
    const size = o.size ?? 30;
    let lx = 0;
    if (o.icon) {
      const isz = o.iconSize ?? o.h * 0.62;
      this.icon = scene.add.image(0, -3, o.icon).setDisplaySize(isz, isz);
      this.add(this.icon);
      if (o.label) {
        this.icon.x = -o.w / 2 + isz / 2 + 16;
        lx = isz / 2 + 6;
      }
    }
    if (o.label !== undefined) {
      this.label = txt(scene, lx, o.sub ? -size * 0.34 - 3 : -4, o.label, size, o.textColor ?? '#ffffff');
      const maxW = o.w - (o.icon ? (o.iconSize ?? o.h * 0.62) + 30 : 24);
      if (this.label.width > maxW) this.label.setScale(maxW / this.label.width);
      this.add(this.label);
    }
    if (o.sub) {
      this.sub = txt(scene, lx, size * 0.44, o.sub, Math.max(15, Math.round(size * 0.5)), '#ffffff');
      this.add(this.sub);
    }
    if (o.ad) {
      const b = scene.add.image(o.w / 2 - 6, -o.h / 2 + 4, 'ic_ad').setDisplaySize(40, 40);
      this.add(b);
      scene.tweens.add({ targets: b, angle: { from: -8, to: 8 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.setSize(o.w, o.h + 6);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      this.pressed = true;
      scene.tweens.add({ targets: this, scale: 0.93, duration: 60 });
    });
    this.on('pointerout', () => {
      this.pressed = false;
      scene.tweens.add({ targets: this, scale: 1, duration: 80 });
    });
    this.on('pointerup', (p: Phaser.Input.Pointer) => {
      scene.tweens.add({ targets: this, scale: 1, duration: 80 });
      if (!this.pressed || p.getDistance() > 14) return;
      this.pressed = false;
      if (!this.enabledState) {
        audio.play('error', { vol: 0.5 });
        return;
      }
      audio.play('click', { vol: 0.6 });
      this.handler?.();
    });
    scene.add.existing(this);
  }

  private draw(): void {
    const [top, mid, bot] = PALETTE[this.enabledState ? (this.o.color ?? 'green') : 'grey'];
    const { w, h } = this.o;
    const r = Math.min(22, h / 2.4);
    const g = this.bg;
    g.clear();
    g.fillStyle(0x2a1640, 1).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 14, r + 4);
    g.fillStyle(bot, 1).fillRoundedRect(-w / 2, -h / 2, w, h + 6, r);
    g.fillGradientStyle(top, top, mid, mid, 1).fillRoundedRect(-w / 2, -h / 2, w, h - 2, r);
    g.fillStyle(0xffffff, 0.35).fillRoundedRect(-w / 2 + 10, -h / 2 + 5, w - 20, Math.min(14, h / 4), 7);
  }

  onClick(fn: () => void): this {
    this.handler = fn;
    return this;
  }

  setEnabled(on: boolean): this {
    this.enabledState = on;
    this.draw();
    return this;
  }

  setLabel(s: string): this {
    this.label?.setText(s);
    return this;
  }
}

/** Round icon button (menu / HUD) with optional red badge. */
export class RoundButton extends Phaser.GameObjects.Container {
  private badge?: Phaser.GameObjects.Container;
  private handler: (() => void) | null = null;
  private pressed = false;
  icon: Phaser.GameObjects.Image;
  caption?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, icon: string, size = 86, color: Tint = 'orange', caption?: string) {
    super(scene, x, y);
    const [top, mid, bot] = PALETTE[color];
    const g = scene.add.graphics();
    const r = size / 2;
    g.fillStyle(0x2a1640, 1).fillCircle(0, 3, r + 4);
    g.fillStyle(bot, 1).fillCircle(0, 4, r);
    g.fillGradientStyle(top, top, mid, mid, 1).fillCircle(0, 0, r - 2);
    g.fillStyle(0xffffff, 0.3).fillEllipse(0, -r * 0.5, r * 1.1, r * 0.4);
    this.icon = scene.add.image(0, -1, icon).setDisplaySize(size * 0.62, size * 0.62);
    this.add([g, this.icon]);
    if (caption) {
      this.caption = txt(scene, 0, r + 16, caption, 20);
      this.add(this.caption);
    }
    this.setSize(size + 8, size + 8);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      this.pressed = true;
      scene.tweens.add({ targets: this, scale: 0.9, duration: 60 });
    });
    this.on('pointerout', () => {
      this.pressed = false;
      scene.tweens.add({ targets: this, scale: 1, duration: 80 });
    });
    this.on('pointerup', (p: Phaser.Input.Pointer) => {
      scene.tweens.add({ targets: this, scale: 1, duration: 80 });
      if (!this.pressed || p.getDistance() > 14) return;
      this.pressed = false;
      audio.play('click', { vol: 0.6 });
      this.handler?.();
    });
    scene.add.existing(this);
  }

  onClick(fn: () => void): this {
    this.handler = fn;
    return this;
  }

  setBadge(text: string | null): this {
    this.badge?.destroy();
    this.badge = undefined;
    if (text === null) return this;
    const s = this.scene;
    const c = s.add.container(this.width / 2 - 16, -this.height / 2 + 14);
    const g = s.add.graphics();
    g.fillStyle(0x2a1640, 1).fillCircle(0, 0, 16);
    g.fillStyle(0xff3d5a, 1).fillCircle(0, 0, 13);
    c.add([g, txt(s, 0, -1, text, 18)]);
    this.add(c);
    this.badge = c;
    s.tweens.add({ targets: c, scale: { from: 1, to: 1.2 }, duration: 450, yoyo: true, repeat: -1 });
    return this;
  }
}

/** Coin counter pill that follows the wallet. */
export class CoinPill extends Phaser.GameObjects.Container {
  private label: Phaser.GameObjects.Text;
  private shown = coins();
  private unsub: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, onPlus?: () => void) {
    super(scene, x, y);
    const g = scene.add.graphics();
    g.fillStyle(0x2a1640, 0.85).fillRoundedRect(-92, -26, 184, 52, 26);
    g.fillStyle(0x000000, 0.25).fillRoundedRect(-88, -22, 176, 44, 22);
    const icon = scene.add.image(-80, 0, 'ic_coin').setDisplaySize(62, 62);
    this.label = txt(scene, 8, -1, String(this.shown), 30, '#fff6c8');
    this.add([g, icon, this.label]);
    if (onPlus) {
      const plus = scene.add.container(78, 0);
      const pg = scene.add.graphics();
      pg.fillStyle(0x2a1640, 1).fillCircle(0, 0, 21);
      pg.fillStyle(0x52d273, 1).fillCircle(0, 0, 18);
      plus.add([pg, txt(scene, 0, -2, '+', 30)]);
      this.add(plus);
      this.label.x = -2;
      this.setSize(184, 52).setInteractive({ useHandCursor: true });
      this.on('pointerup', () => {
        audio.play('click', { vol: 0.6 });
        onPlus();
      });
    }
    scene.add.existing(this);
    this.unsub = onEconomy(() => this.animateTo(coins()));
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.unsub());
  }

  private animateTo(n: number): void {
    if (!this.scene) return;
    const from = this.shown;
    this.shown = n;
    const obj = { v: from };
    this.scene.tweens.add({
      targets: obj,
      v: n,
      duration: Math.min(900, 200 + Math.abs(n - from) * 3),
      onUpdate: () => this.label.setText(String(Math.round(obj.v))),
    });
    if (n > from) this.scene.tweens.add({ targets: this, scale: 1.12, duration: 120, yoyo: true });
  }
}

/** Cream panel with an orange frame (popups, cards). */
export function drawPanel(g: Phaser.GameObjects.Graphics, w: number, h: number, color: Tint = 'cream'): void {
  const [top, mid] = PALETTE[color];
  g.fillStyle(0x2a1640, 1).fillRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 16, 34);
  g.fillStyle(0xd8762a, 1).fillRoundedRect(-w / 2, -h / 2, w, h + 6, 30);
  g.fillGradientStyle(0xffb24a, 0xffb24a, 0xf08a22, 0xf08a22, 1).fillRoundedRect(-w / 2, -h / 2, w, h - 2, 30);
  g.fillGradientStyle(top, top, mid, mid, 1).fillRoundedRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 30, 22);
}

/** Title ribbon on top of a panel. */
export function ribbon(scene: Phaser.Scene, x: number, y: number, w: number, label: string, color: Tint = 'green'): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const [top, mid, bot] = PALETTE[color];
  const g = scene.add.graphics();
  const h = 70;
  for (const s of [-1, 1]) {
    g.fillStyle(0x2a1640, 1).fillTriangle(s * (w / 2 - 10), -h / 2 + 18, s * (w / 2 + 40), -h / 2 + 22, s * (w / 2 + 14), h / 2 + 14);
    g.fillStyle(bot, 1).fillTriangle(s * (w / 2 - 10), -h / 2 + 22, s * (w / 2 + 32), -h / 2 + 26, s * (w / 2 + 12), h / 2 + 8);
  }
  g.fillStyle(0x2a1640, 1).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 16);
  g.fillGradientStyle(top, top, mid, mid, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
  g.fillStyle(0xffffff, 0.3).fillRoundedRect(-w / 2 + 10, -h / 2 + 5, w - 20, 12, 6);
  const t = txt(scene, 0, -2, label, 38);
  if (t.width > w - 30) t.setScale((w - 30) / t.width);
  c.add([g, t]);
  return c;
}

/**
 * Modal popup: dims everything below and swallows input; content goes into `body`.
 * Close with `close()`; `onClosed` runs after the animation.
 */
export class Modal extends Phaser.GameObjects.Container {
  content: Phaser.GameObjects.Container;
  private dim: Phaser.GameObjects.Rectangle;
  onClosed: (() => void) | null = null;
  closing = false;

  constructor(scene: Phaser.Scene, opts: { w: number; h: number; title?: string; titleColor?: Tint; close?: boolean; x?: number; y?: number }) {
    super(scene, 0, 0);
    const cam = scene.cameras.main;
    const vw = scene.scale.width;
    const vh = scene.scale.height;
    const cx = opts.x ?? cam.scrollX + vw / 2;
    const cy = opts.y ?? cam.scrollY + vh / 2;
    this.dim = scene.add.rectangle(cam.scrollX + vw / 2, cam.scrollY + vh / 2, vw * 3, vh * 3, 0x10051f, 0.62).setInteractive();
    this.add(this.dim);
    this.content = scene.add.container(cx, cy);
    const g = scene.add.graphics();
    drawPanel(g, opts.w, opts.h);
    this.content.add(g);
    if (opts.title) this.content.add(ribbon(scene, 0, -opts.h / 2 + 4, Math.min(opts.w - 40, 440), opts.title, opts.titleColor ?? 'green'));
    if (opts.close) {
      const x = new RoundButton(scene, opts.w / 2 - 14, -opts.h / 2 + 14, 'ic_close', 64, 'red');
      x.onClick(() => this.close());
      this.content.add(x);
    }
    this.add(this.content);
    this.setDepth(5000);
    scene.add.existing(this);
    this.dim.alpha = 0;
    scene.tweens.add({ targets: this.dim, alpha: 1, duration: 160 });
    this.content.setScale(0.6);
    this.content.alpha = 0;
    scene.tweens.add({ targets: this.content, scale: 1, alpha: 1, duration: 260, ease: 'Back.out' });
    audio.play('whoosh', { vol: 0.5 });
  }

  close(): void {
    if (this.closing) return;
    this.closing = true;
    this.scene.tweens.add({ targets: this.content, scale: 0.7, alpha: 0, duration: 150, ease: 'Quad.in' });
    this.scene.tweens.add({
      targets: this.dim,
      alpha: 0,
      duration: 170,
      onComplete: () => {
        const cb = this.onClosed;
        this.destroy();
        cb?.();
      },
    });
  }
}

/** Short floating message at the top of the screen. */
export function toast(scene: Phaser.Scene, msg: string, color = '#ffffff'): void {
  const cam = scene.cameras.main;
  const x = cam.scrollX + scene.scale.width / 2;
  const y = cam.scrollY + scene.scale.height * 0.22;
  const c = scene.add.container(x, y).setDepth(9000);
  const t = txt(scene, 0, 0, msg, 28, color, { wordWrap: { width: Math.min(560, scene.scale.width - 60) } });
  const g = scene.add.graphics();
  g.fillStyle(0x2a1640, 0.88).fillRoundedRect(-t.width / 2 - 24, -t.height / 2 - 14, t.width + 48, t.height + 28, 22);
  c.add([g, t]);
  c.setScale(0.6).setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 200, ease: 'Back.out' });
  scene.tweens.add({ targets: c, alpha: 0, y: y - 40, delay: 1700, duration: 300, onComplete: () => c.destroy() });
}

/** Horizontal volume slider 0..1. */
export class Slider extends Phaser.GameObjects.Container {
  private knob: Phaser.GameObjects.Container;
  private fill: Phaser.GameObjects.Graphics;
  value: number;

  constructor(scene: Phaser.Scene, x: number, y: number, private trackW: number, value: number, onChange: (v: number) => void) {
    super(scene, x, y);
    const w = trackW;
    this.value = value;
    const track = scene.add.graphics();
    track.fillStyle(0x2a1640, 1).fillRoundedRect(-w / 2 - 4, -14, w + 8, 28, 14);
    track.fillStyle(0x6a4a3a, 1).fillRoundedRect(-w / 2, -10, w, 20, 10);
    this.fill = scene.add.graphics();
    this.knob = scene.add.container(0, 0);
    const kg = scene.add.graphics();
    kg.fillStyle(0x2a1640, 1).fillCircle(0, 2, 22);
    kg.fillGradientStyle(0xffffff, 0xffffff, 0xffd27a, 0xffd27a, 1).fillCircle(0, 0, 18);
    this.knob.add(kg);
    this.add([track, this.fill, this.knob]);
    this.redraw();
    const zone = scene.add.zone(0, 0, w + 50, 60).setInteractive({ useHandCursor: true, draggable: false });
    this.add(zone);
    const setFrom = (p: Phaser.Input.Pointer) => {
      const m = this.getWorldTransformMatrix();
      const lx = (p.worldX - m.tx) / m.scaleX;
      this.value = Phaser.Math.Clamp((lx + w / 2) / w, 0, 1);
      this.redraw();
      onChange(this.value);
    };
    let active = false;
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      active = true;
      setFrom(p);
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => active && p.isDown && setFrom(p));
    scene.input.on('pointerup', () => (active = false));
    scene.add.existing(this);
  }

  private redraw(): void {
    this.fill.clear();
    const w = this.trackW;
    this.fill.fillStyle(0x52d273, 1).fillRoundedRect(-w / 2, -10, Math.max(20, w * this.value), 20, 10);
    this.knob.x = -w / 2 + w * this.value;
  }
}

/** Two-state switch. */
export class Toggle extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private lbl: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, public value: boolean, private labels: [string, string], onChange: (v: boolean) => void) {
    super(scene, x, y);
    this.g = scene.add.graphics();
    this.lbl = txt(scene, 0, -2, '', 22);
    this.add([this.g, this.lbl]);
    this.redraw();
    this.setSize(150, 56).setInteractive({ useHandCursor: true });
    this.on('pointerup', () => {
      this.value = !this.value;
      audio.play('click', { vol: 0.6 });
      this.redraw();
      onChange(this.value);
    });
    scene.add.existing(this);
  }

  redraw(): void {
    const [top, mid] = PALETTE[this.value ? 'green' : 'grey'];
    this.g.clear();
    this.g.fillStyle(0x2a1640, 1).fillRoundedRect(-79, -29, 158, 62, 28);
    this.g.fillGradientStyle(top, top, mid, mid, 1).fillRoundedRect(-75, -25, 150, 52, 25);
    this.g.fillStyle(0xffffff, 1).fillCircle(this.value ? 48 : -48, 1, 20);
    this.lbl.setText(this.value ? this.labels[0] : this.labels[1]);
    this.lbl.x = this.value ? -18 : 18;
  }
}

/** Scrollable vertical list area (drag / wheel) with a mask. */
export class ScrollArea {
  container: Phaser.GameObjects.Container;
  private minY = 0;
  private velocity = 0;
  private dragging = false;
  private lastY = 0;

  constructor(scene: Phaser.Scene, private x: number, private y: number, private w: number, private h: number) {
    this.container = scene.add.container(x, y);
    const shape = scene.make.graphics({}, false);
    shape.fillStyle(0xffffff).fillRect(x - w / 2, y, w, h);
    this.container.setMask(shape.createGeometryMask());
    const zone = scene.add.zone(x, y + h / 2, w, h).setInteractive();
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.lastY = p.y;
      this.velocity = 0;
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      const dy = p.y - this.lastY;
      this.lastY = p.y;
      this.scrollBy(dy);
      this.velocity = dy;
    });
    scene.input.on('pointerup', () => (this.dragging = false));
    scene.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.scrollBy(-dy * 0.6));
    scene.events.on('update', () => {
      if (this.dragging || Math.abs(this.velocity) < 0.3) return;
      this.velocity *= 0.92;
      this.scrollBy(this.velocity);
    });
    zone.setDepth(-1);
  }

  setContentHeight(contentH: number): void {
    this.minY = Math.min(this.y, this.y + this.h - contentH);
    this.container.y = Phaser.Math.Clamp(this.container.y, this.minY, this.y);
  }

  scrollBy(dy: number): void {
    this.container.y = Phaser.Math.Clamp(this.container.y + dy, this.minY, this.y);
  }

  reset(): void {
    this.container.y = this.y;
    this.velocity = 0;
  }

  get bounds(): { x: number; y: number; w: number; h: number } {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}
