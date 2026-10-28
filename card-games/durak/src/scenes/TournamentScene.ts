import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { Rng } from '@shared/core/rng';
import { BaseScene } from '@shared/ui/base';
import { Button, panel, ribbon, toast, txt, UI } from '@shared/ui/widgets';
import { faceTex, PLAYER_FACES } from '../art/avatars';
import { faceFromSeed } from '../art/faces';
import { randomOpponents } from '../data/quick';
import { PROFILES, type AIProfile } from '../logic/ai';
import { DEFAULT_RULES } from '../logic/durak';
import { grant, spendCoins, track } from '../progress';
import { save, type TourState } from '../save';
import { menuBackground } from '../ui/bg';
import { rewardPopup, topBar } from '../ui/common';

const ENTRY = 150;
const PRIZES = [0, 150, 400, 1000];
const LV: AIProfile[] = [PROFILES.novice, PROFILES.novice, PROFILES.amateur, PROFILES.master, PROFILES.king];

/** 8-player single-elimination bracket; matches are single deals. */
export class TournamentScene extends BaseScene {
  constructor() {
    super('Tournament');
  }

  create(data: { result?: { won: boolean; draw: boolean } }): void {
    menuBackground(this, 6);
    topBar(this, t('tournament'), () => this.go('Menu', {}, 'tour_back'));
    let st = save.data.tour;
    if (data.result && st && !st.done) {
      st = this.applyResult(st, data.result.won || data.result.draw === true ? data.result.won : false, data.result.draw);
      data.result = undefined;
    }
    if (!st || st.done) return this.entryScreen(st);
    this.bracket(st);
    this.setupScene();
  }

  private entryScreen(last: TourState | null): void {
    const W = this.W;
    const H = this.H;
    const pw = Math.min(W - 60, 900);
    const py = this.portrait ? 300 : 200;
    panel(this, W / 2 - pw / 2, py, pw, 860);
    ribbon(this, W / 2, py, 560, t('tournament'), 0x7048c8);
    this.add.image(W / 2, py + 240, 'i_trophy').setDisplaySize(240, 240);
    txt(this, W / 2, py + 420, t('tournament_d'), 34, '#ffffff', { wordWrap: { width: pw - 80 } });
    ['tour_round1', 'tour_round2', 'tour_round3'].forEach((k, i) => txt(this, W / 2, py + 500 + i * 50, `${t(k)}: +${PRIZES[i + 1]}`, 30, UI.gold));
    if (last?.done) txt(this, W / 2, py + 670, last.out ? t('tour_out') : t('tour_win'), 32, last.out ? '#ff8a8a' : '#9ff0c8');
    new Button(this, W / 2, py + 770, { w: 520, h: 140, color: 'green', label: t('start'), sub: t('tour_entry', { n: ENTRY }), size: 52 }).onClick(() => {
      if (!spendCoins(ENTRY)) return toast(this, t('notEnough'), '#ff8a8a');
      const rng = new Rng(Date.now());
      const opps = randomOpponents(7, 1, rng.int(1, 1e9), getLang());
      const levels = [2, 2, 2, 3, 3, 3, 4];
      rng.shuffle(levels);
      const entrants = [{ name: t('you'), seed: -1, female: false, level: 0 }, ...opps.map((o, i) => ({ name: o.name, seed: 7000 + rng.int(0, 1e6), female: false, level: levels[i] }))];
      save.data.tour = { entrants, rounds: [[0, 1, 2, 3, 4, 5, 6, 7]], round: 0, out: false, done: false };
      save.data.tournament.played++;
      save.save();
      audio.play('shuffle');
      this.scene.restart({});
    });
    void H;
  }

  private opponentIndex(st: TourState): number {
    const r = st.rounds[st.round];
    const i = r.indexOf(0);
    return r[i % 2 === 0 ? i + 1 : i - 1];
  }

