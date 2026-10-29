import Phaser from 'phaser';
import { audio } from '@shared/audio/audio';
import { CardView } from '@shared/cards/CardView';
import type { Card } from '@shared/cards/card';
import { t } from '@shared/core/i18n';
import { pauseHub } from '@shared/core/pause';
import { Rng } from '@shared/core/rng';
import { ads } from '@shared/platform/ads';
import { platform } from '@shared/platform/platform';
import { BaseScene } from '@shared/ui/base';
import { openModal, type Modal } from '@shared/ui/modal';
import { openPauseMenu, type PauseItem } from '@shared/ui/pauseMenu';
import { Button, IconButton, progressBar, toast, txt, UI } from '@shared/ui/widgets';
import { faceTex, PLAYER_FACES } from '../art/avatars';
import type { Emotion } from '../art/faces';
import { goalProgress, goalStars, goalStatus, goalUpdate, newGoalState, type GoalState } from '../data/goals';
import { EMOTE_IDS } from '../data/meta';
import { PHRASES } from '../data/opponents';
import { levelCfg, type LevelCfg, type Opponent } from '../data/route';
import { bidAdvice, decide, handEstimate, PROFILES } from '../logic/ai';
import { bestCard, puzzle } from '../logic/puzzles';
import { barrelAt, Deal, marriagesIn, Match, MARRIAGE, NP, type Row, type TAction, type TCard, type TEvent, type TRules } from '../logic/thousand';
import { spendCoins, track, useBooster } from '../progress';
import { save, type BoosterId, type ModeId } from '../save';
import { skin, texRank } from '../skin';
import { suitColor, SUIT_GLYPH } from '../ui/bg';
import { confirm, watchAd } from '../ui/common';
import { showTip } from '../ui/tutorial';

export interface GameData {
  mode: ModeId;
  rules: TRules;
  opponents: Opponent[];
  world: number;
  seed?: number;
  /** Route station index (career). */
  level?: number;
  /** Pre-game boosters (lucky, shield, extra). */
  boosters?: BoosterId[];
  /** Etude number. */
  etude?: number;
  /** Fixed number of deals (daily deal). */
  dealsLimit?: number;
  /** Mode context passed through to the result (cup stage, daily day). */
  ctx?: any;
  state?: GameState;
}

interface GameState {
  m: Match;
  seed: number;
  gs: GoalState;
  extra: number;
  secondChance: boolean;
  shield: boolean;
  shieldUsed: boolean;
  lucky: boolean;
  undo: Deal | null;
  undoUsed: boolean;
  redealSalt: number;
  xray: boolean;
  counter: boolean;
  peek: number[];
  summary: Row | null;
  etudeNeed: number;
  myContracts: number;
  started: boolean;
}

interface Seat {
  x: number;
  y: number;
  /** Fan of face-down cards. */
  hx: number;
  hy: number;
  avatar?: Phaser.GameObjects.Image;
  score?: Phaser.GameObjects.Text;
  info?: Phaser.GameObjects.Text;
  bolts?: Phaser.GameObjects.Container;
  bubble?: Phaser.GameObjects.Container;
}

const SPEED_MS = [0, 1000, 650, 380];

export class GameScene extends BaseScene {
  private st!: GameState;
  private d!: GameData;
  private cfg: LevelCfg | null = null;
  private views = new Map<number, CardView>();
  private seats: Seat[] = [];
  private cw = 130;
  private hcw = 150;
  private center = { x: 0, y: 0 };
  private prikupPos = { x: 0, y: 0 };
  private handY = 0;
  private botTimer: Phaser.Time.TimerEvent | null = null;
  private busy = false;
  private ended = false;
  private rng = new Rng(1);
  private status!: Phaser.GameObjects.Text;
  private trumpBadge!: Phaser.GameObjects.Container;
  private contractInfo!: Phaser.GameObjects.Text;
  private goalBox: Phaser.GameObjects.Container | null = null;
  private panel: Phaser.GameObjects.Container | null = null;
  private boosterBtns = new Map<BoosterId, Button>();
  /** Discard selection: card id per receiving seat. */
  private giveSel: (number | null)[] = [null, null, null];
  private hintGlow: CardView | null = null;
  /** Open deal summary (kept for tests). */
  summaryModal: Modal | null = null;
  /** The turn loop runs (false while the deal is being dealt / tips are shown). */
  private looping = false;
  /** Seat that collected a card (for history cards). */
  private collected = new Map<number, number>();

  constructor() {
    super('Game');
  }

  get m(): Match {
    return this.st.m;
  }
  get deal(): Deal {
    return this.st.m.deal;
  }

