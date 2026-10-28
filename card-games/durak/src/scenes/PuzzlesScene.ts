import { audio } from '@shared/audio/audio';
import { t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Scroller } from '@shared/ui/scroller';
import { Button, txt, UI } from '@shared/ui/widgets';
import { DEFAULT_RULES } from '../logic/durak';
import { puzzle } from '../logic/puzzles';
import { save } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';
import { faceFromSeed } from '../art/faces';
import { PROFILES } from '../logic/ai';

/** Endless list of endgame puzzles. */
export class PuzzlesScene extends BaseScene {
  constructor() {
    super('Puzzles');
  }

  create(data: { start?: number }): void {
    menuBackground(this, 3);
    topBar(this, t('puzzles'), () => this.go('Menu', {}, 'puzzles_back'));
    const W = this.W;
    const solved = save.data.puzzles.solved;
    txt(this, W / 2, 215, `${t('puzzle_goal')} · ${t('puzzle_hint')}`, 26, '#e8ecf8', { wordWrap: { width: W - 60 }, strokeThickness: 0 });
    const top = 270;
    const sc = new Scroller(this, 0, top, W, this.H - top);
    const cols = this.portrait ? 4 : 8;
    const cell = Math.min(220, (W - 80) / cols - 20);
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
    const focus = Math.max(0, Math.floor(((data.start ?? solved + 1) - 1) / cols) * (cell + 20) - 200);
    sc.setPos(focus);
    this.setupScene();
  }

  private start(n: number): void {
    audio.play('shuffle');
    const tt = txt(this, this.W / 2, this.H / 2, '…', 80, '#ffffff').setDepth(1000);
    void tt;
    this.time.delayedCall(30, () => {
      const p = puzzle(n);
      this.go('Game', {
        mode: 'puzzle',
        rules: { ...DEFAULT_RULES, players: 2, firstBoutFive: false },
        opponents: [{ name: t('puzzleN', { n }), face: faceFromSeed(4242 + n), ai: PROFILES.king, trait: 'calm', boss: false }],
        loc: 3,
        puzzle: { n, hands: p.hands, trump: p.trump, attacker: p.attacker },
      });
    });
    void UI;
  }
}
