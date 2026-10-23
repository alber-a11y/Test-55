/**
 * Tiny sfxr-style offline synthesizer: every sound effect is described by a
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
