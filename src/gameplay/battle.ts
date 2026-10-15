import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { BOSSES, enemyById } from '../data/enemies';
import { heroById, heroPowerMult } from '../data/heroes';
import { skinById, type BoosterId } from '../data/shop';
import { TILE, type AttackSpec, type HeroDef } from '../data/types';
import { Rng } from '../core/rng';
import { t } from '../core/i18n';
import { Arena } from './arena';
import { updateBrain } from './ai';
import { BossBrain } from './boss';
import { castSuper, fireAttack } from './combat';
import type { LevelConfig } from './levels';
import { Unit, type Team } from './unit';

export interface InputState {
  mx: number;
  my: number;
  /** Currently held aim (for preview). */
  aim: { active: boolean; angle: number; mag: number; isSuper: boolean };
  fire: { angle: number | null; mag: number } | null;
  superFire: { angle: number | null; mag: number } | null;
}

export interface Proj {
  x: number;
  y: number;
  vx: number;
  vy: number;
  range: number;
  r: number;
  dmg: number;
  team: Team;
  src: Unit | null;
  pierce: boolean;
  hitIds: Set<number>;
  img: Phaser.GameObjects.Image;
  charge: number;
  burn?: number;
  stun?: number;
  slow?: number;
  lifesteal?: number;
  breakWalls?: boolean;
  spin?: number;
  grow?: number;
  dead?: boolean;
}

export interface Lob {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  t: number;
  dur: number;
  arc: number;
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  marker: Phaser.GameObjects.Graphics;
  radius: number;
  onLand: (x: number, y: number) => void;
}

export interface Zone {
  x: number;
  y: number;
  r: number;
  t: number;
  dur: number;
  team: Team | -1;
  gfx: Phaser.GameObjects.GameObject & { destroy(): void };
  tickEvery: number;
  tickAcc: number;
  tick: (z: Zone) => void;
  follow?: Unit;
  vx?: number;
  vy?: number;
}

export interface Tele {
  t: number;
  dur: number;
  gfx: Phaser.GameObjects.Graphics;
  draw: (g: Phaser.GameObjects.Graphics, p: number) => void;
  done: () => void;
  owner?: Unit;
}

interface Pickup {
  x: number;
  y: number;
  kind: 'coin' | 'heart' | 'shroom';
  value: number;
  img: Phaser.GameObjects.Image;
  age: number;
}

export interface BattleSetup {
  heroId: string;
  skinId: string;
  heroLevel: number;
  boosters: BoosterId[];
}

type State = 'intro' | 'wave' | 'between' | 'bossIntro' | 'boss' | 'won' | 'dead' | 'lost';

export class Battle {
  arena: Arena;
  units: Unit[] = [];
  player!: Unit;
  heroDef: HeroDef;
  projectiles: Proj[] = [];
  lobs: Lob[] = [];
  zones: Zone[] = [];
  teles: Tele[] = [];
  pickups: Pickup[] = [];
  private timers: { t: number; fn: () => void }[] = [];
  rng: Rng;
  state: State = 'intro';
  stateT = 0;
  waveIdx = -1;
  pendingSpawns = 0;
  time = 0;
  coins = 0;
  kills = 0;
  revives = 0;
  extraLife = false;
  boss: Unit | null = null;
  bossBrain: BossBrain | null = null;
  heroLevel: number;
  private fx!: Record<string, Phaser.GameObjects.Particles.ParticleEmitter>;
  private aimG: Phaser.GameObjects.Graphics;
  private superRing: Phaser.GameObjects.Image;
  private fog?: Phaser.GameObjects.Image;
  private modT: Record<string, number> = {};
  superWasReady = false;
  coinMult = 1;

  constructor(public scene: Phaser.Scene, public cfg: LevelConfig, public setup: BattleSetup) {
    this.rng = new Rng(cfg.n * 31 + Date.now());
    this.arena = new Arena(scene, cfg);
    this.heroDef = heroById(setup.heroId);
    this.heroLevel = setup.heroLevel;
    this.createFx();
    this.aimG = scene.add.graphics().setDepth(1500);
    this.superRing = scene.add.image(0, 0, 'ring').setDepth(1).setTint(0xffd60a).setAlpha(0);
    this.spawnPlayer();
    if (cfg.mods.includes('fog')) this.createFog();
    if (cfg.mods.includes('frenzy')) this.coinMult = 1.5;
    if (cfg.mods.includes('poison')) this.createPoison();
    scene.events.on('tileDestroyed', (c: number, r: number) => {
      const x = c * TILE + TILE / 2;
      const y = r * TILE + TILE / 2;
      this.burst(x, y, 'debris', 14, Phaser.Display.Color.HexStringToColor(cfg.biome.crateA).color);
      this.burst(x, y, 'smoke', 6, 0xffffff);
      audio.play('crate', { vol: 0.7 });
    });
  }

  /* ------------------------------------------------------------ setup */

  private createFx(): void {
    const s = this.scene;
    const mk = (tex: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig) =>
      s.add.particles(0, 0, tex, { emitting: false, ...cfg }).setDepth(3000);
    this.fx = {
      spark: mk('spark', { speed: { min: 80, max: 320 }, lifespan: 380, scale: { start: 0.9, end: 0 }, blendMode: 'ADD' }),
      smoke: mk('smoke', { speed: { min: 20, max: 90 }, lifespan: 700, scale: { start: 0.6, end: 1.4 }, alpha: { start: 0.55, end: 0 } }),
      debris: mk('debris', { speed: { min: 120, max: 360 }, lifespan: 600, scale: { start: 1, end: 0.3 }, rotate: { min: 0, max: 360 }, gravityY: 600 }),
      star: mk('star4', { speed: { min: 60, max: 200 }, lifespan: 600, scale: { start: 1, end: 0 }, rotate: { min: 0, max: 360 } }),
      fire: mk('soft', { speed: { min: 30, max: 140 }, lifespan: 500, scale: { start: 0.5, end: 0 }, blendMode: 'ADD', tint: [0xff7b00, 0xffba08, 0xd00000] }),
    };
  }

