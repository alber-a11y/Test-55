import { t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Scroller } from '@shared/ui/scroller';
import { panel, txt } from '@shared/ui/widgets';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';
import { skin } from '../skin';

export class RulesScene extends BaseScene {
  constructor() {
    super('Rules');
  }

  create(data: { from?: string }): void {
    menuBackground(this);
    topBar(this, t('rules'), () => this.go(data.from ?? 'Menu', {}, 'rules_back'), { coins: false });
    const W = this.W;
    const H = this.H;
    const pw = Math.min(W - 60, 960);
    const py = 190;
    panel(this, W / 2 - pw / 2, py, pw, H - py - 40);
    const sc = new Scroller(this, 0, py + 20, W, H - py - 80);
    [[0, 6], [1, 13], [2, 14]].forEach(([s, r], i) => sc.content.add(this.add.image(W / 2 + (i - 1) * 100, 120 + Math.abs(i - 1) * 10, skin.face(s, r)).setScale(0.6).setAngle((i - 1) * 10)));
    const body = txt(this, W / 2, 260, [t('r_main'), t('r_transfer_t'), t('r_teams_t'), t('r_cheat_t')].join('\n\n'), this.portrait ? 34 : 30, '#ffffff', { wordWrap: { width: pw - 90 }, align: 'left', strokeThickness: 0, lineSpacing: 8 }).setOrigin(0.5, 0);
    sc.content.add(body);
    sc.setExtent(body.height + 320);
    this.setupScene();
  }
}
