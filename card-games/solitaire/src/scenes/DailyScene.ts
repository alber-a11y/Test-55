import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { dayKey } from '@shared/core/time';
import { BaseScene } from '@shared/ui/base';
import { Button, panel, progressBar, txt, UI } from '@shared/ui/widgets';
import { findSolvableKlondike } from '../logic/klondike';
import { dailySeed } from '../progress';
import { save } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar, watchAd } from '../ui/common';

const MODES = ['klondike', 'tripeaks', 'spider', 'freecell'] as const;
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WD_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function dailyMode(day: string): (typeof MODES)[number] {
  return MODES[dailySeed(day) % MODES.length];
}

/** Monthly calendar of daily deals; missed days can be opened with a rewarded ad. */
export class DailyScene extends BaseScene {
  constructor() {
    super('Daily');
  }

  create(data: { from?: string }): void {
    menuBackground(this);
    topBar(this, t('daily'), () => this.go('Menu', {}, 'daily_back'));
    const W = this.W;
    const H = this.H;
    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth();
    const days = new Date(y, mo + 1, 0).getDate();
    const first = (new Date(y, mo, 1).getDay() + 6) % 7;
    const today = dayKey(now);
    const done = save.data.dailyCh;
    const monthDone = done.filter((d) => d.startsWith(`${y}-${String(mo + 1).padStart(2, '0')}`)).length;

    const pw = Math.min(W - 40, 1000);
    const shift = this.portrait ? 0 : -260;
    const CX = W / 2 + shift;
    const py = this.portrait ? 200 : 170;
    const cell = Math.min((pw - 60) / 7, this.portrait ? 130 : 95);
    const ph = 260 + 6 * (cell + 8) + (this.portrait ? 300 : 40);
    panel(this, CX - pw / 2, py, pw, Math.min(ph, H - py - 30));
    txt(this, CX, py + 60, `${(getLang() === 'en' ? MONTHS_EN : MONTHS_RU)[mo]} ${y}`, 48, UI.gold);
    this.add.image(CX - 300, py + 150, 'i_trophy').setDisplaySize(110, 110);
    progressBar(this, CX + 60, py + 150, 480, 40, monthDone / days, 0xffc531);
    txt(this, CX + 60, py + 150, t('monthTrophy', { n: monthDone, m: days }), 26, '#ffffff');

    const gx = CX - (7 * (cell + 8)) / 2 + cell / 2;
    const gy = py + 250;
    (getLang() === 'en' ? WD_EN : WD_RU).forEach((d, i) => txt(this, gx + i * (cell + 8), gy, d, 26, '#cfd6e6'));
    for (let d = 1; d <= days; d++) {
      const idx = first + d - 1;
      const cx = gx + (idx % 7) * (cell + 8);
      const cy = gy + 60 + Math.floor(idx / 7) * (cell + 8) + cell / 2 - 20;
      const key = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isDone = done.includes(key);
      const isToday = key === today;
      const future = key > today;
      const unlocked = isToday || (save.data.adProgress[`daily:${key}`] ?? 0) > 0;
      const g = this.add.graphics();
      g.fillStyle(isDone ? 0x2c9a52 : isToday ? 0xe09f1f : future ? 0x1f2b48 : 0x34466e, 1).fillRoundedRect(cx - cell / 2, cy - cell / 2, cell, cell, 18);
      if (isToday) g.lineStyle(6, 0xffffff, 1).strokeRoundedRect(cx - cell / 2, cy - cell / 2, cell, cell, 18);
      txt(this, cx, cy - (isDone ? 14 : 0), String(d), cell * 0.36, future ? '#6b7690' : '#ffffff');
      if (isDone) this.add.image(cx, cy + cell * 0.24, 'i_crown').setDisplaySize(cell * 0.4, cell * 0.4);
      else if (!future && !unlocked) this.add.image(cx + cell * 0.28, cy - cell * 0.28, 'i_lock').setDisplaySize(cell * 0.32, cell * 0.32);
      if (future) continue;
      const z = this.add.zone(cx, cy, cell, cell).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => {
        audio.play('click');
        if (isDone) return;
        if (!unlocked)
          void watchAd(this, 'daily_missed', () => {
            save.data.adProgress[`daily:${key}`] = 1;
            save.save();
            this.start(key);
          });
        else this.start(key);
      });
    }
    // Today's card
    {
      const bx = this.portrait ? W / 2 : W - 330;
      const by = this.portrait ? gy + 60 + 6 * (cell + 8) + 60 : H / 2 - 60;
      const m = dailyMode(today);
      txt(this, bx, by, t('dailyMode', { m: m === 'tripeaks' ? t('adventure') : t(m) }), 36, '#ffffff');
      const b = new Button(this, bx, by + 120, { w: 520, h: 140, color: done.includes(today) ? 'grey' : 'green', label: done.includes(today) ? t('dailyDone') : t('play'), size: 52 });
      if (!done.includes(today)) b.onClick(() => this.start(today));
    }
    void data;
    this.setupScene();
  }

  private start(day: string): void {
    const mode = dailyMode(day);
    const seed = dailySeed(day);
    if (mode === 'tripeaks') this.go('TriPeaks', { mode: 'daily', level: 20 + (seed % 180), day });
    else if (mode === 'klondike') this.go('Classic', { mode: 'klondike', seed: findSolvableKlondike(seed, 1), daily: day, newGame: true });
    else if (mode === 'spider') this.go('Classic', { mode: 'spider', seed, daily: day, newGame: true });
    else this.go('Classic', { mode: 'freecell', seed: 1 + (seed % 32000), daily: day, newGame: true });
  }
}
