import { audio } from '../audio/audio';
import { econ } from '../core/economy';
import { t } from '../core/i18n';
import { save } from '../core/save';
import { ads } from '../platform/AdManager';
import { background, Button, CoinPill, panel, toast, txt } from '../ui/widgets';
import { BaseScene } from './BaseScene';

interface ResultData {
  win: boolean;
  level: number;
  coins: number;
  kills: number;
  stars: number;
  time: number;
  parOk: boolean;
  noRevive: boolean;
  coinMult: number;
  /** Set after the reward was granted, so a resize rebuild does not grant twice. */
  granted?: { total: number; newHeroes: string[]; doubled: boolean };
}

export class ResultScene extends BaseScene {
  constructor() {
    super('Result');
  }

  create(): void {
    this.rebuildOnResize();
    const d = this.sceneData as ResultData;
    const W = this.W;
    const s = save.data;

    if (!d.granted) {
      let total = d.coins;
      let newHeroes: string[] = [];
      if (d.win) {
        total += Math.round((25 + d.level * 5 + d.stars * 10) * d.coinMult);
        s.maxLevel = Math.max(s.maxLevel, d.level + 1);
        s.level = d.level + 1;
        s.stars[String(d.level)] = Math.max(s.stars[String(d.level)] ?? 0, d.stars);
        s.stats.bosses++;
        newHeroes = econ.unlockByLevel(d.level);
      } else {
        total += Math.round(d.level * 2);
      }
      s.stats.kills += d.kills;
      econ.add(total);
      save.flush();
      d.granted = { total, newHeroes, doubled: false };
    }
    const g = d.granted;

    background(this, d.win ? 0x3d7bff : 0x7b2d5b, d.win ? 0x16206b : 0x2a0f24);
    audio.playMusic('menu');
    if (!this.sceneData.played) {
      audio.play(d.win ? 'victory' : 'defeat');
      this.sceneData.played = true;
    }
    const coins = new CoinPill(this, W - 110, 46, s.coins);

    const title = txt(this, W / 2, 90, d.win ? t('victory') : t('defeat'), 76, d.win ? '#ffd60a' : '#ff8fa3').setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 450, ease: 'Back.Out' });
    txt(this, W / 2, 158, t('levelN', { n: d.level }), 28, '#ffffff');

    panel(this, W / 2 - 300, 200, 600, 300, 0x23306b);
    for (let i = 0; i < 3; i++) {
      const on = i < d.stars;
      const st = this.add.image(W / 2 - 110 + i * 110, 270 - (i === 1 ? 14 : 0), on ? 'i_star' : 'i_star_empty').setDisplaySize(96, 96).setScale(0);
      this.tweens.add({ targets: st, scale: 96 / st.width, delay: 300 + i * 250, duration: 350, ease: 'Back.Out', onStart: () => on && audio.play('pickup') });
    }
    const rows: [string, boolean][] = d.win
      ? [
          ['✔ ' + t('winBonus'), true],
          [d.noRevive ? '✔ ' + t('noRevive') : '✘ ' + t('revived'), d.noRevive],
          [(d.parOk ? '✔ ' : '✘ ') + t('timeBonus'), d.parOk],
        ]
      : [];
    rows.forEach(([label, ok], i) => txt(this, W / 2, 340 + i * 32, label, 22, ok ? '#80ed99' : '#adb5bd'));
    const rewardY = d.win ? 455 : 360;
    this.add.image(W / 2 - 70, rewardY, 'i_coin').setDisplaySize(60, 60);
    const rewardText = txt(this, W / 2 + 20, rewardY, `+${g.total * (g.doubled ? 2 : 1)}`, 44, '#ffe066');

    const by = 590;
    if (d.win && !g.doubled) {
      const x2 = new Button(this, W / 2, by, { w: 320, h: 86, color: 'purple', label: t('x2reward'), size: 32, icon: 'i_ad', iconSize: 50 }).onClick(async () => {
        x2.setEnabled(false);
        const ok = await ads.rewarded();
        if (ok && !g.doubled) {
          g.doubled = true;
          econ.add(g.total);
          save.flush();
          coins.set(s.coins);
          rewardText.setText(`+${g.total * 2}`);
          audio.play('buy');
          this.tweens.add({ targets: rewardText, scale: { from: 1.6, to: 1 }, duration: 400 });
          x2.destroy();
        } else {
          x2.setEnabled(true);
          toast(this, t('adNoReward'), '#ff8fa3');
        }
      });
      this.tweens.add({ targets: x2, scale: 1.05, yoyo: true, repeat: -1, duration: 600 });
    }

    const go = async (target: () => void) => {
      if (ads.isBusy) return;
      await ads.interstitial(d.level);
      target();
    };
    const exits: [string, string, 'purple' | 'blue' | 'orange'][] = [
      ['menu', 'Menu', 'orange'],
      ['levelMapShort', 'Map', 'blue'],
      ['shop', 'Shop', 'purple'],
    ];
    exits.forEach(([label, scene, color], i) =>
      new Button(this, 100 + i * 160, by + 60, { w: 150, h: 66, color, label: t(label), size: 22 }).onClick(() => go(() => this.scene.start(scene))),
    );
    if (d.win) {
      new Button(this, W - 170, by + 60, { w: 260, h: 86, color: 'yellow', label: t('next'), size: 36 }).onClick(() =>
        go(() => this.scene.start('Prep', { level: d.level + 1 })),
      );
    } else {
      new Button(this, W - 170, by + 60, { w: 260, h: 86, color: 'yellow', label: t('retry'), size: 36 }).onClick(() =>
        go(() => this.scene.start('Prep', { level: d.level })),
      );
    }

    if (g.newHeroes.length && !this.sceneData.heroShown) {
      this.sceneData.heroShown = true;
      this.time.delayedCall(900, () => this.showNewHero(g.newHeroes[0]));
    }
  }

  private showNewHero(id: string): void {
    const W = this.W;
    const H = this.H;
    audio.play('unlock');
    const c = this.add.container(0, 0).setDepth(100);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.75).setOrigin(0).setInteractive());
    const rays = this.add.image(W / 2, H / 2 - 20, 'soft').setDisplaySize(700, 700).setTint(0xffd60a).setAlpha(0.5);
    c.add(rays);
    c.add(txt(this, W / 2, 110, t('newHero'), 56, '#ffd60a'));
    const img = this.add.image(W / 2, 520, `heroBig_${id}_0`).setOrigin(0.5, 1);
    const sc = 320 / img.height;
    img.setScale(0);
    c.add(img);
    this.tweens.add({ targets: img, scale: sc, duration: 500, ease: 'Back.Out' });
    c.add(txt(this, W / 2, 570, t(`hero_${id}`), 44, '#ffffff'));
    c.add(new Button(this, W / 2, 650, { w: 240, h: 70, color: 'green', label: 'OK', size: 32 }).onClick(() => c.destroy()));
  }
}
