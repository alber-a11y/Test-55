import { enemyById } from '../data/enemies';
import { TILE } from '../data/types';
import type { Battle } from './battle';
import { fireAttack } from './combat';
import type { Unit } from './unit';

interface BrainTag {
  think: number;
  strafe: number;
  strafeT: number;
  stuckT: number;
  lastX: number;
  lastY: number;
  unstickT: number;
  ux: number;
  uy: number;
  lkx?: number;
  lky?: number;
  aiming: number;
  arming: number;
  healT: number;
  summonT: number;
  retreatT: number;
  mx: number;
  my: number;
}

function tagOf(u: Unit): BrainTag {
  const t = u.tag as Partial<BrainTag>;
  if (t.strafe === undefined) {
    Object.assign(t, {
      think: t.think ?? 0, strafe: Math.random() < 0.5 ? 1 : -1, strafeT: 1, stuckT: 0, lastX: u.x, lastY: u.y, unstickT: 0, ux: 0, uy: 0,
      aiming: 0, arming: 0, healT: 1, summonT: 4, retreatT: 0, mx: 0, my: 0,
    });
  }
  return t as BrainTag;
}

/** Move a unit along a direction, with collision. */
export function steer(b: Battle, u: Unit, dx: number, dy: number, dt: number, speedMul = 1): void {
  const len = Math.hypot(dx, dy);
  if (len < 0.001) {
    u.moving = false;
    return;
  }
  const sp = u.speedNow * speedMul * dt;
  const res = b.arena.move(u.x, u.y, u.r, (dx / len) * sp, (dy / len) * sp);
  u.x = res.x;
  u.y = res.y;
  u.moving = true;
  if (Math.abs(dx) > 0.15 * len) u.facing = dx > 0 ? 1 : -1;
}

