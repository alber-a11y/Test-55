import { shade } from '../color';
import { boxes, bricksPatch, cat, cobweb, cracks, curtains, dustSheet, floor, flower, ladder, paintBucket, plant, vase, windowView, type CurtainStyle, type ItemArt } from './common';

/* ================= shared interior pieces ================= */

export interface WallStyle {
  c: string;
  pattern: 'stripes' | 'dots' | 'damask' | 'roses' | 'tiles' | 'plain';
  ink: string;
}

export function wall(st: WallStyle | null, wainscot: string): string {
  const H = 660;
  if (!st) {
    return `<rect width="1600" height="${H}" fill="#cfc2ad"/>
      <path d="M0 0 H1600 V40 H0Z" fill="#e6dccb"/>
      <ellipse cx="900" cy="140" rx="160" ry="60" fill="#b4a68e" opacity=".5"/>
      <ellipse cx="1150" cy="460" rx="120" ry="80" fill="#b4a68e" opacity=".45"/>
      ${bricksPatch(60, 120, 230, 220, '#cfc2ad')}${cracks(560, 60, 1.3)}${cracks(1050, 300, 1)}
      <path d="M380 0 l40 120 l-30 60 M1180 0 l-20 90" stroke="#9c8f78" stroke-width="5" fill="none"/>
      <rect x="0" y="${H - 30}" width="1600" height="30" fill="#a89a82"/>`;
  }
  let pat = '';
  if (st.pattern === 'stripes') for (let x = 0; x < 1600; x += 80) pat += `<rect x="${x}" y="40" width="34" height="${H - 40}" fill="${st.ink}" opacity=".18"/>`;
  if (st.pattern === 'dots') for (let y = 70; y < H - 60; y += 60) for (let x = (y / 60) % 2 ? 30 : 0; x < 1600; x += 60) pat += `<circle cx="${x}" cy="${y}" r="6" fill="${st.ink}" opacity=".3"/>`;
  if (st.pattern === 'damask')
    for (let y = 80; y < H - 60; y += 110)
      for (let x = (y / 110) % 2 ? 60 : 0; x < 1600; x += 120)
        pat += `<path d="M${x} ${y - 34} C${x + 20} ${y - 20} ${x + 26} ${y} ${x} ${y + 34} C${x - 26} ${y} ${x - 20} ${y - 20} ${x} ${y - 34}Z M${x - 30} ${y} q30 -14 60 0" fill="${st.ink}" stroke="${st.ink}" stroke-width="2" opacity=".35"/>`;
  if (st.pattern === 'tiles')
    for (let y = 40; y < H; y += 44)
      for (let x = ((y - 40) / 44) % 2 ? -40 : 0; x < 1600; x += 80) pat += `<rect x="${x + 2}" y="${y + 2}" width="76" height="40" rx="5" fill="${st.ink}" opacity=".22"/>`;
  if (st.pattern === 'roses') for (let y = 90; y < H - 60; y += 100) for (let x = (y / 100) % 2 ? 50 : 0; x < 1600; x += 100) pat += `<g opacity=".45">${flower(x, y, 12, st.ink, '#fff6d6')}</g>`;
  return `<rect width="1600" height="${H}" fill="${st.c}"/>${pat}
    <rect width="1600" height="40" fill="#fbf6ec"/><rect y="36" width="1600" height="10" fill="${shade(st.c, -0.12)}"/>
    <rect y="${H - 150}" width="1600" height="150" fill="${wainscot}"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="${20 + i * 135}" y="${H - 130}" width="110" height="100" rx="4" fill="none" stroke="${shade(wainscot, -0.12)}" stroke-width="4"/>`).join('')}
    <rect y="${H - 156}" width="1600" height="12" fill="${shade(wainscot, 0.1)}" stroke="${shade(wainscot, -0.15)}" stroke-width="2"/>
    <rect y="${H - 20}" width="1600" height="20" fill="${shade(wainscot, -0.18)}"/>`;
}

const CURTAINS: CurtainStyle[][] = [
  [
    { c: '#e55a5a', trim: '#ffffff', pattern: 'dots' },
    { c: '#f6e7cf', trim: '#e0cfae', pattern: 'none' },
    { c: '#7bc47f', trim: '#ffffff', pattern: 'stripes' },
    { c: '#f2c94c', trim: '#ffffff', pattern: 'dots', tassel: '#e88f6a' },
  ],
  [
    { c: '#efe4d0', trim: '#d8c6a4', pattern: 'none' },
    { c: '#f3a6b8', trim: '#ffffff', pattern: 'dots' },
    { c: '#3aa6a0', trim: '#e7fbf8', pattern: 'stripes' },
    { c: '#8c2340', trim: '#f2c94c', pattern: 'none', tassel: '#f2c94c' },
  ],
  [
    { c: '#f4ead8', trim: '#e0cfae', pattern: 'none' },
    { c: '#f7b8c8', trim: '#ffffff', pattern: 'dots' },
    { c: '#30477a', trim: '#f4d26b', pattern: 'stripes' },
    { c: '#f8e8f0', trim: '#e6b7cf', pattern: 'none', tassel: '#e6b7cf' },
  ],
];

export function curtainsItem(set: number): ItemArt {
  return { box: [1150, 60, 460, 600], draw: (v) => curtains(1250, 110, 260, 460, v < 0 ? null : CURTAINS[set][v]) };
}

function rugItem(cx: number, cy: number, rx: number, ry: number, styles: { a: string; b: string; c: string; kind: 'oriental' | 'stripes' | 'round' | 'silk' | 'fluffy' | 'woven' | 'stars' }[]): ItemArt {
  return {
    box: [cx - rx - 20, cy - ry - 20, rx * 2 + 40, ry * 2 + 40],
    draw: (v) => {
      if (v < 0) return `<ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.9}" ry="${ry * 0.8}" fill="#fff" opacity=".1"/><path d="M${cx - 200} ${cy - 10} l80 -12 l20 18 l-80 14Z" fill="#5a3a20" opacity=".45"/>`;
      const s = styles[v];
      const round = s.kind === 'round' || s.kind === 'fluffy' || s.kind === 'stars';
      const shape = (k: number, fill: string, extra = '') =>
        round
          ? `<ellipse cx="${cx}" cy="${cy}" rx="${rx - k}" ry="${ry - k * (ry / rx)}" fill="${fill}" ${extra}/>`
          : `<rect x="${cx - rx + k}" y="${cy - ry + k * (ry / rx)}" width="${(rx - k) * 2}" height="${(ry - k * (ry / rx)) * 2}" rx="${10}" fill="${fill}" ${extra}/>`;
      let o = shape(0, s.a, `stroke="${shade(s.a, -0.3)}" stroke-width="4"`) + shape(24, s.b) + shape(50, s.a);
      if (s.kind === 'oriental' || s.kind === 'silk') {
        for (let k = 0; k < 7; k++) o += `<path d="M${cx - rx + 90 + k * ((rx * 2 - 180) / 6)} ${cy} l20 -20 l20 20 l-20 20Z" fill="${s.c}" opacity=".9"/>`;
        o += `<ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.25}" ry="${ry * 0.4}" fill="${s.c}" opacity=".5"/>`;
        if (s.kind === 'silk') o += shape(4, 'none', `stroke="#ffe08a" stroke-width="5"`);
        for (let k = 0; k < 18; k++) o += `<path d="M${cx - rx + 10 + k * ((rx * 2 - 20) / 17)} ${cy + ry} v14 M${cx - rx + 10 + k * ((rx * 2 - 20) / 17)} ${cy - ry} v-14" stroke="${s.b}" stroke-width="4"/>`;
      }
      if (s.kind === 'stripes' || s.kind === 'woven') for (let k = -4; k <= 4; k++) o += `<rect x="${cx + k * (rx / 5) - 12}" y="${cy - ry + 10}" width="24" height="${ry * 2 - 20}" fill="${k % 2 ? s.c : s.b}" opacity=".8"/>`;
      if (s.kind === 'round') for (let k = 1; k < 4; k++) o += `<ellipse cx="${cx}" cy="${cy}" rx="${rx * (k / 4)}" ry="${ry * (k / 4)}" fill="none" stroke="${s.c}" stroke-width="8"/>`;
      if (s.kind === 'fluffy') for (let k = 0; k < 40; k++) o += `<circle cx="${cx + Math.cos(k) * rx * 0.95}" cy="${cy + Math.sin(k) * ry * 0.95}" r="14" fill="${s.a}"/>`;
      if (s.kind === 'stars') for (let k = 0; k < 9; k++) o += `<path d="M${cx - rx * 0.7 + k * rx * 0.18} ${cy - 20 + (k % 2) * 40} l6 14 l14 2 l-10 10 l3 15 l-13 -7 l-13 7 l3 -15 l-10 -10 l14 -2Z" fill="${s.c}"/>`;
      return o;
    },
  };
}

