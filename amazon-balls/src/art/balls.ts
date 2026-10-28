import Phaser from 'phaser';
import { BALL_COLORS, type BallColor } from '../data/colors';
import { BALL_SKINS } from '../data/cosmetics';
import { artRng, canvasTexture, circle, type Ctx, ellipse, mix, rgba, star } from './canvas';

/** Ball textures are BALL_TEX px square with the sphere radius BALL_R. */
export const BALL_TEX = 96;
export const BALL_R = 40;
const C = BALL_TEX / 2;

export const ballKey = (skin: string, color: number) => `ball_${skin}_${color}`;

// ── Shared pieces ─────────────────────────────────────────────────────

function sphere(ctx: Ctx, col: BallColor, r = BALL_R, x = C, y = C): void {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r * 1.05);
  g.addColorStop(0, col.light);
  g.addColorStop(0.3, col.base);
  g.addColorStop(0.82, mix(col.base, col.dark, 0.55));
  g.addColorStop(1, col.dark);
  ctx.fillStyle = g;
  circle(ctx, x, y, r);
  ctx.fill();
  // Bounce light at the bottom.
  const b = ctx.createRadialGradient(x, y + r * 0.95, 0, x, y + r * 0.7, r * 0.7);
  b.addColorStop(0, rgba(col.light, 0.45));
  b.addColorStop(1, rgba(col.light, 0));
  ctx.fillStyle = b;
  circle(ctx, x, y, r);
  ctx.fill();
}

function specular(ctx: Ctx, r = BALL_R, x = C, y = C, a = 0.95): void {
  const hx = x - r * 0.36;
  const hy = y - r * 0.44;
  const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.42);
  g.addColorStop(0, `rgba(255,255,255,${a})`);
  g.addColorStop(0.55, `rgba(255,255,255,${a * 0.35})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ellipse(ctx, hx, hy, r * 0.42, r * 0.3, -0.6);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ellipse(ctx, hx - r * 0.02, hy - r * 0.02, r * 0.16, r * 0.09, -0.6);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${a * 0.6})`;
  circle(ctx, x + r * 0.42, y + r * 0.38, r * 0.06);
  ctx.fill();
}

function rim(ctx: Ctx, col: BallColor, r = BALL_R): void {
  ctx.strokeStyle = rgba(col.dark, 0.55);
  ctx.lineWidth = 2;
  circle(ctx, C, C, r - 1);
  ctx.stroke();
}

function clipBall(ctx: Ctx, r = BALL_R): void {
  circle(ctx, C, C, r);
  ctx.clip();
}

function eyes(ctx: Ctx, dx: number, y: number, rx: number, ry: number): void {
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#1d1430';
    ellipse(ctx, C + s * dx, y, rx, ry);
    ctx.fill();
    ctx.fillStyle = '#fff';
    circle(ctx, C + s * dx - rx * 0.3, y - ry * 0.35, rx * 0.42);
    ctx.fill();
  }
}

// ── Skins ─────────────────────────────────────────────────────────────

type SkinDraw = (ctx: Ctx, col: BallColor, idx: number) => void;

