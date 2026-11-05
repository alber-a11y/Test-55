import { shade } from '../color';
import { bricksPatch, bush, cat, cracks, flower, type ItemArt } from './common';

/* ---------- items (variant −1 = broken / not done) ---------- */

const PATH_ST = [
  { c: '#c9c3b8', d: '#8f887c', kind: 'cobble' },
  { c: '#c9714f', d: '#8d4630', kind: 'brick' },
  { c: '#e7d3a8', d: '#a98d57', kind: 'tile' },
  { c: '#f4f1ea', d: '#c9a23a', kind: 'marble' },
];

const pathCurve = 'M640 1000 C700 900 820 860 880 780 C930 710 1000 640 1060 560 L1140 560 C1100 650 1040 720 1000 790 C950 880 960 940 980 1000 Z';

const path: ItemArt = {
  box: [600, 540, 560, 460],
  draw: (v) => {
    if (v < 0) {
      let stones = '';
      [[720, 930], [800, 870], [880, 800], [960, 720], [1040, 630], [900, 940], [760, 980]].forEach(([x, y], i) => (stones += `<ellipse cx="${x}" cy="${y}" rx="${26 - (i % 3) * 4}" ry="12" fill="#a59f94" stroke="#6f6a61" stroke-width="2" transform="rotate(${i * 23} ${x} ${y})"/>`));
      return `<path d="${pathCurve}" fill="#9b7a55" opacity=".85"/><path d="M700 960 q30 -20 70 -10 M860 830 q40 -10 60 10" stroke="#6e5236" stroke-width="5" fill="none"/>${stones}`;
    }
    const st = PATH_ST[v];
    let tiles = '';
    for (let k = 0; k < 13; k++) {
      const t = k / 12;
      const x = 680 + (1100 - 680) * Math.pow(t, 0.9) + Math.sin(t * 3) * 30;
      const y = 990 - 440 * t;
      const w = 120 - 60 * t;
      if (st.kind === 'cobble') {
        tiles += `<ellipse cx="${x + 30}" cy="${y}" rx="${w * 0.32}" ry="${12 - t * 5}" fill="${shade(st.c, (k % 3) * 0.05)}" stroke="${st.d}" stroke-width="2"/><ellipse cx="${x + 30 - w * 0.35}" cy="${y + 8}" rx="${w * 0.2}" ry="${9 - t * 4}" fill="${shade(st.c, 0.1)}" stroke="${st.d}" stroke-width="2"/><ellipse cx="${x + 30 + w * 0.35}" cy="${y + 6}" rx="${w * 0.2}" ry="${9 - t * 4}" fill="${shade(st.c, -0.05)}" stroke="${st.d}" stroke-width="2"/>`;
      } else if (st.kind === 'brick') {
        tiles += `<rect x="${x + 30 - w / 2}" y="${y - 10}" width="${w / 2 - 3}" height="${20 - t * 8}" rx="3" fill="${shade(st.c, (k % 2) * 0.08)}" stroke="${st.d}" stroke-width="2"/><rect x="${x + 33}" y="${y - 10}" width="${w / 2 - 3}" height="${20 - t * 8}" rx="3" fill="${shade(st.c, ((k + 1) % 2) * 0.08)}" stroke="${st.d}" stroke-width="2"/>`;
      } else {
        tiles += `<rect x="${x + 30 - w / 2}" y="${y - 12}" width="${w}" height="${24 - t * 10}" rx="${st.kind === 'tile' ? 8 : 4}" fill="${shade(st.c, (k % 2) * 0.04)}" stroke="${st.d}" stroke-width="${st.kind === 'marble' ? 3 : 2}"/>`;
        if (st.kind === 'marble') tiles += `<path d="M${x + 10} ${y - 4} q20 -6 40 4" stroke="#d8d2c6" stroke-width="2" fill="none"/>`;
      }
    }
    return `<path d="${pathCurve}" fill="${shade(st.c, -0.2)}" opacity=".5"/>${tiles}`;
  },
};

