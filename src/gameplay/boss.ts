import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { BOSSES, type BossId } from '../data/enemies';
import { TILE } from '../data/types';
import { steer } from './ai';
import type { Battle } from './battle';
import { Unit } from './unit';

interface Pattern {
  name: string;
  weight: number;
  minTier: number;
  /** Runs the move; returns seconds the boss is busy. */
  run: () => number;
}

export class BossBrain {
  private cd = 1.6;
  private busy = 0;
  private last = '';
  private phase2 = false;
  private contactT = 0;
  private orbit = 1;
  private orbitT = 2;
  private patterns: Pattern[];
  private keepDist: number;

  constructor(private b: Battle, private u: Unit, private id: BossId, private tier: number) {
    this.patterns = this.build();
    this.keepDist = { golem: 0, slime: 0, wasp: 4, mech: 5, pyro: 4, phantom: 5 }[id] * TILE;
  }

  private get p(): Unit {
    return this.b.player;
  }

  private d(x: number): number {
    return x * this.u.dmgMult;
  }

  private angToPlayer(): number {
    return Math.atan2(this.p.y - this.u.y, this.p.x - this.u.x);
  }

  private extra(): number {
    return Math.min(6, this.tier * 2);
  }

  update(dt: number): void {
    const u = this.u;
    const p = this.p;
    if (!this.phase2 && u.hp < u.maxHp * 0.5) {
      this.phase2 = true;
      u.speed *= 1.15;
      audio.play('bossRoar', { vol: 0.8 });
      this.b.shake(300, 0.01);
      this.b.scene.events.emit('banner', '!!!', '#ff4d6d');
      u.sprite.setTint(0xffb3c1);
      this.b.scene.time.delayedCall(300, () => u.sprite.clearTint());
    }
    // Contact damage.
    this.contactT -= dt;
    if (p.alive && this.contactT <= 0 && Math.hypot(p.x - u.x, p.y - u.y) < u.r + p.r) {
      this.contactT = 0.7;
      const a = this.angToPlayer();
      this.b.damage(p, this.d(BOSSES[this.id].contact), u, { knock: 60, kx: Math.cos(a), ky: Math.sin(a) });
    }
    if (this.busy > 0) {
      this.busy -= dt;
      return;
    }
    if (p.alive) this.move(dt);
    this.cd -= dt;
    if (this.cd <= 0 && p.alive) {
      const avail = this.patterns.filter((pt) => pt.minTier <= this.tier && pt.name !== this.last);
      const total = avail.reduce((s, pt) => s + pt.weight, 0);
      let r = Math.random() * total;
      let pick = avail[0];
      for (const pt of avail) {
        r -= pt.weight;
        if (r <= 0) {
          pick = pt;
          break;
        }
      }
      this.last = pick.name;
      this.busy = pick.run();
      this.cd = (1.3 + Math.random() * 0.8) * (this.phase2 ? 0.7 : 1);
    }
  }

  private move(dt: number): void {
    const u = this.u;
    const p = this.p;
    const dx = p.x - u.x;
    const dy = p.y - u.y;
    const dist = Math.hypot(dx, dy);
    if (Math.abs(dx) > 4) u.facing = dx > 0 ? 1 : -1;
    if (this.keepDist <= 0) {
      const fd = this.b.arena.lineOfSight(u.x, u.y, p.x, p.y) ? null : this.b.arena.flowDir(u.x, u.y);
      if (fd) steer(this.b, u, fd.x, fd.y, dt);
      else steer(this.b, u, dx, dy, dt);
      return;
    }
    this.orbitT -= dt;
    if (this.orbitT <= 0) {
      this.orbitT = 1.5 + Math.random() * 2;
      this.orbit *= -1;
    }
    if (dist > this.keepDist + TILE) {
      const fd = this.b.arena.lineOfSight(u.x, u.y, p.x, p.y) ? null : this.b.arena.flowDir(u.x, u.y);
      if (fd) steer(this.b, u, fd.x, fd.y, dt);
      else steer(this.b, u, dx, dy, dt);
    } else if (dist < this.keepDist - TILE) steer(this.b, u, -dx, -dy, dt, 0.8);
    else steer(this.b, u, -dy * this.orbit, dx * this.orbit, dt, 0.7);
  }

