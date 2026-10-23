import { RANK_LABELS, type Suit } from './card';
import { darken, fillSuit, lighten, makeCanvas, mix, roundRect, starPath, suitPath, type Ctx } from './draw';

/** Card texture resolution (displayed scaled down). Aspect 1 : 1.4. */
export const CARD_TW = 240;
export const CARD_TH = 336;

export interface FaceStyle {
  id: string;
  /** Face background top / bottom gradient. */
  bg: [string, string];
  edge: string;
  /** Ink per suit ♠ ♥ ♦ ♣. */
  ink: [string, string, string, string];
  rankFont: string;
  /** Center art of number cards. */
  pips: 'classic' | 'big';
  /** Court cards: drawn portrait or big letter with crown. */
  court: 'portrait' | 'letter';
  /** Inner frame line color (optional). */
  frame?: string;
  /** Neon glow around ink. */
  glow?: boolean;
  /** Robe colors of court portraits per suit. */
  robes?: [string, string, string, string];
  /** Accent (crowns, trims). */
  gold?: string;
}

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '"Trebuchet MS", "Arial Black", Arial, sans-serif';

export const FACE_STYLES: FaceStyle[] = [
  {
    id: 'classic',
    bg: ['#ffffff', '#f1efe8'],
    edge: '#c9c3b4',
    ink: ['#1c1c28', '#d7263d', '#d7263d', '#1c1c28'],
    rankFont: SERIF,
    pips: 'classic',
    court: 'portrait',
    robes: ['#2f4fa8', '#c4243b', '#e08a1e', '#2c8a4b'],
    gold: '#e8b923',
  },
  {
    id: 'big',
    bg: ['#ffffff', '#eef2f6'],
    edge: '#b9c3cf',
    ink: ['#111827', '#e11d48', '#e11d48', '#111827'],
    rankFont: SANS,
    pips: 'big',
    court: 'portrait',
    robes: ['#3b5bdb', '#e03131', '#f08c00', '#2f9e44'],
    gold: '#fcc419',
  },
  {
    id: 'four',
    bg: ['#ffffff', '#f3f1ea'],
    edge: '#c9c3b4',
    ink: ['#1c1c28', '#d7263d', '#1f6fd1', '#1b8a3a'],
    rankFont: SERIF,
    pips: 'classic',
    court: 'portrait',
    robes: ['#3a3f58', '#c4243b', '#1f6fd1', '#1b8a3a'],
    gold: '#e8b923',
  },
  {
    id: 'retro',
    bg: ['#fbf1d9', '#ead7ae'],
    edge: '#a88b57',
    ink: ['#3b2a1a', '#a8321e', '#a8321e', '#3b2a1a'],
    rankFont: SERIF,
    pips: 'classic',
    court: 'portrait',
    frame: '#b8975e',
    robes: ['#4d5d7a', '#9e3b2a', '#b7832f', '#5b7a3a'],
    gold: '#c79a3b',
  },
  {
    id: 'minimal',
    bg: ['#fafafa', '#fafafa'],
    edge: '#d4d4d8',
    ink: ['#27272a', '#ef4444', '#f97316', '#0f766e'],
    rankFont: SANS,
    pips: 'big',
    court: 'letter',
    gold: '#f59e0b',
  },
  {
    id: 'neon',
    bg: ['#141a33', '#0b1022'],
    edge: '#3b4a8a',
    ink: ['#7dd3fc', '#fb7185', '#fbbf24', '#86efac'],
    rankFont: SANS,
    pips: 'big',
    court: 'letter',
    glow: true,
    gold: '#f0abfc',
  },
  {
    id: 'noir',
    bg: ['#1f1f24', '#121216'],
    edge: '#8a7340',
    ink: ['#f2d58a', '#f2d58a', '#f2d58a', '#f2d58a'],
    rankFont: SERIF,
    pips: 'classic',
    court: 'portrait',
    frame: '#8a7340',
    robes: ['#2b2b33', '#3a2028', '#3a3020', '#20302a'],
    gold: '#f2d58a',
  },
  {
    id: 'candy',
    bg: ['#fff7fb', '#ffe4f1'],
    edge: '#f0a6c8',
    ink: ['#6d28d9', '#db2777', '#ea580c', '#0d9488'],
    rankFont: SANS,
    pips: 'big',
    court: 'portrait',
    robes: ['#7c3aed', '#ec4899', '#f97316', '#14b8a6'],
    gold: '#facc15',
  },
];

