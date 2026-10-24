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
import { openModal } from '@shared/ui/modal';
import { Button, IconButton, toast, txt, UI } from '@shared/ui/widgets';
import { faceTex, PLAYER_FACES } from '../art/avatars';
import type { Emotion } from '../art/faces';
import type { Opponent } from '../data/locations';
import { EMOTE_IDS } from '../data/meta';
import { PHRASES } from '../data/opponents';
import { decide, heuristic, maybeCheat, PROFILES } from '../logic/ai';
import { bestMove } from '../logic/puzzles';
import { Durak, type DAction, type DCard, type DRules } from '../logic/durak';
import { spendCoins, track, useBooster } from '../progress';
import { save, type BoosterId, type ModeId } from '../save';
import { skin, texRank } from '../skin';
import { confirm, watchAd } from '../ui/common';
import { showTip } from '../ui/tutorial';

export interface MatchInfo {
  wins: number;
  losses: number;
  need: number;
  deal: number;
}

export interface GameData {
  mode: ModeId;
  rules: DRules;
  opponents: Opponent[];
  loc: number;
  seed?: number;
  tableIdx?: number;
  match?: MatchInfo;
  boosters?: BoosterId[];
  /** Puzzle: preset hands, both open. */
  puzzle?: { n: number; hands: DCard[][]; trump: DCard; attacker: number };
  /** Tournament / daily context passed through to the result screen. */
  ctx?: any;
  state?: GameState;
}

interface GameState {
  g: Durak;
  seed: number;
  peek: number[];
  counter: boolean;
  shield: boolean;
  bribe: boolean;
  cheatArmed: boolean;
  moves: number;
  startedAt: number;
  beatenByMe: number;
  transfers: number;
  lastCardTrump: boolean;
}

interface Seat {
  x: number;
  y: number;
  /** Where that player's (face-down) cards fan out. */
  hx: number;
  hy: number;
  avatar?: Phaser.GameObjects.Image;
  name?: Phaser.GameObjects.Text;
  count?: Phaser.GameObjects.Text;
  role?: Phaser.GameObjects.Image;
  bubble?: Phaser.GameObjects.Container;
}

const SPEED_MS = [0, 1100, 750, 420];

export class GameScene extends BaseScene {
  private st!: GameState;
  private d!: GameData;
  private views = new Map<number, CardView>();
  private seats: Seat[] = [];
  private cw = 150;
  private ch = 210;
  private hcw = 170;
  private tableRect = new Phaser.Geom.Rectangle();
  private talonPos = { x: 0, y: 0 };
  private discardPos = { x: 0, y: 0 };
  private selected: number | null = null;
  private busy = false;
  private botTimer: Phaser.Time.TimerEvent | null = null;
  private status!: Phaser.GameObjects.Text;
  private btnMain!: Button;
  private btnTransfer!: Button;
  private btnCatch: Button | null = null;
  private btnCheat: Button | null = null;
  private talonCount!: Phaser.GameObjects.Text;
  private trumpBadge!: Phaser.GameObjects.Container;
  private pairZones: Phaser.GameObjects.Zone[] = [];
  private pairGlows: Phaser.GameObjects.Image[] = [];
  private hintGlow: CardView | null = null;
  private rng = new Rng(1);
  private ended = false;
  private drag: { id: number; sx: number; sy: number; moved: boolean } | null = null;

  constructor() {
    super('Game');
  }

  get g(): Durak {
    return this.st.g;
  }

