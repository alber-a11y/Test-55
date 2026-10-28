import Phaser from 'phaser';
import { artRng, canvasTexture, circle, type Ctx, ellipse, mix, rgba, star } from './canvas';

export type RailKind = 'bamboo' | 'stone' | 'gold' | 'candy' | 'wood';
export type Particles = 'leaves' | 'fireflies' | 'petals' | 'confetti' | 'sparkles' | 'spray';

export interface Theme {
  id: string;
  sky: [string, string, string];
  sun: { color: string; x: number; y: number; r: number; moon?: boolean } | null;
  far: string;
  mid: string;
  near: string;
  leaf: string;
  fog: string;
  feature: 'none' | 'mountains' | 'waterfall' | 'temple' | 'river' | 'roots' | 'garlands' | 'pyramid';
  lane: { a: string; b: string; line: string; edge: string };
  rail: { kind: RailKind; a: string; b: string };
  particles: Particles;
  stars?: boolean;
}

export const THEMES: Record<string, Theme> = {
  jungle: {
    id: 'jungle',
    sky: ['#7fd6ff', '#bff0ff', '#d9ffd0'],
    sun: { color: '#fff7c0', x: 0.78, y: 0.1, r: 0.09 },
    far: '#3f9a6a',
    mid: '#2e7d4a',
    near: '#1f6b35',
    leaf: '#36a845',
    fog: 'rgba(220,255,220,0.35)',
    feature: 'mountains',
    lane: { a: '#d9954f', b: '#c4803d', line: '#9a5a26', edge: '#7a4219' },
    rail: { kind: 'bamboo', a: '#e8c35a', b: '#a8862c' },
    particles: 'leaves',
  },
  sunset: {
    id: 'sunset',
    sky: ['#5b2c83', '#ff7a59', '#ffd27a'],
    sun: { color: '#fff1a8', x: 0.3, y: 0.3, r: 0.12 },
    far: '#7a3b6e',
    mid: '#4a2350',
    near: '#2c1438',
    leaf: '#5a2d63',
    fog: 'rgba(255,180,140,0.3)',
    feature: 'river',
    lane: { a: '#c98a55', b: '#b37442', line: '#82502a', edge: '#5e3418' },
    rail: { kind: 'wood', a: '#9a5a2c', b: '#5e3418' },
    particles: 'petals',
  },
  mangrove: {
    id: 'mangrove',
    sky: ['#9fd8c8', '#d6f0d0', '#eef7cc'],
    sun: { color: '#ffffe0', x: 0.2, y: 0.12, r: 0.07 },
    far: '#79a882',
    mid: '#4f7f55',
    near: '#2f5a34',
    leaf: '#5c9a3c',
    fog: 'rgba(230,255,235,0.5)',
    feature: 'roots',
    lane: { a: '#b8905c', b: '#a27a48', line: '#73522c', edge: '#4f3519' },
    rail: { kind: 'bamboo', a: '#c9b45a', b: '#8a7a2c' },
    particles: 'leaves',
  },
  waterfall: {
    id: 'waterfall',
    sky: ['#4fb8ff', '#a8e6ff', '#d6fbff'],
    sun: null,
    far: '#3b8f86',
    mid: '#2a6e66',
    near: '#1b5248',
    leaf: '#2fa060',
    fog: 'rgba(230,250,255,0.5)',
    feature: 'waterfall',
    lane: { a: '#a8a39a', b: '#959086', line: '#6e6a62', edge: '#4f4b45' },
    rail: { kind: 'stone', a: '#a7b0ad', b: '#5f6866' },
    particles: 'spray',
  },
  temple: {
    id: 'temple',
    sky: ['#f5c26b', '#ffe0a0', '#e8f0c0'],
    sun: { color: '#fffbe0', x: 0.5, y: 0.16, r: 0.1 },
    far: '#a48a5c',
    mid: '#7a6a3e',
    near: '#4f5a2a',
    leaf: '#5aa03a',
    fog: 'rgba(255,240,200,0.35)',
    feature: 'temple',
    lane: { a: '#c8b48a', b: '#b39f76', line: '#86744f', edge: '#5e5136' },
    rail: { kind: 'stone', a: '#c2b08a', b: '#7a6a4a' },
    particles: 'leaves',
  },
  night: {
    id: 'night',
    sky: ['#0a1238', '#1b2f6b', '#2b5a6e'],
    sun: { color: '#f4f7ff', x: 0.75, y: 0.12, r: 0.07, moon: true },
    far: '#16384a',
    mid: '#0f2a36',
    near: '#081c24',
    leaf: '#1d5a44',
    fog: 'rgba(120,200,220,0.18)',
    feature: 'mountains',
    lane: { a: '#7a5a42', b: '#6a4c36', line: '#4a3222', edge: '#2e1e14' },
    rail: { kind: 'bamboo', a: '#8aa05a', b: '#4a5a2c' },
    particles: 'fireflies',
    stars: true,
  },
  carnival: {
    id: 'carnival',
    sky: ['#ff5fb7', '#ffb35f', '#ffe66b'],
    sun: { color: '#ffffff', x: 0.82, y: 0.12, r: 0.06 },
    far: '#c2408a',
    mid: '#8a2b78',
    near: '#4a1d5a',
    leaf: '#29b36a',
    fog: 'rgba(255,230,250,0.3)',
    feature: 'garlands',
    lane: { a: '#f2c070', b: '#e3a955', line: '#b07a2c', edge: '#7a4f14' },
    rail: { kind: 'candy', a: '#ffffff', b: '#ff3d6e' },
    particles: 'confetti',
  },
  eldorado: {
    id: 'eldorado',
    sky: ['#b8740c', '#ffcc4a', '#fff2b0'],
    sun: { color: '#fffde8', x: 0.5, y: 0.08, r: 0.13 },
    far: '#c08a24',
    mid: '#8a5f12',
    near: '#5a3c08',
    leaf: '#7aa02a',
    fog: 'rgba(255,240,180,0.4)',
    feature: 'pyramid',
    lane: { a: '#ffd25a', b: '#f2b83a', line: '#c08a1c', edge: '#8a5a08' },
    rail: { kind: 'gold', a: '#fff0a0', b: '#c08a1c' },
    particles: 'sparkles',
  },
};

