import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { dayKey, hashStr } from '@shared/core/time';
import { BaseScene } from '@shared/ui/base';
import { Button, panel, ribbon, txt, UI } from '@shared/ui/widgets';
import { faceTex } from '../art/avatars';
import { randomOpponents } from '../data/quick';
import { WORLDS } from '../data/route';
import { DEFAULT_RULES } from '../logic/thousand';
import { save } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';

export const DAILY_DEALS = 3;

/** The same three deals for every player each day: score as many points as possible. */
export class DailyScene extends BaseScene {
  constructor() {
    super('Daily');
  }

  create(): void {
    const day = dayKey();
    const seed = hashStr('deal:' + day);
    const world = seed % WORLDS.length;
    const opps = randomOpponents(3, seed, getLang());
    menuBackground(this, world);
    topBar(this, t('daily'), () => this.go('Modes', {}, 'daily_back'));
    const W = this.W;
    const port = this.portrait;
    const pw = Math.min(W - 60, 940);
    const py = port ? 260 : 180;
    panel(this, W / 2 - pw / 2, py, pw, port ? 1220 : 860);
    ribbon(this, W / 2, py, 560, day, 0xa3213a);
    txt(this, W / 2, py + 120, t('daily_d'), 30, '#ffffff', { wordWrap: { width: pw - 80 } });
    opps.forEach((o, i) => {
      const x = W / 2 + (i - 0.5) * 260;
      this.add.image(x, py + 300, faceTex(this.textures, `daily_${i}_${o.name}`, o.face, 'smug')).setDisplaySize(180, 180);
      txt(this, x, py + 420, o.name, 30, '#ffffff');
    });
    const best = save.data.dailyDeal[day];
    txt(this, W / 2, py + 500, best !== undefined ? t('dailyBest', { n: best }) : t('dailyFirst'), 32, best !== undefined ? '#9ff0c8' : UI.gold);
    // Last 7 days
    const days: string[] = [];
    for (let k = 6; k >= 0; k--) {
      const d = new Date();
      d.setDate(d.getDate() - k);
      days.push(dayKey(d));
    }
    const cw = Math.min(118, (pw - 60) / 7);
    days.forEach((d, i) => {
      const x = W / 2 + (i - 3) * cw;
      const v = save.data.dailyDeal[d];
      const g = this.add.graphics();
      g.fillStyle(v !== undefined ? 0x2c6e4a : 0x283a63, 1).fillRoundedRect(x - cw / 2 + 6, py + 560, cw - 12, 110, 16);
      txt(this, x, py + 590, d.slice(8), 24, '#ffffff');
      txt(this, x, py + 640, v !== undefined ? String(v) : '—', 26, UI.gold);
    });
    new Button(this, W / 2, py + (port ? 1100 : 770), { w: 520, h: 140, color: 'green', label: t('play'), sub: best === undefined ? '×3' : '', size: 56 }).onClick(() => {
      audio.play('whistle');
      this.go('Game', { mode: 'daily', rules: { ...DEFAULT_RULES, barrel: false }, opponents: opps, world, seed, dealsLimit: DAILY_DEALS, ctx: { day } });
    });
    this.setupScene();
  }
}
