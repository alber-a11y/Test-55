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

export function renderLayers(ctx: BaseAudioContext, layers: Layer[]): AudioBuffer {
  const sr = ctx.sampleRate;
  const total = Math.max(...layers.map((l) => (l.delay ?? 0) + l.dur)) + 0.02;
  const len = Math.ceil(total * sr);
  const buf = ctx.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);
  for (const l of layers) {
    const start = Math.floor((l.delay ?? 0) * sr);
    const n = Math.floor(l.dur * sr);
    const f2 = l.f2 ?? l.f;
    const vol = l.vol ?? 0.5;
    const attack = Math.max(1, Math.floor((l.attack ?? 0.005) * sr));
    const curve = l.curve ?? 1.6;
    const duty = l.duty ?? 0.5;
    const lp = l.lp ?? 1;
    let phase = 0;
    let lpState = 0;
    let noiseVal = 0;
    let noiseStep = 0;
    for (let i = 0; i < n && start + i < len; i++) {
      const t = i / n;
      let freq = l.f * Math.pow(f2 / l.f, t);
      if (l.vib) freq *= 1 + Math.sin((i / sr) * Math.PI * 2 * l.vib.rate) * l.vib.depth;
      phase += freq / sr;
      const p = phase % 1;
      let s: number;
      switch (l.w) {
        case 'sq':
          s = p < duty ? 1 : -1;
          break;
        case 'saw':
          s = 2 * p - 1;
          break;
        case 'sin':
          s = Math.sin(p * Math.PI * 2);
          break;
        case 'tri':
          s = 1 - 4 * Math.abs(p - 0.5);
          break;
        case 'noise':
        default:
          // Sample-and-hold noise so "frequency" changes the grain.
          noiseStep += freq / sr;
          if (noiseStep >= 1) {
            noiseStep -= 1;
            noiseVal = Math.random() * 2 - 1;
          }
          s = noiseVal;
          break;
      }
      lpState += (s - lpState) * lp;
      s = lpState;
      const env = (i < attack ? i / attack : 1) * Math.pow(1 - t, curve);
      out[start + i] += s * env * vol;
    }
  }
  // Soft clip.
  for (let i = 0; i < len; i++) out[i] = Math.tanh(out[i] * 1.2);
  return buf;
}

export const SFX: Record<string, Layer[]> = {
  click: [
    { w: 'sin', f: 1250, f2: 900, dur: 0.045, vol: 0.35 },
    { w: 'noise', f: 9000, dur: 0.02, vol: 0.12, lp: 0.6 },
  ],
  pop: [{ w: 'sin', f: 480, f2: 980, dur: 0.09, vol: 0.4 }],
  card: [
    { w: 'noise', f: 7000, dur: 0.05, vol: 0.35, lp: 0.55, curve: 2.5 },
    { w: 'tri', f: 700, f2: 980, dur: 0.07, vol: 0.32 },
  ],
  flip: [
    { w: 'noise', f: 5000, dur: 0.05, vol: 0.22, lp: 0.5 },
    { w: 'sin', f: 420, f2: 760, dur: 0.06, vol: 0.2 },
  ],
  draw: [
    { w: 'noise', f: 3200, dur: 0.16, vol: 0.4, lp: 0.28, attack: 0.03, curve: 1.2 },
    { w: 'sin', f: 260, f2: 420, dur: 0.1, vol: 0.12 },
  ],
  combo: [
    { w: 'sin', f: 880, dur: 0.35, vol: 0.3, curve: 2.2 },
    { w: 'sin', f: 2430, dur: 0.18, vol: 0.08, curve: 3 },
  ],
  peak: [
    { w: 'sin', f: 1047, dur: 0.6, vol: 0.25, curve: 2 },
    { w: 'sin', f: 1319, dur: 0.6, vol: 0.22, delay: 0.08, curve: 2 },
    { w: 'sin', f: 1568, dur: 0.8, vol: 0.22, delay: 0.16, curve: 2 },
    { w: 'sin', f: 2093, dur: 0.9, vol: 0.15, delay: 0.24, curve: 2 },
    { w: 'noise', f: 12000, dur: 0.4, vol: 0.06, delay: 0.1, lp: 0.9 },
  ],
  wild: [
    { w: 'sin', f: 1319, dur: 0.18, vol: 0.22, curve: 2 },
    { w: 'sin', f: 1760, dur: 0.18, vol: 0.22, delay: 0.06, curve: 2 },
    { w: 'sin', f: 2349, dur: 0.22, vol: 0.2, delay: 0.12, curve: 2 },
    { w: 'sin', f: 2637, dur: 0.4, vol: 0.18, delay: 0.18, curve: 2, vib: { rate: 14, depth: 0.02 } },
  ],
  undo: [
    { w: 'sin', f: 900, f2: 320, dur: 0.16, vol: 0.3 },
    { w: 'noise', f: 2500, dur: 0.12, vol: 0.18, lp: 0.3, attack: 0.04, curve: 1 },
  ],
  hammer: [
    { w: 'noise', f: 2500, dur: 0.18, vol: 0.5, lp: 0.25, curve: 2.5 },
    { w: 'sin', f: 220, f2: 90, dur: 0.18, vol: 0.45 },
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
    { w: 'sq', f: 2400, dur: 0.03, vol: 0.12, duty: 0.3 },
    { w: 'sq', f: 1800, dur: 0.03, vol: 0.12, delay: 0.05, duty: 0.3 },
    { w: 'sin', f: 1568, dur: 0.4, vol: 0.22, delay: 0.1, curve: 2 },
  ],
  ice: [
    { w: 'noise', f: 14000, dur: 0.12, vol: 0.35, lp: 0.8, curve: 3 },
    { w: 'sin', f: 3200, f2: 2600, dur: 0.15, vol: 0.12, delay: 0.02 },
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
    { w: 'sin', f: 220, f2: 180, dur: 0.12, vol: 0.4 },
    { w: 'tri', f: 160, dur: 0.12, vol: 0.2, delay: 0.1 },
  ],
  decorate: [
    { w: 'noise', f: 4000, dur: 0.35, vol: 0.3, lp: 0.2, attack: 0.08, curve: 1 },
    { w: 'sin', f: 140, f2: 70, dur: 0.2, vol: 0.45, delay: 0.3 },
    { w: 'sin', f: 1568, dur: 0.3, vol: 0.18, delay: 0.38, curve: 2 },
    { w: 'sin', f: 2093, dur: 0.3, vol: 0.16, delay: 0.46, curve: 2 },
    { w: 'sin', f: 2637, dur: 0.5, vol: 0.14, delay: 0.54, curve: 2 },
  ],
  chest: [
    { w: 'saw', f: 180, f2: 260, dur: 0.3, vol: 0.12, lp: 0.15, attack: 0.05 },
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
  life: [{ w: 'sin', f: 520, f2: 260, dur: 0.4, vol: 0.35, vib: { rate: 7, depth: 0.04 } }],
};
