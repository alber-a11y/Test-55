// Parametric chibi hero: one builder for all 10 heroes and their skins, posable for walk/attack frames.
// Model faces +z, y is up, feet on y=0. The weapon always points along +z (the facing direction).
import { capsule, cone, cyl, group, limb, localPoint, rbox, sphere, spike, torus } from '../kit.js';

const TAU = Math.PI * 2;
const SHOE = '#2b2d42';
const DARK = '#1b1530';
const front = (L) => ({ phiStart: Math.PI / 2 - L / 2, phi: L });

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/* ------------------------------------------------------------------ weapons
 * Each returns { obj, main, support } — grip points in weapon-local space; the weapon is
 * placed by the caller. Weapons point along +z.
 */
function weapon(kind, L, attack) {
  const a = L.accent;
  const g = group();
  const flash = (z, r = 0.32) => attack && g.add(sphere(r, '#fff3b0', { pos: [0, 0, z], emissive: '#ffd166', emissiveIntensity: 1.6, outline: false, scale: [1, 1, 1.6] }));
  switch (kind) {
    case 'shotgun':
      g.add(rbox(0.24, 0.3, 0.62, 0.08, '#8d5524', { pos: [0, -0.05, -0.38], rough: 0.7 }));
      g.add(rbox(0.27, 0.27, 0.52, 0.06, '#495057', { pos: [0, 0, 0.1], metal: 0.5, rough: 0.35 }));
      for (const y of [0.07, -0.07]) g.add(cyl(0.075, 0.075, 1.1, '#3a3f47', { pos: [0, y, 0.85], rot: [Math.PI / 2, 0, 0], metal: 0.7, rough: 0.3 }));
      g.add(rbox(0.3, 0.18, 0.36, 0.06, a, { pos: [0, -0.18, 0.62] }));
      flash(1.55);
      return { obj: g, main: [0, -0.17, -0.06], support: [0, -0.27, 0.62] };
    case 'rifle':
      g.add(rbox(0.26, 0.36, 0.7, 0.09, shade(a, -0.35), { pos: [0, -0.06, -0.45] }));
      g.add(rbox(0.3, 0.32, 0.75, 0.07, '#3a3f47', { pos: [0, 0, 0.15], metal: 0.5, rough: 0.35 }));
      g.add(cyl(0.085, 0.085, 1.5, '#2b2f36', { pos: [0, 0.03, 1.2], rot: [Math.PI / 2, 0, 0], metal: 0.7, rough: 0.25 }));
      g.add(cyl(0.13, 0.13, 0.15, a, { pos: [0, 0.03, 1.95], rot: [Math.PI / 2, 0, 0], metal: 0.4 }));
      g.add(cyl(0.14, 0.14, 0.6, a, { pos: [0, 0.3, 0.12], rot: [Math.PI / 2, 0, 0], metal: 0.3, rough: 0.3 }));
      g.add(sphere(0.1, '#9be7ff', { pos: [0, 0.3, 0.44], emissive: '#4cc9f0', emissiveIntensity: 0.8, outline: false }));
      flash(1.95, 0.26);
      return { obj: g, main: [0, -0.15, -0.08], support: [0, -0.12, 0.62] };
    case 'nailgun':
      g.add(rbox(0.4, 0.38, 0.75, 0.12, L.outfit, { pos: [0, 0, 0.15] }));
      g.add(cyl(0.12, 0.12, 0.4, '#6c757d', { pos: [0, 0.02, 0.7], rot: [Math.PI / 2, 0, 0], metal: 0.6, rough: 0.3 }));
      g.add(cyl(0.16, 0.16, 0.42, a, { pos: [0, 0.32, 0.05], rot: [Math.PI / 2, 0, 0], metal: 0.4 }));
      g.add(rbox(0.16, 0.34, 0.16, 0.05, '#495057', { pos: [0, -0.3, -0.06] }));
      g.add(sphere(0.07, '#ffd166', { pos: [0.2, 0.05, 0.25], emissive: '#ffd166', emissiveIntensity: 0.8, outline: false }));
      flash(1.0, 0.26);
      return { obj: g, main: [0, -0.42, -0.06], support: [0, 0.2, 0.45] };
    case 'flamer':
      g.add(cyl(0.1, 0.1, 1.0, '#6c757d', { pos: [0, 0, 0.45], rot: [Math.PI / 2, 0, 0], metal: 0.6, rough: 0.35 }));
      g.add(cyl(0.2, 0.12, 0.3, '#343a40', { pos: [0, 0, 1.05], rot: [Math.PI / 2, 0, 0], metal: 0.5 }));
      g.add(rbox(0.24, 0.26, 0.4, 0.07, shade(a, -0.2), { pos: [0, -0.06, -0.05] }));
      g.add(sphere(0.07, '#ff8800', { pos: [0, -0.16, 1.18], emissive: '#ff8800', emissiveIntensity: 1.5, outline: false }));
      if (attack)
        for (let i = 0; i < 3; i++)
          g.add(sphere(0.3 - i * 0.05, i ? '#ffba08' : '#ff5400', { pos: [0, 0, 1.4 + i * 0.35], emissive: i ? '#ffba08' : '#ff5400', emissiveIntensity: 1.4, outline: false }));
      return { obj: g, main: [0, -0.18, -0.02], support: [0, -0.12, 0.6] };
    case 'coil':
      g.add(cyl(0.17, 0.17, 0.7, '#495057', { pos: [0, 0, 0.15], rot: [Math.PI / 2, 0, 0], metal: 0.6, rough: 0.3 }));
      for (const z of [0.5, 0.7]) g.add(torus(0.2, 0.06, a, { pos: [0, 0, z], metal: 0.4 }));
      g.add(sphere(0.2, '#9be7ff', { pos: [0, 0, 0.95], emissive: '#4cc9f0', emissiveIntensity: attack ? 2 : 0.8 }));
      if (attack) flash(1.25, 0.3);
      return { obj: g, main: [0, -0.2, -0.05], support: [0, -0.18, 0.35] };
    default:
      return { obj: g, main: [0, 0, 0], support: null };
  }
}

