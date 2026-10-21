import { fxRng } from '../core/rng';
import { shade } from '../core/util';
import type { Theme } from './styles';

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  life: number;
  max: number;
  kind: 0 | 1 | 2 | 3; // 0 square, 1 triangle, 2 circle, 3 glow spark
  grav: number;
}

interface Ring {
  x: number;
  y: number;
  r0: number;
  r1: number;
  life: number;
  max: number;
  color: string;
  width: number;
}

const MAX = 2600;

export class Particles {
  private list: P[] = [];
  private rings: Ring[] = [];

  get count(): number {
    return this.list.length;
  }

  /** A block shattering into pieces. (x, y) = cell top-left in px, s = cell size. */
  shatter(theme: Theme, x: number, y: number, s: number, color: string, ox: number, oy: number, power = 1): void {
    const n = theme.shard === 'dust' ? 9 : theme.shard === 'spark' ? 7 : 6;
    const cx = x + s / 2;
    const cy = y + s / 2;
    let dx = cx - ox;
    let dy = cy - oy;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    for (let i = 0; i < n; i++) {
      if (this.list.length >= MAX) this.list.shift();
      const sp = (120 + fxRng.next() * 380) * power;
      const ang = Math.atan2(dy, dx) + (fxRng.next() - 0.5) * 2.2;
      const kind: P['kind'] =
        theme.shard === 'facet' ? 1 : theme.shard === 'drop' ? 2 : theme.shard === 'spark' ? (i % 2 ? 3 : 0) : 0;
      const sz = s * (theme.shard === 'dust' ? 0.12 + fxRng.next() * 0.16 : 0.18 + fxRng.next() * 0.26);
      this.list.push({
        x: x + fxRng.next() * s,
        y: y + fxRng.next() * s,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - (180 + fxRng.next() * 220) * power,
        rot: fxRng.next() * Math.PI * 2,
        vr: (fxRng.next() - 0.5) * 16,
        size: sz,
        color: fxRng.chance(0.3) ? shade(color, 0.35) : fxRng.chance(0.3) ? shade(color, -0.2) : color,
        life: 0,
        max: 0.7 + fxRng.next() * 0.7,
        kind,
        grav: theme.shard === 'spark' ? 500 : 1300,
      });
    }
  }

  sparkle(x: number, y: number, n: number, color: string, speed = 200): void {
    for (let i = 0; i < n; i++) {
      if (this.list.length >= MAX) this.list.shift();
      const a = fxRng.next() * Math.PI * 2;
      const sp = speed * (0.3 + fxRng.next());
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        rot: 0,
        vr: 0,
        size: 2 + fxRng.next() * 4,
        color,
        life: 0,
        max: 0.4 + fxRng.next() * 0.6,
        kind: 3,
        grav: 80,
      });
    }
  }

  ring(x: number, y: number, r1: number, color: string, dur = 0.45, width = 6): void {
    this.rings.push({ x, y, r0: r1 * 0.15, r1, life: 0, max: dur, color, width });
  }

  update(dt: number, floorY: number): void {
    let w = 0;
    for (let i = 0; i < this.list.length; i++) {
      const p = this.list[i];
      p.life += dt;
      if (p.life >= p.max || p.y > floorY + 200) continue;
      p.vy += p.grav * dt;
      p.vx *= 1 - 0.8 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      this.list[w++] = p;
    }
    this.list.length = w;
    this.rings = this.rings.filter((r) => (r.life += dt) < r.max);
  }

  /** k = device pixel ratio, (ox, oy) = current shake offset — particles use setTransform. */
  draw(ctx: CanvasRenderingContext2D, k: number, ox: number, oy: number): void {
    for (const r of this.rings) {
      const t = r.life / r.max;
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - t, 3)), 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of this.list) {
      const t = p.life / p.max;
      const a = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.kind === 3) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        continue;
      }
      const c = Math.cos(p.rot);
      const s = Math.sin(p.rot);
      ctx.setTransform(k * c, k * s, -k * s, k * c, k * (p.x + ox), k * (p.y + oy));
      const h = p.size / 2;
      if (p.kind === 0) ctx.fillRect(-h, -h, p.size, p.size);
      else if (p.kind === 1) {
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(h, h);
        ctx.lineTo(-h, h * 0.6);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, h, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.setTransform(k, 0, 0, k, k * ox, k * oy);
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.list.length = 0;
    this.rings.length = 0;
  }
}