  burst(x: number, y: number, kind: keyof Battle['fx'] | string, count: number, tint?: number): void {
    const e = this.fx[kind];
    if (!e) return;
    if (tint !== undefined) e.particleTint = tint;
    e.explode(count, x, y);
  }

  private spawnPlayer(): void {
    const h = this.heroDef;
    const p = this.arena.freeSpot(this.cfg.player.c, this.cfg.player.r);
    const mult = heroPowerMult(this.heroLevel);
    const attack: AttackSpec = { ...h.attack };
    const u = new Unit(this, {
      kind: 'hero',
      team: 0,
      x: p.x,
      y: p.y,
      r: 26,
      hp: Math.round(h.hp * mult),
      speed: h.speed,
      attack,
      texture: `hero_${this.setup.skinId}`,
      scale: 0.62,
      label: t(`hero_${h.id}`),
      dmgMult: mult,
    });
    u.defId = h.id;
    this.player = u;
    this.units.push(u);
    // Passives from hero level 5.
    if (this.heroLevel >= 5) {
      switch (h.id) {
        case 'rocky': u.dmgTaken = 0.85; break;
        case 'lyra': attack.range *= 1.15; break;
        case 'fuse': attack.radius = (attack.radius ?? 1) + 0.3; break;
        case 'mint': attack.lifesteal = (attack.lifesteal ?? 0) * 1.5; break;
        case 'volt': attack.count = (attack.count ?? 3) + 1; break;
        case 'fang': u.speed *= 1.1; break;
        case 'bolt': u.tag.turretBonus = 4; break;
        case 'kira': attack.burn = (attack.burn ?? 0) * 1.4; break;
        case 'grom': u.tag.stunBonus = 0.5; break;
        case 'shade': u.tag.stealthBonus = 2; break;
      }
    }
    for (const b of this.setup.boosters) {
      switch (b) {
        case 'shield': u.shield = u.maxHp * 0.35; break;
        case 'damage': u.dmgMult *= 1.3; break;
        case 'speed': u.speed *= 1.18; break;
        case 'super': u.superCharge = 1; break;
        case 'life': this.extraLife = true; break;
      }
    }
    if (skinById(this.setup.skinId)?.shiny) {
      this.scene.tweens.add({ targets: u.sprite, alpha: 0.85, duration: 600, yoyo: true, repeat: -1 });
    }
  }

  private createFog(): void {
    const key = 'fogtex';
    if (!this.scene.textures.exists(key)) {
      const size = 2600;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d')!;
      const g = ctx.createRadialGradient(size / 2, size / 2, 200, size / 2, size / 2, 380);
      g.addColorStop(0, 'rgba(8,6,20,0)');
      g.addColorStop(1, 'rgba(8,6,20,0.93)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      this.scene.textures.addCanvas(key, c);
    }
    this.fog = this.scene.add.image(0, 0, key).setDepth(3500);
  }

  private createPoison(): void {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const edge = i % 4;
      const f = (Math.floor(i / 4) + 0.5) / 2;
      const x = edge === 0 ? 0 : edge === 1 ? this.arena.pxW : this.arena.pxW * f;
      const y = edge === 2 ? 0 : edge === 3 ? this.arena.pxH : this.arena.pxH * f;
      const r = TILE * 2.2;
      const img = this.scene.add.image(x, y, 'soft').setDisplaySize(r * 2.4, r * 2.4).setTint(0x80ff72).setAlpha(0.55).setDepth(2900);
      this.scene.tweens.add({ targets: img, alpha: 0.35, duration: 1200, yoyo: true, repeat: -1 });
      this.addZone({
        x, y, r, dur: 1e9, team: -1, gfx: img, tickEvery: 0.5,
        tick: (z) => this.unitsIn(z.x, z.y, z.r, -1).forEach((u) => this.damage(u, u.maxHp * 0.05, null, { noCharge: true })),
      });
    }
  }

  /* ------------------------------------------------------------ helpers */

  later(t: number, fn: () => void): void {
    this.timers.push({ t, fn });
  }

  enemiesOf(team: Team): Unit[] {
    return this.units.filter((u) => u.alive && u.team !== team);
  }

  /** Units of opposing team (or all if team -1) inside circle. */
  unitsIn(x: number, y: number, r: number, team: Team | -1): Unit[] {
    return this.units.filter((u) => u.alive && (team === -1 || u.team !== team) && Math.hypot(u.x - x, u.y - y) < r + u.r);
  }