/* ------------------------------------------------------------------ head */

function hair(H, L) {
  const c = L.hair;
  const hl = shade(c, 0.25);
  const cap = (theta = 1.2, rx = -0.45, r = 1.07) => H.add(sphere(r, c, { theta, rot: [rx, 0, 0], scale: [1.06, 0.97, 1], rough: 0.85 }));
  switch (L.hairStyle) {
    case 'spiky': {
      cap();
      const sp = [
        [0, 0.95, 0.1, 0, 1, -0.35, 0.42, 0.85, c],
        [0.5, 0.8, 0.05, 0.55, 1, -0.4, 0.38, 0.75, c],
        [-0.5, 0.8, 0.05, -0.55, 1, -0.4, 0.38, 0.75, c],
        [0.25, 0.7, -0.55, 0.3, 0.6, -1, 0.38, 0.7, c],
        [-0.3, 0.7, -0.55, -0.35, 0.6, -1, 0.38, 0.7, c],
        [0.85, 0.45, -0.35, 1, 0.5, -0.6, 0.3, 0.6, c],
        [-0.85, 0.45, -0.35, -1, 0.5, -0.6, 0.3, 0.6, c],
        [0.3, 0.8, 0.5, 0.3, 1, 0.55, 0.26, 0.5, hl],
        [-0.25, 0.82, 0.48, -0.25, 1, 0.5, 0.24, 0.45, hl],
      ];
      for (const [x, y, z, dx, dy, dz, r, h, col] of sp) H.add(spike([x * 0.9, y * 0.9, z * 0.9], [dx, dy, dz], r, h, col, { rough: 0.85 }));
      break;
    }
    case 'pony':
      cap(1.25, -0.35);
      H.add(sphere(0.5, c, { pos: [0.25, 0.62, 0.55], scale: [1.5, 0.55, 0.8], rot: [0.5, 0, -0.2] }));
      H.add(limb([0, 0.25, -0.95], [0, -0.6, -1.35], 0.26, c));
      H.add(sphere(0.3, c, { pos: [0, -0.7, -1.38] }));
      H.add(torus(0.2, 0.07, L.accent, { pos: [0, 0.15, -1.0], rot: [0.4, 0, 0] }));
      break;
    case 'bob':
      H.add(sphere(1.11, c, { theta: 1.9, rot: [-1.05, 0, 0], scale: [1.08, 1.02, 1.04], rough: 0.8 }));
      H.add(sphere(0.55, c, { pos: [-0.2, 0.62, 0.62], scale: [1.7, 0.55, 0.75], rot: [0.55, 0, 0.15] }));
      H.add(sphere(0.18, hl, { pos: [0.4, 0.85, 0.35], outline: false, scale: [1.4, 0.6, 1] }));
      break;
    case 'mohawk':
      for (let i = 0; i < 5; i++) {
        const t = -0.7 + i * 0.4;
        const y = Math.cos(t) * 0.95;
        const z = Math.sin(t) * 0.95;
        H.add(spike([0, y, z], [0, Math.cos(t) * 1.2, Math.sin(t) * 0.8], 0.24, 0.7 - Math.abs(t) * 0.15, i % 2 ? hl : c, { scale: [0.45, 1, 1] }));
      }
      break;
    case 'long':
      cap(1.25, -0.35);
      H.add(rbox(1.9, 1.7, 0.6, 0.28, shade(c, -0.08), { pos: [0, -0.35, -0.62], rot: [0.12, 0, 0] }));
      for (const s of [-1, 1]) H.add(limb([s * 0.92, 0.2, 0.15], [s * 0.95, -1.05, 0.05], 0.2, c));
      H.add(sphere(0.5, c, { pos: [0.15, 0.65, 0.6], scale: [1.6, 0.5, 0.8], rot: [0.5, 0, -0.15] }));
      break;
    case 'bun':
      cap(1.25, -0.35);
      H.add(sphere(0.42, c, { pos: [0, 0.98, -0.45] }));
      H.add(torus(0.3, 0.07, L.accent, { pos: [0, 0.85, -0.38], rot: [Math.PI / 2 - 0.45, 0, 0] }));
      H.add(sphere(0.5, c, { pos: [-0.15, 0.65, 0.6], scale: [1.6, 0.5, 0.8], rot: [0.5, 0, 0.15] }));
      break;
    case 'cap':
      cap(1.25, -0.3);
      break;
    case 'bald':
    default:
      H.add(sphere(0.22, '#ffffff', { pos: [-0.3, 0.75, 0.35], scale: [1.4, 0.6, 1], outline: false, emissive: '#ffffff', emissiveIntensity: 0.15, rough: 0.2 }));
  }
}

