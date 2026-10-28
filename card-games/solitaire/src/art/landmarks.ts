import { darken, lighten, makeCanvas, roundRect, starPath, type Ctx } from '@shared/cards/draw';
import type { City } from '../data/cities';

/** Landmark silhouettes drawn into a box (0..w, 0..h), standing on the bottom edge. */
type Drawer = (c: Ctx, w: number, h: number) => void;

const rect = (c: Ctx, x: number, y: number, w: number, h: number) => c.fillRect(x, y, w, h);

function onion(c: Ctx, x: number, base: number, r: number): void {
  c.beginPath();
  c.moveTo(x - r, base);
  c.bezierCurveTo(x - r * 1.3, base - r * 0.9, x - r * 0.2, base - r * 1.2, x, base - r * 2);
  c.bezierCurveTo(x + r * 0.2, base - r * 1.2, x + r * 1.3, base - r * 0.9, x + r, base);
  c.closePath();
  c.fill();
  rect(c, x - r * 0.06, base - r * 2.5, r * 0.12, r * 0.6);
}

const LANDMARKS: Record<string, Drawer> = {
  moscow: (c, w, h) => {
    const b = h;
    rect(c, w * 0.05, b - h * 0.18, w * 0.9, h * 0.18);
    for (let i = 0; i < 12; i++) rect(c, w * 0.05 + i * w * 0.075, b - h * 0.22, w * 0.04, h * 0.05);
    rect(c, w * 0.42, b - h * 0.5, w * 0.16, h * 0.5);
    onion(c, w * 0.5, b - h * 0.5, w * 0.08);
    rect(c, w * 0.24, b - h * 0.38, w * 0.1, h * 0.38);
    onion(c, w * 0.29, b - h * 0.38, w * 0.06);
    rect(c, w * 0.66, b - h * 0.36, w * 0.1, h * 0.36);
    onion(c, w * 0.71, b - h * 0.36, w * 0.06);
    rect(c, w * 0.12, b - h * 0.3, w * 0.07, h * 0.3);
    onion(c, w * 0.155, b - h * 0.3, w * 0.04);
    rect(c, w * 0.82, b - h * 0.28, w * 0.07, h * 0.28);
    onion(c, w * 0.855, b - h * 0.28, w * 0.04);
  },
  paris: (c, w, h) => {
    const cx = w * 0.5;
    c.beginPath();
    c.moveTo(cx - w * 0.2, h);
    c.quadraticCurveTo(cx - w * 0.06, h * 0.55, cx - w * 0.015, h * 0.12);
    c.lineTo(cx + w * 0.015, h * 0.12);
    c.quadraticCurveTo(cx + w * 0.06, h * 0.55, cx + w * 0.2, h);
    c.lineTo(cx + w * 0.12, h);
    c.quadraticCurveTo(cx, h * 0.78, cx - w * 0.12, h);
    c.closePath();
    c.fill();
    rect(c, cx - w * 0.1, h * 0.62, w * 0.2, h * 0.03);
    rect(c, cx - w * 0.06, h * 0.4, w * 0.12, h * 0.025);
    rect(c, cx - w * 0.004, h * 0.03, w * 0.008, h * 0.1);
    for (let i = 0; i < 6; i++) rect(c, w * (0.02 + i * 0.05), h * 0.82, w * 0.04, h * 0.18);
    for (let i = 0; i < 6; i++) rect(c, w * (0.7 + i * 0.05), h * 0.8, w * 0.04, h * 0.2);
  },
  london: (c, w, h) => {
    const x = w * 0.62;
    rect(c, x, h * 0.25, w * 0.1, h * 0.75);
    c.beginPath();
    c.moveTo(x - w * 0.01, h * 0.25);
    c.lineTo(x + w * 0.05, h * 0.05);
    c.lineTo(x + w * 0.11, h * 0.25);
    c.fill();
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.arc(x + w * 0.05, h * 0.34, w * 0.032, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.beginPath();
    c.arc(x + w * 0.05, h * 0.34, w * 0.022, 0, Math.PI * 2);
    c.fill();
    rect(c, w * 0.04, h * 0.62, w * 0.55, h * 0.38);
    for (let i = 0; i < 8; i++) rect(c, w * (0.05 + i * 0.068), h * 0.56, w * 0.03, h * 0.08);
    rect(c, w * 0.76, h * 0.7, w * 0.22, h * 0.3);
    c.beginPath();
    c.arc(w * 0.87, h * 0.7, w * 0.08, Math.PI, 0);
    c.fill();
  },
  rome: (c, w, h) => {
    c.beginPath();
    c.ellipse(w * 0.5, h * 0.62, w * 0.42, h * 0.14, 0, Math.PI, 0);
    c.lineTo(w * 0.92, h);
    c.lineTo(w * 0.08, h);
    c.closePath();
    c.fill();
    c.save();
    c.globalCompositeOperation = 'destination-out';
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 10; i++) {
        const ax = w * (0.13 + i * 0.077);
        const ay = h * (0.62 + row * 0.12);
        c.beginPath();
        c.moveTo(ax, ay + h * 0.08);
        c.lineTo(ax, ay + h * 0.03);
        c.arc(ax + w * 0.022, ay + h * 0.03, w * 0.022, Math.PI, 0);
        c.lineTo(ax + w * 0.044, ay + h * 0.08);
        c.fill();
      }
    c.restore();
  },
  cairo: (c, w, h) => {
    const pyr = (x: number, s: number) => {
      c.beginPath();
      c.moveTo(x - s, h);
      c.lineTo(x, h - s * 0.95);
      c.lineTo(x + s, h);
      c.fill();
    };
    pyr(w * 0.32, w * 0.3);
    pyr(w * 0.66, w * 0.22);
    pyr(w * 0.86, w * 0.12);
    c.beginPath();
    c.ellipse(w * 0.12, h * 0.92, w * 0.08, h * 0.05, 0, 0, Math.PI * 2);
    c.fill();
    rect(c, w * 0.04, h * 0.88, w * 0.06, h * 0.12);
  },
  istanbul: (c, w, h) => {
    rect(c, w * 0.25, h * 0.6, w * 0.5, h * 0.4);
    c.beginPath();
    c.arc(w * 0.5, h * 0.6, w * 0.16, Math.PI, 0);
    c.fill();
    c.beginPath();
    c.arc(w * 0.32, h * 0.66, w * 0.08, Math.PI, 0);
    c.arc(w * 0.68, h * 0.66, w * 0.08, Math.PI, 0);
    c.fill();
    rect(c, w * 0.497, h * 0.32, w * 0.006, h * 0.12);
    for (const x of [0.12, 0.2, 0.8, 0.88]) {
      rect(c, w * x - w * 0.012, h * 0.2, w * 0.024, h * 0.8);
      c.beginPath();
      c.moveTo(w * x - w * 0.016, h * 0.2);
      c.lineTo(w * x, h * 0.08);
      c.lineTo(w * x + w * 0.016, h * 0.2);
      c.fill();
      rect(c, w * x - w * 0.02, h * 0.42, w * 0.04, h * 0.02);
    }
  },
  agra: (c, w, h) => {
    rect(c, w * 0.22, h * 0.6, w * 0.56, h * 0.4);
    c.beginPath();
    c.moveTo(w * 0.36, h * 0.6);
    c.bezierCurveTo(w * 0.3, h * 0.35, w * 0.46, h * 0.3, w * 0.5, h * 0.18);
    c.bezierCurveTo(w * 0.54, h * 0.3, w * 0.7, h * 0.35, w * 0.64, h * 0.6);
    c.fill();
    for (const x of [0.07, 0.93]) {
      rect(c, w * x - w * 0.015, h * 0.3, w * 0.03, h * 0.7);
      c.beginPath();
      c.arc(w * x, h * 0.3, w * 0.025, Math.PI, 0);
      c.fill();
    }
    c.beginPath();
    c.arc(w * 0.28, h * 0.6, w * 0.05, Math.PI, 0);
    c.arc(w * 0.72, h * 0.6, w * 0.05, Math.PI, 0);
    c.fill();
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.moveTo(w * 0.44, h);
    c.lineTo(w * 0.44, h * 0.76);
    c.quadraticCurveTo(w * 0.5, h * 0.66, w * 0.56, h * 0.76);
    c.lineTo(w * 0.56, h);
    c.fill();
    c.restore();
  },
  beijing: (c, w, h) => {
    const roof = (x: number, y: number, rw: number, rh: number) => {
      c.beginPath();
      c.moveTo(x - rw, y);
      c.quadraticCurveTo(x - rw * 0.6, y - rh * 0.2, x - rw * 0.5, y - rh);
      c.lineTo(x + rw * 0.5, y - rh);
      c.quadraticCurveTo(x + rw * 0.6, y - rh * 0.2, x + rw, y);
      c.closePath();
      c.fill();
    };
    rect(c, w * 0.1, h * 0.75, w * 0.8, h * 0.25);
    roof(w * 0.5, h * 0.75, w * 0.46, h * 0.1);
    rect(c, w * 0.26, h * 0.52, w * 0.48, h * 0.14);
    roof(w * 0.5, h * 0.52, w * 0.32, h * 0.1);
    rect(c, w * 0.36, h * 0.34, w * 0.28, h * 0.1);
    roof(w * 0.5, h * 0.34, w * 0.22, h * 0.1);
    rect(c, w * 0.497, h * 0.14, w * 0.006, h * 0.1);
  },
  tokyo: (c, w, h) => {
    c.beginPath();
    c.moveTo(0, h * 0.85);
    c.lineTo(w * 0.36, h * 0.2);
    c.lineTo(w * 0.46, h * 0.18);
    c.lineTo(w * 0.86, h * 0.85);
    c.closePath();
    c.save();
    c.globalAlpha = 0.55;
    c.fill();
    c.restore();
    rect(c, w * 0.58, h * 0.48, w * 0.03, h * 0.52);
    rect(c, w * 0.86, h * 0.48, w * 0.03, h * 0.52);
    c.beginPath();
    c.moveTo(w * 0.52, h * 0.44);
    c.quadraticCurveTo(w * 0.735, h * 0.36, w * 0.95, h * 0.44);
    c.lineTo(w * 0.95, h * 0.48);
    c.lineTo(w * 0.52, h * 0.48);
    c.fill();
    rect(c, w * 0.56, h * 0.54, w * 0.35, h * 0.03);
    for (let i = 0; i < 7; i++) rect(c, w * (0.02 + i * 0.07), h * (0.75 - (i % 3) * 0.05), w * 0.05, h * 0.3);
  },
  sydney: (c, w, h) => {
    rect(c, w * 0.08, h * 0.8, w * 0.84, h * 0.2);
    const sail = (x: number, s: number) => {
      c.beginPath();
      c.moveTo(x, h * 0.8);
      c.quadraticCurveTo(x + s * 0.1, h * 0.8 - s * 1.1, x + s, h * 0.8 - s * 0.9);
      c.quadraticCurveTo(x + s * 0.7, h * 0.8 - s * 0.4, x + s * 0.9, h * 0.8);
      c.closePath();
      c.fill();
    };
    sail(w * 0.14, w * 0.26);
    sail(w * 0.3, w * 0.3);
    sail(w * 0.48, w * 0.24);
    sail(w * 0.62, w * 0.18);
    c.lineWidth = w * 0.012;
    c.strokeStyle = c.fillStyle as string;
    c.beginPath();
    c.arc(w * 0.92, h * 1.3, w * 0.5, Math.PI * 1.25, Math.PI * 1.6);
    c.stroke();
  },
  newyork: (c, w, h) => {
    const bs = [
      [0.02, 0.5, 0.08],
      [0.1, 0.35, 0.07],
      [0.18, 0.6, 0.08],
      [0.62, 0.45, 0.07],
      [0.7, 0.25, 0.08],
      [0.79, 0.55, 0.06],
      [0.86, 0.4, 0.1],
    ];
    for (const [x, y, ww] of bs) rect(c, w * x, h * y, w * ww, h * (1 - y));
    rect(c, w * 0.735, h * 0.12, w * 0.01, h * 0.14);
    // Liberty
    rect(c, w * 0.36, h * 0.72, w * 0.18, h * 0.28);
    c.beginPath();
    c.moveTo(w * 0.4, h * 0.72);
    c.lineTo(w * 0.42, h * 0.32);
    c.lineTo(w * 0.48, h * 0.32);
    c.lineTo(w * 0.5, h * 0.72);
    c.fill();
    c.beginPath();
    c.arc(w * 0.45, h * 0.28, w * 0.03, 0, Math.PI * 2);
    c.fill();
    rect(c, w * 0.47, h * 0.12, w * 0.016, h * 0.2);
    starPath(c, w * 0.478, h * 0.1, w * 0.03, 0.5);
    c.fill();
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      const a = -Math.PI / 2 + (i - 2) * 0.45;
      c.moveTo(w * 0.45, h * 0.26);
      c.lineTo(w * 0.45 + Math.cos(a) * w * 0.05, h * 0.26 + Math.sin(a) * w * 0.05);
      c.lineWidth = 4;
      c.strokeStyle = c.fillStyle as string;
      c.stroke();
    }
  },
  rio: (c, w, h) => {
    c.beginPath();
    c.moveTo(0, h);
    c.quadraticCurveTo(w * 0.2, h * 0.75, w * 0.45, h * 0.42);
    c.quadraticCurveTo(w * 0.55, h * 0.36, w * 0.65, h * 0.5);
    c.quadraticCurveTo(w * 0.85, h * 0.8, w, h * 0.85);
    c.lineTo(w, h);
    c.fill();
    rect(c, w * 0.54, h * 0.18, w * 0.024, h * 0.26);
    rect(c, w * 0.46, h * 0.24, w * 0.18, h * 0.02);
    c.beginPath();
    c.arc(w * 0.552, h * 0.16, w * 0.018, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(w * 0.8, h);
    c.quadraticCurveTo(w * 0.86, h * 0.45, w * 0.92, h * 0.5);
    c.quadraticCurveTo(w * 0.97, h * 0.7, w, h);
    c.fill();
  },
};

