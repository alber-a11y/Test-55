import { audio } from '@shared/audio/audio';
import { t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Scroller } from '@shared/ui/scroller';
import { Button, toast, txt, UI } from '@shared/ui/widgets';
import { MODES } from '../data/meta';
import { modeOpen } from '../progress';
import { save, type ModeId } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar, watchAd } from '../ui/common';

/** Scene (and data) that runs a mode. */
export function modeTarget(id: ModeId): { key: string; data: any } {
  switch (id) {
    case 'daily':
      return { key: 'Daily', data: {} };
    case 'etude':
      return { key: 'Etudes', data: {} };
    case 'cup':
      return { key: 'Cup', data: {} };
    default:
      return { key: 'QuickSetup', data: { mode: id } };
  }
}

/** All game modes; locked ones open with route progress or for one try with a rewarded ad. */
export class ModesScene extends BaseScene {
  constructor() {
    super('Modes');
  }

  create(data: { focus?: ModeId }): void {
    menuBackground(this, 3);
    topBar(this, t('modes'), () => this.go('Menu', {}, 'modes_back'));
    const W = this.W;
    const top = 180;
    const sc = new Scroller(this, 0, top, W, this.H - top);
    const port = this.portrait;
    const cols = port ? 1 : 2;
    const rw = port ? Math.min(W - 60, 980) : Math.min((W - 100) / 2, 860);
    const rh = 230;
    MODES.forEach((md, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = cols === 1 ? W / 2 : W / 2 + (col === 0 ? -1 : 1) * (rw / 2 + 15);
      const y = 20 + row * (rh + 24) + rh / 2;
      const open = modeOpen(md.id, md.unlock);
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      g.fillStyle(UI.inkN, 0.92).fillRoundedRect(-rw / 2 - 4, -rh / 2 - 4, rw + 8, rh + 10, 28);
      g.fillStyle(open ? md.color : 0x2b3350, 1).fillRoundedRect(-rw / 2, -rh / 2, rw, rh, 26);
      g.lineStyle(3, data.focus === md.id ? 0xffd166 : 0xc9a55c, data.focus === md.id ? 1 : 0.5).strokeRoundedRect(-rw / 2 + 6, -rh / 2 + 6, rw - 12, rh - 12, 22);
      c.add(g);
      c.add(this.add.image(-rw / 2 + 95, 0, open ? `i_${md.icon}` : 'i_lock').setDisplaySize(120, 120));
      c.add(txt(this, -rw / 2 + 180, -60, t(md.id), 38, '#ffffff').setOrigin(0, 0.5));
      c.add(txt(this, -rw / 2 + 180, 0, t(`${md.id}_d`), 24, '#eef2ff', { strokeThickness: 0, wordWrap: { width: rw - 480 } }).setOrigin(0, 0.5));
      const st = save.data.stats[md.id];
      if (open) c.add(txt(this, -rw / 2 + 180, 70, t('modeStats', { p: st.played, w: st.won }), 22, UI.gold).setOrigin(0, 0.5));
      else c.add(txt(this, -rw / 2 + 180, 70, t('unlockAt', { n: md.unlock + 1 }), 22, '#ffd6a5').setOrigin(0, 0.5));
      let b: Button;
      if (open)
        b = new Button(this, rw / 2 - 140, 0, { w: 220, h: 110, color: 'green', label: t('play'), size: 36 }).onClick(() => {
          audio.play('click');
          const tg = modeTarget(md.id);
          this.go(tg.key, tg.data);
        });
      else
        b = new Button(this, rw / 2 - 140, 0, { w: 220, h: 110, color: 'purple', label: t('tryOnce'), size: 28, ad: true }).onClick(() =>
          watchAd(this, `mode_${md.id}`, () => {
            save.data.trial.push(md.id);
            save.save();
            toast(this, t('modeOpened'), '#9ff0c8');
            const tg = modeTarget(md.id);
            this.go(tg.key, tg.data);
          }),
        );
      b.hitGuard = (p) => sc.inView(p);
      c.add(b);
      sc.content.add(c);
    });
    sc.setExtent(Math.ceil(MODES.length / cols) * (rh + 24) + 60);
    this.setupScene();
  }
}
