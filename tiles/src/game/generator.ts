import { Rng, hashSeed } from '../core/rng.ts';
import { levelParams, type LevelParams } from './difficulty.ts';
import { BASE_SHAPES, SHAPES, UPPER_SHAPES, type Shape } from './shapes.ts';
import { ICONS_PER_SET, overlaps, TRAY_CAP, type Level, type Tile } from './types.ts';

interface Pos {
  x: number;
  y: number;
  z: number;
  stack: number;
}

const covers = (top: Pos, under: Pos) => top.z > under.z && overlaps(top, under);

function buildLayers(rng: Rng, p: LevelParams): Pos[] {
  const { cols, rows } = p;
  const norm = (x: number, y: number) => ({
    u: cols > 1 ? (x + 1 - cols) / (cols - 1) : 0,
    v: rows > 1 ? (y + 1 - rows) / (rows - 1) : 0,
  });
  const baseShape: Shape = p.n <= 3 ? SHAPES.rect : SHAPES[rng.pick(BASE_SHAPES)];
  const all: Pos[] = [];
  let prev: Pos[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const { u, v } = norm(2 * c, 2 * r);
      if (baseShape(u, v, c, r)) prev.push({ x: 2 * c, y: 2 * r, z: 0, stack: -1 });
    }
  }
  if (prev.length < 6) {
    prev = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) prev.push({ x: 2 * c, y: 2 * r, z: 0, stack: -1 });
  }
  all.push(...prev);
  let off = { x: 0, y: 0 };
  for (let z = 1; z < p.layers; z++) {
    const mode = p.n <= 3 ? 'same' : rng.pick(['half', 'half', 'half', 'same', 'hx', 'hy']);
    const d = mode === 'half' ? [1, 1] : mode === 'same' ? [0, 0] : mode === 'hx' ? [1, 0] : [0, 1];
    const next = { x: off.x ^ d[0], y: off.y ^ d[1] };
    const shape: Shape = rng.chance(0.35) ? baseShape : SHAPES[rng.pick(UPPER_SHAPES)];
    const prevKey = new Set(prev.map((q) => `${q.x},${q.y}`));
    const layer: Pos[] = [];
    for (let y = next.y, r = 0; y <= 2 * rows - 2; y += 2, r++) {
      for (let x = next.x, c = 0; x <= 2 * cols - 2; x += 2, c++) {
        const { u, v } = norm(x, y);
        if (!shape(u, v, c, r)) continue;
        // Fully supported only: every cell of the layer below that this tile would rest on must exist.
        const xs = x % 2 === off.x ? [x] : [x - 1, x + 1];
        const ys = y % 2 === off.y ? [y] : [y - 1, y + 1];
        let ok = true;
        for (const sx of xs) for (const sy of ys) if (!prevKey.has(`${sx},${sy}`)) ok = false;
        if (ok) layer.push({ x, y, z, stack: -1 });
      }
    }
    if (layer.length === 0) break;
    all.push(...layer);
    prev = layer;
    off = next;
  }
  return all;
}

function isFree(t: Pos, set: Pos[]): boolean {
  for (const o of set) if (o !== t && covers(o, t)) return false;
  return true;
}

/** Trim free (uncovered) tiles — in mirrored pairs where possible to keep the picture symmetric. */
function trim(rng: Rng, set: Pos[], goal: number, cols: number): Pos[] {
  const list = set.slice();
  const mirrorX = 2 * cols - 2;
  let guard = 1000;
  while (list.length > goal && guard-- > 0) {
    const excess = list.length - goal;
    const free = list.filter((t) => isFree(t, list));
    free.sort((a, b) => b.z - a.z || rng.next() - 0.5);
    let removed = false;
    if (excess >= 2) {
      for (const t of free) {
        const m = list.find((o) => o.x === mirrorX - t.x && o.y === t.y && o.z === t.z);
        if (m && m !== t && free.includes(m)) {
          list.splice(list.indexOf(t), 1);
          list.splice(list.indexOf(m), 1);
          removed = true;
          break;
        }
      }
    }
    if (!removed) {
      const center = free.find((t) => t.x * 2 === mirrorX);
      const t = center ?? free[0];
      list.splice(list.indexOf(t), 1);
    }
  }
  return list;
}