export function faceStyle(id: string): FaceStyle {
  return FACE_STYLES.find((f) => f.id === id) ?? FACE_STYLES[0];
}

/** Pip positions (column, row 0..1) for number cards. */
const PIPS: Record<number, [number, number][]> = {
  2: [[1, 0], [1, 1]],
  3: [[1, 0], [1, 0.5], [1, 1]],
  4: [[0, 0], [2, 0], [0, 1], [2, 1]],
  5: [[0, 0], [2, 0], [1, 0.5], [0, 1], [2, 1]],
  6: [[0, 0], [2, 0], [0, 0.5], [2, 0.5], [0, 1], [2, 1]],
  7: [[0, 0], [2, 0], [1, 0.25], [0, 0.5], [2, 0.5], [0, 1], [2, 1]],
  8: [[0, 0], [2, 0], [1, 0.25], [0, 0.5], [2, 0.5], [1, 0.75], [0, 1], [2, 1]],
  9: [[0, 0], [2, 0], [0, 1 / 3], [2, 1 / 3], [1, 0.5], [0, 2 / 3], [2, 2 / 3], [0, 1], [2, 1]],
  10: [[0, 0], [2, 0], [1, 1 / 6], [0, 1 / 3], [2, 1 / 3], [0, 2 / 3], [2, 2 / 3], [1, 5 / 6], [0, 1], [2, 1]],
};

function withGlow(ctx: Ctx, st: FaceStyle, color: string, blur: number, fn: () => void): void {
  if (st.glow) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    fn();
    ctx.restore();
  } else fn();
}

/** Card base: rounded body with gradient, edge and optional inner frame. */
export function drawCardBase(ctx: Ctx, w: number, h: number, st: FaceStyle): void {
  const r = w * 0.075;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, st.bg[0]);
  g.addColorStop(1, st.bg[1]);
  roundRect(ctx, 1.5, 1.5, w - 3, h - 3, r);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = st.edge;
  ctx.stroke();
  if (st.frame) {
    roundRect(ctx, w * 0.05, h * 0.036, w * 0.9, h * 0.928, r * 0.6);
    ctx.lineWidth = 2;
    ctx.strokeStyle = st.frame;
    ctx.stroke();
  }
}

function drawIndex(ctx: Ctx, st: FaceStyle, suit: Suit, rank: number, w: number, h: number): void {
  const ink = st.ink[suit];
  const label = RANK_LABELS[rank];
  // Top band: big rank on the left, suit on the right — readable when cards overlap.
  const fs = label.length > 1 ? h * 0.2 : h * 0.215;
  ctx.font = `bold ${Math.round(fs)}px ${st.rankFont}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  withGlow(ctx, st, ink, 14, () => {
    ctx.fillStyle = ink;
    if (label.length > 1) {
      // "10" — slightly condensed
      ctx.save();
      ctx.translate(w * 0.055, h * 0.205);
      ctx.scale(0.8, 1);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    } else ctx.fillText(label, w * 0.07, h * 0.205);
    fillSuit(ctx, suit, w * 0.8, h * 0.125, w * 0.24, ink);
  });
  // Bottom-right mirrored small index.
  ctx.save();
  ctx.translate(w, h);
  ctx.rotate(Math.PI);
  ctx.font = `bold ${Math.round(h * 0.1)}px ${st.rankFont}`;
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.fillText(label, w * 0.11, h * 0.1);
  fillSuit(ctx, suit, w * 0.11, h * 0.15, w * 0.1, ink);
  ctx.restore();
}

function drawPips(ctx: Ctx, st: FaceStyle, suit: Suit, rank: number, w: number, h: number): void {
  const ink = st.ink[suit];
  if (st.pips === 'big') {
    withGlow(ctx, st, ink, 26, () => fillSuit(ctx, suit, w * 0.5, h * 0.6, w * 0.6, ink));
    if (rank > 1) {
      ctx.font = `bold ${Math.round(h * 0.13)}px ${st.rankFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = st.bg[0];
      ctx.globalAlpha = 0.9;
      ctx.fillText(String(rank), w * 0.5, h * 0.6);
      ctx.globalAlpha = 1;
    }
    return;
  }
  if (rank === 1) {
    // Ace: ornate ring + large suit
    ctx.save();
    ctx.strokeStyle = mix(ink, st.bg[0], 0.55);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.59, w * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.59, w * 0.39, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    withGlow(ctx, st, ink, 20, () => fillSuit(ctx, suit, w * 0.5, h * 0.59, w * 0.44, ink));
    return;
  }
  const xs = [w * 0.3, w * 0.5, w * 0.7];
  const y0 = h * 0.33;
  const y1 = h * 0.85;
  const ps = rank >= 9 ? w * 0.17 : w * 0.19;
  for (const [cx, ry] of PIPS[rank]) {
    const x = xs[cx];
    const y = y0 + (y1 - y0) * ry;
    ctx.save();
    ctx.translate(x, y);
    if (ry > 0.5) ctx.rotate(Math.PI);
    withGlow(ctx, st, ink, 10, () => fillSuit(ctx, suit, 0, 0, ps, ink));
    ctx.restore();
  }
}

