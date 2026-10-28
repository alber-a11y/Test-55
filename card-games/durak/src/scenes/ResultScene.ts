import Phaser from 'phaser';
import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { openModal } from '@shared/ui/modal';
import { Button, panel, ribbon, txt, UI } from '@shared/ui/widgets';
import { faceTex, PLAYER_FACES } from '../art/avatars';
import { LOCATIONS, tableCfg, type Opponent } from '../data/locations';
import type { Reward } from '../data/meta';
import type { DRules } from '../logic/durak';
import { addCoins, addXp, changeRating, checkSkinUnlocks, grant, leagueName, recordDeal, track } from '../progress';
import { save, type ModeId } from '../save';
import { menuBackground } from '../ui/bg';
import { rewardRow, watchAd } from '../ui/common';
import type { MatchInfo } from './GameScene';

export interface DResultData {
  mode: ModeId;
  won: boolean;
  draw: boolean;
  fool: boolean;
  pogony: boolean;
  loserName?: string;
  shield?: boolean;
  quit?: boolean;
  tableIdx?: number;
  match?: MatchInfo;
  rules: DRules;
  opponents: Opponent[];
  loc: number;
  puzzle?: { n: number };
  ctx?: any;
  lastCardTrump?: boolean;
  /** Quit from the pause menu: record the loss and go straight here. */
  autoNext?: { key: string; data: object };
  recorded?: Recorded;
}

interface Recorded {
  reward: Reward;
  rating: number;
  leagueUp: boolean;
  levels: number;
  matchOver: boolean;
  matchWon: boolean;
  boss: boolean;
  stakeLost: number;
}

interface Next {
  key: string;
  data: any;
  ad?: string;
}

export class ResultScene extends BaseScene {
  private d!: DResultData;
  private claimed = false;

  constructor() {
    super('Result');
  }