function layout(rng: Rng, p: LevelParams): Pos[] {
  const stackTotal = p.stacks * p.stackDepth;
  const mainTarget = Math.max(6, p.tiles - stackTotal);
  let best: Pos[] = [];
  const score = (c: Pos[]) => (c.length >= mainTarget ? 1000 - (c.length - mainTarget) : c.length);
  for (let attempt = 0; attempt < 10; attempt++) {
    // later attempts widen the grid and add a layer if the chosen shapes were too sparse
    const grow = p.n > 3 ? Math.floor(attempt / 3) : 0;
    const q: LevelParams = grow
      ? { ...p, layers: Math.min(7, p.layers + grow), cols: Math.min(6, p.cols + grow), rows: Math.min(7, p.rows + grow) }
      : p;
    const cand = buildLayers(rng, q);
    if (best.length === 0 || score(cand) > score(best)) best = cand;
    if (cand.length >= mainTarget && cand.length <= mainTarget * 1.5) break;
  }
  let goal = Math.min(mainTarget, best.length);
  while ((goal + stackTotal) % 3 !== 0) goal--;
  let main = trim(rng, best, goal, p.cols);

  // normalise to (0, 0)
  const minX = Math.min(...main.map((t) => t.x));
  const minY = Math.min(...main.map((t) => t.y));
  main = main.map((t) => ({ ...t, x: t.x - minX, y: t.y - minY }));

  if (p.stacks > 0) {
    const width = Math.max(...main.map((t) => t.x)) + 2;
    const sy = Math.max(...main.map((t) => t.y)) + 3;
    const span = p.stacks * 3 - 1;
    const sx0 = Math.round((width - span) / 2);
    for (let s = 0; s < p.stacks; s++) {
      for (let d = 0; d < p.stackDepth; d++) main.push({ x: sx0 + s * 3, y: sy, z: d, stack: s });
    }
  }
  return main;
}

export function generateLevel(n: number): Level {
  const p = levelParams(n);
  const rng = new Rng(hashSeed(n, 0xa11ce));
  const pos = layout(rng, p);
  pos.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  const N = pos.length;

  const coverers: number[][] = pos.map(() => []);
  const covering: number[][] = pos.map(() => []);
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++)
      if (i !== j && covers(pos[j], pos[i])) {
        coverers[i].push(j);
        covering[j].push(i);
      }

  // Reverse play: pick free tiles one by one and assign them to triples. Replaying the pick order
  // is a guaranteed win; with `interleave` triples open at once the tray never holds more than 2·k+1 tiles.
  const coverLeft = coverers.map((c) => c.length);
  const taken = new Array<boolean>(N).fill(false);
  const order: number[] = [];
  const groupOf = new Array<number>(N).fill(-1);
  let groupCount = 0;
  let left = N;
  while (left > 0) {
    const k = Math.min(p.interleave, left / 3, Math.floor((TRAY_CAP - 1) / 2));
    const seq: number[] = [];
    for (let g = 0; g < k; g++) seq.push(g, g, g);
    rng.shuffle(seq);
    for (const g of seq) {
      const free: number[] = [];
      for (let i = 0; i < N; i++) if (!taken[i] && coverLeft[i] === 0) free.push(i);
      const id = rng.pick(free);
      taken[id] = true;
      left--;
      order.push(id);
      groupOf[id] = groupCount + g;
      for (const u of covering[id]) coverLeft[u]--;
    }
    groupCount += k;
  }

  const K = Math.max(1, Math.min(p.types, groupCount));
  const icons = rng.shuffle(Array.from({ length: ICONS_PER_SET }, (_, i) => i)).slice(0, K);
  const groupType: number[] = [];
  for (let g = 0; g < groupCount; g++) groupType.push(icons[g % K]);
  rng.shuffle(groupType);

  const tiles: Tile[] = pos.map((q, id) => ({
    id, x: q.x, y: q.y, z: q.z, stack: q.stack, type: groupType[groupOf[id]], hidden: false, ice: 0, lock: -1,
  }));

  // "?" tiles: only ones covered at the start, so the player discovers them while digging.
  if (p.hiddenShare > 0) {
    const cand = tiles.filter((t) => t.stack < 0 && coverers[t.id].length > 0);
    rng.shuffle(cand);
    cand.slice(0, Math.round(cand.length * p.hiddenShare)).forEach((t) => (t.hidden = true));
  }

  // Ice and locks must not break the planted solution: a tile picked at step i only needs
  // triples that are already complete before step i in that order.
  const doneBefore: number[] = [];
  const doneTypes: number[][] = [];
  {
    const cnt = new Map<number, number>();
    const done: number[] = [];
    for (const id of order) {
      doneBefore.push(done.length);
      doneTypes.push(done.slice());
      const g = groupOf[id];
      cnt.set(g, (cnt.get(g) ?? 0) + 1);
      if (cnt.get(g) === 3) done.push(groupType[g]);
    }
  }
  const stepOf = new Array<number>(N);
  order.forEach((id, i) => (stepOf[id] = i));
  const eligible = () => tiles.filter((t) => t.stack < 0 && !t.hidden && t.ice === 0 && t.lock < 0 && doneBefore[stepOf[t.id]] >= 1);
  for (let i = 0; i < p.ice; i++) {
    const c = eligible();
    if (!c.length) break;
    const t = rng.pick(c);
    t.ice = rng.int(1, Math.min(3, doneBefore[stepOf[t.id]]));
  }
  for (let i = 0; i < p.locks; i++) {
    const c = eligible();
    if (!c.length) break;
    const t = rng.pick(c);
    t.lock = rng.pick(doneTypes[stepOf[t.id]]);
  }

  return { n, hard: p.hard, tiles, typeCount: K, trayCap: TRAY_CAP, solution: order };
}
