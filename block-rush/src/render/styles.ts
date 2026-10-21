import { rgba, roundRect, shade } from '../core/util';

export type StyleId = 'jelly' | 'crystal' | 'clay' | 'neon' | 'candy';

export interface Theme {
  id: StyleId;
  bgTop: string;
  bgBottom: string;
  /** Decorative glow blobs in the background. */
  glow: string[];
  well: string;
  wellCell: string;
  frame: string;
  frameLight: string;
  slot: string;
  text: string;
  palette: string[];
  /** Shard look when blocks shatter. */
  shard: 'chunk' | 'facet' | 'dust' | 'spark' | 'drop';
}

export const THEMES: Theme[] = [
  {
    id: 'jelly',
    bgTop: '#3a1f7a',
    bgBottom: '#140a33',
    glow: ['#ff5ab0', '#6c5bff', '#26d0ff'],
    well: '#1c1146',
    wellCell: '#271a5c',
    frame: '#4a33a3',
    frameLight: '#7a63e0',
    slot: 'rgba(255,255,255,0.07)',
    text: '#ffffff',
    palette: ['#ff4f86', '#ffae2b', '#2fd796', '#3f9dff', '#b26bff', '#ff7440', '#27dcdc', '#f2dc3a'],
    shard: 'drop',
  },
  {
    id: 'crystal',
    bgTop: '#0f3a4c',
    bgBottom: '#05141c',
    glow: ['#2fe0ff', '#3cffb0', '#5a7bff'],
    well: '#0a2230',
    wellCell: '#10303f',
    frame: '#1f5870',
    frameLight: '#3c90ad',
    slot: 'rgba(160,240,255,0.07)',
    text: '#eafcff',
    palette: ['#ea2f68', '#f39a12', '#16c477', '#2a78f0', '#9240e8', '#ee5724', '#0fc3c8', '#dcc313'],
    shard: 'facet',
  },
  {
    id: 'clay',
    bgTop: '#f6dcc0',
    bgBottom: '#d9a983',
    glow: ['#ffffff', '#ffd0a8', '#f3b6c2'],
    well: '#8a6448',
    wellCell: '#9a7255',
    frame: '#b88762',
    frameLight: '#e0b48e',
    slot: 'rgba(120,70,40,0.14)',
    text: '#4a2c1a',
    palette: ['#e26a85', '#ee9b4c', '#6fbf8e', '#5f9fd8', '#9f82d4', '#dd7a52', '#4fb8b8', '#e2c55b'],
    shard: 'dust',
  },
  {
    id: 'neon',
    bgTop: '#14052e',
    bgBottom: '#030108',
    glow: ['#ff2fd1', '#2ee6ff', '#7d3cff'],
    well: '#0b0420',
    wellCell: '#140a30',
    frame: '#3a157e',
    frameLight: '#8d4bff',
    slot: 'rgba(170,110,255,0.09)',
    text: '#ffffff',
    palette: ['#ff2fd1', '#ffb400', '#39ff88', '#2ee6ff', '#a25bff', '#ff5a36', '#00ffd5', '#f7ff3c'],
    shard: 'spark',
  },
  {
    id: 'candy',
    bgTop: '#4c8ff0',
    bgBottom: '#1d3f96',
    glow: ['#ffffff', '#ffd1f0', '#9ff0ff'],
    well: '#183a82',
    wellCell: '#21479a',
    frame: '#5c9cf2',
    frameLight: '#a8d0ff',
    slot: 'rgba(255,255,255,0.12)',
    text: '#ffffff',
    palette: ['#ff6aa6', '#ffbf55', '#55eeaa', '#7fd2ff', '#c497ff', '#ff9260', '#63f4ea', '#fff06b'],
    shard: 'chunk',
  },
];

export const STYLE_COUNT = THEMES.length;
export const PALETTE_SIZE = 8;