  create(data: DResultData): void {
    this.d = data;
    this.claimed = false;
    menuBackground(this, data.loc);
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
    const pw = Math.min(W - 60, 920);
    const ph = this.portrait ? 1250 : 940;
    const py = Math.max(80, (H - ph) / 2);
    panel(this, W / 2 - pw / 2, py, pw, ph);
    const title = data.draw ? t('draw') : won ? t('victory') : t('defeat');
    ribbon(this, W / 2, py, Math.min(pw - 140, 620), title, won ? 0x2c9a52 : data.draw ? 0x7048c8 : 0xc8323c, 56);

    let y = py + 130;
    const sub =
      data.mode === 'career' && data.tableIdx !== undefined
        ? `${getLang() === 'en' ? LOCATIONS[data.loc].en : LOCATIONS[data.loc].ru} · ${t('tableN', { n: (data.tableIdx % 9) + 1 })}`
        : data.mode === 'puzzle'
          ? t('puzzleN', { n: data.puzzle?.n ?? 1 })
          : t(data.mode === 'daily' ? 'dailyTable' : data.mode);
    txt(this, W / 2, y, sub, 40, '#ffffff');
    y += 30;
    // Faces: player vs opponents with emotions
    const pf = PLAYER_FACES[save.data.avatar % PLAYER_FACES.length];
    const faces = [{ key: `me${save.data.avatar}`, p: pf, name: t('you'), lost: data.fool }, ...data.opponents.map((o, i) => ({ key: `res_${i}_${o.name}`, p: o.face, name: o.name, lost: !data.fool && !data.draw && data.loserName === o.name }))];
    const fs = faces.length > 3 ? 150 : 190;
    faces.forEach((f, i) => {
      const x = W / 2 + (i - (faces.length - 1) / 2) * (fs + 40);
      const emo = data.draw ? 'surprised' : f.lost ? 'sad' : 'happy';
      this.add.image(x, y + fs / 2 + 30, faceTex(this.textures, f.key, f.p, emo)).setDisplaySize(fs, fs);
      txt(this, x, y + fs + 60, f.name, 28, f.lost ? '#ff8a8a' : '#ffffff');
      if (f.lost && !data.draw) {
        const tag = txt(this, x, y + 40, t('fool'), 30, '#ff6b6b').setAngle(-12);
        this.tweens.add({ targets: tag, scale: 1.15, duration: 400, yoyo: true, repeat: -1 });
      }
    });
    y += fs + 110;
    if (data.match && data.match.need > 1) {
      txt(this, W / 2, y, t('matchScore', { a: data.match.wins, b: data.match.losses }), 40, UI.gold);
      y += 60;
    }
    if (data.pogony && !data.shield) {
      const pg = txt(this, W / 2, y + 10, `${t('pogony')} ${t('pogony_d')}`, 30, '#ffa94d', { wordWrap: { width: pw - 80 } });
      void pg;
      y += 70;
    }
    if (rec.rating) {
      txt(this, W / 2, y + 10, `${t('rating')}: ${save.data.rating} (${rec.rating > 0 ? '+' : ''}${rec.rating})  · ${t('lg_' + leagueName(save.data.rating))}`, 32, rec.rating > 0 ? '#9ff0c8' : '#ff8a8a');
      y += 60;
    }
    const hasReward = !!(rec.reward.coins || rec.reward.boosters);
    if (hasReward) {
      txt(this, W / 2, y + 20, t('reward'), 34, UI.gold);
      this.add.existing(rewardRow(this, W / 2, y + 110, rec.reward, 96));
    }

    const by = py + ph - 110;
    const next = this.nextTarget();
    if (won && hasReward) {
      new Button(this, W / 2 - 200, by, { w: 360, h: 130, color: 'green', label: t('x2'), size: 38, ad: true }).onClick(() => watchAd(this, 'result_x2', () => this.claim(2, next)));
      new Button(this, W / 2 + 200, by, { w: 340, h: 130, color: 'gold', label: t('next'), size: 44 }).onClick(() => this.claim(1, next));
    } else {
      // Loss: second life (rewarded) for career, otherwise retry / menu.
      if (!won && !data.draw && data.mode === 'career' && rec.matchOver && !data.quit) {
        new Button(this, W / 2, by - 150, { w: 560, h: 120, color: 'purple', label: t('secondLife'), size: 38, ad: true }).onClick(() =>
          watchAd(this, 'second_life', () => {
            // Undo the loss: rating and stake back, replay the table.
            changeRating(-rec.rating);
            addCoins(rec.stakeLost);
            this.claimed = true;
            const cfg = tableCfg(data.tableIdx!, getLang());
            this.go('Game', { mode: 'career', rules: cfg.rules, opponents: cfg.opponents, loc: cfg.loc, tableIdx: cfg.idx, match: { wins: 0, losses: 0, need: cfg.winsNeeded, deal: 1 } });
          }),
        );
      }
      new Button(this, W / 2 - 200, by, { w: 360, h: 130, color: 'green', label: data.match && !rec.matchOver ? t('next') : data.mode === 'puzzle' ? t('retry') : t('retry'), size: 40 }).onClick(() => this.claim(1, next));
      new Button(this, W / 2 + 200, by, { w: 340, h: 130, color: 'dark', label: data.mode === 'career' ? t('map') : t('menu'), size: 40 }).onClick(() =>
        this.claim(1, this.backTarget()),
      );
    }
    if (won) this.confetti();
    this.setupScene();
  }

  private record(): Recorded {
    const d = this.d;
    let reward: Reward = {};
    let rating = 0;
    let leagueUp = false;
    let matchOver = true;
    let matchWon = d.won;
    let boss = false;
    let stakeLost = 0;
    const xp = d.won ? 30 : d.draw ? 15 : 10;
    recordDeal(d.mode, d.won, d.fool, d.draw);
    if (d.pogony && !d.shield) save.data.totals.pogony++;
    if (d.won && !d.pogony) track('noPogony', 1);
    if (d.lastCardTrump) track('trumpWin', 1);
    if (d.match) {
      if (d.won) d.match.wins++;
      else if (!d.draw) d.match.losses++;
      matchOver = d.match.wins >= d.match.need || d.match.losses >= d.match.need;
      matchWon = d.match.wins >= d.match.need;
    }
    switch (d.mode) {
      case 'career': {
        const cfg = tableCfg(d.tableIdx ?? 0, getLang());
        boss = cfg.boss;
        if (matchOver && matchWon) {
          reward = { coins: cfg.prize, boosters: cfg.boss ? { shield: 1, peek: 1 } : undefined };
          const r = changeRating(cfg.rating);
          rating = cfg.rating;
          leagueUp = r.leagueUp;
          save.data.career.next = Math.max(save.data.career.next, cfg.idx + 1);
          const stars = d.match && d.match.need > 1 ? (d.match.losses === 0 ? 3 : 2) : 3;
          save.data.career.stars[cfg.idx] = Math.max(save.data.career.stars[cfg.idx] ?? 0, stars);
          if (cfg.boss && !save.data.career.trophies.includes(cfg.loc)) save.data.career.trophies.push(cfg.loc);
          track('career', 1);
        } else if (matchOver && !d.draw) {
          if (!d.shield) {
            rating = -Math.round(cfg.rating / 2);
            changeRating(rating);
            stakeLost = cfg.stake;
          } else addCoins(cfg.stake);
        }
        break;
      }
      case 'quick': {
        if (d.won) {
          const lvl = save.data.settings.quick.level;
          reward = { coins: 20 + lvl * 10 + (d.rules.players - 2) * 10 };
          track('quickWin', 1);
          if (lvl >= 3) {
            rating = 4;
            changeRating(rating);
          }
        }
        break;
      }
      case 'puzzle': {
        const n = d.puzzle?.n ?? 1;
        if (d.won && n > save.data.puzzles.solved) {
          save.data.puzzles.solved = n;
          reward = { coins: 40 + Math.min(60, n * 2) };
          track('puzzle', 1);
        }
        break;
      }
      case 'daily': {
        const day = d.ctx?.day as string | undefined;
        if (day && !save.data.dailyTable.includes(day)) {
          save.data.dailyTable.push(day);
          track('daily', 1);
          reward = d.won ? { coins: 240, boosters: { hint: 1, peek: 1 } } : { coins: 40 };
        }
        break;
      }
      case 'tournament': {
        // Handled by the bracket screen; a final win pays out there.
        break;
      }
    }
    const levels = addXp(xp);
    save.save();
    return { reward, rating, leagueUp, levels, matchOver, matchWon, boss, stakeLost };
  }

