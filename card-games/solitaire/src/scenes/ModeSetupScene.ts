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
    const pw = Math.min(W - 60, 940);
    const py = this.portrait ? 260 : 190;
    const ph = this.portrait ? Math.min(H - 330, 1500) : H - 230;
    panel(this, W / 2 - pw / 2, py, pw, ph);
    ribbon(this, W / 2, py, Math.min(pw - 160, 560), t(mode), 0x2f6fd0);

    // Illustration: fan of cards
    const faces: [number, number][] = mode === 'spider' ? [[0, 13], [0, 12], [0, 11], [0, 10], [0, 9]] : mode === 'freecell' ? [[1, 1], [0, 2], [2, 3], [3, 4], [1, 5]] : [[1, 13], [3, 12], [2, 11], [0, 1], [1, 10]];
    faces.forEach(([s, r], i) => this.add.image(W / 2 + (i - 2) * 70, py + 230 + Math.abs(i - 2) * 12, skin.cards.face(s as 0, r)).setScale(0.62).setAngle((i - 2) * 10));
    txt(this, W / 2, py + 400, t(`${mode}_d`), 34, '#e8ecf8', { wordWrap: { width: pw - 80 }, strokeThickness: 0 });

    let y = py + 500;
    const set = save.data.settings;
    const row = (label: string) => {
      txt(this, W / 2 - pw / 2 + 60, y, label, 36, '#ffffff').setOrigin(0, 0.5);
    };
    const seg = <T extends number>(vals: T[], cur: T, labels: string[], apply: (v: T) => void) => {
      const btns: Button[] = [];
      const bw = 130;
      vals.forEach((v, i) => {
        const b = new Button(this, W / 2 + pw / 2 - 60 - (vals.length - 1 - i) * (bw + 14) - bw / 2, y, { w: bw, h: 90, color: v === cur ? 'gold' : 'dark', label: labels[i], size: 30 }).onClick(() => {
          apply(v);
          save.save();
          btns.forEach((bb, j) => bb.setColor(j === i ? 'gold' : 'dark'));
        });
        btns.push(b);
      });
    };
    if (mode === 'klondike') {
      row(t('set_klDraw'));
      seg<1 | 3>([1, 3], set.klDraw, [t('draw1'), t('draw3')], (v) => (set.klDraw = v));
      y += 120;
      row(t('set_solvable'));
      new Toggle(this, W / 2 + pw / 2 - 120, y, set.solvable, (v) => {
        set.solvable = v;
        save.save();
      });
      y += 120;
    } else if (mode === 'spider') {
      row(t('set_spSuits'));
      seg<1 | 2 | 4>([1, 2, 4], set.spSuits, ['1 ♠', '2 ♠♥', '4 ♠♥♦♣'], (v) => (set.spSuits = v));
      y += 120;
    }
    if (mode !== 'blitz') {
      row(t('set_autoMove'));
      new Toggle(this, W / 2 + pw / 2 - 120, y, set.autoMove, (v) => {
        set.autoMove = v;
        save.save();
      });
      y += 120;
    }

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
    const sy = y + 20;
    g.fillStyle(UI.inkN, 0.35).fillRoundedRect(W / 2 - pw / 2 + 40, sy - 10, pw - 80, 150, 24);
    items.forEach(([k, v], i) => {
      const x = W / 2 + (i - (items.length - 1) / 2) * ((pw - 120) / items.length);
      txt(this, x, sy + 40, v, 42, UI.gold);
      txt(this, x, sy + 100, k, 24, '#ffffff', { strokeThickness: 0 });
    });

    const play = new Button(this, W / 2, py + ph - 110, { w: 520, h: 150, color: 'green', label: t('start'), size: 60 }).onClick(() => {
      audio.play('shuffle');
      if (mode === 'blitz') this.go('TriPeaks', { mode: 'blitz' });
      else this.go('Classic', { mode, newGame: true });
    });
    this.tweens.add({ targets: play, scale: 1.05, duration: 800, yoyo: true, repeat: -1 });
    this.setupScene();
  }
}
