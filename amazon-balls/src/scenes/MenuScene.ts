import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { ballKey } from '../art/balls';
import { dailyAvailable, equipped } from '../core/economy';
import { t } from '../core/i18n';
import { save } from '../core/save';
import { BALL_COLORS } from '../data/colors';
import { showDaily } from '../ui/daily';
import { Button, CoinPill, RoundButton, txt } from '../ui/widgets';
import { BaseScene } from './BaseScene';

let dailyShownThisSession = false;

export class MenuScene extends BaseScene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.baseCreate();
    const { W, H } = this;
    const cx = W / 2;
    const colL = Math.max(0, cx - 360);
    const colR = Math.min(W, cx + 360);
    this.addBackdrop();
    this.addAmbient(0, 0, W, H);
    audio.playMusic('menu');

    // Sloth hanging from a branch (top-left), toucan (right).
    const sloth = this.add.image(colL + 120, -20, 'sloth').setOrigin(0.5, 0).setScale(0.85).setDepth(5);
    this.tweens.add({ targets: sloth, angle: { from: -6, to: 6 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.blinker(sloth, 'sloth');
    const toucan = this.add.image(colR - 90, H * 0.43, 'toucan').setScale(0.75).setDepth(5).setFlipX(true);
    this.tweens.add({ targets: toucan, y: toucan.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.blinker(toucan, 'toucan');

    // Logo.
    const ty = H * 0.17;
    const word1 = t('title1');
    const size1 = 92;
    const letters: Phaser.GameObjects.Text[] = [];
    let totalW = 0;
    for (const ch of word1) {
      const l = txt(this, 0, ty, ch, size1, '#ffffff', { strokeThickness: 14 });
      letters.push(l);
      totalW += l.width - 8;
    }
    let x = cx - totalW / 2;
    letters.forEach((l, i) => {
      l.x = x + l.width / 2;
      x += l.width - 8;
      l.setColor(BALL_COLORS[[0, 2, 3, 5, 6, 7][i % 6]].base);
      l.setDepth(20);
      this.tweens.add({ targets: l, y: ty - 10, duration: 700, delay: i * 120, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    const t2 = txt(this, cx, ty + 96, t('title2'), 74, '#ffffff', { strokeThickness: 14 }).setDepth(20);
    const grad = t2.context.createLinearGradient(0, 0, 0, t2.height);
    grad.addColorStop(0.2, '#fff27a');
    grad.addColorStop(0.8, '#ff9a12');
    t2.setFill(grad);
    if (t2.width > W - 40) t2.setScale((W - 40) / t2.width);
    this.tweens.add({ targets: t2, scale: t2.scale * 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // Balls orbiting the logo.
    const skin = equipped('balls');
    for (let i = 0; i < 6; i++) {
      const b = this.add.image(cx, ty + 40, ballKey(skin, i)).setScale(0.55).setDepth(19);
      const a0 = (i / 6) * Math.PI * 2;
      this.tweens.addCounter({
        from: 0,
        to: Math.PI * 2,
        duration: 9000,
        repeat: -1,
        onUpdate: (tw) => {
          const a = a0 + (tw.getValue() ?? 0);
          b.setPosition(cx + Math.cos(a) * 290, ty + 40 + Math.sin(a) * 105);
          b.setDepth(Math.sin(a) > 0 ? 21 : 19);
        },
      });
    }

    // Capybara mascot.
    const capy = this.add.image(cx, H * 0.56, 'capy').setDepth(10);
    capy.setScale(Math.min(1.25, (H * 0.27) / 270));
    this.add.image(cx, capy.y + capy.displayHeight * 0.45, 'shadow').setDisplaySize(capy.displayWidth * 0.9, 50).setDepth(9);
    this.tweens.add({ targets: capy, scaleY: capy.scaleY * 1.03, scaleX: capy.scaleX * 0.985, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.blinker(capy, 'capy');
    capy.setInteractive({ useHandCursor: true }).on('pointerup', () => {
      audio.play('rescue');
      this.tweens.add({ targets: capy, y: capy.y - 40, duration: 180, yoyo: true, ease: 'Quad.out' });
    });

    // Play.
    const play = new Button(this, cx, H * 0.775, { w: 420, h: 116, label: t('play'), sub: t('levelN', { n: save.data.maxLevel }), size: 52, color: 'green' });
    play.setDepth(30).onClick(() => this.go('Game', { level: save.data.maxLevel }));
    this.tweens.add({ targets: play, scale: 1.05, duration: 750, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const by = Math.min(H - 80, H * 0.9);
    const items: [string, string, () => void, 'blue' | 'orange' | 'pink' | 'purple'][] = [
      ['ic_map', t('map'), () => this.go('Map'), 'blue'],
      ['ic_shop', t('shop'), () => this.go('Shop', { from: 'Menu' }), 'orange'],
      ['ic_gift', t('gift'), () => showDaily(this, () => this.scene.restart()), 'pink'],
      ['ic_gear', t('settings'), () => this.go('Settings', { from: 'Menu' }), 'purple'],
    ];
    items.forEach(([icon, label, fn, color], i) => {
      const b = new RoundButton(this, cx + (i - 1.5) * 160, by, icon, 104, color, label).setDepth(30);
      b.onClick(fn);
      if (icon === 'ic_gift' && dailyAvailable()) b.setBadge('!');
    });
    new CoinPill(this, Math.min(W - 110, cx + 250), 56, () => this.go('Shop', { from: 'Menu', tab: 'coins' })).setDepth(40);

    if (dailyAvailable() && !dailyShownThisSession && save.data.maxLevel > 1) {
      dailyShownThisSession = true;
      this.time.delayedCall(600, () => showDaily(this, () => this.scene.restart()));
    }
  }

  /** Swap to the "_blink" texture now and then. */
  private blinker(img: Phaser.GameObjects.Image, key: string): void {
    this.time.addEvent({
      delay: 2600 + Math.random() * 1500,
      loop: true,
      callback: () => {
        img.setTexture(`${key}_blink`);
        this.time.delayedCall(140, () => img.setTexture(key));
      },
    });
  }
}