function frameArt(x: number, y: number, w: number, h: number, v: number, gold: boolean): string {
  const fc = gold ? '#e9b334' : '#a8703f';
  const scenes = [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#bfe6ff"/><path d="M${x} ${y + h * 0.65} Q${x + w * 0.3} ${y + h * 0.4} ${x + w * 0.6} ${y + h * 0.6} T${x + w} ${y + h * 0.55} V${y + h} H${x}Z" fill="#7cbf6a"/><path d="M${x} ${y + h * 0.8} Q${x + w * 0.5} ${y + h * 0.65} ${x + w} ${y + h * 0.8} V${y + h} H${x}Z" fill="#f2c94c"/><circle cx="${x + w * 0.78}" cy="${y + h * 0.25}" r="${h * 0.1}" fill="#fff4b0"/>`,
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffd7a8"/><rect x="${x}" y="${y + h * 0.55}" width="${w}" height="${h * 0.45}" fill="#4aa3d8"/><circle cx="${x + w * 0.5}" cy="${y + h * 0.55}" r="${h * 0.18}" fill="#ff9f43"/><path d="M${x + w * 0.2} ${y + h * 0.75} q20 -10 40 0 M${x + w * 0.55} ${y + h * 0.85} q20 -10 40 0" stroke="#fff" stroke-width="4" fill="none"/>`,
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff3e0"/>${flower(x + w * 0.35, y + h * 0.4, h * 0.12, '#ff8fa3')}${flower(x + w * 0.62, y + h * 0.35, h * 0.14, '#b892e8')}${flower(x + w * 0.5, y + h * 0.62, h * 0.12, '#ffd23f', '#ff9f43')}`,
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2f3a66"/><circle cx="${x + w * 0.5}" cy="${y + h * 0.42}" r="${h * 0.22}" fill="#f6cfae"/><path d="M${x + w * 0.2} ${y + h} C${x + w * 0.25} ${y + h * 0.7} ${x + w * 0.75} ${y + h * 0.7} ${x + w * 0.8} ${y + h}Z" fill="#8c2340"/><path d="M${x + w * 0.3} ${y + h * 0.35} C${x + w * 0.3} ${y + h * 0.1} ${x + w * 0.7} ${y + h * 0.1} ${x + w * 0.7} ${y + h * 0.35}" fill="#5a3a20"/>`,
  ];
  return `<rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="4" fill="${fc}" stroke="${shade(fc, -0.35)}" stroke-width="3"/>
    <rect x="${x - 5}" y="${y - 5}" width="${w + 10}" height="${h + 10}" fill="${shade(fc, 0.3)}"/>${scenes[v % 4]}`;
}

