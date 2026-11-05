import { shade } from '../color';
import { boxes, bush, cat, cobweb, dustSheet, floor, flower, ladder, paintBucket, plant, vase, windowView, type ItemArt } from './common';
import { curtainsItem, wall, type WallStyle } from './interior';

/* ================= kitchen ================= */

const KIT_WALLS: WallStyle[] = [
  { c: '#cfe8dc', pattern: 'tiles', ink: '#ffffff' },
  { c: '#fbe3c8', pattern: 'tiles', ink: '#ffffff' },
  { c: '#d6e4f5', pattern: 'stripes', ink: '#ffffff' },
  { c: '#f4d6d6', pattern: 'roses', ink: '#e86a8a' },
];

const CAB = [
  { body: '#f4efe4', door: '#fffaf0', knob: '#c9a23a', top: '#d9cbb3' },
  { body: '#9cc7b4', door: '#b5d8c8', knob: '#f4efe4', top: '#efe6d6' },
  { body: '#a8703f', door: '#c08850', knob: '#f2c94c', top: '#f4efe4' },
  { body: '#2f4f6f', door: '#3d6489', knob: '#f2c94c', top: '#f7f3ea' },
];

function cabinets(v: number): string {
  if (v < 0)
    return `<g><rect x="320" y="470" width="580" height="190" fill="#8a7d6a" stroke="#5e584f" stroke-width="4"/>
      <rect x="340" y="490" width="120" height="150" fill="#6b6255" transform="rotate(-6 400 565)"/><rect x="620" y="490" width="120" height="150" fill="#7a6e5c"/>
      <rect x="320" y="130" width="300" height="160" fill="#8a7d6a" stroke="#5e584f" stroke-width="4" transform="rotate(3 470 210)"/>${cobweb(320, 130, 0.8)}
      <rect x="310" y="456" width="600" height="20" fill="#9c8f78"/></g>`;
  const c = CAB[v];
  const d = shade(c.body, -0.35);
  let o = '';
  // Upper cabinets with glass doors on the sides.
  for (let k = 0; k < 4; k++) {
    const x = 330 + k * 142;
    o += `<rect x="${x}" y="130" width="134" height="170" rx="6" fill="${c.door}" stroke="${d}" stroke-width="3"/>`;
    if (k === 0 || k === 3) o += `<rect x="${x + 16}" y="146" width="102" height="138" rx="4" fill="#dff1fb" stroke="${d}" stroke-width="2"/><path d="M${x + 30} 270 l30 -40" stroke="#fff" stroke-width="5" opacity=".7"/>`;
    else o += `<rect x="${x + 14}" y="144" width="106" height="142" rx="4" fill="none" stroke="${shade(c.door, -0.12)}" stroke-width="3"/>`;
    o += `<circle cx="${x + (k % 2 ? 18 : 116)}" cy="280" r="6" fill="${c.knob}"/>`;
  }
  // Base cabinets with a sink.
  o += `<rect x="320" y="476" width="580" height="184" fill="${c.body}" stroke="${d}" stroke-width="3"/>`;
  for (let k = 0; k < 4; k++) {
    const x = 332 + k * 142;
    o += `<rect x="${x}" y="496" width="130" height="150" rx="6" fill="${c.door}" stroke="${d}" stroke-width="3"/><rect x="${x + 50}" y="510" width="30" height="8" rx="4" fill="${c.knob}"/>`;
  }
  o += `<rect x="306" y="452" width="608" height="28" rx="6" fill="${c.top}" stroke="${shade(c.top, -0.3)}" stroke-width="3"/>
    <rect x="470" y="440" width="160" height="16" rx="6" fill="#c9d6e0" stroke="#7a8a99" stroke-width="2"/>
    <path d="M550 440 V400 Q550 384 566 384 H584" stroke="#9aa7b3" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  if (v === 3) o += `<path d="M330 130 H896" stroke="#f2c94c" stroke-width="5"/><path d="M320 476 H900" stroke="#f2c94c" stroke-width="5"/>`;
  return `<g>${o}${vase(420, 452, v === 1 ? '#ff8fa3' : '#ffd166')}</g>`;
}

const STOVE = [
  { body: '#e9e4dc', hood: '#d8d2c6', accent: '#3b3b3b' },
  { body: '#e05a47', hood: '#e9e4dc', accent: '#2f2f2f' },
  { body: '#9aa7b3', hood: '#c9d6e0', accent: '#2a2f36' },
  { body: '#2f3a66', hood: '#f2c94c', accent: '#f2c94c' },
];

function stove(v: number): string {
  if (v < 0)
    return `<g><rect x="920" y="476" width="200" height="184" fill="#7a7266" stroke="#4e4840" stroke-width="4"/><rect x="940" y="520" width="160" height="110" fill="#4e4840"/>
      <path d="M940 130 L1100 130 L1080 290 L960 290 Z" fill="#9c9488" stroke="#5e584f" stroke-width="3" transform="rotate(-5 1020 210)"/><path d="M960 470 l60 -20" stroke="#5e584f" stroke-width="4"/></g>`;
  const s = STOVE[v];
  const d = shade(s.body, -0.35);
  return `<g>
    <path d="M950 120 L1090 120 L1110 290 L930 290 Z" fill="${s.hood}" stroke="${shade(s.hood, -0.35)}" stroke-width="3"/>
    <rect x="990" y="40" width="60" height="84" fill="${s.hood}" stroke="${shade(s.hood, -0.35)}" stroke-width="3"/>
    <rect x="924" y="282" width="192" height="14" rx="5" fill="${shade(s.hood, -0.1)}"/>
    <rect x="920" y="470" width="200" height="190" rx="8" fill="${s.body}" stroke="${d}" stroke-width="3"/>
    <rect x="916" y="452" width="208" height="24" rx="6" fill="${shade(s.body, -0.1)}" stroke="${d}" stroke-width="3"/>
    ${[950, 1000, 1050, 1090].map((x) => `<circle cx="${x}" cy="492" r="9" fill="${s.accent}"/>`).join('')}
    <rect x="940" y="520" width="160" height="116" rx="8" fill="${shade(s.accent, 0.15)}" stroke="${d}" stroke-width="3"/>
    <rect x="952" y="532" width="136" height="70" rx="6" fill="#ffb35c" opacity=".55"/>
    <rect x="950" y="510" width="140" height="8" rx="4" fill="${s.accent}"/>
    <ellipse cx="985" cy="446" rx="34" ry="10" fill="#5a3a2a"/><rect x="955" y="418" width="60" height="30" rx="6" fill="#e05a47" stroke="#8d2f22" stroke-width="3"/>
  </g>`;
}

const FRIDGE = ['#f4f1ea', '#a9d8f0', '#f7b8c8', '#c9a23a'];

function fridge(v: number): string {
  if (v < 0)
    return `<g transform="rotate(-3 190 430)"><rect x="90" y="200" width="200" height="460" rx="14" fill="#a8a296" stroke="#6f6a61" stroke-width="4"/><path d="M90 380 H290" stroke="#6f6a61" stroke-width="4"/><rect x="100" y="220" width="40" height="18" fill="#c9c2b4"/></g>`;
  const c = FRIDGE[v];
  const d = shade(c, -0.35);
  return `<g><rect x="90" y="190" width="200" height="470" rx="26" fill="${c}" stroke="${d}" stroke-width="4"/>
    <path d="M92 370 H288" stroke="${d}" stroke-width="4"/>
    <rect x="256" y="230" width="12" height="100" rx="6" fill="${shade(c, -0.2)}"/><rect x="256" y="400" width="12" height="140" rx="6" fill="${shade(c, -0.2)}"/>
    <path d="M120 210 Q150 200 170 220" stroke="#fff" stroke-width="8" opacity=".6" fill="none" stroke-linecap="round"/>
    <circle cx="140" cy="430" r="14" fill="#ff6b6b"/><rect x="170" y="420" width="40" height="30" rx="4" fill="#fff" transform="rotate(8 190 435)"/><circle cx="130" cy="290" r="10" fill="#5ec7ff"/>
    ${v === 3 ? `<rect x="96" y="196" width="188" height="458" rx="22" fill="none" stroke="#fff3b0" stroke-width="4"/>` : ''}</g>`;
}

const TABLE_K = [
  { top: '#c98a4b', chair: '#a8703f', seat: '#f4978e' },
  { top: '#f4f1ea', chair: '#e9e2d6', seat: '#8fc1e8' },
  { top: '#8a5a33', chair: '#6b4423', seat: '#ffd166' },
  { top: '#f7f3ea', chair: '#c9a23a', seat: '#8e5bd8' },
];

function chair(x: number, y: number, c: { chair: string; seat: string }, flip: boolean): string {
  const d = shade(c.chair, -0.35);
  const s = flip ? -1 : 1;
  return `<g transform="translate(${x} ${y}) scale(${s} 1)">
    <rect x="-40" y="-150" width="16" height="190" rx="6" fill="${c.chair}" stroke="${d}" stroke-width="3"/>
    <rect x="-40" y="-150" width="70" height="16" rx="6" fill="${c.chair}" stroke="${d}" stroke-width="3"/>
    <rect x="-40" y="-120" width="70" height="12" rx="6" fill="${c.chair}" stroke="${d}" stroke-width="3"/>
    <rect x="-44" y="-40" width="92" height="20" rx="8" fill="${c.seat}" stroke="${shade(c.seat, -0.3)}" stroke-width="3"/>
    <rect x="34" y="-24" width="12" height="64" rx="5" fill="${c.chair}" stroke="${d}" stroke-width="2"/></g>`;
}

function kitchenTable(v: number): string {
  const x = 800;
  const y = 820;
  if (v < 0)
    return `<g transform="rotate(5 ${x} ${y})"><rect x="${x - 170}" y="${y - 80}" width="340" height="24" fill="#8a7d6a" stroke="#5e584f" stroke-width="4"/><rect x="${x - 150}" y="${y - 56}" width="16" height="110" fill="#5e584f"/><rect x="${x + 130}" y="${y - 56}" width="16" height="60" fill="#5e584f"/></g>`;
  const s = TABLE_K[v];
  const d = shade(s.top, -0.35);
  return `<g>${chair(x - 210, y + 40, s, false)}${chair(x + 210, y + 40, s, true)}
    <ellipse cx="${x}" cy="${y + 90}" rx="200" ry="18" fill="#000" opacity=".14"/>
    <rect x="${x - 150}" y="${y - 50}" width="18" height="140" rx="6" fill="${d}"/><rect x="${x + 132}" y="${y - 50}" width="18" height="140" rx="6" fill="${d}"/>
    <rect x="${x - 180}" y="${y - 82}" width="360" height="36" rx="12" fill="${s.top}" stroke="${d}" stroke-width="3"/>
    <path d="M${x - 150} ${y - 82} h300 v30 l-20 30 h-260 l-20 -30z" fill="${v === 1 ? '#8fc1e8' : '#ffffff'}" opacity=".55"/>
    <ellipse cx="${x - 40}" cy="${y - 90}" rx="56" ry="16" fill="#f4f1ea" stroke="#c9c2b4" stroke-width="3"/>
    <circle cx="${x - 60}" cy="${y - 104}" r="16" fill="#e8405a"/><circle cx="${x - 32}" cy="${y - 108}" r="15" fill="#ffd23f"/><circle cx="${x - 46}" cy="${y - 122}" r="13" fill="#7ed957"/>
  </g>`;
}

const PENDANT = [
  { shade: '#2f3440', glow: '#fff2b0' },
  { shade: '#f4f1ea', glow: '#fff6d6' },
  { shade: '#c98a4b', glow: '#ffe6a0' },
  { shade: '#c9d6e8', glow: '#e8f6ff' },
];

function pendants(v: number): string {
  const xs = [700, 900];
  if (v < 0) return xs.map((x) => `<path d="M${x} 0 V180" stroke="#555" stroke-width="3"/><circle cx="${x}" cy="186" r="9" fill="#d8d2c6" stroke="#777" stroke-width="2"/>`).join('');
  const s = PENDANT[v];
  return xs
    .map(
      (x) => `<ellipse cx="${x}" cy="420" rx="120" ry="90" fill="${s.glow}" opacity=".25"/><path d="M${x} 0 V360" stroke="#3b2a20" stroke-width="3"/>
      ${
        v === 3
          ? `<path d="M${x - 40} 400 L${x} 350 L${x + 40} 400 L${x} 430 Z" fill="${s.shade}" stroke="#7a8a99" stroke-width="3" opacity=".9"/><path d="M${x - 40} 400 H${x + 40} M${x} 350 V430" stroke="#fff" stroke-width="2"/>`
          : v === 2
            ? `<ellipse cx="${x}" cy="390" rx="46" ry="34" fill="${s.shade}" stroke="${shade(s.shade, -0.35)}" stroke-width="3"/>${[0, 1, 2].map((k) => `<path d="M${x - 44} ${380 + k * 10} H${x + 44}" stroke="${shade(s.shade, -0.25)}" stroke-width="2"/>`).join('')}`
            : `<path d="M${x - 50} 412 Q${x} 330 ${x + 50} 412 Z" fill="${s.shade}" stroke="${shade(s.shade, -0.35)}" stroke-width="3"/>`
      }
      <ellipse cx="${x}" cy="414" rx="18" ry="8" fill="${s.glow}"/>`,
    )
    .join('');
}

const SPICES = [
  { board: '#c98a4b', jar: ['#e05a47', '#ffd166', '#7ed957'] },
  { board: '#f4f1ea', jar: ['#8fc1e8', '#f4978e', '#ffd166'] },
  { board: '#6b4423', jar: ['#c98a4b', '#e8c48c', '#a8d8c4'] },
  { board: '#c9a23a', jar: ['#8e5bd8', '#ff8fd0', '#5ec7ff'] },
];

function spiceShelf(v: number): string {
  if (v < 0) return `<rect x="560" y="360" width="220" height="14" fill="#8a7d6a" transform="rotate(-10 670 367)"/><path d="M600 340 l30 30" stroke="#5e584f" stroke-width="3"/>`;
  const s = SPICES[v];
  let jars = '';
  for (let k = 0; k < 6; k++) {
    const x = 580 + k * 32;
    const c = s.jar[k % 3];
    jars += `<rect x="${x}" y="${320}" width="24" height="40" rx="5" fill="#eaf6fb" stroke="#7a8a99" stroke-width="2"/><rect x="${x + 2}" y="${334}" width="20" height="24" rx="3" fill="${c}"/><rect x="${x}" y="${314}" width="24" height="8" rx="3" fill="${shade(s.board, -0.2)}"/>`;
  }
  return `<g>${jars}<rect x="560" y="360" width="220" height="14" rx="4" fill="${s.board}" stroke="${shade(s.board, -0.35)}" stroke-width="3"/>
    <path d="M580 374 l-6 20 M760 374 l6 20" stroke="${shade(s.board, -0.35)}" stroke-width="5"/>
    ${plant(800, 360, 0.35, '#e86a8a')}</g>`;
}

const kitchenItems: Record<string, ItemArt> = {
  walls: { box: [0, 0, 1600, 660], draw: (v) => wall(v < 0 ? null : KIT_WALLS[v], '#f6efe2') },
  cabinets: { box: [300, 110, 630, 560], draw: cabinets },
  stove: { box: [900, 30, 240, 640], draw: stove },
  fridge: { box: [70, 170, 240, 500], draw: fridge },
  table: { box: [520, 600, 560, 340], draw: kitchenTable },
  curtains: curtainsItem(0),
  pendant: { box: [560, 0, 480, 480], draw: pendants },
  shelf: { box: [540, 290, 290, 110], draw: spiceShelf },
};

const kitchenBonus: Record<string, ItemArt> = {
  teapot: {
    box: [1140, 360, 120, 110],
    draw: () => `<g transform="translate(1200 450)"><ellipse cx="0" cy="-30" rx="40" ry="32" fill="#7ac3f0" stroke="#2d5bb8" stroke-width="3"/>
      <path d="M38 -40 q30 -10 30 -30" stroke="#2d5bb8" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M-38 -44 q-26 6 -20 30" stroke="#2d5bb8" stroke-width="7" fill="none"/>
      <ellipse cx="0" cy="-60" rx="20" ry="6" fill="#2d5bb8"/><circle cx="0" cy="-68" r="6" fill="#ffd23f"/>${flower(-6, -26, 9, '#fff')}</g>
      <rect x="1140" y="450" width="120" height="14" rx="4" fill="#c98a4b"/>`,
  },
  herbs: {
    box: [1250, 520, 270, 120],
    draw: () => [1300, 1380, 1460].map((x, i) => plant(x, 604, 0.45, ['#e05a47', '#ffd166', '#7ac3f0'][i])).join(''),
  },
  cake: {
    box: [820, 640, 160, 120],
    draw: () => `<g transform="translate(900 738)"><ellipse cx="0" cy="0" rx="60" ry="12" fill="#f4f1ea" stroke="#c9c2b4" stroke-width="3"/><rect x="-4" y="0" width="8" height="12" fill="#c9c2b4"/>
      <rect x="-44" y="-50" width="88" height="48" rx="10" fill="#ffd6dc" stroke="#d46a9a" stroke-width="3"/><path d="M-44 -38 q11 10 22 0 t22 0 t22 0 t22 0" stroke="#fff" stroke-width="6" fill="none"/>
      <circle cx="0" cy="-58" r="9" fill="#e8405a"/><path d="M0 -66 q4 -8 10 -8" stroke="#3f8a3f" stroke-width="3" fill="none"/></g>`,
  },
};

function kitchenBack(stage: number, wallVariant: number | undefined): string {
  return kitchenItems.walls.draw(wallVariant ?? -1) + windowView(1250, 110, 260, 460, stage < 1) + floor(660, '#d9b38c', stage < 3);
}

function kitchenRuins(stage: number): string {
  let o = '';
  if (stage < 1) o += boxes(1300, 990) + dustSheet(540, 700, 380, 180);
  if (stage < 2) o += ladder(1150, 260, 420, -8) + paintBucket(380, 960, '#cfe8dc');
  if (stage < 3) o += cobweb(0, 0, 1.3) + `<rect x="200" y="900" width="140" height="16" fill="#c98f55" stroke="#7b4f26" stroke-width="2" transform="rotate(8 270 908)"/>`;
  return o;
}

/* ================= veranda ================= */

const DECK = [
  { c: '#d9a066', d: '#a8703f' },
  { c: '#b5ada2', d: '#7f786e' },
  { c: '#f4efe4', d: '#c9c2b4' },
  { c: '#d8774a', d: '#9a4a2a' },
];

function deck(v: number): string {
  const st = v < 0 ? { c: '#9c8f78', d: '#6b6255' } : DECK[v];
  let o = `<rect x="0" y="640" width="1600" height="360" fill="${st.c}"/>`;
  if (v === 3) {
    for (let y = 640; y < 1000; y += 60) for (let x = ((y - 640) / 60) % 2 ? -60 : 0; x < 1600; x += 120) o += `<rect x="${x + 3}" y="${y + 3}" width="114" height="54" rx="6" fill="${shade(st.c, ((x + y) % 240) / 2400)}" stroke="${st.d}" stroke-width="3"/>`;
  } else {
    for (let k = 0; k < 9; k++) {
      const yy = 650 + k * 40 + k * k * 1.5;
      o += `<path d="M0 ${yy} H1600" stroke="${st.d}" stroke-width="3" opacity=".7"/>`;
      for (let s = (k % 3) * 190; s < 1600; s += 560) o += `<path d="M${s} ${yy} v${40 + k * 3}" stroke="${st.d}" stroke-width="3" opacity=".5"/>`;
    }
  }
  if (v < 0) o += `<path d="M300 820 l80 -10 l20 24 l-90 10Z M1100 900 l100 -14 l12 24 l-100 14Z" fill="#4e3420" opacity=".7"/>` + [200, 520, 980, 1340].map((x, i) => `<ellipse cx="${x}" cy="${760 + (i % 2) * 120}" rx="40" ry="12" fill="#c98a12" opacity=".6"/>`).join('');
  return o + `<rect x="0" y="640" width="1600" height="40" fill="#000" opacity=".08"/>`;
}

function verandaBack(): string {
  let far = '';
  for (let x = -40; x < 1700; x += 170) far += bush(x, 430 + ((x * 7) % 40), 120, x % 340 ? '#7cbf6a' : '#6db35f');
  return `<rect width="1600" height="1000" fill="#bfe8ff"/><rect width="1600" height="560" fill="#9fd6ff"/>
    <ellipse cx="420" cy="230" rx="110" ry="30" fill="#fff" opacity=".8"/><ellipse cx="1100" cy="200" rx="90" ry="26" fill="#fff" opacity=".7"/>
    ${far}<rect x="0" y="520" width="1600" height="130" fill="#86c860"/>
    ${[200, 600, 1000, 1400].map((x) => flower(x, 600, 14, '#ff8fb1')).join('')}`;
}

const ROOF = [
  { a: '#e05a47', b: '#fff6ee' },
  { a: '#3d8bfd', b: '#ffffff' },
  { a: '#7bc47f', b: '#fff6ee' },
  { a: '#8e5bd8', b: '#f2c94c' },
];

function awning(v: number): string {
  let o = `<rect x="0" y="0" width="1600" height="70" fill="#a8703f" stroke="#6b4423" stroke-width="4"/>`;
  for (let x = 40; x < 1600; x += 160) o += `<rect x="${x}" y="60" width="30" height="30" fill="#8a5a33"/>`;
  if (v < 0) return o + `<path d="M0 70 L300 70 L280 120 L200 96 L120 140 L40 104 L0 130Z M1200 70 L1600 70 L1600 110 L1500 96 L1420 130 L1320 100Z" fill="#a8a296" stroke="#6f6a61" stroke-width="3"/>`;
  const s = ROOF[v];
  let stripes = '';
  for (let k = 0; k < 20; k++) stripes += `<path d="M${k * 80} 70 h40 v60 q-20 18 -40 0z" fill="${k % 2 ? s.b : s.a}"/>`;
  for (let k = 0; k < 20; k++) stripes += `<path d="M${k * 80 + 40} 70 h40 v60 q-20 18 -40 0z" fill="${k % 2 ? s.a : s.b}"/>`;
  return o + stripes + `<path d="M0 70 H1600" stroke="${shade(s.a, -0.35)}" stroke-width="4"/>${v === 3 ? `<path d="M0 132 H1600" stroke="#f2c94c" stroke-width="4" stroke-dasharray="6 14"/>` : ''}`;
}

const RAIL = ['#ffffff', '#6b4423', '#2f3440', '#c98a4b'];

function railing(v: number): string {
  const posts = `<rect x="80" y="90" width="44" height="600" fill="#f4efe4" stroke="#b9a98c" stroke-width="3"/><rect x="1476" y="90" width="44" height="600" fill="#f4efe4" stroke="#b9a98c" stroke-width="3"/>`;
  if (v < 0) {
    let o = '';
    for (let x = 140; x < 1460; x += 60) if ((x / 60) % 4 !== 1) o += `<rect x="${x}" y="${560 + ((x * 3) % 30)}" width="14" height="${100 - ((x * 3) % 30)}" fill="#8a7d6a" transform="rotate(${((x * 7) % 14) - 7} ${x} 660)"/>`;
    return posts + o + `<rect x="120" y="550" width="700" height="16" fill="#8a7d6a" transform="rotate(3 120 550)"/>`;
  }
  const c = RAIL[v];
  const d = shade(c, -0.35);
  let o = '';
  for (let x = 150; x < 1460; x += 48) {
    if (v === 2) o += `<path d="M${x} 666 V580 q12 -14 0 -28" stroke="${c}" stroke-width="6" fill="none"/>`;
    else if (v === 3) o += `<path d="M${x - 7} 666 V600 q7 -16 0 -30 h14 q-7 14 0 30 V666Z" fill="${c}" stroke="${d}" stroke-width="2"/>`;
    else o += `<rect x="${x - 7}" y="566" width="14" height="100" rx="4" fill="${c}" stroke="${d}" stroke-width="2"/>`;
  }
  return posts + o + `<rect x="110" y="548" width="1380" height="22" rx="6" fill="${c}" stroke="${d}" stroke-width="3"/><rect x="110" y="654" width="1380" height="14" fill="${shade(c, -0.1)}" stroke="${d}" stroke-width="2"/>`;
}

const SWING = [
  { wood: '#c98a4b', cushion: '#f4978e' },
  { wood: '#f4f1ea', cushion: '#8fc1e8' },
  { wood: '#8a5a33', cushion: '#7ed957' },
  { wood: '#c9a23a', cushion: '#d46a9a' },
];

function swing(v: number): string {
  const x = 1000;
  const y = 480;
  if (v < 0) return `<path d="M${x + 20} 90 V${y - 40} M${x + 340} 90 V${y - 120}" stroke="#777" stroke-width="4"/><rect x="${x}" y="${y}" width="360" height="24" fill="#8a7d6a" stroke="#5e584f" stroke-width="4" transform="rotate(12 ${x} ${y})"/>`;
  const s = SWING[v];
  const d = shade(s.wood, -0.35);
  return `<g>
    <path d="M${x + 20} 90 V${y - 120} M${x + 340} 90 V${y - 120}" stroke="#6b4423" stroke-width="5"/>
    <rect x="${x}" y="${y - 130}" width="360" height="110" rx="12" fill="${s.wood}" stroke="${d}" stroke-width="3"/>
    ${[0, 1, 2, 3, 4, 5].map((k) => `<rect x="${x + 20 + k * 56}" y="${y - 118}" width="40" height="86" rx="6" fill="${shade(s.wood, 0.08)}" stroke="${d}" stroke-width="2"/>`).join('')}
    <rect x="${x - 10}" y="${y - 24}" width="380" height="34" rx="10" fill="${s.wood}" stroke="${d}" stroke-width="3"/>
    <rect x="${x + 10}" y="${y - 44}" width="340" height="28" rx="14" fill="${s.cushion}" stroke="${shade(s.cushion, -0.3)}" stroke-width="3"/>
    <rect x="${x + 30}" y="${y - 110}" width="80" height="70" rx="20" fill="#fff" stroke="${shade(s.cushion, -0.3)}" stroke-width="3" transform="rotate(-8 ${x + 70} ${y - 75})"/>
    <rect x="${x + 250}" y="${y - 108}" width="80" height="70" rx="20" fill="${shade(s.cushion, 0.3)}" stroke="${shade(s.cushion, -0.3)}" stroke-width="3" transform="rotate(8 ${x + 290} ${y - 73})"/>
    ${v === 3 ? `<path d="M${x} ${y - 130} Q${x + 180} ${y - 190} ${x + 360} ${y - 130}" fill="none" stroke="#f2c94c" stroke-width="5"/>` : ''}
  </g>`;
}

const CHAIR = ['#d9b07a', '#f4f1ea', '#6b8f3a', '#8c2340'];

function armchair(v: number): string {
  const x = 420;
  const y = 680;
  if (v < 0) return `<g transform="rotate(-8 ${x} ${y})"><path d="M${x - 110} ${y} L${x - 100} ${y - 200} L${x + 100} ${y - 200} L${x + 110} ${y}Z" fill="#9c9488" stroke="#5e584f" stroke-width="4"/><path d="M${x - 60} ${y - 160} l40 60 l-30 30" stroke="#5e584f" stroke-width="4" fill="none"/></g>`;
  const c = CHAIR[v];
  const d = shade(c, -0.35);
  const weave = v === 0 ? Array.from({ length: 8 }, (_, k) => `<path d="M${x - 90} ${y - 190 + k * 22} H${x + 90}" stroke="${d}" stroke-width="2" opacity=".5"/>`).join('') : '';
  return `<g><ellipse cx="${x}" cy="${y + 6}" rx="140" ry="16" fill="#000" opacity=".15"/>
    <path d="M${x - 100} ${y - 60} C${x - 130} ${y - 240} ${x + 130} ${y - 240} ${x + 100} ${y - 60}Z" fill="${c}" stroke="${d}" stroke-width="4"/>${weave}
    <rect x="${x - 120}" y="${y - 90}" width="240" height="70" rx="22" fill="${c}" stroke="${d}" stroke-width="4"/>
    <rect x="${x - 90}" y="${y - 104}" width="180" height="40" rx="18" fill="${v === 3 ? '#f2c94c' : '#fff6ee'}" stroke="${d}" stroke-width="3"/>
    <rect x="${x - 110}" y="${y - 24}" width="16" height="30" fill="${d}"/><rect x="${x + 94}" y="${y - 24}" width="16" height="30" fill="${d}"/>
    <rect x="${x - 40}" y="${y - 180}" width="80" height="60" rx="18" fill="${v === 2 ? '#ffd166' : '#f4978e'}" stroke="${d}" stroke-width="3"/></g>`;
}

const TEA = ['#c98a4b', '#f4f1ea', '#5a3a2a', '#c9d6e8'];

function teaTable(v: number): string {
  const x = 780;
  const y = 760;
  if (v < 0) return `<rect x="${x - 100}" y="${y - 50}" width="200" height="20" fill="#8a7d6a" transform="rotate(-10 ${x} ${y})"/><rect x="${x - 60}" y="${y - 30}" width="14" height="40" fill="#5e584f"/>`;
  const c = TEA[v];
  const d = shade(c, -0.35);
  return `<g><ellipse cx="${x}" cy="${y + 10}" rx="120" ry="14" fill="#000" opacity=".14"/>
    <path d="M${x - 70} ${y - 40} L${x - 80} ${y + 6} M${x + 70} ${y - 40} L${x + 80} ${y + 6}" stroke="${d}" stroke-width="12" stroke-linecap="round"/>
    <ellipse cx="${x}" cy="${y - 46}" rx="110" ry="26" fill="${c}" stroke="${d}" stroke-width="3" opacity="${v === 3 ? 0.8 : 1}"/>
    <ellipse cx="${x - 30}" cy="${y - 56}" rx="20" ry="7" fill="#fff" stroke="#c9c2b4" stroke-width="2"/><rect x="${x - 44}" y="${y - 80}" width="28" height="24" rx="6" fill="#fff" stroke="#c9c2b4" stroke-width="2"/>
    <rect x="${x + 10}" y="${y - 72}" width="60" height="16" rx="6" fill="#ffd166"/></g>`;
}

const LANT = ['#ffe28a', '#ff9f43', '#ff8fd0', '#e8f6ff'];

function lanterns(v: number): string {
  const xs = [360, 800, 1240];
  if (v < 0) return xs.map((x) => `<path d="M${x} 90 V150" stroke="#555" stroke-width="3"/><path d="M${x - 14} 150 h28 l-6 30 h-16z" fill="#9c9488" transform="rotate(20 ${x} 150)"/>`).join('');
  const c = LANT[v];
  return xs
    .map(
      (x) => `<ellipse cx="${x}" cy="210" rx="80" ry="70" fill="${c}" opacity=".3"/><path d="M${x} 90 V160" stroke="#3b2a20" stroke-width="3"/>
      ${
        v === 2
          ? `<ellipse cx="${x}" cy="206" rx="34" ry="44" fill="${c}" stroke="${shade(c, -0.35)}" stroke-width="3"/>${[0, 1, 2].map((k) => `<path d="M${x - 32} ${190 + k * 16} H${x + 32}" stroke="${shade(c, -0.3)}" stroke-width="2"/>`).join('')}`
          : `<rect x="${x - 26}" y="166" width="52" height="70" rx="8" fill="${c}" stroke="${v === 3 ? '#9fc9e0' : '#3b2a20'}" stroke-width="4"/><path d="M${x - 32} 166 h64 l-32 -16z" fill="#3b2a20"/><rect x="${x - 6}" y="186" width="12" height="30" rx="5" fill="#fff6c2"/>`
      }`,
    )
    .join('');
}

function pots(v: number): string {
  if (v < 0) return `<path d="M170 760 l60 0 l-8 60 l-44 0z" fill="#9c8f78" transform="rotate(30 200 790)"/><path d="M1400 800 q-10 -40 6 -60 m-6 60 q20 -30 34 -30" stroke="#8b6b3f" stroke-width="4" fill="none"/>`;
  const potC = ['#d9774a', '#f4f1ea', '#5ec7ff', '#c9a23a'][v];
  const petals = ['#ff8fb1', '#b892e8', '#ffd23f', '#e8405a'][v];
  const side = (x: number) => `${plant(x, 820, 1.2, potC)}${[0, 1, 2, 3].map((k) => flower(x - 40 + k * 26, 700 - (k % 2) * 24, 13, petals)).join('')}`;
  return side(200) + side(1400);
}

const verandaItems: Record<string, ItemArt> = {
  deck: { box: [0, 640, 1600, 360], draw: deck },
  awning: { box: [0, 0, 1600, 160], draw: awning },
  railing: { box: [60, 80, 1480, 620], draw: railing },
  swing: { box: [970, 80, 420, 460], draw: swing },
  armchair: { box: [270, 460, 300, 240], draw: armchair },
  table: { box: [650, 690, 260, 100], draw: teaTable },
  lanterns: { box: [260, 80, 1080, 180], draw: lanterns },
  plants: { box: [100, 620, 1420, 220], draw: pots },
};

const verandaBonus: Record<string, ItemArt> = {
  verandaCat: { box: [330, 450, 200, 150], draw: () => cat(430, 580, '#3b3b3b', 0.8) },
  feeder: {
    box: [1420, 130, 120, 200],
    draw: () => `<g transform="translate(1480 230)"><path d="M0 -100 V-40" stroke="#6b4423" stroke-width="3"/><path d="M-44 -40 L0 -70 L44 -40Z" fill="#e05a47" stroke="#8d2f22" stroke-width="3"/>
      <rect x="-34" y="-40" width="68" height="50" fill="#ffd166" stroke="#a8761a" stroke-width="3"/><rect x="-40" y="10" width="80" height="10" rx="3" fill="#a8703f"/>
      <g transform="translate(26 0)"><ellipse rx="12" ry="9" fill="#ff9f43"/><circle cx="7" cy="-6" r="6" fill="#ff9f43"/><path d="M12 -6 l7 2 l-7 3z" fill="#5a3a20"/></g></g>`,
  },
  lemonade: {
    box: [790, 620, 110, 110],
    draw: () => `<g transform="translate(840 706)"><path d="M-26 -70 H26 L20 0 H-20 Z" fill="#fff6c2" stroke="#c9a23a" stroke-width="3" opacity=".95"/><rect x="-22" y="-50" width="44" height="46" fill="#ffe066" opacity=".8"/>
      <circle cx="-6" cy="-34" r="8" fill="#ffd23f" stroke="#e7b417" stroke-width="2"/><path d="M26 -56 q16 4 14 24 q-2 14 -16 14" stroke="#c9a23a" stroke-width="4" fill="none"/></g>`,
  },
};

export const KITCHEN = { items: kitchenItems, bonus: kitchenBonus, back: kitchenBack, ruins: kitchenRuins };
export const VERANDA = {
  items: verandaItems,
  bonus: verandaBonus,
  back: () => verandaBack(),
  ruins: (stage: number) => {
    let o = '';
    if (stage < 1) o += boxes(1220, 990) + `<path d="M500 900 q60 -50 140 -10 q40 30 -20 50 q-80 20 -120 -40z" fill="#c98a12" opacity=".8"/>`;
    if (stage < 2) o += ladder(620, 200, 460, 10) + paintBucket(1000, 980, '#e05a47');
    if (stage < 3) o += cobweb(124, 70, 1.1);
    return o;
  },
};
