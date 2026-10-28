import Phaser from 'phaser';
import { dragGuard } from './widgets';

/**
 * Vertical (or horizontal) drag/wheel scroller with inertia. Add children to `content`;
 * interactive children should use `inView(pointer)` as their hit guard.
 */
export class Scroller {
  readonly content: Phaser.GameObjects.Container;
  private maskG: Phaser.GameObjects.Graphics;
  private pos = 0;
  private vel = 0;
  private dragging = false;
  private startP = 0;
  private startPos = 0;
  private lastP = 0;
  private lastT = 0;
  private extent = 0;
  private downInside = false;

  constructor(
    scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
    readonly w: number,
    readonly h: number,
    private horizontal = false,
  ) {
    this.content = scene.add.container(x, y);
    this.maskG = scene.make.graphics({}, false);
    this.maskG.fillStyle(0xffffff).fillRect(x, y, w, h);
    this.content.setMask(this.maskG.createGeometryMask());
    const inp = scene.input;
    const down = (p: Phaser.Input.Pointer) => {
      this.downInside = this.inView(p);
      if (!this.downInside) return;
      this.dragging = true;
      this.startP = this.coord(p);
      this.lastP = this.startP;
      this.lastT = performance.now();
      this.startPos = this.pos;
      this.vel = 0;
    };
    const move = (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      const c = this.coord(p);
      if (Math.abs(c - this.startP) > 14) dragGuard.moved = true;
      const now = performance.now();
      const dt = Math.max(1, now - this.lastT);
      this.vel = ((this.lastP - c) / dt) * 16;
      this.lastP = c;
      this.lastT = now;
      this.setPos(this.startPos - (c - this.startP));
    };
    const up = () => {
      this.dragging = false;
      // Let button handlers see dragGuard first, then clear it.
      window.setTimeout(() => (dragGuard.moved = false), 0);
    };
    const wheel = (p: Phaser.Input.Pointer, _o: unknown, dx: number, dy: number) => {
      if (!this.inView(p)) return;
      this.vel = 0;
      this.setPos(this.pos + (this.horizontal ? dx || dy : dy));
    };
    inp.on('pointerdown', down);
    inp.on('pointermove', move);
    inp.on('pointerup', up);
    inp.on('wheel', wheel);
    const tick = () => {
      if (!this.dragging && Math.abs(this.vel) > 0.2) {
        this.vel *= 0.93;
        this.setPos(this.pos + this.vel);
      }
    };
    scene.events.on('update', tick);
    scene.events.once('shutdown', () => {
      inp.off('pointerdown', down);
      inp.off('pointermove', move);
      inp.off('pointerup', up);
      inp.off('wheel', wheel);
      scene.events.off('update', tick);
      this.maskG.destroy();
    });
  }

  private coord(p: Phaser.Input.Pointer): number {
    return this.horizontal ? p.x : p.y;
  }

  /** Total content length (height, or width when horizontal). */
  setExtent(len: number): void {
    this.extent = len;
    this.setPos(this.pos);
  }

  get maxPos(): number {
    return Math.max(0, this.extent - (this.horizontal ? this.w : this.h));
  }

  setPos(v: number): void {
    this.pos = Phaser.Math.Clamp(v, 0, this.maxPos);
    if (this.horizontal) this.content.x = this.x - this.pos;
    else this.content.y = this.y - this.pos;
  }

  get position(): number {
    return this.pos;
  }

  inView(p: Phaser.Input.Pointer): boolean {
    return p.x >= this.x && p.x <= this.x + this.w && p.y >= this.y && p.y <= this.y + this.h;
  }
}