/* ================= living room ================= */

const LIV_WALLS: WallStyle[] = [
  { c: '#a9c3a3', pattern: 'stripes', ink: '#ffffff' },
  { c: '#f5cdb0', pattern: 'dots', ink: '#ffffff' },
  { c: '#a9cbe6', pattern: 'stripes', ink: '#ffffff' },
  { c: '#2f6f73', pattern: 'damask', ink: '#f2c94c' },
];

const SOFA_ST = [
  { c: '#f1e3cf', pillows: ['#ffd166', '#f4978e', '#ffffff'] },
  { c: '#3f68c9', pillows: ['#ffffff', '#ffd166', '#cfe0ff'] },
  { c: '#6fae4f', pillows: ['#fff3c4', '#ffffff', '#f4978e'] },
  { c: '#7b2a5b', pillows: ['#f2c94c', '#ffb3c6', '#f2c94c'] },
];

const sofa: ItemArt = {
  box: [520, 400, 560, 300],
  draw: (v) => {
    const x = 560;
    const y = 470;
    if (v < 0) return dustSheet(x - 10, y - 10, 500, 210) + `<rect x="${x + 20}" y="${y + 196}" width="22" height="24" fill="#5a3a20"/><rect x="${x + 440}" y="${y + 196}" width="22" height="24" fill="#5a3a20"/>`;
    const s = SOFA_ST[v];
    const d = shade(s.c, -0.25);
    const tufts = v === 3 ? Array.from({ length: 8 }, (_, i) => `<circle cx="${x + 80 + i * 46}" cy="${y + 50}" r="4" fill="${shade(s.c, -0.35)}"/>`).join('') : '';
    return `<g>
      <ellipse cx="${x + 240}" cy="${y + 215}" rx="270" ry="18" fill="#000" opacity=".15"/>
      <rect x="${x + 30}" y="${y}" width="420" height="120" rx="34" fill="${s.c}" stroke="${d}" stroke-width="4"/>
      ${tufts}
      <rect x="${x + 40}" y="${y + 104}" width="200" height="66" rx="18" fill="${shade(s.c, 0.06)}" stroke="${d}" stroke-width="4"/>
      <rect x="${x + 240}" y="${y + 104}" width="200" height="66" rx="18" fill="${shade(s.c, 0.06)}" stroke="${d}" stroke-width="4"/>
      <rect x="${x}" y="${y + 70}" width="70" height="130" rx="30" fill="${s.c}" stroke="${d}" stroke-width="4"/>
      <rect x="${x + 410}" y="${y + 70}" width="70" height="130" rx="30" fill="${s.c}" stroke="${d}" stroke-width="4"/>
      <rect x="${x + 50}" y="${y + 160}" width="380" height="40" rx="10" fill="${shade(s.c, -0.08)}" stroke="${d}" stroke-width="4"/>
      <rect x="${x + 26}" y="${y + 196}" width="20" height="26" rx="4" fill="#7b4f26"/><rect x="${x + 434}" y="${y + 196}" width="20" height="26" rx="4" fill="#7b4f26"/>
      <rect x="${x + 70}" y="${y + 40}" width="88" height="76" rx="20" fill="${s.pillows[0]}" stroke="${shade(s.pillows[0], -0.3)}" stroke-width="3" transform="rotate(-10 ${x + 114} ${y + 78})"/>
      <rect x="${x + 160}" y="${y + 44}" width="80" height="70" rx="20" fill="${s.pillows[1]}" stroke="${shade(s.pillows[1], -0.3)}" stroke-width="3" transform="rotate(6 ${x + 200} ${y + 80})"/>
      <rect x="${x + 320}" y="${y + 40}" width="88" height="76" rx="20" fill="${s.pillows[2]}" stroke="${shade(s.pillows[2], -0.3)}" stroke-width="3" transform="rotate(10 ${x + 364} ${y + 78})"/>
      <path d="M${x + 360} ${y + 30} C${x + 390} ${y + 90} ${x + 420} ${y + 140} ${x + 400} ${y + 200} L${x + 450} ${y + 200} C${x + 460} ${y + 140} ${x + 440} ${y + 70} ${x + 410} ${y + 30}Z" fill="${v === 1 ? '#ffd166' : '#f4978e'}" opacity=".9"/>
    </g>`;
  },
};

const TABLE_ST = [
  { top: '#a0632e', leg: '#7b4f26' },
  { top: '#f4f1ea', leg: '#c9c2b4' },
  { top: '#bfe6f5', leg: '#9aa7b3' },
  { top: '#f2efe8', leg: '#c9a23a' },
];