  /* -------------------------------------------------- shared moves */

  private radial(n: number, tex: string, speed: number, dmg: number, offset = 0, range = 12 * TILE, scale = 1): void {
    for (let i = 0; i < n; i++) {
      const a = offset + (i / n) * Math.PI * 2;
      this.b.shoot(this.u, 1, this.u.x, this.u.y, a, { tex, speed, range, dmg: this.d(dmg), r: 14 * scale, scale });
    }
    audio.play('shoot', { vol: 0.5 });
  }

  private fan(n: number, spread: number, tex: string, speed: number, dmg: number, range = 9 * TILE): void {
    const base = this.angToPlayer();
    for (let i = 0; i < n; i++) {
      const a = base - spread / 2 + (spread * i) / Math.max(1, n - 1);
      this.b.shoot(this.u, 1, this.u.x, this.u.y, a, { tex, speed, range, dmg: this.d(dmg), r: 12 });
    }
    audio.play('shoot', { vol: 0.5 });
  }

  private dashAt(speed: number, distTiles: number, dmg: number, breakWalls: boolean, tele = 0.6): number {
    const a = this.angToPlayer();
    const len = distTiles * TILE;
    this.b.teleLine(this.u.x, this.u.y, a, len, this.u.r * 2, tele, 0xff4d6d, () => {
      if (!this.u.alive) return;
      const dur = len / speed;
      this.u.dash = { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, t: dur, hitIds: new Set(), dmg: this.d(dmg), breakWalls };
      audio.play('dash');
    }, this.u);
    return tele + len / speed + 0.2;
  }

