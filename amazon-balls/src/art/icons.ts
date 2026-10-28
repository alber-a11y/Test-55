import Phaser from 'phaser';
import { BALL_COLORS } from '../data/colors';
import { LAUNCHERS } from '../data/cosmetics';
import { drawBall } from './balls';
import { canvasTexture, circle, type Ctx, ellipse, mix, roundRect, star } from './canvas';

const S = 96;
const OUT = '#2a1640';

function outlined(ctx: Ctx, fill: string | CanvasGradient, lw = 5): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}

function vgrad(ctx: Ctx, top: string, bottom: string, y0 = 10, y1 = 86): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

function coin(ctx: Ctx, x: number, y: number, r: number): void {
  circle(ctx, x, y, r);
  outlined(ctx, vgrad(ctx, '#fff07a', '#f0a000', y - r, y + r), r * 0.14);
  ctx.strokeStyle = 'rgba(160,90,0,0.6)';
  ctx.lineWidth = r * 0.1;
  circle(ctx, x, y, r * 0.7);
  ctx.stroke();
  ctx.fillStyle = '#ffe14a';
  star(ctx, x, y + r * 0.03, r * 0.45, r * 0.2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ellipse(ctx, x - r * 0.35, y - r * 0.45, r * 0.25, r * 0.12, -0.6);
  ctx.fill();
}

function bolt(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x + 8 * s, y - 34 * s);
  ctx.lineTo(x - 16 * s, y + 4 * s);
  ctx.lineTo(x - 1 * s, y + 4 * s);
  ctx.lineTo(x - 9 * s, y + 34 * s);
  ctx.lineTo(x + 18 * s, y - 6 * s);
  ctx.lineTo(x + 3 * s, y - 6 * s);
  ctx.closePath();
}

