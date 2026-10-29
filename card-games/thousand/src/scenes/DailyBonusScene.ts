import { audio } from '@shared/audio/audio';
import { t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Button, txt, UI } from '@shared/ui/widgets';
import { DAILY_REWARDS } from '../data/meta';
import { claimDailyBonus, dailyBonusState } from '../progress';
import { save } from '../save';
import { menuBackground } from '../ui/bg';
import { rewardRow, topBar, watchAd } from '../ui/common';

/** 7-day login calendar. */
export class DailyBonusScene extends BaseScene {
  constructor() {
    super('DailyBonus');
  }

  create(data: { from?: string }): void {
    menuBackground(this);
    const pill = topBar(this, t('dailyBonus'), () => this.go(data.from ?? 'Menu', {}, 'bonus_back'));
    const W = this.W;
    const H = this.H;
    const st = dailyBonusState();
    const cur = st.can ? st.day : save.data.daily.day;
    const cols = this.portrait ? 3 : 4;
    const tw = 300;
    const th = this.portrait ? 300 : 260;
    const y0 = this.portrait ? 300 : 170;
    DAILY_REWARDS.forEach((r, i) => {
      const day = i + 1;
      const last = i === 6;
      // Day 7 is a wide tile: its own row in portrait, the last two cells of row 2 in landscape (keeps clear of the buttons).
      const col = last ? (this.portrait ? 0 : 2.5) : i % cols;
      const row = last ? (this.portrait ? 2 : 1) : Math.floor(i / cols);
      const w = last ? tw * (this.portrait ? 3 : 2) + 20 * (this.portrait ? 2 : 1) : tw;
      const x = last && this.portrait ? W / 2 : W / 2 + (col - (cols - 1) / 2) * (tw + 20);
      const y = y0 + row * (th + 20) + th / 2;
      const done = st.can ? day < cur : day <= cur;
      const today = st.can && day === cur;
      const g = this.add.graphics();
      g.fillStyle(UI.inkN, 0.9).fillRoundedRect(x - w / 2 - 4, y - th / 2 - 4, w + 8, th + 8, 26);
      g.fillStyle(today ? 0x2c9a52 : done ? 0x3a4568 : 0x283a63, 1).fillRoundedRect(x - w / 2, y - th / 2, w, th, 24);
      if (today) g.lineStyle(8, 0xffd166, 1).strokeRoundedRect(x - w / 2 + 4, y - th / 2 + 4, w - 8, th - 8, 22);
      txt(this, x, y - th / 2 + 40, today ? t('today') : t('dayN', { n: day }), 32, today ? UI.gold : '#ffffff');
      this.add.existing(rewardRow(this, x, y + 10, r, last ? 110 : 90));
      if (done) this.add.image(x + w / 2 - 50, y - th / 2 + 50, 'i_check').setDisplaySize(70, 70);
    });
    const by = this.portrait ? H - 230 : H - 120;
    if (st.can) {
      new Button(this, W / 2 - 220, by, { w: 380, h: 140, color: 'green', label: t('x2'), size: 40, ad: true }).onClick(() =>
        watchAd(this, 'daily_x2', () => {
          claimDailyBonus(2);
          audio.play('coins');
          pill?.set(save.data.coins);
          this.scene.restart(data);
        }),
      );
      new Button(this, W / 2 + 220, by, { w: 380, h: 140, color: 'gold', label: t('claim'), size: 44 }).onClick(() => {
        claimDailyBonus(1);
        audio.play('coins');
        pill?.set(save.data.coins);
        this.scene.restart(data);
      });
    } else txt(this, W / 2, by, t('comeBack'), 44, '#ffffff');
    this.setupScene();
  }
}
