import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { TILE, type AttackSpec, type SuperSpec } from '../data/types';
import type { Battle } from './battle';
import { Unit } from './unit';

const angDiff = (a: number, b: number) => Math.abs(Phaser.Math.Angle.Wrap(a - b));

function dmgOf(u: Unit, base: number): number {
  let d = base * u.dmgMult;
  if (u.invis > 0 && u.tag.stealthMult) d *= u.tag.stealthMult;
  return d;
}

/** Fire a basic attack in direction `angle`; `mag` (0..1) is aim distance for lobbed attacks. */
export function fireAttack(b: Battle, u: Unit, spec: AttackSpec, angle: number, mag: number): void {
  const dmg = dmgOf(u, spec.dmg);
  const range = spec.range * TILE;
  const ox = u.x + Math.cos(angle) * u.r * 0.8;
  const oy = u.y + Math.sin(angle) * u.r * 0.8;
  if (spec.sfx) audio.play(spec.sfx, { vol: u.team === 0 ? 0.55 : 0.3, throttleMs: u.team === 0 ? 30 : 80 });
  const base = { tex: spec.proj ?? 'e_bullet', speed: spec.speed ?? 900, range, dmg, charge: spec.charge, burn: spec.burn ? spec.burn * u.dmgMult : undefined, stun: spec.stun, slow: spec.slow };

  switch (spec.kind) {
    case 'shot':
      b.shoot(u, u.team, ox, oy, angle, { ...base, r: 10 });
      break;
    case 'spread': {
      const n = spec.count ?? 3;
      const sp = spec.spread ?? 0.4;
      for (let i = 0; i < n; i++) {
        const a = angle - sp / 2 + (sp * i) / Math.max(1, n - 1);
        b.shoot(u, u.team, ox, oy, a, { ...base, range: range * (0.92 + Math.random() * 0.08), r: 9 });
      }
      break;
    }
    case 'burst': {
      const n = spec.count ?? 3;
      for (let i = 0; i < n; i++) {
        b.later(i * 0.09, () => {
          if (!u.alive) return;
          const a = angle + (Math.random() - 0.5) * 0.06;
          b.shoot(u, u.team, u.x + Math.cos(a) * u.r, u.y + Math.sin(a) * u.r, a, { ...base, r: 8 });
          if (i > 0) audio.play(spec.sfx, { vol: 0.3, throttleMs: 20 });
        });
      }
      break;
    }
    case 'twin': {
      const px = Math.cos(angle + Math.PI / 2) * 13;
      const py = Math.sin(angle + Math.PI / 2) * 13;
      b.shoot(u, u.team, ox + px, oy + py, angle, { ...base, r: 9 });
      b.shoot(u, u.team, ox - px, oy - py, angle, { ...base, r: 9 });
      break;
    }
    case 'wave':
      b.shoot(u, u.team, ox, oy, angle, { ...base, r: 28, pierce: true, lifesteal: spec.lifesteal, grow: 0.5 });
      break;
    case 'flame': {
      const n = spec.count ?? 5;
      const sp = spec.spread ?? 0.4;
      for (let i = 0; i < n; i++) {
        const a = angle + (Math.random() - 0.5) * sp;
        b.later(i * 0.03, () => {
          if (!u.alive) return;
          b.shoot(u, u.team, u.x + Math.cos(a) * u.r, u.y + Math.sin(a) * u.r, a, {
            ...base, dmg: dmg / 2, speed: (spec.speed ?? 700) * (0.85 + Math.random() * 0.3), r: 16, pierce: true, grow: 1.6, spin: 6, charge: spec.charge,
          });
        });
      }
      break;
    }
    case 'lob': {
      const d = Phaser.Math.Clamp(mag * range, TILE * 0.8, range);
      const tx = Phaser.Math.Clamp(u.x + Math.cos(angle) * d, 8, b.arena.pxW - 8);
      const ty = Phaser.Math.Clamp(u.y + Math.sin(angle) * d, 8, b.arena.pxH - 8);
      const rad = (spec.radius ?? 1) * TILE;
      b.lob(u.x, u.y - 20, tx, ty, spec.proj ?? 'p_bomb', rad, u.team === 0 ? 0xffffff : 0xff4d6d, (x, y) => {
        b.explode(x, y, rad, dmg, u, u.team, { charge: spec.charge, color: u.team === 0 ? 0xffd166 : 0xff4d6d });
      });
      break;
    }
    case 'chain': {
      const n = spec.count ?? 3;
      const foes = b.enemiesOf(u.team).filter((e) => e.visibleFrom(u.x, u.y));
      let first: Unit | null = null;
      let best = 1e9;
      for (const e of foes) {
        const d = Math.hypot(e.x - u.x, e.y - u.y);
        if (d > range + e.r) continue;
        const ad = angDiff(Math.atan2(e.y - u.y, e.x - u.x), angle);
        if (ad > 0.75) continue;
        const score = ad * 300 + d * 0.4;
        if (score < best) {
          best = score;
          first = e;
        }
      }
      if (!first) {
        b.lightning(ox, oy - 16, u.x + Math.cos(angle) * range * 0.7, u.y + Math.sin(angle) * range * 0.7 - 16);
        break;
      }
      const hit = new Set<number>();
      let prev = { x: ox, y: oy };
      let cur: Unit | null = first;
      let k = 1;
      for (let i = 0; i < n && cur; i++) {
        hit.add(cur.id);
        b.lightning(prev.x, prev.y - 16, cur.x, cur.y - 20);
        b.damage(cur, dmg * k, u, { charge: spec.charge });
        k *= 0.85;
        prev = { x: cur.x, y: cur.y };
        const from: Unit = cur;
        cur = null;
        let bd = TILE * 3.4;
        for (const e of foes) {
          if (!e.alive || hit.has(e.id)) continue;
          const d = Math.hypot(e.x - from.x, e.y - from.y);
          if (d < bd) {
            bd = d;
            cur = e;
          }
        }
      }
      break;
    }
    case 'melee': {
      const sp = spec.spread ?? 1.4;
      slashFx(b, u, angle, range, sp, u.team === 0 ? 0xffffff : 0xff4d6d);
      for (const e of b.enemiesOf(u.team)) {
        const d = Math.hypot(e.x - u.x, e.y - u.y);
        if (d > range + e.r) continue;
        if (d > e.r + u.r && angDiff(Math.atan2(e.y - u.y, e.x - u.x), angle) > sp / 2) continue;
        b.damage(e, dmg, u, { charge: spec.charge, knock: 20, kx: Math.cos(angle), ky: Math.sin(angle) });
      }
      // Melee also chips crates in front.
      const c = Math.floor((u.x + Math.cos(angle) * range * 0.8) / TILE);
      const r = Math.floor((u.y + Math.sin(angle) * range * 0.8) / TILE);
      b.arena.damageTile(c, r, dmg * 0.5);
      break;
    }
    case 'slam': {
      const d = spec.range > 0.5 ? range * 0.75 : 0;
      const cx = u.x + Math.cos(angle) * d;
      const cy = u.y + Math.sin(angle) * d;
      const rad = (spec.radius ?? 1) * TILE;
      b.later(0.1, () => {
        if (!u.alive && u.defId !== 'kamikaze') return;
        b.explode(cx, cy, rad, dmg, u, u.team, { charge: spec.charge, color: u.team === 0 ? 0xdda15e : 0xff4d6d, crateDmg: dmg });
      });
      break;
    }
  }
}

