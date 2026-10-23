import Phaser from 'phaser';
import { audio } from '@shared/audio/audio';
import { CardView } from '@shared/cards/CardView';
import type { Card } from '@shared/cards/card';
import { t } from '@shared/core/i18n';
import { pauseHub } from '@shared/core/pause';
import { formatTime } from '@shared/core/time';
import { ads } from '@shared/platform/ads';
import { platform } from '@shared/platform/platform';
import { BaseScene } from '@shared/ui/base';
import { openModal } from '@shared/ui/modal';
import { Button, IconButton, toast, txt, UI } from '@shared/ui/widgets';
import { registerOverlays } from '../art/overlays';
import type { BoosterId } from '../data/boosters';
import { cityOfLevel } from '../data/cities';
import { generateLevel } from '../logic/tpGenerator';
import { COMBO_FOR_JOKER, TriPeaks, type PCard, type TPEvent } from '../logic/tripeaks';
import { spendCoins, track, useBooster } from '../progress';
import { save } from '../save';
import { skin } from '../skin';
import { confirm, watchAd } from '../ui/common';
import { showTip } from '../ui/tutorial';

export type TPMode = 'adventure' | 'blitz' | 'daily';

export interface TPData {
  mode: TPMode;
  level?: number;
  boosters?: BoosterId[];
  day?: string;
  /** Kept across resize restarts. */
  state?: TPState;
}

interface TPState {
  game: TriPeaks;
  freeUndo: number;
  freeHint: number;
  continues: number;
  xray: boolean;
  timeLeft: number;
  blitzScore: number;
  blitzBoard: number;
  startTime: number;
}

const BLITZ_TIME = 180_000;
const CONTINUE_COINS = 300;

interface Layout {
  cw: number;
  ch: number;
  bx: number;
  by: number;
  gapX: number;
  stockX: number;
  stockY: number;
  wasteX: number;
  wasteY: number;
  port: boolean;
}

export class TriPeaksScene extends BaseScene {
  private st!: TPState;
  private td!: TPData;
  private L!: Layout;
  private views = new Map<number, CardView>();
  private stockImgs: Phaser.GameObjects.Image[] = [];
  private stockCount!: Phaser.GameObjects.Text;
  private stockZone!: Phaser.GameObjects.Zone;
  private scoreText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text | null = null;
  private comboG!: Phaser.GameObjects.Graphics;
  private comboLabel!: Phaser.GameObjects.Text;
  private btnUndo!: Button;
  private btnHint!: Button;
  private btnJoker!: Button;
  private btnPlus!: Button;
  private btnHammer: Button | null = null;
  private busy = false;
  private ended = false;
  private hintGlow: CardView | null = null;
  private stockGlow: Phaser.GameObjects.Image | null = null;
  private wasteDepth = 1000;
  private unsubPause: (() => void) | null = null;
  private lastTick = 0;

  constructor() {
    super('TriPeaks');
  }

  get gm(): TriPeaks {
    return this.st.game;
  }

