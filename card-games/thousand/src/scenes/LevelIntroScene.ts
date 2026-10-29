import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { openModal } from '@shared/ui/modal';
import { Button, panel, ribbon, toast, txt, UI } from '@shared/ui/widgets';
import { faceTex } from '../art/avatars';
import { boosterDef } from '../data/meta';
import { levelCfg, STATIONS, WORLDS } from '../data/route';
import { addBooster, spendCoins } from '../progress';
import { save, type BoosterId } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar, watchAd } from '../ui/common';
import { goalText } from './GameScene';

const PRE: BoosterId[] = ['lucky', 'shield', 'extra'];

/** Station briefing: goal, fellow passengers, modifiers, reward and pre-game boosters. */
export class LevelIntroScene extends BaseScene {
  private selected = new Set<BoosterId>();

  constructor() {
    super('LevelIntro');
  }

  create(data: { idx: number }): void {
    const cfg = levelCfg(data.idx, getLang());
    const wd = WORLDS[cfg.world];
    menuBackground(this, cfg.world);
    this.selected = new Set();
    const pill = topBar(this, t('stationN', { n: cfg.st + 1 }), () => this.go('Map'));
    const W = this.W;
    const H = this.H;
    const port = this.portrait;
    const pw = Math.min(W - 60, port ? 980 : 1560);
    const py = port ? 230 : 180;
    const ph = port ? H - 300 : H - 210;
    panel(this, W / 2 - pw / 2, py, pw, ph);
    const wname = getLang() === 'en' ? wd.en : wd.ru;
    ribbon(this, W / 2, py, Math.min(pw - 160, 640), cfg.boss ? `${t('boss')} · ${wname}` : wname, cfg.boss ? 0x7a2a8c : 0xa3213a);
    const lx = port ? W / 2 : W / 2 - pw / 4;
    let y = py + 120;
    // Goal
    this.add.image(lx, y + 40, 'i_flag').setDisplaySize(80, 80);
    txt(this, lx, y + 120, goalText(cfg), 40, UI.gold, { wordWrap: { width: (port ? pw : pw / 2) - 80 } });
    const sub = cfg.goal.k === 'race' || cfg.goal.k === 'barrel' ? (cfg.goal.k === 'barrel' ? t('barrelSub') : t('raceSub')) : t('inDeals', { n: cfg.deals });
    txt(this, lx, y + 175, sub, 28, '#ffffff', { strokeThickness: 0 });
    y += 230;
    // Opponents
    const fs = port ? 170 : 160;
    cfg.opponents.forEach((o, i) => {
      const x = lx + (i - 0.5) * (fs + 120);
      this.add.image(x, y + fs / 2, faceTex(this.textures, `intro_${cfg.idx}_${i}`, o.face, cfg.boss && o.boss ? 'smug' : 'neutral')).setDisplaySize(fs, fs);
      const nm = txt(this, x, y + fs + 26, o.name, 28, o.boss ? UI.gold : '#ffffff');
      if (nm.width > fs + 100) nm.setScale((fs + 100) / nm.width);
      txt(this, x, y + fs + 58, `${t('trait_' + o.trait)} · ${t('lvl' + o.ai.level)}`, 22, '#cfd6e6', { strokeThickness: 0 });
    });
    y += fs + 100;
    // Modifiers and reward
    const mods = cfg.mods.map((m) => t('mod_' + m));
    if (cfg.start) mods.push(t('startScores', { a: cfg.start[0], b: cfg.start[1], c: cfg.start[2] }));
    if (mods.length) {
      txt(this, lx, y, mods.join(' · '), 26, '#ffd6a5', { wordWrap: { width: (port ? pw : pw / 2) - 60 } });
      y += 60;
    }
    const items: [string, string, string][] = [
      ['i_coin', t('prize'), `+${cfg.prize}`],
      ['i_star', 'XP', `+${cfg.xp}`],
      ['i_medal', t('rating'), `+${cfg.rating}`],
    ];
    items.forEach(([icon, label, v], i) => {
      const x = lx + (i - 1) * 210;
      this.add.image(x, y + 30, icon).setDisplaySize(72, 72);
      txt(this, x, y + 90, v, 34, UI.gold);
      txt(this, x, y + 126, label, 22, '#ffffff', { strokeThickness: 0 });
    });
    // Boosters
    const rx = port ? W / 2 : W / 2 + pw / 4;
    const by = port ? y + 240 : py + 190;
    txt(this, rx, by - 60, t('pickBoosters'), 32, '#ffffff');
    PRE.forEach((id, i) => {
      const bx = rx + (i - 1) * 250;
      const b = new Button(this, bx, by + 60, { w: 220, h: 150, color: 'dark', icon: `i_${boosterDef(id).icon}`, iconSize: 84, label: '', size: 24 });
      txt(this, bx, by + 165, t(`b_${id}`), 24, '#ffffff', { wordWrap: { width: 230 } });
      const refresh = () => {
        const n = save.data.boosters[id] ?? 0;
        b.setColor(this.selected.has(id) ? 'green' : 'dark');
        b.setBadge(this.selected.has(id) ? '✓' : n > 0 ? String(n) : '+');
      };
      refresh();
      b.onClick(() => {
        const n = save.data.boosters[id] ?? 0;
        if (this.selected.has(id)) this.selected.delete(id);
        else if (n > 0) this.selected.add(id);
        else
          return this.offer(id, () => {
            this.selected.add(id);
            refresh();
            pill?.set(save.data.coins);
          });
        refresh();
      });
    });
    if (!port) txt(this, rx, by + 250, t('preBoostersHint'), 24, '#cfd6e6', { strokeThickness: 0, wordWrap: { width: pw / 2 - 80 } });
    const play = new Button(this, port ? W / 2 : rx, py + ph - 110, { w: 540, h: 150, color: 'green', label: t('start'), sub: `${wname} · ${cfg.st + 1}/${STATIONS}`, size: 56 }).onClick(() => {
      for (const id of this.selected) save.data.boosters[id]--;
      save.save();
      audio.play('whistle');
      this.go('Game', { mode: 'career', rules: cfg.rules, opponents: cfg.opponents, world: cfg.world, level: cfg.idx, boosters: [...this.selected] });
    });
    this.tweens.add({ targets: play, scale: 1.05, duration: 800, yoyo: true, repeat: -1 });
    this.setupScene();
  }

  private offer(id: BoosterId, done: () => void): void {
    const W = this.W;
    const m = openModal(this, t(`b_${id}`), Math.min(W - 60, 820), 620);
    m.root.add(this.add.image(W / 2, m.y + 190, `i_${boosterDef(id).icon}`).setDisplaySize(130, 130));
    m.root.add(txt(this, W / 2, m.y + 330, t(`b_${id}_d`), 36, '#ffffff', { wordWrap: { width: m.w - 80 } }));
    m.root.add(
      new Button(this, W / 2 - 180, m.y + m.h - 110, { w: 320, h: 116, color: 'green', label: t('free'), size: 36, ad: true }).onClick(() => {
        m.close();
        void watchAd(this, `pre_${id}`, () => {
          addBooster(id, 1);
          audio.play('booster');
          done();
        });
      }),
    );
    const price = boosterDef(id).price;
    m.root.add(
      new Button(this, W / 2 + 180, m.y + m.h - 110, { w: 300, h: 116, color: 'gold', label: String(price), icon: 'i_coin', size: 40 }).onClick(() => {
        if (!spendCoins(price)) return toast(this, t('notEnough'), '#ff8a8a');
        addBooster(id, 1);
        audio.play('buy');
        m.close();
        done();
      }),
    );
  }
}
