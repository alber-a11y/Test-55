// Six bosses. Face +z, feet on y=0, ~6–7 units tall. Pose: { phase } walk/float, { attack } wind-up.
import { capsule, cone, cyl, group, limb, mat, mesh, rbox, sphere, spike, THREE, torus } from '../kit.js';

const TAU = Math.PI * 2;
const DARK = '#1b1530';
const front = (L) => ({ phiStart: Math.PI / 2 - L / 2, phi: L });

function glowEyes(g, y, z, dx, r, color, angry = true) {
  for (const s of [-1, 1]) {
    g.add(sphere(r, color, { pos: [s * dx, y, z], scale: [1, 0.8, 0.5], emissive: color, emissiveIntensity: 1.8, outline: false }));
    if (angry) g.add(rbox(r * 3, r * 0.7, r, r * 0.3, DARK, { pos: [s * dx * 1.05, y + r * 1.4, z], rot: [-0.3, 0, s * 0.45] }));
  }
}

function golem(p) {
  const { walk, ph, atk } = p;
  const root = group();
  const rock = '#8d93a3';
  const rockD = '#5c677d';
  const moss = '#80b918';
  [-1, 1].forEach((s, i) => {
    const z = walk ? Math.sin((ph + i * 0.5) * TAU) * 0.5 : 0;
    root.add(rbox(1.3, 1.5, 1.4, 0.4, rockD, { pos: [s * 0.95, 0.75, z], rough: 0.9, flat: true }));
  });
  const up = group([], { pos: [0, walk ? Math.abs(Math.cos(ph * TAU)) * 0.2 : 0, 0] });
  up.add(sphere(2.3, rock, { pos: [0, 3.4, 0], scale: [1.15, 1.0, 0.85], rough: 0.95, flat: true }));
  for (const [x, y, z, r] of [[-1.0, 4.9, 0.6, 0.8], [1.2, 4.6, 0.3, 0.6], [0.2, 5.3, -0.4, 0.7], [-1.7, 3.2, 0.9, 0.5]])
    up.add(sphere(r, moss, { pos: [x, y, z], scale: [1.3, 0.5, 1.1], rough: 0.9 }));
  for (const [x, y] of [[-0.9, 2.6], [1.0, 3.0], [0.2, 2.2]]) up.add(rbox(0.6, 0.12, 0.1, 0.03, rockD, { pos: [x, y, 1.9], rot: [0, 0, x], outline: false }));
  glowEyes(up, 4.1, 1.85, 0.75, 0.32, '#ffba08');
  up.add(rbox(1.5, 0.45, 0.3, 0.12, '#33415c', { pos: [0, 3.25, 1.85] }));
  up.add(rbox(1.2, 0.12, 0.1, 0.04, '#ffba08', { pos: [0, 3.25, 2.0], emissive: '#ff7b00', emissiveIntensity: 1.4, outline: false }));
  [-1, 1].forEach((s) => {
    const raise = atk ? 3.4 : 0;
    const sw = walk ? -s * Math.sin(ph * TAU) * 0.6 : 0;
    const sh = [s * 2.5, 4.2, 0];
    const fist = atk ? [s * 1.6, 4.2 + raise, 0.5] : [s * 2.8, 1.8, 0.4 + sw];
    up.add(sphere(0.95, rock, { pos: sh, rough: 0.95, flat: true }));
    up.add(limb(sh, fist, 0.65, rock, { rough: 0.95, flat: true }));
    up.add(sphere(1.0, rockD, { pos: fist, rough: 0.95, flat: true }));
  });
  root.add(up);
  return root;
}

