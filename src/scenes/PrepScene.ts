import { audio } from '../audio/audio';
import { econ } from '../core/economy';
import { t } from '../core/i18n';
import { save } from '../core/save';
import { BOOSTERS, type BoosterId } from '../data/shop';
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
    const coins = new CoinPill(this, W - 110, 46, save.data.coins);

    txt(this, W / 2, 56, t('levelN', { n: level }), 52, '#ffd60a');
    txt(this, W / 2, 104, t(`biome_${cfg.biome.id}`), 26, '#ffffff');

    // Boss card.
    const lx = W * 0.25;
    panel(this, lx - 190, 150, 380, 300, 0x3a1f6b);
    txt(this, lx, 180, `${t('boss')}`, 26, '#ff8fa3');
    const bimg = this.add.image(lx, 310, `bossBig_${cfg.boss}`).setScale(0.75);
    this.tweens.add({ targets: bimg, y: 300, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.InOut' });
    txt(this, lx, 425, t(`boss_${cfg.boss}`) + (cfg.bossTier > 0 ? ` ${'★'.repeat(Math.min(5, cfg.bossTier))}` : ''), 26, '#ffffff');

    // Hero + events card.
    const rx = W * 0.72;
    panel(this, rx - 230, 150, 460, 300, 0x23306b);
    const hs = save.data.heroes[save.data.selectedHero];
    this.add.image(rx - 150, 330, `heroBig_${hs.skin}`).setScale(0.62);
    txt(this, rx - 150, 425, `${t(`hero_${save.data.selectedHero}`)} ${t('level_short', { n: hs.level })}`, 22, '#ffffff');
    txt(this, rx + 70, 180, t('modifiers'), 24, '#ffd166');
    if (cfg.mods.length === 0) txt(this, rx + 70, 240, t('noModifiers'), 20, '#bde0fe', { wordWrap: { width: 230 } });
    cfg.mods.forEach((m, i) => {
      txt(this, rx + 70, 230 + i * 90, t(`mod_${m}`), 22, '#ffffff');
      txt(this, rx + 70, 262 + i * 90, t(`moddesc_${m}`), 16, '#bde0fe', { wordWrap: { width: 230 } });
    });
    const hb = new Button(this, rx - 150, 196, { w: 150, h: 48, color: 'blue', label: t('heroes'), size: 20 }).onClick(() => this.scene.start('Heroes', { back: 'Prep', level }));
    void hb;

    // Boosters.
    txt(this, W / 2, 482, `${t('boosters')} — ${t('boostersHint')}`, 22, '#ffffff');
    const n = BOOSTERS.length;
    const bw = 120;
    const gap = 16;
    const x0 = W / 2 - ((n - 1) * (bw + gap)) / 2;
    BOOSTERS.forEach((b, i) => {
      const x = x0 + i * (bw + gap);
      const count = () => save.data.boosters[b.id] ?? 0;
      const btn = new Button(this, x, 560, { w: bw, h: 100, color: 'dark', icon: BOOSTER_ICON[b.id], iconSize: 54 });
      btn.icon!.y = -14;
      const label = txt(this, 0, 30, '', 18, '#ffffff');
      btn.add(label);
      const refresh = () => {
        const c = count();
        btn.setColor(this.chosen.has(b.id) ? 'green' : 'dark');
        label.setText(c > 0 ? `${t(`booster_${b.id}`)} x${c}` : `${b.price}`);
        label.setColor(c > 0 ? '#ffffff' : '#ffe066');
      };
      btn.onClick(() => {
        if (this.chosen.has(b.id)) this.chosen.delete(b.id);
        else if (count() > 0) this.chosen.add(b.id);
        else if (econ.buyBooster(b.id)) {
          audio.play('buy');
          coins.set(save.data.coins);
          this.chosen.add(b.id);
        } else toast(this, t('notEnough'), '#ff8fa3');
        refresh();
      });
      refresh();
    });

    new Button(this, 130, 660, { w: 200, h: 70, color: 'red', label: t('back'), size: 26 }).onClick(() => this.scene.start('Menu'));
    const go = new Button(this, W - 190, 660, { w: 300, h: 90, color: 'yellow', label: t('toBattle'), size: 40 }).onClick(() => {
      const boosters = [...this.chosen].filter((id) => (save.data.boosters[id] ?? 0) > 0);
      boosters.forEach((id) => (save.data.boosters[id] -= 1));
      save.data.stats.played++;
      save.save();
      this.chosen.clear();
      this.scene.start('Game', { level, boosters });
    });
    this.tweens.add({ targets: go, scale: 1.05, yoyo: true, repeat: -1, duration: 600 });
  }
}
