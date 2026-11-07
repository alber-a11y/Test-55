import type Phaser from 'phaser';
import { ICON_SETS } from './icons';
import { bgSvg } from './backgrounds';
import { tileShadowSvg, tileSvg, TILE_H, TILE_W } from './skins';
import { iconSvg } from './svg';
import { iceOverlay, lockOverlay, UI_ICONS } from './ui';

/** Icons are rasterised at this size; tiles show them at ~118 px. */
export const ICON_PX = 128;

type TM = Phaser.Textures.TextureManager;
const pending = new Map<string, Promise<void>>();

/** Rasterise an SVG string into a Phaser texture (cached, de-duplicated). */
export function svgTexture(tm: TM, key: string, svg: string, w: number, h: number): Promise<void> {
  if (tm.exists(key)) return Promise.resolve();
  const p = pending.get(key);
  if (p) return p;
  const pr = new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (!tm.exists(key)) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d')!.drawImage(img, 0, 0, w, h);
        tm.addCanvas(key, c);
      }
      pending.delete(key);
      resolve();
    };
    img.onerror = () => {
      console.warn('svg texture failed', key);
      pending.delete(key);
      resolve();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  pending.set(key, pr);
  return pr;
}

export const iconKey = (set: string, i: number) => `ic_${set}_${i}`;
export const tileKey = (skin: string, hidden = false) => `${hidden ? 'tq' : 'tile'}_${skin}`;

export function ensureIcons(tm: TM, set: string, only?: number[]): Promise<void> {
  const fns = ICON_SETS[set] ?? ICON_SETS.icons_garden;
  const idx = only ?? fns.map((_, i) => i);
  return Promise.all(idx.map((i) => svgTexture(tm, iconKey(set, i), iconSvg(fns[i], ICON_PX), ICON_PX, ICON_PX))).then(() => undefined);
}

export function ensureSkin(tm: TM, skin: string): Promise<void> {
  return Promise.all([
    svgTexture(tm, tileKey(skin), tileSvg(skin), TILE_W, TILE_H),
    svgTexture(tm, tileKey(skin, true), tileSvg(skin, 'hidden'), TILE_W, TILE_H),
  ]).then(() => undefined);
}

export function ensureUi(tm: TM): Promise<void> {
  const jobs = Object.entries(UI_ICONS).map(([k, fn]) => svgTexture(tm, `ui_${k}`, iconSvg(fn, 112), 112, 112));
  jobs.push(svgTexture(tm, 'ov_ice', iceOverlay(), 150, 150));
  jobs.push(svgTexture(tm, 'ov_lock', lockOverlay(), 150, 150));
  jobs.push(svgTexture(tm, 'tile_shadow', tileShadowSvg(), 170, 184));
  makeParticles(tm);
  return Promise.all(jobs).then(() => undefined);
}

const bgKeys = new Set<string>();
/** Full-screen background for the current game size. Older sizes are evicted to save memory. */
export function ensureBg(tm: TM, id: string, w: number, h: number): Promise<string> {
  const key = `bgimg_${id}_${w}x${h}`;
  return svgTexture(tm, key, bgSvg(id, w, h), w, h).then(() => {
    bgKeys.add(key);
    if (bgKeys.size > 3) {
      for (const k of bgKeys) {
        if (k === key) continue;
        if (tm.exists(k)) tm.remove(k);
        bgKeys.delete(k);
        if (bgKeys.size <= 3) break;
      }
    }
    return key;
  });
}

export function ensureBgThumb(tm: TM, id: string): Promise<string> {
  const key = `bgthumb_${id}`;
  return svgTexture(tm, key, bgSvg(id, 420, 320), 420, 320).then(() => key);
}

function makeParticles(tm: TM): void {
  if (tm.exists('px_dot')) return;
  const dot = document.createElement('canvas');
  dot.width = dot.height = 32;
  const g = dot.getContext('2d')!;
  const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  rg.addColorStop(0, 'rgba(255,255,255,1)');
  rg.addColorStop(0.4, 'rgba(255,255,255,.9)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 32, 32);
  tm.addCanvas('px_dot', dot);
  const sq = document.createElement('canvas');
  sq.width = 16;
  sq.height = 10;
  const q = sq.getContext('2d')!;
  q.fillStyle = '#fff';
  roundRect(q, 0, 0, 16, 10, 3);
  q.fill();
  tm.addCanvas('px_conf', sq);
  const st = document.createElement('canvas');
  st.width = st.height = 40;
  const s = st.getContext('2d')!;
  s.fillStyle = '#fff';
  s.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? 6 : 20;
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    s.lineTo(20 + Math.cos(a) * r, 20 + Math.sin(a) * r);
  }
  s.closePath();
  s.fill();
  tm.addCanvas('px_star', st);
}

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

