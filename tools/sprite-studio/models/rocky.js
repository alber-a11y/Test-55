// Rocky — the tank. Chibi proportions, spiky hair under a bandana, double-barrel shotgun.
import { capsule, cone, cyl, group, limb, localPoint, rbox, sphere, spike, torus } from '../kit.js';

export function buildRocky(p = {}) {
  const skin = p.skin ?? '#f4c095';
  const skinDark = p.skinDark ?? '#d99a6c';
  const hair = p.hair ?? '#5a3b26';
  const outfit = p.outfit ?? '#e63946';
  const outfitDark = p.outfitDark ?? '#9d1c2a';
  const accent = p.accent ?? '#ffb703';
  const pants = p.pants ?? '#3a2c4a';
  const shoe = '#2b2d42';
  const root = group();

  // ---- legs & shoes
  for (const s of [-1, 1]) {
    root.add(limb([s * 0.3, 0.32, 0], [s * 0.32, 0.78, 0], 0.21, pants));
    root.add(rbox(0.5, 0.28, 0.72, 0.12, shoe, { pos: [s * 0.33, 0.16, 0.08], rough: 0.5 }));
    root.add(rbox(0.52, 0.09, 0.74, 0.04, '#f1f1f1', { pos: [s * 0.33, 0.04, 0.08], outline: false }));
    root.add(rbox(0.3, 0.06, 0.2, 0.03, accent, { pos: [s * 0.33, 0.31, 0.3], outline: false }));
  }

  // ---- torso
  const torso = capsule(0.62, 0.42, outfit, { pos: [0, 1.28, 0], scale: [1.14, 1, 0.86], rough: 0.75 });
  root.add(torso);
  // white tank-top trim + collar
  root.add(torus(0.42, 0.07, '#ffffff', { pos: [0, 1.82, 0.04], rot: [Math.PI / 2 + 0.25, 0, 0], scale: [1.1, 1, 0.8], outline: false }));
  // belt with buckle
  root.add(torus(0.67, 0.1, '#5a3a22', { pos: [0, 0.92, 0], rot: [Math.PI / 2, 0, 0], scale: [1.12, 0.86, 1], rough: 0.5 }));
  root.add(rbox(0.32, 0.24, 0.1, 0.05, accent, { pos: [0, 0.92, 0.6], metal: 0.6, rough: 0.3 }));
  // chest emblem (star badge)
  root.add(cyl(0.17, 0.17, 0.06, accent, { pos: [0.22, 1.42, 0.5], rot: [Math.PI / 2 - 0.3, 0, 0], metal: 0.4, rough: 0.35 }));

  // ---- shotgun (built standalone so we can read hand positions)
  const gun = group([], { pos: [0.2, 1.08, 0.78], rot: [0, -0.28, 0.1] });
  gun.add(rbox(0.62, 0.3, 0.24, 0.08, '#8d5524', { pos: [-0.42, -0.06, 0], rot: [0, 0, -0.12], rough: 0.7 }));
  gun.add(rbox(0.56, 0.26, 0.26, 0.06, '#495057', { pos: [0.08, 0, 0], metal: 0.5, rough: 0.35 }));
  for (const y of [0.06, -0.08]) gun.add(cyl(0.075, 0.075, 1.15, '#3a3f47', { pos: [0.85, y, 0], rot: [0, 0, Math.PI / 2], metal: 0.7, rough: 0.3 }));
  gun.add(rbox(0.36, 0.18, 0.3, 0.06, accent, { pos: [0.62, -0.17, 0], rough: 0.5 }));
  gun.add(torus(0.1, 0.035, '#22262c', { pos: [1.42, -0.01, 0], rot: [0, Math.PI / 2, 0], metal: 0.6, outline: false }));
  const grip = localPoint(gun, [-0.1, -0.17, 0.08]);
  const pump = localPoint(gun, [0.6, -0.27, 0.1]);
  root.add(gun);

  // ---- arms: sleeve (upper) + skin forearm, both reaching the gun
  const shoulders = [
    [0.72, 1.62, 0.02],
    [-0.72, 1.62, 0.02],
  ];
  const hands = [grip, pump];
  shoulders.forEach((sh, i) => {
    const hd = hands[i];
    const elbow = [sh[0] * 1.15, sh[1] - 0.45, sh[2] + 0.12];
    root.add(sphere(0.26, outfit, { pos: sh, rough: 0.75 }));
    root.add(limb(sh, elbow, 0.19, outfit, { rough: 0.75 }));
    root.add(limb(elbow, hd, 0.15, skin));
    root.add(sphere(0.2, skin, { pos: hd }));
  });

  // ---- head
  const H = [0, 2.5, 0];
  const head = group([], { pos: H });
  root.add(head);
  head.add(sphere(1.0, skin, { scale: [1.06, 0.97, 1], rough: 0.7 }));
  for (const s of [-1, 1]) head.add(sphere(0.23, skin, { pos: [s * 1.04, -0.05, 0.05], scale: [0.55, 1, 0.9] }));
  // eyes
  for (const s of [-1, 1]) {
    head.add(sphere(0.31, '#ffffff', { pos: [s * 0.38, 0.0, 0.82], scale: [0.85, 1.08, 0.5], rough: 0.2, emissive: '#ffffff', emissiveIntensity: 0.25 }));
    head.add(sphere(0.17, '#1b1530', { pos: [s * 0.38 + 0.07, -0.02, 0.95], scale: [1, 1.12, 0.45], rough: 0.15, outline: false }));
    head.add(sphere(0.055, '#ffffff', { pos: [s * 0.38 + 0.13, 0.07, 1.01], emissive: '#ffffff', outline: false }));
    // angry brows (inner ends lower)
    head.add(rbox(0.48, 0.13, 0.14, 0.06, '#3d2b1f', { pos: [s * 0.4, 0.36, 0.88], rot: [-0.4, 0, s * 0.4] }));
  }
  head.add(sphere(0.11, skinDark, { pos: [0.06, -0.2, 0.99] }));
  // grin: dark mouth + teeth
  head.add(rbox(0.5, 0.22, 0.12, 0.08, '#5a1424', { pos: [0.06, -0.48, 0.86], rot: [-0.45, 0, 0] }));
  head.add(rbox(0.42, 0.11, 0.06, 0.04, '#ffffff', { pos: [0.06, -0.44, 0.92], rot: [-0.45, 0, 0], outline: false }));
  // hair cap + big swept spikes
  head.add(sphere(1.07, hair, { theta: 1.2, rot: [-0.45, 0, 0], scale: [1.06, 0.97, 1], rough: 0.85 }));
  const hl = '#7a5236';
  const spikes = [
    // base (x, y, z) on the cap, direction, radius, height
    [0, 0.95, 0.1, 0, 1, -0.35, 0.42, 0.85, hair],
    [0.5, 0.8, 0.05, 0.55, 1, -0.4, 0.38, 0.75, hair],
    [-0.5, 0.8, 0.05, -0.55, 1, -0.4, 0.38, 0.75, hair],
    [0.25, 0.7, -0.55, 0.3, 0.6, -1, 0.38, 0.7, hair],
    [-0.3, 0.7, -0.55, -0.35, 0.6, -1, 0.38, 0.7, hair],
    [0.85, 0.45, -0.35, 1, 0.5, -0.6, 0.3, 0.6, hair],
    [-0.85, 0.45, -0.35, -1, 0.5, -0.6, 0.3, 0.6, hair],
    [0.3, 0.8, 0.5, 0.3, 1, 0.55, 0.26, 0.5, hl],
    [-0.25, 0.82, 0.48, -0.25, 1, 0.5, 0.24, 0.45, hl],
  ];
  for (const [x, y, z, dx, dy, dz, r, h, c] of spikes) head.add(spike([x * 0.9, y * 0.9, z * 0.9], [dx, dy, dz], r, h, c, { rough: 0.85 }));
  // bandana band + knot tails
  head.add(sphere(1.0, accent, { thetaStart: 0.66, theta: 0.27, rot: [0.22, 0, 0], scale: [1.12, 1.03, 1.08], rough: 0.55 }));
  head.add(spike([-0.8, 0.62, -0.62], [-0.8, -0.1, -0.7], 0.17, 0.55, accent));
  head.add(spike([-0.75, 0.55, -0.68], [-0.5, -0.6, -0.7], 0.15, 0.5, accent));
  for (const s of [-1, 1]) head.add(sphere(0.05, '#ffffff', { pos: [s * 0.3, 0.62, 0.9], outline: false }));

  return root;
}
