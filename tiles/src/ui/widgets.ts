import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { canvasTexture, pillTexture, roundRect } from '../art/textures';
import { bus, econ } from '../core/economy';
import { BTN } from '../data/themes';
import { Button } from './Button';
import { label } from './text';

/** Coins pill: icon + animated number (+ optional "+" button that opens the coin shop). */
export class CoinCounter extends Phaser.GameObjects.Container {
  private txt: Phaser.GameObjects.Text;
  private shown: number;
  readonly icon: Phaser.GameObjects.Image;
  private onCoins = (v: number) => this.animateTo(v);

  constructor(scene: Phaser.Scene, x: number, y: number, onPlus?: () => void) {
    super(scene, x, y);
    const w = 300;
    this.add(scene.add.image(0, 0, pillTexture(scene.textures, w, 86)));
    this.icon = scene.add.image(-w / 2 + 10, 0, 'ui_coin').setDisplaySize(104, 104);
    this.add(this.icon);
    this.shown = econ.coins;
    this.txt = label(scene, 14, -2, String(this.shown), 48, { stroke: '#7a4a08' });
    this.add(this.txt);
    if (onPlus) this.add(new Button(scene, w / 2 - 6, 0, { w: 78, h: 78, colors: BTN.green, icon: 'ui_plus', iconSize: 44, radius: 39, onClick: onPlus }));
    bus.on('coins', this.onCoins);
    this.once('destroy', () => bus.off('coins', this.onCoins));
    scene.add.existing(this);
  }

  private animateTo(v: number): void {
    const from = this.shown;
    this.shown = v;
    this.scene.tweens.addCounter({
      from,
      to: v,
      duration: 500,
      onUpdate: (tw) => this.txt.setText(String(Math.round(tw.getValue() ?? v))),
    });
    this.scene.tweens.add({ targets: this.icon, scale: this.icon.scale * 1.2, yoyo: true, duration: 120 });
  }

  /** World position of the coin icon (target for flying coins). */
  iconPos(): { x: number; y: number } {
    const m = this.icon.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  }
}

/** Fly a few coin sprites from a point to the counter, then add the coins. */
export function flyCoins(scene: Phaser.Scene, from: { x: number; y: number }, to: { x: number; y: number }, amount: number, done?: () => void): void {
  const n = Math.min(12, Math.max(4, Math.round(amount / 15)));
  let arrived = 0;
  for (let i = 0; i < n; i++) {
    const c = scene.add.image(from.x, from.y, 'ui_coin').setDisplaySize(72, 72).setDepth(1_050_000);
    const mx = from.x + Phaser.Math.Between(-160, 160);
    const my = from.y + Phaser.Math.Between(-160, 60);
    scene.tweens.add({
      targets: c,
      x: mx,
      y: my,
      duration: 260,
      ease: 'Cubic.easeOut',
      delay: i * 40,
      onComplete: () =>
        scene.tweens.add({
          targets: c,
          x: to.x,
          y: to.y,
          scale: c.scale * 0.7,
          duration: 420,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            c.destroy();
            sfx('coin');
            arrived++;
            if (arrived === n) {
              econ.addCoins(amount);
              done?.();
            }
          },
        }),
    });
  }
}

export function toast(scene: Phaser.Scene, text: string, y?: number): void {
  const W = scene.scale.width;
  const t = label(scene, W / 2, y ?? scene.scale.height * 0.42, text, 46, { stroke: '#10203a', wrap: Math.min(W, 1080) - 160 });
  const bgW = Math.min(t.width + 80, W - 40);
  const bg = scene.add.image(W / 2, t.y, pillTexture(scene.textures, Math.round(bgW), Math.round(t.height + 40), 'rgba(16,24,48,.78)'));
  const c = scene.add.container(0, 0, [bg, t]).setDepth(1_100_000).setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, y: -20, duration: 200 });
  scene.tweens.add({ targets: c, alpha: 0, delay: 1700, duration: 300, onComplete: () => c.destroy() });
}

/** Red notification dot. */
export function badge(scene: Phaser.Scene, x: number, y: number, text = '!'): Phaser.GameObjects.Container {
  const key = canvasTexture(scene.textures, 'badge_dot', 64, 64, (g) => {
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(32, 32, 31, 0, Math.PI * 2);
    g.fill();
    const rg = g.createLinearGradient(0, 0, 0, 64);
    rg.addColorStop(0, '#ff7a7a');
    rg.addColorStop(1, '#e02a3a');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(32, 32, 26, 0, Math.PI * 2);
    g.fill();
  });
  const c = scene.add.container(x, y, [scene.add.image(0, 0, key), label(scene, 0, -2, text, 36, { stroke: '#a01a2a' })]);
  scene.tweens.add({ targets: c, scale: 1.15, yoyo: true, repeat: -1, duration: 500 });
  return c;
}

