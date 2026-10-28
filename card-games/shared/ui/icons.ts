import type Phaser from 'phaser';
import { darken, fillSuit, lighten, makeCanvas, roundRect, starPath, type Ctx } from '../cards/draw';

/**
 * Every UI icon is drawn here with Canvas 2D at 128×128 and registered as a texture "i_<name>".
 * Style: bold flat shapes with a dark outline and a light highlight.
 */
const S = 128;
const OUT = '#1a1426';

type Draw = (ctx: Ctx) => void;

function outlined(ctx: Ctx, fill: string | CanvasGradient, lw = 7): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}

function vgrad(ctx: Ctx, c: string, y0 = 10, y1 = 118): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, lighten(c, 0.25));
  g.addColorStop(1, darken(c, 0.12));
  return g;
}

function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function shine(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

const ICONS: Record<string, Draw> = {
  coin: (c) => {
    circle(c, 64, 64, 50);
    outlined(c, vgrad(c, '#ffc531'));
    circle(c, 64, 64, 36);
    c.lineWidth = 5;
    c.strokeStyle = '#d18a0b';
    c.stroke();
    starPath(c, 64, 66, 24, 0.48);
    c.fillStyle = '#fff1a8';
    c.fill();
    shine(c, 44, 40, 12, 6);
  },
  star: (c) => {
    starPath(c, 64, 68, 56, 0.48);
    outlined(c, vgrad(c, '#ffd23f'));
    shine(c, 50, 46, 10, 5);
  },
  starEmpty: (c) => {
    starPath(c, 64, 68, 56, 0.48);
    outlined(c, '#3a4568');
  },
  gear: (c) => {
    c.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = i % 2 === 0 ? 54 : 42;
      c.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
    }
    c.closePath();
    outlined(c, vgrad(c, '#aab4cc'));
    circle(c, 64, 64, 18);
    outlined(c, '#3a4568', 6);
  },
  cart: (c) => {
    c.beginPath();
    c.moveTo(14, 24);
    c.lineTo(30, 24);
    c.lineTo(42, 82);
    c.lineTo(104, 82);
    c.lineTo(114, 38);
    c.lineTo(34, 38);
    c.closePath();
    outlined(c, vgrad(c, '#5aa9ff'));
    circle(c, 50, 100, 11);
    outlined(c, '#ffd23f', 6);
    circle(c, 96, 100, 11);
    outlined(c, '#ffd23f', 6);
  },
  gift: (c) => {
    roundRect(c, 18, 52, 92, 64, 8);
    outlined(c, vgrad(c, '#ff5d7a'));
    roundRect(c, 12, 36, 104, 24, 8);
    outlined(c, vgrad(c, '#ff7b93'));
    c.fillStyle = '#ffd23f';
    c.fillRect(56, 36, 16, 80);
    c.lineWidth = 5;
    c.strokeStyle = OUT;
    c.strokeRect(56, 36, 16, 80);
    c.beginPath();
    c.ellipse(46, 26, 18, 11, -0.4, 0, Math.PI * 2);
    c.ellipse(82, 26, 18, 11, 0.4, 0, Math.PI * 2);
    outlined(c, '#ffd23f', 5);
  },
  wheel: (c) => {
    const cols = ['#ff5d7a', '#ffd23f', '#5ad17e', '#5aa9ff', '#b084ff', '#ffa94d'];
    circle(c, 64, 66, 52);
    outlined(c, '#fff');
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(64, 66);
      c.arc(64, 66, 46, (i / 6) * Math.PI * 2, ((i + 1) / 6) * Math.PI * 2);
      c.closePath();
      c.fillStyle = cols[i];
      c.fill();
    }
    circle(c, 64, 66, 12);
    outlined(c, '#ffd23f', 5);
    c.beginPath();
    c.moveTo(52, 4);
    c.lineTo(76, 4);
    c.lineTo(64, 26);
    c.closePath();
    outlined(c, '#ff4d6d', 5);
  },
  trophy: (c) => {
    c.beginPath();
    c.moveTo(30, 14);
    c.lineTo(98, 14);
    c.quadraticCurveTo(98, 76, 64, 80);
    c.quadraticCurveTo(30, 76, 30, 14);
    c.closePath();
    outlined(c, vgrad(c, '#ffc531'));
    c.lineWidth = 8;
    c.strokeStyle = OUT;
    c.beginPath();
    c.arc(30, 40, 16, Math.PI * 0.5, Math.PI * 1.5);
    c.arc(98, 40, 16, -Math.PI * 0.5, Math.PI * 0.5);
    c.stroke();
    c.lineWidth = 4;
    c.strokeStyle = '#ffc531';
    c.beginPath();
    c.arc(30, 40, 16, Math.PI * 0.5, Math.PI * 1.5);
    c.stroke();
    c.beginPath();
    c.arc(98, 40, 16, -Math.PI * 0.5, Math.PI * 0.5);
    c.stroke();
    roundRect(c, 54, 78, 20, 18, 3);
    outlined(c, '#d18a0b', 5);
    roundRect(c, 34, 96, 60, 20, 6);
    outlined(c, '#8b5a2b', 6);
    starPath(c, 64, 42, 16);
    c.fillStyle = '#fff1a8';
    c.fill();
  },
  calendar: (c) => {
    roundRect(c, 16, 22, 96, 92, 12);
    outlined(c, '#ffffff');
    roundRect(c, 16, 22, 96, 28, 12);
    c.fillStyle = '#ff5d7a';
    c.fill();
    c.fillStyle = '#3a4568';
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) c.fillRect(26 + k * 22, 60 + r * 16, 12, 10);
    c.fillStyle = '#5ad17e';
    c.fillRect(70, 76, 12, 10);
    roundRect(c, 34, 12, 10, 22, 4);
    outlined(c, '#aab4cc', 4);
    roundRect(c, 84, 12, 10, 22, 4);
    outlined(c, '#aab4cc', 4);
  },
  map: (c) => {
    c.beginPath();
    c.moveTo(12, 28);
    c.lineTo(46, 16);
    c.lineTo(82, 28);
    c.lineTo(116, 16);
    c.lineTo(116, 100);
    c.lineTo(82, 112);
    c.lineTo(46, 100);
    c.lineTo(12, 112);
    c.closePath();
    outlined(c, vgrad(c, '#9be38a'));
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.beginPath();
    c.moveTo(46, 16);
    c.lineTo(82, 28);
    c.lineTo(82, 112);
    c.lineTo(46, 100);
    c.fill();
    c.setLineDash([6, 7]);
    c.lineWidth = 5;
    c.strokeStyle = '#d6336c';
    c.beginPath();
    c.moveTo(24, 92);
    c.quadraticCurveTo(54, 40, 100, 44);
    c.stroke();
    c.setLineDash([]);
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(92, 36);
    c.lineTo(106, 52);
    c.moveTo(106, 36);
    c.lineTo(92, 52);
    c.stroke();
  },
  back: (c) => {
    c.beginPath();
    c.moveTo(14, 64);
    c.lineTo(58, 22);
    c.lineTo(58, 46);
    c.lineTo(112, 46);
    c.lineTo(112, 82);
    c.lineTo(58, 82);
    c.lineTo(58, 106);
    c.closePath();
    outlined(c, '#ffffff');
  },
  pause: (c) => {
    roundRect(c, 28, 20, 26, 88, 8);
    outlined(c, '#ffffff');
    roundRect(c, 74, 20, 26, 88, 8);
    outlined(c, '#ffffff');
  },
  play: (c) => {
    c.beginPath();
    c.moveTo(36, 18);
    c.lineTo(108, 64);
    c.lineTo(36, 110);
    c.closePath();
    outlined(c, '#ffffff');
  },
  undo: (c) => {
    c.lineCap = 'round';
    c.lineWidth = 30;
    c.strokeStyle = OUT;
    c.beginPath();
    c.arc(68, 70, 34, Math.PI * 1.05, Math.PI * 0.55, false);
    c.stroke();
    c.lineWidth = 16;
    c.strokeStyle = '#ffffff';
    c.stroke();
    c.beginPath();
    c.moveTo(8, 60);
    c.lineTo(52, 30);
    c.lineTo(50, 82);
    c.closePath();
    outlined(c, '#ffffff', 6);
  },
  hint: (c) => {
    circle(c, 64, 50, 38);
    outlined(c, vgrad(c, '#ffe066'));
    roundRect(c, 46, 82, 36, 30, 6);
    outlined(c, '#aab4cc', 6);
    c.lineWidth = 4;
    c.strokeStyle = '#7a7f92';
    c.beginPath();
    c.moveTo(48, 94);
    c.lineTo(80, 94);
    c.moveTo(48, 103);
    c.lineTo(80, 103);
    c.stroke();
    shine(c, 50, 36, 10, 6);
  },
  joker: (c) => {
    roundRect(c, 22, 10, 84, 108, 12);
    outlined(c, '#ffffff');
    const cols = ['#ff5d7a', '#ffd23f', '#5ad17e', '#5aa9ff', '#b084ff'];
    for (let i = 0; i < 5; i++) {
      c.save();
      c.translate(64, 64);
      c.rotate((i / 5) * Math.PI * 2);
      c.fillStyle = cols[i];
      c.beginPath();
      c.ellipse(0, -22, 11, 20, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    starPath(c, 64, 64, 16);
    c.fillStyle = '#ffd23f';
    c.fill();
  },
  plus: (c) => {
    c.beginPath();
    c.moveTo(48, 14);
    c.lineTo(80, 14);
    c.lineTo(80, 48);
    c.lineTo(114, 48);
    c.lineTo(114, 80);
    c.lineTo(80, 80);
    c.lineTo(80, 114);
    c.lineTo(48, 114);
    c.lineTo(48, 80);
    c.lineTo(14, 80);
    c.lineTo(14, 48);
    c.lineTo(48, 48);
    c.closePath();
    outlined(c, '#5ad17e');
  },
  lock: (c) => {
    c.lineWidth = 22;
    c.strokeStyle = OUT;
    c.beginPath();
    c.arc(64, 50, 26, Math.PI, 0);
    c.lineTo(90, 64);
    c.moveTo(38, 64);
    c.lineTo(38, 50);
    c.stroke();
    c.lineWidth = 10;
    c.strokeStyle = '#aab4cc';
    c.stroke();
    roundRect(c, 22, 58, 84, 60, 12);
    outlined(c, vgrad(c, '#ffc531'));
    circle(c, 64, 82, 9);
    c.fillStyle = OUT;
    c.fill();
    c.fillRect(60, 84, 8, 18);
  },
  key: (c) => {
    circle(c, 38, 64, 26);
    outlined(c, vgrad(c, '#ffc531'));
    circle(c, 38, 64, 10);
    c.fillStyle = OUT;
    c.fill();
    c.beginPath();
    c.moveTo(60, 56);
    c.lineTo(118, 56);
    c.lineTo(118, 72);
    c.lineTo(108, 72);
    c.lineTo(108, 86);
    c.lineTo(96, 86);
    c.lineTo(96, 72);
    c.lineTo(88, 72);
    c.lineTo(88, 82);
    c.lineTo(78, 82);
    c.lineTo(78, 72);
    c.lineTo(60, 72);
    c.closePath();
    outlined(c, vgrad(c, '#ffc531'), 6);
  },
  ice: (c) => {
    c.lineCap = 'round';
    for (const [lw, col] of [
      [18, OUT],
      [8, '#bfe9ff'],
    ] as const) {
      c.lineWidth = lw;
      c.strokeStyle = col;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        c.beginPath();
        c.moveTo(64 - Math.cos(a) * 50, 64 - Math.sin(a) * 50);
        c.lineTo(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50);
        c.stroke();
        for (const sgn of [-1, 1]) {
          const bx = 64 + Math.cos(a) * 30 * sgn;
          const by = 64 + Math.sin(a) * 30 * sgn;
          c.beginPath();
          c.moveTo(bx + Math.cos(a + sgn * 2.4) * 14, by + Math.sin(a + sgn * 2.4) * 14);
          c.lineTo(bx, by);
          c.lineTo(bx + Math.cos(a - sgn * 2.4) * 14, by + Math.sin(a - sgn * 2.4) * 14);
          c.stroke();
        }
      }
    }
  },
  bomb: (c) => {
    circle(c, 58, 74, 42);
    outlined(c, vgrad(c, '#3a4568'));
    roundRect(c, 70, 24, 26, 22, 5);
    outlined(c, '#aab4cc', 6);
    c.lineWidth = 6;
    c.strokeStyle = '#c89b5a';
    c.beginPath();
    c.moveTo(86, 24);
    c.quadraticCurveTo(96, 6, 112, 12);
    c.stroke();
    starPath(c, 112, 12, 13, 0.4, 6);
    c.fillStyle = '#ffa94d';
    c.fill();
    shine(c, 42, 56, 12, 7);
  },
  chest: (c) => {
    roundRect(c, 14, 54, 100, 60, 8);
    outlined(c, vgrad(c, '#b0703a'));
    c.beginPath();
    c.moveTo(14, 58);
    c.quadraticCurveTo(14, 18, 64, 18);
    c.quadraticCurveTo(114, 18, 114, 58);
    c.closePath();
    outlined(c, vgrad(c, '#c98545'));
    c.fillStyle = '#ffc531';
    c.fillRect(14, 52, 100, 10);
    c.fillRect(30, 20, 10, 94);
    c.fillRect(88, 20, 10, 94);
    roundRect(c, 52, 50, 24, 28, 5);
    outlined(c, '#ffc531', 5);
  },
  chestOpen: (c) => {
    c.save();
    c.fillStyle = 'rgba(255,224,102,0.6)';
    c.beginPath();
    c.moveTo(30, 54);
    c.lineTo(10, 4);
    c.lineTo(118, 4);
    c.lineTo(98, 54);
    c.fill();
    c.restore();
    roundRect(c, 14, 54, 100, 60, 8);
    outlined(c, vgrad(c, '#b0703a'));
    c.fillStyle = '#ffc531';
    c.fillRect(14, 52, 100, 10);
    circle(c, 50, 50, 12);
    outlined(c, '#ffd23f', 4);
    circle(c, 76, 46, 12);
    outlined(c, '#ffd23f', 4);
  },
  home: (c) => {
    c.beginPath();
    c.moveTo(64, 14);
    c.lineTo(118, 62);
    c.lineTo(102, 62);
    c.lineTo(102, 112);
    c.lineTo(26, 112);
    c.lineTo(26, 62);
    c.lineTo(10, 62);
    c.closePath();
    outlined(c, '#ffffff');
    roundRect(c, 52, 76, 24, 36, 4);
    c.fillStyle = '#5aa9ff';
    c.fill();
  },
  quests: (c) => {
    roundRect(c, 20, 12, 88, 106, 10);
    outlined(c, '#fff6e0');
    for (let i = 0; i < 3; i++) {
      roundRect(c, 32, 30 + i * 28, 18, 18, 4);
      outlined(c, i < 2 ? '#5ad17e' : '#ffffff', 4);
      c.fillStyle = '#7a7f92';
      c.fillRect(58, 35 + i * 28, 40, 8);
    }
  },
  stats: (c) => {
    const hs = [40, 70, 54, 92];
    hs.forEach((hh, i) => {
      roundRect(c, 14 + i * 26, 114 - hh, 20, hh, 4);
      outlined(c, ['#5aa9ff', '#5ad17e', '#ffd23f', '#ff5d7a'][i], 5);
    });
  },
  user: (c) => {
    circle(c, 64, 42, 26);
    outlined(c, '#ffd8b0');
    c.beginPath();
    c.moveTo(18, 116);
    c.quadraticCurveTo(18, 70, 64, 70);
    c.quadraticCurveTo(110, 70, 110, 116);
    c.closePath();
    outlined(c, '#5aa9ff');
  },
  crown: (c) => {
    c.beginPath();
    c.moveTo(16, 100);
    c.lineTo(10, 34);
    c.lineTo(42, 62);
    c.lineTo(64, 20);
    c.lineTo(86, 62);
    c.lineTo(118, 34);
    c.lineTo(112, 100);
    c.closePath();
    outlined(c, vgrad(c, '#ffc531'));
    circle(c, 64, 78, 9);
    c.fillStyle = '#ff4d6d';
    c.fill();
    roundRect(c, 16, 98, 96, 16, 4);
    outlined(c, '#e09f1f', 5);
  },
  music: (c) => {
    c.beginPath();
    c.moveTo(44, 90);
    c.lineTo(44, 22);
    c.lineTo(108, 10);
    c.lineTo(108, 80);
    c.lineWidth = 18;
    c.strokeStyle = OUT;
    c.stroke();
    c.lineWidth = 8;
    c.strokeStyle = '#ffffff';
    c.stroke();
    c.beginPath();
    c.ellipse(32, 94, 18, 14, -0.3, 0, Math.PI * 2);
    outlined(c, '#ffffff');
    c.beginPath();
    c.ellipse(96, 84, 18, 14, -0.3, 0, Math.PI * 2);
    outlined(c, '#ffffff');
  },
  sound: (c) => {
    c.beginPath();
    c.moveTo(14, 48);
    c.lineTo(40, 48);
    c.lineTo(70, 18);
    c.lineTo(70, 110);
    c.lineTo(40, 80);
    c.lineTo(14, 80);
    c.closePath();
    outlined(c, '#ffffff');
    c.lineWidth = 8;
    c.strokeStyle = '#ffffff';
    c.lineCap = 'round';
    c.beginPath();
    c.arc(74, 64, 22, -0.8, 0.8);
    c.stroke();
    c.beginPath();
    c.arc(74, 64, 40, -0.8, 0.8);
    c.stroke();
  },
  globe: (c) => {
    circle(c, 64, 64, 50);
    outlined(c, vgrad(c, '#5aa9ff'));
    c.fillStyle = '#5ad17e';
    c.beginPath();
    c.ellipse(46, 50, 20, 14, 0.5, 0, Math.PI * 2);
    c.ellipse(82, 82, 18, 12, -0.3, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = 'rgba(255,255,255,0.6)';
    c.beginPath();
    c.ellipse(64, 64, 22, 50, 0, 0, Math.PI * 2);
    c.moveTo(14, 64);
    c.lineTo(114, 64);
    c.stroke();
  },
  check: (c) => {
    c.beginPath();
    c.moveTo(14, 66);
    c.lineTo(34, 46);
    c.lineTo(54, 66);
    c.lineTo(96, 20);
    c.lineTo(116, 40);
    c.lineTo(54, 106);
    c.closePath();
    outlined(c, '#5ad17e');
  },
  close: (c) => {
    c.lineCap = 'round';
    for (const [lw, col] of [
      [30, OUT],
      [16, '#ffffff'],
    ] as const) {
      c.lineWidth = lw;
      c.strokeStyle = col;
      c.beginPath();
      c.moveTo(32, 32);
      c.lineTo(96, 96);
      c.moveTo(96, 32);
      c.lineTo(32, 96);
      c.stroke();
    }
  },
  cards: (c) => {
    const draw = (rot: number, col: string) => {
      c.save();
      c.translate(64, 100);
      c.rotate(rot);
      roundRect(c, -24, -88, 48, 68, 7);
      outlined(c, col, 6);
      c.restore();
    };
    draw(-0.4, '#fff6e0');
    draw(0, '#ffffff');
    draw(0.4, '#ffffff');
    c.save();
    c.translate(64, 100);
    c.rotate(0.4);
    fillSuit(c, 1, 0, -54, 28, '#e8364f');
    c.restore();
  },
  shuffle: (c) => {
    c.lineCap = 'round';
    for (const [lw, col] of [
      [18, OUT],
      [8, '#ffffff'],
    ] as const) {
      c.lineWidth = lw;
      c.strokeStyle = col;
      c.beginPath();
      c.moveTo(12, 36);
      c.bezierCurveTo(60, 36, 60, 92, 100, 92);
      c.moveTo(12, 92);
      c.bezierCurveTo(60, 92, 60, 36, 100, 36);
      c.stroke();
    }
    for (const y of [36, 92]) {
      c.beginPath();
      c.moveTo(96, y - 16);
      c.lineTo(118, y);
      c.lineTo(96, y + 16);
      c.closePath();
      outlined(c, '#ffffff', 5);
    }
  },
  eye: (c) => {
    c.beginPath();
    c.moveTo(8, 64);
    c.quadraticCurveTo(64, 4, 120, 64);
    c.quadraticCurveTo(64, 124, 8, 64);
    c.closePath();
    outlined(c, '#ffffff');
    circle(c, 64, 64, 26);
    outlined(c, '#5aa9ff', 5);
    circle(c, 64, 64, 12);
    c.fillStyle = OUT;
    c.fill();
  },
  timer: (c) => {
    circle(c, 64, 70, 46);
    outlined(c, '#ffffff');
    roundRect(c, 52, 10, 24, 16, 4);
    outlined(c, '#ff5d7a', 5);
    c.lineWidth = 8;
    c.lineCap = 'round';
    c.strokeStyle = OUT;
    c.beginPath();
    c.moveTo(64, 70);
    c.lineTo(64, 40);
    c.moveTo(64, 70);
    c.lineTo(86, 80);
    c.stroke();
  },
  info: (c) => {
    circle(c, 64, 64, 50);
    outlined(c, '#5aa9ff');
    c.fillStyle = '#ffffff';
    circle(c, 64, 36, 9);
    c.fill();
    roundRect(c, 55, 54, 18, 48, 6);
    c.fill();
  },
  podium: (c) => {
    roundRect(c, 44, 30, 40, 86, 6);
    outlined(c, '#ffd23f');
    roundRect(c, 8, 58, 38, 58, 6);
    outlined(c, '#d6dde9');
    roundRect(c, 82, 74, 38, 42, 6);
    outlined(c, '#e09253');
    c.font = 'bold 30px Arial';
    c.textAlign = 'center';
    c.fillStyle = OUT;
    c.fillText('1', 64, 64);
    c.fillText('2', 27, 92);
    c.fillText('3', 101, 104);
  },
  album: (c) => {
    roundRect(c, 14, 26, 100, 78, 8);
    outlined(c, '#fff6e0');
    roundRect(c, 24, 36, 50, 58, 4);
    c.fillStyle = '#5aa9ff';
    c.fill();
    c.fillStyle = '#5ad17e';
    c.beginPath();
    c.moveTo(24, 94);
    c.lineTo(42, 64);
    c.lineTo(58, 80);
    c.lineTo(66, 70);
    c.lineTo(74, 94);
    c.fill();
    c.fillStyle = '#7a7f92';
    for (let i = 0; i < 4; i++) c.fillRect(82, 42 + i * 13, 24, 6);
    starPath(c, 98, 92, 10);
    c.fillStyle = '#ff5d7a';
    c.fill();
  },
  heart: (c) => {
    fillSuit(c, 1, 64, 66, 110, OUT);
    fillSuit(c, 1, 64, 66, 90, '#ff4d6d');
    shine(c, 44, 46, 10, 6);
  },
  wand: (c) => {
    c.lineCap = 'round';
    c.lineWidth = 20;
    c.strokeStyle = OUT;
    c.beginPath();
    c.moveTo(22, 108);
    c.lineTo(84, 46);
    c.stroke();
    c.lineWidth = 10;
    c.strokeStyle = '#b084ff';
    c.stroke();
    starPath(c, 92, 36, 30);
    outlined(c, '#ffd23f', 6);
  },
  rules: (c) => {
    c.beginPath();
    c.moveTo(64, 30);
    c.quadraticCurveTo(36, 16, 10, 24);
    c.lineTo(10, 104);
    c.quadraticCurveTo(36, 96, 64, 110);
    c.quadraticCurveTo(92, 96, 118, 104);
    c.lineTo(118, 24);
    c.quadraticCurveTo(92, 16, 64, 30);
    c.closePath();
    outlined(c, '#fff6e0');
    c.lineWidth = 5;
    c.strokeStyle = OUT;
    c.beginPath();
    c.moveTo(64, 30);
    c.lineTo(64, 110);
    c.stroke();
    c.fillStyle = '#7a7f92';
    for (let i = 0; i < 4; i++) {
      c.fillRect(20, 40 + i * 14, 34, 5);
      c.fillRect(74, 40 + i * 14, 34, 5);
    }
  },
  medal: (c) => {
    c.beginPath();
    c.moveTo(36, 8);
    c.lineTo(58, 8);
    c.lineTo(72, 54);
    c.lineTo(50, 54);
    c.closePath();
    outlined(c, '#5aa9ff', 5);
    c.beginPath();
    c.moveTo(92, 8);
    c.lineTo(70, 8);
    c.lineTo(56, 54);
    c.lineTo(78, 54);
    c.closePath();
    outlined(c, '#ff5d7a', 5);
    circle(c, 64, 82, 34);
    outlined(c, vgrad(c, '#ffc531'));
    starPath(c, 64, 84, 18);
    c.fillStyle = '#fff1a8';
    c.fill();
  },
  deck: (c) => {
    for (let i = 3; i >= 0; i--) {
      roundRect(c, 28 + i * 6, 14 + i * 6, 62, 88, 8);
      outlined(c, i === 0 ? '#3b6fd8' : '#2b4fa0', 5);
    }
    c.lineWidth = 3;
    c.strokeStyle = 'rgba(255,255,255,0.6)';
    roundRect(c, 36, 22, 46, 72, 5);
    c.stroke();
  },
  sparkle: (c) => {
    starPath(c, 64, 64, 54, 0.22, 4);
    outlined(c, '#fff1a8');
    starPath(c, 104, 22, 16, 0.3, 4);
    outlined(c, '#ffd23f', 4);
  },
  flag: (c) => {
    roundRect(c, 20, 10, 10, 108, 4);
    outlined(c, '#aab4cc', 5);
    c.beginPath();
    c.moveTo(30, 16);
    c.quadraticCurveTo(70, 0, 112, 20);
    c.lineTo(112, 66);
    c.quadraticCurveTo(70, 48, 30, 64);
    c.closePath();
    outlined(c, vgrad(c, '#ff5d7a'));
  },
  gold: (c) => {
    roundRect(c, 22, 10, 84, 108, 12);
    outlined(c, vgrad(c, '#ffc531'));
    starPath(c, 64, 64, 30);
    c.fillStyle = '#fff1a8';
    c.fill();
  },
  coins: (c) => {
    for (const [x, y] of [
      [44, 82],
      [84, 82],
      [64, 50],
    ]) {
      circle(c, x, y, 30);
      outlined(c, vgrad(c, '#ffc531', y - 30, y + 30));
      starPath(c, x, y + 2, 14);
      c.fillStyle = '#fff1a8';
      c.fill();
    }
  },
  hand: (c) => {
    c.beginPath();
    c.moveTo(48, 118);
    c.lineTo(34, 72);
    c.quadraticCurveTo(30, 60, 40, 58);
    c.quadraticCurveTo(48, 58, 52, 70);
    c.lineTo(52, 20);
    c.quadraticCurveTo(52, 10, 62, 10);
    c.quadraticCurveTo(72, 10, 72, 20);
    c.lineTo(72, 56);
    c.lineTo(96, 60);
    c.quadraticCurveTo(108, 62, 106, 76);
    c.lineTo(100, 118);
    c.closePath();
    outlined(c, '#ffffff');
  },
  fire: (c) => {
    c.beginPath();
    c.moveTo(64, 8);
    c.quadraticCurveTo(110, 54, 100, 86);
    c.quadraticCurveTo(92, 118, 64, 120);
    c.quadraticCurveTo(28, 118, 26, 84);
    c.quadraticCurveTo(26, 56, 46, 40);
    c.quadraticCurveTo(48, 60, 58, 62);
    c.quadraticCurveTo(52, 32, 64, 8);
    c.closePath();
    outlined(c, vgrad(c, '#ff8a3d'));
    c.beginPath();
    c.moveTo(64, 60);
    c.quadraticCurveTo(86, 84, 80, 100);
    c.quadraticCurveTo(72, 114, 60, 112);
    c.quadraticCurveTo(46, 108, 48, 94);
    c.quadraticCurveTo(50, 78, 64, 60);
    c.fillStyle = '#ffe066';
    c.fill();
  },
  lightning: (c) => {
    c.beginPath();
    c.moveTo(74, 6);
    c.lineTo(24, 72);
    c.lineTo(58, 72);
    c.lineTo(48, 122);
    c.lineTo(104, 50);
    c.lineTo(68, 50);
    c.closePath();
    outlined(c, vgrad(c, '#ffd23f'));
  },
  refresh: (c) => {
    c.lineCap = 'round';
    for (const [lw, col] of [
      [22, OUT],
      [10, '#ffffff'],
    ] as const) {
      c.lineWidth = lw;
      c.strokeStyle = col;
      c.beginPath();
      c.arc(64, 64, 38, -2.6, 1.2);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(10, 42);
    c.lineTo(46, 30);
    c.lineTo(22, 4);
    c.closePath();
    outlined(c, '#ffffff', 5);
  },
};

/** Register all icons as textures "i_<name>". */
export function registerIcons(textures: Phaser.Textures.TextureManager): void {
  for (const [name, draw] of Object.entries(ICONS)) {
    const key = `i_${name}`;
    if (textures.exists(key)) continue;
    const [cv, ctx] = makeCanvas(S, S);
    draw(ctx);
    textures.addCanvas(key, cv);
  }
}

export const ICON_NAMES = Object.keys(ICONS);