const BENCH_ST = [
  { wood: '#c98a4b', frame: '#6b4423', cushion: '' },
  { wood: '#f4f1ea', frame: '#c9c2b4', cushion: '#8fc1e8' },
  { wood: '#b77a43', frame: '#2f5a3f', cushion: '' },
  { wood: '#f1d9a0', frame: '#c9a23a', cushion: '#8e5bd8' },
];

const bench: ItemArt = {
  box: [1110, 470, 330, 250],
  draw: (v) => {
    const x = 1130;
    const y = 520;
    if (v < 0) {
      return `<g transform="rotate(-4 ${x + 140} ${y + 100})">
        <rect x="${x}" y="${y + 90}" width="280" height="22" rx="4" fill="#9c9488" stroke="#5e584f" stroke-width="3"/>
        <rect x="${x + 10}" y="${y + 20}" width="120" height="18" rx="4" fill="#a59d90" stroke="#5e584f" stroke-width="3" transform="rotate(-10 ${x + 60} ${y + 30})"/>
        <rect x="${x + 150}" y="${y + 40}" width="120" height="18" rx="4" fill="#958d81" stroke="#5e584f" stroke-width="3"/>
        <rect x="${x + 20}" y="${y + 110}" width="16" height="70" fill="#6e665b"/><rect x="${x + 240}" y="${y + 112}" width="16" height="48" fill="#6e665b" transform="rotate(14 ${x + 248} ${y + 112})"/>
        <path d="M${x + 60} ${y + 92} l30 -6 M${x + 180} ${y + 95} l20 6" stroke="#5e584f" stroke-width="3"/></g>`;
    }
    const st = BENCH_ST[v];
    let slats = '';
    for (let k = 0; k < 3; k++) slats += `<rect x="${x + 12}" y="${y + k * 26}" width="256" height="18" rx="5" fill="${shade(st.wood, k * 0.04)}" stroke="${shade(st.wood, -0.35)}" stroke-width="3"/>`;
    const frameDeco = v === 2 || v === 3 ? `<path d="M${x + 4} ${y + 150} q20 -40 0 -80 M${x + 276} ${y + 150} q-20 -40 0 -80" stroke="${st.frame}" stroke-width="7" fill="none"/>` : '';
    const cushion = st.cushion
      ? `<rect x="${x + 20}" y="${y + 96}" width="240" height="20" rx="10" fill="${st.cushion}" stroke="${shade(st.cushion, -0.3)}" stroke-width="3"/>
         <rect x="${x + 40}" y="${y + 40}" width="60" height="54" rx="14" fill="${v === 3 ? '#ffd23f' : '#fff'}" stroke="${shade(st.cushion, -0.3)}" stroke-width="3" transform="rotate(-8 ${x + 70} ${y + 67})"/>`
      : `<rect x="${x + 180}" y="${y + 42}" width="56" height="50" rx="14" fill="#ffd166" stroke="#c48a1c" stroke-width="3" transform="rotate(8 ${x + 208} ${y + 67})"/>`;
    return `<g>
      <rect x="${x + 6}" y="${y - 8}" width="14" height="190" rx="5" fill="${st.frame}"/><rect x="${x + 260}" y="${y - 8}" width="14" height="190" rx="5" fill="${st.frame}"/>
      ${slats}
      <rect x="${x}" y="${y + 104}" width="280" height="22" rx="5" fill="${st.wood}" stroke="${shade(st.wood, -0.35)}" stroke-width="3"/>
      <rect x="${x - 10}" y="${y + 70}" width="22" height="70" rx="6" fill="${st.frame}"/><rect x="${x + 268}" y="${y + 70}" width="22" height="70" rx="6" fill="${st.frame}"/>
      ${frameDeco}${cushion}
      ${v === 3 ? `<circle cx="${x + 13}" cy="${y - 12}" r="9" fill="#ffd23f" stroke="#a8761a" stroke-width="2"/><circle cx="${x + 267}" cy="${y - 12}" r="9" fill="#ffd23f" stroke="#a8761a" stroke-width="2"/>` : ''}
    </g>`;
  },
};

const FLOWER_ST = [
  ['#e8405a', '#ff8fa3', '#c9184a'],
  ['#9b72cf', '#b892e8', '#7a52b0'],
  ['#ffffff', '#fff6d6', '#f4f4f4'],
  ['#e8405a', '#ffd23f', '#5ec7ff', '#b892e8', '#ff9f43'],
];