  private summon(id: string, count: number, cap: number): number {
    const alive = this.b.units.filter((x) => x.alive && x.defId === id).length;
    const n = Math.min(count, cap - alive);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const pos = { x: this.u.x + Math.cos(a) * this.u.r * 1.8, y: this.u.y + Math.sin(a) * this.u.r * 1.8 };
      this.b.spawnWithPortal(id, pos.x, pos.y, true);
    }
    return 0.5;
  }

  private lobsAround(n: number, spreadTiles: number, tex: string, radiusTiles: number, dmg: number, onLand?: (x: number, y: number) => void, stagger = 0.12): void {
    for (let i = 0; i < n; i++) {
      this.b.later(i * stagger, () => {
        if (!this.u.alive) return;
        const p = this.p;
        const a = Math.random() * Math.PI * 2;
        const r = i === 0 ? 0 : Math.random() * spreadTiles * TILE;
        const tx = Phaser.Math.Clamp(p.x + Math.cos(a) * r + (p.tag.vx ?? 0) * 0.4, TILE / 2, this.b.arena.pxW - TILE / 2);
        const ty = Phaser.Math.Clamp(p.y + Math.sin(a) * r + (p.tag.vy ?? 0) * 0.4, TILE / 2, this.b.arena.pxH - TILE / 2);
        const rad = radiusTiles * TILE;
        audio.play('throw', { vol: 0.4 });
        this.b.lob(this.u.x, this.u.y - 40, tx, ty, tex, rad, 0xff4d6d, (x, y) => {
          this.b.explode(x, y, rad, this.d(dmg), this.u, 1, { color: 0xff4d6d });
          onLand?.(x, y);
        });
      });
    }
  }

  private fireLine(n: number, dmgPerSec: number, dur: number): void {
    const a = this.angToPlayer();
    for (let i = 0; i < n; i++) {
      const dd = TILE * 1.4 + i * TILE * 0.9;
      const x = this.u.x + Math.cos(a) * dd;
      const y = this.u.y + Math.sin(a) * dd;
      const r = TILE * 0.7;
      this.b.later(i * 0.08, () => {
        const img = this.b.scene.add.image(x, y - 10, 'soft').setTint(0xff3d00).setBlendMode('ADD').setDisplaySize(r * 2.6, r * 2.6).setDepth(2400);
        this.b.scene.tweens.add({ targets: img, scaleY: img.scaleY * 1.25, duration: 150, yoyo: true, repeat: -1 });
        this.b.addZone({
          x, y, r, dur, team: 1, gfx: img, tickEvery: 0.25,
          tick: (z) => this.b.unitsIn(z.x, z.y, z.r, 1).forEach((t) => this.b.damage(t, this.d(dmgPerSec) * 0.25, this.u, { silent: true })),
        });
      });
    }
    audio.play('flame');
  }

  private puddle(x: number, y: number): void {
    const r = TILE * 1.1;
    const img = this.b.scene.add.image(x, y, 'disc').setTint(0x70e000).setAlpha(0.45).setDisplaySize(r * 2, r * 1.6).setDepth(0);
    this.b.addZone({
      x, y, r, dur: 4, team: 1, gfx: img, tickEvery: 0.2,
      tick: (z) => this.b.unitsIn(z.x, z.y, z.r, 1).forEach((t) => this.b.damage(t, this.d(60), this.u, { silent: true, slow: 0.4 })),
    });
  }

  /* -------------------------------------------------- per-boss kits */

  private build(): Pattern[] {
    const b = this.b;
    const ex = () => this.extra();
    switch (this.id) {
      case 'golem':
        return [
          {
            name: 'slam', weight: 3, minTier: 0,
            run: () => {
              const r = TILE * 2.7;
              b.teleCircle(this.u.x, this.u.y, r, 0.9, 0xff4d6d, () => {
                if (!this.u.alive) return;
                b.explode(this.u.x, this.u.y, r, this.d(950), this.u, 1, { color: 0xdda15e });
                b.shake(300, 0.012);
              }, this.u);
              return 1.2;
            },
          },
          { name: 'rocks', weight: 3, minTier: 0, run: () => (this.lobsAround(3 + ex(), 2, 'b_rock', 1.1, 700), 0.8) },
          { name: 'charge', weight: 2, minTier: 0, run: () => this.dashAt(720, 7, 850, true, 0.75) },
          { name: 'ring', weight: 2, minTier: 1, run: () => (this.radial(12 + ex(), 'b_rock', 420, 520, Math.random(), 11 * TILE, 0.7), 0.6) },
        ];
      case 'wasp':
        return [
          {
            name: 'stings', weight: 3, minTier: 0,
            run: () => {
              for (let v = 0; v < 3; v++) b.later(v * 0.28, () => this.u.alive && this.fan(5 + Math.floor(ex() / 2), 0.8, 'b_sting', 720, 380));
              return 1.0;
            },
          },
          { name: 'summon', weight: 2, minTier: 0, run: () => this.summon('mini', 3, 5) },
          { name: 'dive', weight: 2, minTier: 0, run: () => this.dashAt(950, 6, 700, false, 0.5) },
          {
            name: 'spiral', weight: 2, minTier: 1,
            run: () => {
              const n = 24 + ex() * 2;
              for (let i = 0; i < n; i++)
                b.later(i * 0.05, () => {
                  if (!this.u.alive) return;
                  b.shoot(this.u, 1, this.u.x, this.u.y, i * 0.45, { tex: 'b_sting', speed: 560, range: 10 * TILE, dmg: this.d(320), r: 10 });
                });
              return n * 0.05 + 0.2;
            },
          },
        ];
      case 'mech':
        return [
          { name: 'drones', weight: 2, minTier: 0, run: () => this.summon('drone', 2, 4) },
          { name: 'missiles', weight: 3, minTier: 0, run: () => (this.lobsAround(5 + ex(), 2.6, 'b_missile', 1.0, 650, undefined, 0.15), 1.0) },
          {
            name: 'spiral', weight: 3, minTier: 0,
            run: () => {
              const steps = 16;
              for (let i = 0; i < steps; i++)
                b.later(i * 0.1, () => {
                  if (!this.u.alive) return;
                  for (let arm = 0; arm < 3; arm++)
                    b.shoot(this.u, 1, this.u.x, this.u.y, i * 0.32 + (arm * Math.PI * 2) / 3, { tex: 'e_bullet', speed: 480, range: 10 * TILE, dmg: this.d(360), r: 10 });
                  audio.play('shoot', { vol: 0.25, throttleMs: 80 });
                });
              return 1.7;
            },
          },
          {
            name: 'lasers', weight: 2, minTier: 1,
            run: () => {
              const base = this.angToPlayer();
              for (let k = -1; k <= 1; k++) {
                const a = base + k * 0.35;
                b.teleLine(this.u.x, this.u.y, a, 12 * TILE, 14, 0.8, 0xff006e, () => {
                  if (!this.u.alive) return;
                  b.shoot(this.u, 1, this.u.x, this.u.y, a, { tex: 'e_laser', speed: 1500, range: 12 * TILE, dmg: this.d(800), r: 12, scale: 1.4 });
                  audio.play('laser', { vol: 0.5 });
                }, this.u);
              }
              return 1.2;
            },
          },
        ];
      case 'pyro':
        return [
          {
            name: 'cone', weight: 3, minTier: 0,
            run: () => {
              const n = 18 + ex() * 2;
              for (let i = 0; i < n; i++)
                b.later(i * 0.045, () => {
                  if (!this.u.alive) return;
                  const a = this.angToPlayer() + (Math.random() - 0.5) * 0.6;
                  b.shoot(this.u, 1, this.u.x, this.u.y, a, { tex: 'b_fire', speed: 520, range: 6.5 * TILE, dmg: this.d(260), r: 14, burn: this.d(300), grow: 0.6 });
                  audio.play('flame', { vol: 0.3, throttleMs: 120 });
                });
              return n * 0.045 + 0.3;
            },
          },
          {
            name: 'rings', weight: 3, minTier: 0,
            run: () => {
              this.radial(14 + ex(), 'b_fire', 300, 520);
              b.later(0.45, () => this.u.alive && this.radial(14 + ex(), 'b_fire', 300, 520, Math.PI / (14 + ex())));
              return 1.0;
            },
          },
          { name: 'wall', weight: 2, minTier: 0, run: () => (this.fireLine(7, 650, 4), 0.8) },
          {
            name: 'meteors', weight: 2, minTier: 1,
            run: () => {
              for (let i = 0; i < 4 + ex(); i++) {
                const p = this.p;
                const x = Phaser.Math.Clamp(p.x + (Math.random() - 0.5) * TILE * 5, TILE, b.arena.pxW - TILE);
                const y = Phaser.Math.Clamp(p.y + (Math.random() - 0.5) * TILE * 5, TILE, b.arena.pxH - TILE);
                b.teleCircle(x, y, TILE * 1.1, 1.0 + i * 0.12, 0xff7b00, () => b.explode(x, y, TILE * 1.1, this.d(700), this.u, 1, { color: 0xff7b00 }), this.u);
              }
              return 0.8;
            },
          },
        ];
      case 'phantom':
        return [
          {
            name: 'blink', weight: 3, minTier: 0,
            run: () => {
              const u = this.u;
              audio.play('teleport');
              b.burst(u.x, u.y - 30, 'smoke', 14, 0x7b2cbf);
              b.scene.tweens.add({ targets: u.root, alpha: 0, duration: 200 });
              b.later(0.35, () => {
                if (!u.alive) return;
                const p = this.p;
                for (let tries = 0; tries < 10; tries++) {
                  const a = Math.random() * Math.PI * 2;
                  const pos = b.arena.freeSpot(Math.floor((p.x + Math.cos(a) * TILE * 3.5) / TILE), Math.floor((p.y + Math.sin(a) * TILE * 3.5) / TILE));
                  if (Math.hypot(pos.x - p.x, pos.y - p.y) > TILE * 2) {
                    u.x = pos.x;
                    u.y = pos.y;
                    break;
                  }
                }
                b.burst(u.x, u.y - 30, 'smoke', 14, 0x7b2cbf);
                b.later(0.25, () => u.alive && this.fan(7 + Math.floor(ex() / 2), 1.0, 'b_shadow', 650, 420));
              });
              return 1.2;
            },
          },
          {
            name: 'clones', weight: 2, minTier: 0,
            run: () => {
              const clones = b.units.filter((x) => x.alive && x.kind === 'clone').length;
              for (let i = clones; i < 2; i++) {
                const a = Math.random() * Math.PI * 2;
                const pos = b.arena.freeSpot(Math.floor((this.u.x + Math.cos(a) * TILE * 2) / TILE), Math.floor((this.u.y + Math.sin(a) * TILE * 2) / TILE));
                const c = new Unit(b, {
                  kind: 'clone', team: 1, x: pos.x, y: pos.y, r: 30, hp: Math.round(this.u.maxHp * 0.08), speed: 160,
                  attack: { kind: 'shot', dmg: 300, range: 7, speed: 650, reload: 1.6, sfx: 'shoot', proj: 'b_shadow', charge: 0 },
                  texture: 'boss_phantom', scale: 0.4, dmgMult: this.u.dmgMult,
                });
                c.defId = 'shooter';
                c.kind = 'enemy';
                c.tag.clone = true;
                c.lifeT = 14;
                c.root.setAlpha(0.75);
                b.units.push(c);
                b.burst(pos.x, pos.y - 20, 'smoke', 10, 0x7b2cbf);
              }
              audio.play('teleport');
              return 0.6;
            },
          },
          {
            name: 'burst', weight: 3, minTier: 0,
            run: () => {
              this.radial(14 + ex(), 'b_shadow', 420, 420);
              b.later(0.4, () => this.u.alive && this.radial(14 + ex(), 'b_shadow', 420, 420, Math.PI / 14));
              return 0.9;
            },
          },
          { name: 'dash', weight: 2, minTier: 1, run: () => this.dashAt(1000, 7, 750, false, 0.45) },
        ];
      case 'slime':
      default:
        return [
          {
            name: 'jump', weight: 3, minTier: 0,
            run: () => {
              const u = this.u;
              const p = this.p;
              const tx = p.x;
              const ty = p.y;
              const r = TILE * 2;
              const dur = 1.1;
              b.teleCircle(tx, ty, r, dur, 0xff4d6d, () => {
                if (!u.alive) return;
                const pos = b.arena.freeSpot(Math.floor(tx / TILE), Math.floor(ty / TILE));
                u.x = pos.x;
                u.y = pos.y;
                b.explode(pos.x, pos.y, r, this.d(1000), u, 1, { color: 0x70e000 });
                this.puddle(pos.x, pos.y);
                b.shake(350, 0.014);
              }, u);
              b.scene.tweens.add({ targets: u.sprite, y: u.sprite.y - 160, duration: (dur * 1000) / 2, yoyo: true, ease: 'Quad.Out' });
              b.scene.tweens.add({ targets: u.root, x: tx, y: ty, duration: dur * 1000, ease: 'Sine.InOut', onUpdate: () => {
                u.x = u.root.x;
                u.y = u.root.y;
              } });
              u.tag.invuln = dur * 0.8;
              return dur + 0.4;
            },
          },
          { name: 'spit', weight: 3, minTier: 0, run: () => (this.lobsAround(4 + ex(), 2.5, 'b_slime', 0.9, 450, (x, y) => this.puddle(x, y)), 0.8) },
          { name: 'summon', weight: 2, minTier: 0, run: () => this.summon('slimelet', 2, 4) },
          { name: 'radial', weight: 2, minTier: 1, run: () => (this.radial(12 + ex(), 'b_slime', 380, 450), 0.6) },
        ];
    }
  }
}