  /** Player's match result + simulated other matches of the round. */
  private applyResult(st: TourState, won: boolean, draw: boolean): TourState {
    const r = st.rounds[st.round];
    const next: number[] = [];
    const rng = new Rng(Date.now());
    for (let k = 0; k < r.length; k += 2) {
      const a = r[k];
      const b = r[k + 1];
      if (a === 0 || b === 0) {
        // A draw counts as a loss in a knockout (the stronger AI goes on).
        const winner = won && !draw ? 0 : a === 0 ? b : a;
        next.push(winner);
      } else {
        const la = st.entrants[a].level;
        const lb = st.entrants[b].level;
        next.push(rng.next() < 0.5 + (la - lb) * 0.12 ? a : b);
      }
    }
    st.rounds.push(next);
    st.round++;
    if (!next.includes(0)) {
      st.out = true;
      st.done = true;
      grant({ coins: PRIZES[st.round - 1] ?? 0 });
    } else if (next.length === 1) {
      st.done = true;
      save.data.tournament.wins++;
      track('tournament', 1);
      this.time.delayedCall(300, () => rewardPopup(this, t('tour_win'), { coins: PRIZES[3], boosters: { shield: 1, hint: 2 } }, () => this.scene.restart({}), { x2: 'tour_x2' }));
    }
    save.save();
    return st;
  }

  private bracket(st: TourState): void {
    const W = this.W;
    const H = this.H;
    const rounds = st.rounds;
    const port = this.portrait;
    const colW = port ? W / 4 : Math.min(420, W / 4);
    const x0 = W / 2 - colW * 1.5;
    const top = port ? 260 : 190;
    const hgt = port ? H - 700 : H - 420;
    const face = (i: number) => {
      const e = st.entrants[i];
      return i === 0 ? faceTex(this.textures, `me${save.data.avatar}`, PLAYER_FACES[save.data.avatar % PLAYER_FACES.length]) : faceTex(this.textures, `tour_${e.seed}`, faceFromSeed(e.seed));
    };
    for (let r = 0; r < 4; r++) {
      const list = rounds[r];
      const n = r === 0 ? 8 : 8 / 2 ** r;
      for (let k = 0; k < n; k++) {
        const x = x0 + r * colW;
        const y = top + ((k + 0.5) * hgt) / n;
        const who = list ? list[k] : undefined;
        const g = this.add.graphics();
        g.fillStyle(who === 0 ? 0x2c9a52 : UI.inkN, 0.85).fillRoundedRect(x - colW / 2 + 10, y - 44, colW - 20, 88, 20);
        if (who !== undefined) {
          this.add.image(x - colW / 2 + 54, y, face(who)).setDisplaySize(72, 72);
          const nm = txt(this, x - colW / 2 + 100, y, st.entrants[who].name, 26, '#ffffff').setOrigin(0, 0.5);
          if (nm.width > colW - 130) nm.setScale((colW - 130) / nm.width);
        } else txt(this, x, y, '?', 32, '#6b7690');
      }
    }
    this.add.image(x0 + 3 * colW, top - 40, 'i_trophy').setDisplaySize(90, 90);
    const by = H - (port ? 200 : 110);
    const opp = this.opponentIndex(st);
    const e = st.entrants[opp];
    const roundName = t(['tour_round1', 'tour_round2', 'tour_round3'][st.round]);
    txt(this, W / 2, by - 120, `${roundName}: ${t('you')} — ${e.name}`, 36, UI.gold);
    new Button(this, W / 2, by, { w: 560, h: 140, color: 'green', label: t('tour_next'), size: 48 }).onClick(() => {
      const prof = LV[e.level];
      this.go('Game', {
        mode: 'tournament',
        rules: { ...DEFAULT_RULES, transfer: st.round === 2 },
        opponents: [{ name: e.name, face: faceFromSeed(e.seed), ai: prof, trait: 'calm', boss: st.round === 2 }],
        loc: 6,
      });
    });
  }
}
