/**
 * Tiny sfxr-style offline synthesizer (soft, cozy timbres): every sound effect is described by a
 * list of layers and rendered once into an AudioBuffer at startup.
 */
export type Wave = 'sq' | 'saw' | 'sin' | 'tri' | 'noise';

export interface Layer {
  w: Wave;
  /** Start / end frequency (Hz). End is reached with an exponential slide. */
  f: number;
  f2?: number;
  dur: number;
  vol?: number;
  delay?: number;
  attack?: number;
  /** Decay curve exponent: 1 = linear fade, >1 = punchier. */
  curve?: number;
  /** Square duty cycle. */
  duty?: number;
  vib?: { rate: number; depth: number };
  /** One-pole low-pass amount 0..1 (1 = no filtering). */
  lp?: number;
}

/** PolyBLEP correction: removes the aliasing (harsh "digital" overtones) of hard waveform edges. */
function blep(t: number, dt: number): number {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}

/**
 * Render layers into a buffer. Clean by construction: band-limited square/saw, filtered
 * (not sample-and-hold) noise, smooth attack and a short release fade on every layer
 * (no clicks), DC removed, no saturation; quiet headroom so overlapping sounds don't clip.
 */
export function renderLayers(ctx: BaseAudioContext, layers: Layer[]): AudioBuffer {
  const sr = ctx.sampleRate;
  const total = Math.max(...layers.map((l) => (l.delay ?? 0) + l.dur)) + 0.03;
  const len = Math.ceil(total * sr);
  const buf = ctx.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);
  for (const l of layers) {
    const start = Math.floor((l.delay ?? 0) * sr);
    const n = Math.floor(l.dur * sr);
    const f2 = l.f2 ?? l.f;
    const vol = l.vol ?? 0.5;
    const attack = Math.max(Math.floor(0.002 * sr), Math.floor((l.attack ?? 0.004) * sr));
    const release = Math.min(Math.floor(0.006 * sr), Math.floor(n / 4));
    const curve = l.curve ?? 1.6;
    const duty = l.duty ?? 0.5;
    const lp = l.lp ?? 1;
    let phase = 0;
    let lpState = 0;
    let nz1 = 0;
    let nz2 = 0;
    for (let i = 0; i < n && start + i < len; i++) {
      const t = i / n;
      let freq = l.f * Math.pow(f2 / l.f, t);
      if (l.vib) freq *= 1 + Math.sin((i / sr) * Math.PI * 2 * l.vib.rate) * l.vib.depth;
      const dt = Math.min(0.45, freq / sr);
      phase += dt;
      if (phase >= 1) phase -= 1;
      let s: number;
      switch (l.w) {
        case 'sq': {
          s = phase < duty ? 1 : -1;
          s += blep(phase, dt);
          s -= blep((phase + 1 - duty) % 1, dt);
          s *= 0.7;
          break;
        }
        case 'saw':
          s = (2 * phase - 1 - blep(phase, dt)) * 0.7;
          break;
        case 'sin':
          s = Math.sin(phase * Math.PI * 2);
          break;
        case 'tri':
          s = 1 - 4 * Math.abs(phase - 0.5);
          break;
        case 'noise':
        default: {
          // White noise through a 2-pole low-pass at the layer "frequency".
          const k = 1 - Math.exp((-2 * Math.PI * Math.min(freq, sr * 0.45)) / sr);
          nz1 += (Math.random() * 2 - 1 - nz1) * k;
          nz2 += (nz1 - nz2) * k;
          s = nz2 * 1.6;
          break;
        }
      }
      lpState += (s - lpState) * lp;
      s = lpState;
      const a = i < attack ? 0.5 - 0.5 * Math.cos((Math.PI * i) / attack) : 1;
      const r = i > n - release ? (n - i) / release : 1;
      out[start + i] += s * a * r * Math.pow(1 - t, curve) * vol;
    }
  }
  // DC blocker, then keep peaks at or below 0.7 (headroom for overlapping sounds).
  let x1 = 0;
  let y1 = 0;
  let peak = 0;
  for (let i = 0; i < len; i++) {
    const y = out[i] - x1 + 0.995 * y1;
    x1 = out[i];
    y1 = y;
    out[i] = y;
    peak = Math.max(peak, Math.abs(y));
  }
  if (peak > 0.7) for (let i = 0; i < len; i++) out[i] *= 0.7 / peak;
  return buf;
}

