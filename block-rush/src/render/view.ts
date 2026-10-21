import { audio } from '../audio/audio';
import { t } from '../core/i18n';
import { fxRng } from '../core/rng';
import { clamp, ease, roundRect, rgba, shade } from '../core/util';
import type { BoosterId } from '../game/boosters';
import type { Lines } from '../game/board';
import type { Shape } from '../game/pieces';
import type { Session, SessionEvent } from '../game/session';
import { Particles } from './particles';
import { blit, sprites } from './sprites';
import { THEMES, type Theme } from './styles';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Layout {
  cell: number;
  bx: number;
  by: number;
  bw: number;
  bh: number;
  slots: Rect[];
  vertical: boolean;
}

interface Dying {
  x: number;
  y: number;
  color: number;
  delay: number;
  t: number;
  power: number;
}

interface Float {
  text: string;
  x: number;
  y: number;
  t: number;
  max: number;
  size: number;
  color: string;
  big: boolean;
}

interface Flyer {
  x0: number;
  y0: number;
  t: number;
  max: number;
}

interface Beam {
  kind: 'row' | 'col';
  i: number;
  t: number;
}

interface Drag {
  slot: number;
  pointerId: number;
  touch: boolean;
  px: number;
  py: number;
  sx: number;
  sy: number;
  moved: boolean;
  t: number;
  target: { x: number; y: number } | null;
  lines: Lines;
}

export type TargetMode = { id: BoosterId; kind: 'cell' | 'piece' } | null;

const RADIUS: Partial<Record<BoosterId, number>> = { hammer: 0, bomb: 1, mega: 2 };