  create(data: TPData): void {
    this.td = data;
    this.views = new Map();
    this.stockImgs = [];
    this.busy = false;
    this.ended = false;
    this.hintGlow = null;
    this.stockGlow = null;
    this.timerText = null;
    this.btnHammer = null;
    this.wasteDepth = 1000;
    registerOverlays(this.textures);
    const first = !data.state;
    if (data.state) this.st = data.state;
    else this.st = this.newState();
    this.sceneData = { ...data, state: this.st };

    this.add.image(0, 0, skin.table(this.W, this.H)).setOrigin(0);
    this.computeLayout();
    this.buildHud();
    this.buildBoard();
    this.buildStock();
    this.buildTools();
    this.refreshHud();

    if (first) this.applyStartBoosters();
    audio.playMusic(data.mode === 'blitz' ? 'blitz' : 'game', data.mode === 'adventure' ? cityOfLevel(data.level ?? 1).tr : 0);
    ads.inGameplay = true;
    platform.gameplayStart();
    this.unsubPause = pauseHub.subscribe((p) => {
      if (p) this.tweens.pauseAll();
      else this.tweens.resumeAll();
    });
    this.events.once('shutdown', () => {
      ads.inGameplay = false;
      platform.gameplayStop();
      this.unsubPause?.();
    });
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'z' || e.key === 'Z') this.onUndo();
      else if (e.key === 'h' || e.key === 'H') this.onHint();
      else if (e.key === ' ' || e.key === 'Enter') this.onStock();
      else if (e.key === 'Escape' || e.key === 'p') this.openPause();
    });
    this.setupScene();
    if (first) this.time.delayedCall(350, () => this.tutorial());
    this.lastTick = this.time.now;
  }

  protected onResize(): void {
    this.scene.restart({ ...this.td, state: this.st });
  }

  private newState(): TPState {
    const d = this.td;
    let def;
    if (d.mode === 'blitz') def = generateLevel(blitzLevel(0));
    else def = generateLevel(d.level ?? 1);
    return { game: new TriPeaks(def), freeUndo: 3, freeHint: 1, continues: 0, xray: false, timeLeft: BLITZ_TIME, blitzScore: 0, blitzBoard: 0, startTime: Date.now() };
  }

  /* ------------------------------------------------------------ layout */

  private computeLayout(): void {
    const W = this.W;
    const H = this.H;
    const port = this.portrait;
    const slots = this.gm.def.slots;
    const maxX = Math.max(...slots.map((s) => s.x)) + 1;
    const maxY = Math.max(...slots.map((s) => s.y)) + 1;
    const gapX = 1.06;
    let areaX: number, areaY: number, areaW: number, areaH: number;
    if (port) {
      areaX = 20;
      areaY = 280;
      areaW = W - 40;
      areaH = H - 280 - 560;
    } else {
      areaX = 250;
      areaY = 240;
      areaW = W - 250 - 360;
      areaH = H - 240 - 30;
    }
    let cw = Math.min(areaW / (maxX * gapX), areaH / (maxY * 1.4));
    cw = Math.min(cw, port ? 160 : 175);
    const ch = cw * 1.4;
    const bw = (maxX - 1) * gapX * cw + cw;
    const bh = (maxY - 1) * ch + ch;
    const bx = areaX + (areaW - bw) / 2 + cw / 2;
    const by = areaY + (areaH - bh) / 2 + ch / 2;
    const pcw = port ? Math.max(cw, 150) : Math.max(cw, 150);
    let stockX: number, stockY: number, wasteX: number, wasteY: number;
    if (port) {
      stockY = H - 380;
      wasteY = stockY;
      stockX = W / 2 - 170;
      wasteX = W / 2 + 60;
    } else {
      stockX = W - 260;
      stockY = 330;
      wasteX = W - 160;
      wasteY = 700;
    }
    this.L = { cw, ch, bx, by, gapX, stockX, stockY, wasteX, wasteY, port };
    void pcw;
  }

  private slotPos(i: number): { x: number; y: number } {
    const s = this.gm.def.slots[i];
    return { x: this.L.bx + s.x * this.L.gapX * this.L.cw, y: this.L.by + s.y * this.L.ch };
  }

  /** Size of stock / waste cards (bigger than board cards on small boards). */
  private get pileW(): number {
    return Math.max(this.L.cw, this.L.port ? 160 : 150);
  }

  /* ------------------------------------------------------------ HUD */

  private buildHud(): void {
    const W = this.W;
    const g = this.add.graphics().setDepth(2000);
    g.fillStyle(UI.inkN, 0.55).fillRect(0, 0, W, 160);
    new IconButton(this, 80, 80, 'i_pause', 100, 'dark').onClick(() => this.openPause()).setDepth(2001);
    const d = this.td;
    const title = d.mode === 'blitz' ? t('blitz') : d.mode === 'daily' ? t('daily') : t('levelN', { n: d.level ?? 1 });
    txt(this, W / 2, 50, title + (this.gm.def.boss && d.mode === 'adventure' ? ` · ${t('boss')}` : ''), 44, this.gm.def.boss ? '#ff8fa3' : UI.gold).setDepth(2001);
    this.goalText = txt(this, W / 2, 112, '', 34, '#ffffff').setDepth(2001);
    this.scoreText = txt(this, W - 150, 80, '', 46, '#ffffff').setDepth(2001);
    if (d.mode === 'blitz') {
      this.timerText = txt(this, W / 2, 112, '', 44, '#ffd166').setDepth(2001);
      this.goalText.setVisible(false);
    }
    // Combo meter
    this.comboG = this.add.graphics().setDepth(2001);
    this.comboLabel = txt(this, 0, 0, '', 30, '#ffd166').setDepth(2001);
  }

  private drawCombo(): void {
    const g = this.comboG;
    g.clear();
    const n = COMBO_FOR_JOKER;
    const pw = 54;
    const cx = this.W / 2;
    const y = this.L.port ? 212 : 196;
    const x0 = cx - (n * (pw + 8)) / 2;
    g.fillStyle(UI.inkN, 0.6).fillRoundedRect(x0 - 16, y - 24, n * (pw + 8) + 24, 48, 24);
    for (let i = 0; i < n; i++) {
      const on = i < this.gm.comboMeter;
      g.fillStyle(on ? 0xffc531 : 0x34466e, 1).fillRoundedRect(x0 + i * (pw + 8), y - 12, pw, 24, 12);
    }
    this.comboLabel.setPosition(x0 + n * (pw + 8) + 40, y).setText('★');
  }

  private refreshHud(): void {
    const gm = this.gm;
    if (this.td.mode === 'blitz') this.scoreText.setText(String(this.st.blitzScore + gm.score));
    else this.scoreText.setText(String(gm.score));
    if (gm.def.goal === 'gold') this.goalText.setText(`${t('goalGold', { n: `${gm.gold}/${gm.goldTotal}` })}`);
    else this.goalText.setText(`${t('goalClear')}: ${gm.removed.filter((r) => !r).length}`);
    this.drawCombo();
    this.stockCount?.setText(String(gm.stockLeft));
    this.refreshStock();
    if (this.btnJoker) {
      this.btnJoker.setBadge(gm.jokers > 0 ? String(gm.jokers) : null);
      this.btnUndo.setEnabled(gm.canUndo);
      this.btnUndo.setBadge(this.st.freeUndo > 0 ? String(this.st.freeUndo) : save.data.boosters.undo > 0 ? `+${save.data.boosters.undo}` : null);
      this.btnHint.setBadge(this.st.freeHint > 0 ? String(this.st.freeHint) : save.data.boosters.hint > 0 ? `+${save.data.boosters.hint}` : null);
      this.btnPlus.setVisible(gm.stockLeft === 0 && !this.ended);
    }
  }

  /* ------------------------------------------------------------ board */

  private buildBoard(): void {
    const gm = this.gm;
    gm.def.slots.forEach((s, i) => {
      if (gm.removed[i]) return;
      const v = this.makeView(s.card, this.L.cw, this.faceFor(i));
      const p = this.slotPos(i);
      v.setPosition(p.x, p.y).setDepth(10 + s.z * 10);
      v.setInteractive({ useHandCursor: true });
      v.on('pointerup', () => this.onSlot(i));
      this.decorate(i, v);
    });
    // Waste: show the top two cards.
    const w = gm.waste;
    for (let k = Math.max(0, w.length - 2); k < w.length; k++) {
      const v = this.makeView(w[k], this.pileW, true);
      v.setPosition(this.L.wasteX, this.L.wasteY).setDepth(this.wasteDepth++);
    }
  }

  private faceFor(i: number): boolean {
    return this.gm.isOpen(i) || this.st.xray;
  }

  private makeView(c: PCard, cw: number, faceUp: boolean): CardView {
    const v = new CardView(this, c as Card, skin.cards, cw, cw * 1.4, faceUp);
    if (c.wild) {
      v.wild = true;
      v.refresh();
    }
    this.views.set(c.id, v);
    return v;
  }

  /** Obstacles / bonuses drawn over a slot card. */
  private decorate(i: number, v: CardView): void {
    v.clearOverlays();
    const gm = this.gm;
    const s = gm.def.slots[i];
    const cw = v.cw;
    const ch = v.ch;
    if (this.st.xray && !gm.isOpen(i)) v.setDim(true);
    else v.setDim(false);
    if (s.gold) {
      v.addOverlay(this.add.image(0, 0, 'ov_gold').setDisplaySize(cw, ch));
      v.addOverlay(this.add.image(cw * 0.3, ch * 0.32, 'i_star').setDisplaySize(cw * 0.42, cw * 0.42));
    }
    if (s.coins) v.addOverlay(this.add.image(-cw * 0.3, ch * 0.34, 'i_coin').setDisplaySize(cw * 0.38, cw * 0.38));
    if (s.key !== undefined && !gm.opened.includes(s.key)) {
      v.addOverlay(this.add.image(cw * 0.26, -ch * 0.08, 'i_key').setDisplaySize(cw * 0.5, cw * 0.5).setTint(KEY_TINT[s.key % KEY_TINT.length]));
    }
    if (gm.isLocked(i)) {
      v.addOverlay(this.add.image(0, 0, 'ov_lock').setDisplaySize(cw, ch));
      v.addOverlay(this.add.image(0, 0, 'i_lock').setDisplaySize(cw * 0.62, cw * 0.62).setTint(KEY_TINT[(s.lock ?? 0) % KEY_TINT.length]));
    }
    if (gm.ice[i] > 0) v.addOverlay(this.add.image(0, 0, `ov_ice${Math.min(2, gm.ice[i])}`).setDisplaySize(cw, ch));
    if (gm.bomb[i] > 0) {
      const b = this.add.image(0, ch * 0.18, 'i_bomb').setDisplaySize(cw * 0.6, cw * 0.6);
      const tt = txt(this, 0, ch * 0.24, String(gm.bomb[i]), cw * 0.3, gm.bomb[i] <= 3 ? '#ff6b6b' : '#ffffff');
      v.addOverlay(b);
      v.addOverlay(tt);
      if (gm.bomb[i] <= 3) this.tweens.add({ targets: b, scale: b.scale * 1.15, duration: 300, yoyo: true, repeat: -1 });
    }
  }

  /* ------------------------------------------------------------ stock */

  private buildStock(): void {
    const { stockX, stockY } = this.L;
    const pw = this.pileW;
    this.add.image(stockX, stockY, 'card_slot').setDisplaySize(pw, pw * 1.4).setDepth(5);
    this.add.image(this.L.wasteX, this.L.wasteY, 'card_slot').setDisplaySize(pw, pw * 1.4).setDepth(5);
    for (let k = 0; k < 6; k++) {
      const img = this.add.image(stockX - k * 3, stockY - k * 4, skin.cards.back).setDisplaySize(pw, pw * 1.4).setDepth(20 + k);
      this.stockImgs.push(img);
    }
    this.stockCount = txt(this, stockX, stockY + pw * 0.7 + 40, '', 40, '#ffffff').setDepth(40);
    this.stockZone = this.add.zone(stockX, stockY, pw + 30, pw * 1.4 + 30).setInteractive({ useHandCursor: true }).setDepth(41);
    this.stockZone.on('pointerup', () => this.onStock());
  }

  private refreshStock(): void {
    const left = this.gm.stockLeft;
    this.stockImgs.forEach((img, k) => img.setVisible(k < Math.min(6, left)));
  }

  /* ------------------------------------------------------------ tools */

  private buildTools(): void {
    const W = this.W;
    const H = this.H;
    const size = 130;
    const mk = (icon: string, label: string, onClick: () => void, color: 'dark' | 'purple' | 'green' = 'dark') => {
      const b = new Button(this, 0, 0, { w: size, h: size, color, icon: `i_${icon}`, iconSize: size * 0.6, radius: 36 }).onClick(onClick);
      b.setDepth(2001);
      const l = txt(this, 0, size / 2 + 26, label, 26, '#ffffff').setDepth(2001);
      return { b, l };
    };
    const items = [
      mk('undo', t('undo'), () => this.onUndo()),
      mk('hint', t('hint'), () => this.onHint()),
      mk('joker', t('joker'), () => this.onJoker(), 'purple'),
    ];
    const plus = mk('deck', t('plus5'), () => this.onPlus5(), 'green');
    this.btnUndo = items[0].b;
    this.btnHint = items[1].b;
    this.btnJoker = items[2].b;
    this.btnPlus = plus.b;
    if (save.data.boosters.breaker > 0 && this.hasObstacles()) {
      const h = mk('lightning', t('b_breaker'), () => this.onHammer());
      this.btnHammer = h.b;
      this.btnHammer.setBadge(String(save.data.boosters.breaker));
      items.push(h);
    }
    if (this.L.port) {
      const y = H - 120;
      items.forEach((it, i) => {
        const x = W / 2 + (i - (items.length - 1) / 2) * (size + 50);
        it.b.setPosition(x, y);
        it.l.setPosition(x, y + size / 2 + 22);
      });
      plus.b.setPosition(this.L.stockX, this.L.stockY);
      plus.l.setPosition(-999, -999);
    } else {
      const x = 125;
      items.forEach((it, i) => {
        const y = 330 + i * (size + 70);
        it.b.setPosition(x, y);
        it.l.setPosition(x, y + size / 2 + 22);
      });
      plus.b.setPosition(this.L.stockX, this.L.stockY);
      plus.l.setPosition(-999, -999);
    }
  }

  private hasObstacles(): boolean {
    const gm = this.gm;
    return gm.def.slots.some((s, i) => !gm.removed[i] && (gm.ice[i] > 0 || gm.isLocked(i)));
  }

  /* ------------------------------------------------------------ boosters */

  private applyStartBoosters(): void {
    const b = this.td.boosters ?? [];
    for (const id of b) {
      if (id === 'startJoker') this.gm.jokers++;
      if (id === 'plus5') this.gm.addStock(5);
      if (id === 'xray') this.st.xray = true;
      if (id === 'breaker') this.gm.breakObstacles();
    }
    if (b.length) {
      audio.play('booster');
      this.syncBoard(false, null);
      this.refreshHud();
    }
  }

  /* ------------------------------------------------------------ actions */

  private clearHint(): void {
    this.hintGlow?.setGlow(false);
    this.hintGlow = null;
    this.stockGlow?.destroy();
    this.stockGlow = null;
  }

  private onSlot(i: number): void {
    if (this.busy || this.ended || pauseHub.paused) return;
    const v = this.views.get(this.gm.def.slots[i].card.id);
    if (!this.gm.canPlay(i)) {
      if (v && this.gm.isOpen(i)) {
        audio.play('error', { vol: 0.5 });
        this.tweens.add({ targets: v, x: v.x + 12, duration: 50, yoyo: true, repeat: 2 });
        if (this.gm.isLocked(i)) toast(this, t('tutorial_lock'));
        else if (this.gm.ice[i] > 0) toast(this, t('tutorial_ice'));
      }
      return;
    }
    this.clearHint();
    const ev = this.gm.apply({ t: 'play', slot: i });
    if (!ev) return;
    this.afterPlay(i, ev);
  }

  private afterPlay(i: number, ev: TPEvent): void {
    const gm = this.gm;
    const s = gm.def.slots[i];
    const v = this.views.get(s.card.id)!;
    v.removeInteractive();
    v.clearOverlays();
    v.setDim(false);
    v.setFaceUp(true, false);
    v.setDepth(this.wasteDepth++);
    const pw = this.pileW;
    this.tweens.add({ targets: v, x: this.L.wasteX, y: this.L.wasteY, angle: { from: 0, to: 360 * 0 }, duration: 260, ease: 'Cubic.Out' });
    this.tweens.add({ targets: v.img, displayWidth: pw, displayHeight: pw * 1.4, duration: 260 });
    v.cw = pw;
    v.ch = pw * 1.4;
    this.time.delayedCall(270, () => v.setCardSize(pw, pw * 1.4));
    audio.play('place');
    if (gm.combo >= 2) {
      audio.play('combo', { rate: Math.min(2.2, 1 + (gm.combo - 2) * 0.08), throttleMs: 0 });
      this.floatText(this.L.wasteX, this.L.wasteY - pw * 0.9, t('combo', { n: gm.combo }), '#ffd166');
    }
    if (ev.gold) {
      audio.play('gold');
      save.data.totals.gold++;
      track('gold', 1);
    }
    if (ev.coins) {
      audio.play('coin');
      this.floatText(v.x, v.y - 60, `+${ev.coins}`, '#ffe08a');
    }
    if (ev.cracked.length) {
      audio.play('ice');
      save.data.totals.ice += ev.cracked.length;
      track('ice', ev.cracked.length);
    }
    if (ev.unlocked.length) audio.play('lockOpen');
    if (ev.jokerEarned) {
      audio.play('joker');
      this.floatText(this.btnJoker.x, this.btnJoker.y - 110, '+1 ★', '#c9a7ff');
      this.tweens.add({ targets: this.btnJoker, scale: 1.25, duration: 160, yoyo: true, repeat: 1 });
    }
    save.data.totals.cards++;
    save.data.totals.bestCombo = Math.max(save.data.totals.bestCombo, gm.combo);
    this.trimWaste();
    this.syncBoard(true, ev);
    this.refreshHud();
    this.checkEnd(ev);
  }

  private onStock(): void {
    if (this.busy || this.ended || pauseHub.paused) return;
    const gm = this.gm;
    if (gm.stockLeft <= 0) {
      if (!gm.lost) toast(this, t('noMoves'));
      else this.checkEnd(null);
      return;
    }
    this.clearHint();
    const ev = gm.apply({ t: 'draw' });
    if (!ev) return;
    const c = gm.top;
    const pw = this.pileW;
    const v = this.makeView(c, pw, false);
    v.setPosition(this.L.stockX, this.L.stockY).setDepth(this.wasteDepth++);
    v.glide(this.L.wasteX, this.L.wasteY, 240);
    v.setFaceUp(true, true, 40);
    audio.play('draw');
    this.trimWaste();
    this.syncBoard(true, ev);
    this.refreshHud();
    this.checkEnd(ev);
  }

  private onJoker(): void {
    if (this.busy || this.ended) return;
    const gm = this.gm;
    if (gm.jokers > 0) {
      this.clearHint();
      gm.apply({ t: 'joker' });
      const c = gm.top;
      const pw = this.pileW;
      const v = this.makeView(c, pw, true);
      v.setPosition(this.btnJoker.x, this.btnJoker.y).setDepth(this.wasteDepth++).setScale(0.4);
      this.tweens.add({ targets: v, x: this.L.wasteX, y: this.L.wasteY, scale: 1, duration: 320, ease: 'Back.Out' });
      audio.play('joker');
      this.trimWaste();
      this.syncBoard(true, null);
      this.refreshHud();
      this.checkEnd(null);
      return;
    }
    // No jokers: inventory → ad → coins.
    if (useBooster('joker')) {
      gm.jokers++;
      this.refreshHud();
      this.onJoker();
      return;
    }
    this.offer(t('b_joker'), t('b_joker_d'), 'joker', 'tp_joker', 180, () => {
      gm.jokers++;
      this.refreshHud();
      audio.play('booster');
    });
  }

  private onUndo(): void {
    if (this.busy || this.ended) return;
    const gm = this.gm;
    if (!gm.canUndo) return;
    const doUndo = () => {
      this.clearHint();
      gm.undo();
      this.rebuild();
      audio.play('whoosh');
    };
    if (this.st.freeUndo > 0) {
      this.st.freeUndo--;
      doUndo();
    } else if (useBooster('undo')) doUndo();
    else
      this.offer(t('b_undo'), t('b_undo_d'), 'undo', 'tp_undo', 60, () => {
        this.st.freeUndo += 3;
        this.refreshHud();
      });
  }

  private onHint(): void {
    if (this.busy || this.ended) return;
    const show = () => {
      this.clearHint();
      const h = this.gm.hint();
      audio.play('hint');
      if (!h) return toast(this, t('noMoves'));
      if (h.t === 'play') {
        const v = this.views.get(this.gm.def.slots[h.slot].card.id);
        v?.setGlow(true);
        this.hintGlow = v ?? null;
      } else if (h.t === 'draw') {
        const pw = this.pileW;
        this.stockGlow = this.add.image(this.L.stockX, this.L.stockY, 'card_glow').setDisplaySize(pw * 1.2, pw * 1.4 * 1.14).setDepth(39);
        this.tweens.add({ targets: this.stockGlow, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
      } else {
        this.tweens.add({ targets: this.btnJoker, scale: 1.2, duration: 200, yoyo: true, repeat: 3 });
      }
    };
    if (this.st.freeHint > 0) {
      this.st.freeHint--;
      show();
    } else if (useBooster('hint')) show();
    else
      this.offer(t('b_hint'), t('b_hint_d'), 'hint', 'tp_hint', 60, () => {
        this.st.freeHint += 2;
        show();
      });
    this.refreshHud();
  }

  private onPlus5(): void {
    if (this.ended) return;
    if (useBooster('plus5')) {
      this.addCards();
      return;
    }
    this.offer(t('plus5'), t('oneMoreChance_d'), 'deck', 'tp_plus5', 250, () => this.addCards());
  }

  private addCards(): void {
    const n = this.gm.addStock(5);
    audio.play('shuffle');
    this.refreshHud();
    if (n <= 0) toast(this, t('noMoves'));
  }

  private onHammer(): void {
    if (this.busy || this.ended) return;
    if (!useBooster('breaker')) return;
    const changed = this.gm.breakObstacles();
    audio.play('booster');
    this.cameras.main.shake(200, 0.006);
    for (const i of changed) {
      const v = this.views.get(this.gm.def.slots[i].card.id);
      if (v) this.decorate(i, v);
    }
    this.btnHammer?.setBadge(save.data.boosters.breaker > 0 ? String(save.data.boosters.breaker) : null);
    if (save.data.boosters.breaker <= 0) this.btnHammer?.setEnabled(false);
    this.refreshHud();
  }

  /** Modal offering an in-game booster for a rewarded ad or coins. */
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

  /* ------------------------------------------------------------ sync */

  /** Keep only the top 2 waste cards as views. */
  private trimWaste(): void {
    const w = this.gm.waste;
    const keep = new Set(w.slice(-2).map((c) => c.id));
    const slotIds = new Set(this.gm.def.slots.map((s) => s.card.id));
    for (const c of w.slice(0, -2)) {
      const v = this.views.get(c.id);
      if (v && !keep.has(c.id)) {
        this.time.delayedCall(300, () => {
          if (!keep.has(c.id) && this.views.get(c.id) === v && this.gm.waste.indexOf(c) < this.gm.waste.length - 2) {
            v.destroy();
            this.views.delete(c.id);
          }
        });
      }
      void slotIds;
    }
  }

  /** Update faces / overlays of board cards after a move. */
  private syncBoard(animate: boolean, ev: TPEvent | null): void {
    const gm = this.gm;
    gm.def.slots.forEach((s, i) => {
      if (gm.removed[i]) return;
      const v = this.views.get(s.card.id);
      if (!v) return;
      const up = this.faceFor(i);
      if (v.faceUp !== up) v.setFaceUp(up, animate, 80);
      const changed = !ev || ev.opened.includes(i) || ev.cracked.includes(i) || ev.unlocked.includes(i) || gm.bomb[i] > 0 || this.st.xray;
      if (changed) this.decorate(i, v);
    });
    if (ev?.cracked.length) {
      for (const i of ev.cracked) {
        const v = this.views.get(gm.def.slots[i].card.id);
        if (v) this.tweens.add({ targets: v, angle: { from: -4, to: 4 }, duration: 60, yoyo: true, repeat: 2, onComplete: () => v.setAngle(0) });
      }
    }
  }

  /** Full rebuild of all card views from the model (after undo). */
  private rebuild(): void {
    for (const v of this.views.values()) v.destroy();
    this.views.clear();
    this.wasteDepth = 1000;
    this.buildBoard();
    this.refreshHud();
  }

  private floatText(x: number, y: number, s: string, color: string): void {
    const tt = txt(this, x, y, s, 46, color).setDepth(3000);
    this.tweens.add({ targets: tt, y: y - 90, alpha: { from: 1, to: 0 }, duration: 900, ease: 'Cubic.Out', onComplete: () => tt.destroy() });
  }

  /* ------------------------------------------------------------ end */

  private checkEnd(ev: TPEvent | null): void {
    const gm = this.gm;
    if (ev?.exploded !== null && ev?.exploded !== undefined) {
      const v = this.views.get(gm.def.slots[ev.exploded].card.id);
      audio.play('explode');
      this.cameras.main.shake(400, 0.02);
      if (v) {
        const boom = this.add.image(v.x, v.y, 'i_fire').setDisplaySize(260, 260).setDepth(3000);
        this.tweens.add({ targets: boom, scale: boom.scale * 1.6, alpha: 0, duration: 700, onComplete: () => boom.destroy() });
      }
      this.time.delayedCall(700, () => this.onLost(true));
      this.busy = true;
      return;
    }
    if (gm.won) {
      this.busy = true;
      this.time.delayedCall(350, () => this.onWon());
      return;
    }
    if (gm.lost) {
      this.busy = true;
      this.time.delayedCall(450, () => this.onLost(false));
      return;
    }
    // Bomb ticking sound when a timer is low.
    if (gm.bomb.some((b, i) => b > 0 && b <= 3 && gm.isOpen(i))) audio.play('bombTick');
  }

  private onWon(): void {
    const gm = this.gm;
    if (this.td.mode === 'blitz') {
      // Board cleared: bonus + next board.
      audio.play('win', { vol: 0.6 });
      this.st.blitzScore += gm.score + 500;
      this.st.timeLeft += 10_000;
      this.floatText(this.W / 2, this.H / 2, '+500  +10s', '#ffd166');
      this.time.delayedCall(700, () => this.nextBlitzBoard());
      return;
    }
    this.ended = true;
    audio.play('win');
    // Remaining stock cards fly away as bonus.
    const left = Math.min(gm.stockLeft, 12);
    for (let k = 0; k < left; k++) {
      const img = this.add.image(this.L.stockX, this.L.stockY, skin.cards.back).setDisplaySize(this.pileW, this.pileW * 1.4).setDepth(3000);
      this.tweens.add({ targets: img, x: this.W / 2 + Phaser.Math.Between(-300, 300), y: -200, angle: Phaser.Math.Between(-180, 180), delay: k * 70, duration: 600, onComplete: () => img.destroy() });
    }
    this.confetti();
    track('cards', 0);
    const elapsed = Date.now() - this.st.startTime;
    this.time.delayedCall(1200 + left * 70, () =>
      this.go('Result', {
        mode: this.td.mode === 'daily' ? 'daily' : 'tripeaks',
        won: true,
        level: this.td.level,
        day: this.td.day,
        stars: gm.stars,
        score: gm.score,
        bonusCoins: gm.coins,
        combo: gm.bestCombo,
        time: elapsed,
      }),
    );
  }

  private onLost(exploded: boolean): void {
    if (this.td.mode === 'blitz') {
      // Stuck in blitz: just deal the next board.
      this.st.blitzScore += this.gm.score;
      this.nextBlitzBoard();
      return;
    }
    audio.play('lose');
    const W = this.W;
    const m = openModal(this, exploded ? t('exploded') : t('oneMoreChance'), Math.min(W - 60, 860), 720, undefined, { closable: false, depth: 2500 });
    m.root.add(this.add.image(W / 2, m.y + 220, exploded ? 'i_bomb' : 'i_deck').setDisplaySize(190, 190));
    m.root.add(txt(this, W / 2, m.y + 380, exploded ? t('defuse_d') : t('oneMoreChance_d'), 38, '#ffffff', { wordWrap: { width: m.w - 80 } }));
    const cont = () => {
      m.close();
      this.st.continues++;
      if (exploded) this.gm.defuse(8);
      else this.gm.addStock(5);
      this.busy = false;
      audio.play('shuffle');
      this.rebuild();
    };
    const canCont = this.st.continues < 3 && (exploded || this.gm.stockCards.length > this.gm.stockLen);
    if (canCont) {
      m.root.add(
        new Button(this, W / 2 - 190, m.y + m.h - 220, { w: 340, h: 120, color: 'green', label: t('continueAd'), size: 36, ad: true }).onClick(() => {
          void watchAd(this, exploded ? 'tp_defuse' : 'tp_continue', cont);
        }),
      );
      m.root.add(
        new Button(this, W / 2 + 190, m.y + m.h - 220, { w: 300, h: 120, color: 'gold', label: String(CONTINUE_COINS), icon: 'i_coin', size: 40 }).onClick(() => {
          if (!spendCoins(CONTINUE_COINS)) return toast(this, t('notEnough'), '#ff8a8a');
          audio.play('buy');
          cont();
        }),
      );
    }
    m.root.add(
      new Button(this, W / 2, m.y + m.h - 85, { w: 360, h: 96, color: 'red', label: t('giveUp'), size: 34 }).onClick(() => {
        m.close();
        this.ended = true;
        this.go('Result', { mode: this.td.mode === 'daily' ? 'daily' : 'tripeaks', won: false, level: this.td.level, day: this.td.day, score: this.gm.score, exploded });
      }),
    );
  }

  private nextBlitzBoard(): void {
    this.st.blitzBoard++;
    const keepTime = this.st.timeLeft;
    const fresh = new TriPeaks(generateLevel(blitzLevel(this.st.blitzBoard)));
    fresh.comboJokers = true;
    this.st.game = fresh;
    this.st.timeLeft = keepTime;
    this.busy = false;
    audio.play('shuffle');
    this.scene.restart({ ...this.td, state: this.st });
  }

  private confetti(): void {
    const colors = [0xff6b6b, 0xffd166, 0x5ad17e, 0x5aa9ff, 0xb084ff];
    for (let i = 0; i < 70; i++) {
      const r = this.add.rectangle(Phaser.Math.Between(0, this.W), -30, 18, 28, colors[i % colors.length]).setDepth(4000);
      this.tweens.add({
        targets: r,
        y: this.H + 50,
        x: r.x + Phaser.Math.Between(-200, 200),
        angle: Phaser.Math.Between(-360, 360),
        duration: Phaser.Math.Between(1300, 2400),
        delay: Phaser.Math.Between(0, 500),
        onComplete: () => r.destroy(),
      });
    }
  }

  /* ------------------------------------------------------------ pause / tutorial */

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
      this.showRules();
    });
    b(2, t('restart'), 'dark', () =>
      confirm(this, t('quitConfirm'), () => {
        pauseHub.set('menu', false);
        this.scene.restart({ ...this.td, state: undefined });
      }),
    );
    b(3, this.td.mode === 'adventure' ? t('map') : t('menu'), 'red', () =>
      confirm(this, t('quitConfirm'), () => {
        pauseHub.set('menu', false);
        if (this.td.mode !== 'blitz') this.recordQuit();
        this.go(this.td.mode === 'adventure' ? 'Map' : this.td.mode === 'daily' ? 'Daily' : 'Menu', {}, 'quit_game');
      }),
    );
  }

  private recordQuit(): void {
    /* Leaving a level counts as a played (lost) game for statistics. */
    save.data.stats.tripeaks.played++;
    save.data.stats.tripeaks.streak = 0;
    save.save();
  }

  private showRules(): void {
    pauseHub.set('menu', true);
    const W = this.W;
    const m = openModal(this, t('rules'), Math.min(W - 60, 900), 900, () => pauseHub.set('menu', false), { depth: 2600 });
    m.root.add(txt(this, W / 2, m.y + m.h / 2 + 20, t(this.td.mode === 'blitz' ? 'r_blitz' : 'r_tripeaks'), 34, '#ffffff', { wordWrap: { width: m.w - 90 }, align: 'left', strokeThickness: 0 }));
  }

  private tutorial(): void {
    if (this.td.mode !== 'adventure') return;
    const lv = this.td.level ?? 1;
    const tut = save.data.tutorial;
    const gm = this.gm;
    const tips: { key: string; text: string; point?: { x: number; y: number } }[] = [];
    if (lv === 1 && !tut.tp1) {
      const p = gm.playable()[0];
      tips.push({ key: 'tp1', text: t('tutorial_tp1'), point: p !== undefined ? this.slotPos(p) : undefined });
      tips.push({ key: 'tp2', text: t('tutorial_tp2'), point: { x: this.L.stockX, y: this.L.stockY } });
      tips.push({ key: 'tp3', text: t('tutorial_tp3') });
    }
    const find = (pred: (i: number) => boolean) => {
      const i = gm.def.slots.findIndex((_, k) => pred(k));
      return i >= 0 ? this.slotPos(i) : undefined;
    };
    if (!tut.ice && gm.ice.some((x) => x > 0)) tips.push({ key: 'ice', text: t('tutorial_ice'), point: find((i) => gm.ice[i] > 0) });
    if (!tut.lock && gm.def.slots.some((s) => s.lock !== undefined)) tips.push({ key: 'lock', text: t('tutorial_lock'), point: find((i) => gm.def.slots[i].lock !== undefined) });
    if (!tut.gold && gm.def.goal === 'gold') tips.push({ key: 'gold', text: t('tutorial_gold'), point: find((i) => !!gm.def.slots[i].gold) });
    if (!tut.bomb && gm.def.slots.some((s) => s.bomb)) tips.push({ key: 'bomb', text: t('tutorial_bomb'), point: find((i) => !!gm.def.slots[i].bomb) });
    const next = () => {
      const tip = tips.shift();
      if (!tip) return;
      tut[tip.key] = true;
      save.save();
      showTip(this, tip.text, tip.point, next);
    };
    next();
  }

  /* ------------------------------------------------------------ loop */

  update(time: number): void {
    const dt = time - this.lastTick;
    this.lastTick = time;
    if (this.td.mode !== 'blitz' || this.ended || pauseHub.paused) return;
    this.st.timeLeft -= dt;
    this.timerText?.setText(formatTime(Math.max(0, this.st.timeLeft)));
    if (this.st.timeLeft <= 10_000) this.timerText?.setColor('#ff6b6b');
    if (this.st.timeLeft <= 0) {
      this.ended = true;
      audio.play('lose');
      const score = this.st.blitzScore + this.gm.score;
      this.go('Result', { mode: 'blitz', won: true, score, combo: this.gm.bestCombo, canExtend: true, blitzState: this.st });
    }
  }
}

const KEY_TINT = [0xffd166, 0x7dd3fc, 0xff8fa3, 0x86efac];

/** Blitz boards: mid-size templates without heavy obstacles. */
function blitzLevel(k: number): number {
  const pool = [1, 2, 3, 4, 5, 8, 16, 17, 31, 33, 41, 45];
  return pool[(k * 5 + Math.floor(Date.now() / 1000)) % pool.length];
}
