import { audio } from '../audio/audio';
import { econ } from '../core/economy';
import { t } from '../core/i18n';
import { save } from '../core/save';
import { HEROES, heroById, heroPowerMult, MAX_HERO_LEVEL, upgradeCost } from '../data/heroes';
import { skinById, skinsOf } from '../data/shop';
import type { HeroDef } from '../data/types';
import { background, Button, CoinPill, panel, toast, txt } from '../ui/widgets';
import { BaseScene } from './BaseScene';

export class HeroesScene extends BaseScene {
  private coins!: CoinPill;

  constructor() {
    super('Heroes');
  }

  create(): void {
    this.rebuildOnResize();
    const W = this.W;
    background(this, 0x2f8cff, 0x112a6b);
    this.coins = new CoinPill(this, W - 110, 46, save.data.coins);
    txt(this, W * 0.28, 50, t('heroes'), 48, '#ffd60a');
    const view: string = this.sceneData.view ?? save.data.selectedHero;
    this.sceneData.view = view;
    if (!this.sceneData.skin || skinById(this.sceneData.skin)?.hero !== view) this.sceneData.skin = save.data.heroes[view].skin;

    // Hero grid.
    const gridW = W * 0.54;
    const cols = 5;
    const cw = Math.min(150, (gridW - 40) / cols);
    const ch = 200;
    HEROES.forEach((h, i) => {
      const x = 30 + cw / 2 + (i % cols) * (cw + 8);
      const y = 120 + ch / 2 + Math.floor(i / cols) * (ch + 14);
      this.heroCard(h, x, y, cw, ch, h.id === view);
    });

    this.details(heroById(view));

    const back = this.sceneData.back ?? 'Menu';
    new Button(this, 130, 660, { w: 200, h: 70, color: 'red', label: t('back'), size: 26 }).onClick(() => this.scene.start(back, { level: this.sceneData.level }));
  }

