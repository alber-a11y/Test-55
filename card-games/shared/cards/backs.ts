import { darken, lighten, makeCanvas, noiseRng, roundRect, starPath, suitPath, type Ctx } from './draw';
import { CARD_TH, CARD_TW } from './faces';

export type BackPattern =
  | 'lattice'
  | 'stripes'
  | 'dots'
  | 'waves'
  | 'stars'
  | 'checker'
  | 'rings'
  | 'chevron'
  | 'mandala'
  | 'scales'
  | 'hex'
  | 'suits'
  | 'plain';

export interface BackStyle {
  id: string;
  c1: string;
  c2: string;
  accent: string;
  pattern: BackPattern;
  /** Outer margin color (classic white border). */
  margin?: string;
  /** Central medallion: suit index, 'star', or none. */
  emblem?: number | 'star' | 'none';
  /** Extra center art (e.g. city landmark). Drawn inside the inner area. */
  art?: (ctx: Ctx, w: number, h: number) => void;
}

function pattern(ctx: Ctx, st: BackStyle, x: number, y: number, w: number, h: number): void {
  const a = st.accent;
  const rnd = noiseRng(st.id.length * 977 + st.c1.charCodeAt(2));
  ctx.save();
  ctx.fillStyle = a;
  ctx.strokeStyle = a;
  switch (st.pattern) {
    case 'lattice': {
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.55;
      for (let i = -h; i < w + h; i += 22) {
        ctx.beginPath();
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i + h, y + h);
        ctx.moveTo(x + i + h, y);
        ctx.lineTo(x + i, y + h);
        ctx.stroke();
      }
      break;
    }
    case 'stripes': {
      ctx.globalAlpha = 0.45;
      for (let i = -h; i < w + h; i += 28) {
        ctx.beginPath();
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i + 12, y);
        ctx.lineTo(x + i + 12 + h, y + h);
        ctx.lineTo(x + i + h, y + h);
        ctx.fill();
      }
      break;
    }
    case 'dots': {
      ctx.globalAlpha = 0.6;
      for (let j = 0; j < h / 20 + 1; j++)
        for (let i = 0; i < w / 20 + 1; i++) {
          ctx.beginPath();
          ctx.arc(x + i * 20 + (j % 2) * 10, y + j * 20, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      break;
    }
    case 'waves': {
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 4;
      for (let j = 0; j < h / 18 + 2; j++) {
        ctx.beginPath();
        for (let i = 0; i <= w; i += 6) {
          const yy = y + j * 18 + Math.sin((i / w) * Math.PI * 4 + j) * 6;
          if (i === 0) ctx.moveTo(x + i, yy);
          else ctx.lineTo(x + i, yy);
        }
        ctx.stroke();
      }
      break;
    }
    case 'stars': {
      ctx.globalAlpha = 0.7;
      for (let k = 0; k < 46; k++) {
        starPath(ctx, x + rnd() * w, y + rnd() * h, 3 + rnd() * 7);
        ctx.fill();
      }
      break;
    }
    case 'checker': {
      ctx.globalAlpha = 0.35;
      const s = 24;
      for (let j = 0; j < h / s + 1; j++)
        for (let i = 0; i < w / s + 1; i++) if ((i + j) % 2 === 0) ctx.fillRect(x + i * s, y + j * s, s, s);
      break;
    }
    case 'rings': {
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 3;
      for (let r = 10; r < Math.max(w, h); r += 16) {
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'chevron': {
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 6;
      for (let j = -1; j < h / 22 + 1; j++) {
        ctx.beginPath();
        for (let i = 0; i <= w / 20 + 1; i++) {
          const yy = y + j * 22 + (i % 2 === 0 ? 0 : 10);
          if (i === 0) ctx.moveTo(x + i * 20, yy);
          else ctx.lineTo(x + i * 20, yy);
        }
        ctx.stroke();
      }
      break;
    }
    case 'mandala': {
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2.5;
      const cx = x + w / 2;
      const cy = y + h / 2;
      for (let ring = 1; ring <= 5; ring++) {
        const n = 6 + ring * 4;
        const rr = ring * 24;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 10, 4, ang, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      break;
    }
    case 'scales': {
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 3;
      for (let j = 0; j < h / 14 + 2; j++)
        for (let i = -1; i < w / 24 + 1; i++) {
          ctx.beginPath();
          ctx.arc(x + i * 24 + (j % 2) * 12 + 12, y + j * 14, 12, 0, Math.PI);
          ctx.stroke();
        }
      break;
    }
    case 'hex': {
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2.5;
      const r = 13;
      const dx = r * Math.sqrt(3);
      for (let j = 0; j < h / (r * 1.5) + 2; j++)
        for (let i = -1; i < w / dx + 1; i++) {
          const cx = x + i * dx + (j % 2) * (dx / 2);
          const cy = y + j * r * 1.5;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const ang = Math.PI / 6 + (k * Math.PI) / 3;
            if (k === 0) ctx.moveTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
            else ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
          }
          ctx.closePath();
          ctx.stroke();
        }
      break;
    }
    case 'suits': {
      ctx.globalAlpha = 0.4;
      let k = 0;
      for (let j = 0; j < h / 30 + 1; j++)
        for (let i = 0; i < w / 30 + 1; i++) {
          suitPath(ctx, (k++ % 4) as 0, x + i * 30 + (j % 2) * 15, y + j * 30, 16);
          ctx.fill();
        }
      break;
    }
    case 'plain':
      break;
  }
  ctx.restore();
}

export function renderBack(st: BackStyle, w = CARD_TW, h = CARD_TH): HTMLCanvasElement {
  const [cv, ctx] = makeCanvas(w, h);
  const r = w * 0.075;
  roundRect(ctx, 1.5, 1.5, w - 3, h - 3, r);
  ctx.fillStyle = st.margin ?? lighten(st.c1, 0.85);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = darken(st.c2, 0.3);
  ctx.stroke();
  const m = w * 0.065;
  const ix = m;
  const iy = m;
  const iw = w - m * 2;
  const ih = h - m * 2;
  ctx.save();
  roundRect(ctx, ix, iy, iw, ih, r * 0.6);
  const g = ctx.createLinearGradient(0, iy, 0, iy + ih);
  g.addColorStop(0, st.c1);
  g.addColorStop(1, st.c2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  pattern(ctx, st, ix, iy, iw, ih);
  if (st.art) {
    ctx.save();
    ctx.translate(ix, iy);
    st.art(ctx, iw, ih);
    ctx.restore();
  }
  ctx.restore();
  // Inner double frame
  roundRect(ctx, ix + 6, iy + 6, iw - 12, ih - 12, r * 0.4);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = st.accent;
  ctx.globalAlpha = 0.8;
  ctx.stroke();
  ctx.globalAlpha = 1;
  const em = st.emblem ?? 'none';
  if (em !== 'none' && !st.art) {
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = darken(st.c2, 0.15);
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = st.accent;
    ctx.stroke();
    ctx.fillStyle = st.accent;
    if (em === 'star') starPath(ctx, cx, cy, w * 0.13);
    else suitPath(ctx, em as 0, cx, cy, w * 0.22);
    ctx.fill();
  }
  return cv;
}