function headgear(H, L) {
  const a = L.accent;
  switch (L.headgear) {
    case 'bandana':
      H.add(sphere(1.0, a, { thetaStart: 0.66, theta: 0.27, rot: [0.22, 0, 0], scale: [1.12, 1.03, 1.08], rough: 0.55 }));
      H.add(spike([-0.8, 0.62, -0.62], [-0.8, -0.1, -0.7], 0.17, 0.55, a));
      H.add(spike([-0.75, 0.55, -0.68], [-0.5, -0.6, -0.7], 0.15, 0.5, a));
      break;
    case 'goggles':
      H.add(sphere(1.0, '#3a3a3a', { thetaStart: 0.7, theta: 0.2, rot: [0.2, 0, 0], scale: [1.1, 1.02, 1.07] }));
      for (const s of [-1, 1]) {
        H.add(cyl(0.24, 0.24, 0.16, a, { pos: [s * 0.36, 0.58, 0.82], rot: [Math.PI / 2 - 0.7, 0, 0], metal: 0.4 }));
        H.add(cyl(0.18, 0.18, 0.18, '#9be7ff', { pos: [s * 0.36, 0.6, 0.84], rot: [Math.PI / 2 - 0.7, 0, 0], emissive: '#4cc9f0', emissiveIntensity: 0.35, rough: 0.1, outline: false }));
      }
      break;
    case 'hood':
      H.add(sphere(1.24, L.outfit, { theta: 2.1, rot: [-1.15, 0, 0], scale: [1.04, 1.02, 1.05], rough: 0.8 }));
      H.add(torus(0.98, 0.09, shade(L.outfit, 0.25), { pos: [0, 0.05, 0.55], rot: [0.35, 0, 0], scale: [1, 1.05, 1] }));
      break;
    case 'helmet': {
      // construction hard hat
      const hat = '#ffc300';
      H.add(sphere(1.12, hat, { theta: 1.45, rot: [-0.15, 0, 0], pos: [0, 0.12, 0], scale: [1.06, 0.95, 1.04], rough: 0.35 }));
      H.add(cyl(1.1, 1.1, 0.08, shade(hat, -0.12), { pos: [0, 0.34, 0.22], rot: [0.14, 0, 0], scale: [1, 1, 1.08], rough: 0.4 }));
      H.add(rbox(0.3, 0.22, 2.1, 0.09, shade(hat, 0.15), { pos: [0, 1.05, -0.05], rot: [0.12, 0, 0] }));
      H.add(sphere(0.14, '#ef233c', { pos: [0, 0.75, 1.02], emissive: '#ef233c', emissiveIntensity: 0.6 }));
      break;
    }
    case 'horns':
      for (const s of [-1, 1]) {
        H.add(spike([s * 0.62, 0.72, 0.05], [s * 0.9, 0.7, 0.15], 0.2, 0.55, '#f1faee'));
        H.add(spike([s * 1.1, 1.05, 0.2], [s * 0.2, 1, 0.3], 0.13, 0.45, '#f1faee'));
      }
      break;
  }
}

