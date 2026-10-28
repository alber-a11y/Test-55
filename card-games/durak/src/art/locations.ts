import { darken, lighten, makeCanvas, noiseRng, type Ctx } from '@shared/cards/draw';
import type { Location } from '../data/locations';

/** Background of a location: scenery drawn in code with a table surface in the middle. */
export function renderLocation(loc: Location, w: number, h: number, opts: { table?: boolean } = {}): HTMLCanvasElement {
  const [cv, c] = makeCanvas(w, h);
  const rnd = noiseRng(loc.id.length * 77 + 3);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, loc.c1);
  g.addColorStop(1, loc.c2);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  scenery(c, loc, w, h, rnd);
  if (opts.table === false) return cv;
  // Table surface (rounded felt) — where the cards are played
  const tw = w * 0.94;
  const th = h * 0.78;
  const tx = (w - tw) / 2;
  const ty = h * 0.14;
  c.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(c, tx + 6, ty + 14, tw, th, Math.min(tw, th) * 0.12);
  c.fill();
  const tg = c.createRadialGradient(w / 2, ty + th * 0.45, 40, w / 2, ty + th / 2, Math.max(tw, th) * 0.7);
  tg.addColorStop(0, lighten(loc.table, 0.18));
  tg.addColorStop(1, darken(loc.table, 0.25));
  c.fillStyle = tg;
  roundRect(c, tx, ty, tw, th, Math.min(tw, th) * 0.12);
  c.fill();
  c.lineWidth = 14;
  c.strokeStyle = darken(loc.table, 0.45);
  c.stroke();
  c.lineWidth = 3;
  c.strokeStyle = 'rgba(255,255,255,0.15)';
  roundRect(c, tx + 18, ty + 18, tw - 36, th - 36, Math.min(tw, th) * 0.1);
  c.stroke();
  for (let i = 0; i < (tw * th) / 120; i++) {
    c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
    c.fillRect(tx + rnd() * tw, ty + rnd() * th, 2, 2);
  }
  return cv;
}

function roundRect(c: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function scenery(c: Ctx, loc: Location, w: number, h: number, rnd: () => number): void {
  c.save();
  switch (loc.id) {
    case 'yard': {
      // Brick wall + windows
      for (let y = 0; y < h * 0.4; y += 34)
        for (let x = (y / 34) % 2 ? -40 : 0; x < w; x += 80) {
          c.fillStyle = rnd() < 0.5 ? '#a0522d' : '#8b4513';
          c.fillRect(x + 2, y + 2, 76, 30);
        }
      for (let i = 0; i < 4; i++) {
        c.fillStyle = '#ffe8a3';
        c.fillRect(w * (0.1 + i * 0.23), h * 0.05, w * 0.12, h * 0.08);
        c.strokeStyle = '#4a2a1a';
        c.lineWidth = 6;
        c.strokeRect(w * (0.1 + i * 0.23), h * 0.05, w * 0.12, h * 0.08);
      }
      break;
    }
    case 'train': {
      c.fillStyle = '#c9d6df';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 3; i++) {
        const x = w * (0.05 + i * 0.33);
        const sky = c.createLinearGradient(0, 0, 0, h * 0.2);
        sky.addColorStop(0, '#8ecae6');
        sky.addColorStop(1, '#d8f3dc');
        c.fillStyle = sky;
        c.fillRect(x, h * 0.03, w * 0.26, h * 0.18);
        c.fillStyle = '#2d6a4f';
        for (let k = 0; k < 6; k++) {
          c.beginPath();
          c.arc(x + rnd() * w * 0.26, h * 0.2, 20 + rnd() * 30, Math.PI, 0);
          c.fill();
        }
        c.strokeStyle = '#495057';
        c.lineWidth = 10;
        c.strokeRect(x, h * 0.03, w * 0.26, h * 0.18);
      }
      break;
    }
    case 'beach': {
      c.fillStyle = '#48cae4';
      c.fillRect(0, h * 0.1, w, h * 0.12);
      c.fillStyle = '#ffd166';
      c.beginPath();
      c.arc(w * 0.8, h * 0.06, 60, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#f4d58d';
      c.fillRect(0, h * 0.2, w, h);
      break;
    }
    case 'dorm': {
      for (let x = 0; x < w; x += 60) {
        c.fillStyle = x % 120 ? '#a5b4fc' : '#c7d2fe';
        c.fillRect(x, 0, 60, h * 0.4);
      }
      c.fillStyle = '#1e1b4b';
      c.fillRect(w * 0.6, h * 0.03, w * 0.3, h * 0.12);
      c.fillStyle = '#fde68a';
      for (let i = 0; i < 12; i++) c.fillRect(w * 0.6 + rnd() * w * 0.28, h * 0.04 + rnd() * h * 0.1, 4, 4);
      c.fillStyle = '#f87171';
      c.fillRect(w * 0.1, h * 0.04, w * 0.18, h * 0.1);
      break;
    }
    case 'dacha': {
      c.fillStyle = '#386641';
      for (let i = 0; i < 9; i++) {
        c.beginPath();
        c.arc(w * (i / 8), h * 0.16, 70 + rnd() * 40, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#bc6c25';
      for (let x = 0; x < w; x += 40) c.fillRect(x, h * 0.13, 26, h * 0.12);
      break;
    }
    case 'boat': {
      c.fillStyle = '#457b9d';
      c.fillRect(0, h * 0.12, w, h * 0.1);
      c.strokeStyle = '#f1faee';
      c.lineWidth = 8;
      c.beginPath();
      c.moveTo(0, h * 0.16);
      c.lineTo(w, h * 0.16);
      c.stroke();
      for (let x = 0; x < w; x += 70) {
        c.beginPath();
        c.moveTo(x, h * 0.16);
        c.lineTo(x, h * 0.22);
        c.stroke();
      }
      c.fillStyle = '#e63946';
      c.beginPath();
      c.arc(w * 0.12, h * 0.08, 34, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 12;
      c.beginPath();
      c.arc(w * 0.12, h * 0.08, 26, 0, Math.PI * 2);
      c.stroke();
      break;
    }
    case 'casino': {
      for (let i = 0; i < 40; i++) {
        c.fillStyle = ['#ffd60a', '#ff4d6d', '#4cc9f0'][i % 3];
        c.globalAlpha = 0.6;
        c.beginPath();
        c.arc(rnd() * w, rnd() * h * 0.14, 6, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
      break;
    }
    case 'champ': {
      for (let i = 0; i < 5; i++) {
        const x = w * (0.1 + i * 0.2);
        const gr = c.createLinearGradient(x, 0, x, h * 0.6);
        gr.addColorStop(0, 'rgba(255,240,200,0.35)');
        gr.addColorStop(1, 'rgba(255,240,200,0)');
        c.fillStyle = gr;
        c.beginPath();
        c.moveTo(x - 20, 0);
        c.lineTo(x + 20, 0);
        c.lineTo(x + 160, h * 0.6);
        c.lineTo(x - 160, h * 0.6);
        c.fill();
      }
      c.fillStyle = 'rgba(0,0,0,0.5)';
      for (let i = 0; i < 60; i++) {
        c.beginPath();
        c.arc(rnd() * w, h * 0.1 + rnd() * h * 0.05, 14, 0, Math.PI * 2);
        c.fill();
      }
      break;
    }
  }
  c.restore();
}
