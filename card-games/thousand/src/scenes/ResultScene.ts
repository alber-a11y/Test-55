import Phaser from 'phaser';
import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { platform } from '@shared/platform/platform';
import { BaseScene } from '@shared/ui/base';
import { openModal } from '@shared/ui/modal';
import { Button, panel, ribbon, txt, UI } from '@shared/ui/widgets';
import { faceTex, PLAYER_FACES } from '../art/avatars';
import type { GoalState } from '../data/goals';
import { MODES, type Reward } from '../data/meta';
import { levelCfg, STATIONS, WORLDS, type Opponent } from '../data/route';
import { addXp, changeRating, checkSkinUnlocks, grant, rankName, recordMatch, track } from '../progress';
import { save, type ModeId } from '../save';
import { menuBackground } from '../ui/bg';
import { rewardRow, watchAd } from '../ui/common';
import { goalText } from './GameScene';
import { modeTarget } from './ModesScene';

export interface ResultData {
  mode: ModeId;
  won: boolean;
  place: number;
  scores: number[];
  names: string[];
  opponents: Opponent[];
  world: number;
  level?: number;
  etude?: number;
  ctx?: any;
  gs?: GoalState;
  gain: number;
  deals: number;
  stars?: number;
  quit?: boolean;
  /** Quit from the pause menu: record the loss and go straight here. */
  autoNext?: { key: string; data: object };
  recorded?: Recorded;
}

