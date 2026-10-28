import Phaser from 'phaser';
import { audio, vibrate } from '../audio/audio';
import { BALL_R, ballKey } from '../art/balls';
import { ANIMAL_TEX } from '../art/characters';
import { Rng } from '../core/rng';
import { addBooster, addCoins, boosterCount, equipped, ownedMosaicPacks, useBooster } from '../core/economy';
import { t } from '../core/i18n';
import { pauseHub } from '../core/pause';
import { save } from '../core/save';
import { BALL_COLORS } from '../data/colors';
import type { InLevelBooster, PreBooster } from '../data/boosters';
import { Board, type Cell, type Removed, type Resolution, type ShotKind } from '../gameplay/board';
import {
  cellU,
  COL_H,
  COL_W,
  lift,
  LANE_W,
  project,
  R,
  ROW_H,
  U_LAUNCH,
  unproject,
  V_FRONT,
  V_GONE,
  V_LAUNCH,
} from '../gameplay/geom';
import { generateLevel, type Hole, type LevelDef } from '../gameplay/levelgen';
import { applyProgress, exposedCells, goalDone, nextBallColor, type GoalProgress } from '../gameplay/sim';
import { ads } from '../platform/AdManager';
import { platform } from '../platform/platform';
import { CoinPill, RoundButton, toast, txt } from '../ui/widgets';
import { BaseScene } from './BaseScene';
import { showDefeat, showIntro, showOutOfShots, showPause, showVictory } from './gamePopups';

type State = 'intro' | 'aim' | 'flying' | 'won' | 'lost' | 'popup';
type ShotFx = ShotKind | 'fire' | 'lightning';

interface Roller {
  u: number;
  v: number;
  z: number;
  du: number;
  dv: number;
  vz: number;
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  done: boolean;
}

interface Shot {
  u: number;
  v: number;
  du: number;
  dv: number;
  color: number;
  kind: ShotFx;
  budget: number;
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  trailT: number;
}

const SPEED = 2300;
/** Rollers accelerate toward the player (the lane is tilted). */
const ROLL_G = 1500;
const COIN_PER_BALL = 0.2;
const SHOT_START_V = V_LAUNCH + 62;

export class GameScene extends BaseScene {
  level = 1;
  def!: LevelDef;
  board!: Board;
  vTop = 0;
  private sprites = new Map<number, { img: Phaser.GameObjects.Image; ov?: Phaser.GameObjects.Image }>();
  state: State = 'intro';
  shotsLeft = 0;
  shotsTotal = 0;
  continues = 0;
  progress: GoalProgress = { rescued: 0, collected: 0 };
  initialCount = 0;
  levelCoins = 0;
  private coinFrac = 0;
  private rng = new Rng(Date.now());
  private cur = { color: 0 };
  private next = { color: 0 };
  armed: InLevelBooster | null = null;
  private pendingStartBomb = false;
  longAim = false;
  private shot: Shot | null = null;
  private rollers: Roller[] = [];
  private holes: (Hole & { img: Phaser.GameObjects.Image })[] = [];
  private aimDir: { du: number; dv: number } | null = null;
  private aiming = false;
  private aimDots: Phaser.GameObjects.Image[] = [];
  private ghost!: Phaser.GameObjects.Image;
  private view = { left: 0, top: 0, right: COL_W, bottom: COL_H };
  // Visuals.
  private curImg!: Phaser.GameObjects.Image;
  private nextImg!: Phaser.GameObjects.Image;
  private shotsText!: Phaser.GameObjects.Text;
  private swapRing!: Phaser.GameObjects.Image;
  private goalText!: Phaser.GameObjects.Text;
  private goalIcon!: Phaser.GameObjects.Image;
  private starIcons: Phaser.GameObjects.Image[] = [];
  private boosterBtns = new Map<InLevelBooster, RoundButton>();
  private emitters = new Map<string, Phaser.GameObjects.Particles.ParticleEmitter>();
  private hint: Phaser.GameObjects.Container | null = null;
  private unsubPause: (() => void) | null = null;
  usedRewardedForWin = false;
  private boardDirty = true;
  private hudTop!: Phaser.GameObjects.Container;
  private hudPanel!: Phaser.GameObjects.Graphics;
  private hudZone!: Phaser.GameObjects.Zone;
  private backdrop?: Phaser.GameObjects.Image;
  private laneRt?: Phaser.GameObjects.RenderTexture;
  private fog?: Phaser.GameObjects.Graphics;
  private syncedVTop = NaN;

  constructor() {
    super('Game');
  }

