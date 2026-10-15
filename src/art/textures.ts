import Phaser from 'phaser';
import { BIOMES } from '../data/biomes';
import { ENEMIES } from '../data/enemies';
import { heroById } from '../data/heroes';
import { SKINS } from '../data/shop';
import { BOSS_SVG } from './bosses';
import { enemySvg, heroSvg } from './characters';
import { FX, ICONS, PICKUPS, PROJECTILES } from './icons';
import { barrelSvg, bushSvg, crateSvg, edgeSvg, floorSvg, wallSvg, waterSvg } from './tiles';

interface Job {
  key: string;
  svg: string;
  scale: number;
}

function sizeOf(svg: string): [number, number] {
  const w = /width="([\d.]+)"/.exec(svg);
  const h = /height="([\d.]+)"/.exec(svg);
  return [w ? parseFloat(w[1]) : 64, h ? parseFloat(h[1]) : 64];
}

function rasterize(svg: string, scale: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const [w, h] = sizeOf(svg);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * scale));
      c.height = Math.max(1, Math.round(h * scale));
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c);
    };
    img.onerror = () => reject(new Error('svg rasterize failed'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

function jobs(): Job[] {
  const list: Job[] = [];
  for (const s of SKINS) {
    const svg = heroSvg(heroById(s.hero).look, s);
    list.push({ key: `hero_${s.id}`, svg, scale: 1 });
    list.push({ key: `heroBig_${s.id}`, svg, scale: 2.2 });
  }
  for (const e of ENEMIES) list.push({ key: `enemy_${e.id}`, svg: enemySvg(e.look), scale: 0.85 });
  for (const [k, v] of Object.entries(BOSS_SVG)) {
    list.push({ key: `boss_${k}`, svg: v, scale: 0.9 });
    list.push({ key: `bossBig_${k}`, svg: v, scale: 1.4 });
  }
  for (const b of BIOMES) {
    for (let i = 0; i < 4; i++) list.push({ key: `${b.id}_floor${i}`, svg: floorSvg(b, i), scale: 1 });
    list.push({ key: `${b.id}_wall`, svg: wallSvg(b), scale: 1 });
    list.push({ key: `${b.id}_crate`, svg: crateSvg(b), scale: 1 });
    list.push({ key: `${b.id}_barrel`, svg: barrelSvg(b), scale: 1 });
    list.push({ key: `${b.id}_bush`, svg: bushSvg(b), scale: 1 });
    list.push({ key: `${b.id}_water`, svg: waterSvg(b), scale: 1 });
    list.push({ key: `${b.id}_edge`, svg: edgeSvg(b), scale: 1 });
  }
  for (const [k, v] of Object.entries(PROJECTILES)) list.push({ key: k, svg: v, scale: 1 });
  for (const [k, v] of Object.entries(FX)) list.push({ key: k, svg: v, scale: 1 });
  for (const [k, v] of Object.entries(PICKUPS)) list.push({ key: `pk_${k}`, svg: v, scale: 1 });
  for (const [k, v] of Object.entries(ICONS)) list.push({ key: k, svg: v, scale: 1.25 });
  return list;
}

/** Rasterize every SVG asset into Phaser canvas textures. */
export async function buildTextures(scene: Phaser.Scene, onProgress: (p: number) => void): Promise<void> {
  const all = jobs();
  let done = 0;
  const BATCH = 12;
  for (let i = 0; i < all.length; i += BATCH) {
    const chunk = all.slice(i, i + BATCH);
    const canvases = await Promise.all(chunk.map((j) => rasterize(j.svg, j.scale).catch(() => null)));
    chunk.forEach((j, idx) => {
      const c = canvases[idx];
      if (!c) {
        console.warn('texture failed', j.key);
        return;
      }
      if (scene.textures.exists(j.key)) scene.textures.remove(j.key);
      scene.textures.addCanvas(j.key, c);
    });
    done += chunk.length;
    onProgress(done / all.length);
  }
}