const ICONS: Record<string, (ctx: Ctx) => void> = {
  coin: (ctx) => coin(ctx, 48, 48, 40),
  coins: (ctx) => {
    coin(ctx, 34, 58, 26);
    coin(ctx, 62, 56, 26);
    coin(ctx, 48, 36, 28);
  },
  star: (ctx) => {
    star(ctx, 48, 52, 42, 19);
    outlined(ctx, vgrad(ctx, '#fff27a', '#ffb000'));
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ellipse(ctx, 38, 38, 8, 5, -0.6);
    ctx.fill();
  },
  starEmpty: (ctx) => {
    star(ctx, 48, 52, 42, 19);
    outlined(ctx, 'rgba(60,40,90,0.55)');
  },
  gift: (ctx) => {
    roundRect(ctx, 14, 40, 68, 46, 8);
    outlined(ctx, vgrad(ctx, '#ff6a8a', '#d6204a'));
    roundRect(ctx, 10, 28, 76, 18, 6);
    outlined(ctx, vgrad(ctx, '#ff8aa2', '#e0305a'));
    ctx.fillStyle = '#ffd60a';
    ctx.fillRect(42, 28, 12, 58);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 4;
    ctx.strokeRect(42, 28, 12, 58);
    for (const k of [-1, 1]) {
      ellipse(ctx, 48 + k * 13, 20, 14, 9, k * 0.5);
      outlined(ctx, '#ffd60a', 4);
    }
  },
  map: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(10, 22);
    ctx.lineTo(36, 12);
    ctx.lineTo(60, 22);
    ctx.lineTo(86, 12);
    ctx.lineTo(86, 74);
    ctx.lineTo(60, 84);
    ctx.lineTo(36, 74);
    ctx.lineTo(10, 84);
    ctx.closePath();
    outlined(ctx, vgrad(ctx, '#fff2c0', '#e8c37a'));
    ctx.strokeStyle = '#2d9cdb';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(18, 70);
    ctx.quadraticCurveTo(40, 40, 52, 56);
    ctx.quadraticCurveTo(64, 70, 76, 30);
    ctx.stroke();
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(68, 22);
    ctx.lineTo(80, 34);
    ctx.moveTo(80, 22);
    ctx.lineTo(68, 34);
    ctx.stroke();
  },
  shop: (ctx) => {
    roundRect(ctx, 16, 34, 64, 52, 10);
    outlined(ctx, vgrad(ctx, '#ffb547', '#e2711d'));
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(48, 36, 16, Math.PI, 0);
    ctx.stroke();
    coin(ctx, 48, 60, 14);
  },
  gear: (ctx) => {
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = i % 2 === 0 ? 42 : 32;
      ctx.lineTo(48 + Math.cos(a) * r, 48 + Math.sin(a) * r);
    }
    ctx.closePath();
    outlined(ctx, vgrad(ctx, '#d6e4f0', '#8aa0b8'));
    circle(ctx, 48, 48, 13);
    outlined(ctx, '#4a5a78', 4);
  },
  pause: (ctx) => {
    roundRect(ctx, 22, 16, 18, 64, 6);
    outlined(ctx, '#ffffff');
    roundRect(ctx, 56, 16, 18, 64, 6);
    outlined(ctx, '#ffffff');
  },
  play: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(28, 14);
    ctx.lineTo(80, 48);
    ctx.lineTo(28, 82);
    ctx.closePath();
    outlined(ctx, '#ffffff');
  },
  music: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(36, 66);
    ctx.lineTo(36, 18);
    ctx.lineTo(76, 10);
    ctx.lineTo(76, 58);
    ctx.lineWidth = 8;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ellipse(ctx, 26, 68, 13, 10, -0.3);
    outlined(ctx, '#ffffff', 4);
    ellipse(ctx, 66, 60, 13, 10, -0.3);
    outlined(ctx, '#ffffff', 4);
  },
  sound: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(14, 36);
    ctx.lineTo(32, 36);
    ctx.lineTo(54, 16);
    ctx.lineTo(54, 80);
    ctx.lineTo(32, 60);
    ctx.lineTo(14, 60);
    ctx.closePath();
    outlined(ctx, '#ffffff');
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    for (const r of [14, 26]) {
      ctx.beginPath();
      ctx.arc(56, 48, r, -0.8, 0.8);
      ctx.stroke();
    }
  },
  ad: (ctx) => {
    roundRect(ctx, 8, 18, 80, 60, 12);
    outlined(ctx, vgrad(ctx, '#7c5cff', '#4a2bd0'));
    ctx.beginPath();
    ctx.moveTo(38, 32);
    ctx.lineTo(64, 48);
    ctx.lineTo(38, 64);
    ctx.closePath();
    outlined(ctx, '#ffffff', 4);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(34, 86);
    ctx.lineTo(62, 86);
    ctx.stroke();
  },
  lock: (ctx) => {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(48, 40, 18, Math.PI, 0);
    ctx.stroke();
    ctx.strokeStyle = '#c9d2e0';
    ctx.lineWidth = 7;
    ctx.stroke();
    roundRect(ctx, 20, 40, 56, 44, 8);
    outlined(ctx, vgrad(ctx, '#ffd36a', '#e09a1a'));
    circle(ctx, 48, 60, 6);
    ctx.fillStyle = OUT;
    ctx.fill();
  },
  check: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(14, 50);
    ctx.lineTo(38, 74);
    ctx.lineTo(84, 22);
    ctx.lineWidth = 18;
    ctx.strokeStyle = OUT;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#7dff6a';
    ctx.stroke();
  },
  home: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(48, 10);
    ctx.lineTo(88, 46);
    ctx.lineTo(76, 46);
    ctx.lineTo(76, 84);
    ctx.lineTo(20, 84);
    ctx.lineTo(20, 46);
    ctx.lineTo(8, 46);
    ctx.closePath();
    outlined(ctx, '#ffffff');
    roundRect(ctx, 40, 58, 16, 26, 4);
    outlined(ctx, '#ff8a12', 4);
  },
  restart: (ctx) => {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(48, 50, 28, -0.4 * Math.PI, 1.3 * Math.PI);
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(48, 6);
    ctx.lineTo(70, 22);
    ctx.lineTo(46, 36);
    ctx.closePath();
    outlined(ctx, '#ffffff', 4);
  },
  close: (ctx) => {
    ctx.lineCap = 'round';
    for (const [w, c] of [
      [20, OUT],
      [10, '#ffffff'],
    ] as const) {
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(22, 22);
      ctx.lineTo(74, 74);
      ctx.moveTo(74, 22);
      ctx.lineTo(22, 74);
      ctx.stroke();
    }
  },
  back: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(10, 48);
    ctx.lineTo(46, 14);
    ctx.lineTo(46, 34);
    ctx.lineTo(86, 34);
    ctx.lineTo(86, 62);
    ctx.lineTo(46, 62);
    ctx.lineTo(46, 82);
    ctx.closePath();
    outlined(ctx, '#ffffff');
  },
  vibro: (ctx) => {
    roundRect(ctx, 30, 12, 36, 72, 8);
    outlined(ctx, '#ffffff');
    ctx.fillStyle = OUT;
    ctx.fillRect(38, 22, 20, 46);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(48 + k * 26, 30);
      ctx.lineTo(48 + k * 34, 40);
      ctx.lineTo(48 + k * 26, 50);
      ctx.lineTo(48 + k * 34, 60);
      ctx.stroke();
    }
  },
  fx: (ctx) => {
    star(ctx, 40, 52, 34, 10, 4, 0);
    outlined(ctx, '#fff27a', 4);
    star(ctx, 72, 24, 16, 5, 4, 0);
    outlined(ctx, '#ffffff', 3);
  },
  lang: (ctx) => {
    circle(ctx, 48, 48, 38);
    outlined(ctx, vgrad(ctx, '#7fd6ff', '#2d7fdb'));
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 4;
    ellipse(ctx, 48, 48, 16, 38);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, 48);
    ctx.lineTo(86, 48);
    ctx.moveTo(16, 30);
    ctx.lineTo(80, 30);
    ctx.moveTo(16, 66);
    ctx.lineTo(80, 66);
    ctx.stroke();
  },
  fullscreen: (ctx) => {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    for (const [x, y, dx, dy] of [
      [16, 16, 1, 1],
      [80, 16, -1, 1],
      [16, 80, 1, -1],
      [80, 80, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * 20);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * 20, y);
      ctx.stroke();
    }
  },
  bomb: (ctx) => {
    circle(ctx, 44, 56, 32);
    outlined(ctx, vgrad(ctx, '#9a6236', '#3e1f0a'));
    ctx.fillStyle = '#2a1408';
    for (const [x, y] of [
      [36, 44],
      [52, 44],
      [44, 56],
    ])
      circle(ctx, x, y, 4), ctx.fill();
    ctx.strokeStyle = '#d9c38a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(62, 30);
    ctx.quadraticCurveTo(72, 14, 82, 18);
    ctx.stroke();
    ctx.fillStyle = '#ffdd33';
    star(ctx, 83, 16, 11, 4, 6);
    ctx.fill();
  },
  rainbow: (ctx) => {
    const cols = ['#ff2d3d', '#ff8a12', '#ffd60a', '#2fcb3a', '#18c8e8', '#2d55ff', '#9a3dff'];
    circle(ctx, 48, 48, 38);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 6;
    ctx.stroke();
    cols.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(48, 48);
      ctx.arc(48, 48, 36, (i / 7) * Math.PI * 2, ((i + 1) / 7) * Math.PI * 2 + 0.02);
      ctx.closePath();
      ctx.fill();
    });
    const g = ctx.createRadialGradient(40, 38, 2, 48, 48, 36);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.1)');
    g.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = g;
    circle(ctx, 48, 48, 36);
    ctx.fill();
  },
  lightning: (ctx) => {
    bolt(ctx, 48, 48, 1.25);
    outlined(ctx, vgrad(ctx, '#fffb9a', '#ffc21a'), 6);
  },
  fire: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(48, 6);
    ctx.bezierCurveTo(60, 26, 82, 40, 78, 62);
    ctx.bezierCurveTo(74, 82, 58, 90, 48, 90);
    ctx.bezierCurveTo(30, 90, 16, 78, 18, 58);
    ctx.bezierCurveTo(20, 42, 34, 36, 34, 22);
    ctx.bezierCurveTo(42, 30, 44, 40, 48, 6);
    outlined(ctx, vgrad(ctx, '#ffd23a', '#ff3a12'), 5);
    ctx.beginPath();
    ctx.moveTo(48, 44);
    ctx.bezierCurveTo(60, 56, 62, 66, 58, 76);
    ctx.bezierCurveTo(52, 86, 38, 82, 38, 70);
    ctx.bezierCurveTo(38, 60, 46, 56, 48, 44);
    ctx.fillStyle = '#fff6b0';
    ctx.fill();
  },
  shots5: (ctx) => {
    drawBallAt(ctx, 2, 40, 54, 30);
    plus(ctx, '+5');
  },
  shots3: (ctx) => {
    drawBallAt(ctx, 5, 40, 54, 30);
    plus(ctx, '+3');
  },
  aim: (ctx) => {
    circle(ctx, 48, 48, 34);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = '#ff3d5a';
    ctx.lineWidth = 7;
    ctx.stroke();
    circle(ctx, 48, 48, 12);
    outlined(ctx, '#ff3d5a', 4);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(48, 2);
    ctx.lineTo(48, 26);
    ctx.moveTo(48, 70);
    ctx.lineTo(48, 94);
    ctx.moveTo(2, 48);
    ctx.lineTo(26, 48);
    ctx.moveTo(70, 48);
    ctx.lineTo(94, 48);
    ctx.stroke();
  },
  startBomb: (ctx) => {
    ICONS.bomb(ctx);
    ctx.fillStyle = '#7dff6a';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 4;
    star(ctx, 20, 22, 16, 7);
    ctx.stroke();
    ctx.fill();
  },
  balls: (ctx) => {
    drawBallAt(ctx, 0, 30, 60, 22);
    drawBallAt(ctx, 5, 66, 60, 22);
    drawBallAt(ctx, 2, 48, 30, 22);
  },
  picture: (ctx) => {
    roundRect(ctx, 8, 14, 80, 68, 10);
    outlined(ctx, vgrad(ctx, '#8fe0ff', '#c8ffd0'));
    ctx.fillStyle = '#2e9a3a';
    ctx.beginPath();
    ctx.moveTo(12, 78);
    ctx.lineTo(36, 44);
    ctx.lineTo(54, 66);
    ctx.lineTo(66, 52);
    ctx.lineTo(84, 78);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd60a';
    circle(ctx, 68, 32, 9);
    ctx.fill();
  },
  mosaic: (ctx) => {
    const cols = ['#ff2d3d', '#ffd60a', '#2fcb3a', '#2d55ff', '#ff47b0', '#18c8e8'];
    roundRect(ctx, 8, 8, 80, 80, 12);
    outlined(ctx, '#fff6e0');
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        ctx.fillStyle = cols[(r * 3 + c * 2) % cols.length];
        circle(ctx, 22 + c * 17 + (r % 2) * 4, 22 + r * 17, 7.5);
        ctx.fill();
      }
  },
  launcher: (ctx) => {
    circle(ctx, 48, 56, 34);
    outlined(ctx, vgrad(ctx, '#5ad16a', '#1f8a3a'));
    circle(ctx, 48, 56, 18);
    outlined(ctx, '#2a1d3a', 4);
    drawBallAt(ctx, 0, 48, 24, 16);
  },
  boosters: (ctx) => {
    ctx.save();
    ctx.translate(-8, 6);
    ctx.scale(0.75, 0.75);
    ICONS.bomb(ctx);
    ctx.restore();
    ctx.save();
    ctx.translate(36, -4);
    ctx.scale(0.62, 0.62);
    ICONS.lightning(ctx);
    ctx.restore();
  },
  target: (ctx) => {
    for (const [r, c] of [
      [40, '#ffffff'],
      [30, '#ff3d5a'],
      [20, '#ffffff'],
      [10, '#ff3d5a'],
    ] as const) {
      circle(ctx, 48, 48, r);
      outlined(ctx, c, 4);
    }
  },
  paw: (ctx) => {
    ellipse(ctx, 48, 62, 22, 18);
    outlined(ctx, '#ffb547');
    for (const [x, y] of [
      [22, 36],
      [38, 22],
      [58, 22],
      [74, 36],
    ]) {
      ellipse(ctx, x, y, 9, 11);
      outlined(ctx, '#ffb547', 4);
    }
  },
  swap: (ctx) => {
    ctx.strokeStyle = '#ffd60a';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(48, 48, 30, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(48, 48, 30, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
  },
  question: (ctx) => {
    circle(ctx, 48, 48, 40);
    outlined(ctx, vgrad(ctx, '#7fd6ff', '#2d7fdb'));
    ctx.fillStyle = '#fff';
    ctx.font = '900 56px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 48, 52);
  },
};

function drawBallAt(ctx: Ctx, color: number, x: number, y: number, r: number): void {
  ctx.save();
  ctx.translate(x - r, y - r);
  ctx.scale((r * 2) / 96, (r * 2) / 96);
  drawBall(ctx, 'glossy', color % BALL_COLORS.length);
  ctx.restore();
}

function plus(ctx: Ctx, s: string): void {
  ctx.font = '900 34px "Trebuchet MS", Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = OUT;
  ctx.strokeText(s, 66, 30);
  ctx.fillStyle = '#7dff6a';
  ctx.fillText(s, 66, 30);
}

// ── Launchers ───────────────────────────────────────────────────────

export const LAUNCHER_TEX = 200;

function drawLauncher(ctx: Ctx, id: string): void {
  const c = LAUNCHER_TEX / 2;
  const R = 86;
  const ring = (fill: string | CanvasGradient) => {
    circle(ctx, c, c, R);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 5;
    ctx.stroke();
  };
  switch (id) {
    case 'shell': {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        ellipse(ctx, c + Math.cos(a) * 66, c + Math.sin(a) * 66, 26, 20, a);
        ctx.fillStyle = i % 2 ? '#ffb3c8' : '#ffd6e2';
        ctx.fill();
        ctx.strokeStyle = '#c0607e';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      break;
    }
    case 'idol': {
      ring(vgrad(ctx, '#b9b2a0', '#6e6858', 14, 186));
      ctx.strokeStyle = '#4e4a3e';
      ctx.lineWidth = 4;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.save();
        ctx.translate(c + Math.cos(a) * 68, c + Math.sin(a) * 68);
        ctx.rotate(a);
        ctx.strokeRect(-8, -8, 16, 16);
        ctx.restore();
      }
      break;
    }
    case 'sun': {
      ctx.fillStyle = '#ffb000';
      star(ctx, c, c, R + 10, R - 16, 16);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 4;
      ctx.stroke();
      circle(ctx, c, c, R - 18);
      ctx.fillStyle = vgrad(ctx, '#fff07a', '#f0a000', 30, 170);
      ctx.fill();
      break;
    }
    case 'flower': {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        ellipse(ctx, c + Math.cos(a) * 62, c + Math.sin(a) * 62, 34, 20, a);
        ctx.fillStyle = i % 2 ? '#ff6ac1' : '#c86aff';
        ctx.fill();
        ctx.strokeStyle = '#7a1f6a';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      break;
    }
    case 'crystal': {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(a - 0.26) * 46, c + Math.sin(a - 0.26) * 46);
        ctx.lineTo(c + Math.cos(a) * (R + 8), c + Math.sin(a) * (R + 8));
        ctx.lineTo(c + Math.cos(a + 0.26) * 46, c + Math.sin(a + 0.26) * 46);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? '#7ff0ff' : '#3ab8ff';
        ctx.fill();
        ctx.strokeStyle = '#1a5a9a';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      break;
    }
    default: {
      // Water lily pad.
      ctx.beginPath();
      ctx.arc(c, c, R, -Math.PI / 2 + 0.25, Math.PI * 1.5 - 0.05);
      ctx.lineTo(c, c);
      ctx.closePath();
      ctx.fillStyle = vgrad(ctx, '#6ee06a', '#1f8a3a', 14, 186);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(20,90,30,0.5)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(c, c);
        ctx.lineTo(c + Math.cos(a) * R * 0.95, c + Math.sin(a) * R * 0.95);
        ctx.stroke();
      }
      for (const a of [0.6, 2.4, 4.2]) {
        ctx.fillStyle = '#ffc2e6';
        ellipse(ctx, c + Math.cos(a) * 70, c + Math.sin(a) * 70, 12, 8, a);
        ctx.fill();
      }
    }
  }
  // Dark centre where the shot counter sits.
  const g = ctx.createRadialGradient(c - 10, c - 10, 4, c, c, 48);
  g.addColorStop(0, '#5a3a2a');
  g.addColorStop(1, '#22120a');
  circle(ctx, c, c, 44);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = mix('#ffd060', '#ffffff', 0.2);
  ctx.lineWidth = 4;
  ctx.stroke();
}

export function makeIconTextures(scene: Phaser.Scene): void {
  for (const [k, fn] of Object.entries(ICONS)) canvasTexture(scene, `ic_${k}`, S, S, fn);
  for (const l of LAUNCHERS) canvasTexture(scene, `launcher_${l.id}`, LAUNCHER_TEX, LAUNCHER_TEX, (ctx) => drawLauncher(ctx, l.id));
  // Swap arrows ring around the launcher centre.
  canvasTexture(scene, 'swap_ring', 140, 140, (ctx) => {
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    for (const a0 of [0, Math.PI]) {
      ctx.beginPath();
      ctx.arc(70, 70, 58, a0 + 0.35, a0 + Math.PI - 0.5);
      ctx.stroke();
      const a = a0 + Math.PI - 0.5;
      const x = 70 + Math.cos(a) * 58;
      const y = 70 + Math.sin(a) * 58;
      ctx.fillStyle = '#ffd23a';
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a + Math.PI / 2) * 14, y + Math.sin(a + Math.PI / 2) * 14);
      ctx.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11);
      ctx.lineTo(x - Math.cos(a) * 11, y - Math.sin(a) * 11);
      ctx.closePath();
      ctx.fill();
    }
  });
}