export function drawLandmark(c: Ctx, city: City, w: number, h: number, color = city.sil): void {
  c.save();
  c.fillStyle = color;
  (LANDMARKS[city.id] ?? LANDMARKS.moscow)(c, w, h);
  c.restore();
}

/** Full scene: sky gradient, sun, distant hills, landmark. */
export function drawCityScene(c: Ctx, city: City, w: number, h: number, opts: { stars?: boolean } = {}): void {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, city.sky[0]);
  g.addColorStop(1, city.sky[1]);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  if (opts.stars) {
    c.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 40; i++) {
      c.beginPath();
      c.arc((i * 97.3) % w, ((i * 53.1) % (h * 0.45)) + 4, (i % 3) + 0.8, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.fillStyle = lighten(city.sky[1], 0.45);
  c.globalAlpha = 0.85;
  c.beginPath();
  c.arc(w * 0.78, h * 0.32, Math.min(w, h) * 0.12, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;
  c.fillStyle = darken(city.ground, 0.0);
  c.globalAlpha = 0.6;
  c.beginPath();
  c.moveTo(0, h * 0.8);
  for (let x = 0; x <= w; x += w / 8) c.lineTo(x, h * (0.74 + Math.sin(x / w * 7) * 0.04));
  c.lineTo(w, h);
  c.lineTo(0, h);
  c.fill();
  c.globalAlpha = 1;
  c.save();
  c.translate(w * 0.06, h * 0.22);
  drawLandmark(c, city, w * 0.88, h * 0.78);
  c.restore();
}

/** Postcard (collection item): framed city scene with a stamp. */
export function renderPostcard(city: City, index: number, w: number, h: number, locked: boolean): HTMLCanvasElement {
  const [cv, c] = makeCanvas(w, h);
  roundRect(c, 2, 2, w - 4, h - 4, 14);
  c.fillStyle = '#fff8e6';
  c.fill();
  c.save();
  roundRect(c, 14, 14, w - 28, h - 28, 8);
  c.clip();
  if (locked) {
    c.fillStyle = '#3a4568';
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.font = `bold ${Math.round(h * 0.5)}px Georgia`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('?', w / 2, h / 2);
  } else {
    c.translate(14, 14);
    const variant = { ...city, sky: index === 1 ? ([darken(city.sky[0], 0.4), city.sky[0]] as [string, string]) : index === 2 ? ([city.sky[1], lighten(city.sky[1], 0.4)] as [string, string]) : city.sky };
    drawCityScene(c, variant, w - 28, h - 28, { stars: index === 1 });
  }
  c.restore();
  if (!locked) {
    // Stamp
    const sx = w - 70;
    const sy = 22;
    c.fillStyle = '#ffffff';
    c.fillRect(sx, sy, 50, 58);
    c.strokeStyle = city.accent;
    c.lineWidth = 3;
    c.setLineDash([4, 3]);
    c.strokeRect(sx + 3, sy + 3, 44, 52);
    c.setLineDash([]);
    c.fillStyle = city.sky[0];
    c.fillRect(sx + 8, sy + 8, 34, 42);
    starPath(c, sx + 25, sy + 29, 12);
    c.fillStyle = city.accent;
    c.fill();
  }
  return cv;
}