/** Canvas view of a session: board, tray, drag & drop, effects. */
export class GameView {
  readonly ctx: CanvasRenderingContext2D;
  session!: Session;
  theme!: Theme;
  private dpr = 1;
  private cw = 0;
  private ch = 0;
  private L!: Layout;
  private bg: HTMLCanvasElement | null = null;
  private particles = new Particles();
  private dying: Dying[] = [];
  private placedAt = new Map<number, number>();
  private floats: Float[] = [];
  private flyers: Flyer[] = [];
  private beams: Beam[] = [];
  private slotBorn: number[] = [];
  private slotFits: boolean[] = [];
  private returning: { slot: number; x: number; y: number; t: number } | null = null;
  private drag: Drag | null = null;
  private hint: { slot: number; x: number; y: number; t: number } | null = null;
  private hover: { x: number; y: number } | null = null;
  private shakeT = 0;
  private shakePow = 0;
  private time = 0;
  targeting: TargetMode = null;
  /** Called when the player taps a board cell / tray piece while a booster is armed. */
  onTarget: ((t: { x?: number; y?: number; slot?: number }) => void) | null = null;
  /** Where collected crystals fly to (canvas coordinates). */
  gemTarget: (() => { x: number; y: number } | null) | null = null;
  onGemArrive: (() => void) | null = null;
  /** True while a piece is being dragged (ads must not interrupt). */
  onDragChange: ((dragging: boolean) => void) | null = null;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e, true));
    canvas.addEventListener('pointerleave', () => (this.hover = null));
  }

  setSession(s: Session): void {
    this.session = s;
    this.theme = THEMES[s.style];
    this.particles.clear();
    this.dying = [];
    this.floats = [];
    this.flyers = [];
    this.beams = [];
    this.placedAt.clear();
    this.drag = null;
    this.returning = null;
    this.hint = null;
    this.targeting = null;
    this.bg = null;
    this.slotBorn = s.slots.map((_, i) => this.time + i * 0.06);
    s.on((e) => this.onEvent(e));
    this.resize();
    this.updateFits();
  }

  // ---------- layout ----------

  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.cw = Math.max(1, r.width);
    this.ch = Math.max(1, r.height);
    this.canvas.width = Math.round(this.cw * this.dpr);
    this.canvas.height = Math.round(this.ch * this.dpr);
    sprites.dpr = this.dpr;
    this.bg = null;
    if (this.session) this.L = this.computeLayout();
  }

  private computeLayout(): Layout {
    const s = this.session;
    const W = s.board.w;
    const H = s.board.h;
    const n = s.slotCount;
    const m = 10;
    const pad = 10; // board frame thickness
    // Portrait: tray under the board.
    const trayH = clamp(this.ch * 0.15, 70, 140);
    const cellP = Math.floor(Math.min((this.cw - m * 2 - pad * 2) / W, (this.ch - trayH - m * 3 - pad * 2) / H));
    // Landscape: tray column on the right.
    const trayW = clamp(this.cw * 0.16, 80, 150);
    const cellL = Math.floor(Math.min((this.cw - trayW - m * 3 - pad * 2) / W, (this.ch - m * 2 - pad * 2) / H));
    const vertical = cellL > cellP * 1.08 && this.cw > this.ch;
    const cell = Math.max(8, vertical ? cellL : cellP);
    const bw = cell * W;
    const bh = cell * H;
    const slots: Rect[] = [];
    let bx: number;
    let by: number;
    if (!vertical) {
      bx = Math.round((this.cw - bw) / 2);
      const total = bh + pad * 2 + m + trayH;
      by = Math.round(Math.max(m, (this.ch - total) / 2) + pad);
      const ty = by + bh + pad + m;
      const avail = Math.min(this.cw - m * 2, Math.max(bw + pad * 2, n * trayH * 0.9));
      const sw = Math.min(avail / n, trayH);
      const x0 = (this.cw - sw * n) / 2;
      for (let i = 0; i < n; i++) slots.push({ x: x0 + i * sw + 3, y: ty, w: sw - 6, h: Math.min(trayH, sw * 1.05) });
    } else {
      const total = bw + pad * 2 + m + trayW;
      bx = Math.round(Math.max(m, (this.cw - total) / 2) + pad);
      by = Math.round((this.ch - bh) / 2);
      const tx = bx + bw + pad + m;
      const sh = Math.min((this.ch - m * 2) / n, trayW);
      const y0 = (this.ch - sh * n) / 2;
      for (let i = 0; i < n; i++) slots.push({ x: tx, y: y0 + i * sh + 3, w: trayW, h: sh - 6 });
    }
    return { cell, bx, by, bw, bh, slots, vertical };
  }

  /** Board rect in page coordinates, for positioning DOM hints. */
  boardRect(): Rect {
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + this.L.bx, y: r.top + this.L.by, w: this.L.bw, h: this.L.bh };
  }

  private miniCell(shape: Shape, r: Rect): number {
    const inner = Math.min(r.w, r.h) * 0.82;
    return Math.min(inner / Math.max(3, shape.w, shape.h), this.L.cell * 0.85);
  }

  // ---------- events from the session ----------

  private onEvent(e: SessionEvent): void {
    const L = this.L;
    switch (e.type) {
      case 'placed':
        for (const [x, y] of e.cells) this.placedAt.set(y * this.session.board.w + x, this.time);
        audio.play('place', { size: e.cells.length });
        audio.vibrate(12);
        break;
      case 'cleared': {
        const ox = L.bx + e.ox * L.cell;
        const oy = L.by + e.oy * L.cell;
        const power = e.kind === 'mega' ? 1.4 : e.kind === 'bomb' ? 1.2 : 1;
        for (const c of e.cells) {
          const cx = L.bx + (c.x + 0.5) * L.cell;
          const cy = L.by + (c.y + 0.5) * L.cell;
          const d = Math.hypot(cx - ox, cy - oy) / L.cell;
          this.dying.push({ x: c.x, y: c.y, color: c.color, delay: Math.min(0.5, d * 0.028), t: 0, power });
        }
        if (e.kind === 'line') {
          const n = e.lines.rows.length + e.lines.cols.length;
          audio.play('clear', { combo: this.session.combo, lines: n });
          audio.vibrate(30);
          if (this.session.combo >= 2) audio.play('combo');
        }
        if (e.kind === 'bomb' || e.kind === 'mega' || e.kind === 'revive') {
          const r = (e.kind === 'mega' ? 3 : 2) * L.cell;
          this.particles.ring(ox, oy, r * 1.5, '#ffffff', 0.5, 10);
          this.particles.ring(ox, oy, r, '#ffd25a', 0.4, 14);
          this.particles.sparkle(ox, oy, 40, '#ffcf6a', 420);
          audio.play('bomb');
          audio.vibrate(60);
        } else if (e.kind === 'row' || e.kind === 'col' || e.kind === 'cross') {
          const gx = Math.floor(e.ox);
          const gy = Math.floor(e.oy);
          if (e.kind !== 'col') this.beams.push({ kind: 'row', i: gy, t: 0 });
          if (e.kind !== 'row') this.beams.push({ kind: 'col', i: gx, t: 0 });
          audio.play('rocket');
          audio.vibrate(40);
        } else if (e.kind === 'hammer') {
          this.particles.ring(ox, oy, L.cell, '#ffffff', 0.3, 6);
          audio.play('hammer');
        }
        break;
      }
      case 'gem':
        this.flyers.push({
          x0: L.bx + (e.x + 0.5) * L.cell,
          y0: L.by + (e.y + 0.5) * L.cell,
          t: 0,
          max: 0.75,
        });
        audio.play('gem');
        break;
      case 'score':
        this.floats.push({
          text: `+${e.amount}`,
          x: L.bx + e.x * L.cell,
          y: L.by + e.y * L.cell,
          t: 0,
          max: 1,
          size: clamp(L.cell * 0.8, 16, 30) * (e.amount >= 300 ? 1.25 : 1),
          color: '#ffffff',
          big: false,
        });
        break;
      case 'praise': {
        const cx = L.bx + L.bw / 2;
        const cy = L.by + L.bh * 0.38;
        const size = clamp(L.bw / 7, 26, 60);
        this.floats.push({ text: t(`praise.${e.level}` as 'praise.0'), x: cx, y: cy, t: 0, max: 1.3, size, color: '#ffd84a', big: true });
        if (e.combo >= 2) {
          this.floats.push({ text: t('combo', { n: e.combo }), x: cx, y: cy + size * 0.95, t: 0, max: 1.3, size: size * 0.6, color: '#7af3ff', big: true });
        }
        break;
      }
      case 'tray':
        if (e.refill) {
          this.slotBorn = this.session.slots.map((_, i) => this.time + i * 0.07);
          audio.play('whoosh');
        }
        while (this.slotBorn.length < this.session.slots.length) this.slotBorn.push(this.time);
        if (this.L && this.L.slots.length !== this.session.slotCount) this.L = this.computeLayout();
        this.updateFits();
        break;
      case 'hint':
        this.hint = { slot: e.slot, x: e.x, y: e.y, t: 0 };
        break;
      case 'shake':
        this.shakeT = 0.35;
        this.shakePow = Math.max(this.shakePow * (this.shakeT > 0 ? 1 : 0), e.power);
        break;
      case 'booster':
        if (e.id !== 'hint') audio.play('booster');
        if (e.id === 'freeze') audio.play('freeze');
        break;
      case 'tick':
        audio.play('tick');
        break;
      case 'state':
        this.updateFits();
        break;
    }
  }

  private updateFits(): void {
    this.slotFits = this.session.slots.map((s) => !!s && this.session.board.fitsAnywhere(s.shape));
  }

  // ---------- input ----------

  private local(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private slotAt(x: number, y: number): number {
    return this.L.slots.findIndex((r) => x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 6 && y <= r.y + r.h + 10);
  }

  private cellAt(x: number, y: number): { x: number; y: number } | null {
    const L = this.L;
    const gx = Math.floor((x - L.bx) / L.cell);
    const gy = Math.floor((y - L.by) / L.cell);
    return this.session.board.inside(gx, gy) ? { x: gx, y: gy } : null;
  }

  private down(e: PointerEvent): void {
    audio.unlock();
    if (!this.session || this.session.state !== 'playing' || this.drag) return;
    const p = this.local(e);
    if (this.targeting) {
      if (this.targeting.kind === 'cell') {
        const c = this.cellAt(p.x, p.y);
        if (c) this.onTarget?.({ x: c.x, y: c.y });
      } else {
        const i = this.slotAt(p.x, p.y);
        if (i >= 0 && this.session.slots[i]) this.onTarget?.({ slot: i });
      }
      return;
    }
    const i = this.slotAt(p.x, p.y);
    if (i < 0 || !this.session.slots[i]) return;
    const touch = e.pointerType !== 'mouse';
    this.drag = { slot: i, pointerId: e.pointerId, touch, px: p.x, py: p.y, sx: p.x, sy: p.y, moved: false, t: 0, target: null, lines: { rows: [], cols: [] } };
    this.returning = null;
    this.hint = null;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    audio.play('pick');
    this.onDragChange?.(true);
    this.updateDrag();
  }

  private move(e: PointerEvent): void {
    if (!this.session) return;
    const p = this.local(e);
    if (!this.drag) {
      this.hover = e.pointerType === 'mouse' ? this.cellAt(p.x, p.y) : null;
      return;
    }
    if (e.pointerId !== this.drag.pointerId) return;
    this.drag.px = p.x;
    this.drag.py = p.y;
    if (Math.hypot(p.x - this.drag.sx, p.y - this.drag.sy) > 6) this.drag.moved = true;
    this.updateDrag();
  }

  /** Where the dragged piece is drawn: top-left in canvas px. */
  private dragPos(d: Drag, shape: Shape): { x: number; y: number } {
    const c = this.L.cell;
    const lift = d.touch ? c * 1.4 + (shape.h * c) / 2 : 0;
    return { x: d.px - (shape.w * c) / 2, y: d.py - (shape.h * c) / 2 - lift };
  }

  private updateDrag(): void {
    const d = this.drag!;
    const slot = this.session.slots[d.slot];
    if (!slot) return;
    const pos = this.dragPos(d, slot.shape);
    const fx = (pos.x - this.L.bx) / this.L.cell;
    const fy = (pos.y - this.L.by) / this.L.cell;
    const rx = Math.round(fx);
    const ry = Math.round(fy);
    let best: { x: number; y: number } | null = null;
    let bestD = Infinity;
    // Forgiving snap: nearest valid spot within one cell.
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = rx + dx;
        const y = ry + dy;
        if (!this.session.canPlace(d.slot, x, y)) continue;
        const dist = Math.hypot(x - fx, y - fy);
        if (dist < bestD && dist < 1.05) {
          bestD = dist;
          best = { x, y };
        }
      }
    }
    const changed = best?.x !== d.target?.x || best?.y !== d.target?.y;
    d.target = best;
    if (changed) d.lines = best ? this.session.previewLines(d.slot, best.x, best.y) : { rows: [], cols: [] };
  }

  private up(e: PointerEvent, cancel = false): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    this.drag = null;
    this.onDragChange?.(false);
    const slot = this.session.slots[d.slot];
    if (!cancel && d.target && slot && this.session.tryPlace(d.slot, d.target.x, d.target.y)) return;
    if (slot) {
      const pos = this.dragPos(d, slot.shape);
      this.returning = { slot: d.slot, x: pos.x, y: pos.y, t: 0 };
      if (d.moved && !cancel) audio.play('invalid');
    }
  }

  cancelDrag(): void {
    if (this.drag) {
      this.drag = null;
      this.onDragChange?.(false);
    }
  }

  get dragging(): boolean {
    return !!this.drag;
  }

  // ---------- frame ----------

  frame(dt: number): void {
    this.time += dt;
    this.update(dt);
    this.draw();
  }

  private update(dt: number): void {
    const L = this.L;
    if (!L) return;
    for (const d of this.dying) {
      d.t += dt;
      if (d.t >= d.delay) {
        const color = this.theme.palette[d.color] ?? this.theme.palette[0];
        this.particles.shatter(this.theme, L.bx + d.x * L.cell, L.by + d.y * L.cell, L.cell, color, L.bx + L.bw / 2, L.by + L.bh, d.power);
      }
    }
    this.dying = this.dying.filter((d) => d.t < d.delay);
    this.particles.update(dt, this.ch);
    this.floats = this.floats.filter((f) => (f.t += dt) < f.max);
    this.beams = this.beams.filter((b) => (b.t += dt) < 0.45);
    for (const f of this.flyers) f.t += dt;
    const arrived = this.flyers.filter((f) => f.t >= f.max);
    if (arrived.length) {
      this.flyers = this.flyers.filter((f) => f.t < f.max);
      for (const _ of arrived) {
        const tg = this.gemTarget?.();
        if (tg) this.particles.sparkle(tg.x, tg.y, 14, '#9ff6ff', 160);
        this.onGemArrive?.();
      }
    }
    if (this.returning && (this.returning.t += dt) > 0.18) this.returning = null;
    if (this.hint && (this.hint.t += dt) > 4) this.hint = null;
    if (this.drag) this.drag.t += dt;
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
  }

  private drawBackground(): void {
    if (!this.bg) {
      const c = document.createElement('canvas');
      c.width = this.canvas.width;
      c.height = this.canvas.height;
      const g = c.getContext('2d')!;
      g.scale(this.dpr, this.dpr);
      const th = this.theme;
      const grad = g.createLinearGradient(0, 0, 0, this.ch);
      grad.addColorStop(0, th.bgTop);
      grad.addColorStop(1, th.bgBottom);
      g.fillStyle = grad;
      g.fillRect(0, 0, this.cw, this.ch);
      // soft glows
      th.glow.forEach((col, i) => {
        const x = this.cw * [0.15, 0.85, 0.5][i];
        const y = this.ch * [0.2, 0.45, 0.92][i];
        const r = Math.max(this.cw, this.ch) * 0.45;
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, rgba(col, th.id === 'clay' ? 0.35 : 0.22));
        rg.addColorStop(1, rgba(col, 0));
        g.fillStyle = rg;
        g.fillRect(0, 0, this.cw, this.ch);
      });
      // scattered decorative mini blocks
      let seed = this.session.style * 7919 + 13;
      const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
      for (let i = 0; i < 16; i++) {
        const s = 8 + rnd() * 22;
        const col = th.palette[Math.floor(rnd() * th.palette.length)];
        g.save();
        g.globalAlpha = 0.1 + rnd() * 0.12;
        g.translate(rnd() * this.cw, rnd() * this.ch);
        g.rotate(rnd() * Math.PI);
        roundRect(g, -s / 2, -s / 2, s, s, s * 0.25);
        g.fillStyle = col;
        g.fill();
        g.restore();
      }
      this.bg = c;
    }
    this.ctx.drawImage(this.bg, 0, 0, this.cw, this.ch);
  }

  private draw(): void {
    const ctx = this.ctx;
    const L = this.L;
    if (!L) return;
    const k = this.dpr;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    this.drawBackground();
    let ox = 0;
    let oy = 0;
    if (this.shakeT > 0) {
      const p = (this.shakeT / 0.35) * this.shakePow * 7;
      ox = (fxRng.next() - 0.5) * 2 * p;
      oy = (fxRng.next() - 0.5) * 2 * p;
    } else this.shakePow = 0;
    ctx.setTransform(k, 0, 0, k, k * ox, k * oy);
    this.drawBoard();
    this.drawTray();
    this.drawDragged();
    this.particles.draw(ctx, k, ox, oy);
    this.drawFlyers();
    this.drawFloats();
  }

  private colorOf(i: number): string {
    return this.theme.palette[i] ?? this.theme.palette[0];
  }

  private drawBoard(): void {
    const ctx = this.ctx;
    const L = this.L;
    const th = this.theme;
    const b = this.session.board;
    const c = L.cell;
    const pad = 10;
    // frame
    roundRect(ctx, L.bx - pad, L.by - pad + 3, L.bw + pad * 2, L.bh + pad * 2, 16);
    ctx.fillStyle = shade(th.frame, -0.35);
    ctx.fill();
    roundRect(ctx, L.bx - pad, L.by - pad, L.bw + pad * 2, L.bh + pad * 2, 16);
    const fg = ctx.createLinearGradient(0, L.by - pad, 0, L.by + L.bh + pad);
    fg.addColorStop(0, th.frameLight);
    fg.addColorStop(1, th.frame);
    ctx.fillStyle = fg;
    ctx.fill();
    roundRect(ctx, L.bx - 3, L.by - 3, L.bw + 6, L.bh + 6, 10);
    ctx.fillStyle = th.well;
    ctx.fill();

    const emptySp = sprites.empty(th, c);
    const lines = this.drag?.lines;
    const hlRows = new Set(lines?.rows ?? []);
    const hlCols = new Set(lines?.cols ?? []);
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 10);
    for (let y = 0; y < b.h; y++) {
      for (let x = 0; x < b.w; x++) {
        const px = L.bx + x * c;
        const py = L.by + y * c;
        const v = b.get(x, y);
        if (v < 0) {
          blit(ctx, emptySp, px, py, c);
          continue;
        }
        const i = y * b.w + x;
        let scale = 1;
        const pt = this.placedAt.get(i);
        if (pt !== undefined) {
          const a = (this.time - pt) / 0.22;
          if (a >= 1) this.placedAt.delete(i);
          else scale = 1 + 0.22 * (1 - ease.outBack(a));
        }
        blit(ctx, sprites.block(th, this.colorOf(v), c), px, py, c, scale);
        if (hlRows.has(y) || hlCols.has(x)) {
          ctx.fillStyle = `rgba(255,255,255,${0.25 + pulse * 0.25})`;
          roundRect(ctx, px + c * 0.06, py + c * 0.06, c * 0.88, c * 0.88, c * 0.2);
          ctx.fill();
        }
        if (b.gems[i]) {
          const gs = 1 + 0.08 * Math.sin(this.time * 4 + x * 0.7 + y);
          blit(ctx, sprites.gem(c), px, py, c, gs);
        }
      }
    }
    // dying (flashing) cells
    for (const d of this.dying) {
      const px = L.bx + d.x * c;
      const py = L.by + d.y * c;
      blit(ctx, sprites.block(th, this.colorOf(d.color), c), px, py, c, 1 + 0.1 * (d.t / Math.max(0.01, d.delay)));
      ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.5 * (d.t / Math.max(0.01, d.delay))})`;
      roundRect(ctx, px + c * 0.05, py + c * 0.05, c * 0.9, c * 0.9, c * 0.2);
      ctx.fill();
    }
    // rocket beams
    for (const bm of this.beams) {
      const a = 1 - bm.t / 0.45;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (bm.kind === 'row') {
        const y = L.by + (bm.i + 0.5) * c;
        const g = ctx.createLinearGradient(0, y - c, 0, y + c);
        g.addColorStop(0, 'rgba(255,220,120,0)');
        g.addColorStop(0.5, `rgba(255,240,200,${a})`);
        g.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = g;
        ctx.fillRect(L.bx - 10, y - c, L.bw + 20, c * 2);
      } else {
        const x = L.bx + (bm.i + 0.5) * c;
        const g = ctx.createLinearGradient(x - c, 0, x + c, 0);
        g.addColorStop(0, 'rgba(255,220,120,0)');
        g.addColorStop(0.5, `rgba(255,240,200,${a})`);
        g.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - c, L.by - 10, c * 2, L.bh + 20);
      }
      ctx.restore();
    }
    // ghost of the dragged piece
    const d = this.drag;
    if (d?.target) {
      const s = this.session.slots[d.slot];
      if (s) {
        ctx.globalAlpha = 0.45;
        const sp = sprites.block(th, this.colorOf(s.color), c);
        for (const [cx, cy] of s.shape.cells) blit(ctx, sp, L.bx + (d.target.x + cx) * c, L.by + (d.target.y + cy) * c, c);
        ctx.globalAlpha = 1;
      }
    }
    // hint
    if (this.hint) {
      const s = this.session.slots[this.hint.slot];
      if (s) {
        const a = 0.35 + 0.35 * Math.sin(this.hint.t * 8);
        ctx.strokeStyle = `rgba(255,255,255,${0.6 + a * 0.4})`;
        ctx.lineWidth = 3;
        ctx.globalAlpha = a;
        const sp = sprites.block(th, this.colorOf(s.color), c);
        for (const [cx, cy] of s.shape.cells) {
          const px = L.bx + (this.hint.x + cx) * c;
          const py = L.by + (this.hint.y + cy) * c;
          blit(ctx, sp, px, py, c);
        }
        ctx.globalAlpha = 1;
        for (const [cx, cy] of s.shape.cells) {
          roundRect(ctx, L.bx + (this.hint.x + cx) * c + 2, L.by + (this.hint.y + cy) * c + 2, c - 4, c - 4, c * 0.2);
          ctx.stroke();
        }
      }
    }
    // freeze tint
    if (this.session.freezeLeft > 0) {
      ctx.save();
      roundRect(ctx, L.bx - 3, L.by - 3, L.bw + 6, L.bh + 6, 10);
      ctx.fillStyle = `rgba(160,230,255,${0.12 + 0.04 * Math.sin(this.time * 3)})`;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(200,245,255,0.8)';
      ctx.stroke();
      ctx.restore();
    }
    // booster targeting preview
    if (this.targeting?.kind === 'cell' && this.hover) {
      const id = this.targeting.id;
      ctx.save();
      ctx.fillStyle = `rgba(255,90,90,${0.25 + pulse * 0.2})`;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      const r = RADIUS[id];
      const { x: hx, y: hy } = this.hover;
      if (r !== undefined) {
        const x0 = Math.max(0, hx - r);
        const y0 = Math.max(0, hy - r);
        const x1 = Math.min(b.w - 1, hx + r);
        const y1 = Math.min(b.h - 1, hy + r);
        roundRect(ctx, L.bx + x0 * c, L.by + y0 * c, (x1 - x0 + 1) * c, (y1 - y0 + 1) * c, c * 0.2);
        ctx.fill();
        ctx.stroke();
      } else {
        if (id !== 'colRocket') {
          ctx.fillRect(L.bx, L.by + hy * c, L.bw, c);
          ctx.strokeRect(L.bx, L.by + hy * c, L.bw, c);
        }
        if (id !== 'rowRocket') {
          ctx.fillRect(L.bx + hx * c, L.by, c, L.bh);
          ctx.strokeRect(L.bx + hx * c, L.by, c, L.bh);
        }
      }
      ctx.restore();
    }
  }

  private drawPieceAt(shape: Shape, color: number, x: number, y: number, c: number, alpha = 1): void {
    const sp = sprites.block(this.theme, this.colorOf(color), c);
    this.ctx.globalAlpha = alpha;
    for (const [cx, cy] of shape.cells) blit(this.ctx, sp, x + cx * c, y + cy * c, c);
    this.ctx.globalAlpha = 1;
  }

  private drawTray(): void {
    const ctx = this.ctx;
    const L = this.L;
    const pieceMode = this.targeting?.kind === 'piece';
    L.slots.forEach((r, i) => {
      roundRect(ctx, r.x, r.y, r.w, r.h, 14);
      ctx.fillStyle = this.theme.slot;
      ctx.fill();
      if (pieceMode && this.session.slots[i]) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(255,230,120,${0.5 + 0.5 * Math.sin(this.time * 8)})`;
        ctx.stroke();
      }
      if (this.hint?.slot === i) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(this.hint.t * 8)})`;
        ctx.stroke();
      }
      const s = this.session.slots[i];
      if (!s || this.drag?.slot === i) return;
      const mc = this.miniCell(s.shape, r);
      let x = r.x + (r.w - s.shape.w * mc) / 2;
      let y = r.y + (r.h - s.shape.h * mc) / 2;
      let scale = 1;
      const born = this.slotBorn[i] ?? 0;
      const a = (this.time - born) / 0.35;
      if (a < 0) return;
      if (a < 1) scale = ease.outBack(a);
      if (this.returning?.slot === i) {
        const k = ease.outCubic(this.returning.t / 0.18);
        x = this.returning.x + (x - this.returning.x) * k;
        y = this.returning.y + (y - this.returning.y) * k;
      }
      const fits = this.slotFits[i] !== false;
      ctx.save();
      const cx = x + (s.shape.w * mc) / 2;
      const cy = y + (s.shape.h * mc) / 2;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      this.drawPieceAt(s.shape, s.color, x, y, mc, fits ? 1 : 0.35);
      ctx.restore();
    });
  }

  private drawDragged(): void {
    const d = this.drag;
    if (!d) return;
    const s = this.session.slots[d.slot];
    if (!s) return;
    const pos = this.dragPos(d, s.shape);
    const c = this.L.cell;
    const k = Math.min(1, d.t / 0.1);
    const r = this.L.slots[d.slot];
    const mc = this.miniCell(s.shape, r);
    const cc = mc + (c - mc) * ease.outCubic(k);
    const x = pos.x + (s.shape.w * (c - cc)) / 2;
    const y = pos.y + (s.shape.h * (c - cc)) / 2;
    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0,0,0,0.35)';
    this.ctx.shadowBlur = 14;
    this.ctx.shadowOffsetY = 8;
    this.drawPieceAt(s.shape, s.color, x, y, cc * 1.04);
    this.ctx.restore();
  }

  private drawFlyers(): void {
    const tg = this.gemTarget?.() ?? { x: this.cw / 2, y: 0 };
    const c = this.L.cell;
    for (const f of this.flyers) {
      const a = clamp(f.t / f.max, 0, 1);
      const e = ease.inCubic(a);
      // Arc: rise first, then home in.
      const x = f.x0 + (tg.x - f.x0) * e;
      const y = f.y0 + (tg.y - f.y0) * e - Math.sin(a * Math.PI) * c * 2.5;
      const size = c * (1.4 - 0.5 * a);
      blit(this.ctx, sprites.gem(c), x - size / 2, y - size / 2, size, size / c);
      if (fxRng.chance(0.5)) this.particles.sparkle(x, y, 1, '#bff8ff', 40);
    }
  }

  private drawFloats(): void {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.floats) {
      const a = f.t / f.max;
      ctx.save();
      if (f.big) {
        const sc = a < 0.25 ? ease.outBack(a / 0.25) : 1;
        const alpha = a > 0.75 ? 1 - (a - 0.75) / 0.25 : 1;
        ctx.globalAlpha = alpha;
        ctx.translate(f.x, f.y - a * 20);
        ctx.scale(sc, sc);
        ctx.font = `900 ${f.size}px ${FONT}`;
        ctx.lineJoin = 'round';
        ctx.lineWidth = f.size * 0.16;
        ctx.strokeStyle = '#2a0d4d';
        ctx.strokeText(f.text, 0, 0);
        const g = ctx.createLinearGradient(0, -f.size / 2, 0, f.size / 2);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.45, f.color);
        g.addColorStop(1, shade(f.color, -0.3));
        ctx.fillStyle = g;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 18;
        ctx.fillText(f.text, 0, 0);
      } else {
        ctx.globalAlpha = a > 0.6 ? 1 - (a - 0.6) / 0.4 : 1;
        ctx.translate(f.x, f.y - ease.outCubic(a) * 50);
        const sc = a < 0.15 ? 0.6 + (a / 0.15) * 0.4 : 1;
        ctx.scale(sc, sc);
        ctx.font = `900 ${f.size}px ${FONT}`;
        ctx.lineJoin = 'round';
        ctx.lineWidth = f.size * 0.2;
        ctx.strokeStyle = 'rgba(20,5,40,0.85)';
        ctx.strokeText(f.text, 0, 0);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, 0, 0);
      }
      ctx.restore();
    }
  }
}

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