function pickTarget(b: Battle, u: Unit): Unit | null {
  let best: Unit | null = null;
  let bd = 1e9;
  for (const e of b.units) {
    if (!e.alive || e.team === u.team) continue;
    if (!e.visibleFrom(u.x, u.y)) continue;
    const d = Math.hypot(e.x - u.x, e.y - u.y) * (e.kind === 'hero' ? 0.85 : 1);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}

/** Predicted aim angle with lead and difficulty-based error. */
export function aimAt(b: Battle, u: Unit, tgt: Unit, projSpeed: number): number {
  const d = Math.hypot(tgt.x - u.x, tgt.y - u.y);
  const lead = projSpeed > 0 ? Math.min(0.8, d / projSpeed) * (0.4 + Math.random() * 0.5) : 0;
  const tx = tgt.x + (tgt.tag.vx ?? 0) * lead;
  const ty = tgt.y + (tgt.tag.vy ?? 0) * lead;
  const err = (Math.random() - 0.5) * 2 * b.cfg.diff.aimErr;
  return Math.atan2(ty - u.y, tx - u.x) + err;
}

export function updateBrain(b: Battle, u: Unit, dt: number): void {
  if (u.kind === 'turret') return turretBrain(b, u, dt);
  const st = tagOf(u);
  const def = enemyById(u.defId);
  const spec = u.attack;
  const range = spec.range * TILE;
  const pref = def.prefRange * TILE;
  const tgt = pickTarget(b, u);
  if (tgt) {
    st.lkx = tgt.x;
    st.lky = tgt.y;
  }
  const p = b.player;

  // Unsticking.
  st.stuckT += dt;
  if (st.stuckT > 0.8) {
    const moved = Math.hypot(u.x - st.lastX, u.y - st.lastY);
    if (u.moving && moved < 10) {
      const a = Math.random() * Math.PI * 2;
      st.ux = Math.cos(a);
      st.uy = Math.sin(a);
      st.unstickT = 0.5;
    }
    st.stuckT = 0;
    st.lastX = u.x;
    st.lastY = u.y;
  }
  if (st.unstickT > 0) {
    st.unstickT -= dt;
    steer(b, u, st.ux, st.uy, dt);
    return;
  }

  // Sniper aim / kamikaze arming lock movement.
  if (st.aiming > 0 || st.arming > 0) {
    u.moving = false;
    if (st.arming > 0) {
      st.arming -= dt;
      u.sprite.setTint(Math.sin(st.arming * 40) > 0 ? 0xffffff : 0xff0000);
      if (st.arming <= 0) {
        fireAttack(b, u, spec, 0, 0);
        b.kill(u, null);
      }
    }
    return;
  }

  // Support heals allies.
  if (def.ai === 'support') {
    st.healT -= dt;
    if (st.healT <= 0) {
      st.healT = 1.2;
      for (const a of b.units) {
        if (!a.alive || a.team !== u.team || a === u || a.hp >= a.maxHp) continue;
        if (Math.hypot(a.x - u.x, a.y - u.y) < TILE * 3.5) {
          a.heal(a.maxHp * 0.08);
          b.lightning(u.x, u.y - 20, a.x, a.y - 20, 0x80ed99);
        }
      }
    }
  }
  if (def.ai === 'summoner') {
    st.summonT -= dt;
    const minions = b.units.filter((m) => m.alive && m.defId === 'mini').length;
    if (st.summonT <= 0 && minions < 4 && tgt) {
      st.summonT = 7;
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        b.spawnWithPortal('mini', u.x + Math.cos(a) * 50, u.y + Math.sin(a) * 50, true);
      }
    }
  }

  // Decide think tick (shooting decisions are throttled).
  st.think -= dt;
  const thinkNow = st.think <= 0;
  if (thinkNow) st.think = 0.15 + Math.random() * 0.15;

  if (!tgt) {
    // Hunt: go to last known position, else follow flow toward player loosely.
    const gx = st.lkx ?? p.x;
    const gy = st.lky ?? p.y;
    if (Math.hypot(gx - u.x, gy - u.y) < TILE) {
      st.lkx = undefined;
      st.lky = undefined;
      const fd = b.arena.flowDir(u.x, u.y);
      if (fd) steer(b, u, fd.x, fd.y, dt, 0.6);
      else u.moving = false;
    } else moveToward(b, u, gx, gy, dt);
    return;
  }

  const dx = tgt.x - u.x;
  const dy = tgt.y - u.y;
  const dist = Math.hypot(dx, dy);
  const los = b.arena.lineOfSight(u.x, u.y, tgt.x, tgt.y);
  const lob = spec.kind === 'lob';

  // Movement.
  if (def.ai === 'rusher' || def.ai === 'kamikaze') {
    if (dist > range * 0.6 || !los) moveToward(b, u, tgt.x, tgt.y, dt);
    else steer(b, u, dx, dy, dt, 0.3);
    if (def.ai === 'kamikaze' && dist < TILE * 1.2) {
      st.arming = 0.55;
      return;
    }
  } else {
    if (u.hp < u.maxHp * 0.3 && st.retreatT <= 0 && Math.random() < 0.01) st.retreatT = 2;
    if (st.retreatT > 0) {
      st.retreatT -= dt;
      steer(b, u, -dx, -dy, dt);
    } else if (dist > pref + TILE || (!los && !lob)) {
      moveToward(b, u, tgt.x, tgt.y, dt);
    } else if (dist < pref - TILE * 1.5) {
      steer(b, u, -dx + st.strafe * -dy * 0.5, -dy + st.strafe * dx * 0.5, dt, 0.85);
    } else {
      st.strafeT -= dt;
      if (st.strafeT <= 0) {
        st.strafeT = 0.8 + Math.random() * 1.4;
        st.strafe *= -1;
      }
      steer(b, u, -dy * st.strafe, dx * st.strafe, dt, 0.7);
    }
  }
  if (Math.abs(dx) > 4) u.facing = dx > 0 ? 1 : -1;

  // Attack.
  if (!thinkNow || u.ammo < 1 || u.fireCd > 0) return;
  if (dist > range * 0.95 + tgt.r) return;
  if (!los && !lob) return;
  if (def.ai === 'sniper') {
    const ang = aimAt(b, u, tgt, spec.speed ?? 1200);
    st.aiming = 0.65;
    b.teleLine(u.x, u.y, ang, range, 10, 0.65, 0xff006e, () => {
      st.aiming = 0;
      if (!u.alive) return;
      u.ammo--;
      u.fireCd = 1;
      fireAttack(b, u, spec, ang, 1);
    }, u);
    return;
  }
  const ang = lob ? Math.atan2(tgt.y + (tgt.tag.vy ?? 0) * 0.3 - u.y, tgt.x + (tgt.tag.vx ?? 0) * 0.3 - u.x) : aimAt(b, u, tgt, spec.speed ?? 800);
  u.ammo--;
  u.fireCd = 0.55 + Math.random() * 0.6;
  u.sinceAttack = 0;
  u.revealT = 1;
  fireAttack(b, u, spec, ang, Math.min(1, dist / range));
}

function moveToward(b: Battle, u: Unit, x: number, y: number, dt: number): void {
  const direct = b.arena.lineOfSight(u.x, u.y, x, y) && Math.hypot(x - u.x, y - u.y) < TILE * 6;
  const p = b.player;
  const towardPlayer = Math.hypot(x - p.x, y - p.y) < TILE * 1.5;
  if (!direct && towardPlayer) {
    const fd = b.arena.flowDir(u.x, u.y);
    if (fd) return steer(b, u, fd.x, fd.y, dt);
  }
  steer(b, u, x - u.x, y - u.y, dt);
}

function turretBrain(b: Battle, u: Unit, dt: number): void {
  void dt;
  if (u.ammo < 1 || u.fireCd > 0) return;
  const range = u.attack.range * TILE;
  let best: Unit | null = null;
  let bd = range;
  for (const e of b.units) {
    if (!e.alive || e.team === u.team || !e.visibleFrom(u.x, u.y)) continue;
    const d = Math.hypot(e.x - u.x, e.y - u.y);
    if (d < bd && b.arena.lineOfSight(u.x, u.y, e.x, e.y)) {
      bd = d;
      best = e;
    }
  }
  if (!best) return;
  const a = Math.atan2(best.y - u.y, best.x - u.x);
  u.facing = Math.cos(a) >= 0 ? 1 : -1;
  u.ammo--;
  u.fireCd = 0.3;
  fireAttack(b, u, u.attack, a, 1);
}
