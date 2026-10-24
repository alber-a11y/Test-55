import Phaser from 'phaser';
import { audio } from '@shared/audio/audio';
import { CardView } from '@shared/cards/CardView';
import { t } from '@shared/core/i18n';
import { pauseHub } from '@shared/core/pause';
import { formatTime } from '@shared/core/time';
import { ads } from '@shared/platform/ads';
import { platform } from '@shared/platform/platform';
import { BaseScene } from '@shared/ui/base';
import { openModal } from '@shared/ui/modal';
import { Button, IconButton, toast, txt, UI } from '@shared/ui/widgets';
import { findSolvableKlondike, Klondike, type KlondikeSave } from '../logic/klondike';
import { FreeCell, type FreeCellSave } from '../logic/freecell';
import type { MoveRef, Pile, PileGame, SCard } from '../logic/piles';
import { Spider, type SpiderSave } from '../logic/spider';
import { spendCoins, useBooster } from '../progress';
import { save } from '../save';
import { skin } from '../skin';
import { confirm, watchAd } from '../ui/common';
import { showTip } from '../ui/tutorial';

export type ClassicMode = 'klondike' | 'spider' | 'freecell';

export interface ClassicData {
  mode?: ClassicMode;
  newGame?: boolean;
  resume?: boolean;
  seed?: number;
  daily?: string;
  state?: ClassicState;
}

interface ClassicState {
  game: PileGame & { time: number; seed: number };
  mode: ClassicMode;
  freeUndo: number;
  freeHint: number;
  daily?: string;
}

interface PileLayout {
  x: number;
  y: number;
  /** 'down' fans the pile downwards (tableau); 'right' fans the last 3 cards (waste, draw 3). */
  fan: 'down' | 'none' | 'right' | 'stock';
  /** Max height available for a down-fanned pile. */
  maxH: number;
}

const FREE_UNDO = 10;
const FREE_HINT = 3;

type ResumeSave = (KlondikeSave | SpiderSave | FreeCellSave) & { daily?: string; freeUndo?: number; freeHint?: number };

export class ClassicScene extends BaseScene {
  private st!: ClassicState;
  private cw = 140;
  private ch = 196;
  private layout = new Map<string, PileLayout>();
  private views = new Map<number, CardView>();
  /** card id → [pile id, index] */
  private where = new Map<number, [string, number]>();
  private drag: { pile: string; index: number; views: CardView[]; ox: number; oy: number; sx: number; sy: number; moved: boolean } | null = null;
  private busy = false;
  private ended = false;
  private scoreT!: Phaser.GameObjects.Text;
  private timeT!: Phaser.GameObjects.Text;
  private movesT!: Phaser.GameObjects.Text;
  private btnUndo!: Button;
  private btnHint!: Button;
  private btnAuto!: Button;
  private stockLabel: Phaser.GameObjects.Text | null = null;
  private glows: CardView[] = [];
  private glowSlots: Phaser.GameObjects.Image[] = [];
  private lastTick = 0;
  private stuckShown = false;

  constructor() {
    super('Classic');
  }

  get gm(): PileGame & { time: number; seed: number } {
    return this.st.game;
  }