function slashFx(b: Battle, u: Unit, angle: number, range: number, spread: number, color: number): void {
  const g = b.scene.add.graphics().setDepth(2700);
  g.lineStyle(10, color, 0.85);
  g.beginPath();
  g.arc(u.x, u.y - 10, range * 0.8, angle - spread / 2, angle + spread / 2);
  g.strokePath();
  g.lineStyle(4, 0xffffff, 1);
  g.beginPath();
  g.arc(u.x, u.y - 10, range * 0.8, angle - spread / 3, angle + spread / 3);
  g.strokePath();
  b.scene.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
}

/** Spawn an allied auto-turret. */
function spawnTurret(b: Battle, owner: Unit, x: number, y: number, dmg: number, life: number): void {
  const pos = b.arena.freeSpot(Math.floor(x / TILE), Math.floor(y / TILE));
  const t = new Unit(b, {
    kind: 'turret',
    team: owner.team,
    x: pos.x,
    y: pos.y,
    r: 24,
    hp: Math.round(3000 * owner.dmgMult),
    speed: 0,
    attack: { kind: 'shot', dmg, range: 7, speed: 1100, reload: 0.5, sfx: 'shoot', proj: 'p_nail', charge: 0.02 },
    texture: 'turret',
    scale: 0.8,
  });
  t.maxAmmo = 3;
  t.lifeT = life;
  t.tag.owner = owner;
  b.units.push(t);
  b.shockwave(pos.x, pos.y, TILE, 0x4cc9f0);
}

