import Phaser from 'phaser';
import { BALL_R, BALL_TEX } from './balls';
import { canvasTexture, circle, type Ctx, ellipse, roundRect } from './canvas';

const BROWN = '#a8703f';
const BROWN_D = '#6b4220';
const BROWN_L = '#d29a62';

function grad(ctx: Ctx, x: number, y: number, r: number, light: string, dark: string): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  return g;
}

function eye(ctx: Ctx, x: number, y: number, r: number, closed: boolean): void {
  if (closed) {
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = Math.max(2, r * 0.45);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.3, r, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = '#1e1008';
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.fillStyle = '#fff';
  circle(ctx, x - r * 0.35, y - r * 0.4, r * 0.38);
  ctx.fill();
  circle(ctx, x + r * 0.35, y + r * 0.35, r * 0.15);
  ctx.fill();
}

/** Sleepy capybara eye: dark bead with a heavy lid. */
function capyEye(ctx: Ctx, x: number, y: number, r: number, closed: boolean): void {
  if (closed) return eye(ctx, x, y, r, true);
  eye(ctx, x, y, r, false);
  ctx.fillStyle = BROWN;
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.55, r * 1.35, r * 0.75, 0, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = '#4a2a10';
  ctx.lineWidth = Math.max(1.5, r * 0.3);
  ctx.beginPath();
  ctx.moveTo(x - r * 1.3, y - r * 0.5);
  ctx.lineTo(x + r * 1.3, y - r * 0.5);
  ctx.stroke();
}

/** Capybara head centred at (x,y); `s` = scale (1 ≈ 100px wide). Boxy head, long blunt snout. */
export function capyHead(ctx: Ctx, x: number, y: number, s: number, closed = false, mandarin = true): void {
  // Tiny ears.
  for (const k of [-1, 1]) {
    ctx.fillStyle = BROWN_D;
    ellipse(ctx, x + k * 38 * s, y - 50 * s, 11 * s, 9 * s, k * 0.3);
    ctx.fill();
    ctx.fillStyle = '#c98a6a';
    ellipse(ctx, x + k * 38 * s, y - 49 * s, 5 * s, 4 * s, k * 0.3);
    ctx.fill();
  }
  // Boxy head.
  ctx.fillStyle = grad(ctx, x, y - 10 * s, 60 * s, BROWN_L, BROWN);
  roundRect(ctx, x - 50 * s, y - 56 * s, 100 * s, 112 * s, 42 * s);
  ctx.fill();
  // Long blunt muzzle.
  ctx.fillStyle = grad(ctx, x, y + 22 * s, 44 * s, '#d9a571', '#a8703f');
  roundRect(ctx, x - 40 * s, y - 6 * s, 80 * s, 64 * s, 30 * s);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,230,200,0.35)';
  ellipse(ctx, x, y + 4 * s, 26 * s, 10 * s);
  ctx.fill();
  capyEye(ctx, x - 25 * s, y - 26 * s, 6 * s, closed);
  capyEye(ctx, x + 25 * s, y - 26 * s, 6 * s, closed);
  // Big nostrils at the top of the snout.
  ctx.fillStyle = '#3a200c';
  ellipse(ctx, x - 12 * s, y + 8 * s, 6.5 * s, 3.8 * s, 0.5);
  ctx.fill();
  ellipse(ctx, x + 12 * s, y + 8 * s, 6.5 * s, 3.8 * s, -0.5);
  ctx.fill();
  ctx.strokeStyle = '#3a200c';
  ctx.lineWidth = 2.5 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + 16 * s);
  ctx.lineTo(x, y + 30 * s);
  ctx.moveTo(x - 10 * s, y + 36 * s);
  ctx.quadraticCurveTo(x - 5 * s, y + 40 * s, x, y + 32 * s);
  ctx.quadraticCurveTo(x + 5 * s, y + 40 * s, x + 10 * s, y + 36 * s);
  ctx.stroke();
  // Blush.
  ctx.fillStyle = 'rgba(255,120,110,0.3)';
  ellipse(ctx, x - 40 * s, y + 4 * s, 8 * s, 5 * s);
  ctx.fill();
  ellipse(ctx, x + 40 * s, y + 4 * s, 8 * s, 5 * s);
  ctx.fill();
  if (mandarin) {
    const mx = x + 4 * s;
    const my = y - 68 * s;
    ctx.fillStyle = grad(ctx, mx, my, 17 * s, '#ffd27a', '#f07a00');
    circle(ctx, mx, my, 16 * s);
    ctx.fill();
    ctx.fillStyle = '#3db83a';
    ellipse(ctx, mx + 9 * s, my - 15 * s, 10 * s, 4.5 * s, -0.5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ellipse(ctx, mx - 6 * s, my - 6 * s, 5 * s, 3 * s, -0.6);
    ctx.fill();
  }
}

