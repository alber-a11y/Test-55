import { Rng } from '../core/rng';
import { scopeIds } from './svg';

/** Procedural scenic backgrounds drawn for any size (portrait phones … wide desktop). */
type Bg = (w: number, h: number, r: Rng) => string;

const grad = (id: string, stops: Array<[number, string, number?]>, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a ?? 1}"/>`).join('')}</linearGradient>`;
const rgrad = (id: string, c: string, a = 1) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${a}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
const BLUR = (id: string, s: number) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${s}"/></filter>`;

/** Rolling hill band across the full width. */
function hills(w: number, h: number, y: number, amp: number, waves: number, phase: number, fill: string): string {
  const pts: string[] = [];
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * w;
    const yy = y - Math.sin((i / n) * Math.PI * waves + phase) * amp - Math.sin((i / n) * Math.PI * waves * 2.3 + phase * 2) * amp * 0.3;
    pts.push(`${x.toFixed(1)},${yy.toFixed(1)}`);
  }
  return `<path d="M0 ${h}L${pts.join('L')}L${w} ${h}Z" fill="${fill}"/>`;
}

function cloud(x: number, y: number, s: number, fill = '#fff', op = 0.95): string {
  return `<g opacity="${op}" fill="${fill}"><ellipse cx="${x}" cy="${y}" rx="${70 * s}" ry="${28 * s}"/><circle cx="${x - 30 * s}" cy="${y - 12 * s}" r="${30 * s}"/><circle cx="${x + 12 * s}" cy="${y - 24 * s}" r="${38 * s}"/><circle cx="${x + 46 * s}" cy="${y - 6 * s}" r="${24 * s}"/></g>`;
}

function clouds(w: number, h: number, r: Rng, y0: number, y1: number, u: number, fill = '#fff', op = 0.95): string {
  let s = '';
  const n = Math.max(3, Math.round(w / (380 * u)));
  for (let i = 0; i < n; i++) s += cloud(((i + r.range(0.1, 0.9)) / n) * w, r.range(y0, y1) * h, r.range(0.8, 1.5) * u, fill, op);
  return s;
}

function stars(w: number, h: number, r: Rng, n: number, yMax: number, u: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += `<circle cx="${r.range(0, w).toFixed(0)}" cy="${r.range(0, h * yMax).toFixed(0)}" r="${(r.range(1, 3.2) * u).toFixed(1)}" fill="#fff" opacity="${r.range(0.4, 1).toFixed(2)}"/>`;
  return s;
}

function tree(x: number, y: number, s: number, crown: string[], trunk = '#8a5a32'): string {
  return `<rect x="${x - 8 * s}" y="${y - 60 * s}" width="${16 * s}" height="${70 * s}" rx="${6 * s}" fill="${trunk}"/>
    <circle cx="${x}" cy="${y - 90 * s}" r="${46 * s}" fill="${crown[0]}"/><circle cx="${x - 34 * s}" cy="${y - 64 * s}" r="${32 * s}" fill="${crown[1]}"/>
    <circle cx="${x + 34 * s}" cy="${y - 66 * s}" r="${34 * s}" fill="${crown[1]}"/><circle cx="${x - 14 * s}" cy="${y - 108 * s}" r="${20 * s}" fill="${crown[2]}" opacity=".7"/>`;
}

function pine(x: number, y: number, s: number, c: string, snow = false): string {
  const tri = (yy: number, ww: number, hh: number) => `<path d="M${x} ${yy - hh}L${x + ww} ${yy}H${x - ww}Z" fill="${c}"/>${snow ? `<path d="M${x} ${yy - hh}L${x + ww * 0.45} ${yy - hh * 0.55}Q${x} ${yy - hh * 0.45} ${x - ww * 0.45} ${yy - hh * 0.55}Z" fill="#fff"/>` : ''}`;
  return `<rect x="${x - 6 * s}" y="${y - 20 * s}" width="${12 * s}" height="${24 * s}" fill="#5a3a22"/>${tri(y - 14 * s, 50 * s, 70 * s)}${tri(y - 50 * s, 40 * s, 62 * s)}${tri(y - 84 * s, 28 * s, 52 * s)}`;
}