/** Draw one block of `size` px at (0,0) in the given style. */
export function drawBlock(ctx: CanvasRenderingContext2D, theme: Theme, color: string, s: number): void {
  const p = Math.max(1, s * 0.04); // gap between neighbours
  const x = p;
  const y = p;
  const w = s - p * 2;
  switch (theme.id) {
    case 'jelly': {
      const r = w * 0.24;
      roundRect(ctx, x, y + w * 0.04, w, w * 0.96, r);
      ctx.fillStyle = shade(color, -0.35);
      ctx.fill();
      roundRect(ctx, x, y, w, w * 0.9, r);
      const g = ctx.createLinearGradient(0, y, 0, y + w);
      g.addColorStop(0, shade(color, 0.35));
      g.addColorStop(0.5, color);
      g.addColorStop(1, shade(color, -0.15));
      ctx.fillStyle = g;
      ctx.fill();
      // glossy highlight
      ctx.beginPath();
      ctx.ellipse(x + w * 0.38, y + w * 0.24, w * 0.26, w * 0.13, -0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + w * 0.74, y + w * 0.2, w * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();
      break;
    }
    case 'crystal': {
      const b = w * 0.2; // bevel width
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, w);
      const facet = (pts: number[], c: string) => {
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.closePath();
        ctx.fillStyle = c;
        ctx.fill();
      };
      facet([x, y, x + w, y, x + w - b, y + b, x + b, y + b], shade(color, 0.45));
      facet([x, y, x + b, y + b, x + b, y + w - b, x, y + w], shade(color, 0.22));
      facet([x + w, y, x + w, y + w, x + w - b, y + w - b, x + w - b, y + b], shade(color, -0.25));
      facet([x, y + w, x + b, y + w - b, x + w - b, y + w - b, x + w, y + w], shade(color, -0.45));
      const g = ctx.createLinearGradient(x + b, y + b, x + w - b, y + w - b);
      g.addColorStop(0, shade(color, 0.2));
      g.addColorStop(1, shade(color, -0.1));
      ctx.fillStyle = g;
      ctx.fillRect(x + b, y + b, w - 2 * b, w - 2 * b);
      // inner diagonal glint
      facet([x + b, y + b, x + b + w * 0.25, y + b, x + b, y + b + w * 0.25], 'rgba(255,255,255,0.45)');
      break;
    }
    case 'clay': {
      const r = w * 0.16;
      roundRect(ctx, x, y, w, w, r);
      ctx.fillStyle = shade(color, -0.28);
      ctx.fill();
      roundRect(ctx, x, y, w * 0.97, w * 0.93, r);
      ctx.fillStyle = color;
      ctx.fill();
      // soft emboss
      roundRect(ctx, x + w * 0.08, y + w * 0.07, w * 0.8, w * 0.72, r * 0.8);
      const g = ctx.createLinearGradient(x, y, x + w, y + w);
      g.addColorStop(0, rgba(shade(color, 0.4), 0.55));
      g.addColorStop(1, rgba(shade(color, -0.1), 0));
      ctx.fillStyle = g;
      ctx.fill();
      // speckles
      let seed = (color.charCodeAt(1) * 31 + Math.round(s)) >>> 0;
      const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.arc(x + w * (0.15 + rnd() * 0.7), y + w * (0.15 + rnd() * 0.65), Math.max(0.6, w * 0.025), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'neon': {
      const r = w * 0.18;
      const lw = Math.max(1.5, w * 0.09);
      ctx.save();
      roundRect(ctx, x + lw / 2, y + lw / 2, w - lw, w - lw, r);
      ctx.fillStyle = rgba(color, 0.18);
      ctx.fill();
      ctx.shadowColor = color;
      ctx.shadowBlur = w * 0.35;
      ctx.lineWidth = lw;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(1, lw * 0.35);
      ctx.strokeStyle = shade(color, 0.7);
      ctx.stroke();
      roundRect(ctx, x + w * 0.3, y + w * 0.3, w * 0.4, w * 0.4, r * 0.5);
      ctx.fillStyle = rgba(color, 0.55);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'candy': {
      const r = w * 0.32;
      roundRect(ctx, x, y, w, w, r);
      const g = ctx.createLinearGradient(x, y, x + w, y + w);
      g.addColorStop(0, shade(color, 0.3));
      g.addColorStop(0.55, color);
      g.addColorStop(1, shade(color, -0.25));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.save();
      roundRect(ctx, x, y, w, w, r);
      ctx.clip();
      // diagonal candy stripes
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      for (let i = -2; i < 4; i++) {
        ctx.beginPath();
        const o = i * w * 0.42;
        ctx.moveTo(x + o, y + w);
        ctx.lineTo(x + o + w * 0.18, y + w);
        ctx.lineTo(x + o + w * 0.18 + w, y);
        ctx.lineTo(x + o + w, y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      roundRect(ctx, x + w * 0.12, y + w * 0.08, w * 0.76, w * 0.3, r * 0.6);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fill();
      roundRect(ctx, x, y, w, w, r);
      ctx.lineWidth = Math.max(1, w * 0.05);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.stroke();
      break;
    }
  }
}

/** Crystal collectible drawn on top of a block, centered at (0,0) with radius r. */
export function drawGem(ctx: CanvasRenderingContext2D, r: number): void {
  const top = -r;
  const mid = -r * 0.25;
  const bot = r;
  const wd = r * 0.95;
  ctx.save();
  ctx.shadowColor = 'rgba(255,255,255,0.9)';
  ctx.shadowBlur = r * 0.8;
  ctx.beginPath();
  ctx.moveTo(-wd * 0.55, top);
  ctx.lineTo(wd * 0.55, top);
  ctx.lineTo(wd, mid);
  ctx.lineTo(0, bot);
  ctx.lineTo(-wd, mid);
  ctx.closePath();
  const g = ctx.createLinearGradient(-wd, top, wd, bot);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, '#8ff6ff');
  g.addColorStop(0.7, '#5b8cff');
  g.addColorStop(1, '#d25bff');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();
  // facets
  ctx.beginPath();
  ctx.moveTo(-wd, mid);
  ctx.lineTo(wd, mid);
  ctx.moveTo(-wd * 0.55, top);
  ctx.lineTo(-wd * 0.25, mid);
  ctx.lineTo(0, bot);
  ctx.moveTo(wd * 0.55, top);
  ctx.lineTo(wd * 0.25, mid);
  ctx.lineTo(0, bot);
  ctx.moveTo(-wd * 0.25, mid);
  ctx.lineTo(0, top);
  ctx.lineTo(wd * 0.25, mid);
  ctx.lineWidth = Math.max(0.6, r * 0.05);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-wd * 0.45, top + r * 0.12);
  ctx.lineTo(-wd * 0.1, top + r * 0.12);
  ctx.lineTo(-wd * 0.35, mid - r * 0.05);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
}

export function drawEmptyCell(ctx: CanvasRenderingContext2D, theme: Theme, s: number): void {
  const p = s * 0.08;
  roundRect(ctx, p, p, s - p * 2, s - p * 2, s * 0.18);
  ctx.fillStyle = theme.wellCell;
  ctx.fill();
}