function face(H, L) {
  const eyes = L.eyes ?? 'normal';
  if (eyes === 'visor') {
    H.add(sphere(1.02, DARK, { thetaStart: 1.35, theta: 0.42, ...front(2.4), scale: [1.08, 1, 1.04], rough: 0.2 }));
    for (const s of [-1, 1]) H.add(rbox(0.36, 0.08, 0.06, 0.03, L.accent, { pos: [s * 0.36, 0.0, 1.02], rot: [0, s * 0.35, 0], emissive: L.accent, emissiveIntensity: 1.4, outline: false }));
  } else {
    for (const s of [-1, 1]) {
      H.add(sphere(0.31, '#ffffff', { pos: [s * 0.38, 0.0, 0.82], scale: [0.85, 1.08, 0.5], rough: 0.2, emissive: '#ffffff', emissiveIntensity: 0.25 }));
      H.add(sphere(0.17, DARK, { pos: [s * 0.38 + 0.02, -0.02, 0.96], scale: [1, 1.12, 0.45], rough: 0.15, outline: false }));
      H.add(sphere(0.055, '#ffffff', { pos: [s * 0.38 + 0.08, 0.07, 1.01], emissive: '#ffffff', outline: false }));
      const brow = eyes === 'angry' ? { y: 0.36, rz: s * 0.4 } : eyes === 'happy' ? { y: 0.44, rz: -s * 0.25 } : { y: 0.42, rz: 0 };
      H.add(rbox(0.46, 0.12, 0.13, 0.05, shade(L.hair, -0.25), { pos: [s * 0.4, brow.y, 0.87], rot: [-0.4, 0, brow.rz] }));
    }
  }
  H.add(sphere(0.1, shade(L.skin, -0.15), { pos: [0, -0.2, 1.0] }));
  if (eyes === 'angry') {
    H.add(rbox(0.5, 0.22, 0.12, 0.08, '#5a1424', { pos: [0, -0.48, 0.86], rot: [-0.45, 0, 0] }));
    H.add(rbox(0.42, 0.11, 0.06, 0.04, '#ffffff', { pos: [0, -0.44, 0.92], rot: [-0.45, 0, 0], outline: false }));
  } else if (eyes === 'happy') {
    H.add(sphere(0.22, '#5a1424', { pos: [0, -0.43, 0.9], scale: [1.35, 0.75, 0.38], rot: [-0.35, 0, 0] }));
    H.add(sphere(0.1, '#ff8fab', { pos: [0, -0.5, 0.97], scale: [1.4, 0.6, 0.5], outline: false }));
    for (const s of [-1, 1]) H.add(sphere(0.16, '#ff8fab', { pos: [s * 0.62, -0.28, 0.76], scale: [1, 0.6, 0.4], outline: false }));
  } else {
    H.add(torus(0.17, 0.045, '#5a1424', { pos: [0, -0.4, 0.92], rot: [-0.3, 0, Math.PI], arc: Math.PI, outline: false }));
  }
}