/** Upper half of a court portrait, drawn in a box (0,0)-(bw,bh) where bh is the half height. */
function drawBust(ctx: Ctx, st: FaceStyle, suit: Suit, rank: number, bw: number, bh: number): void {
  const robe = st.robes?.[suit] ?? st.ink[suit];
  const gold = st.gold ?? '#e8b923';
  const skin = '#f6d7b8';
  const cx = bw * 0.5;
  // Shoulders / robe
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(bw * 0.04, bh);
  ctx.quadraticCurveTo(bw * 0.06, bh * 0.66, cx - bw * 0.2, bh * 0.6);
  ctx.lineTo(cx + bw * 0.2, bh * 0.6);
  ctx.quadraticCurveTo(bw * 0.94, bh * 0.66, bw * 0.96, bh);
  ctx.closePath();
  ctx.fill();
  // Robe pattern stripes
  ctx.fillStyle = lighten(robe, 0.25);
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(bw * (0.12 + i * 0.05), bh * 0.74, bw * 0.025, bh * 0.26);
    ctx.fillRect(bw * (0.83 - i * 0.05), bh * 0.74, bw * 0.025, bh * 0.26);
  }
  // Collar with zig-zag trim
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(cx - bw * 0.24, bh * 0.62);
  for (let i = 0; i <= 8; i++) {
    const x = cx - bw * 0.24 + (bw * 0.48 * i) / 8;
    ctx.lineTo(x, bh * (i % 2 === 0 ? 0.62 : 0.72));
  }
  ctx.lineTo(cx + bw * 0.24, bh * 0.6);
  ctx.lineTo(cx - bw * 0.24, bh * 0.6);
  ctx.fill();
  // Emblem
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, bh * 0.86, bw * 0.085, 0, Math.PI * 2);
  ctx.fill();
  fillSuit(ctx, suit, cx, bh * 0.86, bw * 0.1, st.ink[suit]);
  // Neck + head
  ctx.fillStyle = darken(skin, 0.08);
  ctx.fillRect(cx - bw * 0.06, bh * 0.48, bw * 0.12, bh * 0.14);
  const hr = bw * 0.15;
  const hy = bh * 0.4;
  // Hair behind the head
  const hair = rank === 13 ? '#8a8f99' : rank === 12 ? '#7a3e1d' : '#3a2a1e';
  if (rank === 12) {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(cx, hy + hr * 0.4, hr * 1.35, hr * 1.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(cx, hy, hr, hr * 1.12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Face
  ctx.fillStyle = '#2b2b38';
  ctx.beginPath();
  ctx.arc(cx - hr * 0.38, hy - hr * 0.05, hr * 0.1, 0, Math.PI * 2);
  ctx.arc(cx + hr * 0.38, hy - hr * 0.05, hr * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(230,110,110,0.45)';
  ctx.beginPath();
  ctx.arc(cx - hr * 0.55, hy + hr * 0.3, hr * 0.16, 0, Math.PI * 2);
  ctx.arc(cx + hr * 0.55, hy + hr * 0.3, hr * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a3b3b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, hy + hr * 0.25, hr * 0.32, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  if (rank === 13) {
    // Beard + crown
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(cx - hr * 0.95, hy + hr * 0.1);
    ctx.quadraticCurveTo(cx - hr * 0.9, hy + hr * 1.6, cx, hy + hr * 1.75);
    ctx.quadraticCurveTo(cx + hr * 0.9, hy + hr * 1.6, cx + hr * 0.95, hy + hr * 0.1);
    ctx.quadraticCurveTo(cx + hr * 0.5, hy + hr * 0.75, cx, hy + hr * 0.62);
    ctx.quadraticCurveTo(cx - hr * 0.5, hy + hr * 0.75, cx - hr * 0.95, hy + hr * 0.1);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(cx, hy + hr * 0.42, hr * 0.32, hr * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a3b3b';
    ctx.beginPath();
    ctx.moveTo(cx - hr * 0.2, hy + hr * 0.42);
    ctx.lineTo(cx + hr * 0.2, hy + hr * 0.42);
    ctx.stroke();
    ctx.fillStyle = gold;
    const cy0 = hy - hr * 0.95;
    ctx.beginPath();
    ctx.moveTo(cx - hr * 1.05, cy0);
    ctx.lineTo(cx - hr * 1.15, cy0 - hr * 0.95);
    ctx.lineTo(cx - hr * 0.55, cy0 - hr * 0.45);
    ctx.lineTo(cx, cy0 - hr * 1.15);
    ctx.lineTo(cx + hr * 0.55, cy0 - hr * 0.45);
    ctx.lineTo(cx + hr * 1.15, cy0 - hr * 0.95);
    ctx.lineTo(cx + hr * 1.05, cy0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = st.ink[suit] === gold ? '#c0392b' : st.ink[suit];
    ctx.beginPath();
    ctx.arc(cx, cy0 - hr * 0.35, hr * 0.17, 0, Math.PI * 2);
    ctx.fill();
    // Scepter
    ctx.strokeStyle = gold;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(bw * 0.86, bh * 0.98);
    ctx.lineTo(bw * 0.86, bh * 0.3);
    ctx.stroke();
    starPath(ctx, bw * 0.86, bh * 0.27, bw * 0.06);
    ctx.fillStyle = gold;
    ctx.fill();
  } else if (rank === 12) {
    // Hair fringe + tiara + flower
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(cx, hy - hr * 0.7, hr * 1.02, hr * 0.5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(cx - hr * 0.8, hy - hr * 0.95);
    ctx.lineTo(cx - hr * 0.4, hy - hr * 1.4);
    ctx.lineTo(cx, hy - hr * 1.1);
    ctx.lineTo(cx + hr * 0.4, hy - hr * 1.4);
    ctx.lineTo(cx + hr * 0.8, hy - hr * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, hy - hr * 1.2, hr * 0.13, 0, Math.PI * 2);
    ctx.fill();
    const fx = bw * 0.15;
    const fy = bh * 0.55;
    ctx.strokeStyle = '#2f9e44';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(fx, bh * 0.98);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.fillStyle = st.ink[suit] === '#1c1c28' || st.ink[suit] === '#111827' ? '#e64980' : st.ink[suit];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(fx + Math.cos(a) * bw * 0.04, fy + Math.sin(a) * bw * 0.04, bw * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(fx, fy, bw * 0.025, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Jack: short hair + beret with feather + halberd
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(cx, hy - hr * 0.55, hr * 1.04, hr * 0.62, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = darken(robe, 0.2);
    ctx.beginPath();
    ctx.ellipse(cx + hr * 0.15, hy - hr * 0.95, hr * 1.25, hr * 0.42, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx + hr * 0.9, hy - hr * 1.1);
    ctx.quadraticCurveTo(cx + hr * 1.8, hy - hr * 2.0, cx + hr * 2.1, hy - hr * 1.2);
    ctx.stroke();
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(bw * 0.12, bh * 0.98);
    ctx.lineTo(bw * 0.12, bh * 0.22);
    ctx.stroke();
    ctx.fillStyle = '#cfd8dc';
    ctx.beginPath();
    ctx.moveTo(bw * 0.12, bh * 0.12);
    ctx.lineTo(bw * 0.2, bh * 0.28);
    ctx.lineTo(bw * 0.12, bh * 0.34);
    ctx.lineTo(bw * 0.04, bh * 0.28);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCourt(ctx: Ctx, st: FaceStyle, suit: Suit, rank: number, w: number, h: number): void {
  const fx = w * 0.15;
  const fy = h * 0.27;
  const fw = w * 0.7;
  const fh = h * 0.62;
  const ink = st.ink[suit];
  if (st.court === 'letter') {
    const L = RANK_LABELS[rank];
    withGlow(ctx, st, ink, 24, () => {
      ctx.fillStyle = ink;
      ctx.font = `bold ${Math.round(h * 0.36)}px ${st.rankFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(L, w * 0.5, h * 0.64);
      // Crown / tiara / feather glyph above
      const gy = h * 0.37;
      ctx.fillStyle = st.gold ?? ink;
      ctx.beginPath();
      if (rank === 13) {
        ctx.moveTo(w * 0.36, gy + 14);
        ctx.lineTo(w * 0.34, gy - 14);
        ctx.lineTo(w * 0.43, gy);
        ctx.lineTo(w * 0.5, gy - 20);
        ctx.lineTo(w * 0.57, gy);
        ctx.lineTo(w * 0.66, gy - 14);
        ctx.lineTo(w * 0.64, gy + 14);
      } else if (rank === 12) {
        ctx.moveTo(w * 0.38, gy + 10);
        ctx.lineTo(w * 0.44, gy - 10);
        ctx.lineTo(w * 0.5, gy + 2);
        ctx.lineTo(w * 0.56, gy - 10);
        ctx.lineTo(w * 0.62, gy + 10);
      } else {
        starPath(ctx, w * 0.5, gy, 16);
      }
      ctx.closePath();
      ctx.fill();
    });
    return;
  }
  // Framed double-headed portrait.
  ctx.save();
  roundRect(ctx, fx, fy, fw, fh, 10);
  ctx.fillStyle = mix(st.bg[0], ink, 0.08);
  ctx.fill();
  ctx.clip();
  const half = fh / 2;
  ctx.save();
  ctx.translate(fx, fy);
  ctx.beginPath();
  ctx.rect(0, 0, fw, half);
  ctx.clip();
  drawBust(ctx, st, suit, rank, fw, half);
  ctx.restore();
  ctx.save();
  ctx.translate(fx + fw, fy + fh);
  ctx.rotate(Math.PI);
  ctx.beginPath();
  ctx.rect(0, 0, fw, half);
  ctx.clip();
  drawBust(ctx, st, suit, rank, fw, half);
  ctx.restore();
  ctx.restore();
  // Divider + frame
  ctx.strokeStyle = st.gold ?? ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(fx + 4, fy + half);
  ctx.lineTo(fx + fw - 4, fy + half);
  ctx.stroke();
  roundRect(ctx, fx, fy, fw, fh, 10);
  ctx.lineWidth = 3;
  ctx.strokeStyle = ink;
  ctx.stroke();
}

/** Render one card face to a canvas of CARD_TW × CARD_TH. */
export function renderFace(st: FaceStyle, suit: Suit, rank: number, w = CARD_TW, h = CARD_TH): HTMLCanvasElement {
  const [cv, ctx] = makeCanvas(w, h);
  drawCardBase(ctx, w, h, st);
  drawIndex(ctx, st, suit, rank, w, h);
  if (rank >= 11) drawCourt(ctx, st, suit, rank, w, h);
  else drawPips(ctx, st, suit, rank, w, h);
  return cv;
}

/** Joker / wild card face (used by TriPeaks and boosters). */
export function renderWild(st: FaceStyle, w = CARD_TW, h = CARD_TH): HTMLCanvasElement {
  const [cv, ctx] = makeCanvas(w, h);
  drawCardBase(ctx, w, h, st);
  const cols = ['#e03131', '#f08c00', '#2f9e44', '#1971c2', '#7048e8'];
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.translate(w / 2, h * 0.5);
    ctx.rotate((i / 5) * Math.PI * 2);
    ctx.fillStyle = cols[i];
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.13, w * 0.1, h * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  starPath(ctx, w / 2, h * 0.5, w * 0.16);
  ctx.fillStyle = '#ffd43b';
  ctx.fill();
  ctx.font = `bold ${Math.round(h * 0.12)}px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7048e8';
  ctx.fillText('★', w * 0.14, h * 0.13);
  ctx.save();
  ctx.translate(w, h);
  ctx.rotate(Math.PI);
  ctx.fillText('★', w * 0.14, h * 0.13);
  ctx.restore();
  return cv;
}

/** Suit glyph helper re-exported for UI icons. */
export { suitPath };

/** Round avatar made of a court portrait (rank 11..13) on a suit-colored disc. */
export function renderPortrait(st: FaceStyle, suit: Suit, rank: number, size = 160): HTMLCanvasElement {
  const [cv, ctx] = makeCanvas(size, size);
  const r = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(r, r, r - 4, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, lighten(st.robes?.[suit] ?? st.ink[suit], 0.55));
  g.addColorStop(1, lighten(st.robes?.[suit] ?? st.ink[suit], 0.2));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.translate(-size * 0.05, size * 0.06);
  drawBust(ctx, st, suit, rank, size * 1.1, size * 1.0);
  ctx.restore();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#1a1426';
  ctx.beginPath();
  ctx.arc(r, r, r - 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = st.gold ?? '#e8b923';
  ctx.beginPath();
  ctx.arc(r, r, r - 9, 0, Math.PI * 2);
  ctx.stroke();
  return cv;
}
