import { audio } from '@shared/audio/audio';
import { t } from '@shared/core/i18n';
import { formatTime } from '@shared/core/time';
import { BaseScene } from '@shared/ui/base';
import { panel, progressBar, txt, UI } from '@shared/ui/widgets';
import { xpForLevel } from '../data/meta';
import { save, type ModeId } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';

const MODES: ModeId[] = ['tripeaks', 'klondike', 'spider', 'freecell', 'blitz', 'daily'];

export class ProfileScene extends BaseScene {
  constructor() {
    super('Profile');
  }

  create(data: { from?: string }): void {
    menuBackground(this);
    topBar(this, t('profile'), () => this.go(data.from ?? 'Menu', {}, 'profile_back'));
    const W = this.W;
    const s = save.data;
    const pw = Math.min(W - 60, 980);
    const top = this.portrait ? 200 : 170;
    // Avatar + level
    panel(this, W / 2 - pw / 2, top, pw, 300);
    this.add.image(W / 2 - pw / 2 + 140, top + 150, `avatar_${s.avatar}`).setDisplaySize(220, 220);
    txt(this, W / 2 - pw / 2 + 290, top + 90, `${t('playerLevel')} ${s.plevel}`, 44, UI.gold).setOrigin(0, 0.5);
    const bw = pw - 340;
    progressBar(this, W / 2 - pw / 2 + 290 + bw / 2, top + 160, bw, 40, s.xp / xpForLevel(s.plevel), 0x5ad17e);
    txt(this, W / 2 - pw / 2 + 290 + bw / 2, top + 160, `${s.xp}/${xpForLevel(s.plevel)} XP`, 26, '#ffffff');
    txt(this, W / 2 - pw / 2 + 290, top + 230, `${t('levelN', { n: s.adv.max - 1 })} ✓   ★ ${Object.values(s.adv.stars).reduce((a, b) => a + b, 0)}`, 32, '#ffffff').setOrigin(0, 0.5);

    // Avatar picker
    const ay = top + 360;
    txt(this, W / 2, ay, t('avatar'), 36, '#ffffff');
    const cols = this.portrait ? 6 : 12;
    const as = this.portrait ? 140 : 120;
    for (let i = 0; i < 12; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = W / 2 + (col - (cols - 1) / 2) * (as + 14);
      const y = ay + 100 + row * (as + 14);
      const img = this.add.image(x, y, `avatar_${i}`).setDisplaySize(as, as).setInteractive({ useHandCursor: true });
      if (i === s.avatar) this.add.circle(x, y, as / 2 + 8).setStrokeStyle(8, 0xffd166);
      img.on('pointerup', () => {
        s.avatar = i;
        save.save();
        audio.play('click');
        this.scene.restart(data);
      });
    }
    // Stats table
    const sy = ay + 100 + Math.ceil(12 / cols) * (as + 14) + 20;
    const rows = MODES.length;
    const rh = this.portrait ? 92 : 64;
    panel(this, W / 2 - pw / 2, sy, pw, rh * (rows + 1) + 30);
    const colsX = [0.04, 0.42, 0.58, 0.74, 0.88].map((f) => W / 2 - pw / 2 + pw * f);
    const head = [t('statistics'), t('st_played'), t('st_won'), t('st_best'), t('st_streak')];
    head.forEach((h, i) => txt(this, colsX[i], sy + 45, h, 24, UI.gold).setOrigin(i === 0 ? 0 : 0.5, 0.5));
    MODES.forEach((m, r) => {
      const st = s.stats[m];
      const y = sy + 45 + (r + 1) * rh;
      const name = m === 'tripeaks' ? t('adventure') : t(m);
      const best = m === 'blitz' || m === 'tripeaks' ? String(st.best || '—') : st.bestTime ? formatTime(st.bestTime) : '—';
      [name, String(st.played), String(st.won), best, String(st.bestStreak)].forEach((v, i) => txt(this, colsX[i], y, v, 28, '#ffffff').setOrigin(i === 0 ? 0 : 0.5, 0.5));
    });
    this.setupScene();
  }
}
