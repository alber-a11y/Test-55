import type { Card, Suit } from '../game/cards';
import { RANK_NAMES } from '../game/cards';
import { shade } from './color';

/** Card art is drawn in a 100×140 box and inserted as inline SVG (so it uses the page font). */
export const CARD_W = 100;
export const CARD_H = 140;

const RED = '#e0383e';
const BLACK = '#1f2233';

const SUIT_PATHS: Record<Suit, string> = {
  0: 'M50 4C70 26 96 40 96 60C96 76 82 84 70 84C62 84 56 80 53 75C54 86 58 92 66 97L34 97C42 92 46 86 47 75C44 80 38 84 30 84C18 84 4 76 4 60C4 40 30 26 50 4Z',
  1: 'M50 90C20 68 4 52 4 31C4 15 16 5 29 5C39 5 46 11 50 19C54 11 61 5 71 5C84 5 96 15 96 31C96 52 80 68 50 90Z',
  2: 'M50 2Q68 28 90 50Q68 72 50 98Q32 72 10 50Q32 28 50 2Z',
  3: 'M50 8A20 20 0 0 1 66 40A20 20 0 1 1 56 74C57 84 60 91 67 97L33 97C40 91 43 84 44 74A20 20 0 1 1 34 40A20 20 0 0 1 50 8Z',
};

export const suitColor = (s: Suit) => (s === 1 || s === 2 ? RED : BLACK);

/** A suit symbol centred at (x, y), `size` wide. */
export function suitSvg(s: Suit, x: number, y: number, size: number, color = suitColor(s)): string {
  const k = size / 100;
  return `<path d="${SUIT_PATHS[s]}" fill="${color}" transform="translate(${x - 50 * k} ${y - 50 * k}) scale(${k})"/>`;
}

const ROBE: Record<Suit, [string, string]> = {
  0: ['#3f4fb0', '#f3c64b'],
  1: ['#d23c3c', '#f6cf57'],
  2: ['#e48a2a', '#fff2c4'],
  3: ['#2f8c5a', '#f3c64b'],
};

function crown(cx: number, top: number, w: number, gems: string): string {
  const h = w * 0.55;
  const l = cx - w / 2;
  return `<path d="M${l} ${top + h} L${l} ${top + h * 0.25} L${l + w * 0.22} ${top + h * 0.6} L${cx} ${top} L${l + w * 0.78} ${top + h * 0.6} L${l + w} ${top + h * 0.25} L${l + w} ${top + h} Z" fill="#f5c542" stroke="#b9831e" stroke-width="1.6" stroke-linejoin="round"/>
    <rect x="${l - 1}" y="${top + h - 3}" width="${w + 2}" height="6" rx="2" fill="#e9b334" stroke="#b9831e" stroke-width="1.2"/>
    <circle cx="${cx}" cy="${top + h * 0.55}" r="2.6" fill="${gems}"/><circle cx="${l + 3}" cy="${top + h * 0.45}" r="1.8" fill="#fff"/><circle cx="${l + w - 3}" cy="${top + h * 0.45}" r="1.8" fill="#fff"/>`;
}

function face(cx: number, cy: number, skin: string, opts: { brows?: string; lashes?: boolean } = {}): string {
  const brow = opts.brows ?? '#5a3a24';
  return `<ellipse cx="${cx}" cy="${cy}" rx="15" ry="17" fill="${skin}"/>
    <ellipse cx="${cx - 14.5}" cy="${cy + 2}" rx="3" ry="4.5" fill="${shade(skin, -0.08)}"/>
    <ellipse cx="${cx + 14.5}" cy="${cy + 2}" rx="3" ry="4.5" fill="${shade(skin, -0.08)}"/>
    <ellipse cx="${cx - 5.5}" cy="${cy + 1}" rx="2.3" ry="3" fill="#2a1d18"/><ellipse cx="${cx + 5.5}" cy="${cy + 1}" rx="2.3" ry="3" fill="#2a1d18"/>
    <circle cx="${cx - 4.8}" cy="${cy}" r="0.9" fill="#fff"/><circle cx="${cx + 6.2}" cy="${cy}" r="0.9" fill="#fff"/>
    ${opts.lashes ? `<path d="M${cx - 9} ${cy - 2} l2 1.5 M${cx + 9} ${cy - 2} l-2 1.5" stroke="#2a1d18" stroke-width="1.2"/>` : ''}
    <path d="M${cx - 9} ${cy - 5} Q${cx - 5.5} ${cy - 8} ${cx - 2.5} ${cy - 5.5} M${cx + 9} ${cy - 5} Q${cx + 5.5} ${cy - 8} ${cx + 2.5} ${cy - 5.5}" stroke="${brow}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M${cx - 1} ${cy + 4} q1.5 3 3 0.5" stroke="${shade(skin, -0.25)}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <circle cx="${cx - 9}" cy="${cy + 7}" r="3" fill="#f28b82" opacity=".45"/><circle cx="${cx + 9}" cy="${cy + 7}" r="3" fill="#f28b82" opacity=".45"/>`;
}