/** Horizontal slider 0..1. */
export class Slider extends Phaser.GameObjects.Container {
  private fill: Phaser.GameObjects.Image;
  private knob: Phaser.GameObjects.Image;
  value: number;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, value: number, color: string, onChange: (v: number) => void, onRelease?: () => void) {
    super(scene, x, y);
    this.value = value;
    const h = 30;
    const track = canvasTexture(scene.textures, `sl_track_${w}`, w, h, (g) => {
      g.fillStyle = 'rgba(0,0,0,.18)';
      roundRect(g, 0, 0, w, h, h / 2);
      g.fill();
    });
    const fillKey = canvasTexture(scene.textures, `sl_fill_${w}_${color}`, w, h, (g) => {
      g.fillStyle = color;
      roundRect(g, 0, 0, w, h, h / 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)';
      roundRect(g, 6, 4, w - 12, h / 2 - 4, h / 4);
      g.fill();
    });
    const knobKey = knobTexture(scene);
    this.add(scene.add.image(0, 0, track).setOrigin(0, 0.5));
    this.fill = scene.add.image(0, 0, fillKey).setOrigin(0, 0.5);
    this.knob = scene.add.image(0, 0, knobKey);
    this.add([this.fill, this.knob]);
    const zone = scene.add.zone(w / 2, 0, w + 80, 100).setInteractive({ useHandCursor: true });
    this.add(zone);
    const set = (p: Phaser.Input.Pointer) => {
      const local = p.x - this.getWorldTransformMatrix().tx;
      this.setValue(Phaser.Math.Clamp(local / w, 0, 1), w);
      onChange(this.value);
    };
    let drag = false;
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      drag = true;
      set(p);
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => drag && p.isDown && set(p));
    scene.input.on('pointerup', () => {
      if (drag) onRelease?.();
      drag = false;
    });
    this.setValue(value, w);
    scene.add.existing(this);
  }

  private setValue(v: number, w: number): void {
    this.value = v;
    this.fill.setCrop(0, 0, Math.max(30, w * v), 30);
    this.knob.setX(w * v);
  }
}

/** On/off switch. */
export class Toggle extends Phaser.GameObjects.Container {
  private knob: Phaser.GameObjects.Image;
  private bgOn: Phaser.GameObjects.Image;
  value: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, on: boolean, onChange: (v: boolean) => void) {
    super(scene, x, y);
    this.value = on;
    const mk = (k: string, c1: string, c2: string) =>
      canvasTexture(scene.textures, k, 150, 76, (g) => {
        const lg = g.createLinearGradient(0, 0, 0, 76);
        lg.addColorStop(0, c1);
        lg.addColorStop(1, c2);
        g.fillStyle = lg;
        roundRect(g, 0, 0, 150, 76, 38);
        g.fill();
      });
    this.add(scene.add.image(0, 0, mk('tg_off', '#c4ccd8', '#9aa4b4')));
    this.bgOn = scene.add.image(0, 0, mk('tg_on', '#9ff06a', '#3db82f'));
    this.knob = scene.add.image(0, 0, knobTexture(scene)).setDisplaySize(66, 66);
    this.add([this.bgOn, this.knob]);
    this.setSize(150, 76).setInteractive({ useHandCursor: true });
    this.on('pointerup', () => {
      this.set(!this.value);
      sfx('click');
      onChange(this.value);
    });
    this.set(on, true);
    scene.add.existing(this);
  }

  set(v: boolean, instant = false): void {
    this.value = v;
    const x = v ? 37 : -37;
    if (instant) this.knob.setX(x);
    else this.scene.tweens.add({ targets: this.knob, x, duration: 140 });
    this.bgOn.setAlpha(v ? 1 : 0);
  }
}

function knobTexture(scene: Phaser.Scene): string {
  return canvasTexture(scene.textures, 'sl_knob', 72, 72, (g) => {
    g.fillStyle = 'rgba(0,0,0,.2)';
    g.beginPath();
    g.arc(36, 40, 30, 0, Math.PI * 2);
    g.fill();
    const lg = g.createLinearGradient(0, 0, 0, 70);
    lg.addColorStop(0, '#ffffff');
    lg.addColorStop(1, '#d6dee8');
    g.fillStyle = lg;
    g.beginPath();
    g.arc(36, 34, 30, 0, Math.PI * 2);
    g.fill();
  });
}