function bed(cx: number, cy: number, w: number, v: number): string {
  const soil = `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${w / 6}" fill="#7a5233" stroke="#4e3420" stroke-width="3"/>`;
  const stones = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI;
    return `<ellipse cx="${cx + Math.cos(a) * (w / 2)}" cy="${cy + Math.sin(a) * (w / 6)}" rx="20" ry="11" fill="#d6cfc2" stroke="#8f887c" stroke-width="2"/>`;
  }).join('');
  if (v < 0) {
    let dry = '';
    for (let i = 0; i < 7; i++) dry += `<path d="M${cx - w / 2 + 30 + i * (w - 60) / 6} ${cy} q${(i % 2 ? 8 : -8)} -30 ${i % 3 ? 14 : -10} -50" stroke="#8b6b3f" stroke-width="4" fill="none"/>`;
    return soil + dry + stones;
  }
  const cols = FLOWER_ST[v];
  let f = '';
  for (let i = 0; i < 16; i++) {
    const fx = cx - w / 2 + 34 + ((i * 53) % (w - 60));
    const fy = cy - 20 - ((i * 37) % 50);
    f += `<path d="M${fx} ${fy + 40} V${fy}" stroke="#3f8a3f" stroke-width="4"/>`;
    if (v === 1) {
      for (let k = 0; k < 5; k++) f += `<ellipse cx="${fx + (k % 2 ? 3 : -3)}" cy="${fy - k * 8}" rx="5" ry="7" fill="${cols[k % 3]}"/>`;
    } else f += flower(fx, fy, v === 2 ? 15 : 17, cols[i % cols.length], v === 2 ? '#ffd23f' : shade(cols[i % cols.length], -0.3));
  }
  return soil + bush(cx - w * 0.25, cy - 20, 34, '#58a64c') + bush(cx + w * 0.25, cy - 16, 30, '#4f9d4c') + f + stones;
}

const flowers: ItemArt = {
  box: [120, 640, 420, 260],
  draw: (v) => bed(330, 840, 380, v) + bed(1480, 900, 260, v),
};

const FOUNTAIN_ST = [
  { c: '#cfc8bc', d: '#8f887c' },
  { c: '#f6f3ee', d: '#b3ab9e' },
  { c: '#6fb3a3', d: '#3e7d6f' },
  { c: '#f2c94c', d: '#a8761a' },
];

