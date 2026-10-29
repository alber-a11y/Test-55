import { darken, lighten, makeCanvas, noiseRng, roundRect, starPath, type Ctx } from '@shared/cards/draw';
import type { Scenery, World } from '../data/route';

/**
 * Carriage interiors drawn in code: panelled walls, windows with the passing landscape,
 * brass lamps and the table with a tablecloth where the cards are played.
 */
export function renderCarriage(world: World, w: number, h: number, opts: { table?: boolean } = {}): HTMLCanvasElement {
  const [cv, c] = makeCanvas(w, h);
  const rnd = noiseRng(world.id.length * 131 + 7);
  // Wall
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, lighten(world.wall, 0.08));
  g.addColorStop(1, darken(world.wall, 0.35));
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // Vertical panels
  const pw = Math.max(160, Math.round(w / 9));
  for (let x = 0; x < w; x += pw) {
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(x, 0, 4, h);
    c.fillStyle = 'rgba(255,255,255,0.05)';
    c.fillRect(x + 4, 0, 2, h);
  }
  // Windows band
  const portrait = h > w;
  const wy = portrait ? h * 0.035 : h * 0.03;
  const wh = portrait ? h * 0.15 : h * 0.24;
  const n = portrait ? 2 : Math.max(3, Math.round(w / 560));
  const gap = w * 0.04;
  const ww = (w - gap * (n + 1)) / n;
  for (let i = 0; i < n; i++) {
    const x = gap + i * (ww + gap);
    // Frame
    c.fillStyle = darken(world.wood, 0.25);
    roundRect(c, x - 14, wy - 14, ww + 28, wh + 28, 30);
    c.fill();
    c.fillStyle = world.wood;
    roundRect(c, x - 9, wy - 9, ww + 18, wh + 18, 26);
    c.fill();
    c.save();
    roundRect(c, x, wy, ww, wh, 22);
    c.clip();
    scenery(c, world.scenery, world.sky, x, wy, ww, wh, noiseRng(i * 97 + world.id.length));
    // Glass reflection
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.beginPath();
    c.moveTo(x + ww * 0.1, wy);
    c.lineTo(x + ww * 0.3, wy);
    c.lineTo(x + ww * 0.12, wy + wh);
    c.lineTo(x - ww * 0.08, wy + wh);
    c.fill();
    c.restore();
    // Curtains
    c.fillStyle = darken(world.cloth, 0.1);
    for (const side of [0, 1]) {
      const cx0 = side ? x + ww - ww * 0.11 : x;
      c.beginPath();
      c.moveTo(cx0, wy - 6);
      c.lineTo(cx0 + ww * 0.11, wy - 6);
      c.quadraticCurveTo(cx0 + (side ? ww * 0.02 : ww * 0.09), wy + wh * 0.5, cx0 + (side ? ww * 0.11 : 0), wy + wh + 6);
      c.lineTo(cx0 + (side ? ww * 0.11 : 0), wy + wh + 6);
      c.lineTo(cx0 + (side ? ww * 0.11 : 0), wy - 6);
      c.closePath();
      c.fill();
    }
    c.fillStyle = world.accent;
    c.fillRect(x - 10, wy - 18, ww + 20, 6);
  }
  // Brass luggage rail under the windows
  const ry = wy + wh + 34;
  c.fillStyle = '#c9a55c';
  c.fillRect(0, ry, w, 7);
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(0, ry + 7, w, 4);
  // Lamps between windows
  for (let i = 0; i <= n; i++) {
    const lx = gap / 2 + i * (ww + gap);
    if (lx < 30 || lx > w - 30) continue;
    const lg = c.createRadialGradient(lx, wy + wh * 0.4, 4, lx, wy + wh * 0.4, 90);
    lg.addColorStop(0, 'rgba(255,230,160,0.55)');
    lg.addColorStop(1, 'rgba(255,230,160,0)');
    c.fillStyle = lg;
    c.fillRect(lx - 90, wy + wh * 0.4 - 90, 180, 180);
    c.fillStyle = '#c9a55c';
    c.fillRect(lx - 3, wy + wh * 0.18, 6, wh * 0.18);
    c.fillStyle = '#fff1c1';
    c.beginPath();
    c.ellipse(lx, wy + wh * 0.42, 13, 17, 0, 0, Math.PI * 2);
    c.fill();
  }
  // Wainscot
  c.fillStyle = darken(world.wood, 0.1);
  c.fillRect(0, h * 0.62, w, h * 0.38);
  c.fillStyle = 'rgba(0,0,0,0.2)';
  c.fillRect(0, h * 0.62, w, 6);
  for (let x = pw / 2; x < w; x += pw) {
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 3;
    roundRect(c, x - pw * 0.4, h * 0.66, pw * 0.8, h * 0.28, 10);
    c.stroke();
  }
  if (opts.table === false) return cv;
  // Table with a tablecloth
  const tx = w * 0.04;
  const ty = portrait ? h * 0.22 : h * 0.3;
  const tw = w * 0.92;
  const th = portrait ? h * 0.72 : h * 0.66;
  const r = Math.min(tw, th) * 0.14;
  c.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(c, tx + 8, ty + 18, tw, th, r);
  c.fill();
  c.fillStyle = darken(world.wood, 0.2);
  roundRect(c, tx - 10, ty - 10, tw + 20, th + 20, r + 8);
  c.fill();
  const tg = c.createRadialGradient(w / 2, ty + th * 0.45, 40, w / 2, ty + th / 2, Math.max(tw, th) * 0.75);
  tg.addColorStop(0, lighten(world.cloth, 0.14));
  tg.addColorStop(1, darken(world.cloth, 0.28));
  c.fillStyle = tg;
  roundRect(c, tx, ty, tw, th, r);
  c.fill();
  // Damask pattern on the cloth
  c.save();
  roundRect(c, tx, ty, tw, th, r);
  c.clip();
  c.globalAlpha = 0.06;
  c.fillStyle = lighten(world.cloth, 0.6);
  const step = 90;
  for (let y = ty; y < ty + th + step; y += step)
    for (let x = tx + ((y - ty) / step % 2 ? step / 2 : 0); x < tx + tw + step; x += step) {
      starPath(c, x, y, 18, 0.35, 4, 0);
      c.fill();
    }
  c.globalAlpha = 1;
  for (let i = 0; i < (tw * th) / 160; i++) {
    c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
    c.fillRect(tx + rnd() * tw, ty + rnd() * th, 2, 2);
  }
  c.restore();
  // Brass rim
  c.lineWidth = 6;
  c.strokeStyle = '#c9a55c';
  roundRect(c, tx + 4, ty + 4, tw - 8, th - 8, r - 4);
  c.stroke();
  c.lineWidth = 2;
  c.strokeStyle = 'rgba(255,240,200,0.35)';
  roundRect(c, tx + 18, ty + 18, tw - 36, th - 36, r - 14);
  c.stroke();
  return cv;
}

