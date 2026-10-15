import Phaser from 'phaser';
import { TILE } from '../data/types';
import { isBlocking, T, type LevelConfig } from './levels';

const DESTRUCTIBLE_HP: Partial<Record<T, number>> = { [T.Crate]: 2600, [T.Barrel]: 1600 };

/** Tile map: rendering, collision, line of sight, path flow-field. */
export class Arena {
  readonly w: number;
  readonly h: number;
  readonly tiles: T[];
  readonly pxW: number;
  readonly pxH: number;
  private hp: Float32Array;
  private objs: (Phaser.GameObjects.Image | null)[];
  private flow: Int16Array;
  private flowFrom = -1;
  private flowAge = 0;

  constructor(private scene: Phaser.Scene, private cfg: LevelConfig) {
    this.w = cfg.w;
    this.h = cfg.h;
    this.tiles = cfg.tiles.slice();
    this.pxW = this.w * TILE;
    this.pxH = this.h * TILE;
    this.hp = new Float32Array(this.w * this.h);
    this.objs = new Array(this.w * this.h).fill(null);
    this.flow = new Int16Array(this.w * this.h);
    this.tiles.forEach((t, i) => (this.hp[i] = DESTRUCTIBLE_HP[t] ?? 0));
    this.render();
  }

  private render(): void {
    const b = this.cfg.biome.id;
    const s = this.scene;
    // Bake the static ground (floor + outer border) into one texture: one draw call instead of ~1000.
    const pad = 4;
    const key = 'arena_ground';
    if (s.textures.exists(key)) s.textures.remove(key);
    const cv = document.createElement('canvas');
    cv.width = (this.w + pad * 2) * TILE;
    cv.height = (this.h + pad * 2) * TILE;
    const ctx = cv.getContext('2d')!;
    const src = (k: string) => s.textures.get(k).getSourceImage() as CanvasImageSource;
    const edge = src(`${b}_edge`);
    for (let r = -pad; r < this.h + pad; r++)
      for (let c = -pad; c < this.w + pad; c++) {
        const x = (c + pad) * TILE;
        const y = (r + pad) * TILE;
        if (c >= 0 && r >= 0 && c < this.w && r < this.h) {
          const v = ((c + r) % 2) + ((c * 7 + r * 13) % 11 === 0 ? 2 : 0);
          ctx.drawImage(src(`${b}_floor${v}`), x, y);
        } else ctx.drawImage(edge, x, y);
      }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 10;
    ctx.strokeRect(pad * TILE - 5, pad * TILE - 5, this.pxW + 10, this.pxH + 10);
    s.textures.addCanvas(key, cv);
    s.add.image(-pad * TILE, -pad * TILE, key).setOrigin(0).setDepth(-10);

    for (let r = 0; r < this.h; r++) for (let c = 0; c < this.w; c++) this.placeObj(c, r);
  }

  private placeObj(c: number, r: number): void {
    const i = r * this.w + c;
    const t = this.tiles[i];
    const b = this.cfg.biome.id;
    const x = c * TILE;
    const y = r * TILE;
    let img: Phaser.GameObjects.Image | null = null;
    switch (t) {
      case T.Wall:
        img = this.scene.add.image(x, y - 24, `${b}_wall`).setOrigin(0);
        img.setDepth(y + TILE - 2);
        break;
      case T.Crate:
        img = this.scene.add.image(x, y - 20, `${b}_crate`).setOrigin(0);
        img.setDepth(y + TILE - 2);
        break;
      case T.Barrel:
        img = this.scene.add.image(x, y - 20, `${b}_barrel`).setOrigin(0);
        img.setDepth(y + TILE - 2);
        break;
      case T.Bush:
        img = this.scene.add.image(x - 2, y - 16, `${b}_bush`).setOrigin(0);
        img.setDepth(y + TILE + 8);
        break;
      case T.Water: {
        img = this.scene.add.image(x, y, `${b}_water`).setOrigin(0).setDepth(-8);
        this.scene.tweens.add({ targets: img, alpha: 0.85, duration: 900 + ((c * 31 + r * 17) % 600), yoyo: true, repeat: -1 });
        break;
      }
    }
    this.objs[i] = img;
  }