export const SFX: Record<string, Layer[]> = {
  click: [
    { w: 'sin', f: 1100, f2: 820, dur: 0.05, vol: 0.32, curve: 2.2 },
    { w: 'noise', f: 3500, dur: 0.012, vol: 0.12 },
  ],
  pop: [{ w: 'sin', f: 520, f2: 900, dur: 0.1, vol: 0.35, curve: 1.8 }],
  card: [
    { w: 'noise', f: 2600, dur: 0.07, vol: 0.32, curve: 2.4 },
    { w: 'sin', f: 760, f2: 1000, dur: 0.07, vol: 0.22, curve: 2 },
  ],
  flip: [
    { w: 'noise', f: 2200, dur: 0.06, vol: 0.2, curve: 2.2 },
    { w: 'sin', f: 480, f2: 720, dur: 0.06, vol: 0.14 },
  ],
  draw: [
    { w: 'noise', f: 1600, dur: 0.18, vol: 0.4, attack: 0.03, curve: 1.6 },
    { w: 'sin', f: 300, f2: 460, dur: 0.1, vol: 0.12 },
  ],
  combo: [
    { w: 'sin', f: 880, dur: 0.35, vol: 0.3, curve: 2.2 },
    { w: 'sin', f: 2430, dur: 0.18, vol: 0.08, curve: 3 },
  ],
  peak: [
    { w: 'sin', f: 1047, dur: 0.6, vol: 0.22, curve: 2 },
    { w: 'sin', f: 1319, dur: 0.6, vol: 0.2, delay: 0.08, curve: 2 },
    { w: 'sin', f: 1568, dur: 0.8, vol: 0.2, delay: 0.16, curve: 2 },
    { w: 'sin', f: 2093, dur: 0.9, vol: 0.13, delay: 0.24, curve: 2 },
  ],
  wild: [
    { w: 'sin', f: 1319, dur: 0.18, vol: 0.22, curve: 2 },
    { w: 'sin', f: 1760, dur: 0.18, vol: 0.22, delay: 0.06, curve: 2 },
    { w: 'sin', f: 2349, dur: 0.22, vol: 0.2, delay: 0.12, curve: 2 },
    { w: 'sin', f: 2637, dur: 0.4, vol: 0.18, delay: 0.18, curve: 2, vib: { rate: 14, depth: 0.02 } },
  ],
  undo: [
    { w: 'sin', f: 880, f2: 360, dur: 0.18, vol: 0.3 },
    { w: 'noise', f: 1400, dur: 0.12, vol: 0.14, attack: 0.04, curve: 1.2 },
  ],
  hammer: [
    { w: 'noise', f: 1400, dur: 0.18, vol: 0.45, curve: 2.6 },
    { w: 'sin', f: 200, f2: 90, dur: 0.2, vol: 0.45 },
  ],
  peek: [{ w: 'tri', f: 600, f2: 1200, dur: 0.25, vol: 0.25, vib: { rate: 10, depth: 0.05 } }],
  gold: [
    { w: 'tri', f: 1568, dur: 0.08, vol: 0.28, curve: 0.8 },
    { w: 'tri', f: 2093, dur: 0.3, vol: 0.28, delay: 0.08, curve: 2 },
  ],
  coin: [
    { w: 'tri', f: 1319, dur: 0.06, vol: 0.22, curve: 0.8 },
    { w: 'tri', f: 1760, dur: 0.18, vol: 0.22, delay: 0.06, curve: 2 },
  ],
  star: [
    { w: 'sin', f: 784, dur: 0.12, vol: 0.28, curve: 1 },
    { w: 'sin', f: 1175, dur: 0.12, vol: 0.28, delay: 0.08, curve: 1 },
    { w: 'sin', f: 1568, dur: 0.35, vol: 0.28, delay: 0.16, curve: 2 },
  ],
  unlock: [
    { w: 'tri', f: 2000, dur: 0.03, vol: 0.12 },
    { w: 'tri', f: 1600, dur: 0.03, vol: 0.12, delay: 0.05 },
    { w: 'sin', f: 1568, dur: 0.4, vol: 0.22, delay: 0.1, curve: 2 },
  ],
  ice: [
    { w: 'noise', f: 6000, dur: 0.12, vol: 0.22, curve: 3 },
    { w: 'sin', f: 2800, f2: 2300, dur: 0.15, vol: 0.1, delay: 0.02 },
  ],
  win: [
    { w: 'tri', f: 523, dur: 0.16, vol: 0.3, curve: 0.6 },
    { w: 'tri', f: 659, dur: 0.16, vol: 0.3, delay: 0.15, curve: 0.6 },
    { w: 'tri', f: 784, dur: 0.16, vol: 0.3, delay: 0.3, curve: 0.6 },
    { w: 'tri', f: 1047, dur: 0.9, vol: 0.3, delay: 0.45, curve: 1.6, vib: { rate: 6, depth: 0.012 } },
    { w: 'sin', f: 2093, dur: 0.9, vol: 0.12, delay: 0.45, curve: 2 },
    { w: 'sin', f: 262, dur: 1.2, vol: 0.3, delay: 0.45, curve: 1.4 },
  ],
  lose: [
    { w: 'tri', f: 523, dur: 0.25, vol: 0.28, curve: 0.8 },
    { w: 'tri', f: 466, dur: 0.25, vol: 0.28, delay: 0.24, curve: 0.8 },
    { w: 'tri', f: 392, dur: 0.8, vol: 0.28, delay: 0.48, curve: 1.6, vib: { rate: 5, depth: 0.02 } },
  ],
  error: [
    { w: 'sin', f: 240, f2: 200, dur: 0.12, vol: 0.35 },
    { w: 'sin', f: 180, dur: 0.14, vol: 0.25, delay: 0.1 },
  ],
  decorate: [
    { w: 'noise', f: 1800, dur: 0.35, vol: 0.26, attack: 0.08, curve: 1 },
    { w: 'sin', f: 140, f2: 70, dur: 0.2, vol: 0.4, delay: 0.3 },
    { w: 'sin', f: 1568, dur: 0.3, vol: 0.16, delay: 0.38, curve: 2 },
    { w: 'sin', f: 2093, dur: 0.3, vol: 0.14, delay: 0.46, curve: 2 },
    { w: 'sin', f: 2637, dur: 0.5, vol: 0.12, delay: 0.54, curve: 2 },
  ],
  chest: [
    { w: 'tri', f: 180, f2: 260, dur: 0.3, vol: 0.18, attack: 0.05 },
    { w: 'sin', f: 1047, dur: 0.3, vol: 0.2, delay: 0.3, curve: 2 },
    { w: 'sin', f: 1319, dur: 0.3, vol: 0.2, delay: 0.38, curve: 2 },
    { w: 'sin', f: 1568, dur: 0.3, vol: 0.2, delay: 0.46, curve: 2 },
    { w: 'sin', f: 2093, dur: 0.7, vol: 0.2, delay: 0.54, curve: 2 },
  ],
  buy: [
    { w: 'tri', f: 784, dur: 0.08, vol: 0.25, curve: 0.6 },
    { w: 'tri', f: 1047, dur: 0.08, vol: 0.25, delay: 0.08, curve: 0.6 },
    { w: 'tri', f: 1568, dur: 0.3, vol: 0.25, delay: 0.16, curve: 2 },
  ],
  boom: [
    { w: 'noise', f: 900, dur: 0.6, vol: 0.6, curve: 2 },
    { w: 'sin', f: 120, f2: 40, dur: 0.5, vol: 0.55 },
  ],
  life: [{ w: 'sin', f: 520, f2: 260, dur: 0.4, vol: 0.35, vib: { rate: 7, depth: 0.04 } }],
};
