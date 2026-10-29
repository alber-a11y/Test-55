import type { BackStyle } from '@shared/cards/backs';
import { darken, type Ctx } from '@shared/cards/draw';
import { FACE_STYLES, type FaceStyle } from '@shared/cards/faces';

/**
 * Card art of the Thousand Express: art-deco faces in navy, burgundy and brass,
 * and backs with railway emblems (locomotive, winged wheel, "1000" plate).
 */
const DECO_SERIF = 'Georgia, "Times New Roman", serif';

const THOUSAND_FACES: FaceStyle[] = [
  {
    id: 'deco',
    bg: ['#fffaf0', '#f3e9d2'],
    edge: '#b89a5e',
    ink: ['#1c2747', '#a3213a', '#a3213a', '#1c2747'],
    rankFont: DECO_SERIF,
    pips: 'big',
    court: 'portrait',
    frame: '#c9a55c',
    robes: ['#2b3d78', '#a3213a', '#c4782a', '#2f6b4f'],
    gold: '#d9a23a',
  },
  {
    id: 'brass',
    bg: ['#2a2f45', '#171a2b'],
    edge: '#c9a55c',
    ink: ['#f3d48a', '#ff8f8f', '#ffb86b', '#9fe3c0'],
    rankFont: DECO_SERIF,
    pips: 'big',
    court: 'portrait',
    frame: '#c9a55c',
    robes: ['#3b4a7a', '#7a2a3a', '#7a5a2a', '#2a5a4a'],
    gold: '#f3d48a',
  },
  {
    id: 'ticket',
    bg: ['#fdf3d8', '#f2dfae'],
    edge: '#a88b57',
    ink: ['#2d2a26', '#c0392b', '#d35400', '#1e6b52'],
    rankFont: '"Trebuchet MS", Arial, sans-serif',
    pips: 'classic',
    court: 'portrait',
    frame: '#b8975e',
    robes: ['#4d5d7a', '#9e3b2a', '#b7832f', '#3f6b4a'],
    gold: '#c79a3b',
  },
];

let registered = false;
export function registerCardStyles(): void {
  if (registered) return;
  registered = true;
  FACE_STYLES.push(...THOUSAND_FACES);
}

/* ---------------------------------------------------------------- back emblems */