const fountain: ItemArt = {
  box: [980, 250, 290, 310],
  draw: (v) => {
    const x = 1120;
    const y = 540;
    const st = v < 0 ? { c: '#b3ab9e', d: '#6f6a61' } : FOUNTAIN_ST[v];
    const water =
      v < 0
        ? `<path d="M${x - 90} ${y - 78} l20 14 l-6 14" stroke="${st.d}" stroke-width="4" fill="none"/><ellipse cx="${x - 40}" cy="${y - 92}" rx="30" ry="8" fill="#7d9b5a" opacity=".7"/>`
        : `<ellipse cx="${x}" cy="${y - 92}" rx="112" ry="20" fill="#7fd3f5" opacity=".9"/>
           <path d="M${x} ${y - 236} C${x - 40} ${y - 220} ${x - 60} ${y - 180} ${x - 70} ${y - 140} M${x} ${y - 236} C${x + 40} ${y - 220} ${x + 60} ${y - 180} ${x + 70} ${y - 140}" stroke="#a6e6ff" stroke-width="8" fill="none" opacity=".9"/>
           <path d="M${x} ${y - 250} V${y - 210}" stroke="#d6f5ff" stroke-width="10" stroke-linecap="round"/>
           <path d="M${x - 66} ${y - 140} C${x - 80} ${y - 120} ${x - 90} ${y - 110} ${x - 96} ${y - 96} M${x + 66} ${y - 140} C${x + 80} ${y - 120} ${x + 90} ${y - 110} ${x + 96} ${y - 96}" stroke="#a6e6ff" stroke-width="6" fill="none" opacity=".8"/>`;
    return `<g>
      <ellipse cx="${x}" cy="${y}" rx="140" ry="26" fill="#000" opacity=".12"/>
      <path d="M${x - 130} ${y - 90} L${x + 130} ${y - 90} L${x + 112} ${y - 10} Q${x} ${y + 14} ${x - 112} ${y - 10} Z" fill="${st.c}" stroke="${st.d}" stroke-width="4"/>
      <ellipse cx="${x}" cy="${y - 90}" rx="130" ry="24" fill="${shade(st.c, 0.1)}" stroke="${st.d}" stroke-width="4"/>
      ${water}
      <rect x="${x - 16}" y="${y - 200}" width="32" height="110" rx="8" fill="${st.c}" stroke="${st.d}" stroke-width="4"/>
      <path d="M${x - 70} ${y - 152} L${x + 70} ${y - 152} L${x + 50} ${y - 128} Q${x} ${y - 116} ${x - 50} ${y - 128} Z" fill="${st.c}" stroke="${st.d}" stroke-width="4"/>
      <ellipse cx="${x}" cy="${y - 152}" rx="70" ry="13" fill="${v < 0 ? shade(st.c, 0.05) : '#8adcf7'}" stroke="${st.d}" stroke-width="4"/>
      <circle cx="${x}" cy="${y - 214}" r="16" fill="${st.c}" stroke="${st.d}" stroke-width="4"/>
      ${v < 0 ? cracks(x + 40, y - 80, 0.7, st.d) + `<path d="M${x + 20} ${y - 200} l18 -20" stroke="${st.d}" stroke-width="5"/>` : ''}
      ${v === 3 ? `<path d="M${x - 120} ${y - 60} Q${x} ${y - 30} ${x + 120} ${y - 60}" stroke="#fff3b0" stroke-width="5" fill="none"/>` : ''}
    </g>`;
  },
};

const LAMP_ST = [
  { post: '#2f3440', glass: '#fff2b0' },
  { post: '#9a6a3a', glass: '#ffe6a0' },
  { post: '#f1ede4', glass: '#fff6d0' },
  { post: '#c9d6e8', glass: '#e8f6ff' },
];

function lampPost(x: number, y: number, h: number, v: number): string {
  if (v < 0)
    return `<g transform="rotate(-9 ${x} ${y})"><rect x="${x - 7}" y="${y - h}" width="14" height="${h}" fill="#7a6a5a"/><path d="M${x - 24} ${y - h} h48 l-8 -40 h-32 Z" fill="#9a9a9a" stroke="#555" stroke-width="3"/><path d="M${x - 10} ${y - h - 30} l14 20" stroke="#555" stroke-width="3"/></g>`;
  const st = LAMP_ST[v];
  return `<g>
    <ellipse cx="${x}" cy="${y - h - 24}" rx="70" ry="60" fill="${st.glass}" opacity=".35"/>
    <rect x="${x - 7}" y="${y - h}" width="14" height="${h}" rx="4" fill="${st.post}" stroke="${shade(st.post, -0.4)}" stroke-width="2"/>
    <rect x="${x - 18}" y="${y - 16}" width="36" height="16" rx="4" fill="${st.post}" stroke="${shade(st.post, -0.4)}" stroke-width="2"/>
    <path d="M${x - 26} ${y - h} h52 l-8 -48 h-36 Z" fill="${st.glass}" stroke="${shade(st.post, -0.3)}" stroke-width="4"/>
    <path d="M${x - 32} ${y - h - 48} h64 l-32 -26 Z" fill="${st.post}" stroke="${shade(st.post, -0.4)}" stroke-width="3" stroke-linejoin="round"/>
    ${v === 3 ? `<path d="M${x - 18} ${y - h - 8} l36 -32 M${x + 18} ${y - h - 8} l-36 -32" stroke="#ffffff" stroke-width="2" opacity=".8"/>` : ''}
  </g>`;
}

const lamps: ItemArt = {
  box: [880, 360, 160, 230],
  draw: (v) => lampPost(960, 590, 140, v) + lampPost(620, 560, 120, v),
};

