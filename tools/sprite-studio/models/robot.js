// Robot bots (enemies) and the engineer's turret. Face +z, feet on y=0.
import { capsule, cone, cyl, group, limb, rbox, sphere, spike, torus } from '../kit.js';

const TAU = Math.PI * 2;
const DARK = '#1b1530';

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
const front = (L) => ({ phiStart: Math.PI / 2 - L / 2, phi: L });

function visor(g, y, z, eye, w = 1) {
  g.add(rbox(1.45 * w, 0.62, 0.36, 0.2, DARK, { pos: [0, y, z - 0.08], rough: 0.15, metal: 0.3 }));
  for (const s of [-1, 1]) {
    g.add(sphere(0.18, eye, { pos: [s * 0.36 * w, y - 0.02, z + 0.11], scale: [1, 0.85, 0.4], emissive: eye, emissiveIntensity: 1.8, outline: false }));
    g.add(sphere(0.06, '#ffffff', { pos: [s * 0.36 * w + 0.05, y + 0.04, z + 0.16], emissive: '#ffffff', outline: false }));
    g.add(rbox(0.48, 0.12, 0.14, 0.05, DARK, { pos: [s * 0.36 * w, y + 0.42, z - 0.02], rot: [-0.2, 0, s * 0.42] }));
  }
}

