import { darken, lighten, makeCanvas, noiseRng } from './draw';

export interface TableStyle {
  id: string;
  kind: 'felt' | 'wood' | 'marble' | 'night' | 'paper';
  c1: string;
  c2: string;
  /** Detail color (wood grain, marble veins, stars). */
  detail?: string;
}

/** Full-screen table background. Cached by caller per size. */
export function renderTable(st: TableStyle, w: number, h: number): HTMLCanvasElement {
  const [cv, ctx] = makeCanvas(w, h);
  const rnd = noiseRng(st.id.length * 131 + 7);
  const g = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.1, w / 2, h / 2, Math.max(w, h) * 0.8);
  g.addColorStop(0, st.c1);
  g.addColorStop(1, st.c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  switch (st.kind) {
    case 'felt': {
      // Fine fibre noise
      const n = Math.floor((w * h) / 90);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
        ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
      }
      break;
    }
    case 'wood': {
      const plank = Math.max(120, Math.round(w / 8));
      for (let x = 0; x < w; x += plank) {
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.03)';
        ctx.fillRect(x, 0, plank, h);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x, 0, 3, h);
        ctx.strokeStyle = st.detail ?? darken(st.c2, 0.2);
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 2;
        for (let k = 0; k < 7; k++) {
          const ox = x + rnd() * plank;
          ctx.beginPath();
          for (let y = 0; y <= h; y += 20) {
            const xx = ox + Math.sin(y / (80 + k * 13) + k) * 10;
            if (y === 0) ctx.moveTo(xx, y);
            else ctx.lineTo(xx, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'marble': {
      ctx.strokeStyle = st.detail ?? lighten(st.c1, 0.4);
      for (let k = 0; k < 26; k++) {
        ctx.globalAlpha = 0.08 + rnd() * 0.18;
        ctx.lineWidth = 1 + rnd() * 3;
        let x = rnd() * w;
        let y = rnd() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 40; s++) {
          x += (rnd() - 0.3) * 60;
          y += (rnd() - 0.5) * 60;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'night': {
      ctx.fillStyle = st.detail ?? '#ffffff';
      for (let k = 0; k < (w * h) / 6000; k++) {
        ctx.globalAlpha = 0.2 + rnd() * 0.6;
        const r = rnd() * 2.2;
        ctx.beginPath();
        ctx.arc(rnd() * w, rnd() * h, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'paper': {
      for (let i = 0; i < (w * h) / 120; i++) {
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(120,90,40,0.04)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(rnd() * w, rnd() * h, 3, 3);
      }
      break;
    }
  }
  // Vignette
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  return cv;
}
