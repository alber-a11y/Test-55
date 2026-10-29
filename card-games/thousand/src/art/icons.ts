import type Phaser from 'phaser';
import { darken, lighten, makeCanvas, roundRect, suitPath, type Ctx } from '@shared/cards/draw';
import { drawLocomotive } from './cards';

/** Extra icons of the Thousand Express in the shared icon style (128×128, dark outline). */
const OUT = '#1a1426';

function outlined(c: Ctx, fill: string | CanvasGradient, lw = 7): void {
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.lineWidth = lw;
  c.strokeStyle = OUT;
  c.stroke();
  c.fillStyle = fill;
  c.fill();
}

function vgrad(c: Ctx, col: string, y0 = 10, y1 = 118): CanvasGradient {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, lighten(col, 0.25));
  g.addColorStop(1, darken(col, 0.12));
  return g;
}

const ICONS: Record<string, (c: Ctx) => void> = {
  train: (c) => {
    // Side view of a small locomotive.
    roundRect(c, 14, 46, 70, 44, 10);
    outlined(c, vgrad(c, '#c92a2a'));
    roundRect(c, 70, 26, 42, 64, 8);
    outlined(c, vgrad(c, '#2b3d78'));
    roundRect(c, 78, 34, 26, 20, 4);
    outlined(c, '#fff3c4', 5);
    roundRect(c, 24, 26, 16, 22, 3);
    outlined(c, '#444b5e', 5);
    for (const x of [32, 62, 92]) {
      c.beginPath();
      c.arc(x, 98, 14, 0, Math.PI * 2);
      outlined(c, '#f3d48a', 6);
    }
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.beginPath();
    c.arc(30, 14, 8, 0, Math.PI * 2);
    c.arc(44, 8, 6, 0, Math.PI * 2);
    c.fill();
  },
  ticket: (c) => {
    c.save();
    c.translate(64, 64);
    c.rotate(-0.25);
    c.beginPath();
    c.moveTo(-50, -30);
    c.lineTo(50, -30);
    c.lineTo(50, -10);
    c.arc(50, 0, 10, -Math.PI / 2, Math.PI / 2, true);
    c.lineTo(50, 30);
    c.lineTo(-50, 30);
    c.lineTo(-50, 10);
    c.arc(-50, 0, 10, Math.PI / 2, -Math.PI / 2, true);
    c.closePath();
    outlined(c, vgrad(c, '#f3d48a', -30, 30));
    c.setLineDash([6, 6]);
    c.lineWidth = 3;
    c.strokeStyle = '#8a6a2a';
    c.beginPath();
    c.moveTo(18, -26);
    c.lineTo(18, 26);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#a3213a';
    c.font = 'bold 26px Georgia';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('1000', -14, 2);
    c.restore();
  },
  barrel: (c) => {
    c.beginPath();
    c.moveTo(32, 14);
    c.quadraticCurveTo(18, 64, 32, 114);
    c.lineTo(96, 114);
    c.quadraticCurveTo(110, 64, 96, 14);
    c.closePath();
    outlined(c, vgrad(c, '#b0703a'));
    c.strokeStyle = OUT;
    c.lineWidth = 4;
    for (const x of [48, 64, 80]) {
      c.beginPath();
      c.moveTo(x, 16);
      c.quadraticCurveTo(x + (x - 64) * 0.25, 64, x, 112);
      c.stroke();
    }
    for (const y of [32, 96]) {
      c.fillStyle = '#5b6273';
      c.fillRect(24, y - 6, 80, 12);
      c.strokeRect(24, y - 6, 80, 12);
    }
  },
  ring: (c) => {
    // Two interlocked rings — the marriage.
    c.lineWidth = 16;
    c.strokeStyle = OUT;
    c.beginPath();
    c.arc(48, 70, 30, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.arc(80, 70, 30, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = 9;
    c.strokeStyle = '#ffc531';
    c.beginPath();
    c.arc(48, 70, 30, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#ffe08a';
    c.beginPath();
    c.arc(80, 70, 30, 0, Math.PI * 2);
    c.stroke();
    suitPath(c, 1, 64, 26, 30);
    outlined(c, '#ff4d6d', 5);
  },
  clover: (c) => {
    for (const [x, y] of [
      [64, 38],
      [90, 64],
      [64, 90],
      [38, 64],
    ]) {
      c.beginPath();
      c.arc(x, y, 22, 0, Math.PI * 2);
      outlined(c, vgrad(c, '#4caf50'), 6);
    }
    c.beginPath();
    c.arc(64, 64, 12, 0, Math.PI * 2);
    c.fillStyle = '#2e7d32';
    c.fill();
    c.strokeStyle = OUT;
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(70, 84);
    c.quadraticCurveTo(84, 108, 100, 116);
    c.stroke();
  },
  shield: (c) => {
    c.beginPath();
    c.moveTo(64, 10);
    c.lineTo(108, 26);
    c.quadraticCurveTo(106, 90, 64, 118);
    c.quadraticCurveTo(22, 90, 20, 26);
    c.closePath();
    outlined(c, vgrad(c, '#4c8bf5'));
    c.beginPath();
    c.moveTo(42, 62);
    c.lineTo(58, 80);
    c.lineTo(88, 46);
    c.lineWidth = 10;
    c.strokeStyle = '#ffffff';
    c.stroke();
  },
  xray: (c) => {
    roundRect(c, 22, 14, 60, 84, 10);
    outlined(c, '#2f4a7a');
    c.beginPath();
    c.arc(76, 76, 28, 0, Math.PI * 2);
    outlined(c, 'rgba(160,220,255,0.85)', 8);
    c.lineWidth = 12;
    c.strokeStyle = OUT;
    c.beginPath();
    c.moveTo(96, 96);
    c.lineTo(116, 116);
    c.stroke();
    c.lineWidth = 6;
    c.strokeStyle = '#c9a55c';
    c.stroke();
    suitPath(c, 0, 52, 52, 30);
    c.fillStyle = '#9ad1ff';
    c.fill();
  },
  plusdeal: (c) => {
    roundRect(c, 20, 24, 56, 80, 9);
    outlined(c, '#fffaf0');
    roundRect(c, 36, 14, 56, 80, 9);
    outlined(c, '#fffaf0');
    suitPath(c, 1, 64, 54, 30);
    c.fillStyle = '#a3213a';
    c.fill();
    c.beginPath();
    c.arc(92, 94, 24, 0, Math.PI * 2);
    outlined(c, '#5ad17e', 6);
    c.fillStyle = '#ffffff';
    c.fillRect(82, 91, 20, 6);
    c.fillRect(89, 84, 6, 20);
  },
  bolt: (c) => {
    // A hex bolt (the "болт" — zero tricks).
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      c.lineTo(64 + Math.cos(a) * 34, 40 + Math.sin(a) * 22);
    }
    c.closePath();
    outlined(c, vgrad(c, '#aab4cc', 18, 62));
    roundRect(c, 50, 54, 28, 64, 6);
    outlined(c, vgrad(c, '#8a94ac'));
    c.strokeStyle = OUT;
    c.lineWidth = 3;
    for (let y = 64; y < 114; y += 9) {
      c.beginPath();
      c.moveTo(50, y);
      c.lineTo(78, y + 5);
      c.stroke();
    }
  },
  sheet: (c) => {
    roundRect(c, 22, 10, 84, 108, 10);
    outlined(c, '#fff6e0');
    c.strokeStyle = '#8a6a2a';
    c.lineWidth = 3;
    for (let y = 34; y < 108; y += 16) {
      c.beginPath();
      c.moveTo(32, y);
      c.lineTo(96, y);
      c.stroke();
    }
    for (const x of [52, 74]) {
      c.beginPath();
      c.moveTo(x, 24);
      c.lineTo(x, 108);
      c.stroke();
    }
    c.fillStyle = '#a3213a';
    c.font = 'bold 20px Georgia';
    c.textAlign = 'center';
    c.fillText('1000', 64, 28);
  },
  loco: (c) => {
    c.beginPath();
    c.arc(64, 64, 56, 0, Math.PI * 2);
    outlined(c, vgrad(c, '#2b3d78'));
    drawLocomotive(c, 64, 70, 0.8, '#f3d48a', '#1a1426');
  },
  bell: (c) => {
    c.beginPath();
    c.moveTo(64, 14);
    c.quadraticCurveTo(28, 20, 28, 70);
    c.lineTo(16, 96);
    c.lineTo(112, 96);
    c.lineTo(100, 70);
    c.quadraticCurveTo(100, 20, 64, 14);
    outlined(c, vgrad(c, '#ffc531'));
    c.beginPath();
    c.arc(64, 104, 12, 0, Math.PI * 2);
    outlined(c, '#c9a55c', 6);
  },
};

export function registerExtraIcons(textures: Phaser.Textures.TextureManager): void {
  for (const [name, draw] of Object.entries(ICONS)) {
    const key = `i_${name}`;
    if (textures.exists(key)) continue;
    const [cv, c] = makeCanvas(128, 128);
    draw(c);
    textures.addCanvas(key, cv);
  }
}