const ARCH_ST = [
  { frame: '#f2ede4', bloom: ['#ff8fa3', '#e8405a'] },
  { frame: '#ffffff', bloom: ['#ffffff', '#fff3c4'] },
  { frame: '#e9e2f2', bloom: ['#b892e8', '#9b72cf'] },
  { frame: '#f7e7a8', bloom: ['#ff8fd0', '#ffd23f', '#8fdcff'] },
];

const arch: ItemArt = {
  box: [400, 120, 260, 470],
  draw: (v) => {
    const x = 420;
    const y = 580;
    if (v < 0)
      return `<g><path d="M${x} ${y} V${y - 300} Q${x + 110} ${y - 430} ${x + 220} ${y - 300} V${y}" fill="none" stroke="#7a5a3a" stroke-width="12"/>
        <path d="M${x + 10} ${y - 100} q40 -60 10 -120 q-20 -40 30 -90 M${x + 210} ${y - 60} q-30 -60 0 -140" stroke="#8b6b3f" stroke-width="5" fill="none"/></g>`;
    const st = ARCH_ST[v];
    let blooms = '';
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      const a = Math.PI * (1 - t);
      const bx = t < 0.25 ? x + 6 : t > 0.75 ? x + 214 : x + 110 + Math.cos(a) * 110;
      const by = t < 0.25 ? y - 40 - t * 4 * 260 : t > 0.75 ? y - 40 - (1 - t) * 4 * 260 : y - 300 - Math.sin(a) * 130 + 0;
      blooms += `<circle cx="${bx + ((i * 17) % 20) - 10}" cy="${by}" r="18" fill="#4f9d4c"/>`;
      blooms += flower(bx + ((i * 23) % 24) - 12, by - 4, 12, st.bloom[i % st.bloom.length], '#fff2b0');
    }
    return `<g><path d="M${x} ${y} V${y - 300} Q${x + 110} ${y - 430} ${x + 220} ${y - 300} V${y}" fill="none" stroke="${st.frame}" stroke-width="14"/>
      <path d="M${x} ${y} V${y - 300} Q${x + 110} ${y - 430} ${x + 220} ${y - 300} V${y}" fill="none" stroke="${shade(st.frame, -0.25)}" stroke-width="3" stroke-dasharray="2 22"/>
      ${blooms}${v === 3 ? `<circle cx="${x + 110}" cy="${y - 380}" r="8" fill="#fff6c2"/><circle cx="${x + 40}" cy="${y - 300}" r="5" fill="#fff6c2"/>` : ''}</g>`;
  },
};

const FENCE_ST = ['lattice', 'picket', 'hedge', 'carved'] as const;

const fence: ItemArt = {
  box: [560, 250, 480, 240],
  draw: (v) => {
    const x0 = 580;
    const x1 = 1020;
    const top = 300;
    const bot = 480;
    if (v < 0) {
      let o = '';
      for (let x = x0; x < x1; x += 46) o += `<rect x="${x}" y="${top + 30 + ((x * 7) % 40)}" width="24" height="${bot - top - 30}" fill="#a89f90" stroke="#6f6a61" stroke-width="3" transform="rotate(${((x * 13) % 18) - 9} ${x + 12} ${bot})"/>`;
      return o + `<rect x="${x0}" y="${top + 70}" width="${x1 - x0}" height="14" fill="#958d81" transform="rotate(4 ${x0} ${top + 70})"/>`;
    }
    const kind = FENCE_ST[v];
    if (kind === 'hedge') {
      let o = '';
      for (let x = x0 + 30; x < x1; x += 70) o += bush(x, top + 90, 70, '#3f8f45');
      return `<rect x="${x0}" y="${top + 60}" width="${x1 - x0}" height="${bot - top - 60}" fill="#3f8f45"/>${o}`;
    }
    const c = kind === 'lattice' ? '#f3ead8' : kind === 'picket' ? '#ffffff' : '#c89462';
    const d = shade(c, -0.3);
    let o = `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${bot - top}" fill="#000" opacity="0"/>`;
    if (kind === 'lattice') {
      for (let k = -8; k < 14; k++) {
        o += `<path d="M${x0 + k * 40} ${bot} L${x0 + k * 40 + 180} ${top}" stroke="${c}" stroke-width="9"/>`;
        o += `<path d="M${x0 + k * 40} ${top} L${x0 + k * 40 + 180} ${bot}" stroke="${c}" stroke-width="9"/>`;
      }
      o = `<clipPath id="fenceClip"><rect x="${x0}" y="${top}" width="${x1 - x0}" height="${bot - top}"/></clipPath><g clip-path="url(#fenceClip)">${o}</g>`;
      o += `<rect x="${x0 - 10}" y="${top - 10}" width="${x1 - x0 + 20}" height="16" rx="4" fill="${c}" stroke="${d}" stroke-width="3"/>`;
    } else {
      for (let x = x0; x < x1; x += 40)
        o += `<path d="M${x} ${bot} V${top + 24} L${x + 13} ${top + (kind === 'carved' ? 2 : 8)} L${x + 26} ${top + 24} V${bot} Z" fill="${c}" stroke="${d}" stroke-width="3"/>${kind === 'carved' ? `<circle cx="${x + 13}" cy="${top + 50}" r="6" fill="${d}"/>` : ''}`;
      o += `<rect x="${x0 - 10}" y="${top + 70}" width="${x1 - x0 + 20}" height="14" rx="4" fill="${c}" stroke="${d}" stroke-width="3"/><rect x="${x0 - 10}" y="${bot - 50}" width="${x1 - x0 + 20}" height="14" rx="4" fill="${c}" stroke="${d}" stroke-width="3"/>`;
    }
    return o + `<rect x="${x0 - 20}" y="${top - 26}" width="24" height="${bot - top + 26}" rx="5" fill="${c}" stroke="${d}" stroke-width="3"/><rect x="${x1 - 4}" y="${top - 26}" width="24" height="${bot - top + 26}" rx="5" fill="${c}" stroke="${d}" stroke-width="3"/>`;
  },
};

