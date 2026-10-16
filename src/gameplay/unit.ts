import Phaser from 'phaser';
import { SPRITES, type SheetMeta } from '../art/sprites';
import type { AttackSpec } from '../data/types';
import type { Battle } from './battle';

export type Team = 0 | 1;
export type UnitKind = 'hero' | 'enemy' | 'boss' | 'turret' | 'clone';

export interface UnitOpts {
  kind: UnitKind;
  team: Team;
  x: number;
  y: number;
  r: number;
  hp: number;
  speed: number;
  attack: AttackSpec;
  texture: string;
  scale: number;
  label?: string;
  dmgMult?: number;
  /** On-screen height for pre-rendered 3D sheets (px). */
  displayH?: number;
}

let NEXT_ID = 1;

export class Unit {
  readonly id = NEXT_ID++;
  kind: UnitKind;
  team: Team;
  x: number;
  y: number;
  r: number;
  hp: number;
  maxHp: number;
  shield = 0;
  speed: number;
  dmgMult: number;
  dmgTaken = 1;
  attack: AttackSpec;
  maxAmmo = 3;
  ammo = 3;
  reloadTimer = 0;
  fireCd = 0;
  superCharge = 0;
  stun = 0;
  slowT = 0;
  slowAmt = 0;
  burnDps = 0;
  burnT = 0;
  burnSrc: Unit | null = null;
  invis = 0;
  /** Visible to enemies even in bushes for this long (after attacking). */
  revealT = 0;
  sinceHurt = 99;
  sinceAttack = 99;
  alive = true;
  inBush = false;
  facing = 1;
  moving = false;
  /** Dash / knockback in progress. */
  dash: { vx: number; vy: number; t: number; hitIds: Set<number>; dmg: number; breakWalls: boolean } | null = null;
  lifeT = -1;
  defId = '';
  tag: Record<string, any> = {};

  root: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Graphics;
  label?: Phaser.GameObjects.Text;
  ring?: Phaser.GameObjects.Image;
  private bob = Math.random() * 10;
  private flashT = 0;
  private lastBarKey = '';
  private baseScale: number;
  /** Pre-rendered direction × frame sheet, if this unit's texture has one. */
  private sheet: SheetMeta | null = null;
  private walkPhase = 0;
  private lastX = 0;
  private lastY = 0;
  private dirAngle = Math.PI / 2;
  private barY = 0;

  constructor(private battle: Battle, o: UnitOpts) {
    this.kind = o.kind;
    this.team = o.team;
    this.x = o.x;
    this.y = o.y;
    this.r = o.r;
    this.hp = this.maxHp = o.hp;
    this.speed = o.speed;
    this.attack = o.attack;
    this.dmgMult = o.dmgMult ?? 1;
    this.baseScale = o.scale;
    const s = battle.scene;
    this.shadow = s.add.image(0, 0, 'shadow').setDisplaySize(this.r * 2.4, this.r * 0.9);
    this.sheet = SPRITES[o.texture] ?? null;
    this.sprite = s.add.image(0, 0, o.texture).setOrigin(0.5, 0.92).setScale(o.scale);
    this.sprite.y = this.r * 0.35;
    if (this.sheet) {
      const dh = o.displayH ?? this.r * 4.3;
      o.scale = dh / this.sheet.cellH;
      this.baseScale = o.scale;
      this.sprite.setOrigin(0.5, this.sheet.anchorY).setFrame(this.frameIndex(0, 3)).setScale(o.scale);
      this.barY = this.sprite.y - this.sheet.anchorY * dh * 0.93 - 4;
    } else {
      this.barY = -this.r * 2.2 - 14;
    }
    this.lastX = this.x;
    this.lastY = this.y;
    this.bar = s.add.graphics();
    this.root = s.add.container(this.x, this.y, [this.shadow, this.sprite, this.bar]);
    this.shadow.y = this.r * 0.35;
    if (o.label) {
      this.label = s.add
        .text(0, 0, o.label, { fontFamily: 'Trebuchet MS, Arial Black, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#ffffff', stroke: '#1b1530', strokeThickness: 4 })
        .setOrigin(0.5, 1);
      this.root.add(this.label);
    }
    this.root.setDepth(this.y);
    // Spawn pop.
    this.sprite.setScale(0);
    s.tweens.add({ targets: this.sprite, scale: o.scale, duration: 260, ease: 'Back.Out' });
  }