function accessory(H, acc, L) {
  switch (acc) {
    case 'crown': {
      H.add(cyl(0.5, 0.45, 0.32, '#ffd60a', { pos: [0, 1.22, -0.05], metal: 0.7, rough: 0.25, open: true }));
      for (let i = 0; i < 6; i++) {
        const t = (i / 6) * TAU;
        H.add(cone(0.12, 0.3, '#ffd60a', { pos: [Math.cos(t) * 0.47, 1.5, Math.sin(t) * 0.47 - 0.05], metal: 0.7, rough: 0.25 }));
      }
      H.add(sphere(0.1, '#e63946', { pos: [0, 1.22, 0.45], emissive: '#e63946', emissiveIntensity: 0.4 }));
      break;
    }
    case 'shades':
      for (const s of [-1, 1]) H.add(rbox(0.52, 0.32, 0.1, 0.08, '#111111', { pos: [s * 0.38, 0.02, 1.0], rot: [0, s * 0.3, 0], rough: 0.1, metal: 0.5 }));
      H.add(rbox(0.2, 0.06, 0.06, 0.02, '#111111', { pos: [0, 0.08, 1.06] }));
      break;
    case 'pirate':
      H.add(sphere(1.25, '#1b1b1b', { theta: 0.55, scale: [1.25, 0.6, 1.1], pos: [0, 0.75, 0] }));
      H.add(sphere(0.8, '#1b1b1b', { theta: 1.5, pos: [0, 0.95, -0.05], scale: [1, 0.75, 1] }));
      H.add(sphere(0.16, '#ffffff', { pos: [0, 1.15, 0.75], scale: [1, 1, 0.5] }));
      break;
    case 'halo':
      H.add(torus(0.62, 0.09, '#ffd60a', { pos: [0, 1.55, -0.1], rot: [Math.PI / 2 - 0.2, 0, 0], emissive: '#ffd166', emissiveIntensity: 0.9, metal: 0.4 }));
      break;
    case 'horns':
      for (const s of [-1, 1]) {
        H.add(spike([s * 0.55, 0.75, 0.2], [s * 0.6, 1, 0.1], 0.18, 0.5, '#d00000'));
        H.add(spike([s * 0.85, 1.15, 0.25], [s * 0.1, 1, -0.2], 0.1, 0.35, '#d00000'));
      }
      break;
    case 'cap':
      H.add(sphere(1.1, L.accent, { theta: 1.2, rot: [-0.25, 0, 0], scale: [1.06, 0.97, 1.02] }));
      H.add(rbox(1.2, 0.1, 0.8, 0.05, shade(L.accent, -0.25), { pos: [0, 0.45, 1.05], rot: [0.2, 0, 0] }));
      H.add(sphere(0.1, L.outfit, { pos: [0, 1.08, 0.1] }));
      break;
    case 'tiara':
      H.add(torus(0.95, 0.06, '#ffd60a', { pos: [0, 0.62, 0.05], rot: [Math.PI / 2 + 0.35, 0, 0], arc: Math.PI, metal: 0.7, rough: 0.25 }));
      H.add(spike([0, 0.88, 0.62], [0, 1, 0.4], 0.12, 0.35, '#c77dff', { emissive: '#c77dff', emissiveIntensity: 0.4 }));
      break;
    case 'mask':
      H.add(sphere(1.04, L.outfit, { thetaStart: 1.62, theta: 0.85, ...front(2.6), scale: [1.07, 0.98, 1.03] }));
      break;
  }
}

/* ------------------------------------------------------------------ hero */

/**
 * @param {object} look base CharLook + palette overrides
 * @param {{ accessory?: string }} skin
 * @param {{ phase?: number|null, attack?: boolean }} pose
 */