export function buildRobot(def, pose = {}) {
  const L = def.look;
  const walking = pose.phase !== null && pose.phase !== undefined;
  const ph = walking ? pose.phase : 0;
  const atk = !!pose.attack;
  const root = group();
  const body = group();
  const lite = shade(L.body, 0.3);
  const hover = L.shape === 'drone' || L.shape === 'blob';

  if (!hover) {
    [-1, 1].forEach((sx, i) => {
      const p = ph + (i ? 0.5 : 0);
      const z = walking ? Math.sin(p * TAU) * 0.3 : 0;
      const lift = walking ? Math.max(0, Math.cos(p * TAU)) * 0.15 : 0;
      root.add(limb([sx * 0.42, 0.75, 0], [sx * 0.45, 0.3 + lift, z], 0.13, '#495057', { metal: 0.5, rough: 0.35 }));
      root.add(rbox(0.55, 0.32, 0.75, 0.14, L.dark, { pos: [sx * 0.46, 0.17 + lift, z + 0.08], rot: [-z * 0.5, 0, 0], rough: 0.4 }));
    });
  }

  // Chassis by shape. `vy`/`vz` place the visor; `hand` = where gear attaches.
  let vy = 1.6;
  let vz = 1.0;
  let hand = [-0.95, 1.2, 0.55];
  switch (L.shape) {
    case 'round':
      body.add(sphere(1.12, L.body, { pos: [0, 1.55, 0], rough: 0.35, metal: 0.15 }));
      body.add(sphere(0.75, lite, { pos: [0, 1.25, 0.55], scale: [1, 0.8, 0.6], rough: 0.4, outline: false }));
      body.add(cyl(0.05, 0.05, 0.5, '#495057', { pos: [0, 2.8, 0], metal: 0.6 }));
      body.add(sphere(0.15, L.eye, { pos: [0, 3.08, 0], emissive: L.eye, emissiveIntensity: 1.2 }));
      vy = 1.8;
      vz = 1.08;
      break;
    case 'box':
      body.add(rbox(2.0, 1.85, 1.6, 0.35, L.body, { pos: [0, 1.62, 0], rough: 0.35, metal: 0.2 }));
      body.add(rbox(1.4, 0.5, 0.2, 0.1, L.dark, { pos: [0, 1.1, 0.78], rough: 0.4 }));
      for (const x of [-0.4, 0, 0.4]) body.add(sphere(0.08, L.eye, { pos: [x, 1.1, 0.9], emissive: L.eye, emissiveIntensity: 1.2, outline: false }));
      for (const s of [-1, 1]) {
        body.add(cyl(0.04, 0.04, 0.5, '#495057', { pos: [s * 0.55, 2.75, -0.2], rot: [0, 0, s * 0.35], metal: 0.6 }));
        body.add(sphere(0.12, L.eye, { pos: [s * 0.65, 3.0, -0.2], emissive: L.eye, emissiveIntensity: 1.2 }));
      }
      vy = 1.95;
      vz = 0.82;
      break;
    case 'tall':
      body.add(capsule(0.85, 1.3, L.body, { pos: [0, 1.95, 0], rough: 0.35, metal: 0.15 }));
      body.add(rbox(1.1, 0.7, 0.3, 0.15, lite, { pos: [0, 1.35, 0.68], rough: 0.4, outline: false }));
      vy = 2.5;
      vz = 0.86;
      break;
    case 'blob': {
      const sq = walking ? 1 + Math.sin(ph * TAU * 2) * 0.06 : 1;
      body.add(sphere(1.2, L.body, { pos: [0, 1.05, 0], scale: [1.15 / sq, 0.92 * sq, 1.05], rough: 0.2, metal: 0.05 }));
      body.add(sphere(0.25, '#ffffff', { pos: [-0.45, 1.65, 0.6], scale: [1.4, 0.7, 0.6], outline: false, emissive: '#ffffff', emissiveIntensity: 0.3 }));
      for (const [x, z] of [[-0.8, 0.5], [0.7, 0.6], [0.1, 0.95]]) body.add(sphere(0.2, L.body, { pos: [x, 0.25, z], scale: [1, 0.6, 1], rough: 0.2 }));
      vy = 1.3;
      vz = 1.16;
      hand = [-1.15, 1.0, 0.5];
      break;
    }
    case 'spike':
      body.add(sphere(1.0, L.body, { pos: [0, 1.45, 0], rough: 0.35 }));
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * TAU;
        body.add(spike([Math.cos(t) * 0.9, 1.45 + (i % 2 ? 0.35 : -0.15), Math.sin(t) * 0.9], [Math.cos(t), i % 2 ? 0.5 : -0.1, Math.sin(t)], 0.22, 0.5, L.dark));
      }
      body.add(spike([0, 2.35, 0], [0, 1, 0], 0.2, 0.4, L.dark));
      body.add(limb([0, 2.5, 0], [0.25, 2.95, -0.1], 0.05, '#6c584c', { outline: false }));
      body.add(sphere(0.16, '#ffba08', { pos: [0.28, 3.05, -0.1], emissive: '#ff7b00', emissiveIntensity: 2, outline: false }));
      vy = 1.55;
      vz = 0.98;
      break;
    case 'drone': {
      const by = 2.0 + (walking ? Math.sin(ph * TAU) * 0.12 : 0);
      body.add(sphere(1.0, L.body, { pos: [0, by, 0], scale: [1.15, 0.8, 1.05], rough: 0.3, metal: 0.4 }));
      for (const s of [-1, 1]) {
        body.add(limb([s * 0.9, by + 0.2, 0], [s * 1.35, by + 0.5, 0], 0.08, '#495057', { metal: 0.6 }));
        body.add(cyl(0.45, 0.45, 0.06, L.dark, { pos: [s * 1.35, by + 0.6, 0], metal: 0.3 }));
        body.add(rbox(0.85, 0.04, 0.12, 0.02, '#adb5bd', { pos: [s * 1.35, by + 0.66, 0], rot: [0, (walking ? ph * 6 : 0) + s, 0], outline: false }));
      }
      body.add(cone(0.25, 0.4, '#495057', { pos: [0, by - 0.95, 0], rot: [Math.PI, 0, 0], metal: 0.6 }));
      vy = by + 0.05;
      vz = 1.05;
      hand = [-1.0, by - 0.4, 0.5];
      break;
    }
  }
  visor(body, vy, vz, L.eye, L.shape === 'box' ? 1.15 : 1);

  // Gear.
  const flash = (pos, r = 0.3) =>
    atk && body.add(sphere(r, '#ffd6e0', { pos, emissive: '#ff4d6d', emissiveIntensity: 1.5, outline: false, scale: [1, 1, 1.5] }));
  const [hx, hy, hz] = hand;
  const recoil = atk ? -0.12 : 0;
  switch (L.gear) {
    case 'blaster':
      body.add(rbox(0.38, 0.38, 1.0, 0.12, '#495057', { pos: [hx, hy, hz + recoil + 0.2], metal: 0.5, rough: 0.3 }));
      body.add(cyl(0.13, 0.13, 0.3, L.eye, { pos: [hx, hy, hz + recoil + 0.8], rot: [Math.PI / 2, 0, 0], emissive: L.eye, emissiveIntensity: 0.6 }));
      flash([hx, hy, hz + 1.2]);
      break;
    case 'scope':
      body.add(rbox(0.3, 0.32, 1.0, 0.08, '#343a40', { pos: [hx, hy, hz + recoil], metal: 0.5 }));
      body.add(cyl(0.08, 0.08, 1.6, '#2b2f36', { pos: [hx, hy + 0.04, hz + recoil + 1.2], rot: [Math.PI / 2, 0, 0], metal: 0.7 }));
      body.add(cyl(0.12, 0.12, 0.55, L.eye, { pos: [hx, hy + 0.3, hz + recoil + 0.1], rot: [Math.PI / 2, 0, 0], emissive: L.eye, emissiveIntensity: 0.5 }));
      flash([hx, hy, hz + 2.1], 0.25);
      break;
    case 'bomb': {
      const bp = atk ? [hx * 0.6, 3.2, -0.2] : [hx, hy, hz + 0.1];
      body.add(sphere(0.38, '#9d0208', { pos: bp, rough: 0.3 }));
      body.add(sphere(0.12, '#ffba08', { pos: [bp[0] + 0.15, bp[1] + 0.48, bp[2]], emissive: '#ff7b00', emissiveIntensity: 2, outline: false }));
      body.add(limb([hx * 0.9, hy + 0.5, 0], bp, 0.14, '#495057', { metal: 0.5 }));
      break;
    }
    case 'fists':
      for (const s of [-1, 1]) {
        const punch = atk && s < 0 ? 0.7 : 0;
        const sw = walking ? s * Math.sin(ph * TAU) * 0.25 : 0;
        const p = [s * 1.25, 1.35, 0.35 + punch + sw];
        body.add(limb([s * 0.95, 1.7, 0], p, 0.14, '#495057', { metal: 0.5 }));
        body.add(sphere(0.42, L.dark, { pos: p, rough: 0.4 }));
      }
      break;
    case 'cross':
      body.add(rbox(0.55, 0.18, 0.1, 0.05, '#e63946', { pos: [0, 1.25, 1.02], emissive: '#e63946', emissiveIntensity: 0.3 }));
      body.add(rbox(0.18, 0.55, 0.1, 0.05, '#e63946', { pos: [0, 1.25, 1.02], emissive: '#e63946', emissiveIntensity: 0.3 }));
      body.add(rbox(0.3, 0.3, 0.8, 0.08, '#f1faee', { pos: [hx, hy, hz + recoil + 0.15] }));
      body.add(cyl(0.1, 0.1, 0.3, '#57cc99', { pos: [hx, hy, hz + recoil + 0.65], rot: [Math.PI / 2, 0, 0], emissive: '#57cc99', emissiveIntensity: 0.5 }));
      flash([hx, hy, hz + 0.95], 0.22);
      break;
    case 'shield':
      body.add(rbox(1.1, 1.5, 0.22, 0.2, '#adb5bd', { pos: [1.05, 1.55, 0.75], rot: [0, -0.35, 0], metal: 0.6, rough: 0.3 }));
      body.add(rbox(0.16, 1.2, 0.08, 0.04, L.dark, { pos: [1.1, 1.55, 0.88], rot: [0, -0.35, 0] }));
      body.add(rbox(0.36, 0.36, 0.8, 0.1, '#495057', { pos: [hx, hy, hz + recoil + 0.2], metal: 0.5 }));
      for (const dx of [-0.08, 0.08]) body.add(cyl(0.07, 0.07, 0.4, '#2b2f36', { pos: [hx + dx, hy, hz + recoil + 0.75], rot: [Math.PI / 2, 0, 0], metal: 0.7 }));
      flash([hx, hy, hz + 1.1], 0.3);
      break;
    case 'staff': {
      const st = group([], { pos: [hx, hy - 0.1, hz], rot: atk ? [1.0, 0, 0] : [0.1, 0, 0] });
      st.add(cyl(0.07, 0.07, 2.2, '#6c584c', { pos: [0, 0.4, 0] }));
      st.add(sphere(0.28, L.eye, { pos: [0, 1.55, 0], emissive: L.eye, emissiveIntensity: atk ? 2 : 0.9 }));
      st.add(torus(0.32, 0.05, L.dark, { pos: [0, 1.55, 0], rot: [Math.PI / 2, 0, 0] }));
      body.add(st);
      break;
    }
    default:
      break;
  }

  body.position.y = walking && !hover ? Math.abs(Math.cos(ph * TAU)) * 0.08 : 0;
  body.rotation.x = atk ? -0.05 : walking ? 0.06 : 0;
  root.add(body);
  return root;
}

