import { audio } from '@shared/audio/audio';
import { t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { panel, progressBar, txt, UI } from '@shared/ui/widgets';
import { faceTex, PLAYER_FACES } from '../art/avatars';
import { RANKS, rankOf, xpForLevel } from '../data/meta';
import { save, type ModeId } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';

const MODES: ModeId[] = ['career', 'quick', 'blitz', 'dark', 'fever', 'cup', 'daily', 'etude'];

export class ProfileScene extends BaseScene {
  constructor() {
    super('Profile');
  }

  create(data: { from?: string }): void {
    menuBackground(this);
    topBar(this, t('profile'), () => this.go(data.from ?? 'Menu', {}, 'profile_back'));
    const W = this.W;
    const s = save.data;
    const port = this.portrait;
    // Portrait stacks everything; landscape puts the statistics in a right-hand column.
    const pw = port ? Math.min(W - 60, 980) : Math.min((W - 90) / 2, 900);
    const lx = port ? W / 2 - pw / 2 : W / 2 - pw - 15;
    const top = port ? 200 : 170;
    panel(this, lx, top, pw, 300);
    this.add.image(lx + 140, top + 150, faceTex(this.textures, `me${s.avatar}`, PLAYER_FACES[s.avatar % PLAYER_FACES.length], 'happy')).setDisplaySize(220, 220);
    const rk = txt(this, lx + 290, top + 70, `${t('rk_' + RANKS[rankOf(s.rating)].id)} · ${t('rating')} ${s.rating}`, 36, UI.gold).setOrigin(0, 0.5);
    if (rk.width > pw - 320) rk.setScale((pw - 320) / rk.width);
    const bw = pw - 340;
    txt(this, lx + 290, top + 130, `${t('playerLevel')} ${s.plevel}`, 30, '#ffffff').setOrigin(0, 0.5);
    progressBar(this, lx + 290 + bw / 2, top + 185, bw, 36, s.xp / xpForLevel(s.plevel), 0x5ad17e);
    txt(this, lx + 290 + bw / 2, top + 185, `${s.xp}/${xpForLevel(s.plevel)} XP`, 24, '#ffffff');
    const st1 = txt(this, lx + 290, top + 245, `${t('st_contracts')}: ${s.totals.contractsMade}/${s.totals.contracts}   ${t('st_best')}: ${s.totals.bestContract}   ${t('st_marriages')}: ${s.totals.marriages}`, 26, '#ffffff').setOrigin(0, 0.5);
    if (st1.width > pw - 310) st1.setScale((pw - 310) / st1.width);
    const ay = top + 360;
    const acx = lx + pw / 2;
    txt(this, acx, ay, t('avatar'), 36, '#ffffff');
    const cols = 6;
    const as = Math.min(140, (pw - 40) / cols - 14);
    PLAYER_FACES.forEach((f, i) => {
      const x = acx + ((i % cols) - (cols - 1) / 2) * (as + 14);
      const y = ay + 40 + as / 2 + Math.floor(i / cols) * (as + 14);
      const img = this.add.image(x, y, faceTex(this.textures, `me${i}`, f)).setDisplaySize(as, as).setInteractive({ useHandCursor: true });
      if (i === s.avatar) this.add.circle(x, y, as / 2 + 8).setStrokeStyle(8, 0xffd166);
      img.on('pointerup', () => {
        s.avatar = i;
        save.save();
        audio.play('click');
        this.scene.restart(data);
      });
    });
    const sx = port ? lx : W / 2 + 15;
    const sy = port ? ay + 40 + 2 * (as + 14) + 30 : top;
    const rh = port ? 84 : Math.min(80, (this.H - top - 60) / (MODES.length + 1));
    panel(this, sx, sy, pw, rh * (MODES.length + 1) + 30);
    const colsX = [0.05, 0.55, 0.72, 0.88].map((f) => sx + pw * f);
    [t('statistics'), t('st_played'), t('st_won'), t('st_streak')].forEach((h, i) => txt(this, colsX[i], sy + 45, h, 24, UI.gold).setOrigin(i === 0 ? 0 : 0.5, 0.5));
    MODES.forEach((m, r) => {
      const st = s.stats[m];
      const y = sy + 45 + (r + 1) * rh;
      const nm = txt(this, colsX[0], y, t(m), 26, '#ffffff').setOrigin(0, 0.5);
      if (nm.width > pw * 0.47) nm.setScale((pw * 0.47) / nm.width);
      [String(st.played), String(st.won), String(st.bestStreak)].forEach((v, i) => txt(this, colsX[i + 1], y, v, 28, '#ffffff'));
    });
    this.setupScene();
  }
}