const table: ItemArt = {
  box: [990, 590, 300, 260],
  draw: (v) => {
    const x = 1130;
    const y = 760;
    if (v < 0)
      return `<g transform="rotate(8 ${x} ${y})"><ellipse cx="${x}" cy="${y - 40}" rx="120" ry="30" fill="#8a7d6a" stroke="#5e584f" stroke-width="4"/><rect x="${x - 90}" y="${y - 34}" width="14" height="80" fill="#5e584f"/><rect x="${x + 70}" y="${y - 34}" width="14" height="40" fill="#5e584f"/></g>`;
    const s = TABLE_ST[v];
    return `<g>
      <ellipse cx="${x}" cy="${y + 54}" rx="130" ry="16" fill="#000" opacity=".15"/>
      <path d="M${x - 80} ${y - 30} L${x - 100} ${y + 50} M${x + 80} ${y - 30} L${x + 100} ${y + 50} M${x} ${y - 20} L${x} ${y + 50}" stroke="${s.leg}" stroke-width="14" stroke-linecap="round"/>
      <ellipse cx="${x}" cy="${y - 30}" rx="130" ry="34" fill="${shade(s.top, -0.15)}" stroke="${shade(s.top, -0.35)}" stroke-width="3" opacity="${v === 2 ? 0.75 : 1}"/>
      <ellipse cx="${x}" cy="${y - 38}" rx="130" ry="32" fill="${s.top}" stroke="${shade(s.top, -0.35)}" stroke-width="3" opacity="${v === 2 ? 0.75 : 1}"/>
      ${v === 3 ? `<path d="M${x - 90} ${y - 44} q40 -10 70 6 t80 -4" stroke="#d8d2c6" stroke-width="3" fill="none"/>` : ''}
      <rect x="${x + 30}" y="${y - 60}" width="70" height="14" rx="3" fill="#5ec7ff"/><rect x="${x + 34}" y="${y - 72}" width="62" height="12" rx="3" fill="#ffd166"/>
      ${vase(x - 40, y - 46, v === 1 ? '#5ec7ff' : '#ff8fa3')}
    </g>`;
  },
};

const LAMP_ST = [
  { shade: '#fff1c9', pole: '#b07a45' },
  { shade: '#fdf6e3', pole: '#d4a23a' },
  { shade: '#e8c48c', pole: '#8a5a2b' },
  { shade: '#4fb3a3', pole: '#3f3a36' },
];

function floorLamp(x: number, y: number, v: number): string {
  if (v < 0)
    return `<g transform="rotate(12 ${x} ${y + 300})"><rect x="${x - 5}" y="${y}" width="10" height="300" fill="#777"/><path d="M${x - 60} ${y + 20} L${x + 40} ${y - 10} L${x + 50} ${y + 50} L${x - 50} ${y + 70}Z" fill="#c9c0b0" stroke="#7a7266" stroke-width="3"/><path d="M${x - 20} ${y + 30} l20 30" stroke="#7a7266" stroke-width="3"/></g>`;
  const s = LAMP_ST[v];
  const tiffany = v === 3 ? `<path d="M${x - 40} ${y + 10} L${x - 20} ${y - 40} M${x} ${y + 14} L${x} ${y - 44} M${x + 40} ${y + 10} L${x + 20} ${y - 40}" stroke="#ffd23f" stroke-width="4"/><circle cx="${x - 30}" cy="${y - 10}" r="7" fill="#e8405a"/><circle cx="${x + 30}" cy="${y - 10}" r="7" fill="#ffd23f"/>` : '';
  const rattan = v === 2 ? Array.from({ length: 6 }, (_, i) => `<path d="M${x - 60 + i * 22} ${y + 20} L${x - 36 + i * 14} ${y - 46}" stroke="#a8763c" stroke-width="3"/>`).join('') : '';
  return `<g>
    <ellipse cx="${x}" cy="${y - 10}" rx="160" ry="140" fill="#fff3c4" opacity=".28"/>
    <rect x="${x - 5}" y="${y}" width="10" height="300" rx="4" fill="${s.pole}"/>
    <ellipse cx="${x}" cy="${y + 300}" rx="46" ry="12" fill="${shade(s.pole, -0.2)}"/>
    <path d="M${x - 70} ${y + 24} L${x - 40} ${y - 50} L${x + 40} ${y - 50} L${x + 70} ${y + 24} Z" fill="${s.shade}" stroke="${shade(s.shade, -0.3)}" stroke-width="3"/>
    ${rattan}${tiffany}
    <ellipse cx="${x}" cy="${y + 24}" rx="70" ry="10" fill="#fff8d6" opacity=".9"/>
  </g>`;
}

const SHELF_ST = ['#a8703f', '#f4f1ea', '#5a3a2a', '#8c5a2b'];

