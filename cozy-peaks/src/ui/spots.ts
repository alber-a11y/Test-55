import { h } from './dom';
import { stage } from './stage';

/**
 * Hotspot = a dot fixed on the item + a label that can move around it.
 * The label is placed by `placeLabels` so that every label stays visible.
 */
export function spot(x: number, y: number, cls: string, onclick: () => void, ...children: (Node | null)[]): HTMLElement[] {
  const dot = h('i', { class: `spot-dot ${cls}`, style: `left:${x}px;top:${y}px` });
  const label = h('button', { class: `spot ${cls}`, style: `left:${x}px;top:${y}px`, onclick }, ...children);
  return [dot, label];
}

type R = { x: number; y: number; w: number; h: number };
const hit = (a: R, b: R, pad = 4) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/**
 * Try label positions around each dot (above, below, sideways, then further away) and keep
 * the first one that collides with nothing: HUD and panels (`reservedSel` inside `root`),
 * labels already placed and the screen edges. The selected label is placed first.
 */
export function placeLabels(container: HTMLElement, root: HTMLElement, reservedSel: string): void {
  const reserved: R[] = [...root.querySelectorAll(reservedSel)].map((e) => stage.rect(e)).filter((r) => r.w > 0);
  const labels = [...container.querySelectorAll<HTMLElement>('.spot')].sort((a, b) => Number(b.classList.contains('sel')) - Number(a.classList.contains('sel')));
  const placed: R[] = [];
  for (const sp of labels) {
    // Items scrolled out of view (portrait panning): hide their dot and label.
    const ax = parseFloat(sp.style.left);
    const ay = parseFloat(sp.style.top);
    const visible = ax > 8 && ax < stage.w - 8 && ay > 0 && ay < stage.h;
    sp.style.display = visible ? '' : 'none';
    const dot = sp.previousElementSibling as HTMLElement | null;
    if (dot?.classList.contains('spot-dot')) dot.style.display = visible ? '' : 'none';
    if (!visible) continue;
    // Computed from the anchor and the label's layout size (not measured on screen),
    // so the result never depends on an animation in progress.
    const w = sp.offsetWidth;
    const hh = sp.offsetHeight;
    const base = { x: ax - w / 2, y: ay - hh - 24, w, h: hh };
    const below = hh + 44;
    const step = hh + 10;
    const cands: [number, number][] = [
      [0, 0],
      [0, below],
      [-w * 0.38, 0],
      [w * 0.38, 0],
      [-w * 0.38, below],
      [w * 0.38, below],
      [0, -step],
      [-w * 0.55, -step],
      [w * 0.55, -step],
      [0, -2 * step],
      [-w * 0.55, -2 * step],
      [w * 0.55, -2 * step],
      [0, -3 * step],
      [-w * 0.6, below + step],
      [w * 0.6, below + step],
      [0, -4 * step],
    ];
    let best: [number, number] = [0, 0];
    let bestScore = Infinity;
    for (const [dx, dy] of cands) {
      const r = { x: base.x + dx, y: base.y + dy, w, h: hh };
      const out = r.x < 4 || r.x + r.w > stage.w - 4 || r.y < 4 || r.y + r.h > stage.h - 4;
      const score = reserved.filter((q) => hit(r, q)).length * 4 + placed.filter((q) => hit(r, q)).length * 3 + (out ? 6 : 0) + Math.abs(dy) / 400 + Math.abs(dx) / 800;
      if (score < bestScore) {
        bestScore = score;
        best = [dx, dy];
      }
      if (score < 1) break;
    }
    sp.style.setProperty('--dx', `${best[0]}px`);
    sp.style.setProperty('--dy', `${best[1]}px`);
    sp.dataset.pos = best[0] === 0 && best[1] === 0 ? 'up' : best[1] === below ? 'down' : 'free';
    placed.push({ x: base.x + best[0], y: base.y + best[1], w, h: hh });
  }
}
