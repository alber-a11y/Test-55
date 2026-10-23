import { audio } from '@shared/audio/audio';
import { t } from '@shared/core/i18n';
import { Rng } from '@shared/core/rng';
import { msToMidnight, formatTime } from '@shared/core/time';
import { BaseScene } from '@shared/ui/base';
import { Button, Pill, progressBar, txt, UI } from '@shared/ui/widgets';
import { QUESTS } from '../data/meta';
import { addCoins, refreshDay } from '../progress';
import { save } from '../save';
import { menuBackground } from '../ui/bg';
import { coinBurst, rewardPopup, topBar, watchAd } from '../ui/common';

export class QuestsScene extends BaseScene {
  private pill: Pill | null = null;

  constructor() {
    super('Quests');
  }

  create(data: { from?: string }): void {
    refreshDay();
    menuBackground(this);
    this.pill = topBar(this, t('questsTitle'), () => this.go(data.from ?? 'Menu', {}, 'quests_back'));
    const W = this.W;
    const q = save.data.quests;
    txt(this, W / 2, 220, `${t('cooldown', { t: formatTime(msToMidnight()) })}`, 30, '#e8ecf8');
    const rw = Math.min(W - 60, 960);
    const rh = 250;
    const y0 = this.portrait ? 300 : 270;
    const gap = this.portrait ? 30 : 16;
    q.list.forEach((qs, i) => {
      const y = y0 + i * (rh + gap) + rh / 2;
      const g = this.add.graphics();
      const ready = qs.progress >= qs.target && !qs.claimed;
      g.fillStyle(UI.inkN, 0.9).fillRoundedRect(W / 2 - rw / 2 - 4, y - rh / 2 - 4, rw + 8, rh + 8, 26);
      g.fillStyle(qs.claimed ? 0x2c6e4a : ready ? 0x3b5f2c : 0x283a63, 1).fillRoundedRect(W / 2 - rw / 2, y - rh / 2, rw, rh, 24);
      this.add.image(W / 2 - rw / 2 + 90, y, qs.claimed ? 'i_check' : 'i_quests').setDisplaySize(110, 110);
      txt(this, W / 2 - rw / 2 + 170, y - 60, t(`q_${qs.kind}`, { n: qs.target }), 34, '#ffffff', { wordWrap: { width: rw - 520 } }).setOrigin(0, 0.5);
      const p = Math.min(1, qs.progress / qs.target);
      progressBar(this, W / 2 - rw / 2 + 170 + (rw - 520) / 2, y + 20, rw - 520, 34, p, 0x5ad17e);
      txt(this, W / 2 - rw / 2 + 170 + (rw - 520) / 2, y + 20, `${Math.min(qs.progress, qs.target)}/${qs.target}`, 26, '#ffffff');
      this.add.image(W / 2 - rw / 2 + 190, y + 80, 'i_coin').setDisplaySize(52, 52);
      txt(this, W / 2 - rw / 2 + 230, y + 80, `+${qs.coins}`, 30, UI.gold).setOrigin(0, 0.5);
      const bx = W / 2 + rw / 2 - 170;
      if (qs.claimed) txt(this, bx, y, t('claimed'), 32, '#9ff0c8');
      else if (ready)
        new Button(this, bx, y, { w: 260, h: 110, color: 'gold', label: t('claim'), size: 34 }).onClick(() => {
          qs.claimed = true;
          addCoins(qs.coins);
          coinBurst(this, bx, y, W - 260, 78);
          this.pill?.set(save.data.coins);
          save.save();
          this.time.delayedCall(600, () => this.scene.restart(data));
        });
      else
        new Button(this, bx, y, { w: 260, h: 100, color: 'dark', label: t('replaceQuest'), size: 28, ad: true }).onClick(() =>
          watchAd(this, 'quest_replace', () => {
            const used = new Set(q.list.map((x) => x.kind));
            const rng = new Rng(Date.now());
            const pool = QUESTS.filter((d) => !used.has(d.kind));
            const d = rng.pick(pool);
            q.list[i] = { kind: d.kind, target: rng.pick(d.targets), progress: 0, coins: d.coins, claimed: false };
            save.save();
            this.scene.restart(data);
          }),
        );
    });
    // Bonus chest for all three
    const by = y0 + 3 * (rh + gap) + 110;
    const all = q.list.every((x) => x.claimed);
    const chest = this.add.image(W / 2 - 200, by, all && !q.bonus ? 'i_chestOpen' : 'i_chest').setDisplaySize(170, 170);
    txt(this, W / 2 + 60, by - 30, t('questsBonus'), 30, '#ffffff', { wordWrap: { width: 460 } });
    if (all && !q.bonus) {
      this.tweens.add({ targets: chest, angle: { from: -6, to: 6 }, duration: 220, yoyo: true, repeat: -1 });
      new Button(this, W / 2 + 60, by + 60, { w: 300, h: 100, color: 'gold', label: t('openChest'), size: 34 }).onClick(() => {
        q.bonus = true;
        save.save();
        audio.play('chest');
        rewardPopup(this, t('chest'), { coins: 250, boosters: { joker: 1, hint: 2 } }, () => this.scene.restart(data), { x2: 'quests_chest_x2' });
      });
    } else if (q.bonus) txt(this, W / 2 + 60, by + 50, t('claimed'), 32, '#9ff0c8');
    this.setupScene();
  }
}