  private heroCard(h: HeroDef, x: number, y: number, w: number, hgt: number, active: boolean): void {
    const st = save.data.heroes[h.id];
    const g = this.add.graphics();
    const col = st.owned ? (save.data.selectedHero === h.id ? 0x2f9e4f : 0x3a5bd9) : 0x2b2f55;
    g.fillStyle(0x1b1530, 1).fillRoundedRect(x - w / 2 - 3, y - hgt / 2 - 3, w + 6, hgt + 6, 16);
    g.fillStyle(col, 1).fillRoundedRect(x - w / 2, y - hgt / 2, w, hgt, 14);
    if (active) g.lineStyle(5, 0xffd60a, 1).strokeRoundedRect(x - w / 2 - 2, y - hgt / 2 - 2, w + 4, hgt + 4, 16);
    const img = this.add.image(x, y + 34, `heroBig_${st.skin}`).setOrigin(0.5, 1);
    img.setScale(Math.min(132 / img.height, (w - 12) / img.width));
    if (!st.owned) img.setTint(0x30304a);
    txt(this, x, y + 54, t(`hero_${h.id}`), 20, '#ffffff');
    if (st.owned) txt(this, x, y + 80, t('level_short', { n: st.level }), 16, '#ffe066');
    else {
      this.add.image(x, y - 10, 'i_lock').setDisplaySize(44, 44);
      const u = h.unlock;
      const label = u.type === 'coins' ? `${u.price}` : u.type === 'ads' ? `▶ ${econ.adProgress(`hero:${h.id}`)}/${u.count}` : u.type === 'level' ? `${t('level')} ${u.level}` : '';
      txt(this, x, y + 80, label, 16, u.type === 'coins' ? '#ffe066' : '#d0b3ff');
    }
    const zone = this.add.zone(x, y, w, hgt).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      audio.play('click', { vol: 0.5 });
      this.sceneData.view = h.id;
      this.sceneData.skin = st.skin;
      this.scene.restart(this.sceneData);
    });
  }

  private details(h: HeroDef): void {
    const W = this.W;
    const x0 = W * 0.57;
    const pw = W - x0 - 24;
    const cx = x0 + pw / 2;
    const st = save.data.heroes[h.id];
    panel(this, x0, 96, pw, 540, 0x23306b);
    const skinId: string = this.sceneData.skin;
    const portrait = this.add.image(x0 + 130, 360, `heroBig_${skinId}`).setOrigin(0.5, 1);
    portrait.setScale(Math.min(220 / portrait.height, 230 / portrait.width));
    this.tweens.add({ targets: portrait, y: 354, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut' });
    txt(this, x0 + 130, 126, t(`hero_${h.id}`).toUpperCase(), 32, '#ffffff');
    txt(this, x0 + 130, 158, t(`role_${h.role}`), 20, '#bde0fe');

    // Stats.
    const m = heroPowerMult(st.level);
    const tx = x0 + 270;
    const tw = pw - 290;
    const line = (y: number, label: string, value: string, color = '#ffffff') => {
      txt(this, tx, y, label, 18, '#bde0fe').setOrigin(0, 0.5);
      txt(this, tx + tw, y, value, 20, color).setOrigin(1, 0.5);
    };
    line(130, t('level'), `${st.level}/${MAX_HERO_LEVEL}`, '#ffe066');
    line(160, t('hp'), String(Math.round(h.hp * m)));
    line(190, t('damage'), String(Math.round(h.attack.dmg * m * (h.attack.count && h.attack.kind !== 'chain' ? h.attack.count : 1))));
    line(220, t('speed'), String(h.speed));
    const desc = (y: number, title: string, body: string) => {
      txt(this, tx, y, title, 18, '#ffd166').setOrigin(0, 0);
      txt(this, tx, y + 22, body, 16, '#ffffff', { wordWrap: { width: tw }, align: 'left' }).setOrigin(0, 0);
    };
    desc(240, t('attack'), t(`atk_${h.id}`));
    desc(308, t('super'), t(`sup_${h.id}`));
    desc(376, t('passive'), t(`pas_${h.id}`));

    // Skins.
    const skins = skinsOf(h.id);
    txt(this, x0 + 130, 392, t('tab_skins'), 20, '#ffd166');
    skins.forEach((s, i) => {
      const sx = x0 + 50 + i * 80;
      const sy = 450;
      const owned = econ.ownsSkin(s.id);
      const g = this.add.graphics();
      g.fillStyle(owned ? 0x3a5bd9 : 0x1b1e3c, 1).fillRoundedRect(sx - 34, sy - 40, 68, 80, 10);
      if (s.id === skinId) g.lineStyle(4, 0xffd60a, 1).strokeRoundedRect(sx - 36, sy - 42, 72, 84, 12);
      const th = this.add.image(sx, sy + 36, `heroBig_${s.id}`).setOrigin(0.5, 1);
      th.setScale(Math.min(74 / th.height, 64 / th.width));
      if (s.id === st.skin) this.add.image(sx + 24, sy - 30, 'i_check').setDisplaySize(26, 26);
      else if (!owned) this.add.image(sx + 24, sy - 30, s.price.type === 'ads' ? 'i_ad' : 'i_coin').setDisplaySize(26, 26);
      this.add
        .zone(sx, sy, 68, 80)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          audio.play('click', { vol: 0.5 });
          this.sceneData.skin = s.id;
          this.scene.restart(this.sceneData);
        });
    });
    txt(this, x0 + 130, 506, t(skinById(skinId)!.nameKey), 18, '#ffffff');

    // Action buttons.
    const by = 580;
    if (!st.owned) {
      this.unlockButton(h, cx, by);
      return;
    }
    // Skin action (if previewing a non-equipped skin).
    const skin = skinById(skinId)!;
    if (skin.id !== st.skin) {
      if (econ.ownsSkin(skin.id)) {
        new Button(this, cx - 120, by, { w: 220, h: 70, color: 'green', label: t('equip'), size: 26 }).onClick(() => {
          econ.equipSkin(skin.id);
          this.scene.restart(this.sceneData);
        });
      } else if (skin.price.type === 'coins') {
        const price = skin.price.price;
        new Button(this, cx - 120, by, { w: 220, h: 70, color: 'orange', label: `${price}`, size: 28, icon: 'i_coin', iconSize: 44 }).onClick(() => {
          if (econ.buySkin(skin.id)) {
            audio.play('unlock');
            econ.equipSkin(skin.id);
            this.scene.restart(this.sceneData);
          } else toast(this, t('notEnough'), '#ff8fa3');
        });
      } else if (skin.price.type === 'ads') {
        const need = skin.price.count;
        const key = `skin:${skin.id}`;
        const b = new Button(this, cx - 120, by, { w: 220, h: 70, color: 'purple', label: t('watchAd', { n: econ.adProgress(key), m: need }), size: 24, icon: 'i_ad', iconSize: 44 }).onClick(async () => {
          b.setEnabled(false);
          const r = await econ.watchFor(key, need);
          if (r === 'done') {
            econ.grantSkin(skin.id);
            econ.equipSkin(skin.id);
            audio.play('unlock');
            toast(this, t('unlocked'), '#80ed99');
          } else if (r === 'fail') toast(this, t('adNoReward'), '#ff8fa3');
          this.scene.restart(this.sceneData);
        });
      }
    } else {
      const selected = save.data.selectedHero === h.id;
      new Button(this, cx - 120, by, { w: 220, h: 70, color: selected ? 'grey' : 'green', label: selected ? t('selected') : t('select'), size: 26 }).onClick(() => {
        save.data.selectedHero = h.id;
        save.save();
        audio.play('pickup');
        this.scene.restart(this.sceneData);
      });
    }
    if (st.level < MAX_HERO_LEVEL) {
      const cost = upgradeCost(st.level);
      new Button(this, cx + 120, by, { w: 220, h: 70, color: 'yellow', label: `${cost}`, sub: t('upgrade'), size: 26, icon: 'i_coin', iconSize: 40 }).onClick(() => {
        if (econ.upgradeHero(h.id)) {
          audio.play('unlock');
          this.scene.restart(this.sceneData);
        } else toast(this, t('notEnough'), '#ff8fa3');
      });
    } else txt(this, cx + 120, by, t('maxed'), 30, '#ffd60a');
  }

  private unlockButton(h: HeroDef, cx: number, by: number): void {
    const u = h.unlock;
    if (u.type === 'coins') {
      new Button(this, cx, by, { w: 300, h: 76, color: 'orange', label: `${u.price}`, sub: t('buy'), size: 28, icon: 'i_coin', iconSize: 48 }).onClick(() => {
        if (econ.buyHero(h.id)) {
          audio.play('unlock');
          toast(this, t('unlocked'), '#80ed99');
          this.scene.restart(this.sceneData);
        } else toast(this, t('notEnough'), '#ff8fa3');
      });
    } else if (u.type === 'ads') {
      const key = `hero:${h.id}`;
      const b = new Button(this, cx, by, { w: 300, h: 76, color: 'purple', label: t('watchAd', { n: econ.adProgress(key), m: u.count }), size: 28, icon: 'i_ad', iconSize: 48 }).onClick(async () => {
        b.setEnabled(false);
        const r = await econ.watchFor(key, u.count);
        if (r === 'done') {
          econ.grantHero(h.id);
          audio.play('unlock');
          toast(this, t('unlocked'), '#80ed99');
        } else if (r === 'fail') toast(this, t('adNoReward'), '#ff8fa3');
        this.scene.restart(this.sceneData);
      });
    } else if (u.type === 'level') {
      txt(this, cx, by, t('unlockAtLevel', { n: u.level }), 26, '#d0b3ff');
    }
    this.coins.set(save.data.coins);
  }
}