function capybara(ctx: Ctx, closed: boolean): void {
  const x = 150;
  // Body.
  ctx.fillStyle = grad(ctx, x, 190, 110, BROWN_L, BROWN_D);
  ellipse(ctx, x, 192, 104, 70);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,180,0.35)';
  ellipse(ctx, x, 205, 58, 40);
  ctx.fill();
  // Feet.
  ctx.fillStyle = BROWN_D;
  for (const k of [-1, 1]) {
    ellipse(ctx, x + k * 52, 252, 24, 11);
    ctx.fill();
  }
  // Arms holding belly.
  ctx.fillStyle = BROWN;
  for (const k of [-1, 1]) {
    ellipse(ctx, x + k * 50, 200, 18, 30, k * -0.5);
    ctx.fill();
  }
  capyHead(ctx, x, 118, 1.25, closed, true);
}

function sloth(ctx: Ctx, closed: boolean): void {
  // Branch.
  ctx.fillStyle = '#7a4b23';
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.quadraticCurveTo(130, 8, 260, 26);
  ctx.lineTo(260, 44);
  ctx.quadraticCurveTo(130, 28, 0, 40);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3fae3c';
  for (const [x, y, a] of [
    [24, 22, -0.4],
    [60, 14, 0.5],
    [200, 18, -0.6],
    [236, 26, 0.4],
  ]) {
    ellipse(ctx, x, y, 18, 8, a);
    ctx.fill();
  }
  const fur = '#9c8466';
  const furD = '#6f5a43';
  // Arms up to the branch.
  ctx.strokeStyle = fur;
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(90, 140);
  ctx.quadraticCurveTo(70, 80, 92, 34);
  ctx.moveTo(170, 140);
  ctx.quadraticCurveTo(190, 80, 168, 34);
  ctx.stroke();
  ctx.strokeStyle = '#3b2a1a';
  ctx.lineWidth = 4;
  for (const bx of [92, 168])
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(bx + i * 7, 30);
      ctx.quadraticCurveTo(bx + i * 7 + 4, 18, bx + i * 9, 14);
      ctx.stroke();
    }
  // Body.
  ctx.fillStyle = grad(ctx, 130, 200, 80, '#b9a284', furD);
  ellipse(ctx, 130, 205, 72, 82);
  ctx.fill();
  // Legs.
  ctx.fillStyle = fur;
  ellipse(ctx, 92, 272, 22, 18, 0.4);
  ctx.fill();
  ellipse(ctx, 168, 272, 22, 18, -0.4);
  ctx.fill();
  // Head.
  ctx.fillStyle = grad(ctx, 130, 150, 56, '#c4ad8e', furD);
  ellipse(ctx, 130, 150, 56, 50);
  ctx.fill();
  ctx.fillStyle = '#f0e2c4';
  ellipse(ctx, 130, 156, 44, 36);
  ctx.fill();
  // Eye masks.
  ctx.fillStyle = '#4b3423';
  ellipse(ctx, 108, 150, 17, 10, 0.5);
  ctx.fill();
  ellipse(ctx, 152, 150, 17, 10, -0.5);
  ctx.fill();
  eye(ctx, 108, 148, 6, closed);
  eye(ctx, 152, 148, 6, closed);
  ctx.fillStyle = '#2a1a10';
  ellipse(ctx, 130, 164, 9, 6);
  ctx.fill();
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(130, 170, 10, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  // Hair tuft.
  ctx.fillStyle = furD;
  for (let i = -2; i <= 2; i++) {
    ellipse(ctx, 130 + i * 9, 104, 6, 12, i * 0.3);
    ctx.fill();
  }
}

function toucan(ctx: Ctx, closed: boolean): void {
  // Branch.
  ctx.fillStyle = '#7a4b23';
  ctx.fillRect(10, 196, 170, 14);
  // Body.
  ctx.fillStyle = grad(ctx, 70, 130, 60, '#3a3a52', '#0d0d18');
  ellipse(ctx, 70, 130, 48, 68, 0.15);
  ctx.fill();
  // Bib.
  ctx.fillStyle = grad(ctx, 82, 96, 30, '#fffbe0', '#ffd34a');
  ellipse(ctx, 84, 100, 26, 30, 0.2);
  ctx.fill();
  // Beak.
  const g = ctx.createLinearGradient(90, 60, 190, 90);
  g.addColorStop(0, '#2bb34a');
  g.addColorStop(0.15, '#ffd21a');
  g.addColorStop(0.6, '#ff8a12');
  g.addColorStop(0.9, '#ff2d3d');
  g.addColorStop(1, '#1d1d2b');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(92, 62);
  ctx.quadraticCurveTo(160, 48, 190, 86);
  ctx.quadraticCurveTo(150, 84, 96, 92);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(96, 78);
  ctx.quadraticCurveTo(150, 72, 188, 86);
  ctx.stroke();
  // Eye.
  ctx.fillStyle = '#4dc8ff';
  circle(ctx, 76, 70, 12);
  ctx.fill();
  eye(ctx, 76, 70, 6, closed);
  // Tail and feet.
  ctx.fillStyle = '#0d0d18';
  ctx.beginPath();
  ctx.moveTo(40, 180);
  ctx.lineTo(24, 220);
  ctx.lineTo(54, 214);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4a7bd9';
  ellipse(ctx, 62, 198, 9, 6);
  ctx.fill();
  ellipse(ctx, 84, 198, 9, 6);
  ctx.fill();
}