const LIGHT_ST = [
  ['#ffe28a'],
  ['#ff6b6b', '#ffd23f', '#5ec7ff', '#7ee08a', '#ff8fd0'],
  ['#ff9f43', '#ff6b6b', '#ffd23f'],
  ['#fff6c2'],
];

const lights: ItemArt = {
  box: [1140, 60, 460, 220],
  draw: (v) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push([1160 + t * 440, 110 + Math.sin(t * Math.PI * 2) * 30 + t * 60]);
    }
    const wire = `<path d="M${pts.map((p) => p.join(' ')).join(' L')}" stroke="#4a3b2e" stroke-width="3" fill="none"/>`;
    if (v < 0) return `<path d="M1160 120 C1220 200 1260 80 1320 160 C1350 200 1300 230 1260 200 C1230 180 1290 140 1340 180" stroke="#3b3b3b" stroke-width="3" fill="none"/>`;
    const cols = LIGHT_ST[v];
    let bulbs = '';
    pts.forEach(([x, y], i) => {
      const c = cols[i % cols.length];
      bulbs += `<circle cx="${x}" cy="${y + 16}" r="22" fill="${c}" opacity=".3"/>`;
      if (v === 2) bulbs += `<rect x="${x - 13}" y="${y + 2}" width="26" height="30" rx="10" fill="${c}" stroke="${shade(c, -0.35)}" stroke-width="2"/><path d="M${x - 13} ${y + 17} h26" stroke="${shade(c, -0.3)}" stroke-width="2"/>`;
      else if (v === 3) bulbs += `<path d="M${x} ${y + 2} l4 10 l11 1 l-8 7 l3 11 l-10 -6 l-10 6 l3 -11 l-8 -7 l11 -1 Z" fill="${c}" stroke="#e7b417" stroke-width="2"/>`;
      else bulbs += `<ellipse cx="${x}" cy="${y + 16}" rx="8" ry="11" fill="${c}" stroke="${shade(c, -0.3)}" stroke-width="2"/><rect x="${x - 4}" y="${y + 2}" width="8" height="6" fill="#4a3b2e"/>`;
    });
    return wire + bulbs;
  },
};

export const GARDEN_ITEMS: Record<string, ItemArt> = { path, bench, flowers, fountain, lamps, arch, fence, lights };

/* ---------- bonus items ---------- */

