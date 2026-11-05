import { shade } from '../color';

/** Scene size for every room. */
export const SCENE_W = 1600;
export const SCENE_H = 1000;

/** An item placed in a scene: its bounding box (for thumbnails) and a drawing per variant (−1 = broken). */
export interface ItemArt {
  box: [number, number, number, number];
  draw: (variant: number) => string;
}

export const ol = (c: string, k = -0.35) => shade(c, k);

/** Rounded blob of foliage. */
export function bush(x: number, y: number, r: number, c: string): string {
  return `<g><circle cx="${x}" cy="${y}" r="${r}" fill="${shade(c, -0.12)}"/>
    <circle cx="${x - r * 0.55}" cy="${y + r * 0.2}" r="${r * 0.7}" fill="${c}"/>
    <circle cx="${x + r * 0.55}" cy="${y + r * 0.15}" r="${r * 0.75}" fill="${c}"/>
    <circle cx="${x}" cy="${y - r * 0.25}" r="${r * 0.8}" fill="${shade(c, 0.08)}"/>
    <circle cx="${x - r * 0.25}" cy="${y - r * 0.45}" r="${r * 0.3}" fill="${shade(c, 0.25)}" opacity=".6"/></g>`;
}

export function flower(x: number, y: number, r: number, petal: string, center = '#ffd23f'): string {
  let o = '';
  for (let i = 0; i < 5; i++) o += `<ellipse cx="${x}" cy="${y - r * 0.7}" rx="${r * 0.5}" ry="${r * 0.7}" fill="${petal}" transform="rotate(${i * 72} ${x} ${y})"/>`;
  return o + `<circle cx="${x}" cy="${y}" r="${r * 0.4}" fill="${center}"/>`;
}

export function ladder(x: number, y: number, h: number, tilt = 8): string {
  const w = 70;
  let rungs = '';
  for (let k = 30; k < h - 10; k += 46) rungs += `<rect x="${x + 6}" y="${y + k}" width="${w - 12}" height="9" rx="3" fill="#c98f55" stroke="#7b4f26" stroke-width="2.5"/>`;
  return `<g transform="rotate(${tilt} ${x + w / 2} ${y + h})">
    <rect x="${x}" y="${y}" width="12" height="${h}" rx="4" fill="#d9a066" stroke="#7b4f26" stroke-width="3"/>
    <rect x="${x + w - 12}" y="${y}" width="12" height="${h}" rx="4" fill="#d9a066" stroke="#7b4f26" stroke-width="3"/>${rungs}</g>`;
}

export function paintBucket(x: number, y: number, c = '#7fb2e5'): string {
  return `<g><path d="M${x - 34} ${y - 70} L${x + 34} ${y - 70} L${x + 28} ${y} L${x - 28} ${y} Z" fill="#cfd6de" stroke="#6b7682" stroke-width="3"/>
    <ellipse cx="${x}" cy="${y - 70}" rx="34" ry="10" fill="${c}" stroke="#6b7682" stroke-width="3"/>
    <path d="M${x - 20} ${y - 70} q-4 30 4 40 q6 -20 6 -40" fill="${c}"/>
    <path d="M${x - 36} ${y - 72} Q${x} ${y - 120} ${x + 36} ${y - 72}" fill="none" stroke="#6b7682" stroke-width="3"/></g>`;
}

export function boxes(x: number, y: number): string {
  const box = (bx: number, by: number, w: number, h: number) => `<rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="4" fill="#d4a15f" stroke="#8a5e2c" stroke-width="3"/>
    <rect x="${bx + w / 2 - 12}" y="${by}" width="24" height="${h}" fill="#e8c48c" opacity=".8"/><path d="M${bx} ${by + 16} H${bx + w}" stroke="#8a5e2c" stroke-width="2" opacity=".5"/>`;
  return `<g>${box(x, y - 110, 150, 110)}${box(x + 20, y - 200, 110, 90)}${box(x + 150, y - 80, 100, 80)}</g>`;
}

export function dustSheet(x: number, y: number, w: number, h: number): string {
  return `<path d="M${x} ${y + h} C${x + 10} ${y + h * 0.4} ${x + w * 0.1} ${y} ${x + w * 0.35} ${y + 10} C${x + w * 0.5} ${y - 10} ${x + w * 0.7} ${y + 6} ${x + w * 0.85} ${y + 4} C${x + w} ${y + h * 0.3} ${x + w} ${y + h * 0.7} ${x + w + 10} ${y + h} Z" fill="#eceae4" stroke="#a9a59b" stroke-width="3"/>
    <path d="M${x + w * 0.3} ${y + 30} q20 ${h * 0.4} 0 ${h * 0.8} M${x + w * 0.65} ${y + 20} q-24 ${h * 0.4} 6 ${h * 0.8}" stroke="#c9c5bb" stroke-width="4" fill="none"/>`;
}