function smile(cx: number, cy: number): string {
  return `<path d="M${cx - 5} ${cy + 9.5} q5 4.5 10 0" stroke="#a5453a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
}

function robe(s: Suit): string {
  const [c, trim] = ROBE[s];
  return `<path d="M30 140 C31 120 38 110 52 106 L82 106 C96 110 100 122 100 140 Z" fill="${c}"/>
    <path d="M52 106 L67 128 L82 106" fill="none" stroke="${trim}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M30 140 C31 128 34 120 40 115" stroke="${shade(c, 0.25)}" stroke-width="3" fill="none" opacity=".6"/>
    ${suitSvg(s, 67, 124, 13, trim)}`;
}

function king(s: Suit): string {
  const skin = '#f5cfae';
  const hair = s === 2 ? '#b8692e' : '#6b3f22';
  return `${robe(s)}
    <rect x="61" y="96" width="12" height="12" fill="${shade(skin, -0.1)}"/>
    ${face(67, 82, skin, { brows: hair })}
    <path d="M52 84 C52 104 60 110 67 110 C74 110 82 104 82 84 C78 96 72 98 67 98 C62 98 56 96 52 84Z" fill="${hair}"/>
    <path d="M60 94 q7 -4 14 0" stroke="${shade(hair, -0.2)}" stroke-width="2" fill="none"/>
    ${smile(67, 84).replace('#a5453a', '#7a2e26')}
    <path d="M52 76 C52 66 58 62 67 62 C76 62 82 66 82 76 C78 70 72 69 67 69 C62 69 56 70 52 76Z" fill="${hair}"/>
    ${crown(67, 48, 32, s === 0 || s === 3 ? '#4ec3e0' : '#e0475a')}`;
}

function queen(s: Suit): string {
  const skin = '#f8d6bd';
  const hair = ['#3a2418', '#5b2c1e', '#c0752f', '#2d1b14'][s];
  return `<path d="M46 74 C42 98 40 122 44 140 L90 140 C94 122 92 98 88 74 Z" fill="${hair}"/>
    ${robe(s)}
    <rect x="61" y="96" width="12" height="12" fill="${shade(skin, -0.1)}"/>
    ${face(67, 82, skin, { brows: hair, lashes: true })}
    ${smile(67, 82)}
    <path d="M51 82 C49 66 57 60 67 60 C78 60 85 66 83 82 C80 72 74 68 67 70 C60 68 54 72 51 82Z" fill="${hair}"/>
    <circle cx="52" cy="90" r="2" fill="#fff"/><circle cx="82" cy="90" r="2" fill="#fff"/>
    ${crown(67, 47, 26, s === 0 || s === 3 ? '#9b5de5' : '#2fbf9f')}`;
}

function jack(s: Suit): string {
  const skin = '#f3cba8';
  const hair = ['#4a2e1f', '#7a4a2a', '#2d1f18', '#a0632e'][s];
  const cap = s === 1 || s === 2 ? '#3557b5' : '#2e5aa8';
  return `${robe(s)}
    <rect x="61" y="96" width="12" height="12" fill="${shade(skin, -0.1)}"/>
    ${face(67, 83, skin, { brows: hair })}
    ${smile(67, 83)}
    <path d="M52 82 C51 72 57 66 67 66 C77 66 83 72 82 82 C78 76 73 74 67 75 C61 74 56 76 52 82Z" fill="${hair}"/>
    <path d="M48 70 C50 56 60 52 69 52 C80 52 88 58 87 68 C80 64 60 64 48 70Z" fill="${cap}"/>
    <path d="M47 70 C60 64 78 63 88 68" stroke="#f3c64b" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="80" cy="57" r="3.5" fill="#f3c64b"/>`;
}

function ace(s: Suit): string {
  const col = suitColor(s);
  return `<circle cx="55" cy="84" r="34" fill="${col}" opacity=".07"/>
    <circle cx="55" cy="84" r="30" fill="none" stroke="${col}" stroke-width="1.5" opacity=".25" stroke-dasharray="3 4"/>
    ${suitSvg(s, 55, 86, 50)}`;
}

const cache = new Map<string, string>();

function cardBase(inner: string): string {
  return `<svg viewBox="0 0 ${CARD_W} ${CARD_H}" xmlns="http://www.w3.org/2000/svg" class="card-svg">
    <rect x="1.5" y="1.5" width="97" height="137" rx="9" fill="#fffdf6" stroke="#dccfb3" stroke-width="1.6"/>
    <rect x="5" y="5" width="90" height="130" rx="6.5" fill="none" stroke="#f1e8d5" stroke-width="1"/>
    ${inner}</svg>`;
}

/** Inline SVG markup for a card face. */
export function cardFace(c: Card): string {
  const key = `${c.r}_${c.s}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const col = suitColor(c.s);
  const label = RANK_NAMES[c.r];
  const fs = label.length > 1 ? 27 : 31;
  const idx = `<text x="${label.length > 1 ? 6 : 9}" y="32" font-size="${fs}" font-weight="900" fill="${col}" font-family="Nunito, Arial Rounded MT Bold, Arial, sans-serif" letter-spacing="${label.length > 1 ? -2 : 0}">${label}</text>`;
  let body: string;
  if (c.r >= 11) {
    // Characters are drawn for a 70-wide box; enlarge them towards the bottom-right corner.
    const who = c.r === 13 ? king(c.s) : c.r === 12 ? queen(c.s) : jack(c.s);
    body = `<g transform="translate(-26 -42) scale(1.3)">${who}</g>` + suitSvg(c.s, 17, 45, 15);
  } else if (c.r === 1) body = ace(c.s);
  else body = suitSvg(c.s, 56, 88, 48);
  const svg = cardBase(body + idx);
  cache.set(key, svg);
  return svg;
}