  floatText(x: number, y: number, text: string, color: string, size = 22): void {
    const tx = this.scene.add
      .text(x + (Math.random() - 0.5) * 20, y, text, { fontFamily: 'Trebuchet MS, Arial Black, sans-serif', fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#1b1530', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(4000);
    this.scene.tweens.add({ targets: tx, y: y - 46, alpha: { from: 1, to: 0 }, scale: { from: 1.25, to: 0.9 }, duration: 750, ease: 'Cubic.Out', onComplete: () => tx.destroy() });
  }

  shake(ms = 120, k = 0.006): void {
    this.scene.cameras.main.shake(ms, k);
  }

  shockwave(x: number, y: number, radius: number, color: number): void {
    const img = this.scene.add.image(x, y, 'ring').setTint(color).setDepth(2800).setScale(0.1);
    this.scene.tweens.add({ targets: img, scale: (radius * 2) / 128, alpha: { from: 1, to: 0 }, duration: 320, ease: 'Cubic.Out', onComplete: () => img.destroy() });
  }

  lightning(x1: number, y1: number, x2: number, y2: number, color = 0x9be7ff): void {
    const g = this.scene.add.graphics().setDepth(2700);
    const draw = (w: number, c: number) => {
      g.lineStyle(w, c, 1);
      g.beginPath();
      g.moveTo(x1, y1);
      const n = 7;
      for (let i = 1; i < n; i++) {
        const k = i / n;
        g.lineTo(x1 + (x2 - x1) * k + (Math.random() - 0.5) * 22, y1 + (y2 - y1) * k + (Math.random() - 0.5) * 22);
      }
      g.lineTo(x2, y2);
      g.strokePath();
    };
    draw(9, color);
    draw(3, 0xffffff);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
  }

  addZone(z: Omit<Zone, 't' | 'tickAcc'>): Zone {
    const zone: Zone = { ...z, t: 0, tickAcc: 0 };
    this.zones.push(zone);
    return zone;
  }

  /** Telegraph a circle on the ground, then call done(). */
  teleCircle(x: number, y: number, r: number, dur: number, color: number, done: () => void, owner?: Unit): void {
    const g = this.scene.add.graphics().setDepth(2);
    this.teles.push({
      t: 0, dur, gfx: g, owner, done,
      draw: (gg, p) => {
        gg.clear();
        gg.fillStyle(color, 0.18).fillCircle(x, y, r);
        gg.lineStyle(3, color, 0.9).strokeCircle(x, y, r);
        gg.fillStyle(color, 0.35).fillCircle(x, y, r * p);
      },
    });
  }

  teleLine(x: number, y: number, ang: number, len: number, width: number, dur: number, color: number, done: () => void, owner?: Unit): void {
    const g = this.scene.add.graphics().setDepth(2);
    this.teles.push({
      t: 0, dur, gfx: g, owner, done,
      draw: (gg, p) => {
        gg.clear();
        const ox = owner ? owner.x : x;
        const oy = owner ? owner.y : y;
        const ex = ox + Math.cos(ang) * len;
        const ey = oy + Math.sin(ang) * len;
        gg.lineStyle(width, color, 0.18).lineBetween(ox, oy, ex, ey);
        gg.lineStyle(width * p, color, 0.45).lineBetween(ox, oy, ox + (ex - ox) * p, oy + (ey - oy) * p);
      },
    });
  }

  /* ------------------------------------------------------------ projectiles */

  shoot(src: Unit | null, team: Team, x: number, y: number, ang: number, o: Partial<Proj> & { tex: string; speed: number; range: number; dmg: number; r?: number; scale?: number }): Proj {
    const img = this.scene.add.image(x, y - 18, o.tex).setDepth(2500).setRotation(ang).setScale(o.scale ?? 1);
    const p: Proj = {
      x, y,
      vx: Math.cos(ang) * o.speed,
      vy: Math.sin(ang) * o.speed,
      range: o.range,
      r: o.r ?? 8,
      dmg: o.dmg,
      team, src,
      pierce: o.pierce ?? false,
      hitIds: new Set(),
      img,
      charge: o.charge ?? 0,
      burn: o.burn, stun: o.stun, slow: o.slow, lifesteal: o.lifesteal, breakWalls: o.breakWalls, spin: o.spin, grow: o.grow,
    };
    this.projectiles.push(p);
    return p;
  }

  lob(sx: number, sy: number, tx: number, ty: number, tex: string, radius: number, color: number, onLand: (x: number, y: number) => void, durMul = 1): void {
    const dist = Math.hypot(tx - sx, ty - sy);
    const dur = (0.45 + dist / 1400) * durMul;
    const img = this.scene.add.image(sx, sy, tex).setDepth(2600);
    const shadow = this.scene.add.image(sx, sy, 'shadow').setDisplaySize(30, 12).setDepth(3);
    const marker = this.scene.add.graphics().setDepth(2);
    marker.lineStyle(3, color, 0.8).strokeCircle(tx, ty, radius).fillStyle(color, 0.15).fillCircle(tx, ty, radius);
    this.lobs.push({ sx, sy, tx, ty, t: 0, dur, arc: 90 + dist * 0.25, img, shadow, marker, radius, onLand });
  }

  /** Explosion damaging opposing units (and crates) in radius. */
  explode(x: number, y: number, radius: number, dmg: number, src: Unit | null, team: Team | -1, o: { charge?: number; breakWalls?: boolean; stun?: number; color?: number; crateDmg?: number } = {}): number {
    audio.play('explosion', { vol: 0.6 });
    this.shockwave(x, y, radius, o.color ?? 0xffd166);
    this.burst(x, y, 'fire', 18);
    this.burst(x, y, 'smoke', 8, 0x999999);
    this.shake(140, 0.006);
    let hits = 0;
    for (const u of this.unitsIn(x, y, radius, team)) {
      hits++;
      this.damage(u, dmg, src, { charge: o.charge ?? 0, stun: o.stun });
    }
    const c0 = Math.floor((x - radius) / TILE);
    const c1 = Math.floor((x + radius) / TILE);
    const r0 = Math.floor((y - radius) / TILE);
    const r1 = Math.floor((y + radius) / TILE);
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        const cx = c * TILE + TILE / 2;
        const cy = r * TILE + TILE / 2;
        if (Math.hypot(cx - x, cy - y) > radius + TILE * 0.3) continue;
        if (o.breakWalls) this.arena.destroyTile(c, r);
        else this.arena.damageTile(c, r, o.crateDmg ?? dmg * 0.6);
      }
    return hits;
  }

  /* ------------------------------------------------------------ damage */

  damage(
    u: Unit,
    amount: number,
    src: Unit | null,
    o: { charge?: number; silent?: boolean; noCharge?: boolean; stun?: number; burn?: number; slow?: number; lifesteal?: number; knock?: number; kx?: number; ky?: number } = {},
  ): void {
    if (!u.alive || amount <= 0) return;
    if (u.tag.invuln > 0) return;
    amount *= u.dmgTaken;
    if (u.shield > 0) {
      const a = Math.min(u.shield, amount);
      u.shield -= a;
      amount -= a;
    }
    u.hp -= amount;
    u.sinceHurt = 0;
    if (!o.silent) {
      u.flash();
      const shown = Math.round(amount);
      if (shown > 0) {
        if (u.team === 0 && u.kind === 'hero') this.floatText(u.x, u.y - u.r * 2.6, `-${shown}`, '#ff5c5c');
        else if (src && src.team === 0) this.floatText(u.x, u.y - u.r * 2.6, `${shown}`, '#ffffff');
      }
      if (u.kind === 'hero') audio.play('hurt', { vol: 0.6, throttleMs: 120 });
      else audio.play('hit', { vol: 0.5, throttleMs: 60 });
    }
    if (src && src.kind === 'hero' && src.team !== u.team && !o.noCharge && o.charge) {
      const mul = this.cfg.mods.includes('supercharge') ? 2 : 1;
      src.superCharge = Math.min(1, src.superCharge + o.charge * mul);
    }
    if (src && o.lifesteal) src.heal(o.lifesteal);
    if (o.stun) u.stun = Math.max(u.stun, u.kind === 'boss' ? o.stun * 0.4 : o.stun);
    if (o.burn) {
      u.burnDps = o.burn / 3;
      u.burnT = 3;
      u.burnSrc = src;
    }
    if (o.slow) {
      u.slowT = 1.5;
      u.slowAmt = o.slow;
    }
    if (o.knock && u.kind !== 'boss' && u.kind !== 'turret') {
      const res = this.arena.move(u.x, u.y, u.r, (o.kx ?? 0) * o.knock, (o.ky ?? 0) * o.knock);
      u.x = res.x;
      u.y = res.y;
    }
    if (u.hp <= 0) this.kill(u, src);
  }

  kill(u: Unit, src: Unit | null): void {
    if (!u.alive) return;
    u.alive = false;
    u.hp = 0;
    this.burst(u.x, u.y - 20, 'star', 10, u.team === 0 ? 0x80ed99 : 0xffd166);
    this.burst(u.x, u.y - 10, 'smoke', 8, 0xffffff);
    if (u.kind === 'hero') {
      audio.play('defeat', { vol: 0.5 });
      u.root.setVisible(false);
      this.onPlayerDown();
      return;
    }
    audio.play('enemyDie', { vol: 0.6 });
    this.scene.tweens.add({ targets: u.root, alpha: 0, scale: 0.4, duration: 200, onComplete: () => u.destroy() });
    if (u.team === 1 && u.kind === 'enemy') {
      this.kills++;
      const def = enemyById(u.defId);
      for (let i = 0; i < def.coin; i++) this.dropPickup(u.x, u.y, 'coin', 1);
      if (this.rng.chance(0.08)) this.dropPickup(u.x, u.y, 'heart', 0.25);
    }
    if (u.kind === 'boss') {
      this.onBossDown(u);
    }
    void src;
  }

  private onPlayerDown(): void {
    this.state = 'dead';
    this.stateT = 0;
    if (this.extraLife) {
      this.extraLife = false;
      this.later(1.0, () => this.revive(true));
    } else {
      this.scene.events.emit('playerDown', this.revives === 0);
    }
  }

  revive(free = false): void {
    const p = this.player;
    p.alive = true;
    p.hp = p.maxHp * (free ? 0.7 : 1);
    p.superCharge = 1;
    p.ammo = p.maxAmmo;
    p.root.setVisible(true).setAlpha(1).setScale(1);
    p.tag.invuln = 2.5;
    if (!free) this.revives++;
    audio.play('revive');
    this.shockwave(p.x, p.y, TILE * 3, 0x80ed99);
    for (const e of this.unitsIn(p.x, p.y, TILE * 3, 0)) {
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      this.damage(e, 1, null, { silent: true, knock: 90, kx: Math.cos(a), ky: Math.sin(a) });
    }
    this.state = this.boss ? 'boss' : 'wave';
  }

  giveUp(): void {
    this.state = 'lost';
    this.scene.events.emit('battleEnd', false);
  }

  private onBossDown(b: Unit): void {
    audio.play('victory');
    this.shake(500, 0.012);
    for (let i = 0; i < 12; i++) this.dropPickup(b.x, b.y, 'coin', 1);
    for (let i = 0; i < 5; i++) this.later(i * 0.15, () => this.burst(b.x + (Math.random() - 0.5) * 120, b.y - 40 + (Math.random() - 0.5) * 100, 'fire', 20));
    // Remaining minions flee/explode.
    for (const e of this.units) if (e.team === 1 && e.alive && e !== b) this.later(0.3, () => this.kill(e, null));
    this.state = 'won';
    this.stateT = 0;
  }

  dropPickup(x: number, y: number, kind: Pickup['kind'], value: number): void {
    const img = this.scene.add.image(x, y, `pk_${kind}`).setDepth(y);
    const ang = Math.random() * Math.PI * 2;
    const d = 20 + Math.random() * 40;
    const tx = x + Math.cos(ang) * d;
    const ty = y + Math.sin(ang) * d;
    this.scene.tweens.add({ targets: img, x: tx, y: ty, duration: 350, ease: 'Quad.Out' });
    this.scene.tweens.add({ targets: img, scale: { from: 0.3, to: kind === 'coin' ? 0.8 : 1 }, duration: 350, ease: 'Back.Out' });
    this.pickups.push({ x: tx, y: ty, kind, value, img, age: 0 });
  }

  /* ------------------------------------------------------------ waves */

  private spawnEnemy(id: string, x: number, y: number, extra: Partial<{ minion: boolean }> = {}): Unit {
    const d = enemyById(id);
    const df = this.cfg.diff;
    const frenzy = this.cfg.mods.includes('frenzy');
    const attack: AttackSpec = { ...d.attack, reload: d.attack.reload * df.fireRate * (frenzy ? 0.78 : 1) };
    const u = new Unit(this, {
      kind: 'enemy',
      team: 1,
      x, y,
      r: d.radius,
      hp: Math.round(d.hp * df.hp * (extra.minion ? 0.8 : 1)),
      speed: d.speed * df.speed * (frenzy ? 1.1 : 1),
      attack,
      texture: `enemy_${id}`,
      scale: (d.radius / 24) * 0.62,
      dmgMult: df.dmg,
    });
    u.defId = id;
    u.ammo = 1 + Math.floor(Math.random() * 2);
    u.tag.think = Math.random() * 0.3;
    this.units.push(u);
    return u;
  }

  /** Spawn with a portal telegraph. */
  spawnWithPortal(id: string, x: number, y: number, minion = false, delay = 0): void {
    this.pendingSpawns++;
    this.later(delay, () => {
      const ring = this.scene.add.image(x, y, 'ring').setTint(0xb5179e).setScale(0.1).setDepth(1);
      this.scene.tweens.add({ targets: ring, scale: 0.7, angle: 180, duration: 700, ease: 'Back.Out' });
      audio.play('spawn', { vol: 0.35, throttleMs: 150 });
      this.later(0.8, () => {
        ring.destroy();
        this.pendingSpawns--;
        if (this.state === 'won' || this.state === 'lost') return;
        this.burst(x, y, 'star', 8, 0xc77dff);
        this.spawnEnemy(id, x, y, { minion });
      });
    });
  }

  private startWave(i: number): void {
    this.waveIdx = i;
    this.state = 'wave';
    audio.play('wave', { vol: 0.5 });
    this.scene.events.emit('banner', t('wave', { n: i + 1, m: this.cfg.waves.length }), '#ffd166');
    const list = this.cfg.waves[i];
    const spawns = this.rng.shuffle(this.cfg.spawns.slice());
    list.forEach((id, k) => {
      const sp = spawns[k % spawns.length];
      const pos = this.arena.freeSpot(sp.c, sp.r);
      const jitter = k >= spawns.length ? 40 : 0;
      this.spawnWithPortal(id, pos.x + (Math.random() - 0.5) * jitter, pos.y + (Math.random() - 0.5) * jitter, false, k * 0.3);
    });
  }

  private startBoss(): void {
    this.state = 'bossIntro';
    this.stateT = 0;
    audio.playMusic('boss', this.cfg.biome.transpose);
    audio.play('bossRoar');
    this.scene.events.emit('banner', t('bossIncoming'), '#ff4d6d');
    const pos = this.arena.freeSpot(this.cfg.bossSpawn.c, this.cfg.bossSpawn.r);
    // Clear space around boss spawn.
    const bc = Math.floor(pos.x / TILE);
    const br = Math.floor(pos.y / TILE);
    this.teleCircle(pos.x, pos.y, TILE * 1.6, 1.8, 0xff006e, () => {
      for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) this.arena.destroyTile(bc + dc, br + dr);
      const bd = BOSSES[this.cfg.boss];
      const df = this.cfg.diff;
      const tier = this.cfg.bossTier;
      const u = new Unit(this, {
        kind: 'boss',
        team: 1,
        x: pos.x,
        y: pos.y,
        r: bd.radius,
        hp: Math.round(bd.hp * df.hp * (1 + tier * 0.3)),
        speed: bd.speed * df.speed,
        attack: { kind: 'shot', dmg: 0, range: 0, reload: 1, sfx: '', charge: 0 },
        texture: `boss_${bd.id}`,
        scale: 0.75,
        dmgMult: df.dmg * (1 + tier * 0.12),
      });
      u.defId = bd.id;
      this.units.push(u);
      this.boss = u;
      this.bossBrain = new BossBrain(this, u, bd.id, tier);
      this.shake(400, 0.01);
      this.shockwave(pos.x, pos.y, TILE * 3, 0xff006e);
      this.state = 'boss';
      this.scene.events.emit('bossSpawn', t(`boss_${bd.id}`));
    });
  }

