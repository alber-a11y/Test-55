import type { Suit } from './card';

/** Canvas helpers shared by all card / icon renderers. */

export type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return [c, c.getContext('2d')!];
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Suit glyph path centered at (cx, cy) fitting a `s`×`s` box. Caller fills / strokes. */
export function suitPath(ctx: Ctx, suit: Suit, cx: number, cy: number, s: number): void {
  const h = s / 2;
  ctx.beginPath();
  switch (suit) {
    case 1: {
      // Heart
      const top = cy - h * 0.55;
      ctx.moveTo(cx, cy + h * 0.95);
      ctx.bezierCurveTo(cx - h * 0.35, cy + h * 0.55, cx - h * 1.0, cy + h * 0.15, cx - h * 0.98, top + h * 0.12);
      ctx.bezierCurveTo(cx - h * 0.95, top - h * 0.42, cx - h * 0.2, top - h * 0.55, cx, top + h * 0.05);
      ctx.bezierCurveTo(cx + h * 0.2, top - h * 0.55, cx + h * 0.95, top - h * 0.42, cx + h * 0.98, top + h * 0.12);
      ctx.bezierCurveTo(cx + h * 1.0, cy + h * 0.15, cx + h * 0.35, cy + h * 0.55, cx, cy + h * 0.95);
      break;
    }
    case 2: {
      // Diamond with slightly concave sides
      ctx.moveTo(cx, cy - h);
      ctx.quadraticCurveTo(cx + h * 0.28, cy - h * 0.28, cx + h * 0.78, cy);
      ctx.quadraticCurveTo(cx + h * 0.28, cy + h * 0.28, cx, cy + h);
      ctx.quadraticCurveTo(cx - h * 0.28, cy + h * 0.28, cx - h * 0.78, cy);
      ctx.quadraticCurveTo(cx - h * 0.28, cy - h * 0.28, cx, cy - h);
      break;
    }
    case 0: {
      // Spade: inverted heart + flared stem
      const bot = cy + h * 0.38;
      ctx.moveTo(cx, cy - h * 0.98);
      ctx.bezierCurveTo(cx + h * 0.3, cy - h * 0.55, cx + h * 1.0, cy - h * 0.2, cx + h * 0.96, bot - h * 0.1);
      ctx.bezierCurveTo(cx + h * 0.92, bot + h * 0.38, cx + h * 0.28, bot + h * 0.42, cx + h * 0.06, bot);
      ctx.quadraticCurveTo(cx + h * 0.12, cy + h * 0.78, cx + h * 0.42, cy + h * 0.98);
      ctx.lineTo(cx - h * 0.42, cy + h * 0.98);
      ctx.quadraticCurveTo(cx - h * 0.12, cy + h * 0.78, cx - h * 0.06, bot);
      ctx.bezierCurveTo(cx - h * 0.28, bot + h * 0.42, cx - h * 0.92, bot + h * 0.38, cx - h * 0.96, bot - h * 0.1);
      ctx.bezierCurveTo(cx - h * 1.0, cy - h * 0.2, cx - h * 0.3, cy - h * 0.55, cx, cy - h * 0.98);
      break;
    }
    case 3: {
      // Club: three lobes + stem
      const r = h * 0.43;
      ctx.moveTo(cx + r, cy - h * 0.5);
      ctx.arc(cx, cy - h * 0.5, r, 0, Math.PI * 2);
      ctx.moveTo(cx - h * 0.5 + r, cy + h * 0.1);
      ctx.arc(cx - h * 0.5, cy + h * 0.1, r, 0, Math.PI * 2);
      ctx.moveTo(cx + h * 0.5 + r, cy + h * 0.1);
      ctx.arc(cx + h * 0.5, cy + h * 0.1, r, 0, Math.PI * 2);
      ctx.moveTo(cx - h * 0.2, cy - h * 0.1);
      ctx.lineTo(cx + h * 0.2, cy - h * 0.1);
      ctx.lineTo(cx + h * 0.08, cy + h * 0.55);
      ctx.quadraticCurveTo(cx + h * 0.14, cy + h * 0.82, cx + h * 0.42, cy + h * 0.98);
      ctx.lineTo(cx - h * 0.42, cy + h * 0.98);
      ctx.quadraticCurveTo(cx - h * 0.14, cy + h * 0.82, cx - h * 0.08, cy + h * 0.55);
      ctx.closePath();
      break;
    }
  }
}

export function fillSuit(ctx: Ctx, suit: Suit, cx: number, cy: number, s: number, color: string): void {
  ctx.fillStyle = color;
  suitPath(ctx, suit, cx, cy, s);
  ctx.fill('nonzero');
}

/** Five-pointed star path. */
export function starPath(ctx: Ctx, cx: number, cy: number, r: number, inner = 0.45, points = 5, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = rot + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function hex(n: number): string {
  return '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
}

/** Mix two "#rrggbb" colors, t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, sh: number) => (p >> sh) & 255;
  const r = Math.round(ch(pa, 16) + (ch(pb, 16) - ch(pa, 16)) * t);
  const g = Math.round(ch(pa, 8) + (ch(pb, 8) - ch(pa, 8)) * t);
  const bl = Math.round(ch(pa, 0) + (ch(pb, 0) - ch(pa, 0)) * t);
  return '#' + ((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0');
}

export const lighten = (c: string, t: number): string => mix(c, '#ffffff', t);
export const darken = (c: string, t: number): string => mix(c, '#000000', t);

/** Deterministic small PRNG for texture noise (keeps textures identical between runs). */
export function noiseRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