const SKINS: Record<string, SkinDraw> = {
  glossy(ctx, col) {
    sphere(ctx, col);
    rim(ctx, col);
    specular(ctx);
  },

  candy(ctx, col) {
    sphere(ctx, col);
    ctx.save();
    clipBall(ctx);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 7;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.02) {
        const a = t * Math.PI * 2.2 + (k * Math.PI * 2) / 3;
        const rr = t * BALL_R * 1.1;
        const x = C + Math.cos(a) * rr;
        const y = C + Math.sin(a) * rr;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    rim(ctx, col);
    specular(ctx);
  },

  smile(ctx, col) {
    sphere(ctx, col);
    rim(ctx, col);
    eyes(ctx, 12, C - 4, 5, 7.5);
    ctx.strokeStyle = '#1d1430';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(C, C + 6, 13, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,150,0.55)';
    ellipse(ctx, C - 22, C + 8, 6, 4);
    ctx.fill();
    ellipse(ctx, C + 22, C + 8, 6, 4);
    ctx.fill();
    specular(ctx, BALL_R, C, C, 0.8);
  },

  gem(ctx, col) {
    const n = 8;
    const pts = (rad: number, off = 0) =>
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + off - Math.PI / 2;
        return [C + Math.cos(a) * rad, C + Math.sin(a) * rad] as [number, number];
      });
    const outer = pts(BALL_R + 1, Math.PI / n);
    const inner = pts(BALL_R * 0.5, Math.PI / n);
    const shades = [col.light, col.base, mix(col.base, col.dark, 0.4), col.dark, mix(col.base, col.dark, 0.6), col.base, mix(col.light, col.base, 0.5), col.light];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      ctx.fillStyle = shades[i];
      ctx.beginPath();
      ctx.moveTo(...outer[i]);
      ctx.lineTo(...outer[j]);
      ctx.lineTo(...inner[j]);
      ctx.lineTo(...inner[i]);
      ctx.closePath();
      ctx.fill();
    }
    const g = ctx.createLinearGradient(C - 20, C - 20, C + 20, C + 20);
    g.addColorStop(0, col.light);
    g.addColorStop(1, col.base);
    ctx.fillStyle = g;
    ctx.beginPath();
    inner.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(col.dark, 0.7);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    outer.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    star(ctx, C - 10, C - 12, 8, 2.5, 4, 0);
    ctx.fill();
  },

  fruit(ctx, col, idx) {
    sphere(ctx, col);
    ctx.save();
    clipBall(ctx);
    const rnd = artRng(idx + 7);
    if (idx === 1) {
      ctx.fillStyle = rgba(col.dark, 0.25);
      for (let i = 0; i < 60; i++) {
        circle(ctx, C + (rnd() - 0.5) * 80, C + (rnd() - 0.5) * 80, 1.4);
        ctx.fill();
      }
    } else if (idx === 3) {
      ctx.fillStyle = 'rgba(240,255,220,0.9)';
      circle(ctx, C, C, BALL_R * 0.78);
      ctx.fill();
      ctx.fillStyle = col.base;
      circle(ctx, C, C, BALL_R * 0.7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(240,255,220,0.9)';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(C, C);
        ctx.lineTo(C + Math.cos(a) * BALL_R * 0.7, C + Math.sin(a) * BALL_R * 0.7);
        ctx.stroke();
      }
    } else if (idx === 6) {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const gx = C + Math.cos(a) * 20;
        const gy = C + Math.sin(a) * 20;
        const g = ctx.createRadialGradient(gx - 4, gy - 4, 1, gx, gy, 13);
        g.addColorStop(0, col.light);
        g.addColorStop(0.5, col.base);
        g.addColorStop(1, col.dark);
        ctx.fillStyle = g;
        circle(ctx, gx, gy, 13);
        ctx.fill();
      }
    } else if (idx === 7) {
      ctx.strokeStyle = rgba(col.dark, 0.5);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(C + 4, C - BALL_R);
      ctx.quadraticCurveTo(C - 8, C, C + 4, C + BALL_R);
      ctx.stroke();
    } else if (idx === 4) {
      ctx.fillStyle = rgba(col.dark, 0.7);
      star(ctx, C, C - BALL_R * 0.72, 9, 4, 5);
      ctx.fill();
    }
    ctx.restore();
    rim(ctx, col);
    specular(ctx, BALL_R, C, C, 0.85);
    if (idx !== 3 && idx !== 6) {
      // Stem and leaf.
      ctx.strokeStyle = '#5a3417';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(C, C - BALL_R + 6);
      ctx.lineTo(C + 2, C - BALL_R - 3);
      ctx.stroke();
      ctx.fillStyle = '#3cc23c';
      ellipse(ctx, C + 13, C - BALL_R - 1, 11, 5, -0.4);
      ctx.fill();
      ctx.strokeStyle = '#1f7a22';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(C + 4, C - BALL_R + 2);
      ctx.lineTo(C + 22, C - BALL_R - 5);
      ctx.stroke();
    }
  },

  beetle(ctx, col) {
    // Legs.
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const s of [-1, 1])
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(C + s * 26, C - 8 + i * 14);
        ctx.lineTo(C + s * 45, C - 14 + i * 16);
        ctx.stroke();
      }
    // Head.
    ctx.fillStyle = '#2a1a10';
    circle(ctx, C, C - BALL_R + 6, 13);
    ctx.fill();
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(C + s * 5, C - BALL_R - 2);
      ctx.quadraticCurveTo(C + s * 14, C - BALL_R - 12, C + s * 20, C - BALL_R - 6);
      ctx.stroke();
    }
    sphere(ctx, col, BALL_R - 3, C, C + 3);
    ctx.strokeStyle = rgba(col.dark, 0.9);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(C, C - BALL_R + 2);
    ctx.lineTo(C, C + BALL_R);
    ctx.stroke();
    ctx.fillStyle = rgba(col.dark, 0.75);
    for (const [x, y, r] of [
      [-14, -6, 6],
      [15, -2, 5],
      [-12, 14, 5],
      [13, 16, 6],
    ])
      ellipse(ctx, C + x, C + y + 3, r, r * 0.9), ctx.fill();
    specular(ctx, BALL_R - 3, C, C + 3, 0.8);
  },

  pearl(ctx, col) {
    const soft: BallColor = { ...col, base: mix(col.base, '#ffffff', 0.35), dark: mix(col.dark, col.base, 0.4), light: '#ffffff' };
    sphere(ctx, soft);
    ctx.save();
    clipBall(ctx);
    const g = ctx.createLinearGradient(C - BALL_R, C - BALL_R, C + BALL_R, C + BALL_R);
    g.addColorStop(0, 'rgba(255,170,230,0.35)');
    g.addColorStop(0.35, 'rgba(170,255,250,0.3)');
    g.addColorStop(0.65, 'rgba(255,250,170,0.3)');
    g.addColorStop(1, 'rgba(200,170,255,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, BALL_TEX, BALL_TEX);
    ctx.restore();
    rim(ctx, col);
    specular(ctx, BALL_R, C, C, 1);
  },

  faces(ctx, col, idx) {
    // Ears (alternate round / pointy by colour).
    ctx.fillStyle = col.dark;
    for (const s of [-1, 1]) {
      if (idx % 2 === 0) circle(ctx, C + s * 26, C - 28, 12);
      else {
        ctx.beginPath();
        ctx.moveTo(C + s * 12, C - 30);
        ctx.lineTo(C + s * 32, C - 46);
        ctx.lineTo(C + s * 36, C - 18);
        ctx.closePath();
      }
      ctx.fill();
    }
    ctx.fillStyle = col.light;
    for (const s of [-1, 1]) circle(ctx, C + s * 26, C - 28, 5), idx % 2 === 0 && ctx.fill();
    sphere(ctx, col, BALL_R - 2);
    ctx.fillStyle = rgba('#ffffff', 0.85);
    ellipse(ctx, C, C + 12, 17, 12);
    ctx.fill();
    eyes(ctx, 13, C - 6, 5, 6.5);
    ctx.fillStyle = '#1d1430';
    ellipse(ctx, C, C + 6, 5, 3.5);
    ctx.fill();
    ctx.strokeStyle = '#1d1430';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(C - 5, C + 10, 5, 0, Math.PI);
    ctx.arc(C + 5, C + 10, 5, 0, Math.PI);
    ctx.stroke();
    specular(ctx, BALL_R - 2, C, C, 0.6);
  },

  neon(ctx, col) {
    ctx.fillStyle = mix('#0b0820', col.dark, 0.35);
    circle(ctx, C, C, BALL_R);
    ctx.fill();
    ctx.shadowColor = col.base;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = col.light;
    ctx.lineWidth = 6;
    circle(ctx, C, C, BALL_R - 5);
    ctx.stroke();
    ctx.strokeStyle = col.base;
    ctx.lineWidth = 3;
    circle(ctx, C, C, BALL_R * 0.45);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = col.light;
    circle(ctx, C, C, 4);
    ctx.fill();
    specular(ctx, BALL_R, C, C, 0.35);
  },

  planet(ctx, col, idx) {
    const ringed = idx % 3 === 0;
    if (ringed) {
      ctx.strokeStyle = rgba(col.light, 0.85);
      ctx.lineWidth = 5;
      ellipse(ctx, C, C + 2, BALL_R + 6, 11, -0.35);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, BALL_TEX, C);
      ctx.clip();
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    clipBall(ctx, BALL_R - 3);
    ctx.fillStyle = col.base;
    ctx.fillRect(0, 0, BALL_TEX, BALL_TEX);
    for (let i = -4; i < 6; i++) {
      ctx.fillStyle = i % 2 === 0 ? rgba(col.light, 0.55) : rgba(col.dark, 0.4);
      ctx.beginPath();
      const y0 = C + i * 10;
      ctx.moveTo(0, y0);
      for (let x = 0; x <= BALL_TEX; x += 8) ctx.lineTo(x, y0 + Math.sin(x * 0.12 + i) * 3);
      ctx.lineTo(BALL_TEX, y0 + 5);
      for (let x = BALL_TEX; x >= 0; x -= 8) ctx.lineTo(x, y0 + 5 + Math.sin(x * 0.1 + i * 2) * 2);
      ctx.closePath();
      ctx.fill();
    }
    const sh = ctx.createRadialGradient(C - 14, C - 14, 4, C, C, BALL_R * 1.1);
    sh.addColorStop(0, 'rgba(255,255,255,0.25)');
    sh.addColorStop(0.6, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(0,0,20,0.55)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, 0, BALL_TEX, BALL_TEX);
    ctx.restore();
    if (ringed) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, C, BALL_TEX, C);
      ctx.clip();
      ctx.strokeStyle = rgba(col.light, 0.9);
      ctx.lineWidth = 5;
      ellipse(ctx, C, C + 2, BALL_R + 6, 11, -0.35);
      ctx.stroke();
      ctx.restore();
    }
  },
};

