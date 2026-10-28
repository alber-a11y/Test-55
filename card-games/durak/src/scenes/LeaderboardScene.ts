import { t } from '@shared/core/i18n';
import { platform } from '@shared/platform/platform';
import { BaseScene } from '@shared/ui/base';
import { panel, txt, UI } from '@shared/ui/widgets';
import { save } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';

/** Yandex leaderboards "levels" and "blitz" (only the player's own best without a platform). */
export class LeaderboardScene extends BaseScene {
  constructor() {
    super('Leaderboard');
  }

  create(data: { from?: string; board?: 'rating' }): void {
    const board = data.board ?? 'rating';
    menuBackground(this);
    topBar(this, t('leaders'), () => this.go(data.from ?? 'Menu', {}, 'leaders_back'));
    const W = this.W;
    const H = this.H;
    txt(this, W / 2, 240, t('lb_rating'), 40, UI.gold);
    const pw = Math.min(W - 60, 940);
    const py = 330;
    const ph = H - py - 60;
    panel(this, W / 2 - pw / 2, py, pw, ph);
    const loading = txt(this, W / 2, py + 120, '…', 50, '#ffffff');
    // Make sure the player's own score is submitted first.
    const own = save.data.rating;
    void platform
      .setScore(board, own)
      .then(() => platform.getEntries(board))
      .then((list) => {
        if (!this.sys.isActive()) return;
        loading.destroy();
        if (!list.length) {
          txt(this, W / 2, py + 160, t('lb_empty'), 36, '#ffffff', { wordWrap: { width: pw - 80 } });
          txt(this, W / 2, py + 300, `${t('you')}: ${own}`, 48, UI.gold);
          return;
        }
        const rh = Math.min(110, (ph - 60) / Math.max(1, list.length));
        list.forEach((e, i) => {
          const y = py + 50 + i * rh + rh / 2;
          const g = this.add.graphics();
          g.fillStyle(e.isPlayer ? 0x2c9a52 : 0x283a63, 1).fillRoundedRect(W / 2 - pw / 2 + 30, y - rh / 2 + 6, pw - 60, rh - 12, 18);
          const medal = e.rank <= 3 ? ['#ffc531', '#d6dde9', '#e09253'][e.rank - 1] : '#ffffff';
          txt(this, W / 2 - pw / 2 + 90, y, `#${e.rank}`, 34, medal);
          txt(this, W / 2 - pw / 2 + 170, y, e.isPlayer ? t('you') : e.name, 32, '#ffffff').setOrigin(0, 0.5);
          txt(this, W / 2 + pw / 2 - 70, y, String(e.score), 34, UI.gold).setOrigin(1, 0.5);
        });
      });
    this.setupScene();
  }
}