function medallion(c: Ctx, w: number, h: number, st: { c2: string; accent: string }, r = 0.3): void {
  c.fillStyle = darken(st.c2, 0.2);
  c.beginPath();
  c.ellipse(w / 2, h / 2, w * r, w * r * 1.1, 0, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = st.accent;
  c.stroke();
  c.lineWidth = 1.5;
  c.beginPath();
  c.ellipse(w / 2, h / 2, w * r - 8, w * r * 1.1 - 8, 0, 0, Math.PI * 2);
  c.stroke();
}

/** Front view of a steam locomotive. */
export function drawLocomotive(c: Ctx, cx: number, cy: number, s: number, col: string, dark: string): void {
  c.save();
  c.translate(cx, cy);
  c.scale(s, s);
  c.fillStyle = col;
  c.strokeStyle = dark;
  c.lineWidth = 3;
  // Chimney
  c.beginPath();
  c.moveTo(-10, -58);
  c.lineTo(10, -58);
  c.lineTo(7, -38);
  c.lineTo(-7, -38);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillRect(-14, -64, 28, 7);
  // Boiler face
  c.beginPath();
  c.arc(0, -8, 32, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = dark;
  c.beginPath();
  c.arc(0, -8, 22, 0, Math.PI * 2);
  c.fill();
  // Headlamp
  c.fillStyle = '#fff3c4';
  c.beginPath();
  c.arc(0, -8, 9, 0, Math.PI * 2);
  c.fill();
  // Buffer beam + cowcatcher
  c.fillStyle = col;
  c.fillRect(-40, 22, 80, 12);
  c.strokeRect(-40, 22, 80, 12);
  c.beginPath();
  c.moveTo(-36, 34);
  c.lineTo(36, 34);
  c.lineTo(22, 54);
  c.lineTo(-22, 54);
  c.closePath();
  c.fill();
  c.stroke();
  c.strokeStyle = dark;
  c.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    c.beginPath();
    c.moveTo(i * 12, 34);
    c.lineTo(i * 8, 54);
    c.stroke();
  }
  // Buffers
  c.fillStyle = dark;
  c.beginPath();
  c.arc(-30, 28, 5, 0, Math.PI * 2);
  c.arc(30, 28, 5, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** Winged wheel — the old railway emblem. */
function wingedWheel(c: Ctx, cx: number, cy: number, s: number, col: string): void {
  c.save();
  c.translate(cx, cy);
  c.scale(s, s);
  c.strokeStyle = col;
  c.fillStyle = col;
  for (const dir of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      c.beginPath();
      c.ellipse(dir * (34 + k * 9), -6 - k * 6, 16 - k, 6, dir * (0.35 + k * 0.12), 0, Math.PI * 2);
      c.fill();
    }
  }
  c.lineWidth = 5;
  c.beginPath();
  c.arc(0, 0, 26, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(Math.cos(a) * 24, Math.sin(a) * 24);
    c.stroke();
  }
  c.beginPath();
  c.arc(0, 0, 6, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function plate1000(c: Ctx, w: number, h: number, st: { c2: string; accent: string }): void {
  const pw = w * 0.7;
  const ph = h * 0.2;
  c.fillStyle = darken(st.c2, 0.25);
  c.strokeStyle = st.accent;
  c.lineWidth = 4;
  c.beginPath();
  c.roundRect?.(w / 2 - pw / 2, h / 2 - ph / 2, pw, ph, 12);
  c.fill();
  c.stroke();
  c.fillStyle = st.accent;
  c.font = `bold ${Math.round(ph * 0.62)}px ${DECO_SERIF}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('1000', w / 2, h / 2 + 2);
  for (const dx of [-1, 1]) {
    c.beginPath();
    c.arc(w / 2 + dx * (pw / 2 - 12), h / 2, 4, 0, Math.PI * 2);
    c.fill();
  }
}

/** Two rails running into the distance. */
function rails(c: Ctx, w: number, h: number, col: string): void {
  c.save();
  c.strokeStyle = col;
  c.globalAlpha = 0.6;
  c.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const y = h * 0.2 + (i * i * h * 0.6) / 121;
    const half = 10 + (y / h) * w * 0.35;
    c.beginPath();
    c.moveTo(w / 2 - half - 10, y);
    c.lineTo(w / 2 + half + 10, y);
    c.stroke();
  }
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(w / 2 - 6, h * 0.2);
  c.lineTo(w * 0.12, h * 0.85);
  c.moveTo(w / 2 + 6, h * 0.2);
  c.lineTo(w * 0.88, h * 0.85);
  c.stroke();
  c.restore();
}

type ArtKind = 'loco' | 'wheel' | 'plate' | 'rails';

export function backArt(kind: ArtKind, c2: string, accent: string): (ctx: Ctx, w: number, h: number) => void {
  return (c, w, h) => {
    if (kind === 'rails') {
      rails(c, w, h, accent);
      return;
    }
    medallion(c, w, h, { c2, accent }, kind === 'plate' ? 0.34 : 0.3);
    if (kind === 'loco') drawLocomotive(c, w / 2, h / 2 + 4, w * 0.0058, accent, darken(c2, 0.3));
    else if (kind === 'wheel') wingedWheel(c, w / 2, h / 2, w * 0.0042, accent);
    else plate1000(c, w, h, { c2, accent });
  };
}

export function railBack(id: string, c1: string, c2: string, accent: string, pattern: BackStyle['pattern'], art: ArtKind, margin?: string): BackStyle {
  return { id, c1, c2, accent, pattern, emblem: 'none', margin, art: backArt(art, c2, accent) };
}