  inBounds(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < this.w && r < this.h;
  }

  tile(c: number, r: number): T {
    if (!this.inBounds(c, r)) return T.Wall;
    return this.tiles[r * this.w + c];
  }

  tileAtPx(x: number, y: number): T {
    return this.tile(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  blocksMove(c: number, r: number): boolean {
    return isBlocking(this.tile(c, r));
  }

  blocksShot(c: number, r: number): boolean {
    const t = this.tile(c, r);
    return t === T.Wall || t === T.Crate || t === T.Barrel;
  }

  isBushPx(x: number, y: number): boolean {
    return this.tileAtPx(x, y) === T.Bush;
  }

  /** Damage destructible tile; returns true if tile was destroyed. */
  damageTile(c: number, r: number, dmg: number): boolean {
    if (!this.inBounds(c, r)) return false;
    const i = r * this.w + c;
    const t = this.tiles[i];
    if (t !== T.Crate && t !== T.Barrel) return false;
    this.hp[i] -= dmg;
    const img = this.objs[i];
    if (img && this.hp[i] > 0) {
      this.scene.tweens.add({ targets: img, x: img.x + 3, duration: 40, yoyo: true, repeat: 1 });
    }
    if (this.hp[i] <= 0) {
      this.destroyTile(c, r);
      return true;
    }
    return false;
  }

  /** Remove any obstacle (supers can break even walls). Bushes too. */
  destroyTile(c: number, r: number): boolean {
    if (!this.inBounds(c, r)) return false;
    const i = r * this.w + c;
    const t = this.tiles[i];
    if (t === T.Floor || t === T.Water) return false;
    this.tiles[i] = T.Floor;
    this.objs[i]?.destroy();
    this.objs[i] = null;
    this.flowFrom = -1;
    this.scene.events.emit('tileDestroyed', c, r, t);
    return true;
  }

  /** Move a circle with tile collision. Returns resolved position. */
  move(x: number, y: number, rad: number, dx: number, dy: number, canSwim = false): { x: number; y: number; hit: boolean } {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 10));
    let hit = false;
    for (let s = 0; s < steps; s++) {
      x += dx / steps;
      y += dy / steps;
      const res = this.resolve(x, y, rad, canSwim);
      if (res.hit) hit = true;
      x = res.x;
      y = res.y;
    }
    return { x, y, hit };
  }