function hill(c: Ctx, x: number, y: number, w: number, h: number, base: number, amp: number, col: string, seed: number): void {
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x, y + h);
  for (let i = 0; i <= 40; i++) {
    const xx = x + (i / 40) * w;
    c.lineTo(xx, y + base + Math.sin(i * 0.45 + seed) * amp + Math.sin(i * 0.17 + seed * 2) * amp * 0.7);
  }
  c.lineTo(x + w, y + h);
  c.closePath();
  c.fill();
}

function scenery(c: Ctx, kind: Scenery, sky: [string, string], x: number, y: number, w: number, h: number, rnd: () => number): void {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, sky[0]);
  g.addColorStop(1, sky[1]);
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
  switch (kind) {
    case 'birches': {
      hill(c, x, y, w, h, h * 0.55, 10, '#8fbf6a', 1);
      hill(c, x, y, w, h, h * 0.72, 6, '#5f9e4f', 2);
      for (let i = 0; i < 9; i++) {
        const bx = x + rnd() * w;
        const by = y + h * (0.55 + rnd() * 0.2);
        c.fillStyle = '#3f7d3a';
        c.beginPath();
        c.ellipse(bx, by - h * 0.12, 22 + rnd() * 10, h * 0.16, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#f5f5f0';
        c.fillRect(bx - 3, by - h * 0.12, 6, h * 0.3);
        c.fillStyle = '#222';
        for (let k = 0; k < 3; k++) c.fillRect(bx - 3, by - h * 0.05 + k * 10, 4, 2);
      }
      break;
    }
    case 'fields': {
      c.fillStyle = '#ffd66b';
      c.beginPath();
      c.arc(x + w * 0.8, y + h * 0.28, h * 0.12, 0, Math.PI * 2);
      c.fill();
      hill(c, x, y, w, h, h * 0.5, 8, '#c8d96f', 3);
      hill(c, x, y, w, h, h * 0.66, 6, '#f2c94c', 4);
      hill(c, x, y, w, h, h * 0.82, 4, '#e0a83a', 5);
      for (let i = 0; i < 14; i++) {
        c.fillStyle = '#6b4a12';
        c.beginPath();
        c.arc(x + rnd() * w, y + h * (0.75 + rnd() * 0.2), 4, 0, Math.PI * 2);
        c.fill();
      }
      break;
    }
    case 'river': {
      hill(c, x, y, w, h, h * 0.45, 12, '#5d9b7a', 6);
      c.fillStyle = '#4fa3d9';
      c.fillRect(x, y + h * 0.62, w, h * 0.16);
      c.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 10; i++) c.fillRect(x + rnd() * w, y + h * (0.64 + rnd() * 0.12), 20, 2);
      c.strokeStyle = '#6b4a2a';
      c.lineWidth = 5;
      c.beginPath();
      c.arc(x + w * 0.5, y + h * 0.78, w * 0.18, Math.PI, Math.PI * 2);
      c.stroke();
      hill(c, x, y, w, h, h * 0.84, 3, '#3f7d3a', 7);
      break;
    }
    case 'city': {
      c.fillStyle = '#ffe9a8';
      c.beginPath();
      c.arc(x + w * 0.2, y + h * 0.6, h * 0.1, 0, Math.PI * 2);
      c.fill();
      let bx = x;
      while (bx < x + w) {
        const bw = 20 + rnd() * 40;
        const bh = h * (0.25 + rnd() * 0.45);
        c.fillStyle = '#2b2346';
        c.fillRect(bx, y + h - bh, bw - 4, bh);
        c.fillStyle = '#ffd36b';
        for (let wy2 = y + h - bh + 8; wy2 < y + h - 6; wy2 += 12)
          for (let wx = bx + 4; wx < bx + bw - 10; wx += 10) if (rnd() < 0.4) c.fillRect(wx, wy2, 4, 5);
        bx += bw;
      }
      break;
    }
    case 'autumn': {
      hill(c, x, y, w, h, h * 0.52, 10, '#c97b3a', 8);
      hill(c, x, y, w, h, h * 0.7, 6, '#9a5a2a', 9);
      for (let i = 0; i < 12; i++) {
        const tx = x + rnd() * w;
        const ty = y + h * (0.55 + rnd() * 0.2);
        c.fillStyle = ['#e85d04', '#f48c06', '#dc2f02', '#ffba08'][i % 4];
        c.beginPath();
        c.arc(tx, ty - 14, 16 + rnd() * 8, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#4a2c17';
        c.fillRect(tx - 2, ty, 4, 16);
      }
      break;
    }
    case 'mountains': {
      for (const [base, col, snow] of [
        [0.25, '#8aa4c4', true],
        [0.45, '#5c7a99', true],
        [0.7, '#3d5a73', false],
      ] as const) {
        c.fillStyle = col;
        c.beginPath();
        c.moveTo(x, y + h);
        let px = x;
        while (px < x + w + 60) {
          const peak = y + h * base + rnd() * h * 0.1;
          const half = 40 + rnd() * 50;
          c.lineTo(px + half, peak);
          c.lineTo(px + half * 2, y + h * (base + 0.25));
          if (snow) {
            c.save();
            c.fillStyle = '#ffffff';
            c.beginPath();
            c.moveTo(px + half * 0.7, peak + half * 0.3);
            c.lineTo(px + half, peak);
            c.lineTo(px + half * 1.3, peak + half * 0.3);
            c.closePath();
            c.fill();
            c.restore();
          }
          px += half * 2;
        }
        c.lineTo(x + w, y + h);
        c.closePath();
        c.fill();
      }
      break;
    }
    case 'desert': {
      c.fillStyle = '#fff1b8';
      c.beginPath();
      c.arc(x + w * 0.75, y + h * 0.35, h * 0.14, 0, Math.PI * 2);
      c.fill();
      hill(c, x, y, w, h, h * 0.6, 12, '#e9b872', 10);
      hill(c, x, y, w, h, h * 0.78, 8, '#d49a52', 11);
      for (let i = 0; i < 3; i++) {
        const px = x + w * (0.15 + i * 0.3) + rnd() * 30;
        const py = y + h * 0.66;
        c.strokeStyle = '#6b4a2a';
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(px, py + 30);
        c.quadraticCurveTo(px + 6, py, px + 2, py - 20);
        c.stroke();
        c.fillStyle = '#3f7d3a';
        for (let k = 0; k < 5; k++) {
          c.beginPath();
          c.ellipse(px + 2 + Math.cos(k * 1.3) * 16, py - 22 + Math.sin(k * 1.3) * 6, 18, 5, k * 1.3, 0, Math.PI * 2);
          c.fill();
        }
      }
      break;
    }
    case 'night': {
      c.fillStyle = '#ffffff';
      for (let i = 0; i < 60; i++) {
        c.globalAlpha = 0.3 + rnd() * 0.7;
        c.fillRect(x + rnd() * w, y + rnd() * h * 0.7, 2, 2);
      }
      c.globalAlpha = 1;
      c.fillStyle = '#fff3c4';
      c.beginPath();
      c.arc(x + w * 0.7, y + h * 0.3, h * 0.12, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#0b1026';
      c.beginPath();
      c.arc(x + w * 0.7 + h * 0.05, y + h * 0.28, h * 0.11, 0, Math.PI * 2);
      c.fill();
      hill(c, x, y, w, h, h * 0.7, 10, '#162040', 12);
      for (let i = 0; i < 6; i++) {
        c.fillStyle = '#ffd36b';
        c.fillRect(x + rnd() * w, y + h * (0.78 + rnd() * 0.12), 3, 3);
      }
      break;
    }
  }
  // Speed streaks
  c.strokeStyle = 'rgba(255,255,255,0.18)';
  c.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const sy = y + rnd() * h;
    const sx = x + rnd() * w;
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(sx + 40 + rnd() * 50, sy);
    c.stroke();
  }
}

/** The landscape alone (route map sections). */
export function renderLandscape(world: World, w: number, h: number): HTMLCanvasElement {
  const [cv, c] = makeCanvas(w, h);
  scenery(c, world.scenery, world.sky, 0, 0, w, h, noiseRng(world.id.length * 53 + 11));
  return cv;
}
