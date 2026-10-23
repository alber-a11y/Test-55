import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { openModal } from '@shared/ui/modal';
import { Button, panel, ribbon, toast, txt, UI } from '@shared/ui/widgets';
import { faceTex } from '../art/avatars';
import { LOCATIONS, tableCfg, TABLES_PER_LOC } from '../data/locations';
import { addBooster, spendCoins } from '../progress';
import { save, type BoosterId } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar, watchAd } from '../ui/common';

const PRE: BoosterId[] = ['shield', 'counter', 'peek'];
const PRE_ICON: Record<string, string> = { shield: 'medal', counter: 'stats', peek: 'eye' };
const PRICE: Record<string, number> = { shield: 200, counter: 80, peek: 120 };

/** Opponents, rules, stake and pre-game boosters of a career table. */
export class TableIntroScene extends BaseScene {
  private selected = new Set<BoosterId>();

  constructor() {
    super('TableIntro');
  }

  create(data: { idx: number }): void {
    const cfg = tableCfg(data.idx, getLang());
    const L = LOCATIONS[cfg.loc];
    menuBackground(this, cfg.loc);
    this.selected = new Set();
    const pill = topBar(this, t('tableN', { n: (cfg.idx % TABLES_PER_LOC) + 1 }), () => this.go('Career'));
    const W = this.W;
    const H = this.H;
    const pw = Math.min(W - 60, this.portrait ? 960 : 1500);
    const py = this.portrait ? 230 : 180;
    const ph = this.portrait ? H - 300 : H - 210;
    panel(this, W / 2 - pw / 2, py, pw, ph);
    ribbon(this, W / 2, py, Math.min(pw - 160, 620), cfg.boss ? `${t('boss')} · ${getLang() === 'en' ? L.en : L.ru}` : getLang() === 'en' ? L.en : L.ru, cfg.boss ? 0x8e2de2 : 0xe8364f);
    const lx = this.portrait ? W / 2 : W / 2 - pw / 4;
    // Opponents
    txt(this, lx, py + 110, t('opponents'), 34, UI.gold);
    const n = cfg.opponents.length;
    const fs = n > 2 ? 170 : 210;
    cfg.opponents.forEach((o, i) => {
      const x = lx + (i - (n - 1) / 2) * (fs + 50);
      this.add.image(x, py + 160 + fs / 2, faceTex(this.textures, `intro_${cfg.idx}_${i}`, o.face, cfg.boss ? 'smug' : 'neutral')).setDisplaySize(fs, fs);
      txt(this, x, py + 190 + fs, o.name, 30, o.boss ? UI.gold : '#ffffff');
      txt(this, x, py + 226 + fs, `${t('trait_' + o.trait)} · ${t('lvl' + o.ai.level)}`, 22, '#cfd6e6', { strokeThickness: 0 });
    });
    // Rules
    let y = py + 300 + fs;
    const rules = [cfg.rules.transfer ? t('r_transfer') : t('r_podkidnoy'), t('r_players', { n: cfg.rules.players }), t('r_deck', { n: cfg.rules.deck })];
    if (cfg.rules.teams) rules.push(t('r_teams'));
    if (cfg.rules.cheat) rules.push(t('r_cheat'));
    if (cfg.winsNeeded > 1) rules.push(t('bestOf3'));
    txt(this, lx, y, rules.join(' · '), 30, '#ffffff', { wordWrap: { width: (this.portrait ? pw : pw / 2) - 60 } });
    y += 80;
    // Stake / prize / rating
    const items: [string, string, string][] = [
      ['i_coin', t('stake'), String(cfg.stake)],
      ['i_coins', t('prize'), String(cfg.prize)],
      ['i_medal', t('rating'), `+${cfg.rating}`],
    ];
    items.forEach(([icon, label, v], i) => {
      const x = lx + (i - 1) * 220;
      this.add.image(x, y + 30, icon).setDisplaySize(80, 80);
      txt(this, x, y + 95, v, 36, UI.gold);
      txt(this, x, y + 135, label, 24, '#ffffff', { strokeThickness: 0 });
    });
    // Boosters
    const rx = this.portrait ? W / 2 : W / 2 + pw / 4;
    const by = this.portrait ? y + 240 : py + 160;
    txt(this, rx, by - 50, t('pickBoosters'), 32, '#ffffff');
    PRE.forEach((id, i) => {
      const bx = rx + (i - 1) * 250;
      const b = new Button(this, bx, by + 70, { w: 220, h: 150, color: 'dark', icon: `i_${PRE_ICON[id]}`, iconSize: 80, label: '', size: 24 });
      const label = txt(this, bx, by + 175, t(`b_${id}`), 24, '#ffffff', { wordWrap: { width: 230 } });
      void label;
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
        else return this.offer(id, () => {
          this.selected.add(id);
          refresh();
          pill?.set(save.data.coins);
        });
        refresh();
      });
    });
    const play = new Button(this, this.portrait ? W / 2 : rx, py + ph - 110, { w: 520, h: 150, color: 'green', label: t('start'), sub: `${t('stake')}: ${cfg.stake}`, size: 56 }).onClick(() => {
      if (!spendCoins(cfg.stake)) {
        toast(this, t('notEnough'), '#ff8a8a');
        this.time.delayedCall(800, () => this.go('Shop', { tab: 'coins', from: 'Menu' }));
        return;
      }
      for (const id of this.selected) save.data.boosters[id]--;
      save.save();
      audio.play('shuffle');
      this.go('Game', { mode: 'career', rules: cfg.rules, opponents: cfg.opponents, loc: cfg.loc, tableIdx: cfg.idx, match: { wins: 0, losses: 0, need: cfg.winsNeeded, deal: 1 }, boosters: [...this.selected] });
    });
    this.tweens.add({ targets: play, scale: 1.05, duration: 800, yoyo: true, repeat: -1 });
    this.setupScene();
  }

  private offer(id: BoosterId, done: () => void): void {
    const W = this.W;
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
      new Button(this, W / 2 + 180, m.y + m.h - 120, { w: 300, h: 120, color: 'gold', label: String(PRICE[id]), icon: 'i_coin', size: 40 }).onClick(() => {
        if (!spendCoins(PRICE[id])) return toast(this, t('notEnough'), '#ff8a8a');
        addBooster(id, 1);
        audio.play('buy');
        m.close();
        done();
      }),
    );
  }
}
