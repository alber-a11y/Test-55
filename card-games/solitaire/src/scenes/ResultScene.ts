import Phaser from 'phaser';
import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { formatTime } from '@shared/core/time';
import { BaseScene } from '@shared/ui/base';
import { openModal } from '@shared/ui/modal';
import { Button, panel, ribbon, txt, UI } from '@shared/ui/widgets';
import { renderPostcard } from '../art/landmarks';
import { CITIES } from '../data/cities';
import type { Reward } from '../data/meta';
import { addXp, checkSkinUnlocks, grant, recordAdventureWin, recordGame, track } from '../progress';
import { save, type ModeId } from '../save';
import { menuBackground } from '../ui/bg';
import { rewardRow, watchAd } from '../ui/common';

export interface ResultData {
  mode: ModeId;
  won: boolean;
  level?: number;
  day?: string;
  stars?: number;
  score?: number;
  bonusCoins?: number;
  combo?: number;
  time?: number;
  moves?: number;
  exploded?: boolean;
  canExtend?: boolean;
  blitzState?: { timeLeft: number; extended?: boolean };
  suits?: number;
  draw?: number;
  /** Set once results were recorded (resize restarts must not double count). */
  recorded?: { reward: Reward; postcard: string | null; cityDone: number | null; levels: number; record: boolean };
}

interface Next {
  key: string;
  data: any;
  ad?: string;
}

export class ResultScene extends BaseScene {
  private d!: ResultData;
  private claimed = false;

  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    this.d = data;
    this.claimed = false;
    const W = this.W;
    const H = this.H;
    menuBackground(this);
    if (!data.recorded) data.recorded = this.record();
    const rec = data.recorded;
    const won = data.won;
    if (won) audio.playMusic('menu');

    const port = this.portrait;
    const pw = Math.min(W - 60, port ? 920 : 1120);
    const ph = port ? 1180 : 900;
    const py = Math.max(port ? 170 : 110, (H - ph) / 2);
    panel(this, W / 2 - pw / 2, py, pw, ph);
    const title = data.mode === 'blitz' ? t('timeUp') : won ? t('victory') : data.exploded ? t('exploded') : t('defeat');
    ribbon(this, W / 2, py, Math.min(pw - 140, 620), title, won ? 0x2c9a52 : 0xc8323c, 56);

    let y = py + 130;
    const sub =
      data.mode === 'tripeaks'
        ? t('levelN', { n: data.level ?? 1 })
        : data.mode === 'daily'
          ? `${t('daily')} · ${data.day ?? ''}`
          : t(data.mode);
    txt(this, W / 2, y, sub, 44, '#ffffff');
    y += 40;

    // Stars
    if (data.mode === 'tripeaks' && won) {
      const stars = data.stars ?? 1;
      for (let k = 0; k < 3; k++) {
        const s = this.add.image(W / 2 + (k - 1) * 170, y + 120 - (k === 1 ? 30 : 0), 'i_starEmpty').setDisplaySize(160, 160);
        if (k < stars) {
          const full = this.add.image(s.x, s.y, 'i_star').setDisplaySize(160, 160).setScale(0);
          this.tweens.add({
            targets: full,
            scale: s.scale,
            duration: 380,
            delay: 300 + k * 320,
            ease: 'Back.Out',
            onStart: () => audio.play('star', { rate: 1 + k * 0.12, throttleMs: 0 }),
          });
        }
      }
      y += 240;
    } else {
      this.add.image(W / 2, y + 110, won ? 'i_trophy' : 'i_cards').setDisplaySize(180, 180);
      y += port ? 230 : 210;
    }

    // Stats line
    const stats: string[] = [];
    if (data.score !== undefined) stats.push(`${t('score')}: ${data.score}`);
    if (data.time) stats.push(`${t('time')}: ${formatTime(data.time)}`);
    if (data.moves) stats.push(`${t('moves')}: ${data.moves}`);
    if (data.combo && data.combo > 1) stats.push(t('combo', { n: data.combo }));
    txt(this, W / 2, y + 10, stats.join('   '), 34, '#e8ecf8', { wordWrap: { width: pw - 60 } });
    y += 60;
    if (rec.record && data.mode === 'blitz') {
      const r = txt(this, W / 2, y + 10, t('newRecord'), 44, '#ffd166');
      this.tweens.add({ targets: r, scale: 1.1, duration: 400, yoyo: true, repeat: -1 });
      y += 60;
    }

    // Reward
    const hasReward = !!(rec.reward.coins || rec.reward.boosters);
    if (hasReward) {
      txt(this, W / 2, y + 30, t('reward'), 36, UI.gold);
      this.add.existing(rewardRow(this, W / 2, y + 130, rec.reward, 100));
      y += 230;
    }