/** Baby animal faces shown inside rescue bubbles. */
function babyFace(ctx: Ctx, kind: number, x: number, y: number): void {
  switch (kind) {
    case 0:
      capyHead(ctx, x, y + 4, 0.42, false, false);
      break;
    case 1: {
      ctx.fillStyle = '#a58e70';
      circle(ctx, x, y, 24);
      ctx.fill();
      ctx.fillStyle = '#f0e2c4';
      ellipse(ctx, x, y + 3, 19, 16);
      ctx.fill();
      ctx.fillStyle = '#4b3423';
      ellipse(ctx, x - 9, y, 8, 5, 0.5);
      ctx.fill();
      ellipse(ctx, x + 9, y, 8, 5, -0.5);
      ctx.fill();
      eye(ctx, x - 9, y - 1, 3.2, false);
      eye(ctx, x + 9, y - 1, 3.2, false);
      ctx.fillStyle = '#2a1a10';
      ellipse(ctx, x, y + 9, 4, 3);
      ctx.fill();
      break;
    }
    case 2: {
      ctx.fillStyle = '#1d1d2b';
      circle(ctx, x - 4, y, 20);
      ctx.fill();
      ctx.fillStyle = '#fff2b0';
      ellipse(ctx, x, y + 12, 12, 9);
      ctx.fill();
      ctx.fillStyle = '#ff9a12';
      ctx.beginPath();
      ctx.moveTo(x + 8, y - 6);
      ctx.quadraticCurveTo(x + 30, y - 6, x + 32, y + 6);
      ctx.lineTo(x + 8, y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4dc8ff';
      circle(ctx, x - 6, y - 5, 6);
      ctx.fill();
      eye(ctx, x - 6, y - 5, 3, false);
      break;
    }
    case 3: {
      ctx.fillStyle = '#3cc23c';
      ellipse(ctx, x, y + 4, 24, 18);
      ctx.fill();
      for (const k of [-1, 1]) {
        ctx.fillStyle = '#3cc23c';
        circle(ctx, x + k * 11, y - 10, 9);
        ctx.fill();
        ctx.fillStyle = '#fff';
        circle(ctx, x + k * 11, y - 10, 6);
        ctx.fill();
        eye(ctx, x + k * 11, y - 10, 3.5, false);
      }
      ctx.strokeStyle = '#1a5a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y + 6, 10, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      break;
    }
    default: {
      ctx.fillStyle = '#8a5a30';
      for (const k of [-1, 1]) circle(ctx, x + k * 22, y, 8), ctx.fill();
      circle(ctx, x, y, 22);
      ctx.fill();
      ctx.fillStyle = '#f2c894';
      ellipse(ctx, x, y + 4, 16, 14);
      ctx.fill();
      eye(ctx, x - 7, y - 2, 3.5, false);
      eye(ctx, x + 7, y - 2, 3.5, false);
      ctx.strokeStyle = '#5a3417';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y + 8, 6, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  }
}

export const ANIMAL_TEX = (k: number) => `sp_animal_${k}`;

export function makeCharacterTextures(scene: Phaser.Scene): void {
  canvasTexture(scene, 'capy', 300, 270, (ctx) => capybara(ctx, false));
  canvasTexture(scene, 'capy_blink', 300, 270, (ctx) => capybara(ctx, true));
  canvasTexture(scene, 'capy_head', 128, 140, (ctx) => capyHead(ctx, 64, 84, 0.86, false, true));
  canvasTexture(scene, 'sloth', 260, 300, (ctx) => sloth(ctx, false));
  canvasTexture(scene, 'sloth_blink', 260, 300, (ctx) => sloth(ctx, true));
  canvasTexture(scene, 'toucan', 200, 220, (ctx) => toucan(ctx, false));
  canvasTexture(scene, 'toucan_blink', 200, 220, (ctx) => toucan(ctx, true));
  const T = BALL_TEX;
  const C = T / 2;
  for (let k = 0; k < 5; k++) {
    canvasTexture(scene, ANIMAL_TEX(k), T, T, (ctx) => {
      const g = ctx.createRadialGradient(C - 10, C - 12, 4, C, C, BALL_R + 2);
      g.addColorStop(0, 'rgba(255,255,255,0.75)');
      g.addColorStop(0.5, 'rgba(180,240,255,0.45)');
      g.addColorStop(1, 'rgba(90,190,255,0.7)');
      ctx.fillStyle = g;
      circle(ctx, C, C, BALL_R);
      ctx.fill();
      babyFace(ctx, k, C, C + 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 3;
      circle(ctx, C, C, BALL_R - 1.5);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ellipse(ctx, C - 18, C - 22, 9, 5, -0.6);
      ctx.fill();
    });
    canvasTexture(scene, `baby_${k}`, 72, 72, (ctx) => babyFace(ctx, k, 36, 38));
  }
}