function flowers(w: number, h: number, r: Rng, y0: number, n: number, u: number, colors: string[]): string {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = r.range(0, w);
    const y = r.range(y0, 1) * h;
    const c = r.pick(colors);
    const rr = r.range(5, 9) * u * (y / h);
    s += `<g><circle cx="${x - rr}" cy="${y}" r="${rr}" fill="${c}"/><circle cx="${x + rr}" cy="${y}" r="${rr}" fill="${c}"/><circle cx="${x}" cy="${y - rr}" r="${rr}" fill="${c}"/><circle cx="${x}" cy="${y + rr}" r="${rr}" fill="${c}"/><circle cx="${x}" cy="${y}" r="${rr * 0.8}" fill="#ffe066"/></g>`;
  }
  return s;
}

const BGS: Record<string, Bg> = {
  bg_meadow: (w, h, r) => {
    const u = h / 1920;
    return `<defs>${grad('s', [[0, '#5ec4ff'], [0.55, '#bfe9ff'], [0.7, '#e8f8ff']])}${rgrad('sun', '#fff6c0', 0.9)}${grad('g1', [[0, '#9be070'], [1, '#4fae3f']])}${grad('g2', [[0, '#7fd05a'], [1, '#2f8a2f']])}</defs>
      <rect width="${w}" height="${h}" fill="url(#s)"/><circle cx="${w * 0.18}" cy="${h * 0.1}" r="${260 * u}" fill="url(#sun)"/><circle cx="${w * 0.18}" cy="${h * 0.1}" r="${70 * u}" fill="#fffbe0"/>
      ${clouds(w, h, r, 0.06, 0.32, u)}
      ${hills(w, h, h * 0.62, 70 * u, 3, r.range(0, 6), '#9fd0e8')}${hills(w, h, h * 0.68, 60 * u, 4, r.range(0, 6), '#8fd47a')}
      ${hills(w, h, h * 0.76, 50 * u, 2.5, r.range(0, 6), 'url(#g1)')}${hills(w, h, h * 0.86, 40 * u, 3.5, r.range(0, 6), 'url(#g2)')}
      ${flowers(w, h, r, 0.8, Math.round(w / (40 * u)), u * 1.6, ['#fff', '#ffd0e6', '#ffe066', '#c9a6ff'])}`;
  },
  bg_sakura: (w, h, r) => {
    const u = h / 1920;
    let trees = '';
    const n = Math.max(2, Math.round(w / (520 * u)));
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) / n) * w + r.range(-80, 80) * u;
      if (Math.abs(x - w / 2) < 300 * u && n > 2) continue;
      trees += tree(x, h * 0.66, r.range(1.6, 2.2) * u, ['#ffb8d6', '#ff9ac6', '#ffe0ee'], '#7a4a3a');
    }
    let petals = '';
    for (let i = 0; i < Math.round(w / (30 * u)); i++) petals += `<ellipse cx="${r.range(0, w)}" cy="${r.range(0, h)}" rx="${6 * u}" ry="${3.5 * u}" fill="#ffc6e0" opacity=".85" transform="rotate(${r.range(0, 180)} 0 0)"/>`;
    return `<defs>${grad('s', [[0, '#7cc4ff'], [0.5, '#cfe6ff'], [0.62, '#ffe3f0']])}${grad('l', [[0, '#8fd0f5'], [1, '#3a8fd0']])}</defs>
      <rect width="${w}" height="${h}" fill="url(#s)"/>${clouds(w, h, r, 0.05, 0.3, u)}
      <path d="M0 ${h * 0.62}L${w * 0.25} ${h * 0.5}L${w * 0.45} ${h * 0.6}L${w * 0.7} ${h * 0.46}L${w} ${h * 0.6}V${h}H0Z" fill="#b8a8e0" opacity=".8"/>
      <path d="M${w * 0.7 - 50 * u} ${h * 0.49}L${w * 0.7} ${h * 0.46}L${w * 0.7 + 50 * u} ${h * 0.49}Z" fill="#fff"/>
      ${hills(w, h, h * 0.64, 20 * u, 3, 1, '#9ad08a')}<rect y="${h * 0.66}" width="${w}" height="${h * 0.34}" fill="url(#l)"/>
      ${[0.7, 0.75, 0.8, 0.86, 0.92].map((y) => `<path d="M${w * 0.1} ${h * y}H${w * 0.4}M${w * 0.55} ${h * (y + 0.01)}H${w * 0.9}" stroke="#fff" stroke-opacity=".3" stroke-width="${4 * u}" stroke-linecap="round"/>`).join('')}
      ${trees}${petals}`;
  },
  bg_tropics: (w, h, r) => {
    const u = h / 1920;
    const palm = (x: number, y: number, s: number, flip: number) => {
      let leaves = '';
      for (let i = 0; i < 6; i++) {
        const a = -160 + i * 28;
        leaves += `<path d="M0 0Q60 -40 140 10Q70 -10 0 0Z" fill="${i % 2 ? '#2fae4a' : '#4fd06a'}" transform="translate(${x + flip * 40 * s} ${y - 300 * s}) rotate(${a}) scale(${s * 1.3})"/>`;
      }
      return `<path d="M${x} ${y}Q${x + flip * 10 * s} ${y - 150 * s} ${x + flip * 40 * s} ${y - 300 * s}" stroke="#a8743a" stroke-width="${24 * s}" fill="none" stroke-linecap="round"/>${leaves}<circle cx="${x + flip * 40 * s}" cy="${y - 296 * s}" r="${12 * s}" fill="#7a4a22"/>`;
    };
    return `<defs>${grad('s', [[0, '#2fb8ff'], [0.55, '#b6ecff']])}${grad('sea', [[0, '#3fe0d8'], [1, '#1a9ac8']])}${grad('sand', [[0, '#ffe7b0'], [1, '#f2c77a']])}</defs>
      <rect width="${w}" height="${h}" fill="url(#s)"/><circle cx="${w * 0.8}" cy="${h * 0.12}" r="${80 * u}" fill="#fff7c0"/>${clouds(w, h, r, 0.08, 0.3, u)}
      <rect y="${h * 0.58}" width="${w}" height="${h * 0.42}" fill="url(#sea)"/>
      ${[0.62, 0.66, 0.7].map((y) => `<path d="M0 ${h * y}Q${w * 0.25} ${h * y - 12 * u} ${w * 0.5} ${h * y}T${w} ${h * y}" stroke="#fff" stroke-opacity=".35" stroke-width="${5 * u}" fill="none"/>`).join('')}
      ${hills(w, h, h * 0.82, 30 * u, 2, 0.5, 'url(#sand)')}${palm(w * 0.06, h * 0.9, 1.6 * u, 1)}${palm(w * 0.94, h * 0.92, 1.4 * u, -1)}`;
  },
  bg_autumn: (w, h, r) => {
    const u = h / 1920;
    let trees = '';
    const n = Math.max(4, Math.round(w / (240 * u)));
    for (let i = 0; i < n; i++) {
      const pal = r.pick([['#ff8a3a', '#e85a1a', '#ffd06a'], ['#ffc23a', '#e8921a', '#fff0a0'], ['#e84a3a', '#b8281a', '#ff9a7a']]);
      trees += tree(((i + r.range(0.2, 0.8)) / n) * w, h * r.range(0.7, 0.74), r.range(1.1, 1.6) * u, pal);
    }
    let leaves = '';
    for (let i = 0; i < Math.round(w / (40 * u)); i++) leaves += `<ellipse cx="${r.range(0, w)}" cy="${r.range(0, h)}" rx="${9 * u}" ry="${5 * u}" fill="${r.pick(['#ff8a3a', '#ffc23a', '#e84a3a'])}" opacity=".8"/>`;
    return `<defs>${grad('s', [[0, '#ffb07a'], [0.5, '#ffe0a8'], [0.65, '#fff2d0']])}${grad('g', [[0, '#d8a050'], [1, '#9a6a2a']])}</defs>
      <rect width="${w}" height="${h}" fill="url(#s)"/>${clouds(w, h, r, 0.05, 0.3, u, '#fff6ea')}
      ${hills(w, h, h * 0.62, 50 * u, 3, r.range(0, 6), '#e8b880')}${trees}${hills(w, h, h * 0.8, 40 * u, 3, r.range(0, 6), 'url(#g)')}${leaves}`;
  },
  bg_winter: (w, h, r) => {
    const u = h / 1920;
    let pines = '';
    for (let i = 0; i < Math.round(w / (140 * u)); i++) pines += pine(r.range(0, w), h * r.range(0.68, 0.74), r.range(1.2, 1.8) * u, r.pick(['#2f7a5a', '#25694c']), true);
    const house = (x: number, y: number, s: number) => `<rect x="${x - 60 * s}" y="${y - 80 * s}" width="${120 * s}" height="${80 * s}" fill="#c8664a"/>
      <path d="M${x - 78 * s} ${y - 76 * s}L${x} ${y - 140 * s}L${x + 78 * s} ${y - 76 * s}Z" fill="#fff"/><rect x="${x - 20 * s}" y="${y - 60 * s}" width="${40 * s}" height="${34 * s}" rx="${4 * s}" fill="#ffd86a"/>`;
    let flakes = '';
    for (let i = 0; i < Math.round(w / (14 * u)); i++) flakes += `<circle cx="${r.range(0, w)}" cy="${r.range(0, h)}" r="${r.range(2, 6) * u}" fill="#fff" opacity="${r.range(0.5, 0.95)}"/>`;
    return `<defs>${grad('s', [[0, '#8fc4f0'], [0.6, '#e4f2ff']])}${grad('sn', [[0, '#ffffff'], [1, '#cfe2f6']])}</defs>
      <rect width="${w}" height="${h}" fill="url(#s)"/>${clouds(w, h, r, 0.05, 0.25, u)}
      ${hills(w, h, h * 0.64, 60 * u, 3, r.range(0, 6), '#d6e8fa')}${pines}${house(w * 0.2, h * 0.78, 1.1 * u)}${house(w * 0.82, h * 0.8, 1.2 * u)}
      ${hills(w, h, h * 0.84, 30 * u, 2.5, r.range(0, 6), 'url(#sn)')}${flakes}`;
  },
  bg_reef: (w, h, r) => {
    const u = h / 1920;
    let rays = '';
    for (let i = 0; i < 6; i++) {
      const x = r.range(0, w);
      rays += `<path d="M${x} 0L${x + 140 * u} 0L${x + 380 * u} ${h * 0.8}L${x + 220 * u} ${h * 0.8}Z" fill="#fff" opacity=".07"/>`;
    }
    let deco = '';
    for (let i = 0; i < Math.round(w / (160 * u)); i++) {
      const x = r.range(0, w);
      const y = h * r.range(0.86, 0.95);
      deco += r.chance(0.5)
        ? `<path d="M${x} ${y}V${y - 120 * u}M${x} ${y - 60 * u}L${x - 40 * u} ${y - 110 * u}M${x} ${y - 80 * u}L${x + 36 * u} ${y - 140 * u}" stroke="${r.pick(['#ff6a8a', '#ff9a5a', '#c96aff'])}" stroke-width="${16 * u}" stroke-linecap="round" fill="none"/>`
        : `<path d="M${x} ${y}Q${x - 30 * u} ${y - 80 * u} ${x} ${y - 160 * u}Q${x + 30 * u} ${y - 240 * u} ${x} ${y - 300 * u}" stroke="#3fbf6a" stroke-width="${12 * u}" fill="none" stroke-linecap="round"/>`;
    }
    let bubbles = '';
    for (let i = 0; i < Math.round(w / (30 * u)); i++) bubbles += `<circle cx="${r.range(0, w)}" cy="${r.range(0, h * 0.9)}" r="${r.range(4, 14) * u}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="${2.5 * u}"/>`;
    return `<defs>${grad('s', [[0, '#3fd0f5'], [0.6, '#1a7ac0'], [1, '#0a3a7a']])}${grad('sand', [[0, '#f6dca0'], [1, '#d4a860']])}</defs>
      <rect width="${w}" height="${h}" fill="url(#s)"/>${rays}${hills(w, h, h * 0.9, 24 * u, 3, r.range(0, 6), 'url(#sand)')}${deco}${bubbles}`;
  },
  bg_candy: (w, h, r) => {
    const u = h / 1920;
    let lol = '';
    for (let i = 0; i < Math.round(w / (220 * u)); i++) {
      const x = r.range(0, w);
      const y = h * r.range(0.72, 0.8);
      const c = r.pick(['#ff7ab8', '#7ad8ff', '#ffd23a', '#a78bff']);
      lol += `<rect x="${x - 6 * u}" y="${y - 160 * u}" width="${12 * u}" height="${160 * u}" fill="#fff"/><circle cx="${x}" cy="${y - 170 * u}" r="${50 * u}" fill="${c}"/>
        <path d="M${x} ${y - 170 * u}m${-10 * u} 0a${10 * u} ${10 * u} 0 1 1 ${20 * u} 0a${22 * u} ${22 * u} 0 1 1 ${-44 * u} 0a${34 * u} ${34 * u} 0 1 1 ${68 * u} 0" stroke="#fff" stroke-width="${7 * u}" fill="none" opacity=".8"/>`;
    }
    return `<defs>${grad('s', [[0, '#ffb8de'], [0.6, '#fff0f8']])}</defs>
      <rect width="${w}" height="${h}" fill="url(#s)"/>${clouds(w, h, r, 0.05, 0.35, u, '#ffe6f4')}
      ${hills(w, h, h * 0.66, 60 * u, 3, r.range(0, 6), '#c8f0e0')}${lol}${hills(w, h, h * 0.8, 40 * u, 4, r.range(0, 6), '#ffd6ea')}
      ${hills(w, h, h * 0.9, 30 * u, 3, r.range(0, 6), '#fff6d6')}`;
  },
  bg_sunset: (w, h, r) => {
    const u = h / 1920;
    const mtn = (y: number, amp: number, fill: string) => {
      const pts: string[] = [];
      let x = 0;
      while (x <= w + 200 * u) {
        pts.push(`${x},${y - r.range(0.3, 1) * amp}`);
        x += r.range(140, 260) * u;
        pts.push(`${x},${y + r.range(0, 0.2) * amp}`);
        x += r.range(140, 260) * u;
      }
      return `<path d="M0 ${h}L${pts.join('L')}L${w} ${h}Z" fill="${fill}"/>`;
    };
    return `<defs>${grad('s', [[0, '#3a2a7a'], [0.35, '#c04a8a'], [0.55, '#ff8a5a'], [0.66, '#ffd27a']])}${rgrad('sun', '#fff0a0', 0.9)}</defs>
      <rect width="${w}" height="${h}" fill="url(#s)"/>${stars(w, h, r, 60, 0.25, u)}
      <circle cx="${w / 2}" cy="${h * 0.6}" r="${300 * u}" fill="url(#sun)"/><circle cx="${w / 2}" cy="${h * 0.6}" r="${110 * u}" fill="#fff4b0"/>
      ${clouds(w, h, r, 0.3, 0.45, u, '#ffb0a0', 0.6)}${mtn(h * 0.66, 220 * u, '#8a4a8a')}${mtn(h * 0.74, 180 * u, '#5a2f6a')}${mtn(h * 0.84, 140 * u, '#36204a')}`;
  },
  bg_aurora: (w, h, r) => {
    const u = h / 1920;
    let pines = '';
    for (let i = 0; i < Math.round(w / (110 * u)); i++) pines += pine(r.range(0, w), h * r.range(0.82, 0.88), r.range(1.2, 2) * u, '#0e2236');
    const band = (y: number, c: string, amp: number) =>
      `<path d="M0 ${y}Q${w * 0.25} ${y - amp} ${w * 0.5} ${y}T${w} ${y}" stroke="${c}" stroke-width="${120 * u}" fill="none" opacity=".5" filter="url(#bl)"/>`;
    return `<defs>${grad('s', [[0, '#050d26'], [0.6, '#123a5a'], [1, '#1a4a6a']])}${BLUR('bl', 40 * u)}</defs>
      <rect width="${w}" height="${h}" fill="url(#s)"/>${stars(w, h, r, Math.round(w / (6 * u)), 0.7, u)}
      ${band(h * 0.22, '#3affb0', 120 * u)}${band(h * 0.3, '#2ad0ff', -90 * u)}${band(h * 0.18, '#b46aff', 60 * u)}
      ${hills(w, h, h * 0.8, 50 * u, 2.5, r.range(0, 6), '#1e4060')}${pines}${hills(w, h, h * 0.9, 20 * u, 3, r.range(0, 6), '#dfefff')}`;
  },
  bg_space: (w, h, r) => {
    const u = h / 1920;
    const neb = (x: number, y: number, rr: number, c: string) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${c}" opacity=".45" filter="url(#bl)"/>`;
    return `<defs>${grad('s', [[0, '#07061e'], [1, '#1a0f3a']])}${BLUR('bl', 70 * u)}${rgrad('p1', '#ffb36a')}</defs>
      <rect width="${w}" height="${h}" fill="url(#s)"/>${neb(w * 0.2, h * 0.3, 300 * u, '#8a3aff')}${neb(w * 0.8, h * 0.6, 340 * u, '#ff3a9a')}${neb(w * 0.5, h * 0.85, 280 * u, '#2a8aff')}
      ${stars(w, h, r, Math.round(w / (4 * u)), 1, u)}
      <circle cx="${w * 0.84}" cy="${h * 0.14}" r="${90 * u}" fill="#ffb36a"/><ellipse cx="${w * 0.84}" cy="${h * 0.14}" rx="${150 * u}" ry="${28 * u}" fill="none" stroke="#ffe0a8" stroke-width="${10 * u}" transform="rotate(-15 ${w * 0.84} ${h * 0.14})"/>
      <circle cx="${w * 0.1}" cy="${h * 0.9}" r="${140 * u}" fill="#4a7aff"/><circle cx="${w * 0.06}" cy="${h * 0.87}" r="${30 * u}" fill="#7aa0ff"/>`;
  },
};

export const BG_IDS = Object.keys(BGS);

export function bgSvg(id: string, w: number, h: number): string {
  const fn = BGS[id] ?? BGS.bg_meadow;
  const body = fn(w, h, new Rng(id.length * 977 + 13));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${scopeIds(body, id)}</svg>`;
}

/** Dominant colors used before the bitmap is ready and for UI accents. */
export const BG_BASE: Record<string, number> = {
  bg_meadow: 0x7fd0ff, bg_sakura: 0xb8d8ff, bg_tropics: 0x5fccff, bg_autumn: 0xffc890, bg_winter: 0xb8dcff,
  bg_reef: 0x1a7ac0, bg_candy: 0xffcbe6, bg_sunset: 0xc04a8a, bg_aurora: 0x0a1a3a, bg_space: 0x0c0a26,
};
