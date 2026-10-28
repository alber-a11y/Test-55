import { audio } from '@shared/audio/audio';
import { t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { panel, progressBar, txt, UI } from '@shared/ui/widgets';
import { faceTex, PLAYER_FACES } from '../art/avatars';
import { LEAGUES, leagueOf, xpForLevel } from '../data/meta';
import { save, type ModeId } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';

const MODES: ModeId[] = ['career', 'quick', 'tournament', 'puzzle', 'daily'];

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
    panel(this, W / 2 - pw / 2, top, pw, 300);
    this.add.image(W / 2 - pw / 2 + 140, top + 150, faceTex(this.textures, `me${s.avatar}`, PLAYER_FACES[s.avatar % PLAYER_FACES.length], 'happy')).setDisplaySize(220, 220);
    txt(this, W / 2 - pw / 2 + 290, top + 70, `${t('lg_' + LEAGUES[leagueOf(s.rating)].id)} · ${t('rating')} ${s.rating}`, 38, UI.gold).setOrigin(0, 0.5);
    const bw = pw - 340;
    txt(this, W / 2 - pw / 2 + 290, top + 130, `${t('playerLevel')} ${s.plevel}`, 30, '#ffffff').setOrigin(0, 0.5);
    progressBar(this, W / 2 - pw / 2 + 290 + bw / 2, top + 185, bw, 36, s.xp / xpForLevel(s.plevel), 0x5ad17e);
    txt(this, W / 2 - pw / 2 + 290 + bw / 2, top + 185, `${s.xp}/${xpForLevel(s.plevel)} XP`, 24, '#ffffff');
    txt(this, W / 2 - pw / 2 + 290, top + 245, `${t('st_fools')}: ${s.totals.fools}   ${t('st_pogony')}: ${s.totals.pogony}`, 28, '#ffffff').setOrigin(0, 0.5);
    const ay = top + 360;
    txt(this, W / 2, ay, t('avatar'), 36, '#ffffff');
    const cols = this.portrait ? 6 : 12;
    const as = this.portrait ? 140 : 120;
    PLAYER_FACES.forEach((f, i) => {
      const x = W / 2 + ((i % cols) - (cols - 1) / 2) * (as + 14);
      const y = ay + 100 + Math.floor(i / cols) * (as + 14);
      const img = this.add.image(x, y, faceTex(this.textures, `me${i}`, f)).setDisplaySize(as, as).setInteractive({ useHandCursor: true });
      if (i === s.avatar) this.add.circle(x, y, as / 2 + 8).setStrokeStyle(8, 0xffd166);
      img.on('pointerup', () => {
        s.avatar = i;
        save.save();
        audio.play('click');
        this.scene.restart(data);
      });
    });
    const sy = ay + 100 + Math.ceil(12 / cols) * (as + 14) + 20;
    const rh = this.portrait ? 92 : 64;
    panel(this, W / 2 - pw / 2, sy, pw, rh * (MODES.length + 1) + 30);
    const colsX = [0.04, 0.45, 0.62, 0.8].map((f) => W / 2 - pw / 2 + pw * f);
    [t('statistics'), t('st_played'), t('st_won'), t('st_streak')].forEach((h, i) => txt(this, colsX[i], sy + 45, h, 24, UI.gold).setOrigin(i === 0 ? 0 : 0.5, 0.5));
    MODES.forEach((m, r) => {
      const st = s.stats[m];
      const y = sy + 45 + (r + 1) * rh;
      const name = m === 'puzzle' ? t('puzzles') : m === 'daily' ? t('dailyTable') : t(m);
      [name, String(st.played), String(st.won), String(st.bestStreak)].forEach((v, i) => txt(this, colsX[i], y, v, 28, '#ffffff').setOrigin(i === 0 ? 0 : 0.5, 0.5));
    });
    this.setupScene();
  }
}