  /* ------------------------------------------------------------ main loop */

  update(dt: number, input: InputState): void {
    this.time += dt;
    this.stateT += dt;
    // Timers.
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const tm = this.timers[i];
      tm.t -= dt;
      if (tm.t <= 0) {
        this.timers.splice(i, 1);
        tm.fn();
      }
    }
    const p = this.player;
    if (p.tag.invuln > 0) {
      p.sprite.setAlpha(p.tag.invuln > dt && Math.sin(this.time * 30) > 0 ? 0.4 : 1);
    }

    this.updateFlow(dt);
    this.updateState();
    if (p.alive) this.updatePlayer(dt, input);
    this.drawAim(input);

    for (const u of this.units) {
      if (!u.alive) continue;
      u.update(dt);
      if (u.dash) this.updateDash(u, dt);
      else if (u !== p && u.stun <= 0) {
        if (u.kind === 'boss') this.bossBrain?.update(dt);
        else updateBrain(this, u, dt);
      }
    }
    this.separate();
    this.updateProjectiles(dt);
    this.updateLobs(dt);
    this.updateZones(dt);
    this.updateTeles(dt);
    this.updatePickups(dt);
    this.updateMods(dt);
    this.units = this.units.filter((u) => u.alive || u === p);
    for (const u of this.units) if (u.alive) u.syncVisual(dt, 0, p);
    if (this.fog) this.fog.setPosition(p.x, p.y);