  create(data: GameData): void {
    this.d = data;
    this.views = new Map();
    this.seats = [];
    this.selected = null;
    this.busy = false;
    this.ended = false;
    this.botTimer = null;
    this.pairZones = [];
    this.pairGlows = [];
    this.hintGlow = null;
    this.btnCatch = null;
    this.btnCheat = null;
    this.drag = null;
    const first = !data.state;
    this.st = data.state ?? this.newState();
    this.sceneData = { ...data, state: this.st };
    this.rng = new Rng(this.st.seed ^ (Date.now() & 0xffff));

    this.add.image(0, 0, skin.table(this.W, this.H, data.loc)).setOrigin(0);
    this.computeLayout();
    this.buildSeats();
    this.buildTableUi();
    this.buildHud();
    this.buildViews();
    this.sync(false);
    this.refresh();

    audio.playMusic(data.opponents.some((o) => o.boss) ? 'boss' : 'game');
    ads.inGameplay = true;
    platform.gameplayStart();
    const unsub = pauseHub.subscribe((p) => (p ? this.tweens.pauseAll() : this.tweens.resumeAll()));
    this.events.once('shutdown', () => {
      ads.inGameplay = false;
      platform.gameplayStop();
      unsub();
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onDragMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onDragEnd(p));
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p') this.openPause();
      else if (e.key === ' ' || e.key === 'Enter') this.onMain();
    });
    this.setupScene();
    if (first) {
      if (data.boosters?.includes('peek')) this.usePeek(false);
      if (data.boosters?.includes('counter')) this.st.counter = true;
      if (data.boosters?.includes('shield')) this.st.shield = true;
      this.time.delayedCall(500, () => this.tutorial());
    }
    this.scheduleBot();
  }

  protected onResize(): void {
    this.botTimer?.remove();
    this.scene.restart({ ...this.d, state: this.st });
  }

  private newState(): GameState {
    const d = this.d;
    const seed = d.seed ?? (Math.random() * 2 ** 31) >>> 0;
    let g: Durak;
    if (d.puzzle) {
      g = new Durak({ ...d.rules, players: 2 }, seed, d.puzzle.attacker);
      g.talon = [];
      g.trump = d.puzzle.trump;
      g.players[0].hand = d.puzzle.hands[0].map((c) => ({ ...c }));
      g.players[1].hand = d.puzzle.hands[1].map((c) => ({ ...c }));
      g.firstBout = false;
      g.boutLimit = Math.min(6, g.players[g.defender].hand.length);
      for (const p of g.players) g.sortHand(p.hand);
    } else g = new Durak(d.rules, seed);
    return { g, seed, peek: [], counter: false, shield: false, bribe: false, cheatArmed: false, moves: 0, startedAt: Date.now(), beatenByMe: 0, transfers: 0, lastCardTrump: false };
  }

  /* ------------------------------------------------------------ layout */

  private computeLayout(): void {
    const W = this.W;
    const H = this.H;
    const port = this.portrait;
    const n = this.d.rules.players;
    this.cw = port ? 150 : 140;
    this.ch = this.cw * 1.4;
    this.hcw = port ? 175 : 160;
    if (port) {
      const top = n === 4 ? 560 : 470;
      this.tableRect.setTo(150, top, W - 300, H - top - 640);
      this.talonPos = { x: 95, y: top + this.tableRect.height / 2 };
      this.discardPos = { x: W - 95, y: top + this.tableRect.height / 2 };
    } else {
      this.tableRect.setTo(360, 300, W - 720, H - 300 - 330);
      this.talonPos = { x: n === 4 ? 330 : 190, y: H / 2 - 30 };
      this.discardPos = { x: n === 4 ? W - 330 : W - 190, y: H / 2 - 30 };
    }
  }

  /** Clockwise seats: 0 is the player at the bottom. */
  private seatPos(i: number): { x: number; y: number } {
    const W = this.W;
    const H = this.H;
    const n = this.d.rules.players;
    const port = this.portrait;
    if (i === 0) return { x: W / 2, y: H - 120 };
    const layouts: Record<number, [number, number][]> = port
      ? {
          2: [[W / 2, 250]],
          3: [[W * 0.22, 260], [W * 0.78, 260]],
          4: [[W * 0.14, 430], [W / 2, 240], [W * 0.86, 430]],
        }
      : {
          2: [[W / 2, 125]],
          3: [[W * 0.27, 125], [W * 0.73, 125]],
          4: [[130, H * 0.36], [W / 2, 125], [W - 130, H * 0.36]],
        };
    const [x, y] = layouts[n][i - 1];
    return { x, y };
  }

  private buildSeats(): void {
    const n = this.d.rules.players;
    for (let i = 0; i < n; i++) {
      const p = this.seatPos(i);
      const seat: Seat = { x: p.x, y: p.y, hx: p.x, hy: p.y };
      if (i === 0) {
        seat.hx = this.W / 2;
        seat.hy = this.H - (this.portrait ? 300 : 175);
        this.seats.push(seat);
        continue;
      }
      const opp = this.d.opponents[i - 1];
      const size = this.portrait ? 150 : 130;
      const side = this.portrait ? 0 : p.x < this.W * 0.2 ? 1 : p.x > this.W * 0.8 ? -1 : 0;
      seat.hx = p.x + (side ? side * 160 : size * 0.95);
      seat.hy = p.y + (side ? 40 : 10);
      if (this.portrait && n === 4 && i !== 2) {
        seat.hx = p.x;
        seat.hy = p.y + 150;
      }
      if (this.portrait && n === 3) {
        seat.hx = p.x + (i === 1 ? 1 : -1) * 150;
        seat.hy = p.y + 20;
      }
      const g = this.add.graphics().setDepth(40);
      g.fillStyle(UI.inkN, 0.55).fillRoundedRect(p.x - size * 0.75, p.y - size / 2 - 10, size * 1.5, size + 66, 26);
      seat.avatar = this.add.image(p.x, p.y, faceTex(this.textures, `opp${i}_${opp.name}`, opp.face)).setDisplaySize(size, size).setDepth(41);
      seat.name = txt(this, p.x, p.y + size / 2 + 22, opp.name, 28, opp.boss ? '#ffd166' : '#ffffff').setDepth(41);
      if (seat.name.width > size * 1.5) seat.name.setScale((size * 1.5) / seat.name.width);
      seat.count = txt(this, p.x + size * 0.48, p.y - size * 0.42, '', 28, '#ffffff').setDepth(43);
      seat.role = this.add.image(p.x - size * 0.48, p.y - size * 0.42, 'i_lightning').setDisplaySize(54, 54).setDepth(43).setVisible(false);
      if (this.d.rules.teams && i === 2) this.add.image(p.x + size * 0.48, p.y + size * 0.3, 'i_heart').setDisplaySize(46, 46).setDepth(43);
      this.seats.push(seat);
    }
  }

  private buildTableUi(): void {
    // Talon slot + trump badge
    const { x, y } = this.talonPos;
    this.add.image(x, y, 'card_slot').setDisplaySize(this.cw * 0.9, this.ch * 0.9).setDepth(2);
    this.talonCount = txt(this, x, y + this.ch * 0.62, '', 30, '#ffffff').setDepth(300);
    const ts = this.g.trumpSuit;
    this.trumpBadge = this.add.container(this.W - (this.portrait ? 90 : 90), this.portrait ? 75 : 70).setDepth(2001);
    const g = this.add.graphics();
    g.fillStyle(UI.inkN, 0.7).fillRoundedRect(-70, -50, 140, 100, 24);
    this.trumpBadge.add(g);
    this.trumpBadge.add(txt(this, 0, -22, t('trumpIs'), 22, '#ffffff'));
    this.trumpBadge.add(txt(this, 0, 18, ['♠', '♥', '♦', '♣'][ts], 52, ts === 1 || ts === 2 ? '#ff6b6b' : '#ffffff'));
    // Discard slot
    this.add.image(this.discardPos.x, this.discardPos.y, 'card_slot').setDisplaySize(this.cw * 0.9, this.ch * 0.9).setDepth(2).setAlpha(0.5);
    // Drop zone for the table (attack / transfer by drag)
    const r = this.tableRect;
    const z = this.add.zone(r.centerX, r.centerY, r.width, r.height).setInteractive().setDepth(1);
    z.on('pointerup', () => this.onTableTap());
  }

  private buildHud(): void {
    const W = this.W;
    const H = this.H;
    new IconButton(this, 75, 75, 'i_pause', 96, 'dark').onClick(() => this.openPause()).setDepth(2001);
    // Booster quick bar
    const boosters: [BoosterId, string][] = [
      ['hint', 'hint'],
      ['peek', 'eye'],
      ['counter', 'stats'],
      ['swap', 'refresh'],
    ];
    const bx0 = this.portrait ? 180 : 180;
    boosters.forEach(([id, icon], i) => {
      const b = new Button(this, bx0 + i * 100, 75, { w: 86, h: 86, color: 'dark', icon: `i_${icon}`, iconSize: 56, radius: 26 }).setDepth(2001);
      const n = save.data.boosters[id] ?? 0;
      b.setBadge(n > 0 ? String(n) : '▶');
      b.onClick(() => this.onBooster(id));
    });
    // Status + actions
    const sy = this.portrait ? H - 470 : H - 330;
    this.status = txt(this, W / 2, sy, '', 38, '#ffffff').setDepth(1500);
    const by = this.portrait ? H - 470 : H - 330;
    this.btnMain = new Button(this, W - (this.portrait ? 170 : 220), by, { w: 280, h: 104, color: 'gold', label: '', size: 40 }).onClick(() => this.onMain()).setDepth(1600);
    this.btnTransfer = new Button(this, this.portrait ? 170 : 220, by, { w: 280, h: 104, color: 'purple', label: t('btn_transfer'), size: 34 }).onClick(() => this.onTransfer()).setDepth(1600);
    if (this.d.rules.cheat) {
      this.btnCatch = new Button(this, W - (this.portrait ? 170 : 220), by - 130, { w: 280, h: 96, color: 'red', label: t('btn_catch'), size: 34 }).onClick(() => this.onCatch()).setDepth(1600);
      this.btnCheat = new Button(this, this.portrait ? 170 : 220, by - 130, { w: 280, h: 96, color: 'dark', label: t('btn_cheat'), icon: 'i_hand', iconSize: 56, size: 30 }).onClick(() => this.toggleCheat()).setDepth(1600);
    }
    // Emotes
    new IconButton(this, this.portrait ? 75 : 75, this.portrait ? H - 470 : H - 120, 'i_heart', 90, 'dark').onClick(() => this.openEmotes()).setDepth(1600);
    // Player avatar (small) near the hand
    const pf = PLAYER_FACES[save.data.avatar % PLAYER_FACES.length];
    this.seats[0].avatar = this.add.image(this.portrait ? 75 : 75, this.portrait ? H - 600 : H - 250, faceTex(this.textures, `me${save.data.avatar}`, pf)).setDisplaySize(100, 100).setDepth(1600);
    this.seats[0].x = this.seats[0].avatar.x;
    this.seats[0].y = this.seats[0].avatar.y;
    this.seats[0].role = this.add.image(this.seats[0].x + 46, this.seats[0].y - 40, 'i_lightning').setDisplaySize(48, 48).setDepth(1601).setVisible(false);
  }

  /* ------------------------------------------------------------ views */

  private allCards(): DCard[] {
    const g = this.g;
    return [...g.players.flatMap((p) => p.hand), ...g.talon, ...g.discard, ...g.table.flatMap((x) => (x.def ? [x.atk, x.def] : [x.atk]))];
  }

  private viewCard(c: DCard): Card {
    return { id: c.id, suit: c.suit, rank: texRank(c.rank) };
  }

  private buildViews(): void {
    for (const c of this.allCards()) {
      const v = new CardView(this, this.viewCard(c), skin.cards, this.cw, this.ch, false);
      v.setPosition(this.talonPos.x, this.talonPos.y);
      v.setInteractive({ useHandCursor: true });
      v.on('pointerdown', (p: Phaser.Input.Pointer) => this.onCardDown(c.id, p));
      this.views.set(c.id, v);
    }
  }

  /** Move every card view to where the model says it is. */
  private sync(animate: boolean): void {
    const g = this.g;
    const dur = animate ? 260 : 0;
    const place = (id: number, x: number, y: number, up: boolean, depth: number, w: number, angle = 0, visible = true) => {
      const v = this.views.get(id);
      if (!v) return;
      v.setVisible(visible);
      v.setDepth(depth);
      if (Math.abs(v.cw - w) > 0.5) v.setCardSize(w, w * 1.4);
      if (v.faceUp !== up) v.setFaceUp(up, animate);
      if (animate) {
        // Only tween cards that actually move (dozens of idle cards stay put).
        if (Math.abs(v.x - x) > 0.5 || Math.abs(v.y - y) > 0.5) v.glide(x, y, dur);
        if (Math.abs(v.angle - angle) > 0.5) this.tweens.add({ targets: v, angle, duration: dur });
      } else {
        v.stopGlide();
        v.setPosition(x, y).setAngle(angle);
      }
    };
    // Talon: trump at the bottom rotated, a few backs on top.
    const tl = g.talon;
    tl.forEach((c, i) => {
      const isTrump = i === 0;
      const top = i >= tl.length - 3;
      if (isTrump) place(c.id, this.talonPos.x + this.cw * 0.28, this.talonPos.y, true, 3, this.cw * 0.9, 90, true);
      else place(c.id, this.talonPos.x - (tl.length - 1 - i) * 2, this.talonPos.y - (tl.length - 1 - i) * 2, false, 10 + i, this.cw * 0.9, 0, top);
    });
    // Discard pile
    g.discard.forEach((c, i) => {
      const k = g.discard.length - 1 - i;
      const ang = ((c.id * 37) % 40) - 20;
      place(c.id, this.discardPos.x + (((c.id * 13) % 20) - 10), this.discardPos.y + (((c.id * 7) % 16) - 8), false, 5 + i, this.cw * 0.9, ang, k < 8);
    });
    // Table pairs
    const pairs = g.table;
    const pos = this.pairPositions(pairs.length);
    pairs.forEach((pr, i) => {
      const p = pos[i];
      place(pr.atk.id, p.x, p.y, true, 200 + i * 2, this.cw, -3);
      if (pr.def) place(pr.def.id, p.x + this.cw * 0.22, p.y + this.ch * 0.18, true, 201 + i * 2, this.cw, 6);
    });
    this.buildPairZones(pos);
    // Hands
    g.players.forEach((pl, pi) => {
      if (pi === 0) this.layoutMyHand(pl.hand, animate);
      else {
        const seat = this.seats[pi];
        const n = pl.hand.length;
        const show = Math.min(n, 7);
        const sw = this.portrait ? 64 : 58;
        pl.hand.forEach((c, k) => {
          const vis = k >= n - show;
          const j = k - (n - show);
          const open = this.d.puzzle !== undefined || this.st.peek.includes(c.id);
          const spread = (j - (show - 1) / 2) * (open ? sw * 0.9 : sw * 0.35);
          place(c.id, seat.hx + spread, seat.hy + Math.abs(j - (show - 1) / 2) * 3, open, 60 + k, open ? sw * 1.2 : sw, (j - (show - 1) / 2) * 5, vis);
        });
      }
    });
  }

  private pairPositions(n: number): { x: number; y: number }[] {
    const r = this.tableRect;
    const cols = this.portrait ? 3 : Math.min(6, Math.max(3, n));
    const rows = Math.ceil(Math.max(1, n) / cols);
    const out: { x: number; y: number }[] = [];
    const gx = Math.min(this.cw * 1.45, r.width / cols);
    const gy = this.ch * 1.35;
    for (let i = 0; i < n; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, n - row * cols);
      out.push({ x: r.centerX + (col - (inRow - 1) / 2) * gx - this.cw * 0.1, y: r.centerY + (row - (rows - 1) / 2) * gy - this.ch * 0.08 });
    }
    return out;
  }

  private buildPairZones(pos: { x: number; y: number }[]): void {
    this.pairZones.forEach((z) => z.destroy());
    this.pairZones = pos.map((p, i) => {
      const z = this.add.zone(p.x + this.cw * 0.1, p.y + this.ch * 0.1, this.cw * 1.3, this.ch * 1.3).setInteractive({ useHandCursor: true }).setDepth(180);
      z.on('pointerup', () => this.onPairTap(i));
      return z;
    });
  }

  private layoutMyHand(hand: DCard[], animate: boolean): void {
    const n = hand.length;
    const W = this.W;
    const maxW = W - (this.portrait ? 60 : 500);
    // Big hands shrink a little so every index stays readable.
    const w = this.hcw * Math.max(0.68, Math.min(1, 12 / Math.max(1, n)));
    const step = n > 1 ? Math.min(w * 0.8, (maxW - w) / (n - 1)) : 0;
    const x0 = W / 2 - (step * (n - 1)) / 2;
    const y0 = this.seats[0].hy + (this.hcw - w) * 0.7;
    const half = Math.max(1, (n - 1) / 2);
    hand.forEach((c, i) => {
      const v = this.views.get(c.id);
      if (!v) return;
      const off = i - (n - 1) / 2;
      const sel = this.selected === c.id;
      const x = x0 + i * step;
      const y = y0 + (off / half) * (off / half) * 34 - (sel ? 50 : 0);
      v.setVisible(true);
      v.setDepth(1000 + i);
      if (Math.abs(v.cw - w) > 0.5) v.setCardSize(w, w * 1.4);
      if (!v.faceUp) v.setFaceUp(true, animate);
      const ang = (off / half) * Math.min(10, n * 1.2);
      if (animate) {
        if (Math.abs(v.x - x) > 0.5 || Math.abs(v.y - y) > 0.5) v.glide(x, y, 240);
        if (Math.abs(v.angle - ang) > 0.5) this.tweens.add({ targets: v, angle: ang, duration: 240 });
      } else {
        v.stopGlide();
        v.setPosition(x, y).setAngle(ang);
      }
      v.setDim(!this.isPlayable(c.id) && this.myTurn());
    });
  }

  /* ------------------------------------------------------------ state helpers */

  private myTurn(): boolean {
    return this.myActions().length > 0;
  }

  private myActions(): DAction[] {
    if (this.ended || this.g.over) return [];
    const g = this.g;
    if (g.phase === 'defend') return g.defender === 0 ? g.legal(0) : [];
    return g.actor === 0 ? g.legal(0) : [];
  }

  private isPlayable(id: number): boolean {
    if (this.st.cheatArmed) return this.myActions().length > 0;
    return this.myActions().some((a) => 'card' in a && a.card === id);
  }

  private refresh(): void {
    const g = this.g;
    this.talonCount.setText(g.talon.length ? String(g.talon.length) : '');
    g.players.forEach((pl, i) => {
      const s = this.seats[i];
      s.count?.setText(pl.out ? '✓' : String(pl.hand.length));
      if (s.role) {
        const isAtk = i === g.attacker && !g.over;
        const isDef = i === g.defender && !g.over;
        s.role.setVisible(isAtk || isDef);
        s.role.setTexture(isDef ? 'i_medal' : 'i_lightning');
      }
      if (s.avatar && i > 0) s.avatar.setAlpha(pl.out ? 0.5 : 1);
    });
    const acts = this.myActions();
    const canTake = acts.some((a) => a.t === 'take');
    const canPass = acts.some((a) => a.t === 'pass');
    this.btnMain.setVisible(canTake || canPass);
    this.btnMain.setLabel(canTake ? t('btn_take') : g.phase === 'take' ? t('btn_pass2') : t('btn_pass'));
    this.btnMain.setColor(canTake ? 'red' : 'gold');
    const sel = this.selected;
    this.btnTransfer.setVisible(sel !== null && acts.some((a) => a.t === 'transfer' && a.card === sel));
    if (this.btnCatch) this.btnCatch.setVisible(!g.over && g.table.length > 0);
    if (this.btnCheat) {
      this.btnCheat.setVisible(acts.length > 0);
      this.btnCheat.setColor(this.st.cheatArmed ? 'orange' : 'dark');
    }
    // Status line
    let s = '';
    if (g.over) s = '';
    else if (acts.length) s = g.phase === 'defend' ? t('defend') : g.table.length ? t('throwIn') : t('yourTurn');
    else if (g.phase === 'take') s = t('takes', { name: this.nameOf(g.defender) });
    else s = t('waiting', { name: this.nameOf(g.actor) });
    this.status.setText(s);
    this.status.setColor(acts.length ? '#ffd166' : '#ffffff');
    this.layoutMyHand(g.players[0].hand, true);
    this.highlightPairs();
  }

  private nameOf(i: number): string {
    return i === 0 ? t('you') : this.d.opponents[i - 1]?.name ?? '?';
  }

  private highlightPairs(): void {
    this.pairGlows.forEach((g) => g.destroy());
    this.pairGlows = [];
    if (this.selected === null || this.g.phase !== 'defend' || this.g.defender !== 0) return;
    const pos = this.pairPositions(this.g.table.length);
    const id = this.selected;
    this.g.table.forEach((pr, i) => {
      if (pr.def) return;
      const ok = this.st.cheatArmed || this.myActions().some((a) => a.t === 'defend' && a.card === id && a.pair === i);
      if (!ok) return;
      const gl = this.add.image(pos[i].x, pos[i].y, 'card_glow').setDisplaySize(this.cw * 1.25, this.ch * 1.2).setDepth(199).setTint(this.st.cheatArmed ? 0xff8a3d : 0x9ff0c8);
      this.tweens.add({ targets: gl, alpha: 0.35, duration: 450, yoyo: true, repeat: -1 });
      this.pairGlows.push(gl);
    });
  }

  /* ------------------------------------------------------------ input */

  private onCardDown(id: number, p: Phaser.Input.Pointer): void {
    if (this.busy || this.ended || pauseHub.paused) return;
    if (!this.g.players[0].hand.some((c) => c.id === id)) return;
    this.drag = { id, sx: p.x, sy: p.y, moved: false };
  }

  private onDragMove(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d || !p.isDown) return;
    if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) < 18) return;
    d.moved = true;
    const v = this.views.get(d.id)!;
    v.stopGlide();
    v.setPosition(p.x, p.y - this.hcw * 0.4).setDepth(5000).setAngle(0);
    v.setLifted(true);
  }

  private onDragEnd(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    if (!d.moved) return this.onHandTap(d.id);
    // Dropped on a pair?
    const pos = this.pairPositions(this.g.table.length);
    const hit = pos.findIndex((q) => Math.abs(p.x - q.x) < this.cw * 0.8 && Math.abs(p.y - q.y) < this.ch * 0.8);
    this.selected = d.id;
    if (hit >= 0 && this.g.phase === 'defend') this.onPairTap(hit);
    else if (this.tableRect.contains(p.x, p.y)) this.onTableTap();
    else {
      this.selected = null;
      this.refresh();
    }
  }

  private onHandTap(id: number): void {
    const acts = this.myActions();
    if (!acts.length) return;
    this.clearHint();
    const g = this.g;
    if (this.st.cheatArmed) {
      if (g.phase === 'defend') {
        this.selected = id;
        audio.play('click');
        this.refresh();
        const unb = g.unbeaten;
        if (unb.length === 1) this.onPairTap(unb[0]);
        return;
      }
      if (g.table.length) return void this.doCheat({ t: 'attack', p: 0, card: id });
    }
    const mine = acts.filter((a) => 'card' in a && a.card === id);
    if (!mine.length) {
      audio.play('error', { vol: 0.4 });
      const v = this.views.get(id)!;
      this.tweens.add({ targets: v, x: v.x + 10, duration: 50, yoyo: true, repeat: 2 });
      return;
    }
    const attack = mine.find((a) => a.t === 'attack');
    if (attack) return void this.act(attack);
    const defs = mine.filter((a) => a.t === 'defend');
    const trans = mine.find((a) => a.t === 'transfer');
    if (defs.length === 1 && !trans) return void this.act(defs[0]);
    if (!defs.length && trans) return void this.act(trans);
    // Several options: select the card and let the player pick the pair (or transfer).
    this.selected = this.selected === id ? null : id;
    audio.play('click');
    this.refresh();
  }

  private onPairTap(i: number): void {
    if (this.selected === null || this.g.phase !== 'defend' || this.g.defender !== 0) return;
    const id = this.selected;
    if (this.st.cheatArmed) {
      this.selected = null;
      return void this.doCheat({ t: 'defend', p: 0, card: id, pair: i });
    }
    const a = this.myActions().find((x) => x.t === 'defend' && x.card === id && x.pair === i);
    if (a) {
      this.selected = null;
      this.act(a);
    } else audio.play('error', { vol: 0.4 });
  }

  private onTableTap(): void {
    if (this.selected === null) return;
    const id = this.selected;
    const a = this.myActions().find((x) => (x.t === 'attack' || x.t === 'transfer') && x.card === id);
    this.selected = null;
    if (a) this.act(a);
    else this.refresh();
  }

  private onMain(): void {
    const acts = this.myActions();
    const a = acts.find((x) => x.t === 'take') ?? acts.find((x) => x.t === 'pass');
    if (a) this.act(a);
  }

  private onTransfer(): void {
    const id = this.selected;
    const a = this.myActions().find((x) => x.t === 'transfer' && x.card === id);
    this.selected = null;
    if (a) this.act(a);
  }

  private toggleCheat(): void {
    this.st.cheatArmed = !this.st.cheatArmed;
    audio.play('click');
    if (this.st.cheatArmed) toast(this, t('cheatOn'), '#ffa94d');
    this.refresh();
  }

  private onCatch(): void {
    if (this.busy || this.g.over || !this.g.table.length) return;
    const c = this.g.catchable;
    const real = !!c && c.p !== 0 && !this.g.isTeammate(c.p, 0);
    this.g.apply({ t: 'catch', p: 0 });
    if (real) {
      audio.play('catch');
      save.data.totals.caught++;
      track('catch', 1);
      toast(this, t('youCaught'), '#9ff0c8');
      this.say(c!.p, 'caught');
      this.emote(c!.p, 'sad');
    } else {
      audio.play('error');
      toast(this, t('falseCatch'), '#ff8a8a');
      this.say(this.g.attacker === 0 ? this.g.defender : this.g.attacker, 'win');
    }
    this.afterAction();
  }

  /* ------------------------------------------------------------ actions */

  private act(a: DAction): void {
    if (this.busy) return;
    this.selected = null;
    const g = this.g;
    const before = this.g.players[0].hand.length;
    if (!g.apply(a)) {
      audio.play('error');
      this.refresh();
      return;
    }
    if (a.p === 0) {
      this.st.moves++;
      if (a.t === 'defend') {
        this.st.beatenByMe++;
        save.data.totals.beaten++;
        track('beat', 1);
      }
      if (a.t === 'transfer') {
        this.st.transfers++;
        save.data.totals.transfers++;
        track('transfer', 1);
      }
      if ('card' in a && before === 1) {
        // Last card of the player — remember if it was a trump (quest).
        this.st.lastCardTrump = this.allCards().find((c) => c.id === a.card)?.suit === g.trumpSuit;
      }
    }
    this.playEventSounds(a);
    this.afterAction();
  }

  private doCheat(a: { t: 'attack'; p: number; card: number } | { t: 'defend'; p: number; card: number; pair: number }): void {
    const g = this.g;
    // Legal anyway? then it's a normal move.
    const legal = g.legal(0).find((x) => x.t === a.t && 'card' in x && x.card === a.card && (a.t !== 'defend' || (x as any).pair === a.pair));
    if (legal) {
      this.st.cheatArmed = false;
      return this.act(legal);
    }
    if (!g.cheat(a)) {
      audio.play('error');
      return this.refresh();
    }
    this.st.cheatArmed = false;
    audio.play('slap');
    if (this.st.bribe) {
      // Bribed dealer: the cheat cannot be caught.
      g.catchable = null;
      this.st.bribe = false;
    } else this.scheduleBotCatch();
    this.afterAction();
  }

  /** Opponents may notice the player's cheat. */
  private scheduleBotCatch(): void {
    const g = this.g;
    const c = g.catchable;
    if (!c || c.p !== 0) return;
    for (let i = 1; i < g.players.length; i++) {
      if (g.isTeammate(i, 0) || g.players[i].out) continue;
      const att = this.d.opponents[i - 1].ai.attention;
      if (this.rng.next() < att) {
        this.time.delayedCall(600 + this.rng.int(0, 900), () => {
          if (this.ended || !g.catchable || g.catchable.p !== 0) return;
          g.apply({ t: 'catch', p: i });
          audio.play('catch');
          save.data.totals.caughtBy++;
          toast(this, t('caughtYou'), '#ff8a8a');
          this.say(i, 'catch');
          this.emote(i, 'angry');
          this.afterAction();
        });
        return;
      }
    }
  }

  private playEventSounds(a: DAction): void {
    for (const e of this.g.events) {
      if (e.kind === 'attack' || e.kind === 'defend') audio.play(e.cards?.[0]?.suit === this.g.trumpSuit ? 'trump' : 'slap');
      if (e.kind === 'transfer') audio.play('whoosh');
      if (e.kind === 'took') {
        audio.play('take');
        if (e.p !== 0 && e.p !== undefined) this.say(e.p, 'take');
      }
      if (e.kind === 'beaten') {
        audio.play('bito');
        if (this.g.events.length && a.p !== 0 && this.rng.chance(0.3)) this.say(this.g.defender, 'beat');
      }
      if (e.kind === 'draw') audio.play('deal', { delay: 0.15 });
    }
  }

  private afterAction(): void {
    this.g.autoResolve();
    this.clearHint();
    this.sync(true);
    this.refresh();
    if (this.g.over) return this.onOver();
    this.scheduleBot();
  }

  /** Bots act after a short "thinking" delay. */
  private scheduleBot(): void {
    if (this.ended || this.g.over) return;
    this.botTimer?.remove();
    const g = this.g;
    let who = g.phase === 'defend' ? g.defender : g.actor;
    if (who === 0 && this.myActions().length) return; // wait for the player
    if (who === 0) {
      // Player has nothing to do: let the engine settle.
      g.autoResolve();
      who = g.players.findIndex((_, i) => i !== 0 && g.legal(i).length > 0);
      if (who < 0) {
        if (g.over) this.onOver();
        return;
      }
    }
    const delay = SPEED_MS[save.data.settings.speed] * (g.phase === 'defend' ? 1.1 : 1) * (0.8 + this.rng.next() * 0.4);
    this.botTimer = this.time.delayedCall(delay, () => this.botMove(who));
  }

  private botMove(i: number): void {
    if (this.ended || this.g.over || pauseHub.paused) {
      if (pauseHub.paused) this.botTimer = this.time.delayedCall(400, () => this.botMove(i));
      return;
    }
    const g = this.g;
    const opp = this.d.opponents[i - 1];
    // Catch the player's cheating if noticed earlier is handled separately; bots also catch each other rarely.
    // Puzzle opponents play perfectly.
    let a = this.d.puzzle ? bestMove(g, i) : decide(g, i, opp.ai, this.rng);
    const cheat = this.d.puzzle ? null : maybeCheat(g, i, opp.ai, this.rng, a);
    if (cheat && g.cheat(cheat)) {
      audio.play('slap');
      this.afterAction();
      return;
    }
    if (!a) {
      g.autoResolve();
      return this.afterAction();
    }
    if (!g.apply(a)) {
      // Fallback: any legal action.
      a = g.legal(i)[0] ?? null;
      if (!a || !g.apply(a)) return this.afterAction();
    }
    if (a.t === 'take' && this.rng.chance(0.3)) this.emote(i, 'sad');
    if (a.t === 'transfer') this.say(i, 'beat');
    this.playEventSounds(a);
    this.afterAction();
  }

  /* ------------------------------------------------------------ boosters */

  private onBooster(id: BoosterId): void {
    if (this.ended) return;
    const run = () => {
      if (id === 'hint') this.showHint();
      else if (id === 'peek') this.usePeek(true);
      else if (id === 'counter') this.showCounter();
      else if (id === 'swap') this.useSwap();
    };
    if (id === 'counter' && this.st.counter) return this.showCounter();
    if (id === 'hint' && !this.myActions().length) return toast(this, t('waiting', { name: this.nameOf(this.g.actor) }));
    if (id === 'swap' && (this.selected === null || this.g.talon.length < 2)) return toast(this, t('b_swap_d'));
    if (useBooster(id)) return run();
    // Offer for a rewarded ad (or coins).
    const W = this.W;
    pauseHub.set('menu', true);
    const m = openModal(this, t(`b_${id}`), Math.min(W - 60, 820), 600, () => pauseHub.set('menu', false), { depth: 2500 });
    m.root.add(txt(this, W / 2, m.y + 250, t(`b_${id}_d`), 40, '#ffffff', { wordWrap: { width: m.w - 80 } }));
    m.root.add(
      new Button(this, W / 2 - 180, m.y + m.h - 120, { w: 320, h: 120, color: 'green', label: t('free'), size: 36, ad: true }).onClick(() => {
        m.close();
        void watchAd(this, `game_${id}`, run);
      }),
    );
    const price = id === 'hint' ? 60 : 120;
    m.root.add(
      new Button(this, W / 2 + 180, m.y + m.h - 120, { w: 300, h: 120, color: 'gold', label: String(price), icon: 'i_coin', size: 40 }).onClick(() => {
        if (!spendCoins(price)) return toast(this, t('notEnough'), '#ff8a8a');
        audio.play('buy');
        m.close();
        run();
      }),
    );
  }

  private showHint(): void {
    const a = this.d.puzzle ? bestMove(this.g, 0) : decide(this.g.clone(), 0, PROFILES.master, new Rng(this.st.seed + this.st.moves)) ?? heuristic(this.g, 0, PROFILES.amateur, this.rng);
    audio.play('hint');
    if (!a) return;
    if ('card' in a) {
      const v = this.views.get(a.card);
      v?.setGlow(true);
      this.hintGlow = v ?? null;
    } else {
      this.tweens.add({ targets: this.btnMain, scale: 1.15, duration: 200, yoyo: true, repeat: 3 });
    }
  }

  private clearHint(): void {
    this.hintGlow?.setGlow(false);
    this.hintGlow = null;
  }

  private usePeek(announce: boolean): void {
    const g = this.g;
    const pool = g.players.slice(1).flatMap((p) => p.hand).filter((c) => !this.st.peek.includes(c.id));
    if (!pool.length) return;
    const c = this.rng.pick(pool);
    this.st.peek.push(c.id);
    if (announce) audio.play('hint');
    this.sync(true);
  }

  private useSwap(): void {
    const g = this.g;
    const id = this.selected;
    const hand = g.players[0].hand;
    const i = hand.findIndex((c) => c.id === id);
    if (i < 0 || g.talon.length < 2) return;
    const top = g.talon.pop()!;
    const mine = hand.splice(i, 1)[0];
    g.talon.splice(1, 0, mine);
    hand.push(top);
    g.sortHand(hand);
    this.selected = null;
    audio.play('shuffle');
    this.sync(true);
    this.refresh();
  }

  private showCounter(): void {
    this.st.counter = true;
    const g = this.g;
    const W = this.W;
    pauseHub.set('menu', true);
    const m = openModal(this, t('b_counter'), Math.min(W - 40, 1000), 800, () => pauseHub.set('menu', false), { depth: 2500 });
    const out = new Set(g.discard.map((c) => c.id));
    const mine = new Set(g.players[0].hand.map((c) => c.id));
    const min = { 24: 9, 36: 6, 52: 2 }[g.rules.deck];
    const ranks = Array.from({ length: 15 - min }, (_, i) => min + i);
    const cell = Math.min(70, (m.w - 120) / ranks.length);
    const all = this.allCards();
    for (let s = 0; s < 4; s++) {
      m.root.add(txt(this, m.x + 60, m.y + 180 + s * 130, ['♠', '♥', '♦', '♣'][s], 52, s === 1 || s === 2 ? '#ff6b6b' : '#ffffff'));
      ranks.forEach((r, k) => {
        const c = all.find((x) => x.suit === s && x.rank === r);
        if (!c) return;
        const state = out.has(c.id) ? 0.25 : mine.has(c.id) ? 0.6 : 1;
        const img = this.add.image(m.x + 110 + k * cell + cell / 2, m.y + 180 + s * 130, skin.face(s, r)).setDisplaySize(cell - 4, (cell - 4) * 1.4).setAlpha(state);
        m.root.add(img);
      });
    }
  }

  /* ------------------------------------------------------------ chatter */

  private say(i: number, kind: keyof typeof PHRASES): void {
    if (i <= 0 || !this.seats[i]) return;
    const key = this.rng.pick(PHRASES[kind]);
    this.bubble(i, t(`say_${key}`));
  }

  private bubble(i: number, text: string): void {
    const s = this.seats[i];
    s.bubble?.destroy();
    const bx = Phaser.Math.Clamp(s.x, 200, this.W - 200);
    const by = i === 0 ? s.y - 110 : s.y + (this.portrait ? 150 : 120);
    const c = this.add.container(bx, by).setDepth(3000);
    const tt = txt(this, 0, 0, text, 30, '#1a1426', { strokeThickness: 0, wordWrap: { width: 340 } });
    const g = this.add.graphics();
    g.fillStyle(0xfff6e0, 1).fillRoundedRect(-tt.width / 2 - 20, -tt.height / 2 - 14, tt.width + 40, tt.height + 28, 20);
    c.add([g, tt]);
    s.bubble = c;
    c.setScale(0.5);
    this.tweens.add({ targets: c, scale: 1, duration: 160, ease: 'Back.Out' });
    this.time.delayedCall(1800, () => {
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
    this.tweens.add({ targets: s.avatar, scale: s.avatar.scale * 1.12, duration: 150, yoyo: true });
    this.time.delayedCall(1600, () => s.avatar?.active && s.avatar.setTexture(faceTex(this.textures, key, face, 'neutral')).setDisplaySize(size, size));
  }

  private openEmotes(): void {
    const W = this.W;
    const m = openModal(this, t('emotes'), Math.min(W - 60, 860), 640, undefined, { depth: 2500 });
    const list = EMOTE_IDS.filter((e) => save.data.emotes.includes(e));
    list.forEach((e, k) => {
      const col = k % 3;
      const row = Math.floor(k / 3);
      const x = W / 2 + (col - 1) * 260;
      const y = m.y + 170 + row * 120;
      const label = e.startsWith('say_') ? t(e) : '';
      const b = new Button(this, x, y, { w: 240, h: 100, color: 'dark', label: label || ' ', size: 24 });
      if (!e.startsWith('say_')) {
        const pf = PLAYER_FACES[save.data.avatar % PLAYER_FACES.length];
        b.add(this.add.image(0, -4, faceTex(this.textures, `me${save.data.avatar}`, pf, e as Emotion)).setDisplaySize(84, 84));
      }
      b.onClick(() => {
        m.close();
        audio.play('emote');
        if (e.startsWith('say_')) this.bubble(0, t(e));
        else this.emote(0, e as Emotion);
        // Opponents react.
        const j = 1 + this.rng.int(0, this.d.opponents.length - 1);
        this.time.delayedCall(900, () => this.emote(j, this.rng.pick(['happy', 'smug', 'angry', 'surprised'] as Emotion[])));
      });
      m.root.add(b);
    });
  }

  /* ------------------------------------------------------------ end */

  private onOver(): void {
    if (this.ended) return;
    this.ended = true;
    this.botTimer?.remove();
    const g = this.g;
    const teams = g.rules.teams;
    const myTeamLost = g.loser !== null && (teams ? g.loser % 2 === 0 : g.loser === 0);
    const won = !g.draw && !myTeamLost;
    const iAmFool = g.loser === 0;
    const loserHand = g.loser !== null ? g.players[g.loser].hand : [];
    const pogony = !g.draw && g.rules.deck === 36 && loserHand.some((c) => c.rank === 6);
    // Reactions
    for (let i = 1; i < g.players.length; i++) {
      const theyLost = g.loser === i || (teams && g.loser !== null && g.loser % 2 === i % 2);
      this.emote(i, theyLost ? 'sad' : 'happy');
      if (i === 1) this.say(i, theyLost ? 'lose' : 'win');
    }
    audio.play(won ? 'win' : g.draw ? 'unlock' : 'lose');
    if (pogony && iAmFool) this.time.delayedCall(600, () => audio.play('pogony'));
    // Reveal the loser's cards.
    if (g.loser !== null && g.loser !== 0) for (const c of loserHand) this.views.get(c.id)?.setFaceUp(true, true);
    const banner = txt(this, this.W / 2, this.tableRect.centerY, g.draw ? t('draw') : won ? t('youWin') : t('fool'), 80, won ? '#9ff0c8' : '#ff8a8a').setDepth(4000).setScale(0.3);
    this.tweens.add({ targets: banner, scale: 1, duration: 400, ease: 'Back.Out' });
    this.time.delayedCall(2200, () =>
      this.go('Result', {
        mode: this.d.mode,
        won,
        draw: g.draw,
        fool: iAmFool,
        pogony: pogony && myTeamLost,
        loserName: g.loser !== null ? this.nameOf(g.loser) : '',
        shield: this.st.shield,
        tableIdx: this.d.tableIdx,
        match: this.d.match,
        rules: this.d.rules,
        opponents: this.d.opponents,
        loc: this.d.loc,
        puzzle: this.d.puzzle,
        ctx: this.d.ctx,
        lastCardTrump: won && this.st.lastCardTrump,
        moves: this.st.moves,
      }),
    );
  }

  private openPause(): void {
    if (this.ended) return;
    pauseHub.set('menu', true);
    const W = this.W;
    const m = openModal(this, t('pause'), Math.min(W - 60, 760), 640, () => pauseHub.set('menu', false), { depth: 2600 });
    const y0 = m.y + 190;
    const b = (i: number, label: string, color: 'green' | 'blue' | 'red', fn: () => void) => m.root.add(new Button(this, W / 2, y0 + i * 135, { w: 520, h: 112, color, label, size: 38 }).onClick(fn));
    b(0, t('continue'), 'green', () => m.close());
    b(1, t('rules'), 'blue', () => {
      m.close();
      pauseHub.set('menu', true);
      const r = openModal(this, t('rules'), Math.min(W - 60, 940), Math.min(this.H - 200, 1300), () => pauseHub.set('menu', false), { depth: 2600 });
      const extra = [this.d.rules.transfer ? t('r_transfer_t') : '', this.d.rules.teams ? t('r_teams_t') : '', this.d.rules.cheat ? t('r_cheat_t') : ''].filter(Boolean).join('\n\n');
      r.root.add(txt(this, W / 2, r.y + 120, t('r_main') + (extra ? '\n\n' + extra : ''), 28, '#ffffff', { wordWrap: { width: r.w - 80 }, align: 'left', strokeThickness: 0 }).setOrigin(0.5, 0));
    });
    b(2, this.d.mode === 'career' ? t('map') : t('menu'), 'red', () =>
      confirm(this, t('quitConfirm'), () => {
        pauseHub.set('menu', false);
        this.ended = true;
        this.botTimer?.remove();
        this.go('Result', { mode: this.d.mode, won: false, draw: false, fool: true, pogony: false, quit: true, tableIdx: this.d.tableIdx, match: this.d.match, rules: this.d.rules, opponents: this.d.opponents, loc: this.d.loc, puzzle: this.d.puzzle, ctx: this.d.ctx, shield: this.st.shield });
      }),
    );
  }

  private tutorial(): void {
    const tut = save.data.tutorial;
    const tips: string[] = [];
    if (!tut.attack) {
      tut.attack = true;
      tips.push(t('tut_attack'), t('tut_defend'), t('tut_throw'));
    }
    if (this.d.rules.transfer && !tut.transfer) {
      tut.transfer = true;
      tips.push(t('tut_transfer'));
    }
    if (this.d.rules.cheat && !tut.cheat) {
      tut.cheat = true;
      tips.push(t('tut_cheat'));
    }
    save.save();
    const next = () => {
      const tip = tips.shift();
      if (!tip) {
        pauseHub.set('menu', false);
        return;
      }
      pauseHub.set('menu', true);
      showTip(this, tip, undefined, next);
    };
    if (tips.length) next();
  }

  update(): void {
    // Safety net: if nobody is scheduled and it's not the player's move, poke the bots.
    if (!this.ended && !this.busy && !this.g.over && !pauseHub.paused && (!this.botTimer || this.botTimer.getOverallProgress() >= 1) && !this.myActions().length) {
      this.scheduleBot();
    }
  }
}