  get isPlayer(): boolean {
    return this.battle.player === this;
  }

  get speedNow(): number {
    let s = this.speed;
    if (this.slowT > 0) s *= 1 - this.slowAmt;
    return s;
  }

  /** Can enemies of this unit see it right now from position (x, y)? */
  visibleFrom(x: number, y: number): boolean {
    const d = Math.hypot(this.x - x, this.y - y);
    if (this.invis > 0) return d < 90;
    if (this.inBush && this.revealT <= 0) return d < 150;
    return true;
  }

  flash(): void {
    this.flashT = 0.08;
    this.sprite.setTintFill(0xffffff);
  }

  heal(amount: number): void {
    if (!this.alive) return;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    if (this.hp - before >= 1) this.battle.floatText(this.x, this.y - this.r * 2.4, `+${Math.round(this.hp - before)}`, '#57cc99');
  }

  update(dt: number): void {
    this.fireCd = Math.max(0, this.fireCd - dt);
    if (this.ammo < this.maxAmmo) {
      this.reloadTimer += dt;
      if (this.reloadTimer >= this.attack.reload) {
        this.reloadTimer = 0;
        this.ammo++;
      }
    } else this.reloadTimer = 0;
    this.stun = Math.max(0, this.stun - dt);
    this.slowT = Math.max(0, this.slowT - dt);
    this.invis = Math.max(0, this.invis - dt);
    this.revealT = Math.max(0, this.revealT - dt);
    this.sinceHurt += dt;
    if (this.tag.invuln > 0) this.tag.invuln -= dt;
    this.sinceAttack += dt;
    if (this.burnT > 0) {
      this.burnT -= dt;
      this.battle.damage(this, this.burnDps * dt, this.burnSrc, { silent: true, noCharge: true });
    }
    // Out-of-combat regeneration, Brawl-style.
    if ((this.kind === 'hero' || this.kind === 'enemy') && this.sinceHurt > 3 && this.sinceAttack > 3 && this.hp < this.maxHp && this.alive) {
      const rate = this.kind === 'hero' ? 0.13 : 0.05;
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * rate * dt);
    }
    if (this.lifeT > 0) {
      this.lifeT -= dt;
      if (this.lifeT <= 0) this.battle.kill(this, null);
    }
    this.inBush = this.battle.arena.isBushPx(this.x, this.y);
  }

  private frameIndex(dir: number, frame: number): number {
    return dir * (this.sheet?.frames ?? 1) + frame;
  }

  /** Pick direction row + animation frame from movement / aim. */
  private animateSheet(dt: number): void {
    const sh = this.sheet!;
    const dx = this.x - this.lastX;
    const dy = this.y - this.lastY;
    const dist = Math.hypot(dx, dy);
    const atkT = (this.tag.atkT ?? 0) as number;
    if (atkT > 0) {
      this.tag.atkT = atkT - dt;
      this.dirAngle = this.tag.aimA ?? this.dirAngle;
    } else if (this.tag.faceA !== undefined) {
      this.dirAngle = this.tag.faceA;
    } else if (dist > 0.4) {
      this.dirAngle = Math.atan2(dy, dx);
    }
    // Mirror the west half onto rendered east-side directions.
    const flip = Math.cos(this.dirAngle) < -0.01;
    const a = flip ? Math.PI - this.dirAngle : this.dirAngle;
    const theta = Phaser.Math.Angle.Wrap(Math.PI / 2 - a);
    const dir = Phaser.Math.Clamp(Math.round(Math.abs(theta) / (Math.PI / 4)), 0, sh.dirs - 1);
    let frame = 3; // idle (feet together)
    if (sh.frames >= 5) {
      if (atkT > 0) frame = 4;
      else if (dist > 0.4) {
        this.walkPhase = (this.walkPhase + dist / 70) % 1;
        frame = Math.floor(this.walkPhase * 4) % 4;
      }
    } else frame = 0;
    this.sprite.setFrame(this.frameIndex(dir, Math.min(frame, sh.frames - 1)));
    this.sprite.setFlipX(flip);
    this.facing = flip ? -1 : 1;
  }

  syncVisual(dt: number, viewerTeam: Team, viewer: Unit | null): void {
    const r = this.root;
    r.setPosition(this.x, this.y);
    r.setDepth(this.y + this.r * 0.4);
    if (this.sheet) {
      this.animateSheet(dt);
      this.lastX = this.x;
      this.lastY = this.y;
    }
    this.bob += dt * (this.moving ? 14 : 3);
    const k = this.moving ? 1 : 0.35;
    const sc = this.baseScale;
    if (this.sheet) {
      // Frames carry the animation; keep only a subtle idle breath.
      if (!this.battle.scene.tweens.isTweening(this.sprite)) this.sprite.setScale(sc, sc * (1 + (this.moving ? 0 : Math.sin(this.bob * 2) * 0.012)));
    } else if (this.sprite.scaleY > 0 && !this.battle.scene.tweens.isTweening(this.sprite)) {
      this.sprite.setScale(sc * (1 + Math.sin(this.bob * 2) * 0.03 * k) * this.facing, sc * (1 - Math.sin(this.bob * 2) * 0.03 * k));
      this.sprite.rotation = this.moving ? Math.sin(this.bob) * 0.08 : 0;
    } else if (this.sprite.scaleY > 0) {
      this.sprite.scaleX = Math.abs(this.sprite.scaleX) * this.facing;
    }
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.sprite.clearTint();
    } else if (this.stun > 0) {
      this.sprite.setTint(0x9fb4ff);
    } else if (this.burnT > 0) {
      this.sprite.setTint(Math.sin(this.bob * 3) > 0 ? 0xffb070 : 0xffffff);
    } else if (this.sprite.isTinted) {
      this.sprite.clearTint();
    }

    // Visibility: own team sees semi-transparent; enemies may not see at all.
    let alpha = 1;
    if (this.team === viewerTeam) {
      if (this.invis > 0) alpha = 0.4;
      else if (this.inBush) alpha = 0.6;
    } else {
      const seen = viewer ? this.visibleFrom(viewer.x, viewer.y) : true;
      alpha = seen ? (this.invis > 0 ? 0.35 : 1) : 0;
    }
    r.setAlpha(alpha);
    this.drawBar();
    if (this.label) this.label.y = this.barY - 6;
  }

  private drawBar(): void {
    if (this.kind === 'boss') return;
    const pct = Math.max(0, this.hp / this.maxHp);
    const sh = this.shield > 0 ? Math.min(1, this.shield / this.maxHp) : 0;
    const showAmmo = this.isPlayer;
    const key = `${pct.toFixed(3)}|${sh.toFixed(3)}|${showAmmo ? this.ammo + (this.reloadTimer / this.attack.reload).toFixed(2) : ''}`;
    if (key === this.lastBarKey) return;
    this.lastBarKey = key;
    const g = this.bar;
    g.clear();
    const w = this.kind === 'hero' ? 74 : 58;
    const h = this.kind === 'hero' ? 11 : 8;
    const y = this.barY;
    g.fillStyle(0x1b1530, 0.9).fillRoundedRect(-w / 2 - 2, y - 2, w + 4, h + 4, 4);
    const col = this.team === 0 ? (this.kind === 'turret' ? 0x4cc9f0 : 0x3ddc4a) : 0xff3b4e;
    g.fillStyle(col, 1).fillRoundedRect(-w / 2, y, Math.max(2, w * pct), h, 3);
    if (sh > 0) g.fillStyle(0x9be7ff, 0.95).fillRoundedRect(-w / 2, y, Math.max(2, w * sh), h * 0.45, 2);
    if (showAmmo) {
      const segW = (w - 4) / 3;
      for (let i = 0; i < 3; i++) {
        const sx = -w / 2 + i * (segW + 2);
        g.fillStyle(0x1b1530, 0.9).fillRect(sx, y + h + 4, segW, 6);
        let f = 0;
        if (i < this.ammo) f = 1;
        else if (i === this.ammo) f = this.reloadTimer / this.attack.reload;
        g.fillStyle(f >= 1 ? 0xffa62b : 0xb36b1e, 1).fillRect(sx + 1, y + h + 5, (segW - 2) * f, 4);
      }
    }
  }

  destroy(): void {
    this.root.destroy();
    this.ring?.destroy();
  }
}