export function theme(id: string): Theme {
  return THEMES[id] ?? THEMES.jungle;
}

// ── Foliage primitives ────────────────────────────────────────────────

export function palmFrond(ctx: Ctx, x: number, y: number, len: number, ang: number, color: string, droop = 0.5): void {
  const ex = x + Math.cos(ang) * len;
  const ey = y + Math.sin(ang) * len;
  const cx = x + Math.cos(ang) * len * 0.5;
  const cy = y + Math.sin(ang) * len * 0.5 - len * 0.25 * (1 - droop) + len * 0.2 * droop;
  ctx.fillStyle = color;
  for (let t = 0.1; t < 0.98; t += 0.06) {
    const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * ex;
    const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ey;
    const l = len * 0.3 * Math.sin(Math.PI * Math.min(1, t * 1.05)) + 4;
    for (const side of [-1, 1]) {
      const a = ang + side * (1.15 - t * 0.3) + 0.45 * droop;
      ctx.save();
      ctx.translate(px + Math.cos(a) * l * 0.5, py + Math.sin(a) * l * 0.5);
      ctx.rotate(a);
      ellipse(ctx, 0, 0, l * 0.55, Math.max(2.5, l * 0.16));
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.strokeStyle = mix(color, '#ffffff', 0.25);
  ctx.lineWidth = Math.max(1.5, len * 0.02);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(cx, cy, ex, ey);
  ctx.stroke();
}

export function monstera(target: Ctx, x: number, y: number, r: number, ang: number, color: string): void {
  // Leaf cuts are punched out on an offscreen canvas so they never erase the backdrop behind.
  const size = Math.ceil(r * 2.4);
  const off = document.createElement('canvas');
  off.width = off.height = size;
  const ctx = off.getContext('2d')!;
  ctx.translate(size / 2, size / 2);
  ctx.rotate(ang);
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  g.addColorStop(0, mix(color, '#ffffff', 0.15));
  g.addColorStop(1, mix(color, '#000000', 0.25));
  ctx.fillStyle = g;
  ellipse(ctx, 0, 0, r, r * 0.8);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const a = (i / 3.5) * 1.3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.35 * Math.sign(i), Math.sin(a) * r * 0.35);
    ctx.lineTo(Math.cos(a) * r * 1.1 * Math.sign(i), Math.sin(a) * r * 1.0 - 4);
    ctx.lineTo(Math.cos(a) * r * 1.1 * Math.sign(i), Math.sin(a) * r * 1.0 + 4);
    ctx.closePath();
    ctx.fill();
    ellipse(ctx, Math.cos(a) * r * 0.62 * Math.sign(i), Math.sin(a) * r * 0.55, r * 0.06, r * 0.04);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = mix(color, '#000000', 0.3);
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r * 0.9, 0);
  ctx.stroke();
  target.drawImage(off, x - size / 2, y - size / 2);
}