export function cobweb(x: number, y: number, s = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="#ffffff" stroke-width="1.6" fill="none" opacity=".55">
    <path d="M0 0 L90 0 M0 0 L0 90 M0 0 L70 50 M0 0 L40 80 M0 0 L80 25"/>
    <path d="M30 0 Q22 12 0 30 M55 0 Q44 26 0 55 M80 0 Q66 40 0 80"/></g>`;
}

export function cracks(x: number, y: number, s = 1, c = '#8a7a66'): string {
  return `<path d="M${x} ${y} l${30 * s} ${40 * s} l${-14 * s} ${30 * s} l${26 * s} ${50 * s} M${x + 30 * s} ${y + 40 * s} l${34 * s} ${10 * s} l${10 * s} ${30 * s}" stroke="${c}" stroke-width="${4 * s}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

export function bricksPatch(x: number, y: number, w: number, h: number, base = '#e9dccb'): string {
  let o = `<path d="M${x} ${y + 20} Q${x + w * 0.2} ${y - 8} ${x + w * 0.5} ${y + 8} Q${x + w * 0.85} ${y - 6} ${x + w} ${y + 24} L${x + w - 10} ${y + h - 14} Q${x + w * 0.5} ${y + h + 10} ${x + 8} ${y + h - 10} Z" fill="#b5654a" stroke="${shade(base, -0.3)}" stroke-width="3"/>`;
  for (let r = 0; r < h / 26; r++)
    for (let c = 0; c < w / 52 + 1; c++) {
      const bx = x + 8 + c * 52 + (r % 2) * 26;
      const by = y + 12 + r * 26;
      if (bx + 44 > x + w || by + 20 > y + h) continue;
      o += `<rect x="${bx}" y="${by}" width="46" height="20" rx="3" fill="${['#c8714f', '#b85f42', '#d27f5c'][(r + c) % 3]}" stroke="#8d4630" stroke-width="2"/>`;
    }
  return o;
}

/** Window with a sunny garden view, `broken` adds cracks and a board. */
export function windowView(x: number, y: number, w: number, h: number, broken: boolean): string {
  const frame = '#f6efe2';
  const mullions = `<rect x="${x + w / 2 - 6}" y="${y}" width="12" height="${h}" fill="${frame}" stroke="#b9a98c" stroke-width="2"/>
    <rect x="${x}" y="${y + h * 0.45}" width="${w}" height="12" fill="${frame}" stroke="#b9a98c" stroke-width="2"/>`;
  return `<g>
    <rect x="${x - 18}" y="${y - 18}" width="${w + 36}" height="${h + 36}" rx="6" fill="${frame}" stroke="#b9a98c" stroke-width="3"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#bfe7ff"/>
    <rect x="${x}" y="${y + h * 0.55}" width="${w}" height="${h * 0.45}" fill="#8fd17a"/>
    ${bush(x + w * 0.2, y + h * 0.55, 70, '#5fae55')}${bush(x + w * 0.75, y + h * 0.5, 90, '#4f9d4c')}
    <circle cx="${x + w * 0.75}" cy="${y + h * 0.15}" r="30" fill="#fff4b0" opacity=".9"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff" opacity=".12"/>
    <path d="M${x + 20} ${y + h - 30} L${x + w * 0.4} ${y + 20}" stroke="#fff" stroke-width="10" opacity=".35"/>
    ${mullions}
    <rect x="${x - 30}" y="${y + h + 12}" width="${w + 60}" height="22" rx="6" fill="${frame}" stroke="#b9a98c" stroke-width="3"/>
    ${
      broken
        ? `<path d="M${x + 40} ${y + 40} l40 30 l-10 40 l50 20 M${x + 80} ${y + 70} l30 -20" stroke="#ffffff" stroke-width="3" fill="none"/>
           <rect x="${x - 30}" y="${y + h * 0.3}" width="${w + 60}" height="34" rx="4" fill="#b98552" stroke="#6e4522" stroke-width="3" transform="rotate(-8 ${x + w / 2} ${y + h * 0.3})"/>
           <rect x="${x - 10}" y="${y + h * 0.7}" width="${w + 20}" height="30" rx="4" fill="#a87443" stroke="#6e4522" stroke-width="3" transform="rotate(6 ${x + w / 2} ${y + h * 0.7})"/>`
        : ''
    }
  </g>`;
}

export interface CurtainStyle {
  c: string;
  trim?: string;
  pattern?: 'dots' | 'stripes' | 'none';
  tassel?: string;
}

/** Curtains hanging on a rod over a window (−1 broken = torn grey rags). */
export function curtains(x: number, y: number, w: number, h: number, st: CurtainStyle | null): string {
  const rod = `<rect x="${x - 50}" y="${y - 14}" width="${w + 100}" height="12" rx="6" fill="#8a5a2b"/><circle cx="${x - 52}" cy="${y - 8}" r="11" fill="#b07a45"/><circle cx="${x + w + 52}" cy="${y - 8}" r="11" fill="#b07a45"/>`;
  if (!st) {
    return `${rod}<path d="M${x - 40} ${y} L${x + 60} ${y} L${x + 50} ${y + h * 0.5} L${x + 30} ${y + h * 0.35} L${x + 10} ${y + h * 0.6} L${x - 20} ${y + h * 0.4} L${x - 40} ${y + h * 0.55} Z" fill="#a8a296" stroke="#6f6a61" stroke-width="3"/>
      <path d="M${x + w + 40} ${y} L${x + w - 50} ${y} L${x + w - 40} ${y + h * 0.3} L${x + w - 10} ${y + h * 0.45} L${x + w + 20} ${y + h * 0.28} L${x + w + 40} ${y + h * 0.4} Z" fill="#9c968a" stroke="#6f6a61" stroke-width="3"/>`;
  }
  const d = shade(st.c, -0.18);
  const panel = (left: boolean) => {
    const x0 = left ? x - 46 : x + w + 46;
    const dir = left ? 1 : -1;
    const tieY = y + h * 0.62;
    const pw = 120;
    const path = `M${x0} ${y} L${x0 + dir * pw} ${y} C${x0 + dir * (pw - 10)} ${y + h * 0.3} ${x0 + dir * 40} ${tieY - 40} ${x0 + dir * 46} ${tieY} C${x0 + dir * 70} ${tieY + 60} ${x0 + dir * 90} ${y + h} ${x0 + dir * 100} ${y + h + 30} L${x0} ${y + h + 30} Z`;
    let deco = '';
    if (st.pattern === 'stripes') for (let k = 20; k < pw; k += 30) deco += `<path d="M${x0 + dir * k} ${y} C${x0 + dir * (k * 0.6)} ${y + h * 0.4} ${x0 + dir * k * 0.4} ${tieY} ${x0 + dir * k * 0.7} ${y + h + 30}" stroke="${st.trim ?? '#fff'}" stroke-width="7" fill="none" opacity=".55"/>`;
    if (st.pattern === 'dots') for (let k = 0; k < 14; k++) deco += `<circle cx="${x0 + dir * (14 + ((k * 37) % 90))}" cy="${y + 30 + ((k * 53) % (h - 40))}" r="5" fill="${st.trim ?? '#fff'}" opacity=".6"/>`;
    return `<path d="${path}" fill="${st.c}" stroke="${d}" stroke-width="3"/>${deco}
      <path d="M${x0 + dir * 30} ${y + 6} C${x0 + dir * 26} ${y + h * 0.4} ${x0 + dir * 20} ${y + h * 0.7} ${x0 + dir * 40} ${y + h + 26}" stroke="${d}" stroke-width="4" fill="none" opacity=".6"/>
      <path d="M${x0} ${tieY - 6} q${dir * 50} 10 ${dir * 60} 0" stroke="${st.tassel ?? st.trim ?? d}" stroke-width="10" fill="none" stroke-linecap="round"/>
      ${st.tassel ? `<path d="M${x0 + dir * 58} ${tieY} l${dir * 4} 40 l${dir * -10} 0 Z" fill="${st.tassel}"/>` : ''}`;
  };
  const valance = st.trim ? `<path d="M${x - 56} ${y - 6} H${x + w + 56} V${y + 26} ${Array.from({ length: 10 }, (_, i) => `Q${x + w + 56 - (i + 0.5) * ((w + 112) / 10)} ${y + 52} ${x + w + 56 - (i + 1) * ((w + 112) / 10)} ${y + 26}`).join(' ')} Z" fill="${st.c}" stroke="${d}" stroke-width="3"/><path d="M${x - 56} ${y + 24} H${x + w + 56}" stroke="${st.trim}" stroke-width="5"/>` : '';
  return `${rod}${panel(true)}${panel(false)}${valance}`;
}

/** Wooden floor; `worn` adds dust and broken planks. */
export function floor(y: number, c: string, worn: boolean): string {
  let o = `<rect x="0" y="${y}" width="1600" height="${1000 - y}" fill="${c}"/>`;
  for (let k = 0; k < 9; k++) {
    const yy = y + 12 + k * 40 + k * k * 2;
    o += `<path d="M0 ${yy} H1600" stroke="${shade(c, -0.16)}" stroke-width="3" opacity=".7"/>`;
    for (let s = (k % 2) * 140; s < 1600; s += 280) o += `<path d="M${s} ${yy} v${40 + k * 4}" stroke="${shade(c, -0.16)}" stroke-width="3" opacity=".5"/>`;
  }
  o += `<rect x="0" y="${y}" width="1600" height="60" fill="#000" opacity=".08"/>`;
  if (worn) o += `<path d="M300 820 l60 -14 l30 22 l-80 10Z M1250 900 l90 -10 l10 20 l-90 12Z" fill="#5a3a20" opacity=".6"/><ellipse cx="900" cy="920" rx="320" ry="40" fill="#ffffff" opacity=".12"/><ellipse cx="400" cy="760" rx="200" ry="26" fill="#ffffff" opacity=".1"/>`;
  return o;
}

export function plant(x: number, y: number, s = 1, pot = '#d9774a'): string {
  let leaves = '';
  for (let i = 0; i < 7; i++) {
    const a = -150 + i * 20;
    leaves += `<ellipse cx="${x}" cy="${y - 70 * s}" rx="${16 * s}" ry="${50 * s}" fill="${i % 2 ? '#3f9b4a' : '#58b05c'}" stroke="#2c6e34" stroke-width="2" transform="rotate(${a + 90} ${x} ${y - 30 * s})"/>`;
  }
  return `<g>${leaves}<path d="M${x - 34 * s} ${y - 40 * s} H${x + 34 * s} L${x + 26 * s} ${y} H${x - 26 * s} Z" fill="${pot}" stroke="${shade(pot, -0.35)}" stroke-width="3"/>
    <rect x="${x - 38 * s}" y="${y - 48 * s}" width="${76 * s}" height="${14 * s}" rx="4" fill="${shade(pot, 0.1)}" stroke="${shade(pot, -0.35)}" stroke-width="3"/></g>`;
}

export function vase(x: number, y: number, petals: string): string {
  let f = '';
  [[-26, -64], [0, -80], [26, -64], [-14, -96], [14, -96], [0, -56]].forEach(([dx, dy], i) => (f += flower(x + dx, y + dy, 16, i % 2 ? petals : shade(petals, 0.25), '#fff2b0')));
  return `<g><path d="M${x} ${y - 40} q-10 -30 -20 -40 M${x} ${y - 40} q10 -30 22 -38" stroke="#3f8a3f" stroke-width="4" fill="none"/>${f}
    <path d="M${x - 22} ${y - 44} C${x - 34} ${y - 20} ${x - 26} ${y} ${x - 16} ${y} H${x + 16} C${x + 26} ${y} ${x + 34} ${y - 20} ${x + 22} ${y - 44} Z" fill="#cfeaf5" stroke="#7aa9bd" stroke-width="3" opacity=".9"/></g>`;
}

export function cat(x: number, y: number, fur = '#f0a050', s = 1): string {
  const d = shade(fur, -0.3);
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M40 -10 C80 -20 90 -60 70 -70" stroke="${fur}" stroke-width="14" fill="none" stroke-linecap="round"/>
    <ellipse cx="0" cy="-30" rx="48" ry="36" fill="${fur}" stroke="${d}" stroke-width="3"/>
    <circle cx="-26" cy="-72" r="30" fill="${fur}" stroke="${d}" stroke-width="3"/>
    <path d="M-50 -88 L-46 -118 L-28 -98Z M-2 -90 L-6 -118 L-22 -98Z" fill="${fur}" stroke="${d}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M-36 -74 q5 -5 10 0 M-18 -74 q5 -5 10 0" stroke="#3b2a20" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M-26 -64 l-4 4 h8z" fill="#e86a7a"/>
    <path d="M-10 -40 q10 -6 20 0 M0 -24 q10 -6 20 0" stroke="${d}" stroke-width="4" fill="none" opacity=".6"/>
    <ellipse cx="-30" cy="-4" rx="14" ry="8" fill="${shade(fur, 0.2)}" stroke="${d}" stroke-width="2"/><ellipse cx="10" cy="-4" rx="14" ry="8" fill="${shade(fur, 0.2)}" stroke="${d}" stroke-width="2"/></g>`;
}