export const GARDEN_BONUS: Record<string, ItemArt> = {
  gnome: {
    box: [580, 640, 120, 160],
    draw: () => `<g transform="translate(640 790)">
      <ellipse cx="0" cy="0" rx="44" ry="10" fill="#000" opacity=".15"/>
      <path d="M-34 0 C-36 -40 -24 -60 0 -60 C24 -60 36 -40 34 0 Z" fill="#3f6fd8" stroke="#22408a" stroke-width="3"/>
      <circle cx="0" cy="-72" r="20" fill="#f6cfae" stroke="#b9805a" stroke-width="2"/>
      <path d="M-22 -66 C-20 -40 20 -40 22 -66 C12 -54 -12 -54 -22 -66Z" fill="#ffffff" stroke="#c9c2b4" stroke-width="2"/>
      <path d="M-24 -82 C-20 -120 -2 -140 10 -150 C14 -124 22 -100 24 -82 Z" fill="#e63946" stroke="#9b1d27" stroke-width="3"/>
      <circle cx="-7" cy="-76" r="2.5" fill="#2b1d18"/><circle cx="7" cy="-76" r="2.5" fill="#2b1d18"/><circle cx="0" cy="-70" r="5" fill="#f28b82"/></g>`,
  },
  birdhouse: {
    box: [1400, 220, 140, 180],
    draw: () => `<g transform="translate(1470 330)">
      <rect x="-6" y="30" width="12" height="60" fill="#7b4f26"/>
      <rect x="-40" y="-30" width="80" height="70" rx="6" fill="#ffd166" stroke="#a8761a" stroke-width="3"/>
      <path d="M-52 -26 L0 -70 L52 -26 Z" fill="#e05a47" stroke="#8d2f22" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="0" cy="2" r="13" fill="#5a3a20"/><rect x="-14" y="20" width="28" height="5" rx="2" fill="#7b4f26"/>
      <g transform="translate(26 -78)"><ellipse rx="14" ry="11" fill="#5ec7ff"/><circle cx="8" cy="-6" r="7" fill="#5ec7ff"/><path d="M14 -6 l8 2 l-8 3z" fill="#ff9f43"/><circle cx="10" cy="-8" r="1.6" fill="#1d1d2b"/></g></g>`,
  },
  gardenCat: { box: [1060, 580, 200, 160], draw: () => cat(1160, 730, '#f0a050', 1) },
};

/* ---------- static scene ---------- */

/** Background layers that never change, by makeover stage (0 = ruined … 3 = finished). */
export function gardenBack(): string {
  let far = '';
  for (let x = -40; x < 1700; x += 150) far += bush(x, 300 + ((x * 7) % 50), 110, x % 300 ? '#7cbf6a' : '#6db35f');
  return `<rect width="1600" height="1000" fill="#bfe8ff"/>
    <rect width="1600" height="520" fill="#9fd6ff"/>
    <ellipse cx="300" cy="120" rx="120" ry="34" fill="#fff" opacity=".8"/><ellipse cx="380" cy="104" rx="80" ry="30" fill="#fff" opacity=".8"/>
    <ellipse cx="900" cy="90" rx="100" ry="26" fill="#fff" opacity=".7"/>
    ${far}
    <rect x="0" y="380" width="1600" height="140" fill="#4f9a4a"/>
    ${bush(1100, 400, 90, '#57a352')}${bush(1250, 420, 80, '#4f9a4a')}`;
}

export function gardenLawn(stage: number): string {
  let o = `<path d="M0 470 Q400 440 800 470 T1600 460 V1000 H0 Z" fill="#86c860"/>
    <path d="M0 620 Q500 590 900 630 T1600 600 V1000 H0 Z" fill="#7aba55"/>`;
  for (let i = 0; i < 40; i++) o += `<path d="M${(i * 137) % 1600} ${520 + ((i * 89) % 460)} l4 -14 l4 14" stroke="#5f9f42" stroke-width="3" fill="none"/>`;
  if (stage < 3) o += `<ellipse cx="500" cy="680" rx="120" ry="26" fill="#b9a464" opacity=".55"/><ellipse cx="1350" cy="900" rx="140" ry="30" fill="#b9a464" opacity=".5"/>`;
  return o;
}