function canopy(ctx: Ctx, w: number, y: number, amp: number, color: string, seed: number, h: number): void {
  const rnd = artRng(seed);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, y);
  let x = 0;
  while (x < w + 40) {
    const r = amp * (0.6 + rnd() * 0.8);
    ctx.arc(x + r * 0.8, y - rnd() * amp * 0.6, r, Math.PI, 0);
    x += r * 1.4;
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function feature(ctx: Ctx, t: Theme, w: number, h: number): void {
  const horizon = h * 0.42;
  switch (t.feature) {
    case 'mountains':
      ctx.fillStyle = rgba(mix(t.far, t.sky[1], 0.5), 0.9);
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      for (let i = 0; i <= 6; i++) ctx.lineTo((w * i) / 6, horizon - (i % 2 ? h * 0.16 : h * 0.07));
      ctx.lineTo(w, horizon + 40);
      ctx.lineTo(0, horizon + 40);
      ctx.fill();
      break;
    case 'waterfall': {
      ctx.fillStyle = mix(t.far, '#555555', 0.3);
      ctx.fillRect(w * 0.3, h * 0.12, w * 0.4, horizon);
      const g = ctx.createLinearGradient(0, h * 0.12, 0, horizon + 60);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(1, 'rgba(160,230,255,0.85)');
      ctx.fillStyle = g;
      ctx.fillRect(w * 0.42, h * 0.12, w * 0.16, horizon);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const x = w * 0.43 + (i * w * 0.14) / 8;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.12);
        ctx.lineTo(x, horizon + 40);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ellipse(ctx, w * 0.5, horizon + 40, w * 0.16, 26);
      ctx.fill();
      break;
    }
    case 'temple':
    case 'pyramid': {
      const gold = t.feature === 'pyramid';
      const base = gold ? '#e0a52a' : '#9c8a62';
      const cx = w * 0.5;
      for (let i = 0; i < 6; i++) {
        const ww = w * (0.46 - i * 0.065);
        ctx.fillStyle = mix(base, '#000000', 0.1 + (i % 2) * 0.08);
        ctx.fillRect(cx - ww / 2, horizon - (i + 1) * h * 0.035, ww, h * 0.035 + 1);
      }
      ctx.fillStyle = mix(base, '#000000', 0.35);
      ctx.fillRect(cx - w * 0.04, horizon - h * 0.26, w * 0.08, h * 0.05);
      if (gold) {
        ctx.fillStyle = 'rgba(255,255,220,0.8)';
        star(ctx, cx, horizon - h * 0.29, 22, 8, 8);
        ctx.fill();
      }
      break;
    }
    case 'river': {
      const g = ctx.createLinearGradient(0, horizon - 20, 0, h);
      g.addColorStop(0, 'rgba(255,200,140,0.9)');
      g.addColorStop(1, 'rgba(120,60,120,0.9)');
      ctx.fillStyle = g;
      ctx.fillRect(0, horizon - 10, w, h);
      ctx.strokeStyle = 'rgba(255,240,180,0.6)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 10; i++) {
        const y = horizon + i * 16;
        ctx.beginPath();
        ctx.moveTo(w * 0.3 - i * 6, y);
        ctx.lineTo(w * 0.3 + 40 + i * 4, y);
        ctx.stroke();
      }
      break;
    }
    case 'roots':
      ctx.strokeStyle = mix(t.mid, '#000000', 0.2);
      ctx.lineWidth = 8;
      for (let i = 0; i < 9; i++) {
        const x = (w * (i + 0.5)) / 9;
        ctx.beginPath();
        ctx.moveTo(x - 30, horizon + 60);
        ctx.quadraticCurveTo(x, horizon - 40, x + 30, horizon + 60);
        ctx.stroke();
      }
      break;
    case 'garlands': {
      const cols = ['#ff2d3d', '#ffd60a', '#2fcb3a', '#18c8e8', '#9a3dff'];
      for (let row = 0; row < 3; row++) {
        const y0 = h * (0.05 + row * 0.08);
        ctx.strokeStyle = 'rgba(80,40,60,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y0);
        ctx.quadraticCurveTo(w / 2, y0 + 60, w, y0);
        ctx.stroke();
        for (let i = 0; i < 14; i++) {
          const tt = i / 13;
          const x = tt * w;
          const y = (1 - tt) * (1 - tt) * y0 + 2 * (1 - tt) * tt * (y0 + 60) + tt * tt * y0;
          ctx.fillStyle = cols[(i + row) % cols.length];
          ctx.beginPath();
          ctx.moveTo(x - 9, y);
          ctx.lineTo(x + 9, y);
          ctx.lineTo(x, y + 20);
          ctx.closePath();
          ctx.fill();
        }
      }
      break;
    }
  }
}

