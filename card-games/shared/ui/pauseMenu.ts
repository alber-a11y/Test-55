import Phaser from 'phaser';
import { openModal, type Modal } from './modal';
import { Button, type ColorName } from './widgets';

export interface PauseItem {
  label: string;
  icon: string;
  color: ColorName;
  fn: () => void;
}

/**
 * Pause menu: the first item ("Continue") spans the full width, the rest form a 2-column grid.
 * `onClose` runs when the menu closes for any reason.
 */
export function openPauseMenu(scene: Phaser.Scene, title: string, items: PauseItem[], onClose: () => void): Modal {
  const W = scene.scale.width;
  const bw = Math.min(400, (Math.min(W - 60, 900) - 120) / 2);
  const bh = 116;
  const gap = 24;
  const rows = Math.ceil((items.length - 1) / 2);
  const mw = bw * 2 + gap + 100;
  const mh = 170 + bh + gap * 2 + rows * (bh + gap) + 40;
  const m = openModal(scene, title, mw, mh, onClose, { depth: 2600 });
  const [first, ...rest] = items;
  const y0 = m.y + 140 + bh / 2;
  m.root.add(new Button(scene, W / 2, y0, { w: bw * 2 + gap, h: bh, color: first.color, label: first.label, icon: `i_${first.icon}`, iconSize: 70, size: 40 }).onClick(first.fn));
  rest.forEach((it, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const alone = i === rest.length - 1 && rest.length % 2 === 1;
    const x = alone ? W / 2 : W / 2 + (col === 0 ? -1 : 1) * (bw / 2 + gap / 2);
    const y = y0 + bh + gap * 2 + row * (bh + gap);
    const b = new Button(scene, x, y, { w: alone ? bw * 2 + gap : bw, h: bh, color: it.color, label: it.label, icon: `i_${it.icon}`, iconSize: 64, size: 32 }).onClick(it.fn);
    // Long labels shrink to stay inside the button.
    if (b.label && b.label.width > (alone ? bw * 2 : bw) - 110) b.label.setScale(((alone ? bw * 2 : bw) - 110) / b.label.width);
    m.root.add(b);
  });
  return m;
}