    // Buttons. An extra action (map / +30 s) sits above the pair in portrait and joins the row in landscape.
    const by = py + ph - 120;
    const next = this.nextTarget();
    type B = { label: string; color: 'green' | 'gold' | 'dark' | 'purple'; w: number; size: number; ad?: boolean; fn: () => void };
    let extra: B | null = null;
    if (data.mode === 'blitz' && data.canExtend && data.blitzState && !data.blitzState.extended) {
      extra = {
        label: t('plus30'),
        color: 'purple',
        w: 520,
        size: 40,
        ad: true,
        fn: () =>
          watchAd(this, 'blitz_extend', () => {
            data.blitzState!.extended = true;
            data.blitzState!.timeLeft = 30_000;
            this.go('TriPeaks', { mode: 'blitz', state: data.blitzState });
          }),
      };
    }
    let pair: [B, B];
    if (won && hasReward) {
      pair = [
        { label: t('x2'), color: 'green', w: 360, size: 38, ad: true, fn: () => watchAd(this, 'result_x2', () => this.claim(2, next)) },
        { label: t('next'), color: 'gold', w: 340, size: 44, fn: () => this.claim(1, next) },
      ];
      if (data.mode === 'tripeaks') extra = { label: t('map'), color: 'dark', w: 360, size: 34, fn: () => this.claim(1, { key: 'Map', data: {}, ad: 'result_map' }) };
    } else {
      const retry = this.retryTarget();
      const back: Next = data.mode === 'tripeaks' ? { key: 'Map', data: {}, ad: 'result_map' } : data.mode === 'daily' ? { key: 'Daily', data: {}, ad: 'result_menu' } : { key: 'Menu', data: {}, ad: 'result_menu' };
      pair = [
        { label: data.mode === 'tripeaks' ? t('retry') : t('newDeal'), color: 'green', w: 360, size: 40, fn: () => this.claim(1, retry) },
        { label: data.mode === 'tripeaks' ? t('map') : t('menu'), color: 'dark', w: 340, size: 40, fn: () => this.claim(1, back) },
      ];
    }
    const mkBtn = (b: B, x: number, y: number, w: number, h: number) => new Button(this, x, y, { w, h, color: b.color, label: b.label, size: b.size, ad: b.ad }).onClick(b.fn);
    if (extra && !port) {
      const ws = [300, 330, 310];
      const gap = 30;
      let x = W / 2 - (ws[0] + ws[1] + ws[2] + gap * 2) / 2;
      [extra, ...pair].forEach((b, i) => {
        mkBtn(b, x + ws[i] / 2, by, ws[i], 130);
        x += ws[i] + gap;
      });
    } else {
      if (extra) mkBtn(extra, W / 2, by - 160, extra.w, extra.color === 'dark' ? 100 : 120);
      mkBtn(pair[0], W / 2 - 200, by, pair[0].w, 130);
      mkBtn(pair[1], W / 2 + 200, by, pair[1].w, 130);
    }
    if (won) this.confetti();
    this.setupScene();
  }

  /** Stats, quests, progress and the reward amount. */
  private record(): NonNullable<ResultData['recorded']> {
    const d = this.d;
    let reward: Reward = {};
    let postcard: string | null = null;
    let cityDone: number | null = null;
    let xp = 0;
    let record = false;
    switch (d.mode) {
      case 'tripeaks': {
        recordGame('tripeaks', d.won, d.score ?? 0, d.time ?? 0);
        if (d.won) {
          const lv = d.level ?? 1;
          const r = recordAdventureWin(lv, d.stars ?? 1);
          postcard = r.postcard;
          cityDone = r.cityDone;
          const stars = d.stars ?? 1;
          reward = { coins: 20 + Math.min(60, Math.floor(lv / 2)) + stars * 10 + (d.bonusCoins ?? 0) };
          if (lv % 10 === 0 && r.firstClear) reward.boosters = { startJoker: 1 };
          xp = 20 + stars * 5;
          track('tpWin', 1);
          track('stars', stars);
          if (d.combo) track('combo', d.combo);
        }
        break;
      }
      case 'daily': {
        recordGame('daily', d.won, d.score ?? 0, d.time ?? 0);
        if (d.won && d.day && !save.data.dailyCh.includes(d.day)) {
          save.data.dailyCh.push(d.day);
          reward = { coins: 150, boosters: { hint: 1 } };
          xp = 50;
          track('daily', 1);
        }
        break;
      }
      case 'blitz': {
        const prev = save.data.stats.blitz.best;
        recordGame('blitz', true, d.score ?? 0);
        record = (d.score ?? 0) > prev && prev > 0;
        reward = { coins: Math.floor((d.score ?? 0) / 40) };
        xp = 15 + Math.floor((d.score ?? 0) / 500);
        track('blitz', d.score ?? 0);
        if (d.combo) track('combo', d.combo);
        break;
      }
      default: {
        recordGame(d.mode, d.won, d.score ?? 0, d.time ?? 0);
        save.data.resume = null;
        if (d.won) {
          const base = d.mode === 'klondike' ? (d.draw === 3 ? 90 : 60) : d.mode === 'spider' ? (d.suits === 4 ? 180 : d.suits === 2 ? 110 : 60) : 80;
          reward = { coins: base };
          xp = 30;
          track(d.mode === 'klondike' ? 'winKlondike' : d.mode === 'spider' ? 'winSpider' : 'winFreecell', 1);
        }
      }
    }
    const levels = xp ? addXp(xp) : 0;
    save.save();
    return { reward, postcard, cityDone, levels, record };
  }

  private nextTarget(): Next {
    const d = this.d;
    if (d.mode === 'tripeaks') return { key: 'LevelIntro', data: { level: (d.level ?? 1) + 1 }, ad: 'result_next' };
    if (d.mode === 'daily') return { key: 'Daily', data: {}, ad: 'result_daily' };
    if (d.mode === 'blitz') return { key: 'Menu', data: {}, ad: 'result_menu' };
    return { key: 'Classic', data: { mode: d.mode, newGame: true }, ad: 'result_new' };
  }

  private retryTarget(): Next {
    const d = this.d;
    if (d.mode === 'tripeaks') return { key: 'LevelIntro', data: { level: d.level ?? 1 }, ad: 'result_retry' };
    if (d.mode === 'daily') return { key: 'Daily', data: {}, ad: 'result_daily' };
    if (d.mode === 'blitz') return { key: 'TriPeaks', data: { mode: 'blitz' }, ad: 'result_retry' };
    return { key: 'Classic', data: { mode: d.mode, newGame: true }, ad: 'result_new' };
  }

  private claim(mult: number, next: Next): void {
    if (this.claimed) return;
    this.claimed = true;
    const rec = this.d.recorded!;
    if (rec.reward.coins || rec.reward.boosters) {
      grant(rec.reward);
      if (mult > 1) grant(rec.reward);
      audio.play('coins');
    }
    const after = () => {
      checkSkinUnlocks();
      if (rec.cityDone !== null) this.go('CityUnlock', { city: rec.cityDone, levels: rec.levels, next });
      else if (rec.levels > 0) this.go('LevelUp', { next });
      else this.go(next.key, next.data, next.ad);
    };
    if (rec.postcard) this.showPostcard(rec.postcard, after);
    else after();
  }

  private showPostcard(pc: string, done: () => void): void {
    const [ci, idx] = pc.split(':').map(Number);
    const city = CITIES[ci];
    const W = this.W;
    const m = openModal(this, t('postcardFound'), Math.min(W - 60, 860), 820, undefined, { closable: false, depth: 900 });
    const key = `postcard_${pc}`;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, renderPostcard(city, idx, 600, 420, false));
    const img = this.add.image(W / 2, m.y + 360, key).setScale(0.2).setAngle(-8);
    m.root.add(img);
    this.tweens.add({ targets: img, scale: 1, angle: 3, duration: 500, ease: 'Back.Out' });
    audio.play('unlock');
    m.root.add(txt(this, W / 2, m.y + 630, getLang() === 'en' ? city.en : city.ru, 44, UI.gold));
    m.root.add(
      new Button(this, W / 2, m.y + m.h - 90, { w: 340, h: 110, color: 'gold', label: t('ok'), size: 40 }).onClick(() => {
        m.close();
        done();
      }),
    );
  }

  private confetti(): void {
    const colors = [0xff6b6b, 0xffd166, 0x5ad17e, 0x5aa9ff, 0xb084ff];
    for (let i = 0; i < 60; i++) {
      const r = this.add.rectangle(Phaser.Math.Between(0, this.W), -30, 16, 26, colors[i % colors.length]).setDepth(1000);
      this.tweens.add({ targets: r, y: this.H + 50, x: r.x + Phaser.Math.Between(-200, 200), angle: Phaser.Math.Between(-360, 360), duration: Phaser.Math.Between(1600, 2800), delay: Phaser.Math.Between(0, 800), onComplete: () => r.destroy() });
    }
  }
}