export function gardenWall(stage: number): string {
  const base = stage >= 3 ? '#f1e6d6' : '#e2d4c0';
  let o = `<path d="M0 120 L300 150 L330 700 L0 720 Z" fill="${base}" stroke="#b7a68c" stroke-width="4"/>
    <path d="M0 120 L300 150 L304 176 L0 150 Z" fill="${shade(base, -0.1)}"/>`;
  if (stage < 3) o += bricksPatch(70, 320, 180, 150, base) + cracks(220, 200, 1.2) + cracks(40, 520, 0.9);
  if (stage >= 2) {
    let ivy = '';
    for (let i = 0; i < 18; i++) ivy += `<circle cx="${20 + ((i * 71) % 290)}" cy="${150 + ((i * 113) % 420)}" r="${16 + (i % 3) * 6}" fill="${i % 2 ? '#4f9d4c' : '#5fae55'}"/>`;
    o += ivy;
  } else {
    o += `<path d="M30 160 L60 340 L40 480" stroke="#8b6b3f" stroke-width="4" fill="none"/>`;
  }

  return o;
}

/** Tree with a canopy at the top right (string lights hang from it). */
export function gardenTree(): string {
  return `<path d="M1380 660 C1390 520 1370 380 1400 230 L1460 230 C1470 400 1460 520 1480 660 Z" fill="#8a5a33" stroke="#5a3a20" stroke-width="4"/>
    <path d="M1400 320 C1340 280 1300 260 1250 250" stroke="#8a5a33" stroke-width="22" fill="none" stroke-linecap="round"/>
    ${bush(1320, 90, 150, '#4f9d4c')}${bush(1520, 60, 170, '#57a352')}${bush(1200, 40, 110, '#5fae55')}`;
}

export function gardenRuins(stage: number): string {
  let o = '';
  if (stage < 1) {
    // Wheelbarrow with bricks and a tarp-covered pile.
    o += `<path d="M30 720 C40 640 120 600 200 620 C260 640 280 700 250 760 L30 760 Z" fill="#cbbf9f" stroke="#8a7d5c" stroke-width="3"/>
      <g transform="translate(160 840)"><path d="M-110 -70 L90 -70 L60 0 L-80 0 Z" fill="#7b8794" stroke="#3f4a55" stroke-width="4"/>
      <rect x="-90" y="-100" width="44" height="24" rx="3" fill="#c8714f" stroke="#8d4630" stroke-width="2"/><rect x="-40" y="-104" width="44" height="24" rx="3" fill="#b85f42" stroke="#8d4630" stroke-width="2"/><rect x="10" y="-98" width="44" height="24" rx="3" fill="#d27f5c" stroke="#8d4630" stroke-width="2"/>
      <circle cx="-60" cy="20" r="24" fill="#2f3440" stroke="#111" stroke-width="3"/><circle cx="-60" cy="20" r="8" fill="#ffd23f"/>
      <path d="M90 -70 L150 -40 M60 0 L140 -10" stroke="#3f4a55" stroke-width="6"/></g>`;
  }
  if (stage < 2) {
    o += `<g transform="rotate(14 330 700)"><rect x="290" y="300" width="12" height="400" fill="#d9a066" stroke="#7b4f26" stroke-width="3"/><rect x="350" y="300" width="12" height="400" fill="#d9a066" stroke="#7b4f26" stroke-width="3"/>${[340, 400, 460, 520, 580, 640].map((y) => `<rect x="296" y="${y}" width="60" height="9" rx="3" fill="#c98f55" stroke="#7b4f26" stroke-width="2"/>`).join('')}</g>`;
    o += `<rect x="430" y="900" width="44" height="22" rx="3" fill="#c8714f" stroke="#8d4630" stroke-width="2" transform="rotate(-12 450 910)"/><rect x="490" y="930" width="44" height="22" rx="3" fill="#b85f42" stroke="#8d4630" stroke-width="2" transform="rotate(20 510 940)"/>`;
    for (let i = 0; i < 6; i++) o += `<path d="M${560 + i * 160} ${940 - (i % 2) * 300} q-6 -30 6 -50 m-6 50 q14 -20 26 -26" stroke="#7b8a3a" stroke-width="4" fill="none"/>`;
  }
  return o;
}
