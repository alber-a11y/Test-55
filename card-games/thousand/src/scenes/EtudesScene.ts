import { audio } from '@shared/audio/audio';
import { t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Scroller } from '@shared/ui/scroller';
import { Button, txt } from '@shared/ui/widgets';
import { faceFromSeed } from '../art/faces';
import { PROFILES } from '../logic/ai';
import { DEFAULT_RULES } from '../logic/thousand';
import { save } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';

/** Endless list of endgame etudes. */
export class EtudesScene extends BaseScene {
  constructor() {
    super('Etudes');
  }

  create(data: { start?: number }): void {
    menuBackground(this, 2);
    topBar(this, t('etude'), () => this.go('Modes', {}, 'etudes_back'));
    const W = this.W;
    const solved = save.data.etudes.solved;
    txt(this, W / 2, 215, t('etude_list'), 26, '#e8ecf8', { wordWrap: { width: W - 60 }, strokeThickness: 0 });
    const top = 270;
    const sc = new Scroller(this, 0, top, W, this.H - top);
    const cols = this.portrait ? 4 : 8;
    const cell = Math.min(210, (W - 80) / cols - 20);
    const count = solved + 40;
    for (let i = 1; i <= count; i++) {
      const col = (i - 1) % cols;
      const row = Math.floor((i - 1) / cols);
      const x = W / 2 + (col - (cols - 1) / 2) * (cell + 20);
      const y = 30 + row * (cell + 20) + cell / 2;
      const done = i <= solved;
      const open = i <= solved + 1;
      const b = new Button(this, x, y, { w: cell, h: cell, color: done ? 'gold' : open ? 'green' : 'dark', label: open ? String(i) : '', size: 48, icon: open ? undefined : 'i_lock', iconSize: cell * 0.4 });
      if (done) b.setBadge('✓');
      b.hitGuard = (p) => sc.inView(p);
      if (open) b.onClick(() => this.start(i));
      sc.content.add(b);
    }
    sc.setExtent(Math.ceil(count / cols) * (cell + 20) + 60);
    sc.setPos(Math.max(0, Math.floor(((data.start ?? solved + 1) - 1) / cols) * (cell + 20) - 200));
    this.setupScene();
  }

  private start(n: number): void {
    audio.play('shuffle');
    txt(this, this.W / 2, this.H / 2, '…', 80, '#ffffff').setDepth(1000);
    this.time.delayedCall(30, () =>
      this.go('Game', {
        mode: 'etude',
        rules: { ...DEFAULT_RULES },
        opponents: [1, 2].map((k) => ({ name: t('defender', { n: k }), face: faceFromSeed(4242 + n * 3 + k), ai: PROFILES.king, trait: 'calm', boss: false })),
        world: 2,
        etude: n,
      }),
    );
  }
}