/** Engineer's auto-turret: tripod + rotating head (head faces +z). */
export function buildTurret() {
  const root = group();
  for (let i = 0; i < 3; i++) {
    const t = (i / 3) * TAU + 0.5;
    root.add(limb([0, 1.0, 0], [Math.cos(t) * 0.9, 0.05, Math.sin(t) * 0.9], 0.08, '#6c757d', { metal: 0.6, rough: 0.35 }));
  }
  root.add(cyl(0.35, 0.45, 0.3, '#495057', { pos: [0, 1.05, 0], metal: 0.5 }));
  root.add(rbox(1.2, 0.8, 1.1, 0.25, '#f77f00', { pos: [0, 1.6, 0], rough: 0.4 }));
  root.add(cyl(0.12, 0.12, 0.9, '#343a40', { pos: [0.18, 1.6, 0.9], rot: [Math.PI / 2, 0, 0], metal: 0.7 }));
  root.add(cyl(0.12, 0.12, 0.9, '#343a40', { pos: [-0.18, 1.6, 0.9], rot: [Math.PI / 2, 0, 0], metal: 0.7 }));
  root.add(sphere(0.32, '#1b1530', { pos: [0, 1.75, 0.45], scale: [1.4, 0.6, 0.6], rough: 0.2 }));
  root.add(sphere(0.12, '#4cc9f0', { pos: [0, 1.75, 0.62], emissive: '#4cc9f0', emissiveIntensity: 1.5, outline: false }));
  root.add(cyl(0.03, 0.03, 0.5, '#495057', { pos: [0, 2.2, -0.2] }));
  root.add(sphere(0.1, '#ef233c', { pos: [0, 2.48, -0.2], emissive: '#ef233c', emissiveIntensity: 1.5 }));
  return root;
}