/** Draw a ball of a skin into a context (used for textures and shop previews). */
export function drawBall(ctx: Ctx, skin: string, color: number): void {
  (SKINS[skin] ?? SKINS.glossy)(ctx, BALL_COLORS[color], color);
}

export function makeBallTextures(scene: Phaser.Scene, skin: string): void {
  BALL_COLORS.forEach((_c, i) => {
    canvasTexture(scene, ballKey(skin, i), BALL_TEX, BALL_TEX, (ctx) => drawBall(ctx, skin, i));
  });
}

export function makeAllBallTextures(scene: Phaser.Scene): void {
  for (const s of BALL_SKINS) makeBallTextures(scene, s.id);
}

// ── Special cells, boosters, effects ─────────────────────────────────

const GREY = { key: 'grey', ch: '', base: '#8b8f9c', light: '#d9dce6', dark: '#3b3e4a', hex: 0x8b8f9c };
const GOLD = { key: 'gold', ch: '', base: '#ffc21a', light: '#fff3b0', dark: '#a05a00', hex: 0xffc21a };

export function makeSpecialTextures(scene: Phaser.Scene): void {
  const T = BALL_TEX;
  canvasTexture(scene, 'sp_stone', T, T, (ctx) => {
    const rnd = artRng(42);
    const pts: [number, number][] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const r = BALL_R * (0.88 + rnd() * 0.14);
      pts.push([C + Math.cos(a) * r, C + Math.sin(a) * r]);
    }
    const g = ctx.createRadialGradient(C - 14, C - 16, 4, C, C, BALL_R * 1.1);
    g.addColorStop(0, GREY.light);
    g.addColorStop(0.45, GREY.base);
    g.addColorStop(1, GREY.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2a2c35';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(C - 10, C - 22);
    ctx.lineTo(C - 2, C - 6);
    ctx.lineTo(C - 12, C + 8);
    ctx.moveTo(C - 2, C - 6);
    ctx.lineTo(C + 16, C + 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(80,170,60,0.85)';
    ellipse(ctx, C + 14, C + 24, 14, 7, 0.2);
    ctx.fill();
    ellipse(ctx, C - 20, C + 22, 8, 5, -0.3);
    ctx.fill();
  });

  canvasTexture(scene, 'ov_ice', T, T, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, T, T);
    g.addColorStop(0, 'rgba(235,252,255,0.85)');
    g.addColorStop(0.5, 'rgba(170,230,255,0.55)');
    g.addColorStop(1, 'rgba(120,200,255,0.75)');
    ctx.fillStyle = g;
    const pts: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      pts.push([C + Math.cos(a) * (BALL_R + 4), C + Math.sin(a) * (BALL_R + 4)]);
    }
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(C - 20, C - 26);
    ctx.lineTo(C - 6, C - 30);
    ctx.moveTo(C - 28, C - 10);
    ctx.lineTo(C - 22, C + 4);
    ctx.stroke();
  });

  canvasTexture(scene, 'ov_vine', T, T, (ctx) => {
    ctx.strokeStyle = '#2c8a2a';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(C - BALL_R, C - 14);
    ctx.bezierCurveTo(C - 10, C - 34, C + 6, C + 30, C + BALL_R, C + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(C - BALL_R + 4, C + 20);
    ctx.bezierCurveTo(C - 10, C + 4, C + 10, C - 30, C + BALL_R - 4, C - 22);
    ctx.stroke();
    ctx.strokeStyle = '#7fe36a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(C - BALL_R, C - 15);
    ctx.bezierCurveTo(C - 10, C - 35, C + 6, C + 29, C + BALL_R, C + 9);
    ctx.stroke();
    ctx.fillStyle = '#45c23a';
    for (const [x, y, a] of [
      [-18, -22, -0.6],
      [20, 18, 0.5],
      [16, -24, 0.9],
      [-22, 16, -1.2],
    ]) {
      ellipse(ctx, C + x, C + y, 9, 4.5, a);
      ctx.fill();
    }
  });

  canvasTexture(scene, 'sp_coin', T, T, (ctx) => {
    sphere(ctx, GOLD);
    ctx.strokeStyle = rgba(GOLD.dark, 0.7);
    ctx.lineWidth = 3;
    circle(ctx, C, C, BALL_R * 0.66);
    ctx.stroke();
    ctx.fillStyle = GOLD.dark;
    star(ctx, C, C + 1, 16, 7);
    ctx.fill();
    ctx.fillStyle = GOLD.light;
    star(ctx, C - 1, C - 1, 14, 6);
    ctx.fill();
    specular(ctx);
  });

  canvasTexture(scene, 'sp_rainbow', T, T, (ctx) => {
    const cols = ['#ff2d3d', '#ff8a12', '#ffd60a', '#2fcb3a', '#18c8e8', '#2d55ff', '#9a3dff', '#ff47b0'];
    ctx.save();
    clipBall(ctx);
    cols.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(C, C);
      ctx.arc(C, C, BALL_R, (i / 8) * Math.PI * 2, ((i + 1) / 8) * Math.PI * 2 + 0.02);
      ctx.closePath();
      ctx.fill();
    });
    const g = ctx.createRadialGradient(C, C, 0, C, C, BALL_R);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.15)');
    g.addColorStop(1, 'rgba(40,0,60,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, T, T);
    ctx.restore();
    specular(ctx);
  });

  canvasTexture(scene, 'sp_bomb', T, T, (ctx) => {
    const coco = { key: '', ch: '', base: '#7a4a24', light: '#c08a55', dark: '#2e180a', hex: 0 };
    sphere(ctx, coco, BALL_R - 2, C, C + 3);
    ctx.fillStyle = '#2e180a';
    for (const [x, y] of [
      [-8, -6],
      [8, -6],
      [0, 6],
    ])
      circle(ctx, C + x, C + y - 8, 4), ctx.fill();
    ctx.strokeStyle = '#d9c38a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(C + 18, C - 28);
    ctx.quadraticCurveTo(C + 30, C - 44, C + 38, C - 38);
    ctx.stroke();
    ctx.fillStyle = '#ffdd33';
    star(ctx, C + 39, C - 39, 9, 4, 6);
    ctx.fill();
    ctx.fillStyle = '#ff5a1f';
    circle(ctx, C + 39, C - 39, 3.5);
    ctx.fill();
    specular(ctx, BALL_R - 2, C, C + 3, 0.5);
  });

  canvasTexture(scene, 'sp_fire', T, T, (ctx) => {
    const g = ctx.createRadialGradient(C, C + 8, 2, C, C, BALL_R + 6);
    g.addColorStop(0, '#fff7c2');
    g.addColorStop(0.35, '#ffcc22');
    g.addColorStop(0.7, '#ff5a12');
    g.addColorStop(1, 'rgba(200,20,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(C, C - BALL_R - 6);
    ctx.bezierCurveTo(C + 18, C - 26, C + 6, C - 18, C + 30, C - 30);
    ctx.bezierCurveTo(C + 46, C, C + 34, C + 40, C, C + BALL_R);
    ctx.bezierCurveTo(C - 34, C + 40, C - 46, C, C - 30, C - 30);
    ctx.bezierCurveTo(C - 8, C - 18, C - 18, C - 26, C, C - BALL_R - 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,230,0.9)';
    circle(ctx, C, C + 10, 12);
    ctx.fill();
  });

  canvasTexture(scene, 'sp_lightning', T, T, (ctx) => {
    const elec = { key: '', ch: '', base: '#3a8bff', light: '#d6f2ff', dark: '#1a1f8a', hex: 0 };
    sphere(ctx, elec);
    ctx.shadowColor = '#bff4ff';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#fff36a';
    ctx.beginPath();
    ctx.moveTo(C + 6, C - 34);
    ctx.lineTo(C - 14, C + 4);
    ctx.lineTo(C - 1, C + 4);
    ctx.lineTo(C - 8, C + 34);
    ctx.lineTo(C + 16, C - 6);
    ctx.lineTo(C + 3, C - 6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    specular(ctx, BALL_R, C, C, 0.6);
  });

  canvasTexture(scene, 'shadow', 64, 32, (ctx) => {
    const g = ctx.createRadialGradient(32, 16, 2, 32, 16, 30);
    g.addColorStop(0, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.setTransform(1, 0, 0, 0.5, 0, 8);
    circle(ctx, 32, 16, 30);
    ctx.fill();
  });

  canvasTexture(scene, 'spark', 32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  });

  canvasTexture(scene, 'star4', 32, 32, (ctx) => {
    ctx.fillStyle = '#fff';
    star(ctx, 16, 16, 15, 4, 4, 0);
    ctx.fill();
  });

  canvasTexture(scene, 'shard', 16, 16, (ctx) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(16, 10);
    ctx.lineTo(4, 16);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();
  });

  canvasTexture(scene, 'leafp', 24, 14, (ctx) => {
    ctx.fillStyle = '#4fc23a';
    ellipse(ctx, 12, 7, 11, 5.5);
    ctx.fill();
    ctx.strokeStyle = '#2a7a1e';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(2, 7);
    ctx.lineTo(22, 7);
    ctx.stroke();
  });

  canvasTexture(scene, 'flash', 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,230,0.75)');
    g.addColorStop(1, 'rgba(255,255,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });

  canvasTexture(scene, 'aimdot', 20, 20, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    circle(ctx, 10, 10, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,40,80,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  canvasTexture(scene, 'hole', 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 58, 10, 64, 64, 62);
    g.addColorStop(0, '#f4f6fa');
    g.addColorStop(0.55, '#a8afbd');
    g.addColorStop(0.8, '#5d6475');
    g.addColorStop(1, '#2b2f3a');
    ctx.fillStyle = g;
    circle(ctx, 64, 64, 60);
    ctx.fill();
    const h = ctx.createRadialGradient(64, 70, 4, 64, 64, 36);
    h.addColorStop(0, '#000');
    h.addColorStop(0.8, '#14161d');
    h.addColorStop(1, '#3b4050');
    ctx.fillStyle = h;
    circle(ctx, 64, 64, 34);
    ctx.fill();
  });
}