function wasp(p) {
  const { walk, ph, atk } = p;
  const root = group();
  const y0 = 2.2 + (walk ? Math.sin(ph * TAU) * 0.3 : 0);
  const g = group([], { pos: [0, y0, 0], rot: [atk ? 0.35 : 0.1, 0, 0] });
  // abdomen with stripes
  const ab = group([], { pos: [0, 0.6, -1.6], rot: [atk ? -1.2 : -0.5, 0, 0] });
  for (let i = 0; i < 4; i++) ab.add(sphere(1.25 - i * 0.18, i % 2 ? DARK : '#ffd60a', { pos: [0, -i * 0.55, 0], scale: [1, 0.7, 1], rough: 0.4 }));
  ab.add(cone(0.25, 0.9, DARK, { pos: [0, -2.45, 0], rot: [Math.PI, 0, 0], metal: 0.4 }));
  g.add(ab);
  g.add(sphere(1.1, '#ffd60a', { pos: [0, 1.0, 0], rough: 0.4 }));
  g.add(torus(1.0, 0.18, DARK, { pos: [0, 1.0, 0], rot: [Math.PI / 2, 0, 0] }));
  // wings (translucent)
  const flap = walk ? Math.sin(ph * TAU * 2) * 0.5 : atk ? 0.6 : 0.2;
  for (const s of [-1, 1]) {
    const w = mesh(new THREE.SphereGeometry(1.4, 24, 16), new THREE.MeshStandardMaterial({ color: '#bde0fe', transparent: true, opacity: 0.55, roughness: 0.1 }), {
      pos: [s * 1.6, 2.3, -0.4],
      rot: [0, 0, s * (0.6 + flap)],
      scale: [1.3, 0.12, 0.65],
      outline: false,
    });
    g.add(w);
  }
  // legs
  for (const s of [-1, 1]) for (const z of [-0.3, 0.3]) g.add(limb([s * 0.6, 0.4, z], [s * 1.3, -1.2, z * 2], 0.1, DARK));
  // head
  const h = group([], { pos: [0, 2.4, 0.9] });
  h.add(sphere(1.15, '#ffd60a', { rough: 0.4 }));
  for (const s of [-1, 1]) h.add(sphere(0.55, '#ff006e', { pos: [s * 0.62, 0.15, 0.7], scale: [0.9, 1.1, 0.7], emissive: '#ff006e', emissiveIntensity: 0.6, rough: 0.15 }));
  for (const s of [-1, 1]) h.add(rbox(0.8, 0.18, 0.2, 0.06, DARK, { pos: [s * 0.55, 0.85, 0.75], rot: [-0.3, 0, s * 0.45] }));
  h.add(rbox(0.7, atk ? 0.45 : 0.2, 0.2, 0.08, DARK, { pos: [0, -0.55, 0.95], rot: [-0.4, 0, 0] }));
  for (const s of [-1, 1]) h.add(limb([s * 0.4, 1.0, 0.2], [s * 0.9, 2.0, 0.6], 0.06, DARK));
  for (const s of [-1, 1]) h.add(sphere(0.15, '#ff006e', { pos: [s * 0.9, 2.05, 0.6], emissive: '#ff006e', emissiveIntensity: 1 }));
  // crown
  h.add(cyl(0.6, 0.55, 0.35, '#ff006e', { pos: [0, 1.15, 0], open: true, metal: 0.4 }));
  for (let i = 0; i < 5; i++) {
    const t = (i / 5) * TAU + 0.3;
    h.add(cone(0.14, 0.4, '#ff006e', { pos: [Math.cos(t) * 0.57, 1.5, Math.sin(t) * 0.57], metal: 0.4 }));
  }
  g.add(h);
  root.add(g);
  return root;
}

