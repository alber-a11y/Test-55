import Phaser from 'phaser';
import { music } from '../../audio/music';
import { sfx, vibrate } from '../../audio/sfx';
import { engine } from '../../audio/engine';
import { ensureIcons, ensureSkin, trayTexture, pillTexture } from '../../art/textures';
import { TILE_H, TILE_W } from '../../art/skins';
import { bus, econ } from '../../core/economy';
import { t, type TKey } from '../../core/i18n';
import { Rng } from '../../core/rng';
import { store, type BoosterId, BOOSTERS } from '../../core/save';
import { BOOSTER_ICON, BOOSTER_PRICE, chestReward, levelReward } from '../../data/catalog';
import { BTN } from '../../data/themes';
import { BoardState } from '../../game/board';
import { generateLevel } from '../../game/generator';
import type { Level } from '../../game/types';
import { AD_CONFIG } from '../../platform/ads.config';
import { ads } from '../../platform/ads';
import { platform } from '../../platform/platform';
import { Button } from '../../ui/Button';
import { Popup } from '../../ui/Popup';
import { label, plain } from '../../ui/text';
import { CoinCounter, flyCoins, toast } from '../../ui/widgets';
import { BaseScene } from '../BaseScene';
import { TileView } from './TileView';

/** Half-tile grid step in px (tile body is 150×164 incl. its edge) and per-layer lift. */
const HX = 78;
const HY = 84;
const LIFT = 7;
const STACK_PEEK = 13;
const MAX_TRAY_CAP = 8;

type Mode = 'loading' | 'play' | 'won' | 'lost';

interface PendingMatch {
  ids: number[];
  ice: number[];
  unlocked: number[];
  timer: Phaser.Time.TimerEvent;
}

export class GameScene extends BaseScene {
  private levelN = 1;
  private level!: Level;
  private board!: BoardState;
  private views: TileView[] = [];
  private trayVisual: number[] = [];
  private pending: PendingMatch[] = [];
  private mode: Mode = 'loading';
  private elapsed = 0;
  private combo = 0;
  private lastMatchAt = -1e9;
  private comboBonus = 0;
  private continues = 0;
  private rng = new Rng(Date.now() >>> 0);

  private set = 'icons_garden';
  private skin = 'skin_classic';
  private boardScale = 1;
  private ox = 0;
  private oy = 0;
  private trayImg!: Phaser.GameObjects.Image;
  private trayX0 = 0;
  private trayY = 0;
  private slotW = 0;
  private ui: Phaser.GameObjects.GameObject[] = [];
  private boosterBtns: Partial<Record<BoosterId, { btn: Button; badge: Phaser.GameObjects.Container }>> = {};
  private coins!: CoinCounter;
  private hand?: Phaser.GameObjects.Image;
  private handTimer?: Phaser.Time.TimerEvent;
  private dangerTween?: Phaser.Tweens.Tween;
  private tipBox?: Phaser.GameObjects.Container;

  constructor() {
    super('Game');
  }

  create(): void {
    this.setup();
    this.levelN = (this.sceneData.level as number) ?? store.data.level;
    this.level = generateLevel(this.levelN);
    this.board = new BoardState(this.level);
    this.views = [];
    this.trayVisual = [];
    this.pending = [];
    this.mode = 'loading';
    this.elapsed = 0;
    this.combo = 0;
    this.comboBonus = 0;
    this.continues = 0;
    this.lastMatchAt = -1e9;
    this.boosterBtns = {};
    this.hand = undefined;
    this.tipBox = undefined;
    this.set = store.data.equipped.icons;
    this.skin = store.data.equipped.skin;
    music.play(this.level.hard ? 'hard' : 'game');
    this.addBackground();

    ads.inGameplay = true;
    platform.gameplayStart();
    const wake = () => this.onWake();
    this.events.on('wake', wake);
    this.events.once('shutdown', () => {
      this.events.off('wake', wake);
      ads.inGameplay = false;
      platform.gameplayStop();
    });

    void Promise.all([ensureIcons(this.textures, this.set), ensureSkin(this.textures, this.skin)]).then(() => {
      if (!this.sys.isActive()) return;
      this.buildTiles();
      this.buildUi();
      this.layout(false);
      this.introAnimation();
      this.mode = 'play';
      this.startTutorial();
    });
  }

  update(_t: number, dt: number): void {
    if (this.mode === 'play' && Popup.openCount === 0) this.elapsed += dt;
  }

  protected onResize(): void {
    // keep the game state — only rebuild the background and re-layout
    this.children.list.filter((o) => (o as unknown as { depth: number }).depth <= -99).forEach((o) => o.destroy());
    this.addBackground();
    this.tipBox?.destroy();
    this.tipBox = undefined;
    this.hideHand();
    if (this.mode !== 'loading') {
      this.ui.forEach((o) => o.destroy());
      this.ui = [];
      this.boosterBtns = {};
      this.buildUi();
      this.layout(false);
    }
  }

  // ───────────────────────────── building ─────────────────────────────

  private buildTiles(): void {
    for (const tile of this.board.tiles) {
      const v = new TileView(this, tile, this.set, this.skin);
      v.on('pointerdown', () => this.onTileTap(tile.id));
      this.views.push(v);
    }
  }

