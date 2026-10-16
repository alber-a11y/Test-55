// Offline sprite renderer: builds a model, lights it and returns a transparent PNG data URL.
import * as THREE from 'three';
import { buildRocky } from './models/rocky.js';

export const MODELS = {
  rocky: buildRocky,
};

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

/**
 * Render a model.
 * @param {string} name model id
 * @param {{size?:number, rotY?:number, params?:object, height?:number, elev?:number}} o
 */
export function render(name, o = {}) {
  const size = o.size ?? 512;
  renderer.setSize(size, size, false);
  const scene = makeScene();
  const model = MODELS[name](o.params ?? {});
  model.rotation.y = o.rotY ?? 0.5;
  scene.add(model);
  // Frame: model ~4 units tall, feet near the bottom of the frame (sprite origin y≈0.92).
  const h = o.height ?? 4.9;
  const elev = o.elev ?? 0.42; // camera pitch, radians (top-down-ish 3/4 view)
  const cam = new THREE.OrthographicCamera(-h / 2, h / 2, h / 2, -h / 2, 0.1, 100);
  const target = new THREE.Vector3(0, h * 0.4, 0);
  cam.position.set(0, target.y + Math.sin(elev) * 20, Math.cos(elev) * 20);
  cam.lookAt(target);
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/png');
}

/**
 * Render and crop for the game: symmetric around the model's root column (so sprite origin x=0.5
 * is the character's center), bottom cropped at the feet, scaled to `outH` pixels tall.
 */
export function exportSprite(name, o = {}) {
  const size = o.size ?? 900;
  const url = render(name, { ...o, size });
  const src = renderer.domElement;
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = size;
  const tctx = tmp.getContext('2d');
  tctx.drawImage(src, 0, 0);
  const data = tctx.getImageData(0, 0, size, size).data;
  let top = size, bottom = 0, left = size, right = 0;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (data[(y * size + x) * 4 + 3] > 8) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
  const cx = size / 2;
  const half = Math.ceil(Math.max(cx - left, right - cx)) + 2;
  const cropW = half * 2;
  const cropH = bottom - top + 3;
  const outH = o.outH ?? 320;
  const k = outH / cropH;
  const out = document.createElement('canvas');
  out.width = Math.round(cropW * k);
  out.height = outH;
  const octx = out.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(tmp, cx - half, top, cropW, cropH, 0, 0, out.width, out.height);
  void url;
  return out.toDataURL('image/png');
}

window.studio = { render, exportSprite, MODELS: Object.keys(MODELS) };

// Preview when opened in a browser.
const out = document.getElementById('out');
if (out) {
  for (const rotY of [0.5, 0.0, -0.5]) {
    const img = new Image();
    img.src = render('rocky', { rotY, size: 384 });
    out.appendChild(img);
  }
}
