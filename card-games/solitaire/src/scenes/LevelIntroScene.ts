import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { openModal } from '@shared/ui/modal';
import { Button, panel, ribbon, toast, txt, UI } from '@shared/ui/widgets';
import { BOOSTERS, type BoosterId } from '../data/boosters';
import { cityOfLevel } from '../data/cities';
import { generateLevel } from '../logic/tpGenerator';
import { addBooster, spendCoins } from '../progress';
import { save } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar, watchAd } from '../ui/common';

/** Pre-level window: goal, obstacles, boosters (inventory, coins or rewarded ad). */
export class LevelIntroScene extends BaseScene {
  private selected = new Set<BoosterId>();

  constructor() {
    super('LevelIntro');
  }

  create(data: { level: number; sel?: BoosterId[] }): void {
    const level = data.level;
    this.selected = new Set(data.sel ?? []);
    const W = this.W;
    const H = this.H;
    const city = cityOfLevel(level);
    menuBackground(this, city);
    const pill = topBar(this, t('levelN', { n: level }), () => this.go('Map'));
    const def = generateLevel(level);

    const port = this.portrait;
    const pw = port ? Math.min(W - 60, 940) : Math.min(W - 80, 1500);
    const py = port ? 300 : 210;
    const ph = port ? Math.min(H - 520, 1340) : H - 250;
    panel(this, W / 2 - pw / 2, py, pw, ph);
    ribbon(this, W / 2, py, Math.min(pw - 160, 600), def.boss ? `${t('bossLevel')}` : getLang() === 'en' ? city.en : city.ru, def.boss ? 0x8e2de2 : 0xe8364f);
    // Left column (or top in portrait): stars, goal, obstacles.
    const lx = port ? W / 2 : W / 2 - pw / 4;
    const st = save.data.adv.stars[level] ?? 0;
    for (let k = 0; k < 3; k++) this.add.image(lx + (k - 1) * 110, py + 150 - (k === 1 ? 16 : 0), k < st ? 'i_star' : 'i_starEmpty').setDisplaySize(100, 100);
    txt(this, lx, py + 255, t('goal'), 36, UI.gold);
    const goal = def.goal === 'gold' ? t('goalGold', { n: def.slots.filter((s) => s.gold).length }) : t('goalClear');
    txt(this, lx, py + 310, goal, 40, '#ffffff');
    const obs: string[] = [];
    if (def.slots.some((s) => s.ice)) obs.push('ice');
    if (def.slots.some((s) => s.lock !== undefined)) obs.push('lock');
    if (def.slots.some((s) => s.bomb)) obs.push('bomb');
    if (def.slots.some((s) => s.gold)) obs.push('gold');
    if (def.slots.some((s) => s.coins)) obs.push('coin');
    obs.forEach((o, i) => this.add.image(lx + (i - (obs.length - 1) / 2) * 110, py + 400, `i_${o}`).setDisplaySize(90, 90));

    // Boosters: right column in landscape.
    const rx = port ? W / 2 : W / 2 + pw / 4;
    const by = port ? py + 560 : py + 170;
    txt(this, rx, by - 70, t('pickBoosters'), 34, '#ffffff');
    const pre = BOOSTERS.filter((b) => b.pre);
    const cols = 2;
    const bw = port ? 400 : 320;
    const bh = port ? 170 : 160;
    pre.forEach((b, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = rx + (col - (cols - 1) / 2) * (bw + 26);
      const y = by + row * (bh + 26) + bh / 2;
      this.boosterTile(x, y, bw, bh, b.id, b.icon, b.price, pill, level);
    });

    const play = new Button(this, port ? W / 2 : lx, port ? py + ph - 110 : py + ph - 150, { w: 520, h: 150, color: 'green', label: t('start'), size: 60 });
    play.onClick(() => {
      const use = [...this.selected];
      for (const id of use) save.data.boosters[id]--;
      save.save();
      this.go('TriPeaks', { mode: 'adventure', level, boosters: use });
    });
    this.tweens.add({ targets: play, scale: 1.05, duration: 800, yoyo: true, repeat: -1 });
    this.setupScene();
  }

  private boosterTile(x: number, y: number, w: number, h: number, id: BoosterId, icon: string, price: number, pill: { set(v: number): void } | null, level: number): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const draw = () => {
      const on = this.selected.has(id);
      g.clear();
      g.fillStyle(UI.inkN, 1).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 26);
      g.fillStyle(on ? 0x2c9a52 : 0x283a63, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 24);
      if (on) g.lineStyle(6, 0xffd166, 1).strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 22);
    };
    draw();
    c.add(g);
    const horizontal = w > 300;
    const ix = horizontal ? -w / 2 + 80 : 0;
    const iy = horizontal ? 0 : -h * 0.18;
    c.add(this.add.image(ix, iy, `i_${icon}`).setDisplaySize(horizontal ? 110 : 100, horizontal ? 110 : 100));
    const name = txt(this, horizontal ? -w / 2 + 150 : 0, horizontal ? -30 : h * 0.18, t(`b_${id}`), horizontal ? 32 : 26, '#ffffff');
    if (horizontal) name.setOrigin(0, 0.5);
    if (name.width > (horizontal ? w - 170 : w - 16)) name.setScale((horizontal ? w - 170 : w - 16) / name.width);
    c.add(name);
    const status = txt(this, horizontal ? -w / 2 + 150 : 0, horizontal ? 30 : h * 0.36, '', 28, '#ffd166');
    if (horizontal) status.setOrigin(0, 0.5);
    c.add(status);
    const refresh = () => {
      const n = save.data.boosters[id] ?? 0;
      status.setText(this.selected.has(id) ? '✓' : n > 0 ? `×${n}` : `+ ${t('free')}`);
      status.setScale(1);
      const lim = horizontal ? w - 170 : w - 16;
      if (status.width > lim) status.setScale(lim / status.width);
      draw();
    };
    refresh();
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerup', () => {
      audio.play('click');
      const n = save.data.boosters[id] ?? 0;
      if (this.selected.has(id)) this.selected.delete(id);
      else if (n > 0) this.selected.add(id);
      else {
        // Offer: rewarded ad (free) or buy with coins.
        this.offerBooster(id, price, () => {
          this.selected.add(id);
          refresh();
          pill?.set(save.data.coins);
        });
        return;
      }
      refresh();
    });
    void level;
  }

  private offerBooster(id: BoosterId, price: number, done: () => void): void {
    const W = this.W;
    {
      const m = openModal(this, t(`b_${id}`), Math.min(W - 60, 820), 600);
      m.root.add(txt(this, W / 2, m.y + 250, t(`b_${id}_d`), 40, '#ffffff', { wordWrap: { width: m.w - 80 } }));
      m.root.add(
        new Button(this, W / 2 - 180, m.y + m.h - 120, { w: 320, h: 120, color: 'green', label: t('free'), size: 36, ad: true }).onClick(() => {
          m.close();
          void watchAd(this, `pre_${id}`, () => {
            addBooster(id, 1);
            audio.play('booster');
            done();
          });
        }),
      );
      m.root.add(
        new Button(this, W / 2 + 180, m.y + m.h - 120, { w: 300, h: 120, color: 'gold', label: String(price), icon: 'i_coin', size: 40 }).onClick(() => {
          if (!spendCoins(price)) return toast(this, t('notEnough'), '#ff8a8a');
          addBooster(id, 1);
          audio.play('buy');
          m.close();
          done();
        }),
      );
    }
  }
}
