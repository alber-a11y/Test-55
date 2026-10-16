import { audio } from '../audio/audio';
import { t } from '../core/i18n';
import { save } from '../core/save';
import { biomeForLevel } from '../data/biomes';
import { BOSS_IDS } from '../data/enemies';
import { HEROES } from '../data/heroes';
import { openSettings } from '../ui/settings';
import { background, Button, CoinPill, txt } from '../ui/widgets';
import { BaseScene } from './BaseScene';

export class MenuScene extends BaseScene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.rebuildOnResize();
    audio.playMusic('menu');
    const W = this.W;
    const H = this.H;
    const d = save.data;
    background(this);

    // Title.
    const title = txt(this, 200, 52, t('title'), 48, '#ffd60a').setStroke('#1b1530', 10);
    title.setOrigin(0.5).setAngle(-3);
    this.tweens.add({ targets: title, scale: 1.05, yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.InOut' });

    new CoinPill(this, W - 110, 46, d.coins);

    new Button(this, 60, 122, { w: 72, h: 64, color: 'blue', icon: 'i_gear', iconSize: 46 }).onClick(() =>
      openSettings(this, (langChanged) => langChanged && this.scene.restart()),
    );

    // Hero showcase.
    const heroId = d.selectedHero;
    const hs = d.heroes[heroId];
    const cx = W * 0.32;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25).fillEllipse(cx, 610, 300, 70);
    g.fillStyle(0xffffff, 0.15).fillEllipse(cx, 600, 260, 56);
    const portrait = this.add.image(cx, 612, `heroBig_${hs.skin}`).setOrigin(0.5, 1);
    portrait.setScale(360 / portrait.height);
    this.tweens.add({ targets: portrait, scaleY: portrait.scaleY * 1.025, y: 608, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    portrait.setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('Heroes'));
    txt(this, cx, 210, t(`hero_${heroId}`).toUpperCase(), 44, '#ffffff');
    txt(this, cx, 256, `${t(`role_${HEROES.find((h) => h.id === heroId)!.role}`)} · ${t('level_short', { n: hs.level })}`, 24, '#bde0fe');

    // Next level card (level choice itself lives on the map screen).
    const rx = W * 0.74;
    const lvl = d.maxLevel;
    const card = this.add.graphics();
    card.fillStyle(0x1b1530, 0.6).fillRoundedRect(rx - 190, 140, 380, 180, 24);
    txt(this, rx, 178, t('levelN', { n: lvl }), 40, '#ffd60a');
    txt(this, rx, 218, t(`biome_${biomeForLevel(lvl).id}`), 24, '#ffffff');
    const bossId = BOSS_IDS[(lvl - 1) % BOSS_IDS.length];
    const bi = this.add.image(rx + 150, 280, `bossBig_${bossId}`);
    bi.setScale(62 / bi.height);
    txt(this, rx - 10, 252, `${t('boss')}: ${t(`boss_${bossId}`)}`, 20, '#ff8fa3');
    const mapBtn = new Button(this, rx - 20, 292, { w: 170, h: 40, color: 'blue', label: t('levelMap'), size: 18 }).onClick(() => this.scene.start('Map'));
    void mapBtn;

    new Button(this, rx - 95, 390, { w: 180, h: 84, color: 'blue', label: t('heroes'), size: 28 }).onClick(() => this.scene.start('Heroes'));
    new Button(this, rx + 95, 390, { w: 180, h: 84, color: 'purple', label: t('shop'), size: 28 }).onClick(() => this.scene.start('Shop'));

    const play = new Button(this, rx, 560, { w: 360, h: 130, color: 'yellow', label: t('play'), size: 56, sub: t('levelN', { n: lvl }) }).onClick(() =>
      this.scene.start('Map'),
    );
    this.tweens.add({ targets: play, scale: 1.04, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });

    txt(this, rx, 668, t('bestLevel', { n: d.maxLevel - 1 }), 20, '#bde0fe');
    void H;
  }
}