/** Joker placed on the waste by the Wild booster. */
export function wildFace(): string {
  const star = (cx: number, cy: number, r: number, fill: string) => {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`;
  };
  return cardBase(`
    <rect x="9" y="9" width="82" height="122" rx="6" fill="#8e5bd8"/>
    <circle cx="50" cy="70" r="36" fill="#a97ae6"/>
    ${star(50, 70, 30, '#ffd23f')}
    ${star(24, 30, 9, '#ff7eb6')}${star(78, 112, 9, '#5ed0ff')}${star(80, 28, 6, '#7ee08a')}
    <text x="50" y="128" font-size="15" font-weight="900" fill="#fff" text-anchor="middle" font-family="Nunito, Arial, sans-serif">WILD</text>`);
}

/* ---------- card backs (skins) ---------- */

interface BackStyle {
  bg: string;
  bg2: string;
  ink: string;
  motif: 'leaf' | 'rose' | 'ivy' | 'lavender' | 'maple' | 'sun' | 'night' | 'gingham' | 'patch';
}

const BACKS: Record<string, BackStyle> = {
  leaf: { bg: '#2f5fc8', bg2: '#244ea6', ink: '#cfe0ff', motif: 'leaf' },
  rose: { bg: '#c9354b', bg2: '#a82a3e', ink: '#ffd5dc', motif: 'rose' },
  ivy: { bg: '#2f8a57', bg2: '#256f46', ink: '#d4f5df', motif: 'ivy' },
  lavender: { bg: '#8d63c9', bg2: '#7450ad', ink: '#eadcff', motif: 'lavender' },
  maple: { bg: '#d9772d', bg2: '#b85f1f', ink: '#ffe6c9', motif: 'maple' },
  sun: { bg: '#e9b52f', bg2: '#cf9a1b', ink: '#fff4cc', motif: 'sun' },
  night: { bg: '#24306b', bg2: '#1a2452', ink: '#ffe9a8', motif: 'night' },
  gingham: { bg: '#e55a5a', bg2: '#ffffff', ink: '#ffffff', motif: 'gingham' },
  patch: { bg: '#5aa2c8', bg2: '#f2a65a', ink: '#fff6e5', motif: 'patch' },
};

function leafShape(x: number, y: number, s: number, rot: number, fill: string): string {
  return `<path d="M0 -10 C6 -6 6 6 0 10 C-6 6 -6 -6 0 -10Z M0 -9 L0 9" fill="${fill}" stroke="${fill}" stroke-width=".6" transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"/>`;
}

function motif(st: BackStyle): string {
  const ink = st.ink;
  switch (st.motif) {
    case 'leaf': {
      let o = '';
      for (let y = 18; y < 135; y += 22) for (let x = 16; x < 100; x += 22) o += leafShape(x + ((y / 22) % 2) * 11, y, 0.55, 35, ink + '33');
      o += `<path d="M50 112 C50 90 50 60 50 30" stroke="${ink}" stroke-width="2.2" fill="none"/>`;
      for (let i = 0; i < 4; i++) {
        o += leafShape(40, 40 + i * 18, 1.15, -50, ink) + leafShape(60, 40 + i * 18, 1.15, 50, ink);
      }
      o += leafShape(50, 26, 1.1, 0, ink);
      return o;
    }
    case 'rose': {
      let o = '';
      for (let y = 20; y < 135; y += 26) for (let x = 18; x < 100; x += 26) o += `<circle cx="${x + ((y / 26) % 2) * 13}" cy="${y}" r="3" fill="${ink}44"/>`;
      const petal = (r: number, a: number) => `<ellipse cx="50" cy="${70 - r}" rx="${r * 0.7}" ry="${r}" fill="${ink}" opacity=".85" transform="rotate(${a} 50 70)"/>`;
      for (let i = 0; i < 6; i++) o += petal(18, i * 60);
      o += `<circle cx="50" cy="70" r="12" fill="${st.bg}"/><path d="M50 70 m-8 0 a8 8 0 1 1 8 8 a5 5 0 1 1 -5 -5" stroke="${ink}" stroke-width="2" fill="none"/>`;
      o += leafShape(28, 104, 1.1, -60, ink) + leafShape(72, 104, 1.1, 60, ink);
      return o;
    }
    case 'ivy': {
      let o = `<path d="M20 130 C40 100 20 70 50 50 C80 30 60 15 80 8" stroke="${ink}" stroke-width="2" fill="none"/>`;
      const ivy = (x: number, y: number, r: number) =>
        `<path d="M0 8 L-8 0 L-4 -7 L0 -3 L4 -7 L8 0 Z" fill="${ink}" transform="translate(${x} ${y}) rotate(${r}) scale(1.4)"/>`;
      [[28, 112, -20], [36, 84, 20], [42, 60, -10], [62, 40, 30], [72, 22, -15], [60, 96, 10], [70, 70, -25]].forEach(([x, y, r]) => (o += ivy(x, y, r)));
      return o;
    }
    case 'lavender': {
      let o = '';
      for (const x of [30, 50, 70]) {
        o += `<path d="M${x} 125 C${x} 100 ${x} 70 ${x + (x - 50) * 0.3} 35" stroke="${ink}" stroke-width="2" fill="none"/>`;
        for (let i = 0; i < 7; i++) o += `<ellipse cx="${x + (x - 50) * 0.3 * (1 - i / 7) + (i % 2 ? 3 : -3)}" cy="${40 + i * 8}" rx="3.2" ry="4.5" fill="${ink}"/>`;
      }
      return o;
    }
    case 'maple': {
      const mp = `M0 -22 L5 -10 L14 -14 L11 -3 L22 0 L12 6 L15 14 L4 11 L2 22 L-2 22 L-4 11 L-15 14 L-12 6 L-22 0 L-11 -3 L-14 -14 L-5 -10 Z`;
      return `<path d="${mp}" fill="${ink}" transform="translate(50 68) scale(1.4)"/>
        <path d="${mp}" fill="${ink}55" transform="translate(22 24) scale(.5) rotate(20)"/>
        <path d="${mp}" fill="${ink}55" transform="translate(80 116) scale(.5) rotate(-15)"/>
        <path d="${mp}" fill="${ink}55" transform="translate(78 26) scale(.35) rotate(40)"/>
        <path d="${mp}" fill="${ink}55" transform="translate(22 114) scale(.35)"/>`;
    }
    case 'sun': {
      let o = '';
      for (let i = 0; i < 16; i++) o += `<path d="M50 70 L${50 + Math.cos((i * Math.PI) / 8 - 0.09) * 60} ${70 + Math.sin((i * Math.PI) / 8 - 0.09) * 60} L${50 + Math.cos((i * Math.PI) / 8 + 0.09) * 60} ${70 + Math.sin((i * Math.PI) / 8 + 0.09) * 60}Z" fill="${ink}" opacity="${i % 2 ? 0.25 : 0.5}"/>`;
      return o + `<circle cx="50" cy="70" r="20" fill="${ink}"/><circle cx="50" cy="70" r="14" fill="${st.bg}" opacity=".5"/>`;
    }
    case 'night': {
      let o = `<path d="M62 40 A26 26 0 1 0 62 100 A20 20 0 1 1 62 40Z" fill="${ink}"/>`;
      const st5 = (x: number, y: number, r: number) => `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3}Z" fill="${ink}"/>`;
      [[24, 24, 5], [78, 20, 4], [80, 110, 6], [22, 112, 4], [72, 66, 3], [30, 70, 3], [50, 126, 3]].forEach(([x, y, r]) => (o += st5(x, y, r)));
      return o;
    }
    case 'gingham': {
      let o = '';
      for (let i = 0; i < 9; i++) {
        o += `<rect x="${8 + i * 10}" y="8" width="5" height="124" fill="#fff" opacity=".45"/>`;
        o += `<rect x="8" y="${8 + i * 14}" width="84" height="7" fill="#fff" opacity=".45"/>`;
      }
      return o + `<circle cx="50" cy="70" r="16" fill="#fff"/>${suitSvg(1, 50, 71, 20, st.bg)}`;
    }
    case 'patch': {
      const cols = ['#5aa2c8', '#f2a65a', '#e56b6f', '#7bc47f', '#b392ac', '#f6d06b'];
      let o = '';
      let k = 0;
      for (let y = 8; y < 132; y += 31) for (let x = 8; x < 92; x += 28) o += `<rect x="${x}" y="${y}" width="28" height="31" fill="${cols[k++ % cols.length]}" stroke="#fff6e5" stroke-width="1.5" stroke-dasharray="3 2"/>`;
      return o;
    }
  }
}

const backCache = new Map<string, string>();

export function cardBack(id: string): string {
  const hit = backCache.get(id);
  if (hit) return hit;
  const st = BACKS[id] ?? BACKS.leaf;
  const svg = `<svg viewBox="0 0 ${CARD_W} ${CARD_H}" xmlns="http://www.w3.org/2000/svg" class="card-svg">
    <rect x="1.5" y="1.5" width="97" height="137" rx="9" fill="#fff8ea" stroke="#d9c7a2" stroke-width="1.6"/>
    <rect x="6" y="6" width="88" height="128" rx="6" fill="${st.bg}"/>
    <rect x="6" y="6" width="88" height="64" rx="6" fill="#fff" opacity=".07"/>
    <clipPath id="cbk-${id}"><rect x="6" y="6" width="88" height="128" rx="6"/></clipPath>
    <g clip-path="url(#cbk-${id})">${motif(st)}</g>
    <rect x="9.5" y="9.5" width="81" height="121" rx="4.5" fill="none" stroke="${st.ink}" stroke-width="1.2" opacity=".55"/>
    <rect x="6" y="6" width="88" height="128" rx="6" fill="none" stroke="${shade(st.bg2, -0.15)}" stroke-width="1.5"/>
  </svg>`;
  backCache.set(id, svg);
  return svg;
}

export const BACK_IDS = Object.keys(BACKS);