function bookshelf(x: number, y: number, w: number, h: number, v: number): string {
  if (v < 0)
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#8a7d6a" stroke="#5e584f" stroke-width="4"/>
      <rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="${h - 28}" fill="#6b6255"/>
      <rect x="${x + 10}" y="${y + h * 0.33}" width="${w - 20}" height="12" fill="#8a7d6a" transform="rotate(-6 ${x + w / 2} ${y + h * 0.33})"/>
      <rect x="${x + 10}" y="${y + h * 0.66}" width="${w - 20}" height="12" fill="#8a7d6a"/>${cobweb(x + 14, y + 14, 1)}
      <rect x="${x + 30}" y="${y + h * 0.66 - 40}" width="16" height="40" fill="#9c8f78" transform="rotate(20 ${x + 38} ${y + h * 0.66})"/></g>`;
  const c = SHELF_ST[v];
  const d = shade(c, -0.35);
  let books = '';
  const cols = ['#e05a47', '#4f7fd6', '#f2c94c', '#3f9b6b', '#9b72cf', '#f4978e', '#5ec7ff'];
  for (let s = 0; s < 3; s++) {
    const sy = y + 20 + s * ((h - 40) / 3) + (h - 40) / 3 - 14;
    let bx = x + 22;
    let k = s * 3;
    while (bx < x + w - 50) {
      const bw = 16 + ((k * 7) % 12);
      const bh = 60 + ((k * 13) % 30);
      if (k % 7 === 3) {
        books += plant(bx + 30, sy, 0.45, '#ffffff');
        bx += 64;
      } else {
        books += `<rect x="${bx}" y="${sy - bh}" width="${bw}" height="${bh}" rx="2" fill="${cols[k % cols.length]}" stroke="${shade(cols[k % cols.length], -0.35)}" stroke-width="2"/>`;
        bx += bw + 3;
      }
      k++;
    }
    books += `<rect x="${x + 14}" y="${sy}" width="${w - 28}" height="14" fill="${c}" stroke="${d}" stroke-width="3"/>`;
  }
  const crown = v === 3 ? `<path d="M${x - 10} ${y} Q${x + w / 2} ${y - 50} ${x + w + 10} ${y}" fill="${c}" stroke="#d4a23a" stroke-width="4"/>` : '';
  return `<g>${crown}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${c}" stroke="${d}" stroke-width="4"/>
    <rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="${h - 28}" fill="${shade(c, -0.25)}"/>${books}
    ${v === 3 ? `<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="4" fill="none" stroke="#d4a23a" stroke-width="3"/>` : ''}</g>`;
}

const livingItems: Record<string, ItemArt> = {
  walls: { box: [0, 0, 1600, 660], draw: (v) => wall(v < 0 ? null : LIV_WALLS[v], v === 3 ? '#f4ead8' : '#f6efe2') },
  sofa,
  rug: rugItem(760, 860, 330, 90, [
    { a: '#3d5a99', b: '#f4ead8', c: '#e05a47', kind: 'oriental' },
    { a: '#f4ead8', b: '#e88f6a', c: '#5ec7ff', kind: 'stripes' },
    { a: '#9ccf8a', b: '#f4ead8', c: '#ffd166', kind: 'round' },
    { a: '#8c2340', b: '#f2c94c', c: '#fff3c4', kind: 'silk' },
  ]),
  table,
  lamp: { box: [990, 230, 200, 400], draw: (v) => floorLamp(1090, 330, v) },
  curtains: curtainsItem(1),
  art: {
    box: [560, 120, 460, 270],
    draw: (v) => {
      if (v < 0) return `<rect x="700" y="180" width="170" height="130" fill="none" stroke="#8a7d6a" stroke-width="10" transform="rotate(-8 785 245)"/><circle cx="620" cy="220" r="5" fill="#5e584f"/><circle cx="960" cy="230" r="5" fill="#5e584f"/>`;
      return frameArt(690, 170, 200, 140, v, v === 3) + frameArt(590, 190, 60, 90, (v + 1) % 4, v === 3) + frameArt(930, 190, 60, 90, (v + 2) % 4, v === 3);
    },
  },
  shelf: { box: [160, 170, 300, 500], draw: (v) => bookshelf(180, 190, 260, 460, v) },
};

const livingBonus: Record<string, ItemArt> = {
  livingCat: { box: [400, 700, 240, 180], draw: () => `<ellipse cx="520" cy="850" rx="100" ry="30" fill="#e88f6a" stroke="#a8553a" stroke-width="3"/>${cat(530, 840, '#9aa3ad', 0.9)}` },
  aquarium: {
    box: [1400, 560, 200, 300],
    draw: () => `<g><rect x="1420" y="720" width="150" height="130" fill="#8a5a2b" stroke="#5a3a20" stroke-width="3"/>
      <rect x="1410" y="600" width="170" height="120" rx="8" fill="#8fdcff" stroke="#3f7f9a" stroke-width="4" opacity=".9"/>
      <rect x="1410" y="690" width="170" height="30" fill="#e8c48c"/><path d="M1440 690 q6 -40 -4 -70 M1550 690 q-8 -30 4 -60" stroke="#3f9b4a" stroke-width="6" fill="none"/>
      <path d="M1480 650 q20 -16 40 0 q-20 16 -40 0Z M1520 650 l14 -10 v20Z" fill="#ff9f43"/><circle cx="1470" cy="620" r="5" fill="#fff" opacity=".7"/></g>`,
  },
  guitar: {
    box: [60, 480, 200, 330],
    draw: () => `<g transform="rotate(-14 150 680)"><rect x="140" y="480" width="20" height="160" fill="#7b4f26"/><rect x="132" y="470" width="36" height="30" rx="6" fill="#5a3a20"/>
      <ellipse cx="150" cy="690" rx="64" ry="56" fill="#e0953a" stroke="#8a5a2b" stroke-width="4"/><ellipse cx="150" cy="620" rx="48" ry="42" fill="#e0953a" stroke="#8a5a2b" stroke-width="4"/>
      <circle cx="150" cy="650" r="18" fill="#3b2a20"/><rect x="120" y="710" width="60" height="10" rx="3" fill="#3b2a20"/></g>`,
  },
};

function livingBack(stage: number, wallVariant: number | undefined): string {
  return livingItems.walls.draw(wallVariant ?? -1) + windowView(1250, 110, 260, 460, stage < 1) + floor(660, '#b9794a', stage < 3);
}

function livingRuins(stage: number): string {
  let o = '';
  if (stage < 1) o += boxes(60, 960) + paintBucket(420, 980, '#a9c3a3');
  if (stage < 2) o += ladder(470, 300, 400, 6) + paintBucket(1320, 960, '#f5cdb0') + cobweb(0, 0, 1.5);
  if (stage < 3) o += `<rect x="1380" y="900" width="120" height="16" fill="#c98f55" stroke="#7b4f26" stroke-width="2" transform="rotate(-10 1440 910)"/>`;
  return o;
}

/* ================= bedroom ================= */

const BED_WALLS: WallStyle[] = [
  { c: '#c8b6e2', pattern: 'dots', ink: '#ffffff' },
  { c: '#f6e7cf', pattern: 'stripes', ink: '#e8c48c' },
  { c: '#b7e0cf', pattern: 'stripes', ink: '#ffffff' },
  { c: '#f7d6e0', pattern: 'roses', ink: '#e86a8a' },
];

const BED_ST = [
  { frame: '#e8c9a8', blanket: '#f4978e', sheet: '#fff6ee', pillow: '#ffd6dc' },
  { frame: '#d9e6f2', blanket: '#5b8def', sheet: '#ffffff', pillow: '#cfe0ff' },
  { frame: '#f4f1ea', blanket: '#f4f1ea', sheet: '#ffffff', pillow: '#ffe6a0' },
  { frame: '#f2c6d6', blanket: '#d46a9a', sheet: '#fff0f6', pillow: '#ffffff' },
];

const bed: ItemArt = {
  box: [470, 330, 660, 400],
  draw: (v) => {
    const x = 500;
    const y = 380;
    if (v < 0)
      return `<g><rect x="${x + 20}" y="${y + 40}" width="560" height="60" rx="10" fill="#9c8f78" stroke="#5e584f" stroke-width="4" transform="rotate(-3 ${x + 300} ${y + 70})"/>
        <rect x="${x}" y="${y + 160}" width="600" height="100" rx="12" fill="#b1a790" stroke="#5e584f" stroke-width="4"/>
        <path d="M${x + 60} ${y + 160} q100 -40 200 0 q80 -30 180 10" fill="#ccc4b2" stroke="#8a8374" stroke-width="3"/>
        <rect x="${x + 10}" y="${y + 260}" width="24" height="40" fill="#5e584f"/><rect x="${x + 560}" y="${y + 260}" width="24" height="30" fill="#5e584f" transform="rotate(10 ${x + 572} ${y + 260})"/></g>`;
    const s = BED_ST[v];
    const d = shade(s.frame, -0.3);
    const head = v === 3 ? `M${x + 20} ${y + 200} V${y + 40} Q${x + 300} ${y - 80} ${x + 580} ${y + 40} V${y + 200}Z` : `M${x + 20} ${y + 200} V${y + 50} Q${x + 20} ${y} ${x + 80} ${y} H${x + 520} Q${x + 580} ${y} ${x + 580} ${y + 50} V${y + 200}Z`;
    const buttons = Array.from({ length: 10 }, (_, i) => `<circle cx="${x + 80 + (i % 5) * 110}" cy="${y + 50 + Math.floor(i / 5) * 50}" r="5" fill="${d}"/>`).join('');
    return `<g>
      <ellipse cx="${x + 300}" cy="${y + 320}" rx="330" ry="20" fill="#000" opacity=".15"/>
      <path d="${head}" fill="${s.frame}" stroke="${d}" stroke-width="4"/>${buttons}
      <rect x="${x + 60}" y="${y + 120}" width="200" height="70" rx="30" fill="${s.pillow}" stroke="${shade(s.pillow, -0.25)}" stroke-width="3"/>
      <rect x="${x + 340}" y="${y + 120}" width="200" height="70" rx="30" fill="${s.pillow}" stroke="${shade(s.pillow, -0.25)}" stroke-width="3"/>
      <rect x="${x}" y="${y + 170}" width="600" height="110" rx="20" fill="${s.sheet}" stroke="${shade(s.sheet, -0.2)}" stroke-width="3"/>
      <path d="M${x + 40} ${y + 190} H${x + 560} Q${x + 620} ${y + 200} ${x + 610} ${y + 300} H${x - 10} Q${x - 20} ${y + 200} ${x + 40} ${y + 190}Z" fill="${s.blanket}" stroke="${shade(s.blanket, -0.25)}" stroke-width="3"/>
      ${Array.from({ length: 8 }, (_, i) => `<path d="M${x + 60 + i * 70} ${y + 200} v90" stroke="${shade(s.blanket, 0.2)}" stroke-width="6" opacity=".6"/>`).join('')}
      <rect x="${x - 20}" y="${y + 280}" width="640" height="24" rx="8" fill="${s.frame}" stroke="${d}" stroke-width="4"/>
      <rect x="${x}" y="${y + 300}" width="24" height="30" rx="4" fill="${d}"/><rect x="${x + 576}" y="${y + 300}" width="24" height="30" rx="4" fill="${d}"/>
      ${v === 3 ? `<path d="M${x + 20} ${y + 40} Q${x + 300} ${y - 80} ${x + 580} ${y + 40}" stroke="#ffd23f" stroke-width="5" fill="none"/>` : ''}
    </g>`;
  },
};

function nightstand(v: number): string {
  const x = 1150;
  const y = 700;
  const top = `<rect x="${x - 70}" y="${y - 120}" width="140" height="120" rx="8" fill="#c89462" stroke="#7b4f26" stroke-width="4"/><rect x="${x - 56}" y="${y - 96}" width="112" height="36" rx="4" fill="#d9a879" stroke="#7b4f26" stroke-width="2"/><circle cx="${x}" cy="${y - 78}" r="5" fill="#7b4f26"/>`;
  if (v < 0) return top + `<g transform="rotate(30 ${x} ${y - 120})"><rect x="${x - 6}" y="${y - 210}" width="12" height="90" fill="#888"/><path d="M${x - 40} ${y - 210} l80 0 l-20 -50 l-40 0Z" fill="#bdb5a6" stroke="#7a7266" stroke-width="3"/></g>`;
  const shades = [
    `<path d="M${x - 46} ${y - 200} L${x - 30} ${y - 260} H${x + 30} L${x + 46} ${y - 200}Z" fill="#fff1c9" stroke="#c9a56a" stroke-width="3"/>`,
    `<circle cx="${x}" cy="${y - 232}" r="40" fill="#fff6d6" stroke="#d9c79a" stroke-width="3"/>`,
    `<path d="M${x - 40} ${y - 210} Q${x - 50} ${y - 270} ${x - 20} ${y - 260} L${x} ${y - 275} L${x + 20} ${y - 260} Q${x + 50} ${y - 270} ${x + 40} ${y - 210}Z" fill="#ffc2d1" stroke="#d46a9a" stroke-width="3"/>`,
    `<path d="M${x - 50} ${y - 200} L${x - 34} ${y - 262} H${x + 34} L${x + 50} ${y - 200}Z" fill="#fff0f6" stroke="#e6b7cf" stroke-width="3"/>${Array.from({ length: 7 }, (_, i) => `<circle cx="${x - 48 + i * 16}" cy="${y - 198}" r="6" fill="#fff" stroke="#e6b7cf" stroke-width="2"/>`).join('')}`,
  ];
  return `<ellipse cx="${x}" cy="${y - 230}" rx="120" ry="100" fill="#fff3c4" opacity=".3"/>${top}
    <rect x="${x - 6}" y="${y - 210}" width="12" height="90" fill="#d4a23a"/><ellipse cx="${x}" cy="${y - 122}" rx="30" ry="8" fill="#d4a23a"/>${shades[v]}`;
}

const WARD_ST = ['#c89462', '#f4f1ea', '#a8d8c4', '#8c5a2b'];

function wardrobe(v: number): string {
  const x = 150;
  const y = 180;
  const w = 290;
  const h = 480;
  if (v < 0)
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#8a7d6a" stroke="#5e584f" stroke-width="4"/>
      <rect x="${x + 16}" y="${y + 20}" width="${w / 2 - 22}" height="${h - 60}" fill="#7a6e5c"/><rect x="${x + w / 2 + 6}" y="${y + 20}" width="${w / 2 - 22}" height="${h - 60}" fill="#6b6255" transform="rotate(4 ${x + w / 2} ${y})"/>${cobweb(x, y, 1)}</g>`;
  const c = WARD_ST[v];
  const d = shade(c, -0.35);
  const carve = v === 3 ? `<path d="M${x - 10} ${y} Q${x + w / 2} ${y - 60} ${x + w + 10} ${y}" fill="${c}" stroke="#d4a23a" stroke-width="4"/>` : '';
  return `<g>${carve}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${c}" stroke="${d}" stroke-width="4"/>
    <rect x="${x + 16}" y="${y + 20}" width="${w / 2 - 22}" height="${h - 70}" rx="6" fill="${shade(c, 0.08)}" stroke="${d}" stroke-width="3"/>
    <rect x="${x + w / 2 + 6}" y="${y + 20}" width="${w / 2 - 22}" height="${h - 70}" rx="6" fill="${shade(c, 0.08)}" stroke="${d}" stroke-width="3"/>
    <rect x="${x + 34}" y="${y + 50}" width="${w / 2 - 58}" height="${h - 140}" rx="4" fill="none" stroke="${shade(c, -0.15)}" stroke-width="3"/>
    <rect x="${x + w / 2 + 24}" y="${y + 50}" width="${w / 2 - 58}" height="${h - 140}" rx="4" fill="none" stroke="${shade(c, -0.15)}" stroke-width="3"/>
    <circle cx="${x + w / 2 - 14}" cy="${y + h / 2}" r="8" fill="#d4a23a"/><circle cx="${x + w / 2 + 14}" cy="${y + h / 2}" r="8" fill="#d4a23a"/>
    <rect x="${x + 10}" y="${y + h - 40}" width="${w - 20}" height="30" rx="4" fill="${shade(c, -0.1)}" stroke="${d}" stroke-width="3"/>
    ${plant(x + w - 60, y, 0.5, '#e86a8a')}</g>`;
}

