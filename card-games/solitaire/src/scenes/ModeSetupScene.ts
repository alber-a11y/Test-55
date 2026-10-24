import Phaser from 'phaser';
import { audio } from '@shared/audio/audio';
import { t } from '@shared/core/i18n';
import { formatTime } from '@shared/core/time';
import { BaseScene } from '@shared/ui/base';
import { Button, panel, ribbon, Toggle, txt, UI } from '@shared/ui/widgets';
import { save, type ModeId } from '../save';
import { skin } from '../skin';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';

type SetupMode = 'klondike' | 'spider' | 'freecell' | 'blitz';

/** Mode options + personal statistics, then start. */
export class ModeSetupScene extends BaseScene {
  constructor() {
    super('ModeSetup');
  }

  create(data: { mode: SetupMode }): void {
    const mode = data.mode;
    const W = this.W;
    const H = this.H;
    menuBackground(this);
    topBar(this, t(mode), () => this.go('Menu', {}, 'setup_back'));
    // Portrait: one column. Landscape: illustration + stats on the left, options + start on the right.
    const port = this.portrait;
    const pw = port ? Math.min(W - 60, 940) : Math.min(W - 80, 1500);
    const py = port ? 260 : 190;
    const lx = port ? W / 2 : W / 2 - pw / 4;
    const colW = port ? pw : pw / 2;
    const optL = port ? W / 2 - pw / 2 + 60 : W / 2 + 30;
    const optR = W / 2 + pw / 2 - 60;
    const set = save.data.settings;
    const options: ((y: number) => void)[] = [];
    const row = (y: number, label: string) => {
      const tt = txt(this, optL, y, label, 36, '#ffffff').setOrigin(0, 0.5);
      return tt;
    };
    const seg = <T extends number>(y: number, vals: T[], cur: T, labels: string[], apply: (v: T) => void) => {
      const btns: Button[] = [];
      const bw = 130;
      vals.forEach((v, i) => {
        const b = new Button(this, optR - (vals.length - 1 - i) * (bw + 14) - bw / 2, y, { w: bw, h: 90, color: v === cur ? 'gold' : 'dark', label: labels[i], size: 30 }).onClick(() => {
          apply(v);
          save.save();
          btns.forEach((bb, j) => bb.setColor(j === i ? 'gold' : 'dark'));
        });
        btns.push(b);
      });
      return vals.length * (bw + 14);
    };
    /** Label on the left, control on the right; the label shrinks if it would run into the control. */
    const fit = (label: Phaser.GameObjects.Text, controlW: number) => {
      const max = optR - controlW - 30 - optL;
      if (label.width > max) label.setScale(max / label.width);
    };
    const toggle = (y: number, label: string, val: boolean, setv: (v: boolean) => void) => {
      fit(row(y, label), 130);
      new Toggle(this, optR - 60, y, val, (v) => {
        setv(v);
        save.save();
      });
    };
    if (mode === 'klondike') {
      options.push((y) => fit(row(y, t('set_klDraw')), 0 + seg<1 | 3>(y, [1, 3], set.klDraw, [t('draw1'), t('draw3')], (v) => (set.klDraw = v))));
      options.push((y) => toggle(y, t('set_solvable'), set.solvable, (v) => (set.solvable = v)));
    } else if (mode === 'spider') {
      options.push((y) => fit(row(y, t('set_spSuits')), seg<1 | 2 | 4>(y, [1, 2, 4], set.spSuits, ['1 ♠', '2 ♠♥', '4 ♠♥♦♣'], (v) => (set.spSuits = v))));
    }
    if (mode !== 'blitz') options.push((y) => toggle(y, t('set_autoMove'), set.autoMove, (v) => (set.autoMove = v)));

    const rowH = 120;
    // Panel height from content so nothing overlaps.
    const optTop = port ? py + 500 : py + 160;
    const statsTop = port ? optTop + options.length * rowH - 40 : py + 470;
    const ph = port ? statsTop + 170 + 200 - py : H - 230;
    panel(this, W / 2 - pw / 2, py, pw, ph);
    ribbon(this, W / 2, py, Math.min(pw - 160, 560), t(mode), 0x2f6fd0);

    // Illustration: fan of cards
    const faces: [number, number][] = mode === 'spider' ? [[0, 13], [0, 12], [0, 11], [0, 10], [0, 9]] : mode === 'freecell' ? [[1, 1], [0, 2], [2, 3], [3, 4], [1, 5]] : [[1, 13], [3, 12], [2, 11], [0, 1], [1, 10]];
    faces.forEach(([s, r], i) => this.add.image(lx + (i - 2) * 70, py + 230 + Math.abs(i - 2) * 12, skin.cards.face(s as 0, r)).setScale(0.62).setAngle((i - 2) * 10));
    txt(this, lx, py + 400, t(`${mode}_d`), 34, '#e8ecf8', { wordWrap: { width: colW - 80 }, strokeThickness: 0 });
    options.forEach((fn, i) => fn(optTop + i * rowH));

    // Stats
    const st = save.data.stats[mode as ModeId];
    const items: [string, string][] =
      mode === 'blitz'
        ? [
            [t('st_played'), String(st.played)],
            [t('st_best'), String(st.best)],
          ]
        : [
            [t('st_played'), String(st.played)],
            [t('st_won'), String(st.won)],
            [t('st_rate'), st.played ? `${Math.round((st.won / st.played) * 100)}%` : '—'],
            [t('st_bestTime'), st.bestTime ? formatTime(st.bestTime) : '—'],
          ];
    const g = this.add.graphics();
    const sx0 = lx - colW / 2 + 40;
    g.fillStyle(UI.inkN, 0.35).fillRoundedRect(sx0, statsTop - 10, colW - 80, 150, 24);
    items.forEach(([k, v], i) => {
      const x = lx + (i - (items.length - 1) / 2) * ((colW - 120) / items.length);
      txt(this, x, statsTop + 40, v, 42, UI.gold);
      const lb = txt(this, x, statsTop + 100, k, 24, '#ffffff', { strokeThickness: 0 });
      const lim = (colW - 120) / items.length - 8;
      if (lb.width > lim) lb.setScale(lim / lb.width);
    });

    const play = new Button(this, port ? W / 2 : W / 2 + pw / 4, py + ph - 110, { w: 520, h: 150, color: 'green', label: t('start'), size: 60 }).onClick(() => {
      audio.play('shuffle');
      if (mode === 'blitz') this.go('TriPeaks', { mode: 'blitz' });
      else this.go('Classic', { mode, newGame: true });
    });
    this.tweens.add({ targets: play, scale: 1.05, duration: 800, yoyo: true, repeat: -1 });
    this.setupScene();
  }
}