    // Super ready ring.
    const ready = p.superCharge >= 1 && p.alive;
    this.superRing.setPosition(p.x, p.y + p.r * 0.35).setAlpha(ready ? 0.5 + Math.sin(this.time * 6) * 0.25 : 0).setDisplaySize(p.r * 3.4, p.r * 1.5);
    if (ready && !this.superWasReady) {
      audio.play('superReady', { vol: 0.6 });
      this.scene.events.emit('superReady');
    }
    this.superWasReady = ready;
  }

  private updateFlow(dt: number): void {
    const p = this.player;
    this.arena.updateFlow(p.x, p.y, dt);
  }

  private updateState(): void {
    const enemiesAlive = this.units.some((u) => u.alive && u.team === 1);
    switch (this.state) {
      case 'intro':
        if (this.stateT > 1.4) this.startWave(0);
        break;
      case 'wave':
        if (!enemiesAlive && this.pendingSpawns === 0) {
          this.state = 'between';
          this.stateT = 0;
        }
        break;
      case 'between':
        if (this.stateT > 1.6) {
          if (this.waveIdx + 1 < this.cfg.waves.length) this.startWave(this.waveIdx + 1);
          else this.startBoss();
        }
        break;
      case 'won':
        // Pull all coins to the player, then finish.
        if (this.stateT > 2.6) {
          this.state = 'lost'; // terminal guard
          this.scene.events.emit('battleEnd', true);
        }
        break;
    }
  }

  private updatePlayer(dt: number, input: InputState): void {
    const p = this.player;
    if (p.dash || this.state === 'won') {
      p.moving = false;
      return;
    }
    if (p.stun <= 0) {
      const len = Math.hypot(input.mx, input.my);
      if (len > 0.05) {
        const k = Math.min(1, len);
        const res = this.arena.move(p.x, p.y, p.r, (input.mx / len) * k * p.speedNow * dt, (input.my / len) * k * p.speedNow * dt);
        p.x = res.x;
        p.y = res.y;
        p.moving = true;
        p.tag.vx = (input.mx / len) * k * p.speedNow;
        p.tag.vy = (input.my / len) * k * p.speedNow;
        if (Math.abs(input.mx) > 0.1) p.facing = input.mx > 0 ? 1 : -1;
      } else {
        p.moving = false;
        p.tag.vx = 0;
        p.tag.vy = 0;
      }
      if (input.fire) this.playerFire(input.fire.angle, input.fire.mag, false);
      if (input.superFire) this.playerFire(input.superFire.angle, input.superFire.mag, true);
    } else p.moving = false;
    input.fire = null;
    input.superFire = null;
  }

  /** Nearest visible enemy for auto-aim. */
  autoTarget(from: Unit, range: number): Unit | null {
    let best: Unit | null = null;
    let bd = 1e9;
    for (const e of this.units) {
      if (!e.alive || e.team === from.team || !e.visibleFrom(from.x, from.y)) continue;
      let d = Math.hypot(e.x - from.x, e.y - from.y);
      if (d > range * 1.6) continue;
      if (!this.arena.lineOfSight(from.x, from.y, e.x, e.y)) d *= 1.6;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  private playerFire(angle: number | null, mag: number, isSuper: boolean): void {
    const p = this.player;
    if (isSuper ? p.superCharge < 1 : p.ammo < 1 || p.fireCd > 0) {
      if (!isSuper && p.ammo < 1) audio.play('click', { vol: 0.3, throttleMs: 200 });
      return;
    }
    const range = isSuper ? this.heroDef.super.range : p.attack.range;
    if (angle === null) {
      const tg = this.autoTarget(p, range * TILE);
      if (tg) {
        angle = Math.atan2(tg.y - p.y, tg.x - p.x);
        mag = Math.min(1, Math.hypot(tg.x - p.x, tg.y - p.y) / Math.max(1, range * TILE));
      } else {
        angle = p.facing > 0 ? 0 : Math.PI;
        mag = 1;
      }
    }
    p.facing = Math.cos(angle) >= 0 ? 1 : -1;
    p.sinceAttack = 0;
    p.revealT = 1.2;
    if (isSuper) {
      p.superCharge = 0;
      castSuper(this, p, this.heroDef.super, angle, mag);
      this.scene.events.emit('superUsed');
    } else {
      p.ammo--;
      p.fireCd = 0.28;
      fireAttack(this, p, p.attack, angle, mag);
    }
  }

  private drawAim(input: InputState): void {
    const g = this.aimG;
    g.clear();
    const p = this.player;
    if (!p.alive || !input.aim.active) return;
    const isSuper = input.aim.isSuper;
    const spec = this.heroDef;
    const a = input.aim.angle;
    const color = isSuper ? 0xffd60a : 0xffffff;
    const kind = isSuper ? spec.super.kind : spec.attack.kind;
    const range = (isSuper ? spec.super.range : p.attack.range) * TILE;
    const alpha = 0.35;
    if (kind === 'quake' || kind === 'stealth') {
      const r = (spec.super.radius ?? 1.5) * TILE;
      g.fillStyle(color, 0.2).fillCircle(p.x, p.y, r);
      g.lineStyle(3, color, 0.6).strokeCircle(p.x, p.y, r);
      return;
    }
    if (['lob', 'megabomb', 'healzone', 'stunfield', 'turret'].includes(kind)) {
      const d = Math.max(TILE, range * input.aim.mag);
      const r = (kind === 'turret' ? 0.6 : (isSuper ? spec.super.radius : p.attack.radius) ?? 1) * TILE;
      const tx = p.x + Math.cos(a) * d;
      const ty = p.y + Math.sin(a) * d;
      g.fillStyle(color, alpha * 0.6).fillCircle(tx, ty, r);
      g.lineStyle(3, color, 0.8).strokeCircle(tx, ty, r);
      g.lineStyle(2, color, 0.3).lineBetween(p.x, p.y, tx, ty);
      return;
    }
    if (kind === 'slam') {
      const r = (p.attack.radius ?? 1) * TILE;
      g.fillStyle(color, alpha).fillCircle(p.x + Math.cos(a) * range * 0.75, p.y + Math.sin(a) * range * 0.75, r);
      return;
    }
    const spread = !isSuper ? (p.attack.spread ?? 0) : 0;
    if (spread > 0.2) {
      g.fillStyle(color, alpha * 0.7);
      g.slice(p.x, p.y, range, a - spread / 2, a + spread / 2, false).fillPath();
      return;
    }
    const w = isSuper ? 36 : 22;
    g.lineStyle(w, color, alpha * 0.7).lineBetween(p.x, p.y, p.x + Math.cos(a) * range, p.y + Math.sin(a) * range);
  }

  private updateDash(u: Unit, dt: number): void {
    const d = u.dash!;
    d.t -= dt;
    const res = this.arena.move(u.x, u.y, u.r, d.vx * dt, d.vy * dt);
    if (d.breakWalls) {
      const c = Math.floor((u.x + Math.sign(d.vx) * u.r) / TILE);
      const r = Math.floor((u.y + Math.sign(d.vy) * u.r) / TILE);
      for (const [cc, rr] of [
        [c, Math.floor(u.y / TILE)],
        [Math.floor(u.x / TILE), r],
        [c, r],
      ])
        this.arena.destroyTile(cc, rr);
    }
    u.x = res.x;
    u.y = res.y;
    u.moving = true;
    if (d.dmg > 0) {
      for (const e of this.unitsIn(u.x, u.y, u.r + 10, u.team)) {
        if (d.hitIds.has(e.id)) continue;
        d.hitIds.add(e.id);
        const len = Math.hypot(d.vx, d.vy) || 1;
        this.damage(e, d.dmg, u, { knock: u.kind === 'hero' ? 70 : 50, kx: d.vx / len, ky: d.vy / len, charge: 0 });
        this.burst(e.x, e.y - 20, 'spark', 8, 0xffffff);
      }
    }
    if (u.kind === 'hero' && Math.random() < 0.6) this.burst(u.x, u.y, 'smoke', 1, 0xdddddd);
    if (d.t <= 0 || (res.hit && !d.breakWalls)) {
      u.dash = null;
      u.dmgTaken = u.tag.baseDmgTaken ?? u.dmgTaken;
    }
  }

  /** Simple circle separation between units. */
  private separate(): void {
    const list = this.units;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b.alive) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = (a.r + b.r) * 0.8;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 < min * min) {
          const d = Math.sqrt(d2);
          const push = (min - d) / 2;
          const nx = dx / d;
          const ny = dy / d;
          const wa = a.kind === 'boss' || a.kind === 'turret' ? 0 : b.kind === 'boss' || b.kind === 'turret' ? 1 : 0.5;
          const ra = this.arena.move(a.x, a.y, a.r, -nx * push * 2 * wa, -ny * push * 2 * wa);
          a.x = ra.x;
          a.y = ra.y;
          const rb = this.arena.move(b.x, b.y, b.r, nx * push * 2 * (1 - wa), ny * push * 2 * (1 - wa));
          b.x = rb.x;
          b.y = rb.y;
        }
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (p.dead) continue;
      const step = Math.hypot(p.vx, p.vy) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.range -= step;
      p.img.setPosition(p.x, p.y - 18);
      if (p.spin) p.img.rotation += p.spin * dt;
      if (p.grow) p.img.setScale(p.img.scale + p.grow * dt);
      const c = Math.floor(p.x / TILE);
      const r = Math.floor(p.y / TILE);
      if (p.x < 0 || p.y < 0 || p.x > this.arena.pxW || p.y > this.arena.pxH) p.dead = true;
      else if (this.arena.blocksShot(c, r)) {
        if (p.breakWalls) this.arena.destroyTile(c, r);
        else {
          this.arena.damageTile(c, r, p.dmg * 0.6);
          this.burst(p.x, p.y, 'spark', 4, 0xffffff);
          p.dead = true;
        }
      }
      if (!p.dead) {
        for (const u of this.units) {
          if (!u.alive || u.team === p.team || p.hitIds.has(u.id)) continue;
          if (u.tag.invuln > 0) continue;
          if (Math.hypot(u.x - p.x, u.y - (p.y + 0)) < u.r + p.r) {
            p.hitIds.add(u.id);
            this.damage(u, p.dmg, p.src, { charge: p.charge, burn: p.burn, stun: p.stun, slow: p.slow, lifesteal: p.lifesteal, knock: 6, kx: p.vx / Math.hypot(p.vx, p.vy), ky: p.vy / Math.hypot(p.vx, p.vy) });
            this.burst(p.x, p.y, 'spark', 5, p.team === 0 ? 0xfff3b0 : 0xff8fa3);
            if (!p.pierce) {
              p.dead = true;
              break;
            }
          }
        }
      }
      if (p.range <= 0) p.dead = true;
      if (p.dead) {
        const img = p.img;
        this.scene.tweens.add({ targets: img, alpha: 0, scale: img.scale * 0.5, duration: 80, onComplete: () => img.destroy() });
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  private updateLobs(dt: number): void {
    for (const l of this.lobs) {
      l.t += dt;
      const k = Math.min(1, l.t / l.dur);
      const x = l.sx + (l.tx - l.sx) * k;
      const y = l.sy + (l.ty - l.sy) * k;
      const h = Math.sin(k * Math.PI) * l.arc;
      l.img.setPosition(x, y - h).setRotation(l.t * 8);
      l.shadow.setPosition(x, y);
      if (k >= 1) {
        l.img.destroy();
        l.shadow.destroy();
        l.marker.destroy();
        l.onLand(l.tx, l.ty);
      }
    }
    this.lobs = this.lobs.filter((l) => l.t < l.dur);
  }

  private updateZones(dt: number): void {
    for (const z of this.zones) {
      z.t += dt;
      if (z.follow) {
        z.x = z.follow.x;
        z.y = z.follow.y;
      }
      if (z.vx || z.vy) {
        z.x += (z.vx ?? 0) * dt;
        z.y += (z.vy ?? 0) * dt;
        (z.gfx as any).setPosition?.(z.x, z.y);
      }
      z.tickAcc += dt;
      if (z.tickAcc >= z.tickEvery) {
        z.tickAcc -= z.tickEvery;
        z.tick(z);
      }
      if (z.t >= z.dur) {
        const gfx = z.gfx as any;
        this.scene.tweens.add({ targets: gfx, alpha: 0, duration: 250, onComplete: () => gfx.destroy() });
      }
    }
    this.zones = this.zones.filter((z) => z.t < z.dur);
  }

  private updateTeles(dt: number): void {
    for (const tl of this.teles) {
      tl.t += dt;
      if (tl.owner && !tl.owner.alive) {
        tl.t = tl.dur + 1;
        tl.gfx.destroy();
        continue;
      }
      tl.draw(tl.gfx, Math.min(1, tl.t / tl.dur));
      if (tl.t >= tl.dur) {
        tl.gfx.destroy();
        tl.done();
      }
    }
    this.teles = this.teles.filter((tl) => tl.t < tl.dur);
  }

  private updatePickups(dt: number): void {
    const p = this.player;
    for (const k of this.pickups) {
      k.age += dt;
      k.img.setDepth(k.y);
      if (!p.alive || k.age < 0.45) continue;
      const d = Math.hypot(p.x - k.x, p.y - k.y);
      const magnet = k.kind === 'coin' || this.state === 'won';
      if (magnet && (d < TILE * 3.5 || this.state === 'won' || this.state === 'between')) {
        const sp = Math.max(500, 1400 - d) * dt;
        k.x += ((p.x - k.x) / (d || 1)) * Math.min(sp, d);
        k.y += ((p.y - k.y) / (d || 1)) * Math.min(sp, d);
        k.img.setPosition(k.x, k.y);
      }
      if (d < p.r + 18) {
        k.age = -999;
        k.img.destroy();
        if (k.kind === 'coin') {
          this.coins += k.value;
          audio.play('coin', { vol: 0.35, throttleMs: 40 });
          this.scene.events.emit('coin', this.coins);
        } else {
          p.heal(p.maxHp * (k.kind === 'shroom' ? 0.35 : k.value));
          audio.play('heal', { vol: 0.6 });
          this.burst(p.x, p.y - 20, 'star', 8, 0x80ed99);
        }
      }
    }
    this.pickups = this.pickups.filter((k) => k.age >= 0);
  }

  private updateMods(dt: number): void {
    if (this.state === 'won' || this.state === 'dead' || this.state === 'intro') return;
    const m = this.cfg.mods;
    const tick = (id: string, every: number, fn: () => void) => {
      this.modT[id] = (this.modT[id] ?? every * 0.6) - dt;
      if (this.modT[id] <= 0) {
        this.modT[id] = every * (0.8 + Math.random() * 0.4);
        fn();
      }
    };
    if (m.includes('meteors'))
      tick('meteors', 3.2, () => {
        const p = this.player;
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * TILE * 5;
        const x = Phaser.Math.Clamp(p.x + Math.cos(a) * d, TILE, this.arena.pxW - TILE);
        const y = Phaser.Math.Clamp(p.y + Math.sin(a) * d, TILE, this.arena.pxH - TILE);
        const r = TILE * 1.3;
        this.teleCircle(x, y, r, 1.3, 0xff7b00, () => {
          const rock = this.scene.add.image(x, y - 500, 'b_rock').setScale(1.4).setDepth(3000);
          this.scene.tweens.add({
            targets: rock, y, duration: 160,
            onComplete: () => {
              rock.destroy();
              this.explode(x, y, r, 900 * this.cfg.diff.dmg, null, -1, { color: 0xff7b00 });
            },
          });
        });
      });
    if (m.includes('shrooms'))
      tick('shrooms', 11, () => {
        if (this.pickups.filter((k) => k.kind === 'shroom').length >= 3) return;
        const pos = this.arena.randomFree(() => Math.random());
        this.dropPickup(pos.x, pos.y, 'shroom', 0.35);
      });
  }

  destroy(): void {
    this.scene.events.off('tileDestroyed');
  }
}
