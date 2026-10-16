import { audio } from '../audio/audio';
import { t } from '../core/i18n';
import { save } from '../core/save';
import { BOOSTERS, type BoosterId } from '../data/shop';
import { ads } from '../platform/AdManager';
import { buildLevel } from '../gameplay/levels';
import { background, Button, CoinPill, panel, toast, txt } from '../ui/widgets';
import { BaseScene } from './BaseScene';

const BOOSTER_ICON: Record<BoosterId, string> = { shield: 'i_shield', damage: 'i_damage', speed: 'i_speed', super: 'i_super', life: 'i_life' };

export class PrepScene extends BaseScene {
  private chosen = new Set<BoosterId>();

  constructor() {
    super('Prep');
  }

  create(): void {
    this.rebuildOnResize();
    const W = this.W;
    const level: number = this.sceneData.level ?? save.data.level;
    const cfg = buildLevel(level);
    background(this, 0x5b3fd1, 0x1a1050);
    new CoinPill(this, W - 110, 46, save.data.coins);

    txt(this, W / 2, 56, t('levelN', { n: level }), 52, '#ffd60a');
    txt(this, W / 2, 104, t(`biome_${cfg.biome.id}`), 26, '#ffffff');

    // Boss card.
    const lx = W * 0.25;
    panel(this, lx - 190, 150, 380, 300, 0x3a1f6b);
    txt(this, lx, 180, `${t('boss')}`, 26, '#ff8fa3');
    const bimg = this.add.image(lx, 310, `bossBig_${cfg.boss}`);
    bimg.setScale(Math.min(210 / bimg.height, 330 / bimg.width));
    this.tweens.add({ targets: bimg, y: 300, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.InOut' });
    txt(this, lx, 425, t(`boss_${cfg.boss}`) + (cfg.bossTier > 0 ? ` ${'★'.repeat(Math.min(5, cfg.bossTier))}` : ''), 26, '#ffffff');

    // Hero + events card.
    const rx = W * 0.72;
    panel(this, rx - 230, 150, 460, 300, 0x23306b);
    const hs = save.data.heroes[save.data.selectedHero];
    const hp = this.add.image(rx - 150, 330, `heroBig_${hs.skin}`);
    hp.setScale(Math.min(180 / hp.height, 160 / hp.width));
    txt(this, rx - 150, 425, `${t(`hero_${save.data.selectedHero}`)} ${t('level_short', { n: hs.level })}`, 22, '#ffffff');
    txt(this, rx + 70, 180, t('modifiers'), 24, '#ffd166');
    if (cfg.mods.length === 0) txt(this, rx + 70, 240, t('noModifiers'), 20, '#bde0fe', { wordWrap: { width: 230 } });
    cfg.mods.forEach((m, i) => {
      txt(this, rx + 70, 230 + i * 90, t(`mod_${m}`), 22, '#ffffff');
      txt(this, rx + 70, 262 + i * 90, t(`moddesc_${m}`), 16, '#bde0fe', { wordWrap: { width: 230 } });
    });
    const hb = new Button(this, rx - 150, 196, { w: 150, h: 48, color: 'blue', label: t('heroes'), size: 20 }).onClick(() => this.scene.start('Heroes', { back: 'Prep', level }));
    void hb;

    // Boosters: each one is unlocked for this battle by watching a rewarded ad.
    txt(this, W / 2, 482, `${t('boosters')} — ${t('watchForBooster')}`, 22, '#ffffff');
    const n = BOOSTERS.length;
    const bw = 130;
    const gap = 16;
    const x0 = W / 2 - ((n - 1) * (bw + gap)) / 2;
    BOOSTERS.forEach((b, i) => {
      const x = x0 + i * (bw + gap);
      const btn = new Button(this, x, 560, { w: bw, h: 104, color: 'dark', icon: BOOSTER_ICON[b.id], iconSize: 54 });
      btn.icon!.y = -14;
      const label = txt(this, 0, 32, '', 17, '#ffffff');
      const badge = this.add.image(bw / 2 - 16, -38, 'i_ad').setDisplaySize(34, 34);
      btn.add([label, badge]);
      const refresh = () => {
        const on = this.chosen.has(b.id);
        btn.setColor(on ? 'green' : 'dark');
        label.setText(on ? t('boosterActive') : t(`booster_${b.id}`));
        badge.setTexture(on ? 'i_check' : 'i_ad');
      };
      btn.onClick(async () => {
        if (this.chosen.has(b.id) || ads.isBusy) return;
        btn.setEnabled(false);
        const ok = await ads.rewarded();
        btn.setEnabled(true);
        if (ok) {
          this.chosen.add(b.id);
          audio.play('unlock');
        } else toast(this, t('adNoReward'), '#ff8fa3');
        refresh();
      });
      refresh();
    });

    new Button(this, 130, 660, { w: 200, h: 70, color: 'red', label: t('back'), size: 26 }).onClick(() => this.scene.start('Map'));
    const go = new Button(this, W - 190, 660, { w: 300, h: 90, color: 'yellow', label: t('toBattle'), size: 40 }).onClick(() => {
      const boosters = [...this.chosen];
      save.data.stats.played++;
      save.save();
      this.chosen.clear();
      this.scene.start('Game', { level, boosters });
    });
    this.tweens.add({ targets: go, scale: 1.05, yoyo: true, repeat: -1, duration: 600 });
  }
}