export function buildHero(look, skin = {}, pose = {}) {
  const L = { ...look, ...(skin.palette ?? {}) };
  const walking = pose.phase !== null && pose.phase !== undefined;
  const ph = walking ? pose.phase : 0;
  const atk = !!pose.attack;
  const bw = L.build === 'big' ? 1.24 : L.build === 'slim' ? 0.94 : 1.08;
  const pants = shade(L.outfit, -0.45);
  const root = group();

  // ---- legs
  [-1, 1].forEach((sx, i) => {
    const p = ph + (i ? 0.5 : 0);
    const z = walking ? Math.sin(p * TAU) * 0.34 : atk ? (i ? -0.18 : 0.22) : 0;
    const lift = walking ? Math.max(0, Math.cos(p * TAU)) * 0.16 : 0;
    root.add(limb([sx * 0.3 * bw, 0.82, 0], [sx * 0.32 * bw, 0.32 + lift, z], 0.21, pants));
    root.add(rbox(0.5, 0.28, 0.72, 0.12, SHOE, { pos: [sx * 0.33 * bw, 0.16 + lift, z + 0.08], rot: [-z * 0.5, 0, 0], rough: 0.5 }));
    root.add(rbox(0.52, 0.09, 0.74, 0.04, '#f1f1f1', { pos: [sx * 0.33 * bw, 0.04 + lift, z + 0.08], rot: [-z * 0.5, 0, 0], outline: false }));
    root.add(rbox(0.3, 0.06, 0.2, 0.03, L.accent, { pos: [sx * 0.33 * bw, 0.31 + lift, z + 0.3], outline: false }));
  });

  // ---- upper body (built detached, then bobbed / leaned)
  const up = group();
  up.add(capsule(0.62, 0.42, L.outfit, { pos: [0, 1.28, 0], scale: [1.14 * bw, 1, 0.86], rough: 0.75 }));
  up.add(torus(0.42, 0.07, shade(L.outfit, 0.55), { pos: [0, 1.82, 0.04], rot: [Math.PI / 2 + 0.25, 0, 0], scale: [1.1 * bw, 1, 0.8], outline: false }));
  up.add(torus(0.67, 0.1, '#5a3a22', { pos: [0, 0.92, 0], rot: [Math.PI / 2, 0, 0], scale: [1.12 * bw, 0.86, 1], rough: 0.5 }));
  up.add(rbox(0.32, 0.24, 0.1, 0.05, L.accent, { pos: [0, 0.92, 0.6], metal: 0.6, rough: 0.3 }));
  up.add(sphere(0.16, L.accent, { pos: [0.25 * bw, 1.42, 0.5], scale: [1, 1, 0.4], metal: 0.4, rough: 0.35 }));
  if (L.weapon === 'flamer') {
    for (const s of [-1, 1]) up.add(cyl(0.2, 0.2, 0.9, s < 0 ? L.accent : shade(L.accent, -0.2), { pos: [s * 0.24, 1.35, -0.62], metal: 0.4, rough: 0.35 }));
    up.add(limb([0.24, 1.0, -0.6], [-0.2, 1.0, 0.35], 0.05, '#343a40', { outline: false }));
  }

  // weapon + hands
  const shoulders = [
    [-0.72 * bw, 1.62, 0.02], // character's right (dominant)
    [0.72 * bw, 1.62, 0.02],
  ];
  const hands = [null, null];
  const extra = [];
  const swing = walking ? Math.sin(ph * TAU) : 0;
  const twoHanded = ['shotgun', 'rifle', 'nailgun', 'flamer', 'coil'].includes(L.weapon);
  if (twoHanded) {
    const w = weapon(L.weapon, L, atk);
    w.obj.position.set(-0.22, 1.02 + (atk ? 0.08 : 0), 0.62 + (atk ? -0.06 : 0));
    w.obj.rotation.set(atk ? -0.12 : 0.05, 0.08, 0);
    up.add(w.obj);
    hands[0] = localPoint(w.obj, w.main);
    hands[1] = localPoint(w.obj, w.support);
  } else if (L.weapon === 'staff') {
    const st = group([], { pos: [-0.72 * bw, 1.05, 0.5], rot: atk ? [1.2, 0, 0] : [0.12, 0, 0.05] });
    st.add(cyl(0.07, 0.07, 2.3, '#a5743f', { pos: [0, 0.25, 0], rough: 0.7 }));
    st.add(sphere(0.3, L.hair, { pos: [0, 1.5, 0], emissive: L.hair, emissiveIntensity: atk ? 1 : 0.35, rough: 0.2 }));
    for (const s of [-1, 1]) st.add(sphere(0.2, '#57cc99', { pos: [s * 0.25, 1.25, 0], scale: [1, 0.45, 0.6], rot: [0, 0, s * 0.6] }));
    up.add(st);
    hands[0] = localPoint(st, [0, 0, 0.08]);
  } else if (L.weapon === 'bomb') {
    const pos = atk ? [-0.6 * bw, 2.55, -0.15] : [-0.78 * bw, 1.0, 0.62];
    const b = group([], { pos });
    b.add(sphere(0.36, '#2b2d42', { rough: 0.3, metal: 0.3 }));
    b.add(sphere(0.1, '#ffffff', { pos: [-0.12, 0.14, 0.26], outline: false, emissive: '#ffffff', emissiveIntensity: 0.3 }));
    b.add(cyl(0.1, 0.1, 0.14, '#6c757d', { pos: [0, 0.38, 0], metal: 0.6 }));
    b.add(limb([0, 0.44, 0], [0.12, 0.66, -0.05], 0.035, '#8d5524', { outline: false }));
    b.add(sphere(0.1, '#ffba08', { pos: [0.14, 0.72, -0.05], emissive: '#ff7b00', emissiveIntensity: 1.5, outline: false }));
    up.add(b);
    hands[0] = [pos[0], pos[1] - 0.3, pos[2]];
  } else if (L.weapon === 'hammer') {
    const hm = group([], atk ? { pos: [0, 0.95, 0.75], rot: [1.45, 0, 0] } : { pos: [-0.1, 1.0, 0.65], rot: [0.35, 0, -0.35] });
    hm.add(cyl(0.09, 0.09, 2.0, '#8d5524', { pos: [0, 0.6, 0], rough: 0.7 }));
    hm.add(rbox(0.95, 0.6, 0.6, 0.12, '#adb5bd', { pos: [0, 1.65, 0], metal: 0.6, rough: 0.3 }));
    for (const s of [-1, 1]) hm.add(rbox(0.18, 0.66, 0.66, 0.06, L.accent, { pos: [s * 0.45, 1.65, 0], metal: 0.3 }));
    up.add(hm);
    hands[0] = localPoint(hm, [0, -0.2, 0]);
    hands[1] = localPoint(hm, [0, 0.35, 0]);
  } else if (L.weapon === 'claws' || L.weapon === 'daggers') {
    [-1, 1].forEach((s, i) => {
      const fwd = atk ? (i === 0 ? 1.05 : 0.35) : 0.55 + (walking ? -s * swing * 0.12 : 0);
      const hp = [s * 0.62 * bw, atk && i === 0 ? 1.45 : 1.05, fwd];
      hands[i] = hp;
      const bl = group([], { pos: hp, rot: [atk && i === 0 ? -0.1 : 0.15, 0, 0] });
      if (L.weapon === 'claws') {
        bl.add(rbox(0.3, 0.26, 0.3, 0.07, L.accent, {}));
        for (const dx of [-0.1, 0, 0.1]) bl.add(cone(0.05, 0.62, '#dee2e6', { pos: [dx, 0.02, 0.45], rot: [Math.PI / 2, 0, 0], metal: 0.8, rough: 0.2 }));
      } else {
        bl.add(rbox(0.12, 0.12, 0.3, 0.04, L.accent, { pos: [0, 0, 0.05] }));
        bl.add(rbox(0.3, 0.05, 0.08, 0.02, '#adb5bd', { pos: [0, 0, 0.22], metal: 0.6 }));
        bl.add(cone(0.09, 0.6, '#e9ecef', { pos: [0, 0, 0.55], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.35], metal: 0.8, rough: 0.2 }));
      }
      extra.push(bl);
    });
    extra.forEach((e) => up.add(e));
  }

  // arms
  shoulders.forEach((sh, i) => {
    let hd = hands[i];
    if (!hd) {
      // free arm: swings while walking
      hd = [sh[0] * 1.12, sh[1] - 0.7, sh[2] + (walking ? (i ? -1 : 1) * swing * 0.35 : 0.1)];
    }
    const elbow = [sh[0] * 1.18, (sh[1] + hd[1]) / 2 - 0.05, (sh[2] + hd[2]) / 2 - 0.1];
    up.add(sphere(0.26, L.outfit, { pos: sh, rough: 0.75 }));
    up.add(limb(sh, elbow, 0.19, L.outfit, { rough: 0.75 }));
    up.add(limb(elbow, hd, 0.15, L.skin));
    up.add(sphere(0.2, L.skin, { pos: hd }));
  });

  // ---- head
  const H = group([], { pos: [0, 2.5, 0] });
  H.add(sphere(1.0, L.skin, { scale: [1.06, 0.97, 1], rough: 0.7 }));
  for (const s of [-1, 1]) H.add(sphere(0.23, L.skin, { pos: [s * 1.04, -0.05, 0.05], scale: [0.55, 1, 0.9] }));
  face(H, L);
  hair(H, L);
  headgear(H, L);
  accessory(H, skin.accessory, L);
  if (atk) H.rotation.x = 0.06;
  up.add(H);

  up.position.y = walking ? Math.abs(Math.cos(ph * TAU)) * 0.08 : 0;
  up.rotation.x = walking ? 0.07 : atk ? 0.05 : 0;
  root.add(up);
  return root;
}