function chandelier(v: number): string {
  const x = 800;
  const y = 40;
  if (v < 0) return `<path d="M${x} 0 V${y + 40}" stroke="#555" stroke-width="4"/><circle cx="${x}" cy="${y + 50}" r="14" fill="#d8d2c6" stroke="#777" stroke-width="3"/>`;
  const glow = `<ellipse cx="${x}" cy="${y + 110}" rx="180" ry="90" fill="#fff3c4" opacity=".3"/>`;
  const cord = `<path d="M${x} 0 V${y + 50}" stroke="#8a5a2b" stroke-width="4"/>`;
  const forms = [
    `<path d="M${x - 40} ${y + 50} H${x + 40} L${x + 30} ${y + 130} H${x - 30}Z" fill="#fff1c9" stroke="#8a5a2b" stroke-width="4"/><path d="M${x - 40} ${y + 90} H${x + 40}" stroke="#8a5a2b" stroke-width="3"/>`,
    `<path d="M${x - 80} ${y + 120} Q${x} ${y + 20} ${x + 80} ${y + 120}Z" fill="#fdf6e3" stroke="#c9a56a" stroke-width="4"/>`,
    Array.from({ length: 5 }, (_, i) => `<ellipse cx="${x}" cy="${y + 80}" rx="22" ry="50" fill="#ffc2d1" stroke="#d46a9a" stroke-width="3" transform="rotate(${-60 + i * 30} ${x} ${y + 50})"/>`).join(''),
    `<ellipse cx="${x}" cy="${y + 70}" rx="90" ry="22" fill="none" stroke="#d4a23a" stroke-width="5"/>` +
      Array.from({ length: 9 }, (_, i) => `<path d="M${x - 80 + i * 20} ${y + 72} v${30 + (i % 3) * 14}" stroke="#dff4ff" stroke-width="3"/><circle cx="${x - 80 + i * 20}" cy="${y + 104 + (i % 3) * 14}" r="6" fill="#e8f6ff" stroke="#9fc9e0" stroke-width="2"/>`).join(''),
  ];
  return glow + cord + forms[v];
}