  private resolve(x: number, y: number, rad: number, canSwim: boolean): { x: number; y: number; hit: boolean } {
    let hit = false;
    x = Phaser.Math.Clamp(x, rad, this.pxW - rad);
    y = Phaser.Math.Clamp(y, rad, this.pxH - rad);
    const c0 = Math.floor((x - rad) / TILE);
    const c1 = Math.floor((x + rad) / TILE);
    const r0 = Math.floor((y - rad) / TILE);
    const r1 = Math.floor((y + rad) / TILE);
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        const t = this.tile(c, r);
        if (!isBlocking(t) || (canSwim && t === T.Water)) continue;
        const nx = Phaser.Math.Clamp(x, c * TILE, (c + 1) * TILE);
        const ny = Phaser.Math.Clamp(y, r * TILE, (r + 1) * TILE);
        const ddx = x - nx;
        const ddy = y - ny;
        const d2 = ddx * ddx + ddy * ddy;
        if (d2 < rad * rad) {
          hit = true;
          if (d2 === 0) {
            // Center inside tile — push up.
            y = r * TILE - rad;
            continue;
          }
          const d = Math.sqrt(d2);
          x = nx + (ddx / d) * rad;
          y = ny + (ddy / d) * rad;
        }
      }
    return { x, y, hit };
  }

  /** True when a straight shot from a to b is not blocked by walls/crates. */
  lineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(dist / 16);
    for (let i = 1; i < steps; i++) {
      const x = x1 + ((x2 - x1) * i) / steps;
      const y = y1 + ((y2 - y1) * i) / steps;
      if (this.blocksShot(Math.floor(x / TILE), Math.floor(y / TILE))) return false;
    }
    return true;
  }

  /** BFS distance field toward a target tile; recomputed only when target tile changes. */
  updateFlow(tx: number, ty: number, dt: number): void {
    const c = Phaser.Math.Clamp(Math.floor(tx / TILE), 0, this.w - 1);
    const r = Phaser.Math.Clamp(Math.floor(ty / TILE), 0, this.h - 1);
    const idx = r * this.w + c;
    this.flowAge += dt;
    if (idx === this.flowFrom && this.flowAge < 1.5) return;
    this.flowFrom = idx;
    this.flowAge = 0;
    this.flow.fill(-1);
    const q = new Int32Array(this.w * this.h);
    let head = 0;
    let tail = 0;
    q[tail++] = idx;
    this.flow[idx] = 0;
    while (head < tail) {
      const i = q[head++];
      const ic = i % this.w;
      const ir = (i / this.w) | 0;
      const d = this.flow[i] + 1;
      if (ic > 0) tail = this.visit(i - 1, d, q, tail);
      if (ic < this.w - 1) tail = this.visit(i + 1, d, q, tail);
      if (ir > 0) tail = this.visit(i - this.w, d, q, tail);
      if (ir < this.h - 1) tail = this.visit(i + this.w, d, q, tail);
    }
  }

  private visit(j: number, d: number, q: Int32Array, tail: number): number {
    if (this.flow[j] !== -1 || isBlocking(this.tiles[j])) return tail;
    this.flow[j] = d;
    q[tail++] = j;
    return tail;
  }

  /** Direction (unit vector) along the flow field from a point, or null if unreachable. */
  flowDir(x: number, y: number): { x: number; y: number } | null {
    const c = Math.floor(x / TILE);
    const r = Math.floor(y / TILE);
    if (!this.inBounds(c, r)) return null;
    const here = this.flow[r * this.w + c];
    let best = here < 0 ? 1e9 : here;
    let bc = -1;
    let br = -1;
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (!this.inBounds(nc, nr)) continue;
      // No diagonal corner-cutting.
      if (dc !== 0 && dr !== 0 && (this.blocksMove(c + dc, r) || this.blocksMove(c, r + dr))) continue;
      const v = this.flow[nr * this.w + nc];
      if (v >= 0 && v < best) {
        best = v;
        bc = nc;
        br = nr;
      }
    }
    if (bc < 0) return null;
    const tx = bc * TILE + TILE / 2;
    const ty = br * TILE + TILE / 2;
    const d = Math.hypot(tx - x, ty - y) || 1;
    return { x: (tx - x) / d, y: (ty - y) / d };
  }

  /** Nearest walkable tile center to a given tile. */
  freeSpot(c: number, r: number): { x: number; y: number } {
    for (let rad = 0; rad < 8; rad++)
      for (let dc = -rad; dc <= rad; dc++)
        for (let dr = -rad; dr <= rad; dr++) {
          const nc = c + dc;
          const nr = r + dr;
          if (this.inBounds(nc, nr) && !this.blocksMove(nc, nr)) return { x: nc * TILE + TILE / 2, y: nr * TILE + TILE / 2 };
        }
    return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
  }

  randomFree(rngFn: () => number): { x: number; y: number } {
    for (let i = 0; i < 100; i++) {
      const c = Math.floor(rngFn() * this.w);
      const r = Math.floor(rngFn() * this.h);
      if (!this.blocksMove(c, r)) return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
    }
    return { x: this.pxW / 2, y: this.pxH / 2 };
  }
}