/** Full-screen backdrop for a theme at the given logical size. */
export function drawBackdrop(ctx: Ctx, t: Theme, w: number, h: number, seed = 1): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, t.sky[0]);
  g.addColorStop(0.45, t.sky[1]);
  g.addColorStop(1, t.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  if (t.stars) {
    const rnd = artRng(seed + 99);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 140; i++) {
      ctx.globalAlpha = 0.3 + rnd() * 0.7;
      circle(ctx, rnd() * w, rnd() * h * 0.45, rnd() * 1.6 + 0.4);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (t.sun) {
    const sx = t.sun.x * w;
    const sy = t.sun.y * h;
    const sr = t.sun.r * Math.min(w, h * 0.6);
    const sg = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 3.5);
    sg.addColorStop(0, rgba(t.sun.color, 0.8));
    sg.addColorStop(1, rgba(t.sun.color, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = t.sun.color;
    circle(ctx, sx, sy, sr);
    ctx.fill();
    if (t.sun.moon) {
      ctx.fillStyle = 'rgba(180,190,220,0.5)';
      circle(ctx, sx - sr * 0.3, sy - sr * 0.2, sr * 0.2);
      ctx.fill();
      circle(ctx, sx + sr * 0.3, sy + sr * 0.3, sr * 0.13);
      ctx.fill();
    } else {
      // Light rays.
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 0.35 + i * 0.12;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(a) * h * 1.2 - 40, sy + Math.sin(a) * h * 1.2);
        ctx.lineTo(sx + Math.cos(a) * h * 1.2 + 40, sy + Math.sin(a) * h * 1.2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }
  feature(ctx, t, w, h);
  canopy(ctx, w, h * 0.44, 34, rgba(t.far, 0.9), seed + 1, h);
  canopy(ctx, w, h * 0.52, 46, t.mid, seed + 2, h);
  // Palm trees in the mid layer.
  const rnd = artRng(seed + 3);
  const palms = Math.max(3, Math.round(w / 260));
  for (let i = 0; i < palms; i++) {
    const x = ((i + 0.5) / palms) * w + (rnd() - 0.5) * 80;
    const top = h * (0.18 + rnd() * 0.12);
    ctx.strokeStyle = mix(t.mid, '#3a2410', 0.5);
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.6);
    ctx.quadraticCurveTo(x + 30 * (rnd() - 0.5), (top + h * 0.6) / 2, x, top);
    ctx.stroke();
    for (let k = 0; k < 7; k++) palmFrond(ctx, x, top, 90 + rnd() * 40, -Math.PI + (k / 6) * Math.PI + (rnd() - 0.5) * 0.3, mix(t.leaf, t.mid, 0.4), 0.7);
  }
  canopy(ctx, w, h * 0.66, 60, t.near, seed + 4, h);
  // Fog band.
  const f = ctx.createLinearGradient(0, h * 0.45, 0, h * 0.75);
  f.addColorStop(0, 'rgba(255,255,255,0)');
  f.addColorStop(0.5, t.fog);
  f.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = f;
  ctx.fillRect(0, 0, w, h);
  // Foreground leaves at the sides and hanging vines.
  for (const side of [0, 1]) {
    const x = side ? w + 10 : -10;
    for (let k = 0; k < 5; k++) {
      const y = h * (0.12 + k * 0.2) + rnd() * 50;
      monstera(ctx, x, y, 70 + rnd() * 40, side ? Math.PI + 0.3 - rnd() * 0.6 : -0.3 + rnd() * 0.6, mix(t.leaf, t.near, rnd() * 0.5));
      if (k % 2 === 0) palmFrond(ctx, x, y + 40, 150, side ? Math.PI - 0.3 : 0.3, mix(t.leaf, '#ffffff', 0.12), 0.8);
    }
  }
  ctx.strokeStyle = mix(t.near, t.leaf, 0.4);
  ctx.lineWidth = 4;
  for (let i = 0; i < Math.round(w / 120); i++) {
    const x = rnd() * w;
    const len = h * (0.08 + rnd() * 0.18);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + 20, len / 2, x - 6, len);
    ctx.stroke();
    ctx.fillStyle = t.leaf;
    for (let k = 0; k < 4; k++) {
      ellipse(ctx, x + (k % 2 ? 8 : -6), (len * (k + 1)) / 5, 9, 4.5, k % 2 ? 0.5 : -0.5);
      ctx.fill();
    }
  }
}

/** Ensure a backdrop texture of the given size exists; returns its key. */
export function backdropTexture(scene: Phaser.Scene, themeId: string, w: number, h: number): string {
  const key = `bd_${themeId}_${Math.round(w)}x${Math.round(h)}`;
  if (!scene.textures.exists(key)) canvasTexture(scene, key, w, h, (ctx) => drawBackdrop(ctx, theme(themeId), w, h, 7));
  return key;
}

/** Small preview card of a theme (shop). */
export function backdropThumb(scene: Phaser.Scene, themeId: string): string {
  const key = `bdt_${themeId}`;
  if (!scene.textures.exists(key))
    canvasTexture(scene, key, 300, 420, (ctx) => {
      ctx.save();
      ctx.scale(0.5, 0.5);
      drawBackdrop(ctx, theme(themeId), 600, 840, 7);
      ctx.restore();
      const t = theme(themeId);
      // Mini lane.
      ctx.fillStyle = t.lane.a;
      ctx.beginPath();
      ctx.moveTo(110, 200);
      ctx.lineTo(190, 200);
      ctx.lineTo(270, 420);
      ctx.lineTo(30, 420);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = t.rail.a;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(108, 200);
      ctx.lineTo(26, 420);
      ctx.moveTo(192, 200);
      ctx.lineTo(274, 420);
      ctx.stroke();
    });
  return key;
}

/** Decorations for the level map. */
export function makeDecoTextures(scene: Phaser.Scene): void {
  canvasTexture(scene, 'd_palm', 180, 220, (ctx) => {
    ctx.strokeStyle = '#8a5a2c';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(90, 215);
    ctx.quadraticCurveTo(70, 140, 92, 60);
    ctx.stroke();
    ctx.strokeStyle = '#6a4220';
    ctx.lineWidth = 2;
    for (let y = 80; y < 210; y += 14) {
      ctx.beginPath();
      ctx.moveTo(76, y);
      ctx.lineTo(96, y + 3);
      ctx.stroke();
    }
    for (let k = 0; k < 7; k++) palmFrond(ctx, 92, 60, 80, -Math.PI + (k / 6) * Math.PI, k % 2 ? '#3cb043' : '#2e9a3a', 0.7);
    ctx.fillStyle = '#7a4a1c';
    for (const [x, y] of [
      [86, 66],
      [98, 68],
    ])
      circle(ctx, x, y, 7), ctx.fill();
  });
  canvasTexture(scene, 'd_bush', 160, 100, (ctx) => {
    const cols = ['#2e8a3a', '#3cb043', '#56c94a'];
    for (const [x, y, r, c] of [
      [40, 70, 36, 0],
      [120, 70, 36, 0],
      [80, 55, 44, 1],
      [55, 50, 26, 2],
      [108, 48, 24, 2],
    ] as const) {
      ctx.fillStyle = cols[c];
      circle(ctx, x, y, r);
      ctx.fill();
    }
    ctx.fillStyle = '#ff47b0';
    for (const [x, y] of [
      [50, 40],
      [96, 30],
      [120, 58],
    ])
      star(ctx, x, y, 7, 3, 5), ctx.fill();
  });
  canvasTexture(scene, 'd_monstera', 150, 130, (ctx) => {
    monstera(ctx, 50, 80, 46, -0.6, '#2fa04a');
    monstera(ctx, 100, 70, 50, 0.5, '#3cb85a');
  });
  canvasTexture(scene, 'd_rock', 120, 80, (ctx) => {
    const g = ctx.createLinearGradient(0, 10, 0, 80);
    g.addColorStop(0, '#c9cdd6');
    g.addColorStop(1, '#6b7080');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(10, 75);
    ctx.quadraticCurveTo(20, 15, 60, 12);
    ctx.quadraticCurveTo(105, 18, 112, 75);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(80,170,60,0.9)';
    ellipse(ctx, 50, 18, 26, 8);
    ctx.fill();
  });
  canvasTexture(scene, 'd_flower', 70, 80, (ctx) => {
    ctx.strokeStyle = '#2e8a3a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(35, 78);
    ctx.lineTo(35, 34);
    ctx.stroke();
    ctx.fillStyle = '#3cb043';
    ellipse(ctx, 24, 60, 12, 5, 0.5);
    ctx.fill();
    ctx.fillStyle = '#ff47b0';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ellipse(ctx, 35 + Math.cos(a) * 12, 30 + Math.sin(a) * 12, 10, 7, a);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd60a';
    circle(ctx, 35, 30, 7);
    ctx.fill();
  });
  canvasTexture(scene, 'd_mush', 70, 70, (ctx) => {
    ctx.fillStyle = '#f2e6c8';
    ctx.fillRect(28, 34, 14, 32);
    ctx.fillStyle = '#ff2d3d';
    ellipse(ctx, 35, 34, 30, 20);
    ctx.fill();
    ctx.fillStyle = '#fff';
    for (const [x, y, r] of [
      [24, 28, 5],
      [42, 22, 4],
      [48, 36, 4],
      [30, 40, 3],
    ])
      circle(ctx, x, y, r), ctx.fill();
  });
  canvasTexture(scene, 'd_lily', 90, 50, (ctx) => {
    ctx.fillStyle = '#2fae4a';
    ctx.beginPath();
    ctx.ellipse(45, 26, 42, 20, 0, 0.25, Math.PI * 2);
    ctx.lineTo(45, 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffc2e6';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ellipse(ctx, 58 + Math.cos(a) * 7, 18 + Math.sin(a) * 4, 7, 4, a);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd60a';
    circle(ctx, 58, 18, 3.5);
    ctx.fill();
  });
}