const bedroomItems: Record<string, ItemArt> = {
  walls: { box: [0, 0, 1600, 660], draw: (v) => wall(v < 0 ? null : BED_WALLS[v], '#fbf3e6') },
  bed,
  rug: rugItem(800, 900, 300, 70, [
    { a: '#f6e7f0', b: '#ffffff', c: '#f4b6c8', kind: 'fluffy' },
    { a: '#e8c48c', b: '#f4ead8', c: '#c98f55', kind: 'woven' },
    { a: '#5b8def', b: '#f4ead8', c: '#ffd166', kind: 'oriental' },
    { a: '#2f3a66', b: '#5b6bb0', c: '#ffe08a', kind: 'stars' },
  ]),
  lamp: { box: [1060, 420, 180, 290], draw: nightstand },
  curtains: curtainsItem(2),
  wardrobe: { box: [130, 120, 330, 560], draw: wardrobe },
  painting: { box: [640, 140, 320, 220], draw: (v) => (v < 0 ? `<circle cx="800" cy="200" r="6" fill="#5e584f"/><path d="M790 200 l-60 40 M810 200 l60 40" stroke="#8a7d6a" stroke-width="3"/>` : frameArt(700, 170, 200, 150, [2, 0, 1, 3][v], v === 3)) },
  chandelier: { box: [680, 0, 240, 200], draw: chandelier },
};

