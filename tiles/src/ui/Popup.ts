import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { canvasTexture, panelTexture, roundRect } from '../art/textures';
import type { Theme } from '../data/themes';
import { BTN } from '../data/themes';
import { Button } from './Button';
import { label } from './text';

export interface PopupOpts {
  w: number;
  h: number;
  title?: string;
  theme: Theme;
  closable?: boolean;
  onClose?: () => void;
  /** Tapping the dark backdrop closes the popup too. */
  backdropCloses?: boolean;
}

/** Modal window: dim backdrop that swallows input + themed panel with a ribbon title. */
export class Popup extends Phaser.GameObjects.Container {
  static openCount = 0;
  readonly content: Phaser.GameObjects.Container;
  readonly o: PopupOpts;
  private closing = false;
  private backdrop: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, o: PopupOpts) {
    super(scene, 0, 0);
    this.o = o;
    Popup.openCount++;
    const W = scene.scale.width;
    const H = scene.scale.height;
    this.backdrop = scene.add.rectangle(W / 2, H / 2, W, H, 0x0a1430, 0.62).setInteractive();
    this.backdrop.on('pointerup', () => {
      if (o.backdropCloses) this.close();
    });
    this.add(this.backdrop);
    this.content = scene.add.container(W / 2, H / 2);
    this.add(this.content);
    const th = o.theme;
    this.content.add(scene.add.image(0, 7, panelTexture(scene.textures, o.w, o.h, th.panel.top, th.panel.bottom, th.panel.border)));
    if (o.title) {
      const rw = Math.min(o.w + 60, 760);
      const key = canvasTexture(scene.textures, `ribbon_${rw}_${th.primary.join('')}`, rw, 140, (g) => {
        g.fillStyle = th.primary[2];
        g.beginPath();
        g.moveTo(0, 40);
        g.lineTo(70, 40);
        g.lineTo(70, 120);
        g.lineTo(0, 120);
        g.lineTo(28, 80);
        g.closePath();
        g.moveTo(rw, 40);
        g.lineTo(rw - 70, 40);
        g.lineTo(rw - 70, 120);
        g.lineTo(rw, 120);
        g.lineTo(rw - 28, 80);
        g.closePath();
        g.fill();
        const lg = g.createLinearGradient(0, 0, 0, 110);
        lg.addColorStop(0, th.primary[0]);
        lg.addColorStop(1, th.primary[1]);
        g.fillStyle = th.primary[2];
        roundRect(g, 40, 14, rw - 80, 104, 30);
        g.fill();
        g.fillStyle = lg;
        roundRect(g, 40, 6, rw - 80, 100, 30);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)';
        roundRect(g, 56, 12, rw - 112, 36, 18);
        g.fill();
      });
      const ry = -o.h / 2 - 6;
      this.content.add(scene.add.image(0, ry, key));
      const tt = label(scene, 0, ry - 12, o.title, 60, { stroke: th.primary[2] });
      if (tt.width > rw - 150) tt.setScale((rw - 150) / tt.width);
      this.content.add(tt);
    }
    if (o.closable) {
      const b = new Button(scene, o.w / 2 - 24, -o.h / 2 + 24, { w: 104, h: 104, colors: BTN.red, icon: 'ui_close', iconSize: 56, radius: 52, onClick: () => this.close() });
      this.content.add(b);
    }
    this.setDepth(1_000_000);
    scene.add.existing(this);
    this.content.setScale(0.6).setAlpha(0);
    this.backdrop.setAlpha(0);
    scene.tweens.add({ targets: this.content, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: this.backdrop, alpha: 1, duration: 200 });
    sfx('popup');
    this.once('destroy', () => Popup.openCount--);
  }

  close(after?: () => void): void {
    if (this.closing) return;
    this.closing = true;
    this.scene.tweens.add({ targets: this.content, scale: 0.7, alpha: 0, duration: 160, ease: 'Back.easeIn' });
    this.scene.tweens.add({
      targets: this.backdrop,
      alpha: 0,
      duration: 180,
      onComplete: () => {
        this.destroy();
        this.o.onClose?.();
        after?.();
      },
    });
  }
}