  create(data: GameData): void {
    this.d = data;
    this.views = new Map();
    this.seats = [];
    this.busy = false;
    this.ended = false;
    this.botTimer = null;
    this.panel = null;
    this.goalBox = null;
    this.hintGlow = null;
    this.summaryModal = null;
    this.looping = false;
    this.boosterBtns = new Map();
    this.giveSel = [null, null, null];
    this.collected = new Map();
    this.cfg = data.level !== undefined ? levelCfg(data.level) : null;
    const first = !data.state;
    this.st = data.state ?? this.newState();
    this.sceneData = { ...data, state: this.st };
    this.rng = new Rng(this.st.seed ^ (Date.now() & 0xffff));

    this.add.image(0, 0, skin.table(this.W, this.H, data.world)).setOrigin(0);
    this.computeLayout();
    this.buildSeats();
    this.buildHud();
    if (!this.st.started) this.startDeal(false);
    this.buildViews();
    this.rebuildCollected();
    this.sync(false);
    this.refresh();

    audio.playMusic(data.opponents.some((o) => o.boss) ? 'boss' : 'game');
    ads.inGameplay = true;
    platform.gameplayStart();
    const unsub = pauseHub.subscribe(() => (pauseHub.systemPaused ? this.tweens.pauseAll() : this.tweens.resumeAll()));
    this.events.once('shutdown', () => {
      ads.inGameplay = false;
      platform.gameplayStop();
      unsub();
    });
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p') this.openPause();
    });
    this.setupScene();
    if (this.st.summary) this.showSummary(this.st.summary);
    else if (first) {
      audio.play('shuffle');
      this.dealAnimation();
      this.time.delayedCall(900, () => this.tutorial(() => this.step()));
    } else this.step();
  }

  protected onResize(): void {
    this.botTimer?.remove();
    this.scene.restart({ ...this.d, state: this.st });
  }

  private newState(): GameState {
    const d = this.d;
    const seed = d.seed ?? (Math.random() * 2 ** 31) >>> 0;
    const m = new Match(d.rules, seed, 2, this.cfg?.start);
    const st: GameState = {
      m,
      seed,
      gs: newGoalState(),
      extra: d.boosters?.includes('extra') ? 1 : 0,
      secondChance: false,
      shield: !!d.boosters?.includes('shield'),
      shieldUsed: false,
      lucky: !!d.boosters?.includes('lucky') || !!this.cfg?.lucky,
      undo: null,
      undoUsed: false,
      redealSalt: 0,
      xray: false,
      counter: false,
      peek: [],
      summary: null,
      etudeNeed: 0,
      myContracts: 0,
      started: false,
    };
    if (d.etude !== undefined) {
      const p = puzzle(d.etude);
      m.deal = p.deal.clone();
      m.deal.contract = p.need;
      m.dealNo = 1;
      st.etudeNeed = p.need;
      st.started = true;
    }
    return st;
  }

  /** Begin a new deal in the model (lucky deals pick the best of several shuffles for the player). */
  private startDeal(_animate: boolean): void {
    const st = this.st;
    st.started = true;
    st.undo = null;
    st.undoUsed = false;
    st.xray = false;
    st.peek = [];
    st.summary = null;
    this.giveSel = [null, null, null];
    this.collected = new Map();
    const lucky = st.lucky && (this.d.mode === 'career' ? true : this.m.dealNo === 0);
    const wantMarriage = this.cfg?.goal.k === 'marriage';
    if (lucky)
      this.m.newDeal((cands) => {
        let best = 0;
        let bv = -1;
        cands.forEach((c, i) => {
          const h = c.hands[0];
          const v = handEstimate(h) + (wantMarriage && marriagesIn(h).length ? 200 : 0);
          if (v > bv) {
            bv = v;
            best = i;
          }
        });
        return best;
      }, this.d.mode === 'career' && (this.cfg?.idx ?? 99) < 10 ? 6 : 3);
    else this.m.newDeal();
    // Only the first deal of a non-career game is lucky.
    if (this.d.mode !== 'career') st.lucky = false;
  }

  /* ------------------------------------------------------------ layout */

  private computeLayout(): void {
    const W = this.W;
    const H = this.H;
    const port = this.portrait;
    this.cw = port ? 140 : 120;
    this.hcw = port ? 168 : 150;
    if (port) {
      this.center = { x: W / 2, y: H * 0.48 };
      this.prikupPos = { x: W / 2, y: 700 };
      this.handY = H - 300;
    } else {
      this.center = { x: W / 2, y: H * 0.5 };
      this.prikupPos = { x: W / 2, y: H * 0.29 };
      this.handY = H - 130;
    }
  }

  private seatPos(i: number): { x: number; y: number } {
    const W = this.W;
    const H = this.H;
    if (i === 0) return { x: this.portrait ? 90 : 110, y: this.portrait ? this.handY - this.hcw * 0.7 - 150 : H - 330 };
    if (this.portrait) return i === 1 ? { x: 140, y: 300 } : { x: W - 140, y: 300 };
    return i === 1 ? { x: 150, y: H * 0.42 } : { x: W - 150, y: H * 0.42 };
  }

  private buildSeats(): void {
    for (let i = 0; i < NP; i++) {
      const p = this.seatPos(i);
      const seat: Seat = { x: p.x, y: p.y, hx: p.x, hy: p.y };
      const size = i === 0 ? 104 : this.portrait ? 150 : 140;
      const face = i === 0 ? PLAYER_FACES[save.data.avatar % PLAYER_FACES.length] : this.d.opponents[i - 1].face;
      const key = i === 0 ? `me${save.data.avatar}` : `opp${i}_${this.d.opponents[i - 1].name}`;
      if (i > 0) {
        seat.hx = this.portrait ? this.W * (i === 1 ? 0.29 : 0.71) : p.x + (i === 1 ? 1 : -1) * 170;
        seat.hy = this.portrait ? 480 : p.y - 10;
        const g = this.add.graphics().setDepth(40);
        g.fillStyle(UI.inkN, 0.6).fillRoundedRect(p.x - size * 0.72, p.y - size / 2 - 14, size * 1.44, size + 128, 26);
        const opp = this.d.opponents[i - 1];
        const nm = txt(this, p.x, p.y + size / 2 + 20, opp.name, 26, opp.boss ? UI.gold : '#ffffff').setDepth(41);
        if (nm.width > size * 1.4) nm.setScale((size * 1.4) / nm.width);
      } else {
        const g = this.add.graphics().setDepth(1590);
        g.fillStyle(UI.inkN, 0.6).fillRoundedRect(p.x - 70, p.y - size / 2 - 10, 140, size + 110, 24);
      }
      seat.avatar = this.add.image(p.x, p.y, faceTex(this.textures, key, face)).setDisplaySize(size, size).setDepth(i === 0 ? 1600 : 41);
      const sy = i === 0 ? p.y + size / 2 + 26 : p.y + size / 2 + 56;
      seat.score = txt(this, p.x, sy, '0', 34, UI.gold).setDepth(i === 0 ? 1601 : 42);
      seat.info = txt(this, p.x, i === 0 ? p.y - size / 2 - 30 : p.y - size / 2 - 36, '', 28, '#ffffff').setDepth(i === 0 ? 1601 : 43);
      seat.bolts = this.add.container(p.x, i === 0 ? sy + 36 : sy + 34).setDepth(i === 0 ? 1601 : 42);
      this.seats.push(seat);
    }
  }

  private buildHud(): void {
    const W = this.W;
    const H = this.H;
    new IconButton(this, 75, 75, 'i_pause', 96, 'dark').onClick(() => this.openPause()).setDepth(2001);
    new IconButton(this, 185, 75, 'i_sheet', 96, 'dark').onClick(() => this.showSheet()).setDepth(2001);
    const tools: [BoosterId, string][] = [
      ['hint', 'hint'],
      ['peek', 'eye'],
      ['undo', 'undo'],
      ['xray', 'xray'],
      ['counter', 'stats'],
      ['redeal', 'shuffle'],
    ];
    const port = this.portrait;
    const bs = port ? 96 : 88;
    const bx0 = port ? W / 2 - ((tools.length - 1) * (bs + 12)) / 2 : 300;
    const by = port ? H - 85 : 75;
    tools.forEach(([id, icon], i) => {
      const x = port ? bx0 + i * (bs + 12) : bx0 + i * (bs + 12);
      const b = new Button(this, x, by, { w: bs, h: bs, color: 'dark', icon: `i_${icon}`, iconSize: bs * 0.64, radius: 26 }).setDepth(2001);
      b.onClick(() => this.onBooster(id));
      this.boosterBtns.set(id, b);
    });
    // Trump badge
    this.trumpBadge = this.add.container(W - 90, port ? 75 : 70).setDepth(2001);
    // Contract / points line
    this.contractInfo = txt(this, W / 2, port ? 380 : H * 0.17, '', 32, '#ffffff').setDepth(1500);
    this.status = txt(this, W / 2, this.handY - this.hcw * 0.95, '', 38, UI.gold).setDepth(1500);
    // Emotes
    new IconButton(this, port ? W - 90 : this.seats[0].x, port ? this.seats[0].y : this.seats[0].y + 175, 'i_heart', 76, 'dark').onClick(() => this.openEmotes()).setDepth(1602);
    this.buildGoalBox();
  }

  private buildGoalBox(): void {
    this.goalBox?.destroy();
    this.goalBox = null;
    const cfg = this.cfg;
    const W = this.W;
    if (!cfg && this.d.mode !== 'etude' && !this.d.dealsLimit) return;
    const port = this.portrait;
    const x = port ? W / 2 : 300 + 6 * 100 + 230;
    const y = port ? 75 : 75;
    const w = port ? Math.min(560, W - 480) : 420;
    const c = this.add.container(x, y).setDepth(2000);
    const g = this.add.graphics();
    g.fillStyle(UI.inkN, 0.72).fillRoundedRect(-w / 2, -50, w, 100, 22);
    c.add(g);
    let label = '';
    let p = 0;
    if (cfg) {
      const pr = goalProgress(cfg, this.st.gs, this.m);
      label = goalText(cfg) + (cfg.goal.k === 'contract' ? '' : ` · ${Math.min(pr.cur, pr.need)}/${pr.need}`);
      p = pr.need ? Math.min(1, pr.cur / pr.need) : 0;
      if (cfg.goal.k !== 'race' && cfg.goal.k !== 'barrel') label += `\n${t('dealOf', { n: Math.min(this.st.gs.deals + 1, cfg.deals + this.st.extra), m: cfg.deals + this.st.extra })}`;
    } else if (this.d.mode === 'etude') {
      label = t('etudeGoal', { n: this.st.etudeNeed, cur: this.deal.declPoints() });
      p = Math.min(1, this.deal.declPoints() / Math.max(1, this.st.etudeNeed));
    } else if (this.d.dealsLimit) {
      label = `${t('dealOf', { n: Math.min(this.m.dealNo, this.d.dealsLimit), m: this.d.dealsLimit })} · ${t('pointsN', { n: this.m.scores[0] })}`;
      p = this.m.dealNo / this.d.dealsLimit;
    }
    const tt = txt(this, 0, -12, label, 24, '#ffffff', { strokeThickness: 3 });
    if (tt.width > w - 20) tt.setScale((w - 20) / tt.width);
    c.add(tt);
    c.add(progressBar(this, 0, 36, w - 40, 12, p, 0xd9a23a));
    this.goalBox = c;
  }

  /* ------------------------------------------------------------ views */

  private viewCard(c: TCard): Card {
    return { id: c.id, suit: c.suit, rank: texRank(c.rank) };
  }

  private buildViews(): void {
    this.views.forEach((v) => v.destroy());
    this.views = new Map();
    for (const c of this.deal.allCards) {
      const v = new CardView(this, this.viewCard(c), skin.cards, this.cw, this.cw * 1.4, false);
      v.setPosition(this.W / 2, -200);
      v.setInteractive({ useHandCursor: true });
      v.on('pointerup', () => this.onCardTap(c.id));
      this.views.set(c.id, v);
    }
  }

  private rebuildCollected(): void {
    const h = this.deal.history;
    this.collected = new Map();
    let trick: { p: number; card: TCard }[] = [];
    let trump: number | null = null;
    let mi = 0;
    const ml = this.deal.marriageLog;
    for (const x of h) {
      if (!trick.length && mi < ml.length && ml[mi].p === x.p && ml[mi].suit === x.card.suit && (x.card.rank === 12 || x.card.rank === 13)) trump = ml[mi++].suit;
      trick.push(x);
      if (trick.length === NP) {
        let best = 0;
        for (let i = 1; i < 3; i++) {
          const a = trick[best].card;
          const b = trick[i].card;
          if (b.suit === a.suit ? orderOf(b) > orderOf(a) : b.suit === trump) best = i;
        }
        trick.forEach((y) => this.collected.set(y.card.id, trick[best].p));
        trick = [];
      }
    }
  }

  private trickSlot(p: number): { x: number; y: number; a: number } {
    const { x, y } = this.center;
    const cw = this.cw;
    if (p === 0) return { x, y: y + cw * 0.55, a: 0 };
    if (p === 1) return { x: x - cw * 0.75, y: y - cw * 0.25, a: -8 };
    return { x: x + cw * 0.75, y: y - cw * 0.25, a: 8 };
  }

  /** Where the discard slot for seat `to` is shown while the player chooses. */
  private giveSlot(to: number): { x: number; y: number } {
    const s = this.seats[to];
    if (this.portrait) return { x: to === 1 ? this.W * 0.3 : this.W * 0.7, y: this.prikupPos.y + 20 };
    return { x: s.x + (to === 1 ? 300 : -300), y: s.y + 60 };
  }

  /** Place every card where the model says it is. */
  private sync(animate: boolean): void {
    const d = this.deal;
    const dur = animate ? 280 : 0;
    const place = (id: number, x: number, y: number, up: boolean, depth: number, w: number, angle = 0, visible = true, alpha = 1) => {
      const v = this.views.get(id);
      if (!v) return;
      v.setVisible(visible);
      v.setDepth(depth);
      if (animate && Math.abs(v.alpha - alpha) > 0.01) this.tweens.add({ targets: v, alpha, duration: dur });
      else if (!animate) v.setAlpha(alpha);
      if (Math.abs(v.cw - w) > 0.5) v.setCardSize(w, w * 1.4);
      if (v.faceUp !== up) v.setFaceUp(up, animate);
      v.setDim(false);
      if (animate) {
        if (Math.abs(v.x - x) > 0.5 || Math.abs(v.y - y) > 0.5) v.glide(x, y, dur);
        if (Math.abs(v.angle - angle) > 0.5) this.tweens.add({ targets: v, angle, duration: dur });
      } else {
        v.stopGlide();
        v.setPosition(x, y).setAngle(angle);
      }
    };
    // Prikup
    d.prikup.forEach((c, i) => {
      const x = this.prikupPos.x + (i - 1) * this.cw * 1.08;
      place(c.id, x, this.prikupPos.y, this.st.peek.includes(c.id), 20 + i, this.cw);
    });
    // Collected tricks: fly to the winner and vanish
    for (const h of d.history) {
      if (d.trick.some((x) => x.card.id === h.card.id)) continue;
      const w = this.collected.get(h.card.id) ?? 0;
      const s = this.seats[w];
      place(h.card.id, s.x, s.y, true, 5, this.cw * 0.5, 0, true, 0);
    }
    // Trick
    d.trick.forEach((x, i) => {
      const s = this.trickSlot(x.p);
      place(x.card.id, s.x, s.y, true, 300 + i, this.cw, s.a);
    });
    // Discard selection
    const pending = new Set(this.giveSel.filter((x) => x !== null) as number[]);
    this.giveSel.forEach((id, to) => {
      if (id === null) return;
      const gs = this.giveSlot(to);
      place(id, gs.x, gs.y, true, 400, this.cw * 0.9, 0);
    });
    // Opponents
    for (let p = 1; p < NP; p++) {
      const seat = this.seats[p];
      const hand = d.hands[p];
      const n = hand.length;
      const open = this.st.xray || this.d.mode === 'etude';
      const sw = open ? (this.portrait ? 80 : 70) : this.portrait ? 64 : 58;
      const step = open ? (this.portrait ? Math.min(sw * 0.62, (this.W / 2 - 60 - sw) / Math.max(1, n - 1)) : sw * 0.62) : sw * 0.3;
      hand.forEach((c, k) => {
        const j = k - (n - 1) / 2;
        const known = open || this.st.peek.includes(c.id);
        if (this.portrait) place(c.id, seat.hx + j * step, seat.hy, known, 60 + k, sw, j * 2);
        else place(c.id, seat.hx, seat.hy + j * step * 1.25, known, 60 + k, sw, p === 1 ? 90 : -90);
      });
    }
    // My hand
    const mine = d.hands[0].filter((c) => !pending.has(c.id));
    this.layoutMyHand(mine, animate);
  }

  private layoutMyHand(hand: TCard[], animate: boolean): void {
    const n = hand.length;
    const W = this.W;
    const maxW = W - (this.portrait ? 40 : 520);
    const w = this.hcw * (n > 8 ? Math.max(0.8, 8 / n) : 1);
    const step = n > 1 ? Math.min(w * 0.78, (maxW - w) / (n - 1)) : 0;
    const x0 = W / 2 - (step * (n - 1)) / 2;
    const half = Math.max(1, (n - 1) / 2);
    const legal = new Set(this.myLegalCards().map((c) => c.id));
    const playing = this.deal.phase === 'play' && this.deal.turn === 0 && !this.busy;
    hand.forEach((c, i) => {
      const v = this.views.get(c.id);
      if (!v) return;
      const off = i - (n - 1) / 2;
      const x = x0 + i * step;
      const lift = playing && legal.has(c.id) ? 18 : 0;
      const y = this.handY + (off / half) * (off / half) * 26 - lift;
      v.setVisible(true).setAlpha(1);
      v.setDepth(1000 + i);
      if (Math.abs(v.cw - w) > 0.5) v.setCardSize(w, w * 1.4);
      if (!v.faceUp) v.setFaceUp(true, animate);
      const ang = (off / half) * Math.min(9, n * 1.1);
      if (animate) {
        if (Math.abs(v.x - x) > 0.5 || Math.abs(v.y - y) > 0.5) v.glide(x, y, 240);
        if (Math.abs(v.angle - ang) > 0.5) this.tweens.add({ targets: v, angle: ang, duration: 240 });
      } else {
        v.stopGlide();
        v.setPosition(x, y).setAngle(ang);
      }
      v.setDim(playing && !legal.has(c.id));
    });
  }

  private dealAnimation(): void {
    // Cards fly in from the top centre.
    const d = this.deal;
    const all = [...d.hands.flat(), ...d.prikup];
    all.forEach((c, i) => {
      const v = this.views.get(c.id);
      if (!v) return;
      const tx = v.x;
      const ty = v.y;
      const ta = v.angle;
      v.setPosition(this.W / 2, this.prikupPos.y).setAngle(0);
      this.tweens.add({ targets: v, x: tx, y: ty, angle: ta, duration: 260, delay: i * 22, ease: 'Cubic.Out' });
    });
    audio.play('deal');
  }

  /* ------------------------------------------------------------ HUD refresh */

  private refresh(): void {
    const d = this.deal;
    const m = this.m;
    for (let p = 0; p < NP; p++) {
      const s = this.seats[p];
      s.score?.setText(String(m.scores[p]));
      // Bid bubble / role under the name
      let info = '';
      if (d.phase === 'bid') info = d.lastBid[p] === -1 ? t('pass') : d.lastBid[p] > 0 ? String(d.lastBid[p]) : '';
      else if (p === d.declarer) info = `★ ${d.contract}`;
      s.info?.setText(info);
      s.info?.setColor(p === d.declarer || (d.phase === 'bid' && d.bidder === p) ? UI.gold : '#ffffff');
      s.bolts?.removeAll(true);
      const icons: string[] = [];
      for (let k = 0; k < m.bolts[p]; k++) icons.push('i_bolt');
      if (m.onBarrel(p)) icons.push('i_barrel');
      icons.forEach((ic, k) => s.bolts!.add(this.add.image((k - (icons.length - 1) / 2) * 40, 0, ic).setDisplaySize(38, 38)));
      if (s.avatar) {
        const active = d.phase !== 'done' && d.turn === p;
        s.avatar.setAlpha(active || d.phase === 'done' ? 1 : 0.82);
      }
    }
    // Trump badge
    this.trumpBadge.removeAll(true);
    const g = this.add.graphics();
    g.fillStyle(UI.inkN, 0.72).fillRoundedRect(-80, -50, 160, 100, 22);
    this.trumpBadge.add(g);
    this.trumpBadge.add(txt(this, 0, -24, t('trumpIs'), 22, '#ffffff'));
    if (d.trump === null) this.trumpBadge.add(txt(this, 0, 16, '—', 40, '#9aa3b8'));
    else this.trumpBadge.add(txt(this, 0, 18, SUIT_GLYPH[d.trump], 54, suitColor(d.trump)));
    // Contract line
    if (d.declarer >= 0 && (d.phase === 'play' || d.phase === 'done')) {
      const nm = this.nameOf(d.declarer);
      this.contractInfo.setText(t('contractLine', { name: nm, c: d.contract, n: d.declPoints() }));
    } else if (d.phase === 'bid') this.contractInfo.setText(t('bidLine', { n: d.bid, name: this.nameOf(d.bidder) }));
    else this.contractInfo.setText(d.declarer >= 0 ? t('contractLine0', { name: this.nameOf(d.declarer), c: d.bid }) : '');
    // Status
    let s = '';
    if (d.phase !== 'done') {
      if (d.turn === 0) s = d.phase === 'bid' ? t('st_bid') : d.phase === 'discard' ? t('st_discard') : d.phase === 'contract' ? t('st_contract') : t('st_play');
      else s = t('waiting', { name: this.nameOf(d.turn) });
    }
    this.status.setText(s).setColor(d.turn === 0 ? UI.gold : '#ffffff');
    // Booster badges
    for (const [id, b] of this.boosterBtns) {
      const n = save.data.boosters[id] ?? 0;
      b.setBadge(n > 0 ? String(n) : '▶');
      const usable = this.boosterUsable(id);
      b.setAlpha(usable ? 1 : 0.45);
    }
    if (this.cfg || this.d.mode === 'etude' || this.d.dealsLimit) this.buildGoalBox();
  }

  private nameOf(i: number): string {
    return i === 0 ? t('you') : this.d.opponents[i - 1]?.name ?? '?';
  }

  private myLegalCards(): TCard[] {
    const d = this.deal;
    if (this.ended || d.turn !== 0) return [];
    return d.phase === 'play' ? d.legalCards(0) : [];
  }

  /* ------------------------------------------------------------ turn loop */

  private step(): void {
    if (this.ended) return;
    this.looping = true;
    this.botTimer?.remove();
    this.botTimer = null;
    this.clearPanel();
    const d = this.deal;
    this.refresh();
    if (d.phase === 'done') return this.onDealDone();
    if (d.turn === 0) return this.playerTurn();
    const delay = SPEED_MS[save.data.settings.speed] * (d.phase === 'play' ? 0.9 : 1.1) * (0.8 + this.rng.next() * 0.4);
    this.botTimer = this.time.delayedCall(delay, () => this.botAct());
  }

  private botAct(): void {
    if (this.ended) return;
    if (pauseHub.paused) {
      this.botTimer = this.time.delayedCall(400, () => this.botAct());
      return;
    }
    const d = this.deal;
    const p = d.turn;
    if (p === 0 || d.phase === 'done') return this.step();
    const opp = this.d.opponents[p - 1];
    let acts: TAction[];
    if (this.d.mode === 'etude' && d.phase === 'play') acts = [{ t: 'play', p, card: bestCard(d, p).id }];
    else acts = decide(d, p, opp.ai, this.rng, { onBarrel: this.m.onBarrel(p) });
    if (!acts.length) acts = d.legal(p).slice(0, 1);
    void this.applyAll(acts);
  }

  /** Apply actions one by one with their animations, then continue the loop. */
  private async applyAll(acts: TAction[]): Promise<void> {
    this.busy = true;
    for (const a of acts) {
      if (this.ended) return;
      const ok = this.deal.apply(a);
      if (!ok) {
        // Fallback to any legal action for safety.
        const alt = this.deal.legal(a.p)[0];
        if (!alt || !this.deal.apply(alt)) break;
      }
      const evs = this.deal.events.slice();
      await this.animateEvents(evs);
    }
    this.busy = false;
    this.step();
  }

  private wait(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, () => res()));
  }

  private async animateEvents(evs: TEvent[]): Promise<void> {
    let trickDone = false;
    for (const e of evs) {
      switch (e.kind) {
        case 'bid':
          audio.play('bid');
          if (e.p > 0) this.bubble(e.p, String(e.v));
          if ((e.v ?? 0) >= 140 && e.p > 0 && this.rng.chance(0.4)) this.say(e.p, 'bidBig');
          break;
        case 'pass':
          audio.play('pass');
          if (e.p > 0) this.bubble(e.p, this.rng.chance(0.3) ? t('say_' + this.rng.pick(PHRASES.pass)) : t('pass'));
          break;
        case 'won':
          toast(this, t('wonBid', { name: this.nameOf(e.p), n: e.v ?? 0 }), UI.gold);
          break;
        case 'prikup': {
          // Reveal the prikup to everyone, then hand it to the declarer.
          for (const c of this.deal.prikupShown) this.views.get(c.id)?.setFaceUp(true, true);
          audio.play('flip');
          this.refresh();
          await this.wait(1300);
          break;
        }
        case 'give':
          audio.play('place');
          break;
        case 'contract':
          audio.play('bid');
          if (e.p > 0) this.bubble(e.p, t('plays', { n: e.v ?? 0 }));
          break;
        case 'rospis':
          audio.play('failed');
          this.bubble(e.p, t('rospisSay'));
          break;
        case 'marriage': {
          audio.play('marriage');
          this.banner(`${t('marriage')} ${SUIT_GLYPH[e.suit!]}  +${e.v}`, suitColor(e.suit!));
          if (e.p > 0) this.say(e.p, 'marriage');
          else this.emote(1 + this.rng.int(0, 1), 'surprised');
          break;
        }
        case 'play':
          audio.play(this.deal.trump !== null && e.card!.suit === this.deal.trump ? 'trump' : 'slap');
          break;
        case 'trick':
          trickDone = true;
          break;
      }
    }
    if (trickDone) {
      // Show the full trick, then sweep it to the winner.
      const last = this.deal.lastTrick;
      last.forEach((x, i) => {
        const v = this.views.get(x.card.id);
        const s = this.trickSlot(x.p);
        if (v) {
          v.setFaceUp(true, true);
          v.setDepth(300 + i);
          v.glide(s.x, s.y, 200);
          v.setAngle(s.a);
        }
      });
      this.refresh();
      await this.wait(Math.max(380, SPEED_MS[save.data.settings.speed] * 0.8));
      const w = this.deal.leader;
      last.forEach((x) => this.collected.set(x.card.id, w));
      audio.play('trick');
      if (this.st.xray) this.st.xray = false;
      this.sync(true);
      await this.wait(260);
    } else {
      this.sync(true);
      if (evs.some((e) => e.kind === 'give')) await this.wait(280);
    }
    this.refresh();
  }

  /* ------------------------------------------------------------ player */

  private playerTurn(): void {
    const d = this.deal;
    this.sync(true);
    if (d.phase === 'bid') this.bidPanel();
    else if (d.phase === 'discard') this.discardPanel();
    else if (d.phase === 'contract') this.contractPanel();
    else if (d.phase === 'play') {
      const legal = d.legalCards(0);
      if (save.data.settings.autoPlay && d.hands[0].length === 1 && legal.length === 1) this.time.delayedCall(450, () => this.playCard(legal[0].id));
      this.tipOnce('play', t('tut_play'));
    }
  }

  private clearPanel(): void {
    this.panel?.destroy();
    this.panel = null;
  }

  /** − value + selector with two action buttons (bidding and contract). */
  private valuePanel(min: number, max: number, start: number, mainLabel: (v: number) => string, onMain: (v: number) => void, second: { label: string; color: 'dark' | 'red'; fn: () => void } | null): void {
    this.clearPanel();
    const W = this.W;
    const port = this.portrait;
    const pw = Math.min(W - 40, 760);
    const ph = 250;
    const y = port ? this.handY - this.hcw * 1.55 - ph / 2 : this.center.y + 20;
    const c = this.add.container(W / 2, y).setDepth(2100);
    const g = this.add.graphics();
    g.fillStyle(UI.inkN, 0.92).fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 30);
    g.lineStyle(3, 0xd9a23a, 0.8).strokeRoundedRect(-pw / 2 + 6, -ph / 2 + 6, pw - 12, ph - 12, 26);
    c.add(g);
    let v = Math.max(min, Math.min(max, start));
    const val = txt(this, -40, -60, String(v), 64, '#ffffff');
    const mx = txt(this, 110, -60, `${t('max')}\n${max}`, 24, '#c9d1e6', { strokeThickness: 0 });
    const main = new Button(this, second ? -pw / 4 + 10 : 0, 60, { w: second ? pw / 2 - 40 : pw - 80, h: 96, color: 'green', label: mainLabel(v), size: 36 });
    const upd = () => {
      val.setText(String(v));
      main.setLabel(mainLabel(v));
    };
    const minus = new Button(this, -pw / 2 + 80, -60, { w: 100, h: 90, color: 'dark', label: '−', size: 56 }).onClick(() => {
      if (v - 5 >= min) v -= 5;
      upd();
    });
    const plus = new Button(this, pw / 2 - 80, -60, { w: 100, h: 90, color: 'dark', label: '+', size: 56 }).onClick(() => {
      if (v + 5 <= max) v += 5;
      upd();
    });
    main.onClick(() => onMain(v));
    c.add([val, mx, minus, plus, main]);
    if (second) c.add(new Button(this, pw / 4 - 10, 60, { w: pw / 2 - 40, h: 96, color: second.color, label: second.label, size: 34 }).onClick(second.fn));
    this.panel = c;
  }

  private bidPanel(): void {
    const d = this.deal;
    const max = d.maxBid(0);
    const min = d.minRaise;
    this.tipOnce('bid', t('tut_bid'));
    if (min > max) {
      // Cannot raise: only pass.
      this.clearPanel();
      const c = this.add.container(this.W / 2, this.portrait ? this.handY - this.hcw * 1.4 : this.center.y + 40).setDepth(2100);
      c.add(txt(this, 0, -70, t('cantRaise', { n: max }), 30, '#ffffff', { wordWrap: { width: this.W - 100 } }));
      c.add(new Button(this, 0, 20, { w: 320, h: 100, color: 'dark', label: t('pass'), size: 40 }).onClick(() => this.act({ t: 'pass', p: 0 })));
      this.panel = c;
      return;
    }
    this.valuePanel(min, max, min, (v) => t('bidBtn', { n: v }), (v) => this.act({ t: 'bid', p: 0, v }), { label: t('pass'), color: 'dark', fn: () => this.act({ t: 'pass', p: 0 }) });
  }

  private discardPanel(): void {
    this.clearPanel();
    this.tipOnce('discard', t('tut_discard'));
    const W = this.W;
    const c = this.add.container(0, 0).setDepth(2100);
    // Slots near both opponents
    for (const to of [1, 2]) {
      const s = this.giveSlot(to);
      if (this.giveSel[to] === null) c.add(this.add.image(s.x, s.y, 'card_slot').setDisplaySize(this.cw * 0.9, this.cw * 1.26));
      c.add(txt(this, s.x, s.y - this.cw * 0.78, t('forName', { name: this.nameOf(to) }), 24, '#ffffff'));
    }
    const ready = this.giveSel[1] !== null && this.giveSel[2] !== null;
    const by = this.portrait ? this.handY - this.hcw * 1.25 : this.center.y + 40;
    const ok = new Button(this, W / 2, by, { w: 360, h: 104, color: ready ? 'green' : 'grey', label: t('give'), size: 38 }).onClick(() => {
      if (this.giveSel[1] === null || this.giveSel[2] === null) return toast(this, t('st_discard'));
      const acts: TAction[] = [
        { t: 'give', p: 0, card: this.giveSel[1], to: 1 },
        { t: 'give', p: 0, card: this.giveSel[2], to: 2 },
      ];
      this.giveSel = [null, null, null];
      this.clearPanel();
      void this.applyAll(acts);
    });
    c.add(ok);
    this.panel = c;
  }

  private contractPanel(): void {
    const d = this.deal;
    const max = Math.max(d.bid, d.maxBid(0));
    this.tipOnce('contract', t('tut_contract'));
    this.valuePanel(
      d.bid,
      max,
      d.bid,
      (v) => t('playBtn', { n: v }),
      (v) => this.act({ t: 'contract', p: 0, v }),
      d.rules.rospis ? { label: t('rospis'), color: 'red', fn: () => confirm(this, t('rospisConfirm', { n: d.bid, k: d.rules.rospisPay === 'sixty' ? 60 : Math.round(d.bid / 10) * 5 }), () => this.act({ t: 'rospis', p: 0 })) } : null,
    );
  }

  private act(a: TAction): void {
    if (this.busy || this.ended || this.deal.turn !== 0) return;
    this.clearPanel();
    this.clearHint();
    if (a.t === 'bid' || a.t === 'contract') {
      if (a.t === 'contract') {
        save.data.totals.contracts++;
        this.st.myContracts++;
      }
    }
    void this.applyAll([a]);
  }

  private onCardTap(id: number): void {
    if (this.busy || this.ended || pauseHub.paused) return;
    const d = this.deal;
    if (d.turn !== 0) return;
    if (d.phase === 'discard') {
      // Toggle the card between the hand and the next free slot.
      const at = this.giveSel.indexOf(id);
      if (at >= 0) this.giveSel[at] = null;
      else if (d.hands[0].some((c) => c.id === id)) {
        const to = this.giveSel[1] === null ? 1 : this.giveSel[2] === null ? 2 : -1;
        if (to < 0) return;
        this.giveSel[to] = id;
      } else return;
      audio.play('place');
      this.sync(true);
      this.discardPanel();
      return;
    }
    if (d.phase === 'play') this.playCard(id);
  }

  private playCard(id: number): void {
    const d = this.deal;
    if (d.phase !== 'play' || d.turn !== 0 || this.busy) return;
    const ok = d.legalCards(0).some((c) => c.id === id);
    if (!ok) {
      if (!d.hands[0].some((c) => c.id === id)) return;
      audio.play('error', { vol: 0.4 });
      const v = this.views.get(id)!;
      this.tweens.add({ targets: v, x: v.x + 10, duration: 50, yoyo: true, repeat: 2 });
      if (d.trick.length) toast(this, t('mustFollow'), '#ffd166');
      return;
    }
    this.st.undo = d.clone();
    this.clearHint();
    void this.applyAll([{ t: 'play', p: 0, card: id }]);
  }

  /* ------------------------------------------------------------ deal end */

  private onDealDone(): void {
    if (this.ended) return;
    const d = this.deal;
    this.clearPanel();
    if (this.d.mode === 'etude') {
      const won = d.declPoints() >= this.st.etudeNeed;
      this.finish(won);
      return;
    }
    // Shield: a failed contract of the player costs nothing once.
    let shielded = false;
    if (this.st.shield && !this.st.shieldUsed && d.declarer === 0 && !d.rospis && d.declPoints() < d.contract) {
      this.st.shieldUsed = true;
      shielded = true;
    }
    const before = this.m.scores.slice();
    const row = this.m.finishDeal();
    if (shielded) {
      this.m.scores[0] = before[0];
      row.deltas[0] = 0;
      row.scores[0] = before[0];
      row.notes[0].push('shield' as any);
    }
    this.recordDealStats(row, d);
    if (this.cfg) goalUpdate(this.st.gs, row, d);
    this.st.summary = row;
    // Reactions
    if (d.declarer > 0) {
      this.say(d.declarer, row.made ? 'made' : 'failed');
      this.emote(d.declarer, row.made ? 'happy' : 'sad');
    }
    audio.play(d.declarer === 0 ? (row.made ? 'made' : 'failed') : row.made ? 'failed' : 'made');
    if (row.notes.some((n) => n.includes('bolt'))) this.time.delayedCall(500, () => audio.play('bolt'));
    if (row.notes.some((n) => n.includes('barrelOn'))) this.time.delayedCall(700, () => audio.play('barrel'));
    if (row.notes.some((n) => n.includes('samosval'))) this.time.delayedCall(900, () => audio.play('samosval'));
    this.refresh();
    this.time.delayedCall(900, () => this.showSummary(row));
  }

  private recordDealStats(row: Row, d: Deal): void {
    const s = save.data.totals;
    s.deals++;
    track('deals', 1);
    s.tricks += d.tricks[0];
    track('tricks', d.tricks[0]);
    for (const mm of d.marriageLog)
      if (mm.p === 0) {
        s.marriages++;
        track('marriage', 1);
        if (mm.suit === 1) {
          s.hearts++;
          track('hearts', 1);
        }
      }
    if (row.declarer === 0 && row.made && !row.rospis) {
      s.contractsMade++;
      s.bestContract = Math.max(s.bestContract, row.contract);
      track('contract', 1);
      if (row.contract >= 150) track('big', 1);
      if (row.notes[0].includes('barrelWin')) s.barrels++;
    }
    if (row.declarer !== 0 && !row.made) {
      s.defended++;
      track('defend', 1);
    }
    if (row.notes[0].includes('bolt')) s.bolts++;
    if (row.notes[0].includes('samosval')) s.samosvals++;
    save.save();
  }

  /** Is the game (level / match) over after this deal? Returns the outcome or null. */
  private outcome(): { won: boolean; place: number } | null {
    const m = this.m;
    const place = 1 + [1, 2].filter((p) => m.scores[p] > m.scores[0]).length;
    if (this.cfg) {
      const st = goalStatus(this.cfg, this.st.gs, m, this.st.extra);
      if (st === 'going') return null;
      return { won: st === 'won', place };
    }
    if (this.d.dealsLimit) return m.dealNo >= this.d.dealsLimit ? { won: place === 1, place } : null;
    if (m.over) return { won: m.winner === 0, place: m.winner === 0 ? 1 : place };
    return null;
  }

  private showSummary(row: Row): void {
    ads.inGameplay = false;
    platform.gameplayStop();
    const W = this.W;
    const d = this.deal;
    pauseHub.set('menu', true);
    const res = this.outcome();
    const mh = this.cfg ? 900 : 820;
    const mw = Math.min(W - 40, 940);
    const decl = row.declarer;
    const title = row.rospis ? t('rospisTitle') : row.made ? t('made') : t('failed');
    const m = openModal(this, `${t('dealN', { n: row.deal })} · ${title}`, mw, mh, () => (this.summaryModal = null), { closable: false, depth: 2700 });
    this.summaryModal = m;
    let y = m.y + 130;
    m.root.add(txt(this, W / 2, y, t('summaryLine', { name: this.nameOf(decl), c: row.contract, n: row.declPts }), 32, row.made ? '#9ff0c8' : '#ff9a9a', { wordWrap: { width: mw - 80 } }));
    y += 70;
    // Table: name | +delta | total | notes
    const cols = [m.x + 70, m.x + mw * 0.5, m.x + mw * 0.68, m.x + mw * 0.86];
    [t('player'), t('deal'), t('total'), ''].forEach((h, i) => m.root.add(txt(this, cols[i], y, h, 24, UI.gold).setOrigin(i === 0 ? 0 : 0.5, 0.5)));
    for (let p = 0; p < NP; p++) {
      const ry = y + 70 + p * 92;
      const face = p === 0 ? PLAYER_FACES[save.data.avatar % PLAYER_FACES.length] : this.d.opponents[p - 1].face;
      const key = p === 0 ? `me${save.data.avatar}` : `opp${p}_${this.d.opponents[p - 1].name}`;
      m.root.add(this.add.image(cols[0] + 36, ry, faceTex(this.textures, key, face)).setDisplaySize(72, 72));
      const nm = txt(this, cols[0] + 86, ry, this.nameOf(p) + (p === decl ? ' ★' : ''), 28, p === 0 ? UI.gold : '#ffffff').setOrigin(0, 0.5);
      if (nm.width > cols[1] - cols[0] - 130) nm.setScale((cols[1] - cols[0] - 130) / nm.width);
      m.root.add(nm);
      const dv = row.deltas[p];
      m.root.add(txt(this, cols[1], ry, (dv > 0 ? '+' : '') + dv, 34, dv > 0 ? '#9ff0c8' : dv < 0 ? '#ff9a9a' : '#ffffff'));
      m.root.add(txt(this, cols[2], ry, String(row.scores[p]), 34, '#ffffff'));
      const notes = row.notes[p].filter((n) => !['made', 'failed', 'rospis', 'golden'].includes(n));
      notes.forEach((n, k) => {
        const icon = n.startsWith('bolt') ? 'i_bolt' : n.startsWith('barrel') ? 'i_barrel' : n === 'samosval' ? 'i_refresh' : 'i_shield';
        m.root.add(this.add.image(cols[3] - 30 + k * 50, ry, icon).setDisplaySize(44, 44));
      });
      if (notes.length) m.root.add(txt(this, cols[3] + 40, ry + 34, t('note_' + notes[notes.length - 1]), 18, '#ffd166', { strokeThickness: 2 }));
    }
    y += 70 + 3 * 92 + 10;
    if (this.cfg) {
      const pr = goalProgress(this.cfg, this.st.gs, this.m);
      m.root.add(txt(this, W / 2, y, `${goalText(this.cfg)}: ${Math.min(pr.cur, pr.need)}/${pr.need}`, 28, '#ffffff', { wordWrap: { width: mw - 60 } }));
      m.root.add(progressBar(this, W / 2, y + 44, mw - 160, 22, pr.need ? pr.cur / pr.need : 0, 0xd9a23a));
      y += 90;
    }
    const by = m.y + mh - 100;
    if (res) {
      const lostByDeals = !res.won && this.cfg && !this.m.over && !this.st.secondChance && this.cfg.goal.k !== 'barrel';
      if (lostByDeals) {
        m.root.add(txt(this, W / 2, by - 120, t('outOfDeals'), 30, '#ff9a9a'));
        m.root.add(
          new Button(this, W / 2 - 200, by, { w: 380, h: 116, color: 'purple', label: t('moreDeals'), size: 32, ad: true }).onClick(() =>
            watchAd(this, 'second_chance', () => {
              this.st.secondChance = true;
              this.st.extra += 2;
              m.close();
              this.nextDeal(false);
            }),
          ),
        );
        m.root.add(new Button(this, W / 2 + 200, by, { w: 340, h: 116, color: 'dark', label: t('results'), size: 36 }).onClick(() => this.finish(false)));
      } else {
        m.root.add(new Button(this, W / 2, by, { w: 420, h: 120, color: res.won ? 'gold' : 'dark', label: t('results'), size: 40 }).onClick(() => this.finish(res.won, res.place)));
      }
    } else {
      m.root.add(new Button(this, W / 2 - 200, by, { w: 340, h: 116, color: 'dark', label: t('sheet'), icon: 'i_sheet', iconSize: 60, size: 32 }).onClick(() => this.showSheet()));
      m.root.add(
        new Button(this, W / 2 + 200, by, { w: 360, h: 116, color: 'green', label: t('nextDeal'), size: 36 }).onClick(() => {
          m.close();
          this.nextDeal(true);
        }),
      );
    }
    void d;
  }

  private async nextDeal(adPoint: boolean): Promise<void> {
    pauseHub.set('menu', false);
    // A long match is a natural pause point between deals: every third deal may show a fullscreen ad.
    if (adPoint && this.m.dealNo % 3 === 0) await ads.interstitial('next_deal');
    if (this.ended) return;
    this.looping = false;
    ads.inGameplay = true;
    platform.gameplayStart();
    this.startDeal(true);
    this.buildViews();
    this.sync(false);
    this.refresh();
    audio.play('shuffle');
    this.dealAnimation();
    this.time.delayedCall(700, () => this.step());
  }

  private finish(won: boolean, place = won ? 1 : 3): void {
    if (this.ended) return;
    this.ended = true;
    this.botTimer?.remove();
    pauseHub.set('menu', false);
    const m = this.m;
    audio.play(won ? 'win' : 'lose');
    this.go('Result', {
      mode: this.d.mode,
      won,
      place,
      scores: m.scores.slice(),
      names: [0, 1, 2].map((p) => this.nameOf(p)),
      opponents: this.d.opponents,
      world: this.d.world,
      level: this.d.level,
      etude: this.d.etude,
      ctx: this.d.ctx,
      gs: this.st.gs,
      gain: m.scores[0] - (this.cfg?.start?.[0] ?? 0),
      deals: m.dealNo,
      stars: this.cfg && won ? goalStars(this.cfg, this.st.gs, m) : 0,
      myContracts: this.st.myContracts,
    });
  }

  /* ------------------------------------------------------------ boosters */

  private boosterUsable(id: BoosterId): boolean {
    const d = this.deal;
    if (this.ended || this.busy) return false;
    switch (id) {
      case 'hint':
        return d.turn === 0 && d.phase !== 'done';
      case 'peek':
        return d.phase === 'bid' ? d.prikup.some((c) => !this.st.peek.includes(c.id)) : d.phase === 'play' && this.d.mode !== 'etude';
      case 'undo':
        return d.phase === 'play' && !!this.st.undo && !this.st.undoUsed && d.turn === 0;
      case 'xray':
        return d.phase === 'play' && !this.st.xray && this.d.mode !== 'etude';
      case 'counter':
        return d.phase === 'play' || d.phase === 'done';
      case 'redeal':
        return d.phase === 'bid' && this.d.mode !== 'etude' && this.d.mode !== 'daily';
    }
    return false;
  }

  private onBooster(id: BoosterId): void {
    if (!this.boosterUsable(id)) {
      audio.play('error', { vol: 0.4 });
      return toast(this, t(`b_${id}_when`), '#ffd166');
    }
    if (id === 'counter' && this.st.counter) return this.showCounter();
    const run = () => {
      if (!this.boosterUsable(id)) return;
      if (id === 'hint') this.showHint();
      else if (id === 'peek') this.usePeek();
      else if (id === 'undo') this.useUndo();
      else if (id === 'xray') this.useXray();
      else if (id === 'counter') this.showCounter();
      else if (id === 'redeal') this.useRedeal();
      this.refresh();
    };
    if (useBooster(id)) return run();
    const W = this.W;
    pauseHub.set('menu', true);
    const m = openModal(this, t(`b_${id}`), Math.min(W - 60, 820), 600, () => pauseHub.set('menu', false), { depth: 2600 });
    m.root.add(this.add.image(W / 2, m.y + 200, `i_${{ hint: 'hint', peek: 'eye', undo: 'undo', xray: 'xray', counter: 'stats', redeal: 'shuffle', lucky: 'clover', shield: 'shield', extra: 'plusdeal' }[id]}`).setDisplaySize(130, 130));
    m.root.add(txt(this, W / 2, m.y + 330, t(`b_${id}_d`), 34, '#ffffff', { wordWrap: { width: m.w - 80 } }));
    m.root.add(
      new Button(this, W / 2 - 180, m.y + m.h - 110, { w: 320, h: 116, color: 'green', label: t('free'), size: 36, ad: true }).onClick(() => {
        m.close();
        void watchAd(this, `game_${id}`, run);
      }),
    );
    const price = id === 'hint' || id === 'undo' ? 60 : id === 'xray' ? 150 : 100;
    m.root.add(
      new Button(this, W / 2 + 180, m.y + m.h - 110, { w: 300, h: 116, color: 'gold', label: String(price), icon: 'i_coin', size: 40 }).onClick(() => {
        if (!spendCoins(price)) return toast(this, t('notEnough'), '#ff8a8a');
        audio.play('buy');
        m.close();
        run();
      }),
    );
  }

  private showHint(): void {
    const d = this.deal;
    audio.play('hint');
    const rng = new Rng(this.st.seed + d.history.length * 31 + 7);
    if (d.phase === 'bid' || d.phase === 'contract') {
      const adv = bidAdvice(d, 0, rng);
      const W = this.W;
      pauseHub.set('menu', true);
      const m = openModal(this, t('b_hint'), Math.min(W - 60, 860), 620, () => pauseHub.set('menu', false), { depth: 2600 });
      m.root.add(txt(this, W / 2, m.y + 150, t('adviceRange'), 30, '#cfd6e6'));
      // Small chart: pessimistic / typical / optimistic.
      const vals: [string, number, number][] = [
        [t('adv_low'), adv.low, 0xc8323c],
        [t('adv_mid'), adv.mid, 0xd9a23a],
        [t('adv_high'), adv.high, 0x2c9a52],
      ];
      const maxV = Math.max(160, adv.high);
      vals.forEach(([label, v, col], i) => {
        const x = W / 2 + (i - 1) * 220;
        const bh = Math.max(10, (Math.max(0, v) / maxV) * 200);
        const g = this.add.graphics();
        g.fillStyle(col, 1).fillRoundedRect(x - 50, m.y + 420 - bh, 100, bh, 12);
        m.root.add(g);
        m.root.add(txt(this, x, m.y + 400 - bh, String(v), 32, '#ffffff'));
        m.root.add(txt(this, x, m.y + 450, label, 24, '#ffffff'));
      });
      const max = d.phase === 'bid' ? d.maxBid(0) : Math.max(d.bid, d.maxBid(0));
      const adviceText = d.phase === 'bid' ? (adv.advice >= d.minRaise ? t('adviseBid', { n: Math.min(max, adv.advice) }) : t('advisePass')) : adv.advice >= d.bid ? t('advisePlay', { n: Math.min(max, Math.max(d.bid, adv.advice)) }) : t('adviseRospis');
      m.root.add(txt(this, W / 2, m.y + 530, adviceText, 34, UI.gold, { wordWrap: { width: m.w - 60 } }));
      return;
    }
    if (d.phase === 'discard') {
      const acts = decide(d, 0, PROFILES.king, rng);
      this.giveSel = [null, null, null];
      for (const a of acts) if (a.t === 'give') this.giveSel[a.to] = a.card;
      this.sync(true);
      this.discardPanel();
      return;
    }
    if (d.phase === 'play') {
      const card = this.d.mode === 'etude' ? bestCard(d, 0) : (decide(d, 0, PROFILES.king, rng)[0] as { card: number }).card;
      const v = this.views.get(typeof card === 'number' ? card : (card as TCard).id);
      v?.setGlow(true);
      this.hintGlow = v ?? null;
    }
  }

  private clearHint(): void {
    this.hintGlow?.setGlow(false);
    this.hintGlow = null;
  }

  private usePeek(): void {
    const d = this.deal;
    audio.play('hint');
    if (d.phase === 'bid') {
      const pool = d.prikup.filter((c) => !this.st.peek.includes(c.id));
      if (pool.length) this.st.peek.push(this.rng.pick(pool).id);
    } else {
      const pool = [...d.hands[1], ...d.hands[2]].filter((c) => !this.st.peek.includes(c.id));
      for (let k = 0; k < 2 && pool.length; k++) {
        const c = pool.splice(this.rng.int(0, pool.length - 1), 1)[0];
        this.st.peek.push(c.id);
      }
    }
    this.sync(true);
  }

  private useUndo(): void {
    if (!this.st.undo) return;
    this.botTimer?.remove();
    this.st.m.deal = this.st.undo;
    this.st.undo = null;
    this.st.undoUsed = true;
    audio.play('whoosh');
    this.rebuildCollected();
    this.sync(true);
    this.step();
  }

  private useXray(): void {
    this.st.xray = true;
    audio.play('hint');
    this.sync(true);
    toast(this, t('xrayOn'), '#9ad1ff');
  }

  private useRedeal(): void {
    this.botTimer?.remove();
    this.looping = false;
    this.st.redealSalt++;
    this.m.redeal(this.st.redealSalt);
    this.st.peek = [];
    this.buildViews();
    this.sync(false);
    audio.play('shuffle');
    this.dealAnimation();
    this.time.delayedCall(600, () => this.step());
  }

  private showCounter(): void {
    this.st.counter = true;
    const d = this.deal;
    const W = this.W;
    pauseHub.set('menu', true);
    const m = openModal(this, t('b_counter'), Math.min(W - 40, 1000), 820, () => pauseHub.set('menu', false), { depth: 2600 });
    const out = new Set(d.history.map((h) => h.card.id));
    const mine = new Set(d.hands[0].map((c) => c.id));
    const ranks = [14, 10, 13, 12, 11, 9];
    const cell = Math.min(120, (m.w - 200) / ranks.length);
    const all = d.allCards;
    for (let s = 0; s < 4; s++) {
      const y = m.y + 170 + s * 140;
      m.root.add(txt(this, m.x + 70, y, SUIT_GLYPH[s], 56, suitColor(s)));
      ranks.forEach((r, k) => {
        const c = all.find((x) => x.suit === s && x.rank === r);
        if (!c) return;
        const a = out.has(c.id) ? 0.22 : mine.has(c.id) ? 0.65 : 1;
        m.root.add(this.add.image(m.x + 140 + k * cell + cell / 2, y, skin.face(s, r)).setDisplaySize(cell - 8, (cell - 8) * 1.4).setAlpha(a));
      });
    }
    m.root.add(txt(this, W / 2, m.y + m.h - 60, t('counterLegend'), 22, '#cfd6e6', { strokeThickness: 0, wordWrap: { width: m.w - 60 } }));
  }

  /* ------------------------------------------------------------ sheet */

  private showSheet(): void {
    const W = this.W;
    const H = this.H;
    pauseHub.set('menu', true);
    const rows = this.m.rows;
    const mw = Math.min(W - 40, 940);
    const mh = Math.min(H - 160, 300 + Math.max(4, rows.length) * 64);
    const m = openModal(this, t('sheet'), mw, mh, () => {
      if (!this.st.summary) pauseHub.set('menu', false);
    }, { depth: 2800 });
    const cols = [m.x + 80, m.x + mw * 0.36, m.x + mw * 0.58, m.x + mw * 0.8];
    const y0 = m.y + 120;
    m.root.add(txt(this, cols[0], y0, '#', 26, UI.gold));
    for (let p = 0; p < NP; p++) {
      const nm = txt(this, cols[p + 1], y0, this.nameOf(p), 26, UI.gold);
      if (nm.width > mw * 0.2) nm.setScale((mw * 0.2) / nm.width);
      m.root.add(nm);
    }
    const shown = rows.slice(-Math.floor((mh - 240) / 64));
    shown.forEach((r, i) => {
      const y = y0 + 60 + i * 64;
      m.root.add(txt(this, cols[0], y, String(r.deal), 26, '#ffffff'));
      for (let p = 0; p < NP; p++) {
        const s = `${r.scores[p]}${p === r.declarer ? (r.rospis ? ' ✕' : r.made ? ' ★' : ' ✗') : ''}`;
        m.root.add(txt(this, cols[p + 1], y, s, 28, p === r.declarer ? (r.made ? '#9ff0c8' : '#ff9a9a') : '#ffffff'));
      }
    });
    if (!rows.length) m.root.add(txt(this, W / 2, y0 + 120, t('sheetEmpty'), 28, '#cfd6e6'));
    const r = this.d.rules;
    const rl = [t('target', { n: r.target }), r.barrel ? t('r_barrel', { n: barrelAt(r) }) : '', r.bolts ? t('r_bolts') : '', r.samosval ? t('r_samosval') : ''].filter(Boolean).join(' · ');
    m.root.add(txt(this, W / 2, m.y + mh - 50, rl, 22, '#cfd6e6', { strokeThickness: 0, wordWrap: { width: mw - 60 } }));
  }

  /* ------------------------------------------------------------ chatter */

  private banner(s: string, color: string): void {
    const b = txt(this, this.W / 2, this.center.y - this.cw * 1.4, s, 64, color).setDepth(3500).setScale(0.3);
    this.tweens.add({ targets: b, scale: 1, duration: 300, ease: 'Back.Out' });
    this.tweens.add({ targets: b, alpha: 0, y: b.y - 60, delay: 1300, duration: 400, onComplete: () => b.destroy() });
  }

  private say(i: number, kind: keyof typeof PHRASES): void {
    if (i <= 0 || !this.seats[i]) return;
    this.bubble(i, t(`say_${this.rng.pick(PHRASES[kind])}`));
  }

  private bubble(i: number, text: string): void {
    const s = this.seats[i];
    s.bubble?.destroy();
    const bx = Phaser.Math.Clamp(i === 1 ? s.x + 190 : i === 2 ? s.x - 190 : s.x + 150, 200, this.W - 200);
    const by = i === 0 ? s.y - 120 : s.y - 110;
    const c = this.add.container(bx, by).setDepth(3000);
    const tt = txt(this, 0, 0, text, 30, '#1a1426', { strokeThickness: 0, wordWrap: { width: 320 } });
    const g = this.add.graphics();
    g.fillStyle(0xfff6e0, 1).fillRoundedRect(-tt.width / 2 - 20, -tt.height / 2 - 14, tt.width + 40, tt.height + 28, 20);
    g.lineStyle(3, 0xc9a55c, 1).strokeRoundedRect(-tt.width / 2 - 20, -tt.height / 2 - 14, tt.width + 40, tt.height + 28, 20);
    c.add([g, tt]);
    s.bubble = c;
    c.setScale(0.5);
    this.tweens.add({ targets: c, scale: 1, duration: 160, ease: 'Back.Out' });
    this.time.delayedCall(1700, () => {
      if (s.bubble === c) {
        this.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: () => c.destroy() });
        s.bubble = undefined;
      }
    });
  }

  private emote(i: number, emo: Emotion): void {
    const s = this.seats[i];
    if (!s?.avatar) return;
    const face = i === 0 ? PLAYER_FACES[save.data.avatar % PLAYER_FACES.length] : this.d.opponents[i - 1].face;
    const key = i === 0 ? `me${save.data.avatar}` : `opp${i}_${this.d.opponents[i - 1].name}`;
    const size = s.avatar.displayWidth;
    s.avatar.setTexture(faceTex(this.textures, key, face, emo)).setDisplaySize(size, size);
    this.time.delayedCall(1600, () => s.avatar?.active && s.avatar.setTexture(faceTex(this.textures, key, face, 'neutral')).setDisplaySize(size, size));
  }

  private openEmotes(): void {
    const W = this.W;
    pauseHub.set('menu', true);
    const m = openModal(this, t('emotes'), Math.min(W - 60, 860), 640, () => pauseHub.set('menu', false), { depth: 2600 });
    const list = EMOTE_IDS.filter((e) => save.data.emotes.includes(e));
    list.forEach((e, k) => {
      const x = W / 2 + ((k % 3) - 1) * 260;
      const y = m.y + 170 + Math.floor(k / 3) * 120;
      const b = new Button(this, x, y, { w: 240, h: 100, color: 'dark', label: e.startsWith('say_') ? t(e) : ' ', size: 22 });
      if (!e.startsWith('say_')) b.add(this.add.image(0, -4, faceTex(this.textures, `me${save.data.avatar}`, PLAYER_FACES[save.data.avatar % PLAYER_FACES.length], e as Emotion)).setDisplaySize(84, 84));
      b.onClick(() => {
        m.close();
        audio.play('emote');
        if (e.startsWith('say_')) this.bubble(0, t(e));
        else this.emote(0, e as Emotion);
        const j = 1 + this.rng.int(0, 1);
        this.time.delayedCall(900, () => this.emote(j, this.rng.pick(['happy', 'smug', 'angry', 'surprised'] as Emotion[])));
      });
      m.root.add(b);
    });
  }

  /* ------------------------------------------------------------ pause / tutorial */

  private openPause(): void {
    if (this.ended) return;
    pauseHub.set('menu', true);
    const W = this.W;
    const quit = (to: { key: string; data: object }) =>
      confirm(this, t('quitConfirm'), () => {
        pauseHub.set('menu', false);
        this.ended = true;
        this.botTimer?.remove();
        // Leaving counts as a lost game, then straight to the chosen screen.
        this.go('Result', { mode: this.d.mode, won: false, place: 3, quit: true, scores: this.m.scores.slice(), names: [0, 1, 2].map((p) => this.nameOf(p)), opponents: this.d.opponents, world: this.d.world, level: this.d.level, etude: this.d.etude, ctx: this.d.ctx, gs: this.st.gs, gain: 0, deals: this.m.dealNo, autoNext: to });
      });
    const away = (key: string) => {
      pauseHub.set('menu', false);
      this.botTimer?.remove();
      this.go(key, { from: 'Game', back: { ...this.d, state: this.st } });
    };
    const items: PauseItem[] = [
      { label: t('continue'), icon: 'play', color: 'green', fn: () => m.close() },
      { label: t('mainMenu'), icon: 'home', color: 'blue', fn: () => quit({ key: 'Menu', data: {} }) },
    ];
    if (this.d.mode === 'career') items.push({ label: t('map'), icon: 'map', color: 'blue', fn: () => quit({ key: 'Map', data: {} }) });
    if (this.d.mode === 'etude') items.push({ label: t('etudeList'), icon: 'hint', color: 'blue', fn: () => quit({ key: 'Etudes', data: {} }) });
    if (this.d.mode !== 'career' && this.d.mode !== 'etude') items.push({ label: t('modes'), icon: 'cards', color: 'blue', fn: () => quit({ key: 'Modes', data: {} }) });
    items.push(
      { label: t('shop'), icon: 'cart', color: 'gold', fn: () => away('Shop') },
      { label: t('settings'), icon: 'gear', color: 'dark', fn: () => away('Settings') },
      {
        label: t('rules'),
        icon: 'rules',
        color: 'dark',
        fn: () => {
          m.close();
          pauseHub.set('menu', true);
          const r = openModal(this, t('rules'), Math.min(W - 60, 960), Math.min(this.H - 200, 1400), () => pauseHub.set('menu', false), { depth: 2700 });
          r.root.add(txt(this, W / 2, r.y + 110, t('r_short'), 26, '#ffffff', { wordWrap: { width: r.w - 80 }, align: 'left', strokeThickness: 0 }).setOrigin(0.5, 0));
        },
      },
    );
    const m: Modal = openPauseMenu(this, t('pause'), items, () => pauseHub.set('menu', false));
  }

  private tipOnce(key: string, text: string): void {
    const tut = save.data.tutorial;
    if (tut[key]) return;
    tut[key] = true;
    save.save();
    pauseHub.set('menu', true);
    showTip(this, text, undefined, () => pauseHub.set('menu', false));
  }

  private tutorial(done: () => void): void {
    const tut = save.data.tutorial;
    const tips: string[] = [];
    const topic = this.cfg?.tut;
    if (!tut.intro && this.d.mode !== 'etude') {
      tut.intro = true;
      tips.push(t('tut_intro'));
    }
    if (topic && !tut['t_' + topic]) {
      tut['t_' + topic] = true;
      tips.push(t('tut_' + topic));
    }
    if (this.d.mode === 'etude' && !tut.etude) {
      tut.etude = true;
      tips.push(t('tut_etude'));
    }
    save.save();
    const next = () => {
      const tip = tips.shift();
      if (!tip) {
        pauseHub.set('menu', false);
        done();
        return;
      }
      pauseHub.set('menu', true);
      showTip(this, tip, undefined, next);
    };
    next();
  }

  update(): void {
    // Safety net: nobody scheduled and it's a bot's turn.
    if (this.looping && !this.ended && !this.busy && !pauseHub.paused && !this.st.summary && this.deal.phase !== 'done' && this.deal.turn !== 0 && (!this.botTimer || this.botTimer.getOverallProgress() >= 1)) this.step();
  }
}

const orderOf = (c: TCard): number => ({ 9: 0, 11: 1, 12: 2, 13: 3, 10: 4, 14: 5 })[c.rank] ?? 0;

/** Human text of a station goal. */
export function goalText(cfg: LevelCfg): string {
  const g = cfg.goal;
  switch (g.k) {
    case 'marriage':
      return g.suit !== undefined ? t('g_marriageSuit', { s: SUIT_GLYPH[g.suit], v: MARRIAGE[g.suit] }) : t('g_marriage', { n: g.n });
    default:
      return t('g_' + g.k, { n: g.n, d: cfg.deals });
  }
}