function mech(p) {
  const { walk, ph, atk } = p;
  const root = group();
  const orange = '#f77f00';
  [-1, 1].forEach((s, i) => {
    const z = walk ? Math.sin((ph + i * 0.5) * TAU) * 0.55 : 0;
    const lift = walk ? Math.max(0, Math.cos((ph + i * 0.5) * TAU)) * 0.3 : 0;
    root.add(limb([s * 1.1, 2.3, 0], [s * 1.2, 0.9 + lift, z], 0.38, '#495057', { metal: 0.6, rough: 0.35 }));
    root.add(rbox(1.2, 0.7, 1.7, 0.2, '#343a40', { pos: [s * 1.2, 0.35 + lift, z + 0.2], metal: 0.5, rough: 0.4 }));
  });
  const up = group([], { pos: [0, walk ? Math.abs(Math.cos(ph * TAU)) * 0.15 : 0, 0] });
  up.add(rbox(3.4, 2.6, 2.6, 0.55, orange, { pos: [0, 3.5, 0], rough: 0.45, metal: 0.2 }));
  up.add(rbox(2.4, 0.8, 0.3, 0.15, '#343a40', { pos: [0, 2.8, 1.32] }));
  for (const [x, c] of [[-0.7, '#ffd60a'], [0, '#06d6a0'], [0.7, '#ff006e']]) up.add(sphere(0.16, c, { pos: [x, 2.8, 1.5], emissive: c, emissiveIntensity: 1.2, outline: false }));
  // cockpit dome with pilot
  up.add(sphere(0.7, '#ffdbac', { pos: [0, 5.15, 0.3] }));
  up.add(rbox(1.0, 0.3, 0.2, 0.08, DARK, { pos: [0, 5.2, 0.92], rough: 0.2 }));
  for (const s of [-1, 1]) up.add(sphere(0.08, '#ff006e', { pos: [s * 0.25, 5.2, 1.03], emissive: '#ff006e', emissiveIntensity: 1.5, outline: false }));
  up.add(
    mesh(new THREE.SphereGeometry(1.25, 32, 20, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#9be7ff', transparent: true, opacity: 0.4, roughness: 0.05, metalness: 0.2 }), {
      pos: [0, 4.75, 0.2],
    }),
  );
  up.add(cyl(0.06, 0.06, 0.8, '#495057', { pos: [0.9, 6.2, -0.4] }));
  up.add(sphere(0.18, '#ff006e', { pos: [0.9, 6.65, -0.4], emissive: '#ff006e', emissiveIntensity: 1.5 }));
  // cannon arms
  [-1, 1].forEach((s) => {
    const arm = group([], { pos: [s * 2.15, 3.8, 0.1], rot: [atk ? -0.25 : 0.1, 0, 0] });
    arm.add(sphere(0.75, '#495057', { metal: 0.5, rough: 0.35 }));
    arm.add(rbox(1.1, 1.1, 2.4, 0.3, '#6c757d', { pos: [0, -0.4, 0.8], metal: 0.5, rough: 0.35 }));
    arm.add(cyl(0.35, 0.35, 0.8, '#343a40', { pos: [0, -0.4, 2.2], rot: [Math.PI / 2, 0, 0], metal: 0.7 }));
    arm.add(cyl(0.22, 0.22, 0.1, '#ff006e', { pos: [0, -0.4, 2.62], rot: [Math.PI / 2, 0, 0], emissive: '#ff006e', emissiveIntensity: atk ? 2 : 0.6, outline: false }));
    if (atk) arm.add(sphere(0.55, '#ffd6e0', { pos: [0, -0.4, 3.1], emissive: '#ff4d6d', emissiveIntensity: 1.6, scale: [1, 1, 1.5], outline: false }));
    up.add(arm);
  });
  root.add(up);
  return root;
}