  private buildUi(): void {
    const th = this.theme;
    const { colX, cx } = this;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => (this.ui.push(o), o);

    add(new Button(this, colX + 80, 96, { w: 116, h: 116, colors: th.primary, icon: 'ui_home', iconSize: 66, onClick: () => this.askExit() }));
    add(new Button(this, colX + 214, 96, { w: 116, h: 116, colors: th.primary, icon: 'ui_pause', iconSize: 56, onClick: () => this.openPause() }));
    const titleX = colX + 528;
    const title = add(label(this, titleX, this.level.hard ? 78 : 96, t('level', { n: this.levelN }), 64, { stroke: th.title.stroke }));
    if (title.width > 460) title.setScale(460 / title.width);
    if (this.level.hard) {
      const c = add(this.add.container(titleX, 146));
      const txt = label(this, 22, -2, t('hardLevel'), 34, { stroke: '#8a1020' });
      c.add(this.add.image(0, 0, pillTexture(this.textures, Math.round(txt.width + 90), 60, 'rgba(220,40,60,.9)')));
      c.add(this.add.image(-txt.width / 2 - 8, -4, 'ui_fire').setDisplaySize(50, 50));
      c.add(txt);
    }
    this.coins = add(new CoinCounter(this, colX + 1080 - 170, 96));
    this.coins.setScale(0.85);

    this.trayImg = add(this.add.image(0, 0, '__DEFAULT'));
    this.buildTrayTexture();

    const ids: BoosterId[] = BOOSTERS;
    const names: Record<BoosterId, TKey> = { undo: 'boosterUndo', magnet: 'boosterMagnet', shuffle: 'boosterShuffle', slot: 'boosterSlot' };
    ids.forEach((id, i) => {
      const btn = add(new Button(this, cx + (i - 1.5) * 240, this.H - 165, { w: 200, h: 180, colors: th.primary, icon: BOOSTER_ICON[id], iconSize: 112, onClick: () => this.onBooster(id) }));
      btn.icon!.setY(-22);
      const nm = label(this, 0, 52, t(names[id]), 30, { stroke: th.primary[2] });
      if (nm.width > 186) nm.setScale(186 / nm.width);
      btn.add(nm);
      const badge = this.add.container(82, -78);
      btn.add(badge);
      this.boosterBtns[id] = { btn, badge };
    });
    this.refreshBoosters();
    const onB = () => this.refreshBoosters();
    bus.on('boosters', onB);
    this.events.once('shutdown', () => bus.off('boosters', onB));
  }

  private buildTrayTexture(): void {
    const cap = this.board.cap;
    const w = 1040;
    this.slotW = Math.floor((w - 36) / cap);
    this.trayImg.setTexture(trayTexture(this.textures, w, 190, cap, this.slotW, this.theme.tray));
    this.trayX0 = this.cx - (cap * this.slotW) / 2;
    this.trayY = 300;
    this.trayImg.setPosition(this.cx, this.trayY + 6);
  }

  private refreshBoosters(): void {
    for (const id of BOOSTERS) {
      const b = this.boosterBtns[id];
      if (!b) continue;
      b.badge.removeAll(true);
      const n = econ.boosters(id);
      if (n > 0) {
        b.badge.add(this.add.circle(0, 0, 32, 0xe8304a).setStrokeStyle(5, 0xffffff));
        b.badge.add(label(this, 0, -2, String(n), 36, { stroke: '#8a1020' }));
      } else {
        b.badge.add(this.add.circle(0, 0, 32, 0x3db82f).setStrokeStyle(5, 0xffffff));
        b.badge.add(this.add.image(0, 0, 'ui_plus').setDisplaySize(36, 36));
      }
    }
  }

  // ───────────────────────────── layout ─────────────────────────────

  private layout(animate: boolean): void {
    const tiles = this.board.tiles;
    const maxX = Math.max(...tiles.map((t) => t.x));
    const maxY = Math.max(...tiles.map((t) => t.y));
    const wPx = maxX * HX + TILE_W;
    const hPx = maxY * HY + TILE_H;
    const top = 430;
    const bottom = this.H - 300;
    const availH = Math.max(300, bottom - top);
    this.boardScale = Math.min(1.35, 1040 / wPx, availH / hPx);
    this.ox = this.cx - (wPx * this.boardScale) / 2;
    this.oy = top + (availH - hPx * this.boardScale) / 2;
    this.buildTrayTexture();
    for (const v of this.views) {
      if (this.board.removed[v.tile.id]) continue;
      const p = this.tilePos(v.tile.id);
      v.setScale(this.boardScale);
      if (animate) this.tweens.add({ targets: v, x: p.x, y: p.y, duration: 200 });
      else v.setPosition(p.x, p.y);
      v.setDepth(p.depth);
    }
    this.refreshBoard(false);
    this.layoutTray(-1, false);
  }