  create(data: ClassicData): void {
    this.views = new Map();
    this.where = new Map();
    this.layout = new Map();
    this.drag = null;
    this.busy = false;
    this.ended = false;
    this.glows = [];
    this.glowSlots = [];
    this.stockLabel = null;
    this.stuckShown = false;
    this.st = undefined as unknown as ClassicState;
    this.add.image(0, 0, skin.table(this.W, this.H)).setOrigin(0);

    if (data.state) this.st = data.state;
    else {
      const st = this.makeState(data);
      if (!st) {
        // Dealing a solvable deal takes a moment: show a spinner, then continue.
        const tt = txt(this, this.cx, this.H / 2, t('dealing'), 54, '#ffffff');
        this.tweens.add({ targets: tt, alpha: 0.4, duration: 400, yoyo: true, repeat: -1 });
        this.time.delayedCall(60, () => {
          const mode = data.mode ?? 'klondike';
          const draw = save.data.settings.klDraw;
          const seed = findSolvableKlondike((Math.random() * 2 ** 31) >>> 0, draw);
          this.scene.restart({ ...data, state: { game: new Klondike(seed, draw), mode, freeUndo: FREE_UNDO, freeHint: FREE_HINT } });
        });
        return;
      }
      this.st = st;
    }
    this.sceneData = { ...data, state: this.st };
    this.lastCompleted = this.st.mode === 'spider' ? (this.gm as Spider).completed : 0;

    this.computeLayout();
    this.buildSlots();
    this.buildHud();
    this.buildViews();
    this.sync(false);
    this.refreshHud();
    this.persist();

    audio.playMusic('game');
    ads.inGameplay = true;
    platform.gameplayStart();
    // Animations freeze only for system pauses (ad, hidden tab); the pause menu itself must stay alive.
    const unsub = pauseHub.subscribe(() => (pauseHub.systemPaused ? this.tweens.pauseAll() : this.tweens.resumeAll()));
    this.events.once('shutdown', () => {
      ads.inGameplay = false;
      platform.gameplayStop();
      unsub();
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onDragMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onDragEnd(p));
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey) this.onUndo();
      else if (e.key === 'z' && e.ctrlKey) this.onUndo();
      else if (e.key === 'h' || e.key === 'H') this.onHint();
      else if (e.key === ' ') this.onStock();
      else if (e.key === 'Escape' || e.key === 'p') this.openPause();
    });
    this.lastTick = this.time.now;
    this.setupScene();
    if (!save.data.tutorial.kl) {
      save.data.tutorial.kl = true;
      save.save();
      this.time.delayedCall(400, () => showTip(this, t('tutorial_kl')));
    }
    this.time.delayedCall(300, () => this.autoPlay());
  }

  protected onResize(): void {
    this.drag = null;
    this.scene.restart({ ...this.sceneData, state: this.st });
  }

  /** Returns null when a solvable Klondike deal must be searched first (async). */
  private makeState(data: ClassicData): ClassicState | null {
    const set = save.data.settings;
    if (data.resume && save.data.resume) {
      const r = save.data.resume as ResumeSave;
      let game: ClassicState['game'];
      if (r.mode === 'klondike') game = Klondike.restore(r as KlondikeSave);
      else if (r.mode === 'spider') game = Spider.restore(r as SpiderSave);
      else game = FreeCell.restore(r as FreeCellSave);
      return { game, mode: r.mode, freeUndo: r.freeUndo ?? FREE_UNDO, freeHint: r.freeHint ?? FREE_HINT, daily: r.daily };
    }
    const mode = data.mode ?? 'klondike';
    const rnd = (Math.random() * 2 ** 31) >>> 0;
    const base = { mode, freeUndo: FREE_UNDO, freeHint: FREE_HINT, daily: data.daily };
    if (mode === 'klondike') {
      if (data.seed !== undefined) return { ...base, game: new Klondike(data.seed, data.daily ? 1 : set.klDraw) };
      if (set.solvable) return null;
      return { ...base, game: new Klondike(rnd, set.klDraw) };
    }
    if (mode === 'spider') return { ...base, game: new Spider(data.seed ?? rnd, data.daily ? 1 : set.spSuits) };
    return { ...base, game: new FreeCell(data.seed ?? 1 + (rnd % 32000)) };
  }

  /* ------------------------------------------------------------ layout */

  private computeLayout(): void {
    const W = this.W;
    const H = this.H;
    const port = this.portrait;
    const mode = this.st.mode;
    const cols = mode === 'klondike' ? 7 : mode === 'spider' ? 10 : 8;
    const left = save.data.settings.leftHand;
    const topY = port ? 190 : 140;
    const bottom = port ? 240 : 30;
    let cw: number;
    let gap: number;
    let x0: number;
    if (port) {
      const m = 12;
      gap = mode === 'spider' ? 6 : 10;
      cw = (W - 2 * m - (cols - 1) * gap) / cols;
      x0 = m + cw / 2;
    } else {
      cw = Math.min(mode === 'spider' ? 125 : 150, (W - 520 - 40) / cols);
      gap = mode === 'spider' ? 12 : 22;
      const total = cols * cw + (cols - 1) * gap;
      x0 = (W - total) / 2 + cw / 2;
    }
    const ch = cw * 1.4;
    this.cw = cw;
    this.ch = ch;
    const colX = (i: number) => x0 + i * (cw + gap);
    const rowY = topY + ch / 2;
    const tabY = rowY + ch + (port ? 34 : 24);
    const maxH = H - bottom - tabY - ch * 0.5;
    const set = (id: string, x: number, y: number, fan: PileLayout['fan']) => this.layout.set(id, { x, y, fan, maxH });
    const g = this.gm;
    if (mode === 'klondike') {
      const draw3 = (g as Klondike).drawCount === 3;
      const sc = left ? 6 : 0;
      set('stock', colX(sc), rowY, 'stock');
      set('waste', colX(left ? 5 - (draw3 ? 1 : 0) : 1), rowY, draw3 ? 'right' : 'none');
      for (let i = 0; i < 4; i++) set(`f${i}`, colX(left ? i : 3 + i), rowY, 'none');
      for (let i = 0; i < 7; i++) set(`t${i}`, colX(i), tabY, 'down');
    } else if (mode === 'spider') {
      for (let i = 0; i < 8; i++) set(`f${i}`, colX(left ? 9 : 0) + (left ? -1 : 1) * i * cw * 0.32, rowY, 'none');
      set('stock', colX(left ? 0 : 9), rowY, 'stock');
      for (let i = 0; i < 10; i++) set(`t${i}`, colX(i), tabY, 'down');
    } else {
      for (let i = 0; i < 4; i++) set(`c${i}`, colX(left ? 4 + i : i), rowY, 'none');
      for (let i = 0; i < 4; i++) set(`f${i}`, colX(left ? i : 4 + i), rowY, 'none');
      for (let i = 0; i < 8; i++) set(`t${i}`, colX(i), tabY, 'down');
    }
  }

  /** Target position of each card. */
  private positions(): Map<number, { x: number; y: number; depth: number; up: boolean }> {
    const out = new Map<number, { x: number; y: number; depth: number; up: boolean }>();
    this.where.clear();
    for (const p of this.gm.piles) {
      const L = this.layout.get(p.id);
      if (!L) continue;
      const n = p.cards.length;
      const base = p.kind === 'tab' ? 100 + p.index * 0 : p.kind === 'found' ? 50 : 20;
      if (L.fan === 'down') {
        // Fan with compression when the column is long.
        let downStep = this.ch * 0.13;
        let upStep = this.ch * 0.3;
        const need = p.cards.reduce((a, c, i) => a + (i === n - 1 ? 0 : c.up ? upStep : downStep), 0);
        if (need > L.maxH) {
          const k = L.maxH / need;
          downStep *= k;
          upStep *= k;
        }
        let y = L.y;
        p.cards.forEach((c, i) => {
          out.set(c.id, { x: L.x, y, depth: base + i, up: c.up });
          this.where.set(c.id, [p.id, i]);
          y += c.up ? upStep : downStep;
        });
      } else if (L.fan === 'right') {
        p.cards.forEach((c, i) => {
          const k = Math.max(0, i - (n - 3));
          out.set(c.id, { x: L.x + k * this.cw * 0.3, y: L.y, depth: base + i, up: c.up });
          this.where.set(c.id, [p.id, i]);
        });
      } else if (L.fan === 'stock') {
        p.cards.forEach((c, i) => {
          // Spider: show remaining deals as offset groups.
          const grp = this.st.mode === 'spider' ? Math.floor(i / 10) : Math.min(i, 2) / 3;
          const off = this.st.mode === 'spider' ? grp * this.cw * 0.18 * (save.data.settings.leftHand ? 1 : -1) : -grp * 4;
          out.set(c.id, { x: L.x + off, y: L.y + (this.st.mode === 'spider' ? 0 : -grp * 4), depth: base + i, up: c.up });
          this.where.set(c.id, [p.id, i]);
        });
      } else {
        p.cards.forEach((c, i) => {
          out.set(c.id, { x: L.x, y: L.y, depth: base + i, up: c.up });
          this.where.set(c.id, [p.id, i]);
        });
      }
    }
    return out;
  }

  /* ------------------------------------------------------------ build */

  private buildSlots(): void {
    for (const [id, L] of this.layout) {
      const p = this.gm.pile(id);
      const img = this.add.image(L.x, L.y, 'card_slot').setDisplaySize(this.cw, this.ch).setDepth(1);
      if (p.kind === 'found') {
        txt(this, L.x, L.y, this.st.mode === 'spider' ? '' : 'A', this.cw * 0.4, 'rgba(255,255,255,0.35)', { strokeThickness: 0 }).setDepth(2);
        if (this.st.mode === 'spider' && p.index > 0) img.setVisible(false);
      }
      if (p.kind === 'stock') {
        img.setInteractive({ useHandCursor: true });
        img.on('pointerup', () => this.onStock());
        if (this.st.mode === 'klondike') this.add.image(L.x, L.y, 'i_refresh').setDisplaySize(this.cw * 0.5, this.cw * 0.5).setAlpha(0.5).setDepth(2);
      }
    }
  }

  private buildViews(): void {
    for (const p of this.gm.piles)
      for (const c of p.cards) {
        const v = new CardView(this, c, skin.cards, this.cw, this.ch, c.up);
        v.setInteractive({ useHandCursor: true });
        v.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.onCardDown(c.id, ptr));
        this.views.set(c.id, v);
      }
  }

  private sync(animate: boolean): void {
    const pos = this.positions();
    for (const [id, tgt] of pos) {
      const v = this.views.get(id)!;
      v.setDepth(tgt.depth);
      if (v.faceUp !== tgt.up) v.setFaceUp(tgt.up, animate);
      if (animate && (Math.abs(v.x - tgt.x) > 1 || Math.abs(v.y - tgt.y) > 1)) v.glide(tgt.x, tgt.y, 190);
      else if (!animate) {
        v.stopGlide();
        v.setPosition(tgt.x, tgt.y);
      }
      v.setLifted(false);
    }
    if (this.stockLabel) {
      const n = this.gm.pile('stock')?.cards.length ?? 0;
      this.stockLabel.setText(this.st.mode === 'spider' ? `×${Math.ceil(n / 10)}` : String(n));
    }
  }

  private buildHud(): void {
    const W = this.W;
    const H = this.H;
    const g = this.add.graphics().setDepth(2000);
    g.fillStyle(UI.inkN, 0.55).fillRect(0, 0, W, this.portrait ? 150 : 110);
    const hy = this.portrait ? 75 : 55;
    new IconButton(this, 75, hy, 'i_pause', this.portrait ? 100 : 90, 'dark').onClick(() => this.openPause()).setDepth(2001);
    const title = this.st.daily ? t('daily') : t(this.st.mode) + (this.st.mode === 'freecell' ? ` · ${t('dealNo', { n: this.gm.seed })}` : this.st.mode === 'spider' ? ` · ${(this.gm as Spider).suits}♠` : '');
    txt(this, W / 2, hy - (this.portrait ? 22 : 18), title, this.portrait ? 40 : 36, UI.gold).setDepth(2001);
    this.scoreT = txt(this, W / 2 - 220, hy + 26, '', 30, '#ffffff').setDepth(2001);
    this.movesT = txt(this, W / 2, hy + 26, '', 30, '#ffffff').setDepth(2001);
    this.timeT = txt(this, W / 2 + 220, hy + 26, '', 30, '#ffffff').setDepth(2001).setVisible(save.data.settings.timer);
    if (!this.portrait) {
      this.scoreT.setPosition(W - 520, hy);
      this.movesT.setPosition(W - 320, hy);
      this.timeT.setPosition(W - 130, hy);
    }
    const stockL = this.layout.get('stock');
    if (stockL) {
      this.stockLabel = txt(this, stockL.x, stockL.y - this.ch / 2 + 6, '', 28, '#ffffff').setDepth(500);
    }

    // Tools
    const size = this.portrait ? 130 : 120;
    const mk = (icon: string, label: string, fn: () => void, color: 'dark' | 'green' = 'dark') => {
      const b = new Button(this, 0, 0, { w: size, h: size, color, icon: `i_${icon}`, iconSize: size * 0.6, radius: 34 }).onClick(fn).setDepth(2001);
      const l = txt(this, 0, 0, label, 26, '#ffffff').setDepth(2001);
      return { b, l };
    };
    const items = [mk('undo', t('undo'), () => this.onUndo()), mk('hint', t('hint'), () => this.onHint()), mk('refresh', t('newDeal'), () => this.newDealConfirm())];
    const auto = mk('wand', t('autoComplete'), () => this.autoComplete(), 'green');
    this.btnUndo = items[0].b;
    this.btnHint = items[1].b;
    this.btnAuto = auto.b;
    if (this.portrait) {
      const y = H - 115;
      [...items, auto].forEach((it, i) => {
        const x = W / 2 + (i - 1.5) * (size + 60);
        it.b.setPosition(x, y);
        it.l.setPosition(x, y + size / 2 + 22);
      });
    } else {
      [...items, auto].forEach((it, i) => {
        const x = this.W - 110;
        const y = 300 + i * (size + 70);
        it.b.setPosition(x, y);
        it.l.setPosition(x, y + size / 2 + 22);
      });
    }
    this.btnAuto.setVisible(false);
    auto.l.setVisible(false);
    this.btnAuto.setData('label', auto.l);
  }

  private refreshHud(): void {
    const g = this.gm;
    this.scoreT.setText(`${t('score')}: ${g.score}`);
    this.movesT.setText(`${t('moves')}: ${g.moves}`);
    this.timeT.setText(formatTime(g.time));
    this.btnUndo.setEnabled(g.canUndo);
    this.btnUndo.setBadge(this.st.freeUndo > 0 ? String(this.st.freeUndo) : save.data.boosters.undo > 0 ? `+${save.data.boosters.undo}` : null);
    this.btnHint.setBadge(this.st.freeHint > 0 ? String(this.st.freeHint) : save.data.boosters.hint > 0 ? `+${save.data.boosters.hint}` : null);
    const canAuto = g.canAutoComplete && !this.ended;
    this.btnAuto.setVisible(canAuto);
    (this.btnAuto.getData('label') as Phaser.GameObjects.Text).setVisible(canAuto);
    if (canAuto && !this.tweens.isTweening(this.btnAuto)) this.tweens.add({ targets: this.btnAuto, scale: 1.1, duration: 400, yoyo: true, repeat: -1 });
  }

  /* ------------------------------------------------------------ input */

  private onCardDown(id: number, p: Phaser.Input.Pointer): void {
    if (this.busy || this.ended || pauseHub.paused || this.drag) return;
    const w = this.where.get(id);
    if (!w) return;
    const [pileId, index] = w;
    const pile = this.gm.pile(pileId);
    if (pile.kind === 'stock') {
      this.onStock();
      return;
    }
    if (!this.gm.canPick(pileId, index)) {
      return;
    }
    this.clearHints();
    const views = pile.cards.slice(index).map((c) => this.views.get(c.id)!);
    const lead = views[0];
    views.forEach((v, k) => {
      v.setDepth(5000 + k);
      v.setLifted(true);
    });
    this.drag = { pile: pileId, index, views, ox: p.x - lead.x, oy: p.y - lead.y, sx: p.x, sy: p.y, moved: false };
  }

  private onDragMove(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d || !p.isDown) return;
    if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) < 14) return;
    d.moved = true;
    const step = d.views.length > 1 ? d.views[1].y - d.views[0].y || this.ch * 0.28 : 0;
    d.views.forEach((v, k) => {
      v.stopGlide();
      v.setPosition(p.x - d.ox, p.y - d.oy + k * step);
    });
  }

  private onDragEnd(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    if (!d.moved) {
      // Tap: send the card(s) to the best destination.
      const to = this.gm.autoTarget(d.pile, d.index);
      if (to) this.doMove({ from: d.pile, index: d.index, to });
      else {
        audio.play('error', { vol: 0.4 });
        const lead = d.views[0];
        this.sync(true);
        this.tweens.add({ targets: lead, x: lead.x + 10, duration: 50, yoyo: true, repeat: 2, delay: 200 });
      }
      return;
    }
    const lead = d.views[0];
    const to = this.dropTarget(lead.x, lead.y, d.pile, d.index);
    if (to) this.doMove({ from: d.pile, index: d.index, to });
    else {
      audio.play('error', { vol: 0.3 });
      this.sync(true);
    }
    void p;
  }

  /** Pile under the dragged card that accepts it (closest by distance). */
  private dropTarget(x: number, y: number, from: string, index: number): string | null {
    let best: string | null = null;
    let bestD = Infinity;
    for (const pile of this.gm.piles) {
      if (pile.id === from || pile.kind === 'stock' || pile.kind === 'waste') continue;
      const L = this.layout.get(pile.id);
      if (!L) continue;
      let ty = L.y;
      if (L.fan === 'down' && pile.cards.length) {
        const last = this.views.get(pile.cards[pile.cards.length - 1].id)!;
        ty = last.y;
      }
      const dx = Math.abs(x - L.x);
      const dy = Math.abs(y - ty);
      if (dx > this.cw * 0.95 || dy > this.ch * 1.0) continue;
      const m = { from, index, to: pile.id };
      if (!this.gm.canMove(m)) continue;
      const dist = dx + dy * 0.6;
      if (dist < bestD) {
        bestD = dist;
        best = pile.id;
      }
    }
    return best;
  }

  /* ------------------------------------------------------------ actions */

  private doMove(m: MoveRef): void {
    const toFound = this.gm.pile(m.to).kind === 'found';
    if (!this.gm.move(m)) {
      this.sync(true);
      return;
    }
    audio.play(toFound ? 'flip' : 'place');
    if (this.st.mode === 'spider') {
      // A completed run flew home?
      const done = (this.gm as Spider).completed;
      if (done > (this.lastCompleted ?? 0)) {
        audio.play('star');
        this.lastCompleted = done;
      }
    }
    this.afterMove();
  }

  private lastCompleted = 0;

  private afterMove(): void {
    this.sync(true);
    this.refreshHud();
    this.persist();
    if (this.gm.won) return this.onWin();
    this.time.delayedCall(220, () => this.autoPlay());
    this.stuckShown = false;
    this.time.delayedCall(500, () => this.checkStuck());
  }

  /** Auto-move safe cards home (setting). */
  private autoPlay(): void {
    if (!save.data.settings.autoMove || this.ended || this.drag) return;
    const m = this.gm.safeStep?.();
    if (m && this.gm.move(m)) {
      audio.play('flip', { vol: 0.6 });
      this.sync(true);
      this.refreshHud();
      this.persist();
      if (this.gm.won) return this.onWin();
      this.time.delayedCall(140, () => this.autoPlay());
    }
  }

  private onStock(): void {
    if (this.busy || this.ended || pauseHub.paused) return;
    if (this.st.mode === 'freecell') return;
    if (this.st.mode === 'spider' && (this.gm as Spider).dealBlocked) return toast(this, t('dealBlocked'));
    if (!this.gm.canDraw) return;
    this.clearHints();
    if (this.gm.draw()) {
      audio.play(this.st.mode === 'spider' ? 'deal' : 'draw');
      this.afterMove();
    }
  }

  private onUndo(): void {
    if (this.busy || this.ended || !this.gm.canUndo) return;
    const run = () => {
      this.clearHints();
      this.gm.undo();
      audio.play('whoosh');
      this.sync(true);
      this.refreshHud();
      this.persist();
    };
    if (this.st.freeUndo > 0) {
      this.st.freeUndo--;
      run();
    } else if (useBooster('undo')) run();
    else
      this.offer(t('b_undo'), t('b_undo_d'), 'undo', 'cl_undo', 60, () => {
        this.st.freeUndo += FREE_UNDO;
        this.refreshHud();
      });
  }

  private onHint(): void {
    if (this.busy || this.ended) return;
    const show = () => {
      this.clearHints();
      const h = this.gm.hint();
      audio.play('hint');
      if (!h) return toast(this, t('noMoves'));
      if (h.t === 'draw') {
        const L = this.layout.get('stock')!;
        const gl = this.add.image(L.x, L.y, 'card_glow').setDisplaySize(this.cw * 1.2, this.ch * 1.14).setDepth(4000);
        this.tweens.add({ targets: gl, alpha: 0.3, duration: 450, yoyo: true, repeat: -1 });
        this.glowSlots.push(gl);
        return;
      }
      const src = this.gm.pile(h.m.from);
      const card = src.cards[h.m.index];
      const v = this.views.get(card.id)!;
      v.setGlow(true);
      this.glows.push(v);
      const dst = this.gm.pile(h.m.to);
      const top = dst.cards[dst.cards.length - 1];
      if (top) {
        const tv = this.views.get(top.id)!;
        tv.setGlow(true, 0x9ff0c8);
        this.glows.push(tv);
      } else {
        const L = this.layout.get(dst.id)!;
        const gl = this.add.image(L.x, L.y, 'card_glow').setDisplaySize(this.cw * 1.2, this.ch * 1.14).setTint(0x9ff0c8).setDepth(4000);
        this.tweens.add({ targets: gl, alpha: 0.3, duration: 450, yoyo: true, repeat: -1 });
        this.glowSlots.push(gl);
      }
    };
    if (this.st.freeHint > 0) {
      this.st.freeHint--;
      show();
    } else if (useBooster('hint')) show();
    else
      this.offer(t('b_hint'), t('b_hint_d'), 'hint', 'cl_hint', 60, () => {
        this.st.freeHint += FREE_HINT;
        show();
      });
    this.refreshHud();
  }

  private clearHints(): void {
    this.glows.forEach((v) => v.setGlow(false));
    this.glows = [];
    this.glowSlots.forEach((g) => g.destroy());
    this.glowSlots = [];
  }

  private autoComplete(): void {
    if (this.ended) return;
    this.busy = true;
    const step = () => {
      const m = this.gm.autoStep();
      if (!m) {
        this.busy = false;
        if (this.gm.won) this.onWin();
        return;
      }
      this.gm.move(m);
      audio.play('flip', { vol: 0.5 });
      this.sync(true);
      this.refreshHud();
      if (this.gm.won) {
        this.busy = false;
        return this.onWin();
      }
      this.time.delayedCall(90, step);
    };
    step();
  }

  private checkStuck(): void {
    if (this.ended || this.stuckShown || this.busy || !this.gm.stuck) return;
    this.stuckShown = true;
    const W = this.W;
    const m = openModal(this, t('noMoves'), Math.min(W - 60, 820), 640, undefined, { depth: 2500 });
    m.root.add(this.add.image(W / 2, m.y + 200, 'i_cards').setDisplaySize(160, 160));
    const y0 = m.y + 360;
    m.root.add(
      new Button(this, W / 2, y0, { w: 480, h: 110, color: 'blue', label: t('undo'), size: 38 }).onClick(() => {
        m.close();
        this.onUndo();
      }),
    );
    m.root.add(
      new Button(this, W / 2, y0 + 140, { w: 480, h: 110, color: 'green', label: t('newDeal'), size: 38 }).onClick(() => {
        m.close();
        this.finishLost(true);
      }),
    );
  }

  private newDealConfirm(): void {
    confirm(this, t('quitConfirm'), () => this.finishLost(true));
  }

  /** Counts the current deal as lost and starts another (or returns to the menu). */
  private finishLost(newDeal: boolean): void {
    this.ended = true;
    save.data.resume = null;
    save.save();
    const mode = this.st.daily ? 'daily' : this.st.mode;
    if (this.gm.moves > 0) {
      save.data.stats[mode].played++;
      save.data.stats[mode].streak = 0;
      save.data.totals.played++;
    }
    if (newDeal) this.go('Classic', { mode: this.st.mode, newGame: true }, 'new_deal');
    else this.go(this.st.daily ? 'Daily' : 'Menu', {}, 'quit_game');
  }

  private offer(title: string, desc: string, icon: string, placement: string, price: number, give: () => void): void {
    const W = this.W;
    const m = openModal(this, title, Math.min(W - 60, 820), 620, undefined, { depth: 2500 });
    m.root.add(this.add.image(W / 2, m.y + 200, `i_${icon}`).setDisplaySize(170, 170));
    m.root.add(txt(this, W / 2, m.y + 340, desc, 36, '#ffffff', { wordWrap: { width: m.w - 80 } }));
    m.root.add(
      new Button(this, W / 2 - 180, m.y + m.h - 110, { w: 320, h: 120, color: 'green', label: t('free'), size: 36, ad: true }).onClick(() => {
        m.close();
        void watchAd(this, placement, give);
      }),
    );
    m.root.add(
      new Button(this, W / 2 + 180, m.y + m.h - 110, { w: 300, h: 120, color: 'gold', label: String(price), icon: 'i_coin', size: 40 }).onClick(() => {
        if (!spendCoins(price)) return toast(this, t('notEnough'), '#ff8a8a');
        audio.play('buy');
        m.close();
        give();
      }),
    );
  }

  private persist(): void {
    if (this.ended) return;
    const s = this.gm.serialize() as ResumeSave;
    save.data.resume = { ...s, daily: this.st.daily, freeUndo: this.st.freeUndo, freeHint: this.st.freeHint };
    save.save();
  }

  /* ------------------------------------------------------------ end */

  private onWin(): void {
    if (this.ended) return;
    this.ended = true;
    this.clearHints();
    save.data.resume = null;
    save.save();
    audio.play('win');
    // Bouncing cascade from the foundations.
    const founds = this.gm.piles.filter((p: Pile) => p.kind === 'found');
    let k = 0;
    for (const f of founds) {
      f.cards.slice(-13).forEach((c: SCard) => {
        const v = this.views.get(c.id);
        if (!v) return;
        const dir = k % 2 ? 1 : -1;
        this.tweens.add({
          targets: v,
          x: v.x + dir * Phaser.Math.Between(200, 700),
          y: this.H + 200,
          angle: dir * Phaser.Math.Between(90, 360),
          duration: Phaser.Math.Between(900, 1500),
          delay: 300 + k * 18,
          ease: 'Quad.In',
        });
        k++;
      });
    }
    const g = this.gm;
    const daily = this.st.daily;
    this.time.delayedCall(1600, () =>
      this.go('Result', {
        mode: daily ? 'daily' : this.st.mode,
        day: daily,
        won: true,
        score: g.score,
        time: g.time,
        moves: g.moves,
        suits: this.st.mode === 'spider' ? (g as Spider).suits : undefined,
        draw: this.st.mode === 'klondike' ? (g as Klondike).drawCount : undefined,
      }),
    );
  }

  /* ------------------------------------------------------------ pause */

  private openPause(): void {
    if (this.ended) return;
    pauseHub.set('menu', true);
    const W = this.W;
    const m = openModal(this, t('pause'), Math.min(W - 60, 760), 760, () => pauseHub.set('menu', false), { depth: 2600 });
    const y0 = m.y + 190;
    const b = (i: number, label: string, color: 'green' | 'blue' | 'dark' | 'red', fn: () => void) =>
      m.root.add(new Button(this, W / 2, y0 + i * 135, { w: 520, h: 112, color, label, size: 38 }).onClick(fn));
    b(0, t('continue'), 'green', () => m.close());
    b(1, t('rules'), 'blue', () => {
      m.close();
      pauseHub.set('menu', true);
      const r = openModal(this, t('rules'), Math.min(W - 60, 900), 900, () => pauseHub.set('menu', false), { depth: 2600 });
      r.root.add(txt(this, W / 2, r.y + r.h / 2 + 20, t(`r_${this.st.mode}`), 34, '#ffffff', { wordWrap: { width: r.w - 90 }, align: 'left', strokeThickness: 0 }));
    });
    b(2, t('newDeal'), 'dark', () => {
      m.close();
      this.newDealConfirm();
    });
    b(3, t('menu'), 'red', () => {
      // The deal stays saved and can be resumed from the menu.
      pauseHub.set('menu', false);
      this.persist();
      this.ended = true;
      this.go(this.st.daily ? 'Daily' : 'Menu', {}, 'quit_game');
    });
  }

  update(time: number): void {
    const dt = time - this.lastTick;
    this.lastTick = time;
    if (this.ended || pauseHub.paused || !this.st) return;
    this.gm.time += dt;
    if (save.data.settings.timer && Math.floor(this.gm.time / 1000) !== Math.floor((this.gm.time - dt) / 1000)) this.timeT?.setText(formatTime(this.gm.time));
  }
}
