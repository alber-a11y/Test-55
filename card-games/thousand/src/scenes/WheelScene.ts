import Phaser from 'phaser';
import { audio } from '@shared/audio/audio';
import { t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Button, txt, UI } from '@shared/ui/widgets';
import type { BoosterId } from '../save';
import { boosterDef as booster, WHEEL, WHEEL_AD_SPINS_PER_DAY, type Reward } from '../data/meta';
import { refreshDay } from '../progress';
import { save } from '../save';
import { menuBackground } from '../ui/bg';
import { rewardPopup, topBar, watchAd } from '../ui/common';

/** Wheel of fortune: one free spin a day, more for rewarded ads. */
export class WheelScene extends BaseScene {
  private spinning = false;

  constructor() {
    super('Wheel');
  }

  create(data: { from?: string }): void {
    refreshDay();
    this.spinning = false;
    menuBackground(this);
    topBar(this, t('wheel'), () => !this.spinning && this.go(data.from ?? 'Menu', {}, 'wheel_back'));
    const W = this.W;
    const H = this.H;
    const R = Math.min(W * 0.42, H * 0.3, 420);
    const cy = this.portrait ? H * 0.42 : H * 0.5;
    const cx = this.portrait ? W / 2 : W * 0.38;
    // Wheel body
    const wheel = this.add.container(cx, cy);
    const g = this.add.graphics();
    const n = WHEEL.length;
    g.fillStyle(UI.inkN, 1).fillCircle(0, 0, R + 26);
    g.fillStyle(0xffc531, 1).fillCircle(0, 0, R + 16);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
      g.fillStyle(WHEEL[i].color, 1);
      g.slice(0, 0, R, a0, a1, false);
      g.fillPath();
      g.lineStyle(4, UI.inkN, 0.6);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a0) * R, Math.sin(a0) * R);
      g.strokePath();
    }
    wheel.add(g);
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
      const r = WHEEL[i].reward;
      const icon = r.coins ? 'i_coin' : `i_${booster(Object.keys(r.boosters!)[0] as BoosterId).icon}`;
      const label = r.coins ? String(r.coins) : `×${Object.values(r.boosters!)[0]}`;
      const ix = Math.cos(a) * R * 0.68;
      const iy = Math.sin(a) * R * 0.68;
      wheel.add(this.add.image(ix, iy, icon).setDisplaySize(R * 0.24, R * 0.24).setRotation(a + Math.PI / 2));
      wheel.add(txt(this, Math.cos(a) * R * 0.42, Math.sin(a) * R * 0.42, label, R * 0.1, '#ffffff').setRotation(a + Math.PI / 2));
    }
    // Lights
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const l = this.add.circle(cx + Math.cos(a) * (R + 16), cy + Math.sin(a) * (R + 16), 9, 0xffffff);
      this.tweens.add({ targets: l, alpha: 0.2, duration: 300, yoyo: true, repeat: -1, delay: (i % 2) * 300 });
    }
    this.add.circle(cx, cy, R * 0.16, 0xffc531).setStrokeStyle(8, UI.inkN);
    this.add.image(cx, cy, 'i_star').setDisplaySize(R * 0.22, R * 0.22);
    // Pointer
    const ptr = this.add.triangle(cx, cy - R - 36, -36, -30, 36, -30, 0, 34, 0xff4d6d).setStrokeStyle(6, UI.inkN);
    void ptr;

    const w = save.data.wheel;
    const adsLeft = WHEEL_AD_SPINS_PER_DAY - w.ads;
    const bx = this.portrait ? W / 2 : W * 0.78;
    const by = this.portrait ? cy + R + 200 : H * 0.45;
    const spin = (free: boolean) => {
      if (this.spinning) return;
      this.spinning = true;
      if (free) w.freeUsed = true;
      else w.ads++;
      save.save();
      const idx = pickWeighted();
      const segA = 360 / n;
      // Land the chosen segment under the pointer (top).
      const target = 360 * 6 - (idx + 0.5) * segA + Phaser.Math.FloatBetween(-segA * 0.3, segA * 0.3);
      let lastTick = 0;
      this.tweens.add({
        targets: wheel,
        angle: target,
        duration: 4200,
        ease: 'Cubic.Out',
        onUpdate: () => {
          const seg = Math.floor(((wheel.angle % 360) + 360) / segA);
          if (seg !== lastTick) {
            lastTick = seg;
            audio.play('tick', { throttleMs: 30 });
          }
        },
        onComplete: () => {
          audio.play('wheelWin');
          const r: Reward = WHEEL[idx].reward;
          rewardPopup(this, t('reward'), r, () => this.scene.restart(data), { x2: free ? 'wheel_x2' : undefined });
        },
      });
    };
    if (!w.freeUsed) {
      const b = new Button(this, bx, by, { w: 460, h: 150, color: 'green', label: t('spin'), sub: t('spinFree'), size: 56 }).onClick(() => spin(true));
      this.tweens.add({ targets: b, scale: 1.06, duration: 600, yoyo: true, repeat: -1 });
    } else if (adsLeft > 0) {
      new Button(this, bx, by, { w: 460, h: 150, color: 'purple', label: t('spinAd'), sub: t('spinsLeft', { n: adsLeft }), size: 44, ad: true }).onClick(() =>
        watchAd(this, 'wheel_spin', () => spin(false)),
      );
    } else txt(this, bx, by, t('comeBack'), 44, '#ffffff');
    this.setupScene();
  }
}

function pickWeighted(): number {
  const total = WHEEL.reduce((a, s) => a + s.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < WHEEL.length; i++) {
    r -= WHEEL[i].weight;
    if (r <= 0) return i;
  }
  return 0;
}