  create(): void {
    this.baseCreate();
    this.level = this.sceneData.level ?? save.data.maxLevel;
    this.state = 'intro';
    this.sprites.clear();
    this.rollers = [];
    this.holes = [];
    this.shot = null;
    this.armed = null;
    this.longAim = false;
    this.continues = 0;
    this.levelCoins = 0;
    this.coinFrac = 0;
    this.aimDots = [];
    this.starIcons = [];
    this.boosterBtns.clear();
    this.emitters.clear();
    this.progress = { rescued: 0, collected: 0 };
    this.usedRewardedForWin = false;
    this.backdrop = undefined;
    this.laneRt = undefined;
    this.fog = undefined;
    this.boardDirty = true;
    this.pendingStartBomb = false;

    this.def = generateLevel(this.level, ownedMosaicPacks());
    this.board = Board.fromDefs(this.def.cells);
    this.initialCount = this.board.count();
    this.shotsTotal = this.shotsLeft = this.def.shots;
    this.vTop = this.targetVTop();

    this.layoutCamera();
    this.buildWorld();
    this.buildHud();
    this.cur.color = nextBallColor(this.board, this.rng);
    this.next.color = nextBallColor(this.board, this.rng);
    this.refreshQueue();
    this.syncBoard(true);
    this.updateHud();
    this.setupInput();

    audio.playMusic(this.level % 2 ? 'game' : 'game2');
    save.data.stats.played++;
    save.save();
    this.unsubPause = pauseHub.subscribe((p) => {
      if (p && this.state === 'aim') this.aiming = false;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubPause?.();
      ads.inGameplay = false;
      platform.gameplayStop();
    });
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.onOverlayClosed());
    showIntro(this);
  }

  // ── Layout ────────────────────────────────────────────────────────

  private layoutCamera(): void {
    const left = -(this.W - COL_W) / 2;
    const top = -(this.H - COL_H) / 2;
    this.cameras.main.setScroll(left, top);
    this.view = { left, top, right: left + this.W, bottom: top + this.H };
  }

  protected onResize(): void {
    // Keep the level running: re-centre the camera and re-anchor everything to the new view.
    this.layoutCamera();
    this.drawEnvironment();
    this.hudTop.y = this.view.top;
    this.drawHudPanel();
    this.boardDirty = true;
  }

  /** View-sized layers: backdrop, lane and far haze (rebuilt on resize). */
  private drawEnvironment(): void {
    const v = this.view;
    this.backdrop?.destroy();
    this.backdrop = this.addBackdrop(v.left, v.top, this.W, this.H);
    this.drawLane();
    this.fog?.destroy();
    const fog = this.add.graphics().setDepth(2500);
    const sky = Phaser.Display.Color.HexStringToColor(this.theme.sky[1]).color;
    fog.fillGradientStyle(sky, sky, sky, sky, 0.55, 0.55, 0, 0);
    fog.fillRect(v.left, v.top + 120, this.W, 260);
    this.fog = fog;
  }

  private buildWorld(): void {
    this.drawEnvironment();
    // Holes on the floor.
    for (const h of this.def.holes) {
      const p = project(h.u, h.v);
      const img = this.add.image(p.x, p.y, 'hole').setDepth(-40);
      img.setDisplaySize(R * 2.5 * p.s, R * 2.5 * p.s * 0.55);
      this.holes.push({ ...h, img });
      const lbl = txt(this, p.x, p.y - R * 1.4 * p.s, `×${h.mult}`, 22, h.mult >= 5 ? '#ffe14a' : h.mult >= 3 ? '#7dff6a' : '#ffffff').setDepth(-39);
      lbl.setScale(p.s);
      this.tweens.add({ targets: lbl, y: lbl.y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    // Launcher.
    const lp = project(U_LAUNCH, V_LAUNCH);
    this.add.image(lp.x, lp.y + 20, 'shadow').setDisplaySize(170, 50).setDepth(3090).setAlpha(0.7);
    const launcher = this.add.image(lp.x, lp.y, `launcher_${equipped('launcher')}`).setDepth(3100);
    launcher.setDisplaySize(150, 150 * 0.9);
    this.swapRing = this.add.image(lp.x, lp.y, 'swap_ring').setDepth(3101).setDisplaySize(124, 112).setAlpha(0.9);
    this.shotsText = txt(this, lp.x, lp.y + 4, '0', 40, '#ffffff').setDepth(3102);
    const sp = project(U_LAUNCH, SHOT_START_V);
    this.curImg = this.add.image(sp.x, sp.y - lift(sp.s), ballKey(equipped('balls'), 0)).setDepth(3200);
    this.curImg.setScale((R * sp.s * 1.05) / BALL_R).setData('base', this.curImg.scale);
    this.nextImg = this.add.image(lp.x + 66, lp.y + 34, ballKey(equipped('balls'), 0)).setDepth(3200);
    this.nextImg.setScale((R * 0.7) / BALL_R).setData('base', this.nextImg.scale);
    const zone = this.add.zone(lp.x + 10, lp.y - 10, 190, 170).setInteractive({ useHandCursor: true }).setDepth(3300);
    zone.on('pointerup', () => this.swap());
    // Aim dots + landing ghost.
    for (let i = 0; i < 70; i++) this.aimDots.push(this.add.image(0, 0, 'aimdot').setDepth(3050).setVisible(false));
    this.ghost = this.add.image(0, 0, 'sp_rainbow').setDepth(2400).setAlpha(0.45).setVisible(false);
    // Particle emitters per colour.
    BALL_COLORS.forEach((c, i) => {
      const e = this.add.particles(0, 0, 'spark', {
        speed: { min: 80, max: 320 },
        scale: { start: 0.55, end: 0 },
        lifespan: 520,
        tint: c.hex,
        blendMode: 'ADD',
        emitting: false,
      });
      e.setDepth(3400);
      this.emitters.set(`c${i}`, e);
    });
    this.emitters.set(
      'star',
      this.add.particles(0, 0, 'star4', { speed: { min: 60, max: 260 }, scale: { start: 0.9, end: 0 }, lifespan: 700, tint: [0xfff07a, 0xffffff], emitting: false }).setDepth(3400),
    );
    this.emitters.set(
      'leaf',
      this.add.particles(0, 0, 'leafp', { speed: { min: 60, max: 200 }, rotate: { min: 0, max: 360 }, scale: { start: 1, end: 0.4 }, lifespan: 700, gravityY: 400, emitting: false }).setDepth(3400),
    );
    this.emitters.set(
      'ice',
      this.add.particles(0, 0, 'shard', { speed: { min: 80, max: 240 }, rotate: { min: 0, max: 360 }, scale: { start: 1, end: 0.3 }, lifespan: 600, gravityY: 500, tint: [0xd6f6ff, 0x9fe0ff], emitting: false }).setDepth(3400),
    );
    this.emitters.set(
      'stone',
      this.add.particles(0, 0, 'shard', { speed: { min: 80, max: 260 }, rotate: { min: 0, max: 360 }, scale: { start: 1.3, end: 0.4 }, lifespan: 700, gravityY: 700, tint: [0x9a9ea8, 0x6b7080], emitting: false }).setDepth(3400),
    );
    this.emitters.set(
      'fire',
      this.add.particles(0, 0, 'spark', { speed: { min: 20, max: 120 }, scale: { start: 0.8, end: 0 }, lifespan: 400, tint: [0xffd23a, 0xff5a12, 0xff2d00], blendMode: 'ADD', emitting: false }).setDepth(3400),
    );
  }

  private drawLane(): void {
    const th = this.theme;
    const g = this.add.graphics();
    const col = (s: string) => Phaser.Display.Color.HexStringToColor(s).color;
    const vNear = V_GONE - 300;
    const vFar = 9000;
    const quad = (u0: number, v0: number, u1: number, v1: number, color: number, alpha = 1) => {
      const a = project(u0, v0);
      const b = project(u1, v0);
      const c = project(u1, v1);
      const d = project(u0, v1);
      g.fillStyle(color, alpha);
      g.fillPoints([new Phaser.Math.Vector2(a.x, a.y), new Phaser.Math.Vector2(b.x, b.y), new Phaser.Math.Vector2(c.x, c.y), new Phaser.Math.Vector2(d.x, d.y)], true);
    };
    // Planks.
    const planks = 11;
    for (let i = 0; i < planks; i++) {
      const u0 = (i / planks) * LANE_W;
      const u1 = ((i + 1) / planks) * LANE_W;
      quad(u0, vNear, u1, vFar, col(i % 2 ? th.lane.a : th.lane.b));
      // Staggered seams.
      for (let v = vNear + ((i * 137) % 260); v < vFar; v += 520 + ((i * 71) % 200)) quad(u0, v, u1, v + 6, col(th.lane.line), 0.6);
      // Grain highlight.
      quad(u0 + 4, vNear, u0 + 9, vFar, 0xffffff, 0.08);
    }
    for (let i = 0; i <= planks; i++) {
      const u = (i / planks) * LANE_W;
      quad(u - 1.5, vNear, u + 1.5, vFar, col(th.lane.line), 0.7);
    }
    // Ambient occlusion along the rails.
    quad(0, vNear, 18, vFar, 0x000000, 0.18);
    quad(LANE_W - 18, vNear, LANE_W, vFar, 0x000000, 0.18);
    // Rails.
    const rail = th.rail;
    for (const [u0, u1] of [
      [-34, -2],
      [LANE_W + 2, LANE_W + 34],
    ]) {
      quad(u0 - 4, vNear, u1 + 4, vFar, 0x2a1640, 1);
      quad(u0, vNear, u1, vFar, col(rail.b));
      quad(u0 + 6, vNear, u1 - 10, vFar, col(rail.a));
      quad(u0 + 9, vNear, u0 + 14, vFar, 0xffffff, 0.35);
      const step = rail.kind === 'bamboo' ? 260 : rail.kind === 'candy' ? 90 : rail.kind === 'stone' ? 200 : 320;
      for (let v = vNear; v < vFar; v += step) {
        if (rail.kind === 'candy') quad(u0, v, u1, v + step / 2, col(rail.b));
        else quad(u0 - 2, v, u1 + 2, v + (rail.kind === 'bamboo' ? 14 : 8), col(rail.b));
        if (rail.kind === 'bamboo') quad(u0 + 4, v + 14, u1 - 4, v + 20, 0xffffff, 0.25);
      }
    }
    this.laneRt?.destroy();
    const rt = this.add.renderTexture(this.view.left, this.view.top, this.W, this.H).setOrigin(0).setDepth(-50);
    rt.draw(g, -this.view.left, -this.view.top);
    g.destroy();
    this.laneRt = rt;
  }

  // ── HUD ───────────────────────────────────────────────────────────

  private drawHudPanel(): void {
    const panel = this.hudPanel;
    panel.clear();
    panel.fillStyle(0x2a1640, 0.9).fillRoundedRect(this.view.left - 20, -30, this.W + 40, 186, 30);
    panel.fillGradientStyle(0x7a3f16, 0x7a3f16, 0x4a240c, 0x4a240c, 1).fillRoundedRect(this.view.left - 20, -30, this.W + 40, 178, 28);
    panel.fillStyle(0xffffff, 0.12).fillRect(this.view.left, 2, this.W, 6);
    this.hudZone.setPosition(COL_W / 2, 75).setSize(this.W, 160);
  }

  private buildHud(): void {
    const hud = this.add.container(0, this.view.top).setDepth(4000);
    this.hudTop = hud;
    this.hudPanel = this.add.graphics();
    // Swallow taps on the HUD so they never aim.
    this.hudZone = this.add.zone(COL_W / 2, 75, this.W, 160).setInteractive();
    hud.add([this.hudPanel, this.hudZone]);
    this.drawHudPanel();
    hud.add(new RoundButton(this, 58, 52, 'ic_pause', 76, 'blue').onClick(() => this.openPause()));
    hud.add(txt(this, COL_W / 2, 38, t('levelN', { n: this.level }), 34));
    hud.add(new CoinPill(this, COL_W - 110, 50).setScale(0.88));
    // Goal widget.
    const gw = this.add.graphics();
    gw.fillStyle(0x000000, 0.35).fillRoundedRect(COL_W / 2 - 150, 74, 300, 64, 32);
    hud.add(gw);
    const goal = this.def.goal;
    const iconKey = goal.type === 'rescue' ? 'baby_0' : goal.type === 'collect' ? ballKey(equipped('balls'), goal.color) : 'ic_target';
    this.goalIcon = this.add.image(COL_W / 2 - 112, 106, iconKey).setDisplaySize(56, 56);
    this.goalIcon.setData('base', this.goalIcon.scale);
    this.goalText = txt(this, COL_W / 2 + 22, 104, '', 32);
    hud.add([this.goalIcon, this.goalText]);
    for (let i = 0; i < 3; i++) this.starIcons.push(this.add.image(COL_W - 160 + i * 42, 112, 'ic_star').setDisplaySize(40, 40));
    hud.add(this.starIcons);
    // Boosters.
    const slots: [InLevelBooster, number, number][] = [
      ['bomb', 74, 1196],
      ['rainbow', 186, 1226],
      ['lightning', 534, 1226],
      ['fire', 646, 1196],
      ['shots5', 360, 1232],
    ];
    for (const [id, x, y] of slots) {
      const b = new RoundButton(this, x, y, `ic_${id}`, id === 'shots5' ? 70 : 88, id === 'shots5' ? 'green' : 'purple').setDepth(3500);
      b.onClick(() => void this.useInLevelBooster(id));
      this.boosterBtns.set(id, b);
    }
    this.refreshBoosterBadges();
  }

  refreshBoosterBadges(): void {
    for (const [id, b] of this.boosterBtns) {
      const n = boosterCount(id);
      b.setBadge(n > 0 ? String(n) : '▶');
      b.icon.setAlpha(this.armed && this.armed !== id ? 0.5 : 1);
      b.setScale(this.armed === id ? 1.15 : 1);
    }
  }

  stars(): number {
    if (this.continues > 0) return 1;
    const f = this.shotsLeft / this.shotsTotal;
    return f >= 0.35 ? 3 : f >= 0.15 ? 2 : 1;
  }

  updateHud(): void {
    this.shotsText.setText(String(this.shotsLeft));
    this.shotsText.setColor(this.shotsLeft <= 5 ? '#ff8a8a' : '#ffffff');
    const g = this.def.goal;
    if (g.type === 'rescue') this.goalText.setText(`${Math.min(this.progress.rescued, g.count)} / ${g.count}`);
    else if (g.type === 'collect') this.goalText.setText(`${Math.min(this.progress.collected, g.count)} / ${g.count}`);
    else this.goalText.setText(`${Math.floor((1 - this.board.count() / this.initialCount) * 100)}%`);
    const st = this.stars();
    this.starIcons.forEach((s, i) => s.setTexture(i < st ? 'ic_star' : 'ic_starEmpty'));
  }

  private refreshQueue(): void {
    const skin = equipped('balls');
    const kind = this.currentKind();
    const tex =
      kind === 'bomb' ? 'sp_bomb' : kind === 'rainbow' ? 'sp_rainbow' : kind === 'fire' ? 'sp_fire' : kind === 'lightning' ? 'sp_lightning' : ballKey(skin, this.cur.color);
    this.curImg.setTexture(tex);
    this.nextImg.setTexture(ballKey(skin, this.next.color));
  }

  private currentKind(): ShotFx {
    if (this.armed === 'bomb' || this.pendingStartBomb) return 'bomb';
    if (this.armed === 'rainbow') return 'rainbow';
    if (this.armed === 'fire') return 'fire';
    if (this.armed === 'lightning') return 'lightning';
    return 'normal';
  }

  // ── Level start / boosters ───────────────────────────────────────

  startLevel(pre: PreBooster[]): void {
    for (const b of pre) {
      if (!useBooster(b)) continue;
      if (b === 'aim') this.longAim = true;
      if (b === 'shots3') this.shotsLeft += 3;
      if (b === 'startBomb') this.pendingStartBomb = true;
    }
    this.shotsTotal = this.shotsLeft;
    this.refreshQueue();
    this.updateHud();
    this.state = 'aim';
    ads.inGameplay = true;
    platform.gameplayStart();
    if (this.level <= 2 && !save.data.tutorialDone) this.showHint(this.level === 1 ? t('tut1') : t('tut2'));
  }

  private showHint(msg: string): void {
    const c = this.add.container(COL_W / 2, 880).setDepth(3600);
    const tx = txt(this, 0, 0, msg, 28, '#ffffff', { wordWrap: { width: 560 } });
    const g = this.add.graphics();
    g.fillStyle(0x2a1640, 0.8).fillRoundedRect(-tx.width / 2 - 24, -tx.height / 2 - 14, tx.width + 48, tx.height + 28, 20);
    c.add([g, tx]);
    const hand = this.add.image(COL_W / 2 + 60, 1000, 'ic_play').setDepth(3601).setDisplaySize(50, 50).setAngle(-90);
    this.tweens.add({ targets: hand, x: COL_W / 2 - 60, y: 700, duration: 1100, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: c, scale: { from: 0.96, to: 1.04 }, duration: 700, yoyo: true, repeat: -1 });
    this.hint = c;
    c.setData('hand', hand);
  }

  private clearHint(): void {
    if (!this.hint) return;
    (this.hint.getData('hand') as Phaser.GameObjects.Image)?.destroy();
    this.hint.destroy();
    this.hint = null;
    if (this.level >= 2) {
      save.data.tutorialDone = true;
      save.save();
    }
  }

  async useInLevelBooster(id: InLevelBooster): Promise<void> {
    if (this.state !== 'aim' || ads.isBusy) return;
    if (id !== 'shots5' && this.armed === id) {
      // Disarm: give the charge back.
      addBooster(id, 1);
      this.armed = null;
      this.refreshQueue();
      this.refreshBoosterBadges();
      return;
    }
    if (boosterCount(id) <= 0) {
      this.state = 'popup';
      const ok = await ads.rewarded();
      this.state = 'aim';
      if (!ok) {
        toast(this, t('adNoReward'));
        return;
      }
      addBooster(id, 1);
    }
    if (this.armed) addBooster(this.armed, 1);
    useBooster(id);
    if (id === 'shots5') {
      this.shotsLeft += 5;
      this.armed = null;
      audio.play('unlock', { vol: 0.6 });
      const lp = project(U_LAUNCH, V_LAUNCH);
      this.floatText(lp.x, lp.y - 90, '+5', '#7dff6a', 44);
    } else {
      this.armed = id;
      audio.play('swap');
      const base = this.curImg.getData('base') as number;
      this.tweens.killTweensOf(this.curImg);
      this.tweens.add({ targets: this.curImg, scale: { from: base * 1.6, to: base }, duration: 300, ease: 'Back.out' });
    }
    this.refreshQueue();
    this.refreshBoosterBadges();
    this.updateHud();
  }

  private swap(): void {
    if (this.state !== 'aim' || this.armed || this.pendingStartBomb) return;
    [this.cur.color, this.next.color] = [this.next.color, this.cur.color];
    audio.play('swap');
    this.tweens.add({ targets: this.swapRing, angle: this.swapRing.angle + 180, duration: 260, ease: 'Back.out' });
    for (const img of [this.curImg, this.nextImg]) {
      const base = img.getData('base') as number;
      this.tweens.killTweensOf(img);
      img.setScale(base);
      this.tweens.add({ targets: img, scale: base * 0.7, duration: 90, yoyo: true });
    }
    this.refreshQueue();
  }

  // ── Input & aiming ───────────────────────────────────────────────

  private setupInput(): void {
    const overUi = (over: Phaser.GameObjects.GameObject[]) => over.length > 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.state !== 'aim' || overUi(over) || ads.isBusy) return;
      this.aiming = true;
      this.updateAim(p);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.state !== 'aim') return;
      if (this.aiming || (!p.wasTouch && !overUi(over))) this.updateAim(p);
      else if (!p.wasTouch) this.hideAim();
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.aiming) return;
      this.aiming = false;
      if (this.state !== 'aim') return;
      this.updateAim(p);
      const lp = project(U_LAUNCH, V_LAUNCH);
      if (this.aimDir && p.worldY < lp.y - 40) this.fire();
      else this.hideAim();
    });
    this.input.keyboard?.on('keydown-SPACE', () => this.swap());
    this.input.keyboard?.on('keydown-ESC', () => this.openPause());
  }

  private updateAim(p: Phaser.Input.Pointer): void {
    const tgt = unproject(p.worldX, Math.max(p.worldY, this.view.top + 40));
    let du = tgt.u - U_LAUNCH;
    let dv = tgt.v - SHOT_START_V;
    const len = Math.hypot(du, dv);
    if (len < 1 || dv <= 0) {
      this.hideAim();
      this.aimDir = null;
      return;
    }
    du /= len;
    dv /= len;
    const minSin = Math.sin((10 * Math.PI) / 180);
    if (dv < minSin) {
      dv = minSin;
      du = Math.sign(du) * Math.cos(Math.asin(minSin));
    }
    this.aimDir = { du, dv };
    this.drawAim();
  }

  private hideAim(): void {
    this.aimDots.forEach((d) => d.setVisible(false));
    this.ghost.setVisible(false);
  }

  /** Trace a shot path with wall bounces; stops at the first contact. */
  private tracePath(du: number, dv: number, maxLen: number): { pts: { u: number; v: number }[]; hit: [number, number] | null; end: { u: number; v: number } } {
    let u = U_LAUNCH;
    let v = SHOT_START_V;
    const pts: { u: number; v: number }[] = [];
    const step = R * 0.45;
    let dist = 0;
    let next = 0;
    while (dist < maxLen) {
      u += du * step;
      v += dv * step;
      dist += step;
      if (u < R) {
        u = 2 * R - u;
        du = -du;
      } else if (u > LANE_W - R) {
        u = 2 * (LANE_W - R) - u;
        du = -du;
      }
      if (dist >= next) {
        pts.push({ u, v });
        next += 30;
      }
      const h = this.board.hit(u, v, this.vTop, 2 * R * 0.88);
      if (h) return { pts, hit: this.board.snap(u, v, this.vTop), end: { u, v } };
    }
    return { pts, hit: null, end: { u, v } };
  }

  private drawAim(): void {
    if (!this.aimDir) return;
    const kind = this.currentKind();
    const long = this.longAim || kind === 'lightning';
    const path = this.tracePath(this.aimDir.du, this.aimDir.dv, long ? 6000 : 820);
    const tint = kind === 'normal' ? BALL_COLORS[this.cur.color].hex : 0xffffff;
    this.aimDots.forEach((d, i) => {
      const pt = path.pts[i];
      if (!pt) return d.setVisible(false);
      const p = project(pt.u, pt.v);
      const fade = long ? 1 : 1 - i / Math.max(1, path.pts.length);
      d.setVisible(true)
        .setPosition(p.x, p.y - lift(p.s))
        .setScale(p.s * (0.75 + 0.25 * fade))
        .setAlpha(0.35 + 0.65 * fade)
        .setTint(i % 2 ? 0xffffff : tint);
    });
    if (long && path.hit && kind !== 'lightning') {
      const [r, c] = path.hit;
      const p = project(cellU(r, c), Board.cellV(r, this.vTop));
      this.ghost
        .setTexture(kind === 'normal' ? ballKey(equipped('balls'), this.cur.color) : this.curImg.texture.key)
        .setVisible(true)
        .setPosition(p.x, p.y - lift(p.s))
        .setScale((R * p.s) / BALL_R);
    } else this.ghost.setVisible(false);
  }

  // ── Shooting ────────────────────────────────────────────────────

  private fire(): void {
    if (!this.aimDir || this.state !== 'aim' || this.shotsLeft <= 0) return;
    this.clearHint();
    this.hideAim();
    const kind = this.currentKind();
    const color = this.cur.color;
    this.shotsLeft--;
    if (this.pendingStartBomb) this.pendingStartBomb = false;
    this.armed = null;
    audio.play('shoot');
    // Advance the queue.
    this.cur.color = this.next.color;
    this.next.color = nextBallColor(this.board, this.rng);
    this.refreshQueue();
    this.refreshBoosterBadges();
    this.updateHud();
    const base = this.curImg.getData('base') as number;
    this.tweens.killTweensOf(this.curImg);
    this.tweens.add({ targets: this.curImg, scale: { from: 0, to: base }, duration: 180, ease: 'Back.out' });

    if (kind === 'lightning') {
      this.fireLightning(this.aimDir.du, this.aimDir.dv);
      return;
    }
    const tex = kind === 'bomb' ? 'sp_bomb' : kind === 'rainbow' ? 'sp_rainbow' : kind === 'fire' ? 'sp_fire' : ballKey(equipped('balls'), color);
    const img = this.add.image(0, 0, tex).setDepth(3000);
    const shadow = this.add.image(0, 0, 'shadow').setDepth(-9);
    this.shot = { u: U_LAUNCH, v: SHOT_START_V, du: this.aimDir.du, dv: this.aimDir.dv, color, kind, budget: 12, img, shadow, trailT: 0 };
    this.state = 'flying';
    this.placeShot();
  }

  private placeShot(): void {
    const s = this.shot!;
    const p = project(s.u, s.v);
    s.img.setPosition(p.x, p.y - lift(p.s)).setScale((R * p.s) / BALL_R);
    s.shadow.setPosition(p.x, p.y + 2).setDisplaySize(R * 2.4 * p.s, R * 0.9 * p.s);
  }

  private updateShot(dt: number): void {
    const s = this.shot;
    if (!s) return;
    const dist = SPEED * dt;
    const steps = Math.max(1, Math.ceil(dist / (R * 0.4)));
    const step = dist / steps;
    for (let i = 0; i < steps; i++) {
      s.u += s.du * step;
      s.v += s.dv * step;
      if (s.u < R) {
        s.u = 2 * R - s.u;
        s.du = -s.du;
        audio.play('bounce', { vol: 0.5 });
      } else if (s.u > LANE_W - R) {
        s.u = 2 * (LANE_W - R) - s.u;
        s.du = -s.du;
        audio.play('bounce', { vol: 0.5 });
      }
      if (s.kind === 'fire') {
        const h = this.board.hit(s.u, s.v, this.vTop, 2 * R * 0.95);
        if (h === 'ceiling' || s.budget <= 0) return this.endShot();
        if (h) {
          s.budget--;
          audio.play('fire', { vol: 0.35, throttleMs: 60 });
          const res = this.board.removeCells([[h.r, h.c]]);
          this.applyResolution(res, s.u, s.v, true);
          if (s.budget <= 0) return this.endShot();
        }
        continue;
      }
      const h = this.board.hit(s.u, s.v, this.vTop, 2 * R * 0.88);
      if (h) {
        this.landShot();
        return;
      }
      if (s.v > this.vTop + ROW_H * 3) return this.endShot();
    }
    this.placeShot();
    s.trailT -= dt;
    if (s.trailT <= 0) {
      s.trailT = 0.03;
      const p = project(s.u, s.v);
      const key = s.kind === 'fire' ? 'fire' : s.kind === 'normal' ? `c${s.color}` : 'star';
      this.emitters.get(key)?.explode(s.kind === 'fire' ? 4 : 1, p.x, p.y - lift(p.s));
    }
  }

  /** Shot ends without attaching (fire burnt out / passed the ceiling). */
  private endShot(): void {
    const s = this.shot!;
    const p = project(s.u, s.v);
    this.emitters.get('fire')?.explode(18, p.x, p.y - lift(p.s));
    s.img.destroy();
    s.shadow.destroy();
    this.shot = null;
    this.afterShot();
  }

  private landShot(): void {
    const s = this.shot!;
    const snap = this.board.snap(s.u, s.v, this.vTop);
    s.img.destroy();
    s.shadow.destroy();
    this.shot = null;
    if (!snap) return this.afterShot();
    const [r, c] = snap;
    const kind = s.kind as ShotKind;
    const res = this.board.resolveShot(r, c, s.color, kind);
    const iu = cellU(r, c);
    const iv = Board.cellV(r, this.vTop);
    if (kind === 'bomb') {
      audio.play('bomb');
      vibrate([40, 30, 60], save.data.settings.vibration);
      this.cameras.main.shake(260, 0.012);
      const p = project(iu, iv);
      const f = this.add.image(p.x, p.y - lift(p.s), 'flash').setDepth(3500).setScale(0.5).setTint(0xffc060);
      this.tweens.add({ targets: f, scale: 4 * p.s, alpha: 0, duration: 420, onComplete: () => f.destroy() });
      this.emitters.get('fire')?.explode(40, p.x, p.y);
    } else if (kind === 'rainbow') audio.play('rainbow');
    else audio.play('snap', { vol: 0.7 });
    if (res.placed) {
      this.makeSprite(res.placed.cell);
      this.syncBoard();
      const spr = this.sprites.get(res.placed.cell.id);
      if (spr) this.tweens.add({ targets: spr.img, scaleX: spr.img.scaleX * 1.25, scaleY: spr.img.scaleY * 0.8, duration: 70, yoyo: true });
    }
    this.applyResolution(res, iu, iv, kind !== 'normal');
    this.afterShot();
  }

  private fireLightning(du: number, dv: number): void {
    audio.play('lightning');
    vibrate(60, save.data.settings.vibration);
    this.cameras.main.shake(200, 0.008);
    // Path to beyond the ceiling.
    const pts: { u: number; v: number }[] = [{ u: U_LAUNCH, v: SHOT_START_V }];
    let u = U_LAUNCH;
    let v = SHOT_START_V;
    const step = R * 0.5;
    const hits = new Map<number, [number, number]>();
    for (let i = 0; i < 4000 && v < this.vTop + ROW_H * 2; i++) {
      u += du * step;
      v += dv * step;
      if (u < R || u > LANE_W - R) {
        u = Phaser.Math.Clamp(u, R, LANE_W - R);
        du = -du;
        pts.push({ u, v });
      }
      for (let rr = Math.max(0, Math.floor((this.vTop - v) / ROW_H) - 1); rr <= Math.ceil((this.vTop - v) / ROW_H) + 1 && rr < this.board.rows.length; rr++) {
        this.board.rows[rr]?.forEach((cell, cc) => {
          if (!cell) return;
          const d = Math.hypot(cellU(rr, cc) - u, Board.cellV(rr, this.vTop) - v);
          if (d < R * 1.35) hits.set(cell.id, [rr, cc]);
        });
      }
    }
    pts.push({ u, v });
    const res = this.board.removeCells([...hits.values()]);
    // Bolt visual: jagged glowing polyline that flickers out.
    const screen = pts.map((pt) => {
      const p = project(pt.u, pt.v);
      return { x: p.x, y: p.y - lift(p.s) };
    });
    const jag: { x: number; y: number }[] = [];
    for (let i = 0; i < screen.length - 1; i++) {
      const a = screen[i];
      const b = screen[i + 1];
      const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 26));
      for (let k = 0; k < n; k++) {
        const f = k / n;
        const off = k === 0 ? 0 : (Math.random() - 0.5) * 22;
        jag.push({ x: a.x + (b.x - a.x) * f + off, y: a.y + (b.y - a.y) * f });
      }
    }
    jag.push(screen[screen.length - 1]);
    const g = this.add.graphics().setDepth(3450).setBlendMode(Phaser.BlendModes.ADD);
    for (const [w, c, a] of [
      [26, 0x2d8cff, 0.35],
      [12, 0x8fe8ff, 0.8],
      [5, 0xffffff, 1],
    ] as const) {
      g.lineStyle(w, c, a);
      g.strokePoints(jag);
    }
    for (const pt of jag.filter((_, i) => i % 6 === 0)) this.emitters.get('star')?.explode(1, pt.x, pt.y);
    const flash = this.add.rectangle(this.view.left, this.view.top, this.W, this.H, 0xbfefff, 0.35).setOrigin(0).setDepth(3449);
    this.tweens.add({ targets: flash, alpha: 0, duration: 250, onComplete: () => flash.destroy() });
    this.tweens.add({ targets: g, alpha: { from: 1, to: 0.3 }, duration: 70, yoyo: true, repeat: 3, onComplete: () => g.destroy() });
    this.applyResolution(res, U_LAUNCH, SHOT_START_V, true);
    this.afterShot();
  }

  /** Animate removals/unlocks; update goal progress. */
  private applyResolution(res: Resolution, iu: number, iv: number, forceFx: boolean): void {
    this.boardDirty = true;
    const pops = res.removed.filter((r) => r.how !== 'drop');
    const drops = res.removed.filter((r) => r.how === 'drop');
    applyProgress(res, this.def.goal, this.progress);
    save.data.stats.popped += res.removed.length;
    let maxDelay = 0;
    pops.forEach((rm) => {
      const d = Math.hypot(cellU(rm.r, rm.c) - iu, Board.cellV(rm.r, this.vTop) - iv) / (2 * R);
      const delay = Math.min(500, d * 22);
      maxDelay = Math.max(maxDelay, delay);
      this.time.delayedCall(delay, () => this.removeVisual(rm, true));
    });
    drops.forEach((rm, i) => this.time.delayedCall(maxDelay + 60 + (i % 10) * 8, () => this.removeVisual(rm, false)));
    for (const u of res.unlocked) {
      const spr = this.sprites.get(u.cell.id);
      if (!spr?.ov) continue;
      const p = project(cellU(u.r, u.c), Board.cellV(u.r, this.vTop));
      if (u.lock === 'ice') {
        audio.play('ice', { vol: 0.6 });
        this.emitters.get('ice')?.explode(8, p.x, p.y - lift(p.s));
      } else {
        audio.play('vine', { vol: 0.6 });
        this.emitters.get('leaf')?.explode(6, p.x, p.y - lift(p.s));
      }
      spr.ov.destroy();
      spr.ov = undefined;
    }
    const total = res.removed.length;
    if (total > 0 && pops.length) audio.play(total >= 10 ? 'popBig' : 'pop', { vol: 0.8 });
    if (total >= 10 && !forceFx) {
      const lvl = total >= 60 ? 4 : total >= 35 ? 3 : total >= 20 ? 2 : 1;
      const p = project(iu, iv);
      this.time.delayedCall(150, () => {
        this.floatText(COL_W / 2, Math.max(this.view.top + 260, p.y - 120), t(`combo${lvl}`), ['#ffffff', '#ffe14a', '#7dff6a', '#ff8ad8'][lvl - 1], 44 + lvl * 6);
        audio.play('combo', { vol: 0.6 });
      });
      if (total >= 20) vibrate(30, save.data.settings.vibration);
    }
    this.updateHud();
  }

  private removeVisual(rm: Removed, popped: boolean): void {
    const spr = this.sprites.get(rm.cell.id);
    this.sprites.delete(rm.cell.id);
    const u = cellU(rm.r, rm.c);
    const v = Board.cellV(rm.r, this.vTop);
    const p = project(u, v);
    const y = p.y - lift(p.s);
    spr?.ov?.destroy();
    const cell = rm.cell;
    if (cell.kind === 'animal') {
      spr?.img.destroy();
      this.flyToGoal(ANIMAL_TEX(cell.animal), p.x, y);
      audio.play('rescue');
      save.data.stats.rescued++;
      return;
    }
    if (cell.kind === 'coin') {
      spr?.img.destroy();
      this.collectCoinsFx(p.x, y, 5);
      return;
    }
    if (cell.kind === 'stone') {
      spr?.img.destroy();
      audio.play('stone', { vol: 0.6 });
      this.emitters.get('stone')?.explode(8, p.x, y);
      return;
    }
    if (cell.color < 0) {
      spr?.img.destroy();
      return;
    }
    if (popped) {
      audio.play('pop', { vol: 0.35, rate: 0.9 + Math.random() * 0.5, throttleMs: 28 });
      if (!save.data.settings.lowFx) this.emitters.get(`c${cell.color}`)?.explode(3, p.x, y);
    }
    if (!spr) return;
    if (this.def.goal.type === 'collect' && cell.color === this.def.goal.color) this.flyToGoal(spr.img.texture.key, p.x, y, true);
    if (this.rollers.length > 320) {
      spr.img.destroy();
      return;
    }
    // The ball drops onto the floor and rolls toward the player.
    spr.img.setTint(0xffffff);
    this.rollers.push({
      u,
      v,
      z: 0,
      du: (Math.random() - 0.5) * (popped ? 260 : 120),
      dv: popped ? Math.random() * 220 : Math.random() * 60,
      vz: popped ? 260 + Math.random() * 260 : 80 + Math.random() * 80,
      img: spr.img,
      shadow: this.add.image(0, 0, 'shadow').setDepth(-9).setAlpha(0.8),
      done: false,
    });
  }

  private flyToGoal(tex: string, x: number, y: number, small = false): void {
    const img = this.add.image(x, y, tex).setDepth(4100).setDisplaySize(small ? 30 : 60, small ? 30 : 60);
    this.tweens.add({
      targets: img,
      x: this.goalIcon.x,
      y: this.goalIcon.y + this.hudTop.y,
      scale: img.scale * 0.6,
      duration: small ? 450 : 700,
      ease: 'Cubic.in',
      onComplete: () => {
        img.destroy();
        const base = this.goalIcon.getData('base') as number;
        this.tweens.killTweensOf(this.goalIcon);
        this.tweens.add({ targets: this.goalIcon, scale: { from: base * 1.3, to: base }, duration: 160 });
        if (!small) this.emitters.get('star')?.explode(10, this.goalIcon.x, this.goalIcon.y + this.hudTop.y);
      },
    });
    if (!small) this.floatText(x, y - 40, t('rescued'), '#7dff6a', 30);
  }

  private collectCoinsFx(x: number, y: number, n: number): void {
    audio.play('coin');
    this.addLevelCoins(n);
    for (let i = 0; i < Math.min(n, 6); i++) {
      const c = this.add.image(x, y, 'ic_coin').setDepth(4100).setDisplaySize(34, 34);
      this.tweens.add({ targets: c, x: COL_W - 190, y: this.view.top + 50, delay: i * 60, duration: 600, ease: 'Cubic.in', onComplete: () => c.destroy() });
    }
  }

  private addLevelCoins(n: number): void {
    this.coinFrac += n;
    const whole = Math.floor(this.coinFrac);
    if (whole > 0) {
      this.coinFrac -= whole;
      this.levelCoins += whole;
      addCoins(whole);
    }
  }

  floatText(x: number, y: number, s: string, color: string, size = 34): void {
    const tx = txt(this, x, y, s, size, color).setDepth(3800).setScale(0.4);
    this.tweens.add({ targets: tx, scale: 1, duration: 220, ease: 'Back.out' });
    this.tweens.add({ targets: tx, y: y - 70, alpha: 0, delay: 650, duration: 450, onComplete: () => tx.destroy() });
  }

  private afterShot(): void {
    if (this.state === 'flying') this.state = 'aim';
    // Keep the queue playable.
    const present = this.board.colorsPresent();
    if (present.length) {
      const ex = exposedCells(this.board);
      if (!present.includes(this.cur.color)) this.cur.color = nextBallColor(this.board, this.rng, ex);
      if (!present.includes(this.next.color)) this.next.color = nextBallColor(this.board, this.rng, ex);
    }
    this.refreshQueue();
    this.updateHud();
    if (goalDone(this.def.goal, this.board, this.progress)) this.win();
    else if (this.shotsLeft <= 0) {
      this.state = 'popup';
      this.time.delayedCall(900, () => this.outOfShots());
    }
  }

  // ── Board rendering ───────────────────────────────────────────────

  private targetVTop(): number {
    return V_FRONT + Math.max(0, this.board.maxRow()) * ROW_H;
  }

  private makeSprite(cell: Cell): void {
    this.boardDirty = true;
    const skin = equipped('balls');
    const tex = cell.kind === 'ball' ? ballKey(skin, cell.color) : cell.kind === 'stone' ? 'sp_stone' : cell.kind === 'coin' ? 'sp_coin' : ANIMAL_TEX(cell.animal);
    const img = this.add.image(0, 0, tex);
    const entry: { img: Phaser.GameObjects.Image; ov?: Phaser.GameObjects.Image } = { img };
    if (cell.lock !== 'none') entry.ov = this.add.image(0, 0, cell.lock === 'ice' ? 'ov_ice' : 'ov_vine');
    this.sprites.set(cell.id, entry);
  }

  /** Position every board sprite for the current vTop. */
  private syncBoard(create = false): void {
    if (!create && !this.boardDirty && Math.abs(this.syncedVTop - this.vTop) < 0.01) return;
    this.boardDirty = false;
    this.syncedVTop = this.vTop;
    const minY = this.view.top + 110;
    this.board.forEach((cell, r, c) => {
      let spr = this.sprites.get(cell.id);
      if (!spr) {
        if (!create && cell.color === -2) return;
        this.makeSprite(cell);
        spr = this.sprites.get(cell.id)!;
      }
      const p = project(cellU(r, c), Board.cellV(r, this.vTop));
      const y = p.y - lift(p.s);
      const vis = y > minY - R;
      spr.img.setVisible(vis);
      if (!vis) {
        spr.ov?.setVisible(false);
        return;
      }
      const sc = ((R * p.s * 1.04) / BALL_R) * (cell.kind === 'animal' ? 1.22 : 1);
      spr.img.setPosition(p.x, y).setDepth(1000 + p.y);
      if (!this.tweens.isTweening(spr.img)) spr.img.setScale(sc);
      if (spr.ov) spr.ov.setVisible(true).setPosition(p.x, y).setScale(sc).setDepth(1001 + p.y);
    });
  }

  // ── Rollers (falling balls cascade) ───────────────────────────────

  private updateRollers(dt: number): void {
    for (const b of this.rollers) {
      b.dv -= ROLL_G * dt;
      if (b.dv < -1700) b.dv = -1700;
      b.u += b.du * dt;
      b.v += b.dv * dt;
      b.du *= 1 - 0.4 * dt;
      if (b.u < R) {
        b.u = R;
        b.du = Math.abs(b.du) * 0.6;
      } else if (b.u > LANE_W - R) {
        b.u = LANE_W - R;
        b.du = -Math.abs(b.du) * 0.6;
      }
      b.vz -= 2600 * dt;
      b.z += b.vz * dt;
      if (b.z < 0) {
        b.z = 0;
        if (b.vz < -160) {
          b.vz = -b.vz * 0.38;
          audio.play('clack', { vol: 0.25, throttleMs: 50 });
        } else b.vz = 0;
      }
      if (b.z < 6) {
        for (const h of this.holes) {
          if (Math.hypot(b.u - h.u, b.v - h.v) < R * 1.15) {
            this.capture(b, h);
            break;
          }
        }
      }
      if (b.done) continue;
      if (b.v < V_GONE) {
        b.done = true;
        b.img.destroy();
        b.shadow.destroy();
        continue;
      }
      const p = project(b.u, b.v);
      const s = p.s;
      b.img.setPosition(p.x, p.y - lift(s) - b.z * s).setScale((R * s) / BALL_R).setDepth(1000 + p.y + 2);
      b.shadow.setPosition(p.x, p.y + 2).setDisplaySize(R * 2.3 * s, R * 0.8 * s).setAlpha(0.7 / (1 + b.z * 0.02));
    }
    if (this.rollers.some((b) => b.done)) this.rollers = this.rollers.filter((b) => !b.done);
  }

  private capture(b: Roller, h: Hole & { img: Phaser.GameObjects.Image }): void {
    b.done = true;
    b.shadow.destroy();
    const p = project(h.u, h.v);
    this.tweens.add({ targets: b.img, x: p.x, y: p.y, scale: 0, duration: 140, onComplete: () => b.img.destroy() });
    audio.play('hole', { vol: 0.45, throttleMs: 70 });
    this.addLevelCoins(h.mult * COIN_PER_BALL);
    if (!h.img.getData('busy')) {
      h.img.setData('busy', true);
      this.floatText(p.x, p.y - 30, `+${h.mult}`, '#ffe14a', 26);
      this.time.delayedCall(260, () => h.img.setData('busy', false));
      this.tweens.add({ targets: h.img, scaleX: h.img.scaleX * 1.15, scaleY: h.img.scaleY * 1.15, duration: 80, yoyo: true });
    }
  }

  // ── Frame ─────────────────────────────────────────────────────────

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    if (this.state === 'popup' && this.scene.isPaused()) return;
    const target = this.targetVTop();
    if (Math.abs(target - this.vTop) > 0.5) {
      this.vTop += (target - this.vTop) * Math.min(1, dt * 5);
      if (this.aimDir && (this.aiming || !this.input.activePointer.wasTouch) && this.state === 'aim') this.drawAim();
    }
    this.syncBoard();
    this.updateShot(dt);
    this.updateRollers(dt);
  }

  // ── End of level ──────────────────────────────────────────────────

  private win(): void {
    if (this.state === 'won') return;
    this.state = 'won';
    this.hideAim();
    ads.inGameplay = false;
    platform.gameplayStop();
    audio.play('win');
    // Everything left falls down as a celebration.
    const res: Resolution = { placed: null, removed: [], unlocked: [], matched: 0 };
    this.board.forEach((cell, r, c) => res.removed.push({ r, c, cell, how: 'drop' }));
    this.board.rows = [];
    res.removed.forEach((rm, i) => this.time.delayedCall(i * 4, () => this.removeVisual(rm, false)));
    // Remaining shots fly out as bonus balls into the holes.
    const bonus = this.shotsLeft;
    const lp = project(U_LAUNCH, V_LAUNCH);
    if (bonus > 0) this.floatText(COL_W / 2, 640, t('bonusShots'), '#ffe14a', 40);
    for (let i = 0; i < bonus; i++) {
      this.time.delayedCall(400 + i * 110, () => {
        this.shotsLeft = Math.max(0, this.shotsLeft - 1);
        this.shotsText.setText(String(this.shotsLeft));
        audio.play('shoot', { vol: 0.4 });
        this.addLevelCoins(2);
        const color = this.rng.int(0, 7);
        const img = this.add.image(lp.x, lp.y, ballKey(equipped('balls'), color));
        this.rollers.push({
          u: U_LAUNCH,
          v: SHOT_START_V,
          z: 0,
          du: (Math.random() - 0.5) * 900,
          dv: 900 + Math.random() * 500,
          vz: 500,
          img,
          shadow: this.add.image(0, 0, 'shadow').setDepth(-9),
          done: false,
        });
      });
    }
    const st = this.stars();
    this.time.delayedCall(1300 + bonus * 110, () => showVictory(this, st));
  }

  /** Called by the victory popup once the reward is taken. */
  completeLevel(stars: number): void {
    const key = String(this.level);
    save.data.stars[key] = Math.max(save.data.stars[key] ?? 0, stars);
    save.data.maxLevel = Math.max(save.data.maxLevel, this.level + 1);
    save.data.stats.wins++;
    save.flush();
  }

  baseReward(): number {
    return (15 + Math.min(this.level, 60)) * (this.def.boss ? 2 : 1);
  }

  private outOfShots(): void {
    if (this.state === 'won') return;
    ads.inGameplay = false;
    platform.gameplayStop();
    showOutOfShots(this);
  }

  /** Continue after running out of shots. */
  continueWith(shots: number): void {
    this.continues++;
    this.shotsLeft += shots;
    this.state = 'aim';
    ads.inGameplay = true;
    platform.gameplayStart();
    this.updateHud();
    const lp = project(U_LAUNCH, V_LAUNCH);
    this.floatText(lp.x, lp.y - 90, `+${shots}`, '#7dff6a', 46);
  }

  giveUp(): void {
    this.state = 'lost';
    audio.play('lose');
    showDefeat(this);
  }

  // ── Pause & overlays ──────────────────────────────────────────────

  openPause(): void {
    if (this.state !== 'aim' && this.state !== 'flying') return;
    this.aiming = false;
    this.hideAim();
    const prev = this.state;
    this.state = 'popup';
    ads.inGameplay = false;
    platform.gameplayStop();
    showPause(this, () => {
      this.state = prev === 'flying' && !this.shot ? 'aim' : prev;
      ads.inGameplay = true;
      platform.gameplayStart();
    });
  }

  /** Open Shop / Settings on top of the paused level. */
  openOverlay(key: 'Shop' | 'Settings'): void {
    this.scene.pause();
    this.scene.launch(key, { overlay: true, from: 'Game' });
    this.scene.bringToTop(key);
  }

  private onOverlayClosed(): void {
    // Cosmetics may have changed in the shop.
    const skin = equipped('balls');
    this.board.forEach((cell) => {
      const spr = this.sprites.get(cell.id);
      if (spr && cell.kind === 'ball') spr.img.setTexture(ballKey(skin, cell.color));
    });
    this.refreshQueue();
    this.refreshBoosterBadges();
    this.events.emit('overlay-closed');
  }

  /** Leave the level for another screen (fullscreen ad on the way out). */
  async leave(to: 'Map' | 'Menu' | 'Game', data: any = {}, trigger: 'exitLevel' | 'restart' | 'lose' | 'win' = 'exitLevel'): Promise<void> {
    this.input.enabled = false;
    await ads.interstitial(trigger, this.level);
    this.go(to, data);
  }
}