  private gameData(): any {
    const d = this.d;
    return { mode: d.mode, rules: d.rules, opponents: d.opponents, loc: d.loc, tableIdx: d.tableIdx, ctx: d.ctx };
  }

  private nextTarget(): Next {
    const d = this.d;
    const rec = d.recorded!;
    if (d.match && !rec.matchOver) return { key: 'Game', data: { ...this.gameData(), match: { ...d.match, deal: d.match.deal + 1 } }, ad: 'next_deal' };
    switch (d.mode) {
      case 'career':
        return rec.matchWon ? { key: 'TableIntro', data: { idx: (d.tableIdx ?? 0) + 1 }, ad: 'result_next' } : { key: 'TableIntro', data: { idx: d.tableIdx ?? 0 }, ad: 'result_retry' };
      case 'quick':
        return { key: 'Game', data: this.gameData(), ad: 'result_new' };
      case 'puzzle':
        return d.won ? { key: 'Puzzles', data: { start: (d.puzzle?.n ?? 1) + 1 }, ad: 'result_next' } : { key: 'Puzzles', data: { start: d.puzzle?.n ?? 1 }, ad: 'result_retry' };
      case 'tournament':
        return { key: 'Tournament', data: { result: { won: d.won, draw: d.draw } }, ad: 'result_tour' };
      default:
        return { key: 'Menu', data: {}, ad: 'result_menu' };
    }
  }

  private backTarget(): Next {
    const d = this.d;
    if (d.mode === 'career') return { key: 'Career', data: {}, ad: 'result_map' };
    if (d.mode === 'tournament') return { key: 'Tournament', data: { result: { won: d.won, draw: d.draw } }, ad: 'result_tour' };
    if (d.mode === 'puzzle') return { key: 'Puzzles', data: {}, ad: 'result_menu' };
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
      if (rec.leagueUp) this.go('LeagueUp', { next: rec.levels > 0 ? { key: 'LevelUp', data: { next } } : next });
      else if (rec.levels > 0) this.go('LevelUp', { next });
      else this.go(next.key, next.data, next.ad);
    };
    if (rec.boss && rec.matchWon && rec.matchOver) this.showTrophy(unlocked.length > 0, chain);
    else chain();
  }

  private showTrophy(skin: boolean, done: () => void): void {
    const W = this.W;
    const m = openModal(this, t('bossBeaten'), Math.min(W - 60, 860), 760, undefined, { closable: false, depth: 900 });
    audio.play('levelup');
    const tr = this.add.image(W / 2, m.y + 300, 'i_trophy').setDisplaySize(260, 260).setScale(0.2);
    m.root.add(tr);
    this.tweens.add({ targets: tr, scale: 2.03, duration: 500, ease: 'Back.Out' });
    m.root.add(txt(this, W / 2, m.y + 500, `${t('trophyGot')}: ${getLang() === 'en' ? LOCATIONS[this.d.loc].en : LOCATIONS[this.d.loc].ru}`, 38, UI.gold, { wordWrap: { width: m.w - 60 } }));
    if (skin) m.root.add(txt(this, W / 2, m.y + 560, `+ ${t('tab_backs')}`, 30, '#ffffff'));
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
