// Primitive "clay" kit for building stylized 3D characters, with inverted-hull outlines.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const OUTLINE = '#1b1530';
const OUTLINE_W = 0.032;

const outlineMat = new THREE.ShaderMaterial({
  uniforms: { c: { value: new THREE.Color(OUTLINE) }, t: { value: OUTLINE_W } },
  vertexShader: `
    uniform float t;
    void main() {
      // Extrude along the normal in view space so thickness is independent of object scale.
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vec3 n = normalize(normalMatrix * normal);
      mv.xyz += n * t;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `uniform vec3 c; void main() { gl_FragColor = vec4(c, 1.0); }`,
  side: THREE.BackSide,
});

const matCache = new Map();
/** Stylized material: soft PBR with a little clearcoat-like sheen via low roughness. */
export function mat(color, o = {}) {
  const key = `${color}|${JSON.stringify(o)}`;
  if (!matCache.has(key)) {
    matCache.set(
      key,
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: o.rough ?? 0.6,
        metalness: o.metal ?? 0,
        emissive: new THREE.Color(o.emissive ?? '#000000'),
        emissiveIntensity: o.emissiveIntensity ?? 1,
        flatShading: !!o.flat,
      }),
    );
  }
  return matCache.get(key);
}

function place(obj, o = {}) {
  if (o.pos) obj.position.set(...o.pos);
  if (o.rot) obj.rotation.set(...o.rot);
  if (o.scale) obj.scale.set(...(Array.isArray(o.scale) ? o.scale : [o.scale, o.scale, o.scale]));
  return obj;
}

/** Mesh with an outline hull child. */
export function mesh(geo, material, o = {}) {
  const m = new THREE.Mesh(geo, material);
  if (o.outline !== false) {
    const hull = new THREE.Mesh(geo, outlineMat);
    hull.renderOrder = -1;
    m.add(hull);
  }
  return place(m, o);
}

export const sphere = (r, color, o = {}) => mesh(new THREE.SphereGeometry(r, 40, 28, 0, Math.PI * 2, o.thetaStart ?? 0, o.theta ?? Math.PI), mat(color, o), o);
export const capsule = (r, len, color, o = {}) => mesh(new THREE.CapsuleGeometry(r, len, 12, 28), mat(color, o), o);
export const rbox = (w, h, d, rad, color, o = {}) => mesh(new RoundedBoxGeometry(w, h, d, 5, rad), mat(color, o), o);
export const cyl = (rt, rb, h, color, o = {}) => mesh(new THREE.CylinderGeometry(rt, rb, h, 32, 1, !!o.open), mat(color, o), o);
export const cone = (r, h, color, o = {}) => mesh(new THREE.ConeGeometry(r, h, 28), mat(color, o), o);
export const torus = (R, tube, color, o = {}) => mesh(new THREE.TorusGeometry(R, tube, 18, 48, o.arc ?? Math.PI * 2), mat(color, o), o);

export function group(children = [], o = {}) {
  const g = new THREE.Group();
  children.forEach((c) => c && g.add(c));
  return place(g, o);
}

/** Capsule stretched between two points (arms, legs, handles). */
export function limb(a, b, r, color, o = {}) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const m = capsule(r, Math.max(0.001, len), color, o);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}

/** Cone pointing from `base` outward along `dir`. */
export function spike(base, dir, r, h, color, o = {}) {
  const d = new THREE.Vector3(...dir).normalize();
  const m = cone(r, h, color, o);
  m.position.copy(new THREE.Vector3(...base).add(d.clone().multiplyScalar(h / 2)));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  return m;
}

/** World position of a point given in an object's local space. */
export function localPoint(obj, p) {
  obj.updateMatrixWorld(true);
  return obj.localToWorld(new THREE.Vector3(...p)).toArray();
}

export { THREE };
