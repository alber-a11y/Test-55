/** Helpers for hand-written SVG art (100×100 icon space unless stated otherwise). */
let uid = 0;

export class Defs {
  private items: string[] = [];
  constructor(private prefix = 'd' + uid++) {}
  private id(): string {
    return `${this.prefix}_${this.items.length}`;
  }
  /** Linear gradient, default top → bottom. */
  lin(c1: string, c2: string, x1 = 0, y1 = 0, x2 = 0, y2 = 1): string {
    const id = this.id();
    this.items.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`);
    return `url(#${id})`;
  }
  /** Radial gradient with a light spot top-left — the "glossy candy" look. */
  rad(c1: string, c2: string, cx = 0.35, cy = 0.3, r = 0.85): string {
    const id = this.id();
    this.items.push(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>`);
    return `url(#${id})`;
  }
  raw(def: string): string {
    const id = this.id();
    this.items.push(def.replace(/\$ID/g, id));
    return id;
  }
  toString(): string {
    return this.items.length ? `<defs>${this.items.join('')}</defs>` : '';
  }
}

/** Soft dark outline shared by all icons. */
export const O = 'stroke="#3d2416" stroke-opacity=".3" stroke-width="2.4" stroke-linejoin="round"';
export const O2 = 'stroke="#3d2416" stroke-opacity=".3" stroke-width="1.8" stroke-linejoin="round"';

export const hl = (cx: number, cy: number, rx: number, ry: number, rot = 0, op = 0.6) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="#fff" opacity="${op}"/>`;

export const circ = (cx: number, cy: number, r: number, fill: string, extra = '') =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;

export const ell = (cx: number, cy: number, rx: number, ry: number, fill: string, extra = '', rot = 0) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${rot ? `transform="rotate(${rot} ${cx} ${cy})"` : ''} ${extra}/>`;

/** Circle as a path (for even-odd holes). */
export const cpath = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

export const eyes = (x1: number, x2: number, y: number, r = 4.5) =>
  [x1, x2].map((x) => `${circ(x, y, r, '#2b1a12')}${circ(x - r * 0.35, y - r * 0.4, r * 0.38, '#fff')}`).join('');

export const blush = (x1: number, x2: number, y: number) => `${ell(x1, y, 6, 3.5, '#ff7d9a', 'opacity=".45"')}${ell(x2, y, 6, 3.5, '#ff7d9a', 'opacity=".45"')}`;

/** Polygon star points. */
export function starPts(cx: number, cy: number, ro: number, ri: number, n = 5, rot = -90): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

export type IconFn = (d: Defs) => string;

/** Wrap icon body into a standalone SVG of the given pixel size. */
export function iconSvg(fn: IconFn, size: number): string {
  const d = new Defs();
  const body = fn(d);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${d}${body}</svg>`;
}

export function svgDoc(w: number, h: number, vw: number, vh: number, body: string, defs = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="none">${defs}${body}</svg>`;
}

/** Prefix every id / url(#id) in an SVG fragment so several SVGs can share one document. */
export function scopeIds(svg: string, prefix: string): string {
  return svg.replace(/id="([\w-]+)"/g, `id="${prefix}_$1"`).replace(/url\(#([\w-]+)\)/g, `url(#${prefix}_$1)`);
}