  private tilePos(id: number): { x: number; y: number; depth: number } {
    const t = this.board.tiles[id];
    const s = this.boardScale;
    const x = this.ox + (t.x * HX + TILE_W / 2) * s;
    let y = this.oy + (t.y * HY + TILE_H / 2) * s;
    if (t.stack >= 0) {
      const order = this.board.stackOrder(t.stack);
      const k = Math.max(0, order.indexOf(id));
      y -= Math.min(k, 4) * STACK_PEEK * s;
    } else y -= t.z * LIFT * s;
    return { x, y, depth: t.z * 1000 + t.y * 10 + t.x * 0.1 };
  }

  private slotPos(i: number): { x: number; y: number } {
    return { x: this.trayX0 + this.slotW * (i + 0.5), y: this.trayY - 2 };
  }

  private get trayScale(): number {
    return (this.slotW - 16) / TILE_W;
  }

  private layoutTray(fresh: number, animate = true): void {
    this.trayVisual.forEach((id, i) => {
      const v = this.views[id];
      const p = this.slotPos(i);
      v.setDepth(100000 + i);
      if (!animate) {
        v.setPosition(p.x, p.y).setScale(this.trayScale);
        return;
      }
      if (id === fresh) {
        this.tweens.killTweensOf(v);
        this.tweens.add({ targets: v, x: p.x, y: p.y, scale: this.trayScale, duration: 230, ease: 'Cubic.easeOut' });
      } else this.tweens.add({ targets: v, x: p.x, y: p.y, scale: this.trayScale, duration: 160, ease: 'Sine.easeOut' });
    });
  }

  /** Covered/free tint, "?" reveals and stack offsets for every tile still on the board. */
  private refreshBoard(animate = true): void {
    for (const v of this.views) {
      const id = v.tile.id;
      if (this.board.removed[id]) continue;
      const free = this.board.isFree(id);
      v.setCovered(!free);
      if (v.tile.hidden && v.setMystery(!free, animate) && animate) sfx('reveal');
      if (v.tile.stack >= 0) {
        const p = this.tilePos(id);
        if (animate) this.tweens.add({ targets: v, y: p.y, duration: 160 });
        else v.setY(p.y);
      }
    }
  }

