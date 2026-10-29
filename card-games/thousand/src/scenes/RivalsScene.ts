import { getLang, t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { txt, UI } from '@shared/ui/widgets';
import { faceTex } from '../art/avatars';
import { BOSS_FACES } from '../data/opponents';
import { WORLDS } from '../data/route';
import { save } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';

/** The eight route bosses and their trophies. */
export class RivalsScene extends BaseScene {
  constructor() {
    super('Rivals');
  }

  create(data: { from?: string }): void {
    menuBackground(this, 7);
    topBar(this, t('rivals'), () => this.go(data.from ?? 'Menu', {}, 'rivals_back'));
    const W = this.W;
    const H = this.H;
    txt(this, W / 2, 210, t('rivals_d'), 28, '#e8ecf8', { strokeThickness: 0, wordWrap: { width: W - 80 } });
    const cols = this.portrait ? 2 : 4;
    const cw = Math.min(460, (W - 80) / cols - 20);
    const ch = this.portrait ? Math.min(380, (H - 320) / 4 - 20) : (H - 330) / 2 - 20;
    WORLDS.forEach((wd, i) => {
      const x = W / 2 + ((i % cols) - (cols - 1) / 2) * (cw + 20);
      const y = 280 + Math.floor(i / cols) * (ch + 20) + ch / 2;
      const has = save.data.route.trophies.includes(i);
      const g = this.add.graphics();
      g.fillStyle(UI.inkN, 0.9).fillRoundedRect(x - cw / 2 - 4, y - ch / 2 - 4, cw + 8, ch + 8, 26);
      g.fillStyle(has ? 0x5a4a1c : 0x283a63, 1).fillRoundedRect(x - cw / 2, y - ch / 2, cw, ch, 24);
      const fs = Math.min(150, ch * 0.45);
      this.add.image(x - cw * 0.22, y - ch * 0.12, faceTex(this.textures, `boss_${i}`, BOSS_FACES[i], has ? 'sad' : 'smug')).setDisplaySize(fs, fs).setAlpha(has ? 1 : 0.7);
      const tr = this.add.image(x + cw * 0.22, y - ch * 0.12, has ? 'i_trophy' : 'i_lock').setDisplaySize(fs * 0.8, fs * 0.8);
      if (!has) tr.setAlpha(0.6);
      txt(this, x, y + ch * 0.22, getLang() === 'en' ? wd.en : wd.ru, 32, has ? UI.gold : '#ffffff');
      const bn = txt(this, x, y + ch * 0.36, wd.boss[getLang()], 24, '#cfd6e6', { strokeThickness: 0 });
      if (bn.width > cw - 20) bn.setScale((cw - 20) / bn.width);
    });
    this.setupScene();
  }
}
