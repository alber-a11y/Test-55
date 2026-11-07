import Phaser from 'phaser';
import { Popup } from './Popup';

/** Vertical scroll area with drag inertia, mouse wheel and a geometry mask. */
export class ScrollView {
  readonly content: Phaser.GameObjects.Container;
  private maskG: Phaser.GameObjects.Graphics;
  private y0: number;
  private dragging = false;
  private startY = 0;
  private startScroll = 0;
  private velocity = 0;
  private lastY = 0;
  private lastT = 0;
  private scroll = 0;
  private maxScroll = 0;
  /** True once the current gesture moved far enough to count as a drag (suppresses clicks). */
  moved = false;

  constructor(
    private scene: Phaser.Scene,
    private x: number,
    y: number,
    private w: number,
    private h: number,
  ) {
    this.y0 = y;
    this.content = scene.add.container(x, y);
    this.maskG = scene.make.graphics({}, false);
    this.maskG.fillStyle(0xffffff).fillRect(x - w / 2, y, w, h);
    this.content.setMask(this.maskG.createGeometryMask());
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('wheel', this.onWheel, this);
    scene.events.on('update', this.update, this);
    scene.events.once('shutdown', () => {
      scene.events.off('update', this.update, this);
      this.maskG.destroy();
    });
  }

  isInside(p: { x: number; y: number }): boolean {
    return p.x >= this.x - this.w / 2 && p.x <= this.x + this.w / 2 && p.y >= this.y0 && p.y <= this.y0 + this.h;
  }

  /** Click guard for buttons inside the view. */
  readonly guard = (p: Phaser.Input.Pointer) => !this.moved && this.isInside(p);

  setContentHeight(ch: number): void {
    this.maxScroll = Math.max(0, ch - this.h);
    this.apply();
  }

  scrollTo(v: number): void {
    this.scroll = Phaser.Math.Clamp(v, 0, this.maxScroll);
    this.apply();
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (!this.isInside(p) || Popup.openCount > 0) return;
    this.dragging = true;
    this.moved = false;
    this.startY = p.y;
    this.startScroll = this.scroll;
    this.velocity = 0;
    this.lastY = p.y;
    this.lastT = performance.now();
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.dragging || !p.isDown) return;
    const dy = p.y - this.startY;
    if (Math.abs(dy) > 14) this.moved = true;
    if (!this.moved) return;
    let s = this.startScroll - dy;
    if (s < 0) s *= 0.4;
    if (s > this.maxScroll) s = this.maxScroll + (s - this.maxScroll) * 0.4;
    this.scroll = s;
    const now = performance.now();
    const dt = Math.max(1, now - this.lastT);
    this.velocity = ((this.lastY - p.y) / dt) * 16;
    this.lastY = p.y;
    this.lastT = now;
    this.apply();
  }

  private onUp(): void {
    if (!this.dragging) return;
    this.dragging = false;
    // let button pointerup handlers see `moved` first
    this.scene.time.delayedCall(0, () => (this.moved = false));
  }

  private onWheel(p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number): void {
    if (!this.isInside(p) || Popup.openCount > 0) return;
    this.velocity = 0;
    this.scroll = Phaser.Math.Clamp(this.scroll + dy, 0, this.maxScroll);
    this.apply();
  }

  private update(): void {
    if (this.dragging) return;
    if (Math.abs(this.velocity) > 0.2) {
      this.scroll += this.velocity;
      this.velocity *= 0.93;
    } else this.velocity = 0;
    const c = Phaser.Math.Clamp(this.scroll, 0, this.maxScroll);
    if (c !== this.scroll) {
      this.scroll += (c - this.scroll) * 0.25;
      if (Math.abs(c - this.scroll) < 0.5) this.scroll = c;
      this.velocity *= 0.5;
    }
    this.apply();
  }

  private apply(): void {
    this.content.y = this.y0 - this.scroll;
  }
}
