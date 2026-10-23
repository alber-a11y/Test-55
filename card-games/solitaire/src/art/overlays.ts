import type Phaser from 'phaser';
import { CARD_TH, CARD_TW } from '@shared/cards/faces';
import { makeCanvas, roundRect } from '@shared/cards/draw';

/** Obstacle overlays drawn at card texture size. */
export function registerOverlays(textures: Phaser.Textures.TextureManager): void {
  const w = CARD_TW;
  const h = CARD_TH;
  const r = w * 0.075;
  for (const layers of [1, 2]) {
    const key = `ov_ice${layers}`;
    if (textures.exists(key)) continue;
    const [cv, c] = makeCanvas(w, h);
    roundRect(c, 2, 2, w - 4, h - 4, r);
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, `rgba(210,240,255,${layers === 2 ? 0.85 : 0.62})`);
    g.addColorStop(1, `rgba(120,190,240,${layers === 2 ? 0.9 : 0.7})`);
    c.fillStyle = g;
    c.fill();
    c.lineWidth = 6;
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.75)';
    c.lineWidth = 3;
    const cracks = layers === 2 ? 7 : 4;
    for (let k = 0; k < cracks; k++) {
      c.beginPath();
      let x = w * (0.2 + ((k * 37) % 60) / 100);
      let y = h * (0.15 + ((k * 23) % 70) / 100);
      c.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += ((k + s) % 2 ? 1 : -1) * w * 0.12;
        y += h * 0.07;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    // Shine
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.beginPath();
    c.moveTo(w * 0.12, h * 0.08);
    c.lineTo(w * 0.42, h * 0.08);
    c.lineTo(w * 0.12, h * 0.38);
    c.fill();
    textures.addCanvas(key, cv);
  }
  if (!textures.exists('ov_lock')) {
    const [cv, c] = makeCanvas(w, h);
    roundRect(c, 2, 2, w - 4, h - 4, r);
    c.fillStyle = 'rgba(20,16,40,0.45)';
    c.fill();
    c.strokeStyle = '#8d95ad';
    c.lineWidth = 14;
    c.beginPath();
    c.moveTo(0, h * 0.3);
    c.lineTo(w, h * 0.7);
    c.moveTo(w, h * 0.3);
    c.lineTo(0, h * 0.7);
    c.stroke();
    c.strokeStyle = '#c9d1e4';
    c.lineWidth = 6;
    c.setLineDash([18, 10]);
    c.stroke();
    textures.addCanvas('ov_lock', cv);
  }
  if (!textures.exists('ov_gold')) {
    const [cv, c] = makeCanvas(w, h);
    roundRect(c, 3, 3, w - 6, h - 6, r);
    c.lineWidth = 12;
    c.strokeStyle = '#ffc531';
    c.stroke();
    c.lineWidth = 4;
    c.strokeStyle = '#fff1a8';
    c.stroke();
    textures.addCanvas('ov_gold', cv);
  }
}
