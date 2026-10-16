// Offline sprite renderer: builds models, renders direction × frame sheets with transparent background.
import * as THREE from 'three';
import { HEROES } from '../../src/data/heroes.ts';
import { SKINS } from '../../src/data/shop.ts';
import { ENEMIES } from '../../src/data/enemies.ts';
import { buildHero } from './models/hero.js';
import { buildRobot, buildTurret } from './models/robot.js';
import { buildBoss } from './models/boss.js';

/** Rendered facing directions: S (towards camera), SE, E, NE, N. West side is mirrored in game. */
export const DIRS = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI];
/** Frames per direction: 4 walk phases + attack. Frame 0 doubles as idle. */
export const FRAMES = [{ phase: 0.25 }, { phase: 0.5 }, { phase: 0.75 }, { phase: 0 }, { attack: true }];

const heroLook = (id) => HEROES.find((h) => h.id === id).look;

/** All renderable characters: key → builder(pose). */
export function catalog() {
  const out = {};
  for (const s of SKINS) out[`hero_${s.id}`] = { kind: 'hero', build: (pose) => buildHero(heroLook(s.hero), s, pose) };
  for (const e of ENEMIES) out[`enemy_${e.id}`] = { kind: 'enemy', build: (pose) => buildRobot(e, pose) };
  for (const b of ['golem', 'wasp', 'mech', 'pyro', 'phantom', 'slime']) out[`boss_${b}`] = { kind: 'boss', build: (pose) => buildBoss(b, pose) };
  out.turret = { kind: 'turret', build: (pose) => buildTurret(pose) };
  return out;
}

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x000000, 0);

function makeScene() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#6b5f8f', 1.5));
  const key = new THREE.DirectionalLight('#fff4e0', 2.6);
  key.position.set(-4, 7, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight('#bcd4ff', 0.7);
  fill.position.set(5, 2, 4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight('#d6ecff', 2.2);
  rim.position.set(3, 4, -6);
  scene.add(rim);
  return scene;
}

/** Framing (world units) per kind: frame height and look-at height. */
const FRAMING = {
  hero: { h: 5.6, ty: 2.1 },
  enemy: { h: 5.6, ty: 2.1 },
  boss: { h: 9.5, ty: 3.6 },
  turret: { h: 5.6, ty: 2.1 },
};
const ELEV = 0.5; // camera pitch (radians) — matches the top-down 3/4 arena view

function camera(kind) {
  const f = FRAMING[kind];
  const cam = new THREE.OrthographicCamera(-f.h / 2, f.h / 2, f.h / 2, -f.h / 2, 0.1, 100);
  const target = new THREE.Vector3(0, f.ty, 0);
  cam.position.set(0, target.y + Math.sin(ELEV) * 30, Math.cos(ELEV) * 30);
  cam.lookAt(target);
  cam.updateMatrixWorld();
  return cam;
}

/** Render one frame into an offscreen canvas (size × size). */
function renderFrame(entry, rotY, pose, size) {
  renderer.setSize(size, size, false);
  const scene = makeScene();
  const model = entry.build(pose);
  model.rotation.y = rotY;
  scene.add(model);
  renderer.render(scene, camera(entry.kind));
  const c = document.createElement('canvas');
  c.width = c.height = size;
  c.getContext('2d').drawImage(renderer.domElement, 0, 0);
  return c;
}

function alphaBounds(c) {
  const { width: w, height: h } = c;
  const d = c.getContext('2d').getImageData(0, 0, w, h).data;
  let top = h, bottom = 0, left = w, right = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 6) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
  return { top, bottom, left, right };
}

/**
 * Render a full sheet: rows = directions, columns = frames. Every cell shares one crop
 * (symmetric around the model's root column) so the anchor is stable across frames.
 * Returns { url, cellW, cellH, anchorY, dirs, frames, portrait? }.
 */
export function renderSheet(key, o = {}) {
  const entry = catalog()[key];
  const size = o.size ?? 640;
  const cellH = o.cellH ?? 150;
  const frames = entry.kind === 'turret' ? [{}] : FRAMES;
  const canv = [];
  let top = size, bottom = 0, half = 0;
  for (const rotY of DIRS) {
    const row = [];
    for (const pose of frames) {
      const c = renderFrame(entry, rotY, pose, size);
      const b = alphaBounds(c);
      top = Math.min(top, b.top);
      bottom = Math.max(bottom, b.bottom);
      half = Math.max(half, size / 2 - b.left, b.right - size / 2);
      row.push(c);
    }
    canv.push(row);
  }
  half = Math.ceil(half) + 2;
  top = Math.max(0, top - 2);
  bottom = Math.min(size - 1, bottom + 2);
  const cropH = bottom - top;
  const k = cellH / cropH;
  const cellW = Math.round(half * 2 * k);
  // Ground point (model origin) projected → anchor.
  const ground = new THREE.Vector3(0, 0, 0).project(camera(entry.kind));
  const groundY = ((1 - ground.y) / 2) * size;
  const anchorY = (groundY - top) / cropH;

  const sheet = document.createElement('canvas');
  sheet.width = cellW * frames.length;
  sheet.height = cellH * DIRS.length;
  const ctx = sheet.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  canv.forEach((row, r) =>
    row.forEach((c, f) => ctx.drawImage(c, size / 2 - half, top, half * 2, cropH, f * cellW, r * cellH, cellW, cellH)),
  );
  return {
    url: sheet.toDataURL('image/webp', o.quality ?? 0.78),
    cellW,
    cellH,
    anchorY: +anchorY.toFixed(4),
    dirs: DIRS.length,
    frames: frames.length,
  };
}

/** Large single portrait for menus (3/4 view, idle), cropped tight. */
export function renderPortrait(key, o = {}) {
  const entry = catalog()[key];
  const size = o.size ?? 900;
  const c = renderFrame(entry, o.rotY ?? 0.55, { phase: null }, size);
  const b = alphaBounds(c);
  const cx = size / 2;
  const half = Math.ceil(Math.max(cx - b.left, b.right - cx)) + 2;
  const cropH = b.bottom - b.top + 3;
  const outH = o.outH ?? 340;
  const k = outH / cropH;
  const out = document.createElement('canvas');
  out.width = Math.round(half * 2 * k);
  out.height = outH;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(c, cx - half, b.top, half * 2, cropH, 0, 0, out.width, out.height);
  return out.toDataURL('image/webp', o.quality ?? 0.9);
}

window.studio = { renderSheet, renderPortrait, keys: () => Object.keys(catalog()) };

// Preview page: ?keys=a,b&mode=sheet|portrait
const out = document.getElementById('out');
const params = new URLSearchParams(location.search);
if (out && params.has('keys')) {
  for (const k of params.get('keys').split(',')) {
    const img = new Image();
    img.src = params.get('mode') === 'portrait' ? renderPortrait(k, { outH: 300 }) : renderSheet(k, { cellH: Number(params.get('h') || 130) }).url;
    out.appendChild(img);
  }
  document.title = 'ready';
}