  private introAnimation(): void {
    const order = this.views.slice().sort((a, b) => a.tile.z - b.tile.z || a.tile.y - b.tile.y);
    order.forEach((v, i) => {
      const y = v.y;
      v.setAlpha(0).setY(y - 60);
      this.tweens.add({ targets: v, alpha: 1, y, duration: 260, delay: Math.min(900, i * 9), ease: 'Back.easeOut' });
    });
    if (this.level.hard) {
      const c = this.add.container(this.cx, this.H * 0.45).setDepth(400000);
      const txt = label(this, 0, 0, t('hardLevel') + '!', 96, { stroke: '#8a1020' });
      c.add(this.add.image(0, 0, pillTexture(this.textures, Math.round(Math.min(1000, txt.width + 160)), 170, 'rgba(220,40,60,.92)')));
      c.add(txt);
      c.setScale(0.3).setAlpha(0);
      this.tweens.chain({
        targets: c,
        tweens: [
          { scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' },
          { scale: 1, duration: 900 },
          { alpha: 0, y: c.y - 80, duration: 300, onComplete: () => c.destroy() },
        ],
      });
    }
  }

  // ───────────────────────────── play ─────────────────────────────

  private onTileTap(id: number): void {
    if (this.mode !== 'play' || Popup.openCount > 0 || ads.isBusy) return;
    const v = this.views[id];
    if (v.inTray) return;
    if (!this.board.canTake(id)) {
      if (!this.board.isFree(id)) sfx('blocked');
      else if (this.board.ice[id] > 0) sfx('ice');
      else sfx('blocked');
      v.shake();
      vibrate(25);
      return;
    }
    this.flushPending();
    const res = this.board.take(id);
    if (!res) return;
    sfx('tap');
    vibrate(8);
    this.hideHand();
    this.trayVisual.splice(res.index, 0, id);
    v.toTray();
    this.layoutTray(id);
    this.time.delayedCall(200, () => sfx('place'));
    this.refreshBoard();
    if (res.matched) {
      const p: PendingMatch = {
        ids: res.matched,
        ice: res.iceChanged,
        unlocked: res.unlocked,
        timer: this.time.delayedCall(240, () => this.resolveMatch(p)),
      };
      this.pending.push(p);
    } else if (this.board.lost) {
      this.mode = 'lost';
      this.tipBox?.destroy();
      this.tipBox = undefined;
      this.time.delayedCall(650, () => this.showLose());
    }
    this.updateDanger();
    if (this.levelN <= 2 && !this.board.lost) this.scheduleHand(1400);
  }

  private flushPending(): void {
    const list = this.pending;
    this.pending = [];
    for (const p of list) {
      p.timer.remove(false);
      this.resolveMatch(p, true);
    }
  }

  private resolveMatch(p: PendingMatch, quick = false): void {
    this.pending = this.pending.filter((q) => q !== p);
    this.trayVisual = this.trayVisual.filter((id) => !p.ids.includes(id));
    const vs = p.ids.map((id) => this.views[id]);
    const mid = vs[1] ?? vs[0];
    const cx = mid.x;
    const cy = mid.y;
    const now = this.time.now;
    this.combo = now - this.lastMatchAt < 4000 ? this.combo + 1 : 1;
    this.lastMatchAt = now;
    sfx('match', this.combo - 1);
    vibrate(20);
    vs.forEach((v) => {
      this.tweens.killTweensOf(v);
      if (quick) {
        v.destroy();
        return;
      }
      this.tweens.chain({
        targets: v,
        tweens: [
          { x: cx, y: cy - 10, scale: this.trayScale * 1.1, duration: 120, ease: 'Sine.easeIn' },
          { scale: 0, alpha: 0, duration: 140, ease: 'Back.easeIn', onComplete: () => v.destroy() },
        ],
      });
    });
    this.time.delayedCall(quick ? 0 : 200, () => this.burst(cx, cy, this.board.tiles[p.ids[0]].type));
    if (this.combo >= 2) this.showCombo();
    this.layoutTray(-1);
    for (const id of p.ice) this.views[id].setIce(this.board.ice[id]);
    if (p.ice.some((id) => this.board.ice[id] === 0)) sfx('ice');
    for (const id of p.unlocked) this.views[id].unlock();
    if (p.unlocked.length) sfx('lockOpen');
    this.updateDanger();
    if (this.board.won && this.mode === 'play') this.win();
  }

  private burst(x: number, y: number, type: number): void {
    const palette = [0xffe066, 0xff7ab8, 0x7ad8ff, 0x9ff06a, 0xffffff, 0xffa64a];
    const em = this.add.particles(x, y, 'px_dot', {
      speed: { min: 180, max: 520 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 350, max: 650 },
      scale: { start: 1.1, end: 0 },
      tint: palette,
      gravityY: 500,
      emitting: false,
    });
    em.setDepth(200000);
    em.explode(18);
    const st = this.add.particles(x, y, 'px_star', { speed: { min: 80, max: 260 }, lifespan: 600, scale: { start: 0.9, end: 0 }, rotate: { min: 0, max: 360 }, tint: 0xfff2a0, emitting: false });
    st.setDepth(200001);
    st.explode(6);
    const ring = this.add.circle(x, y, 40, 0xffffff, 0).setStrokeStyle(10, 0xffffff, 0.9).setDepth(199999);
    this.tweens.add({ targets: ring, scale: 2.6, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
    this.time.delayedCall(900, () => (em.destroy(), st.destroy()));
    void type;
  }

  private showCombo(): void {
    this.comboBonus += Math.min(10, this.combo);
    if (this.combo >= 3) sfx('combo', this.combo);
    const praise = t(`praise${Math.min(5, Math.max(1, this.combo - 1))}` as TKey);
    const c = this.add.container(this.cx, this.trayY + 170).setDepth(150000);
    c.add(label(this, 0, 0, praise, 84, { stroke: this.theme.title.stroke }));
    c.add(label(this, 0, 74, t('combo', { n: this.combo }), 44, { color: '#fff27a', stroke: '#8a4a08' }));
    c.setScale(0.4).setAlpha(0);
    this.tweens.chain({
      targets: c,
      tweens: [
        { scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' },
        { y: c.y - 70, alpha: 0, duration: 520, delay: 380, onComplete: () => c.destroy() },
      ],
    });
  }

  private updateDanger(): void {
    const danger = this.board.tray.length >= this.board.cap - 2 && this.mode === 'play';
    if (danger && !this.dangerTween) {
      this.dangerTween = this.tweens.addCounter({
        from: 0,
        to: 1,
        yoyo: true,
        repeat: -1,
        duration: 420,
        onUpdate: (tw) => {
          const k = tw.getValue() ?? 0;
          const g = Math.round(255 - 110 * k);
          this.trayImg.setTint(Phaser.Display.Color.GetColor(255, g, g));
        },
      });
    } else if (!danger && this.dangerTween) {
      this.dangerTween.stop();
      this.dangerTween = undefined;
      this.trayImg.clearTint();
    }
  }

  // ───────────────────────────── boosters ─────────────────────────────

  private onBooster(id: BoosterId): void {
    if (this.mode !== 'play' || Popup.openCount > 0) return;
    if (id === 'undo' && this.board.history.length === 0) return toast(this, t('boosterNothingUndo'));
    if (id === 'slot' && this.board.cap >= MAX_TRAY_CAP) return toast(this, t('boosterUsedSlot'));
    if (econ.boosters(id) <= 0) return this.offerBooster(id);
    econ.useBooster(id);
    this.applyBooster(id);
  }

  private applyBooster(id: BoosterId): void {
    this.flushPending();
    this.hideHand();
    switch (id) {
      case 'undo': {
        const tid = this.board.undo();
        if (tid === null) return;
        sfx('undo');
        this.returnToBoard([tid]);
        break;
      }
      case 'magnet': {
        const res = this.board.magnet();
        if (!res) return;
        sfx('magnet');
        const target = { x: this.cx, y: this.trayY + 190 };
        const all = [...res.fromTray, ...res.fromBoard];
        this.trayVisual = this.trayVisual.filter((x) => !res.fromTray.includes(x));
        all.forEach((tid, i) => {
          const v = this.views[tid];
          v.toTray();
          v.setDepth(150000 + i);
          this.tweens.killTweensOf(v);
          this.tweens.chain({
            targets: v,
            tweens: [
              { x: target.x + (i - 1) * 130, y: target.y, scale: this.trayScale * 1.1, duration: 380, ease: 'Cubic.easeInOut' },
              { x: target.x, scale: 0, alpha: 0, duration: 200, delay: 80, ease: 'Back.easeIn', onComplete: () => v.destroy() },
            ],
          });
        });
        this.time.delayedCall(640, () => {
          this.burst(target.x, target.y, res.type);
          sfx('match', 2);
        });
        this.layoutTray(-1);
        this.refreshBoard();
        for (const tid of res.iceChanged) this.views[tid].setIce(this.board.ice[tid]);
        for (const tid of res.unlocked) this.views[tid].unlock();
        this.updateDanger();
        if (this.board.won) this.time.delayedCall(700, () => this.win());
        break;
      }
      case 'shuffle': {
        sfx('shuffle');
        const changed = this.board.shuffle(this.rng);
        changed.forEach((tid, i) => {
          const v = this.views[tid];
          const sx = v.scaleX;
          this.tweens.chain({
            targets: v,
            tweens: [
              { scaleX: 0, duration: 120, delay: i * 6 },
              { scaleX: sx, duration: 160, ease: 'Back.easeOut', onStart: () => v.setType(this.board.tiles[tid].type) },
            ],
          });
        });
        break;
      }
      case 'slot': {
        sfx('slot');
        this.board.cap = MAX_TRAY_CAP;
        this.buildTrayTexture();
        this.layoutTray(-1);
        this.tweens.add({ targets: this.trayImg, scaleX: 1.04, yoyo: true, duration: 140 });
        this.updateDanger();
        break;
      }
    }
  }

  private returnToBoard(ids: number[]): void {
    this.trayVisual = this.trayVisual.filter((x) => !ids.includes(x));
    for (const tid of ids) {
      const v = this.views[tid];
      v.toBoard();
      const p = this.tilePos(tid);
      this.tweens.killTweensOf(v);
      v.setDepth(p.depth + 500000);
      this.tweens.add({ targets: v, x: p.x, y: p.y, scale: this.boardScale, duration: 260, ease: 'Cubic.easeOut', onComplete: () => v.setDepth(p.depth) });
    }
    this.layoutTray(-1);
    this.refreshBoard();
    this.updateDanger();
  }

  private offerBooster(id: BoosterId): void {
    const th = this.theme;
    const names: Record<BoosterId, [TKey, TKey]> = {
      undo: ['boosterUndo', 'boosterUndoDesc'],
      magnet: ['boosterMagnet', 'boosterMagnetDesc'],
      shuffle: ['boosterShuffle', 'boosterShuffleDesc'],
      slot: ['boosterSlot', 'boosterSlotDesc'],
    };
    const p = new Popup(this, { w: 860, h: 760, title: t(names[id][0]), theme: th, closable: true, backdropCloses: true });
    p.content.add(this.add.image(0, -170, BOOSTER_ICON[id]).setDisplaySize(220, 220));
    p.content.add(plain(this, 0, 10, t(names[id][1]), 46, th.panel.text, { wrap: 720 }));
    const price = BOOSTER_PRICE[id];
    const buy = new Button(this, -200, 210, { w: 360, h: 150, colors: BTN.green, icon: 'ui_coin', text: String(price), fontSize: 58, onClick: () => {
      if (!econ.spend(price)) {
        toast(this, t('notEnough'));
        sfx('error');
        return;
      }
      sfx('buy');
      p.close(() => this.applyBooster(id));
    } });
    buy.setEnabled(econ.coins >= price);
    const ad = new Button(this, 200, 210, { w: 360, h: 150, colors: BTN.gold, icon: 'ui_ad', text: t('free'), fontSize: 50, onClick: async () => {
      const ok = await ads.rewarded('booster_' + id);
      if (!ok) return toast(this, t('adFailed'));
      p.close(() => this.applyBooster(id));
    } });
    ad.pulse();
    p.content.add([buy, ad]);
  }

  // ───────────────────────────── win / lose ─────────────────────────────

  private stars(): number {
    const par = 15 + this.level.tiles.length * 1.6;
    const s = this.elapsed / 1000;
    return s <= par ? 3 : s <= par * 1.7 ? 2 : 1;
  }

  private win(): void {
    if (this.mode !== 'play') return;
    this.mode = 'won';
    this.hideHand();
    this.tipBox?.destroy();
    this.tipBox = undefined;
    const stars = this.stars();
    const d = store.data;
    if (this.levelN >= d.level) d.level = this.levelN + 1;
    d.stars[this.levelN - 1] = Math.max(d.stars[this.levelN - 1] ?? 0, stars);
    d.stats.wins++;
    store.save();
    music.jingle('win');
    this.confetti();
    this.time.delayedCall(900, () => this.showWin(stars));
  }

  private confetti(): void {
    const colors = [0xff5a7a, 0xffd23a, 0x5ad1ff, 0x7be36b, 0xb98cff, 0xff9a3a];
    for (const side of [-1, 1]) {
      const em = this.add.particles(this.cx + side * 520, this.H * 0.75, 'px_conf', {
        speed: { min: 700, max: 1300 },
        angle: side < 0 ? { min: -80, max: -50 } : { min: -130, max: -100 },
        lifespan: 2200,
        gravityY: 900,
        rotate: { start: 0, end: 720 },
        scale: { min: 1.2, max: 2.2 },
        tint: colors,
        emitting: false,
      });
      em.setDepth(900000);
      em.explode(70);
      this.time.delayedCall(2600, () => em.destroy());
    }
  }

  private showWin(stars: number): void {
    const th = this.theme;
    const reward = levelReward(this.levelN, stars, this.level.hard) + this.comboBonus;
    const chest = this.levelN % 10 === 0 ? chestReward(this.levelN) : null;
    const p = new Popup(this, { w: 900, h: chest ? 1060 : 920, title: t('win'), theme: th });
    const top = -(chest ? 1060 : 920) / 2;
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 190;
      const y = top + 190 - (i === 1 ? 30 : 0);
      const size = i === 1 ? 210 : 170;
      p.content.add(this.add.image(x, y, 'ui_starEmpty').setDisplaySize(size, size));
      if (i < stars) {
        const s = this.add.image(x, y, 'ui_star').setDisplaySize(size, size).setScale(0).setAngle(-30);
        p.content.add(s);
        this.tweens.add({ targets: s, scale: size / 112, angle: 0, duration: 380, delay: 300 + i * 260, ease: 'Back.easeOut', onStart: () => sfx('star', i) });
      }
    }
    let y = top + 380;
    p.content.add(plain(this, 0, y, t('level', { n: this.levelN }), 46, th.panel.sub, { weight: '900' }));
    y += 100;
    const rc = this.add.container(0, y);
    rc.add(this.add.image(-90, 0, 'ui_coin').setDisplaySize(120, 120));
    const amount = label(this, 40, -4, `+${reward}`, 84, { stroke: '#7a4a08', originX: 0 });
    rc.add(amount);
    p.content.add(rc);
    if (chest) {
      y += 150;
      const cc = this.add.container(0, y);
      cc.add(this.add.image(-250, 0, 'ui_chest').setDisplaySize(130, 130));
      cc.add(plain(this, -160, -30, t('chest', { n: 10 }), 38, th.panel.text, { originX: 0, weight: '900' }));
      cc.add(this.add.image(-130, 30, 'ui_coin').setDisplaySize(60, 60));
      cc.add(plain(this, -94, 30, `+${chest.coins}`, 40, th.panel.text, { originX: 0, weight: '900' }));
      cc.add(this.add.image(60, 30, BOOSTER_ICON[chest.booster]).setDisplaySize(64, 64));
      cc.add(plain(this, 98, 30, '+1', 40, th.panel.text, { originX: 0, weight: '900' }));
      p.content.add(cc);
      this.tweens.add({ targets: cc, scale: 1.05, yoyo: true, repeat: -1, duration: 500 });
    }
    const mult = AD_CONFIG.rewardedWinMultiplier;
    const by = -top - 250;
    let claimed = false;
    const finish = (m: number) => {
      if (claimed) return;
      claimed = true;
      if (chest) {
        econ.addBooster(chest.booster, 1);
        econ.addCoins(chest.coins);
      }
      const from = { x: this.cx, y: this.H / 2 + y - 100 };
      p.close(() => {
        this.coins.setDepth(1_060_000);
        flyCoins(this, from, this.coins.iconPos(), reward * m, () => {
          const ad = this.levelN >= AD_CONFIG.onWinFromLevel ? 'level_win' : undefined;
          this.time.delayedCall(250, () => this.go('Game', { level: this.levelN + 1 }, { ad }));
        });
      });
    };
    const x3 = new Button(this, 0, by, { w: 620, h: 150, colors: BTN.gold, icon: 'ui_ad', text: `${t('claim')} ×${mult}`, fontSize: 58, onClick: async () => {
      if (claimed) return;
      const ok = await ads.rewarded('win_x' + mult);
      if (ok) {
        amount.setText(`+${reward * mult}`);
        this.tweens.add({ targets: amount, scale: 1.4, yoyo: true, duration: 180 });
        sfx('coin');
        this.time.delayedCall(450, () => finish(mult));
      } else toast(this, t('adFailed'));
    } });
    x3.pulse();
    const ok = new Button(this, 130, by + 175, { w: 360, h: 130, colors: BTN.green, text: t('next'), fontSize: 54, onClick: () => finish(1) });
    const map = new Button(this, -210, by + 175, { w: 240, h: 130, colors: th.primary, icon: 'ui_map', iconSize: 84, onClick: () => {
      if (claimed) return;
      claimed = true;
      if (chest) {
        econ.addBooster(chest.booster, 1);
        econ.addCoins(chest.coins);
      }
      econ.addCoins(reward);
      p.close(() => this.go('Map', {}, { ad: this.levelN >= AD_CONFIG.onWinFromLevel ? 'level_win' : undefined }));
    } });
    p.content.add([x3, ok, map]);
  }

  private showLose(): void {
    const th = this.theme;
    sfx('lose');
    vibrate(80);
    const p = new Popup(this, { w: 900, h: 940, title: t('loseTitle'), theme: th });
    p.content.add(this.add.image(0, -230, 'ui_slot').setDisplaySize(230, 230));
    p.content.add(plain(this, 0, -60, t('loseText'), 46, th.panel.text, { wrap: 780, lineSpacing: 6 }));
    const price = AD_CONFIG.continueCoinPrice * (1 + this.continues);
    const cont = () => {
      this.continues++;
      p.close(() => this.doContinue());
    };
    const adB = new Button(this, 0, 120, { w: 640, h: 150, colors: BTN.gold, icon: 'ui_ad', text: t('continueAd'), fontSize: 58, onClick: async () => {
      if (await ads.rewarded('continue')) cont();
      else toast(this, t('adFailed'));
    } });
    adB.pulse();
    const coinB = new Button(this, 0, 290, { w: 640, h: 140, colors: BTN.green, icon: 'ui_coin', text: `${t('continueAd')} · ${price}`, fontSize: 50, onClick: () => {
      if (!econ.spend(price)) {
        sfx('error');
        return toast(this, t('notEnough'));
      }
      sfx('buy');
      cont();
    } });
    coinB.setEnabled(econ.coins >= price);
    const give = new Button(this, 0, 450, { w: 420, h: 120, colors: BTN.red, text: t('giveUp'), fontSize: 46, onClick: () => {
      store.data.stats.losses++;
      store.save();
      p.close(() => this.showRetry());
    } });
    p.content.add([adB, coinB, give]);
  }

  private showRetry(): void {
    const th = this.theme;
    const p = new Popup(this, { w: 800, h: 560, title: t('level', { n: this.levelN }), theme: th });
    p.content.add(this.add.image(0, -100, 'ui_trophy').setDisplaySize(170, 170).setTint(0xb0b8c8));
    p.content.add(new Button(this, -170, 130, { w: 300, h: 140, colors: th.primary, icon: 'ui_map', iconSize: 90, onClick: () => p.close(() => this.go('Map', {}, { ad: AD_CONFIG.onExitLevel ? 'level_exit' : undefined })) }));
    p.content.add(new Button(this, 170, 130, { w: 300, h: 140, colors: BTN.green, text: t('retry'), fontSize: 54, onClick: () => p.close(() => this.go('Game', { level: this.levelN }, { ad: AD_CONFIG.onRetry ? 'retry' : undefined })) }).pulse());
  }

  private doContinue(): void {
    this.flushPending();
    const back = this.board.giveBack(3);
    if (this.board.cap < MAX_TRAY_CAP) {
      this.board.cap = MAX_TRAY_CAP;
      this.buildTrayTexture();
      sfx('slot');
    }
    sfx('undo');
    this.returnToBoard(back);
    this.mode = 'play';
    this.updateDanger();
  }

  // ───────────────────────────── menus ─────────────────────────────

  private askExit(): void {
    if (this.mode === 'won' || Popup.openCount > 0) return;
    const th = this.theme;
    const p = new Popup(this, { w: 820, h: 560, title: t('exit'), theme: th, closable: true, backdropCloses: true });
    p.content.add(plain(this, 0, -60, t('exitConfirm'), 46, th.panel.text, { wrap: 700, lineSpacing: 6 }));
    p.content.add(new Button(this, -180, 140, { w: 320, h: 140, colors: BTN.red, text: t('exit'), fontSize: 54, onClick: () => p.close(() => this.go('Map', {}, { ad: AD_CONFIG.onExitLevel ? 'level_exit' : undefined })) }));
    p.content.add(new Button(this, 180, 140, { w: 320, h: 140, colors: BTN.green, text: t('resume'), fontSize: 50, onClick: () => p.close() }));
  }

  private openPause(): void {
    if (this.mode !== 'play' || Popup.openCount > 0) return;
    const th = this.theme;
    const p = new Popup(this, { w: 980, h: 960, title: t('pause'), theme: th, closable: true });
    const s = store.data.settings;
    const toggle = (x: number, icon: string, key: TKey, on: boolean, apply: (v: boolean) => void) => {
      const b = new Button(this, x, -330, { w: 400, h: 120, colors: on ? th.primary : BTN.gray, icon, iconSize: 72, text: t(key), fontSize: 40, onClick: () => {
        on = !on;
        b.setColors(on ? th.primary : BTN.gray);
        apply(on);
      } });
      p.content.add(b);
    };
    toggle(-210, 'ui_music', 'music', s.music > 0, (v) => {
      s.music = v ? 0.6 : 0;
      engine.setVolumes(s.music, s.sfx);
      store.save();
    });
    toggle(210, 'ui_sound', 'sounds', s.sfx > 0, (v) => {
      s.sfx = v ? 0.8 : 0;
      engine.setVolumes(s.music, s.sfx);
      store.save();
    });
    const exitAd = AD_CONFIG.onExitLevel ? 'level_exit' : undefined;
    p.content.add(new Button(this, 0, -170, { w: 820, h: 140, colors: BTN.green, icon: 'ui_play', text: t('resume'), fontSize: 56, onClick: () => p.close() }));
    p.content.add(new Button(this, 0, -15, { w: 820, h: 120, colors: BTN.gold, text: t('retry'), fontSize: 48, onClick: () => p.close(() => this.go('Game', { level: this.levelN }, { ad: AD_CONFIG.onRetry ? 'retry' : undefined })) }));
    const nav: Array<[number, number, string, TKey, () => void]> = [
      [-210, 140, 'ui_home', 'mainMenu', () => p.close(() => this.go('Menu', {}, { ad: exitAd }))],
      [210, 140, 'ui_map', 'levelMap', () => p.close(() => this.go('Map', {}, { ad: exitAd }))],
      [-210, 290, 'ui_shop', 'shop', () => p.close(() => this.openOverLevel('Shop'))],
      [210, 290, 'ui_gear', 'settings', () => p.close(() => this.openOverLevel('Settings'))],
    ];
    for (const [x, y, icon, key, fn] of nav) {
      p.content.add(new Button(this, x, y, { w: 405, h: 130, colors: th.primary, icon, iconSize: 76, text: t(key), fontSize: 42, onClick: fn }));
    }
  }

  /** Shop / Settings from the pause menu: the level sleeps and is resumed by their Back button. */
  private openOverLevel(key: 'Shop' | 'Settings'): void {
    this.hideHand();
    this.tipBox?.destroy();
    this.tipBox = undefined;
    ads.inGameplay = false;
    platform.gameplayStop();
    this.scene.launch(key, { from: 'Game' });
    this.scene.sleep();
  }

  /** Back from Shop / Settings: pick up theme, language and background changes, show the pause menu again. */
  private onWake(): void {
    ads.inGameplay = true;
    platform.gameplayStart();
    music.play(this.level.hard ? 'hard' : 'game');
    this.onResize();
    this.cameras.main.fadeIn(180, 10, 20, 48);
    this.time.delayedCall(250, () => this.openPause());
  }

  // ───────────────────────────── tutorial ─────────────────────────────

  private startTutorial(): void {
    const tut = store.data.tutorial;
    const tiles = this.level.tiles;
    const tips: Array<[string, boolean, TKey]> = [
      ['t1', this.levelN === 1, 'tut1'],
      ['t2', this.levelN === 2, 'tut2'],
      ['t3', this.levelN === 3, 'tut3'],
      ['boost', this.levelN === 5, 'tutBoosters'],
      ['hidden', tiles.some((x) => x.hidden), 'tutHidden'],
      ['stacks', tiles.some((x) => x.stack >= 0), 'tutStacks'],
      ['ice', tiles.some((x) => x.ice > 0), 'tutIce'],
      ['lock', tiles.some((x) => x.lock >= 0), 'tutLock'],
    ];
    const tip = tips.find(([k, cond]) => cond && !tut[k]);
    if (tip) {
      tut[tip[0]] = true;
      store.save();
      this.time.delayedCall(700, () => this.showTip(t(tip[2])));
    }
    if (this.levelN <= 2) this.scheduleHand(1100);
  }

  private showTip(text: string): void {
    const th = this.theme;
    const c = this.add.container(this.cx, this.H - 400).setDepth(160000);
    const txt = plain(this, 0, 0, text, 44, th.panel.text, { wrap: 860, weight: '900' });
    const h = Math.round(txt.height + 70);
    c.add(this.add.image(0, 0, pillTexture(this.textures, 960, h, 'rgba(255,255,255,.95)')));
    c.add(txt);
    c.setAlpha(0).setScale(0.8);
    this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 250, ease: 'Back.easeOut' });
    this.tipBox = c;
    this.time.delayedCall(5200, () => {
      if (this.tipBox !== c) return;
      this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() });
      this.tipBox = undefined;
    });
  }

  private scheduleHand(delay: number): void {
    this.handTimer?.remove(false);
    this.handTimer = this.time.delayedCall(delay, () => this.showHand());
  }

  private showHand(): void {
    if (this.mode !== 'play') return;
    const next = this.level.solution.find((id) => this.board.canTake(id));
    if (next === undefined) return;
    const v = this.views[next];
    if (!this.hand) this.hand = this.add.image(0, 0, 'ui_hand').setDisplaySize(140, 140).setDepth(300000).setOrigin(0.3, 0.05);
    this.tweens.killTweensOf(this.hand);
    this.hand.setPosition(v.x, v.y + 10).setAlpha(1).setVisible(true);
    this.tweens.add({ targets: this.hand, y: v.y + 40, scale: this.hand.scale * 0.9, yoyo: true, repeat: -1, duration: 450, ease: 'Sine.easeInOut' });
  }

  private hideHand(): void {
    this.handTimer?.remove(false);
    if (this.hand) {
      this.tweens.killTweensOf(this.hand);
      this.hand.setVisible(false).setDisplaySize(140, 140);
    }
    if (this.tipBox && this.levelN > 3) {
      const c = this.tipBox;
      this.tipBox = undefined;
      this.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: () => c.destroy() });
    }
  }
}

