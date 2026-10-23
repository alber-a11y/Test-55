import { t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Button, panel, txt } from '@shared/ui/widgets';
import { skin } from '../skin';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';

const MODES = ['tripeaks', 'klondike', 'spider', 'freecell', 'blitz'] as const;

export class RulesScene extends BaseScene {
  constructor() {
    super('Rules');
  }

  create(data: { from?: string; mode?: (typeof MODES)[number] }): void {
    const mode = data.mode ?? 'tripeaks';
    menuBackground(this);
    topBar(this, t('rules'), () => this.go(data.from ?? 'Menu', {}, 'rules_back'), { coins: false });
    const W = this.W;
    const H = this.H;
    const bw = Math.min(200, (W - 40) / MODES.length - 10);
    MODES.forEach((m, i) =>
      new Button(this, W / 2 + (i - (MODES.length - 1) / 2) * (bw + 10), 230, { w: bw, h: 90, color: m === mode ? 'gold' : 'dark', label: m === 'tripeaks' ? t('adventure') : t(m), size: 24 }).onClick(() =>
        this.scene.restart({ ...data, mode: m }),
      ),
    );
    const pw = Math.min(W - 60, 940);
    const py = 320;
    const ph = H - py - 60;
    panel(this, W / 2 - pw / 2, py, pw, ph);
    const demo: [number, number][] = mode === 'tripeaks' || mode === 'blitz' ? [[0, 6], [1, 7], [2, 8]] : mode === 'spider' ? [[0, 13], [0, 12], [0, 11]] : [[0, 13], [1, 12], [3, 11]];
    demo.forEach(([s, r], i) => this.add.image(W / 2 + (i - 1) * 90, py + 150 + i * 30, skin.cards.face(s as 0, r)).setScale(this.portrait ? 0.6 : 0.5));
    txt(this, W / 2, py + 340, t(`r_${mode}`), this.portrait ? 38 : 30, '#ffffff', { wordWrap: { width: pw - 90 }, align: 'left', strokeThickness: 0, lineSpacing: 10 }).setOrigin(0.5, 0);
    this.setupScene();
  }
}