function pyro(p) {
  const { walk, ph, atk } = p;
  const root = group();
  const robe = '#9d0208';
  const sway = walk ? Math.sin(ph * TAU) * 0.08 : 0;
  const g = group([], { rot: [0, 0, sway], pos: [0, walk ? Math.abs(Math.sin(ph * TAU)) * 0.15 : 0, 0] });
  g.add(cone(2.1, 4.4, robe, { pos: [0, 2.2, 0], rough: 0.85 }));
  g.add(torus(1.9, 0.18, '#ffba08', { pos: [0, 0.45, 0], rot: [Math.PI / 2, 0, 0], emissive: '#ff7b00', emissiveIntensity: 0.4 }));
  g.add(rbox(0.5, 3.0, 0.3, 0.12, '#370617', { pos: [0, 1.9, 1.1], rot: [0.43, 0, 0], outline: false }));
  // hood + head
  g.add(sphere(1.25, '#6a040f', { pos: [0, 4.7, 0], rough: 0.85 }));
  g.add(sphere(1.0, DARK, { pos: [0, 4.55, 0.42], ...front(2.2), thetaStart: 0.9, theta: 1.3, rough: 0.6 }));
  glowEyes(g, 4.6, 1.33, 0.38, 0.17, '#ffba08', false);
  g.add(spike([0, 5.85, -0.3], [0, 0.6, -1], 0.5, 1.0, '#6a040f'));
  // floating flames
  for (const [x, y, z, r] of [[-2.2, 4.4, 0.4, 0.35], [2.3, 3.6, -0.3, 0.3], [-1.9, 2.3, -0.8, 0.25]]) {
    g.add(sphere(r, '#ff7b00', { pos: [x, y + (walk ? Math.sin(ph * TAU + x) * 0.2 : 0), z], emissive: '#ff5400', emissiveIntensity: 1.6, outline: false }));
    g.add(sphere(r * 0.5, '#ffee32', { pos: [x, y + r * 0.6, z], emissive: '#ffee32', emissiveIntensity: 1.6, outline: false }));
  }
  // staff in right hand, fire hand on the left
  const st = group([], { pos: [-1.75, 2.9, 0.9], rot: atk ? [0.9, 0, 0.2] : [0.05, 0, 0.12] });
  st.add(cyl(0.12, 0.12, 4.6, '#6c584c', { pos: [0, 0.4, 0] }));
  st.add(sphere(0.55, '#ff7b00', { pos: [0, 2.9, 0], emissive: '#ff5400', emissiveIntensity: 1.6, scale: [1, 1.4, 1] }));
  st.add(sphere(0.3, '#ffee32', { pos: [0, 3.2, 0.1], emissive: '#ffee32', emissiveIntensity: 1.6, outline: false }));
  g.add(st);
  g.add(limb([-1.0, 3.9, 0.3], [-1.75, 2.9, 0.9], 0.3, robe));
  const hand = atk ? [1.5, 4.6, 1.3] : [1.6, 2.9, 0.9];
  g.add(limb([1.0, 3.9, 0.3], hand, 0.3, robe));
  g.add(sphere(0.28, '#ffdbac', { pos: hand }));
  if (atk) g.add(sphere(0.8, '#ff7b00', { pos: [hand[0], hand[1] + 0.8, hand[2] + 0.3], emissive: '#ff5400', emissiveIntensity: 1.8, outline: false }));
  root.add(g);
  return root;
}

function phantom(p) {
  const { walk, ph, atk } = p;
  const root = group();
  const g = group([], { pos: [0, 0.6 + (walk ? Math.sin(ph * TAU) * 0.25 : 0.1), 0] });
  const cloak = '#5a189a';
  g.add(cone(2.0, 4.6, cloak, { pos: [0, 2.6, 0], rough: 0.7 }));
  for (let i = 0; i < 7; i++) {
    const t = (i / 7) * TAU + (walk ? ph : 0);
    g.add(cone(0.55, 1.1, cloak, { pos: [Math.cos(t) * 1.55, 0.3, Math.sin(t) * 1.55], rot: [Math.PI, 0, 0] }));
  }
  g.add(sphere(1.35, '#3c096c', { pos: [0, 5.1, 0], rough: 0.7 }));
  g.add(sphere(1.1, '#10002b', { pos: [0, 4.95, 0.45], ...front(2.3), thetaStart: 0.8, theta: 1.4, rough: 0.5 }));
  for (const s of [-1, 1]) g.add(cone(0.22, 0.55, '#00f5d4', { pos: [s * 0.42, 5.05, 1.45], rot: [Math.PI / 2, 0, s * 0.9], emissive: '#00f5d4', emissiveIntensity: 1.8, outline: false }));
  g.add(rbox(0.8, atk ? 0.35 : 0.12, 0.1, 0.05, '#00f5d4', { pos: [0, 4.4, 1.48], emissive: '#00f5d4', emissiveIntensity: 1.5, outline: false }));
  g.add(spike([0, 6.2, -0.4], [0, 0.4, -1], 0.6, 1.2, '#3c096c'));
  // floating claw hands
  [-1, 1].forEach((s) => {
    const hp = atk ? [s * 1.3, 4.0, 2.2] : [s * 2.3, 3.0 + (walk ? Math.sin(ph * TAU + s) * 0.3 : 0), 0.6];
    g.add(sphere(0.45, '#c77dff', { pos: hp, rough: 0.5 }));
    for (const d of [-0.2, 0, 0.2]) g.add(cone(0.08, 0.8, '#dee2e6', { pos: [hp[0] + d, hp[1] - 0.1, hp[2] + 0.55], rot: [Math.PI / 2, 0, 0], metal: 0.8, rough: 0.2 }));
  });
  root.add(g);
  return root;
}