/** Canvas-drawn texture, cached by key. */
export function canvasTexture(tm: TM, key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): string {
  if (tm.exists(key)) return key;
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.ceil(w));
  c.height = Math.max(2, Math.ceil(h));
  draw(c.getContext('2d')!);
  tm.addCanvas(key, c);
  return key;
}

/** Chunky 3D button: darker "edge" below a glossy gradient face. */
export function buttonTexture(tm: TM, w: number, h: number, colors: [string, string, string], radius = 34): string {
  const key = `btn_${w}x${h}_${colors.join('')}_${radius}`;
  return canvasTexture(tm, key, w, h + 12, (g) => {
    g.fillStyle = 'rgba(0,0,0,.18)';
    roundRect(g, 2, 10, w - 4, h + 2, radius);
    g.fill();
    g.fillStyle = colors[2];
    roundRect(g, 0, 8, w, h, radius);
    g.fill();
    const lg = g.createLinearGradient(0, 0, 0, h - 8);
    lg.addColorStop(0, colors[0]);
    lg.addColorStop(1, colors[1]);
    g.fillStyle = lg;
    roundRect(g, 0, 0, w, h - 6, radius);
    g.fill();
    g.save();
    roundRect(g, 0, 0, w, h - 6, radius);
    g.clip();
    const gl = g.createLinearGradient(0, 0, 0, (h - 6) * 0.55);
    gl.addColorStop(0, 'rgba(255,255,255,.5)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl;
    roundRect(g, 6, 4, w - 12, (h - 6) * 0.5, radius * 0.8);
    g.fill();
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.lineWidth = 3;
    roundRect(g, 1.5, 1.5, w - 3, h - 9, radius - 1);
    g.stroke();
  });
}

/** Rounded panel with a gradient, border and soft inner highlight. */
export function panelTexture(tm: TM, w: number, h: number, top: string, bottom: string, border: string, radius = 44, borderW = 8): string {
  const key = `pnl_${w}x${h}_${top}${bottom}${border}_${radius}_${borderW}`;
  return canvasTexture(tm, key, w, h + 14, (g) => {
    g.fillStyle = 'rgba(0,0,0,.22)';
    roundRect(g, 4, 12, w - 8, h, radius);
    g.fill();
    g.fillStyle = border;
    roundRect(g, 0, 0, w, h, radius);
    g.fill();
    const lg = g.createLinearGradient(0, 0, 0, h);
    lg.addColorStop(0, top);
    lg.addColorStop(1, bottom);
    g.fillStyle = lg;
    roundRect(g, borderW, borderW, w - borderW * 2, h - borderW * 2, radius - borderW);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.6)';
    g.lineWidth = 3;
    roundRect(g, borderW + 3, borderW + 3, w - borderW * 2 - 6, h - borderW * 2 - 6, radius - borderW - 2);
    g.stroke();
  });
}

/** Semi-transparent dark pill for counters. */
export function pillTexture(tm: TM, w: number, h: number, color = 'rgba(16,30,60,.45)'): string {
  return canvasTexture(tm, `pill_${w}x${h}_${color}`, w, h, (g) => {
    g.fillStyle = color;
    roundRect(g, 0, 0, w, h, h / 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)';
    g.lineWidth = 3;
    roundRect(g, 1.5, 1.5, w - 3, h - 3, h / 2 - 1);
    g.stroke();
  });
}

/** Tray frame with N slots. */
export function trayTexture(tm: TM, w: number, h: number, slots: number, slotW: number, c: { top: string; bottom: string; border: string; slot: string }): string {
  const key = `tray_${w}x${h}_${slots}_${slotW}_${c.top}${c.slot}`;
  return canvasTexture(tm, key, w, h + 12, (g) => {
    g.fillStyle = 'rgba(0,0,0,.25)';
    roundRect(g, 4, 10, w - 8, h, 40);
    g.fill();
    g.fillStyle = c.border;
    roundRect(g, 0, 0, w, h, 40);
    g.fill();
    const lg = g.createLinearGradient(0, 0, 0, h);
    lg.addColorStop(0, c.top);
    lg.addColorStop(1, c.bottom);
    g.fillStyle = lg;
    roundRect(g, 7, 7, w - 14, h - 14, 34);
    g.fill();
    const pad = (w - slots * slotW) / 2;
    for (let i = 0; i < slots; i++) {
      g.fillStyle = c.slot;
      roundRect(g, pad + i * slotW + 5, 20, slotW - 10, h - 40, 18);
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,.25)';
      g.lineWidth = 3;
      roundRect(g, pad + i * slotW + 6.5, 21.5, slotW - 13, h - 43, 17);
      g.stroke();
    }
  });
}
