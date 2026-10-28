import Phaser from 'phaser';
import { IconButton, panel, ribbon, UI } from './widgets';

export interface Modal {
  root: Phaser.GameObjects.Container;
  /** Panel rectangle in scene coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
  close: () => void;
}

/**
 * Dimmed overlay with a panel and a ribbon title. Content is added to `root`.
 * `onClose` runs once when the modal is closed (X button or `close()`).
 */
export function openModal(
  scene: Phaser.Scene,
  title: string,
  w: number,
  h: number,
  onClose?: () => void,
  opts: { closable?: boolean; depth?: number; color?: number } = {},
): Modal {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const root = scene.add.container(0, 0).setDepth(opts.depth ?? 500);
  const dim = scene.add.rectangle(0, 0, W, H, UI.dim, 0.78).setOrigin(0).setInteractive();
  root.add(dim);
  const x = (W - w) / 2;
  const y = Math.max(90, (H - h) / 2);
  root.add(panel(scene, x, y, w, h, opts.color ?? UI.panel));
  root.add(ribbon(scene, W / 2, y, Math.min(w - 120, 620), title));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    root.destroy();
    onClose?.();
  };
  if (opts.closable !== false) {
    root.add(new IconButton(scene, x + w - 20, y + 20, 'i_close', 90, 'red').onClick(close));
  }
  // No fade-in tween: tweens may be paused (ads / hidden tab) and the modal must always show.
  return { root, x, y, w, h, close };
}
