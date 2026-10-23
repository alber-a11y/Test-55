import { t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Scroller } from '@shared/ui/scroller';
import { Button, Pill, progressBar, txt, UI } from '@shared/ui/widgets';
import { ACHIEVEMENTS } from '../data/meta';
import { achvValue, addCoins, checkSkinUnlocks } from '../progress';
import { save } from '../save';
import { menuBackground } from '../ui/bg';
import { coinBurst, topBar } from '../ui/common';

export class AchievementsScene extends BaseScene {
  private pill: Pill | null = null;

  constructor() {
    super('Achievements');
  }

  create(data: { from?: string; scroll?: number }): void {
    menuBackground(this);
    this.pill = topBar(this, t('achievements'), () => this.go(data.from ?? 'Menu', {}, 'achv_back'));
    const W = this.W;
    const top = 180;
    const sc = new Scroller(this, 0, top, W, this.H - top);
    const rw = Math.min(W - 40, 980);
    const rh = 210;
    const medal = [0xd28a52, 0xc3ccdb, 0xffc531];
    ACHIEVEMENTS.forEach((a, i) => {
      const y = 20 + i * (rh + 20) + rh / 2;
      const claimed = save.data.achv[a.id] ?? 0;
      const maxed = claimed >= a.tiers.length;
      const target = a.tiers[Math.min(claimed, a.tiers.length - 1)];
      const val = achvValue(a.id);
      const ready = !maxed && val >= target;
      const c = this.add.container(W / 2, y);
      const g = this.add.graphics();
      g.fillStyle(UI.inkN, 0.9).fillRoundedRect(-rw / 2 - 4, -rh / 2 - 4, rw + 8, rh + 8, 26);
      g.fillStyle(maxed ? 0x5a4a1c : ready ? 0x3b5f2c : 0x283a63, 1).fillRoundedRect(-rw / 2, -rh / 2, rw, rh, 24);
      c.add(g);
      const mg = this.add.graphics();
      mg.fillStyle(claimed > 0 ? medal[claimed - 1] : 0x3a4568, 1).fillCircle(-rw / 2 + 95, 0, 70);
      mg.lineStyle(6, UI.inkN, 1).strokeCircle(-rw / 2 + 95, 0, 70);
      c.add(mg);
      c.add(this.add.image(-rw / 2 + 95, 0, `i_${a.icon}`).setDisplaySize(90, 90));
      c.add(txt(this, -rw / 2 + 190, -55, t(`a_${a.id}`), 34, '#ffffff').setOrigin(0, 0.5));
      c.add(txt(this, -rw / 2 + 190, -10, t(`a_${a.id}_d`, { n: target }), 24, '#cfd6e6', { strokeThickness: 0 }).setOrigin(0, 0.5));
      const bw = rw - 560;
      c.add(progressBar(this, -rw / 2 + 190 + bw / 2, 45, bw, 30, maxed ? 1 : val / target, 0xffc531));
      c.add(txt(this, -rw / 2 + 190 + bw / 2, 45, maxed ? '★★★' : `${Math.min(val, target)}/${target}`, 22, '#ffffff'));
      c.add(txt(this, -rw / 2 + 190, 82, t('tier', { n: claimed, m: a.tiers.length }), 22, UI.gold).setOrigin(0, 0.5));
      if (ready) {
        const coins = a.coins[claimed];
        const b = new Button(this, rw / 2 - 160, 0, { w: 250, h: 110, color: 'gold', label: `+${coins}`, icon: 'i_coin', iconSize: 56, size: 32 }).onClick(() => {
          save.data.achv[a.id] = claimed + 1;
          addCoins(coins);
          checkSkinUnlocks();
          coinBurst(this, W / 2 + rw / 2 - 160, y + top - sc.position, W - 260, 78);
          this.pill?.set(save.data.coins);
          save.save();
          this.time.delayedCall(600, () => this.scene.restart({ ...data, scroll: sc.position }));
        });
        b.hitGuard = (p) => sc.inView(p);
        c.add(b);
      } else if (maxed) c.add(this.add.image(rw / 2 - 160, 0, 'i_crown').setDisplaySize(110, 110));
      sc.content.add(c);
    });
    sc.setExtent(ACHIEVEMENTS.length * (rh + 20) + 60);
    if (data.scroll) sc.setPos(data.scroll);
    this.setupScene();
  }
}