interface Recorded {
  reward: Reward;
  rating: number;
  rankUp: boolean;
  levels: number;
  boss: boolean;
  firstWin: boolean;
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
    menuBackground(this, data.world);
    if (!data.recorded) data.recorded = this.record();
    const rec = data.recorded;
    if (data.autoNext) {
      const to = data.autoNext;
      data.autoNext = undefined;
      this.claimed = true;
      void this.go(to.key, to.data, 'quit_game');
      return;
    }
    const W = this.W;
    const H = this.H;
    const won = data.won;
    const pw = Math.min(W - 60, 940);
    const ph = this.portrait ? 1300 : 960;
    const py = Math.max(60, (H - ph) / 2);
    panel(this, W / 2 - pw / 2, py, pw, ph);
    ribbon(this, W / 2, py, Math.min(pw - 140, 640), won ? t('victory') : t('defeat'), won ? 0x2c9a52 : 0xc8323c, 56);
    let y = py + 130;
    txt(this, W / 2, y, this.subtitle(), 36, '#ffffff', { wordWrap: { width: pw - 80 } });
    y += 60;
    if (data.mode === 'career' && data.level !== undefined) {
      txt(this, W / 2, y, goalText(levelCfg(data.level, getLang())), 28, UI.gold, { wordWrap: { width: pw - 80 } });
      y += 50;
    }
    // Stars
    if (data.mode === 'career' && won) {
      const st = data.stars ?? 1;
      for (let k = 0; k < 3; k++) {
        const s = this.add.image(W / 2 + (k - 1) * 120, y + 60 - (k === 1 ? 20 : 0), k < st ? 'i_star' : 'i_starEmpty').setDisplaySize(110, 110).setScale(0.1);
        this.tweens.add({ targets: s, scale: 110 / 128, duration: 320, delay: 200 + k * 220, ease: 'Back.Out', onStart: () => k < st && audio.play('star') });
      }
      y += 140;
    }
    // Players with final scores
    const pf = PLAYER_FACES[save.data.avatar % PLAYER_FACES.length];
    const faces = [{ key: `me${save.data.avatar}`, p: pf }, ...data.opponents.map((o, i) => ({ key: `res_${i}_${o.name}`, p: o.face }))];
    const order = [0, 1, 2].sort((a, b) => data.scores[b] - data.scores[a]);
    const fs = 150;
    order.forEach((p, i) => {
      const x = W / 2 + (i - 1) * (fs + 90);
      const top = i === 0;
      const emo = p === 0 ? (won ? 'happy' : 'sad') : top ? 'happy' : 'neutral';
      this.add.image(x, y + fs / 2 + 20, faceTex(this.textures, faces[p].key, faces[p].p, emo)).setDisplaySize(fs, fs);
      if (top) this.add.image(x, y + 4, 'i_crown').setDisplaySize(70, 70);
      const nm = txt(this, x, y + fs + 50, data.names[p], 26, p === 0 ? UI.gold : '#ffffff');
      if (nm.width > fs + 70) nm.setScale((fs + 70) / nm.width);
      txt(this, x, y + fs + 90, String(data.scores[p]), 36, '#ffffff');
    });
    y += fs + 150;
    if (data.mode === 'daily' || data.mode === 'etude') {
      txt(this, W / 2, y, data.mode === 'daily' ? t('dailyScore', { n: data.gain }) : '', 32, UI.gold);
      y += 50;
    }
    if (rec.rating) {
      txt(this, W / 2, y, `${t('rating')}: ${save.data.rating} (${rec.rating > 0 ? '+' : ''}${rec.rating}) · ${t('rk_' + rankName(save.data.rating))}`, 30, rec.rating > 0 ? '#9ff0c8' : '#ff8a8a');
      y += 56;
    }
    const hasReward = !!(rec.reward.coins || rec.reward.boosters);
    if (hasReward) {
      txt(this, W / 2, y + 10, t('reward'), 32, UI.gold);
      this.add.existing(rewardRow(this, W / 2, y + 100, rec.reward, 92));
    }
    const by = py + ph - 100;
    const next = this.nextTarget();
    if (hasReward) {
      new Button(this, W / 2 - 200, by, { w: 360, h: 128, color: 'green', label: t('x2'), size: 38, ad: true }).onClick(() => watchAd(this, 'result_x2', () => this.claim(2, next)));
      new Button(this, W / 2 + 200, by, { w: 340, h: 128, color: 'gold', label: t('next'), size: 44 }).onClick(() => this.claim(1, next));
    } else {
      new Button(this, W / 2 - 200, by, { w: 360, h: 128, color: 'green', label: won ? t('next') : t('retry'), size: 40 }).onClick(() => this.claim(1, next));
      new Button(this, W / 2 + 200, by, { w: 340, h: 128, color: 'dark', label: data.mode === 'career' ? t('map') : t('menu'), size: 40 }).onClick(() => this.claim(1, this.backTarget()));
    }
    if (hasReward) new Button(this, W / 2, by - 140, { w: 300, h: 96, color: 'dark', label: data.mode === 'career' ? t('map') : t('menu'), size: 34 }).onClick(() => this.claim(1, this.backTarget()));
    if (won) this.confetti();
    this.setupScene();
  }

  private subtitle(): string {
    const d = this.d;
    if (d.mode === 'career' && d.level !== undefined) {
      const wd = WORLDS[Math.floor(d.level / STATIONS) % WORLDS.length];
      return `${getLang() === 'en' ? wd.en : wd.ru} · ${t('stationN', { n: (d.level % STATIONS) + 1 })}`;
    }
    if (d.mode === 'etude') return t('etudeN', { n: d.etude ?? 1 }) + ' · ' + (d.won ? t('etudeSolved') : t('etudeFailed'));
    if (d.mode === 'cup') return `${t('cup')} · ${t('stageN', { n: (d.ctx?.stage ?? 0) + 1 })}`;
    return `${t(d.mode)} · ${t('placeN', { n: d.place })}`;
  }

  private record(): Recorded {
    const d = this.d;
    let reward: Reward = {};
    let rating = 0;
    let rankUp = false;
    let boss = false;
    let firstWin = false;
    recordMatch(d.mode, d.won);
    // A one-try pass for a locked mode is used up.
    const md = MODES.find((m) => m.id === d.mode);
    if (md && save.data.route.next < md.unlock) save.data.trial = save.data.trial.filter((x) => x !== d.mode);
    let xp = d.quit ? 5 : d.won ? 30 : 12;
    switch (d.mode) {
      case 'career': {
        const cfg = levelCfg(d.level ?? 0, getLang());
        boss = cfg.boss;
        if (d.won) {
          firstWin = cfg.idx >= save.data.route.next;
          reward = { coins: firstWin ? cfg.prize : Math.round(cfg.prize / 3), boosters: cfg.boss && firstWin ? { lucky: 1, xray: 1 } : undefined };
          const r = changeRating(cfg.rating);
          rating = cfg.rating;
          rankUp = r.rankUp;
          save.data.route.next = Math.max(save.data.route.next, cfg.idx + 1);
          save.data.route.stars[cfg.idx] = Math.max(save.data.route.stars[cfg.idx] ?? 0, d.stars ?? 1);
          if (cfg.boss && !save.data.route.trophies.includes(cfg.world)) save.data.route.trophies.push(cfg.world);
          track('career', 1);
          xp = cfg.xp;
          void platform.setScore('route', save.data.route.next);
        } else if (!d.quit) {
          rating = -Math.round(cfg.rating / 3);
          changeRating(rating);
        }
        break;
      }
      case 'quick':
      case 'blitz':
      case 'dark':
      case 'fever': {
        const lvl = save.data.settings.quick.level;
        const base = d.mode === 'blitz' ? 30 : 60;
        if (d.won) reward = { coins: base + lvl * 20 };
        else if (d.place === 2 && !d.quit) reward = { coins: Math.round(base / 3) };
        if (d.won && lvl >= 3) {
          rating = 6 + (lvl - 3) * 4;
          rankUp = changeRating(rating).rankUp;
        }
        break;
      }
      case 'etude': {
        const n = d.etude ?? 1;
        if (d.won && n > save.data.etudes.solved) {
          save.data.etudes.solved = n;
          reward = { coins: 40 + Math.min(80, n * 2) };
          track('etude', 1);
        }
        break;
      }
      case 'daily': {
        const day = d.ctx?.day as string | undefined;
        if (day) {
          const first = save.data.dailyDeal[day] === undefined;
          save.data.dailyDeal[day] = Math.max(save.data.dailyDeal[day] ?? -9999, d.gain);
          void platform.setScore('daily', Math.max(0, save.data.dailyDeal[day]));
          if (first && !d.quit) {
            track('daily', 1);
            reward = { coins: Math.max(60, Math.min(450, 60 + Math.max(0, d.gain))) * (d.won ? 3 : 1), boosters: d.won ? { hint: 1, lucky: 1 } : undefined };
          }
        }
        break;
      }
      case 'cup':
        // Prizes are paid on the cup screen.
        break;
    }
    const levels = addXp(xp);
    save.save();
    return { reward, rating, rankUp, levels, boss, firstWin };
  }

  private gameData(): any {
    const d = this.d;
    return { mode: d.mode };
  }

  private nextTarget(): Next {
    const d = this.d;
    switch (d.mode) {
      case 'career':
        return d.won ? { key: 'LevelIntro', data: { idx: Math.min(save.data.route.next, (d.level ?? 0) + 1) }, ad: 'result_next' } : { key: 'LevelIntro', data: { idx: d.level ?? 0 }, ad: 'result_retry' };
      case 'etude':
        return { key: 'Etudes', data: { start: d.won ? (d.etude ?? 1) + 1 : d.etude }, ad: 'result_next' };
      case 'cup':
        return { key: 'Cup', data: { result: { won: d.won } }, ad: 'result_cup' };
      case 'daily':
        return { key: 'Daily', data: {}, ad: 'result_daily' };
      default: {
        const tg = modeTarget(d.mode);
        return { key: tg.key, data: { ...tg.data, ...this.gameData() }, ad: 'result_new' };
      }
    }
  }

  private backTarget(): Next {
    const d = this.d;
    if (d.mode === 'career') return { key: 'Map', data: {}, ad: 'result_map' };
    if (d.mode === 'cup') return { key: 'Cup', data: { result: { won: d.won } }, ad: 'result_cup' };
    return { key: 'Menu', data: {}, ad: 'result_menu' };
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
    const unlocked = checkSkinUnlocks();
    const chain = () => {
      if (rec.rankUp) this.go('RankUp', { next: rec.levels > 0 ? { key: 'LevelUp', data: { next } } : next });
      else if (rec.levels > 0) this.go('LevelUp', { next });
      else this.go(next.key, next.data, next.ad);
    };
    if (rec.boss && this.d.won && rec.firstWin) this.showTrophy(unlocked.length > 0, chain);
    else chain();
  }

  private showTrophy(skinGot: boolean, done: () => void): void {
    const W = this.W;
    const m = openModal(this, t('bossBeaten'), Math.min(W - 60, 860), 760, undefined, { closable: false, depth: 900 });
    audio.play('levelup');
    const tr = this.add.image(W / 2, m.y + 300, 'i_trophy').setDisplaySize(260, 260).setScale(0.2);
    m.root.add(tr);
    this.tweens.add({ targets: tr, scale: 2.03, duration: 500, ease: 'Back.Out' });
    const wd = WORLDS[this.d.world % WORLDS.length];
    m.root.add(txt(this, W / 2, m.y + 500, `${t('trophyGot')}: ${getLang() === 'en' ? wd.en : wd.ru}`, 38, UI.gold, { wordWrap: { width: m.w - 60 } }));
    if (skinGot) m.root.add(txt(this, W / 2, m.y + 560, `+ ${t('tab_backs')}`, 30, '#ffffff'));
    m.root.add(
      new Button(this, W / 2, m.y + m.h - 90, { w: 340, h: 110, color: 'gold', label: t('ok'), size: 40 }).onClick(() => {
        m.close();
        done();
      }),
    );
  }

  private confetti(): void {
    const colors = [0xa3213a, 0xd9a23a, 0x2f7d5a, 0x3b5bab, 0xfff3c4];
    for (let i = 0; i < 60; i++) {
      const r = this.add.rectangle(Phaser.Math.Between(0, this.W), -30, 16, 26, colors[i % colors.length]).setDepth(1000);
      this.tweens.add({ targets: r, y: this.H + 50, x: r.x + Phaser.Math.Between(-200, 200), angle: Phaser.Math.Between(-360, 360), duration: Phaser.Math.Between(1600, 2800), delay: Phaser.Math.Between(0, 800), onComplete: () => r.destroy() });
    }
  }
}