const bedroomBonus: Record<string, ItemArt> = {
  teddy: {
    box: [560, 460, 160, 160],
    draw: () => `<g transform="translate(640 560)"><circle cx="-30" cy="-58" r="14" fill="#b07a45" stroke="#6e4522" stroke-width="3"/><circle cx="30" cy="-58" r="14" fill="#b07a45" stroke="#6e4522" stroke-width="3"/>
      <ellipse cx="0" cy="10" rx="40" ry="34" fill="#c98f55" stroke="#6e4522" stroke-width="3"/><circle cx="0" cy="-36" r="32" fill="#c98f55" stroke="#6e4522" stroke-width="3"/>
      <ellipse cx="0" cy="-26" rx="14" ry="10" fill="#f1d3b0"/><circle cx="0" cy="-30" r="4" fill="#3b2a20"/><circle cx="-12" cy="-42" r="3.5" fill="#3b2a20"/><circle cx="12" cy="-42" r="3.5" fill="#3b2a20"/>
      <path d="M-14 -6 q14 10 28 0" stroke="#e86a8a" stroke-width="6" fill="none"/></g>`,
  },
  puppy: {
    box: [1140, 760, 240, 160],
    draw: () => `<g><ellipse cx="1260" cy="880" rx="110" ry="36" fill="#5b8def" stroke="#2d5bb8" stroke-width="4"/><ellipse cx="1260" cy="870" rx="86" ry="22" fill="#cfe0ff"/>
      <g transform="translate(1250 860)"><ellipse cx="0" cy="-10" rx="50" ry="26" fill="#f4e2c4" stroke="#a8763c" stroke-width="3"/><circle cx="-36" cy="-30" r="24" fill="#f4e2c4" stroke="#a8763c" stroke-width="3"/>
      <ellipse cx="-54" cy="-26" rx="10" ry="18" fill="#a8763c"/><ellipse cx="-20" cy="-28" rx="9" ry="16" fill="#a8763c"/><path d="M-44 -32 q4 -4 8 0 M-32 -32 q4 -4 8 0" stroke="#3b2a20" stroke-width="3" fill="none"/><circle cx="-38" cy="-20" r="4" fill="#3b2a20"/></g></g>`,
  },
  plant: { box: [420, 600, 200, 200], draw: () => plant(520, 790, 1.3, '#f2f2f2') },
};

function bedroomBack(stage: number, wallVariant: number | undefined): string {
  return bedroomItems.walls.draw(wallVariant ?? -1) + windowView(1250, 110, 260, 460, stage < 1) + floor(660, '#c48a5a', stage < 3);
}

function bedroomRuins(stage: number): string {
  let o = '';
  if (stage < 1) o += boxes(1340, 990) + dustSheet(20, 760, 300, 160);
  if (stage < 2) o += ladder(1000, 280, 420, -6) + paintBucket(460, 980, '#c8b6e2');
  if (stage < 3) o += cobweb(0, 0, 1.4);
  return o;
}

export const LIVING = { items: livingItems, bonus: livingBonus, back: livingBack, ruins: livingRuins };
export const BEDROOM = { items: bedroomItems, bonus: bedroomBonus, back: bedroomBack, ruins: bedroomRuins };
