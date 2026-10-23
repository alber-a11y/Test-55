import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Button, panel, ribbon, Toggle, txt, UI } from '@shared/ui/widgets';
import { randomOpponents } from '../data/quick';
import { DEFAULT_RULES, type DRules } from '../logic/durak';
import { save } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';

export class QuickSetupScene extends BaseScene {
  constructor() {
    super('QuickSetup');
  }

  create(): void {
    menuBackground(this, 1);
    topBar(this, t('quick'), () => this.go('Menu', {}, 'setup_back'));
    const W = this.W;
    const H = this.H;
    const q = save.data.settings.quick;
    const pw = Math.min(W - 60, 960);
    const py = this.portrait ? 240 : 180;
    const rh = this.portrait ? 150 : 110;
    panel(this, W / 2 - pw / 2, py, pw, rh * 6 + 330);
    ribbon(this, W / 2, py, Math.min(pw - 160, 560), t('quick'), 0x2f6fd0);
    let y = py + 110;
    const x0 = W / 2 - pw / 2 + 50;
    const xr = W / 2 + pw / 2 - 60;
    const row = (label: string) => txt(this, x0, y, label, 36, '#ffffff').setOrigin(0, 0.5);
    const seg = <T extends number>(vals: T[], cur: T, labels: string[], apply: (v: T) => void) => {
      const btns: Button[] = [];
      const bw = labels.some((l) => l.length > 3) ? 170 : 110;
      vals.forEach((v, i) => {
        const b = new Button(this, xr - (vals.length - 1 - i) * (bw + 12) - bw / 2, y, { w: bw, h: 88, color: v === cur ? 'gold' : 'dark', label: labels[i], size: 28 }).onClick(() => {
          apply(v);
          save.save();
          btns.forEach((bb, j) => bb.setColor(j === i ? 'gold' : 'dark'));
          this.scene.restart();
        });
        btns.push(b);
      });
    };
    row(t('qs_players'));
    seg([2, 3, 4], q.players, ['2', '3', '4'], (v) => {
      q.players = v;
      if (v !== 4) q.teams = false;
    });
    y += rh;
    row(t('qs_deck'));
    seg<24 | 36 | 52>([24, 36, 52], q.deck, ['24', '36', '52'], (v) => (q.deck = v));
    y += rh;
    row(t('qs_level'));
    seg([1, 2, 3, 4], q.level, ['1', '2', '3', '4'], (v) => (q.level = v));
    txt(this, x0 + 260, y + 44, t('lvl' + q.level), 24, UI.gold).setOrigin(0, 0.5);
    y += rh;
    const tog = (label: string, val: boolean, set: (v: boolean) => void, enabled = true) => {
      row(label).setAlpha(enabled ? 1 : 0.4);
      if (enabled)
        new Toggle(this, xr - 60, y, val, (v) => {
          set(v);
          save.save();
        });
      y += rh;
    };
    tog(t('qs_transfer'), q.transfer, (v) => (q.transfer = v));
    tog(t('qs_teams'), q.teams, (v) => (q.teams = v), q.players === 4);
    tog(t('qs_cheat'), q.cheat, (v) => (q.cheat = v));
    const play = new Button(this, W / 2, y + 60, { w: 520, h: 150, color: 'green', label: t('start'), size: 60 }).onClick(() => {
      const rules: DRules = { ...DEFAULT_RULES, players: q.players, deck: q.deck, transfer: q.transfer, teams: q.players === 4 && q.teams, cheat: q.cheat };
      const seed = (Math.random() * 1e9) | 0;
      audio.play('shuffle');
      this.go('Game', { mode: 'quick', rules, opponents: randomOpponents(q.players - 1, q.level, seed, getLang()), loc: seed % 8, seed });
    });
    this.tweens.add({ targets: play, scale: 1.05, duration: 800, yoyo: true, repeat: -1 });
    void H;
    this.setupScene();
  }
}