function slime(p) {
  const { walk, ph, atk } = p;
  const root = group();
  const sq = walk ? 1 + Math.sin(ph * TAU) * 0.1 : atk ? 0.85 : 1;
  const body = mesh(new THREE.SphereGeometry(2.6, 48, 32), mat('#70e000', { rough: 0.15, metal: 0.05 }), {
    pos: [0, 2.3 * sq, 0],
    scale: [1.12 / Math.sqrt(sq), 0.9 * sq, 1.0 / Math.sqrt(sq)],
  });
  root.add(body);
  root.add(sphere(0.6, '#ccff33', { pos: [-1.2, 3.9 * sq, 1.0], scale: [1.4, 0.6, 0.6], outline: false, emissive: '#ccff33', emissiveIntensity: 0.3 }));
  for (const [x, z, r] of [[-2.2, 0.8, 0.5], [2.0, 1.2, 0.45], [0.5, 2.3, 0.35], [-1.0, -1.8, 0.45]]) root.add(sphere(r, '#70e000', { pos: [x, 0.2, z], scale: [1.3, 0.5, 1.3], rough: 0.15 }));
  const fy = 2.6 * sq;
  for (const s of [-1, 1]) {
    root.add(sphere(0.55, '#ffffff', { pos: [s * 0.9, fy + 0.6, 2.2], scale: [0.9, 1.1, 0.5], emissive: '#ffffff', emissiveIntensity: 0.2 }));
    root.add(sphere(0.28, DARK, { pos: [s * 0.9, fy + 0.55, 2.47], scale: [1, 1.1, 0.5], outline: false }));
    root.add(rbox(1.0, 0.22, 0.22, 0.08, '#38b000', { pos: [s * 0.95, fy + 1.35, 2.15], rot: [-0.3, 0, s * 0.4] }));
  }
  root.add(sphere(atk ? 0.9 : 0.65, DARK, { pos: [0, fy - 0.6, 2.25], scale: [1.4, atk ? 0.8 : 0.4, 0.5] }));
  root.add(capsule(0.12, 0.4, '#9ef01a', { pos: [0.6, fy - 1.05, 2.3], outline: false }));
  const cy = 4.55 * sq;
  root.add(cyl(0.9, 0.85, 0.5, '#ffd60a', { pos: [0, cy, -0.1], open: true, metal: 0.7, rough: 0.25 }));
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * TAU;
    root.add(cone(0.2, 0.55, '#ffd60a', { pos: [Math.cos(t) * 0.86, cy + 0.5, Math.sin(t) * 0.86 - 0.1], metal: 0.7, rough: 0.25 }));
  }
  root.add(sphere(0.16, '#e63946', { pos: [0, cy, 0.78], emissive: '#e63946', emissiveIntensity: 0.4 }));
  return root;
}

const BOSSES = { golem, wasp, mech, pyro, phantom, slime };

export function buildBoss(id, pose = {}) {
  const walk = pose.phase !== null && pose.phase !== undefined;
  return BOSSES[id]({ walk, ph: walk ? pose.phase : 0, atk: !!pose.attack });
}