export function castSuper(b: Battle, u: Unit, sup: SuperSpec, angle: number, mag: number): void {
  const dmg = dmgOf(u, sup.dmg);
  const range = sup.range * TILE;
  audio.play('super', { vol: 0.6 });
  const tx = Phaser.Math.Clamp(u.x + Math.cos(angle) * Math.max(TILE, mag * range), 8, b.arena.pxW - 8);
  const ty = Phaser.Math.Clamp(u.y + Math.sin(angle) * Math.max(TILE, mag * range), 8, b.arena.pxH - 8);

  switch (sup.kind) {
    case 'charge': {
      const dur = 0.38;
      u.tag.baseDmgTaken = u.dmgTaken;
      u.dmgTaken *= 0.5;
      u.dash = { vx: (Math.cos(angle) * range) / dur, vy: (Math.sin(angle) * range) / dur, t: dur, hitIds: new Set(), dmg, breakWalls: true };
      audio.play('dash');
      b.shake(200, 0.006);
      break;
    }
    case 'dash': {
      const dur = 0.22;
      u.tag.invuln = dur + 0.05;
      u.dash = { vx: (Math.cos(angle) * range) / dur, vy: (Math.sin(angle) * range) / dur, t: dur, hitIds: new Set(), dmg, breakWalls: false };
      audio.play('dash');
      break;
    }
    case 'beam': {
      const ex = u.x + Math.cos(angle) * range;
      const ey = u.y + Math.sin(angle) * range;
      const g = b.scene.add.graphics().setDepth(2700);
      g.lineStyle(40, 0x7df9ff, 0.5).lineBetween(u.x, u.y - 18, ex, ey - 18);
      g.lineStyle(16, 0xffffff, 1).lineBetween(u.x, u.y - 18, ex, ey - 18);
      b.scene.tweens.add({ targets: g, alpha: 0, duration: 400, onComplete: () => g.destroy() });
      audio.play('laser');
      b.shake(200, 0.008);
      const steps = Math.ceil(range / 16);
      for (let i = 1; i <= steps; i++) {
        const x = u.x + ((ex - u.x) * i) / steps;
        const y = u.y + ((ey - u.y) * i) / steps;
        b.arena.destroyTile(Math.floor(x / TILE), Math.floor(y / TILE));
      }
      for (const e of b.enemiesOf(u.team)) {
        const d = Phaser.Math.Distance.Between(e.x, e.y, u.x, u.y);
        if (d > range + e.r) continue;
        const line = new Phaser.Geom.Line(u.x, u.y, ex, ey);
        const pt = Phaser.Geom.Line.GetNearestPoint(line, new Phaser.Geom.Point(e.x, e.y));
        const along = (pt.x - u.x) * Math.cos(angle) + (pt.y - u.y) * Math.sin(angle);
        if (along < 0) continue;
        if (Math.hypot(pt.x - e.x, pt.y - e.y) < e.r + 22) b.damage(e, dmg, u, { knock: 40, kx: Math.cos(angle), ky: Math.sin(angle) });
      }
      break;
    }
    case 'megabomb': {
      const rad = (sup.radius ?? 2) * TILE;
      b.lob(u.x, u.y - 20, tx, ty, 'p_bomb', rad, 0xffd60a, (x, y) => {
        b.explode(x, y, rad, dmg, u, u.team, { breakWalls: true, color: 0xffd60a });
        b.shake(350, 0.012);
      }, 1.2);
      break;
    }
    case 'healzone': {
      const rad = (sup.radius ?? 2) * TILE;
      const img = b.scene.add.image(tx, ty, 'disc').setTint(0x57cc99).setAlpha(0).setDisplaySize(rad * 2, rad * 2).setDepth(1);
      b.scene.tweens.add({ targets: img, alpha: 0.35, duration: 200 });
      audio.play('heal');
      b.addZone({
        x: tx, y: ty, r: rad, dur: sup.duration ?? 4, team: u.team, gfx: img, tickEvery: 0.25,
        tick: (z) => {
          for (const a of b.units) if (a.alive && a.team === u.team && Math.hypot(a.x - z.x, a.y - z.y) < z.r) a.heal(a.maxHp * 0.06);
          for (const e of b.unitsIn(z.x, z.y, z.r, u.team)) b.damage(e, dmg * 0.25, u, { silent: true });
          b.burst(z.x + (Math.random() - 0.5) * z.r, z.y + (Math.random() - 0.5) * z.r, 'star', 1, 0x80ed99);
        },
      });
      break;
    }
    case 'stunfield': {
      const rad = (sup.radius ?? 2) * TILE;
      b.shockwave(tx, ty, rad, 0x7df9ff);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        b.lightning(tx, ty - 10, tx + Math.cos(a) * rad, ty + Math.sin(a) * rad - 10);
      }
      audio.play('stun');
      audio.play('zap');
      for (const e of b.unitsIn(tx, ty, rad, u.team)) b.damage(e, dmg, u, { stun: (sup.stun ?? 1.5) });
      break;
    }
    case 'turret':
      spawnTurret(b, u, tx, ty, dmg, (sup.duration ?? 12) + (u.tag.turretBonus ?? 0));
      break;
    case 'firewall': {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const d = TILE * 1.1 + i * TILE * 0.85;
        const x = u.x + Math.cos(angle) * d;
        const y = u.y + Math.sin(angle) * d;
        const r = TILE * 0.75;
        b.later(i * 0.06, () => {
          const img = b.scene.add.image(x, y - 10, 'soft').setTint(0xff7b00).setBlendMode('ADD').setDisplaySize(r * 2.6, r * 2.6).setDepth(2400);
          b.scene.tweens.add({ targets: img, scaleY: img.scaleY * 1.2, duration: 160, yoyo: true, repeat: -1 });
          b.addZone({
            x, y, r, dur: sup.duration ?? 4, team: u.team, gfx: img, tickEvery: 0.25,
            tick: (z) => {
              for (const e of b.unitsIn(z.x, z.y, z.r, u.team)) b.damage(e, dmg * 0.25, u, { silent: true, burn: dmg * 0.3 });
              b.burst(z.x, z.y - 10, 'fire', 2);
            },
          });
        });
      }
      audio.play('flame');
      break;
    }
    case 'quake': {
      const rad = (sup.radius ?? 3) * TILE;
      b.shake(450, 0.016);
      for (let i = 0; i < 3; i++) b.later(i * 0.12, () => b.shockwave(u.x, u.y, rad * (0.5 + i * 0.25), 0xdda15e));
      b.explode(u.x, u.y, rad, dmg, u, u.team, { stun: (sup.stun ?? 1.5) + (u.tag.stunBonus ?? 0), color: 0xdda15e, crateDmg: dmg * 2 });
      break;
    }
    case 'stealth': {
      const dur = (sup.duration ?? 5) + (u.tag.stealthBonus ?? 0);
      u.invis = dur;
      u.tag.stealthMult = 1.7;
      u.speed *= 1.25;
      audio.play('teleport');
      b.burst(u.x, u.y - 20, 'smoke', 14, 0x7b2cbf);
      b.later(dur, () => {
        u.speed /= 1.25;
      });
      break;
    }
  }
}
