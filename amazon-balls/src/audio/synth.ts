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

const arp = (w: Wave, notes: number[], step: number, dur: number, vol: number): Layer[] =>
  notes.map((f, i) => ({ w, f, dur, vol, delay: i * step, curve: 1.2 }));

/** All sound effects of the game, rendered once at startup. */
export const SFX: Record<string, Layer[]> = {
  click: [
    { w: 'sin', f: 1100, f2: 700, dur: 0.06, vol: 0.35 },
    { w: 'noise', f: 9000, dur: 0.015, vol: 0.12 },
  ],
  whoosh: [{ w: 'noise', f: 3000, f2: 9000, dur: 0.22, vol: 0.18, lp: 0.35, attack: 0.06, curve: 1.2 }],
  shoot: [
    { w: 'sin', f: 260, f2: 820, dur: 0.12, vol: 0.4 },
    { w: 'noise', f: 6000, dur: 0.08, vol: 0.14, lp: 0.5 },
  ],
  bounce: [{ w: 'tri', f: 700, f2: 520, dur: 0.06, vol: 0.28 }],
  snap: [
    { w: 'sin', f: 520, f2: 300, dur: 0.08, vol: 0.4 },
    { w: 'noise', f: 4000, dur: 0.03, vol: 0.15 },
  ],
  pop: [
    { w: 'sin', f: 380, f2: 1250, dur: 0.07, vol: 0.45, curve: 2 },
    { w: 'noise', f: 12000, dur: 0.02, vol: 0.12 },
  ],
  popBig: [
    { w: 'sin', f: 300, f2: 1100, dur: 0.12, vol: 0.45 },
    { w: 'sin', f: 600, f2: 1800, dur: 0.1, vol: 0.25, delay: 0.04 },
    { w: 'noise', f: 7000, dur: 0.12, vol: 0.18, lp: 0.4 },
  ],
  clack: [{ w: 'sin', f: 1700, f2: 1500, dur: 0.035, vol: 0.18 }],
  hole: [
    { w: 'sin', f: 240, f2: 120, dur: 0.12, vol: 0.4 },
    { w: 'sq', f: 1319, dur: 0.08, vol: 0.12, delay: 0.06, curve: 0.8 },
    { w: 'sq', f: 1760, dur: 0.14, vol: 0.12, delay: 0.12 },
  ],
  coin: [
    { w: 'sq', f: 988, dur: 0.07, vol: 0.16, curve: 0.5 },
    { w: 'sq', f: 1319, dur: 0.2, vol: 0.16, delay: 0.07 },
  ],
  swap: [
    { w: 'sin', f: 500, f2: 900, dur: 0.09, vol: 0.3 },
    { w: 'sin', f: 900, f2: 500, dur: 0.09, vol: 0.2, delay: 0.08 },
  ],
  bomb: [
    { w: 'noise', f: 3500, dur: 0.75, vol: 0.85, lp: 0.12, curve: 2 },
    { w: 'sin', f: 140, f2: 35, dur: 0.6, vol: 0.7 },
  ],
  lightning: [
    { w: 'saw', f: 2200, f2: 120, dur: 0.5, vol: 0.32, vib: { rate: 70, depth: 0.35 } },
    { w: 'noise', f: 14000, dur: 0.4, vol: 0.35, lp: 0.6, curve: 1.2 },
    { w: 'sin', f: 90, f2: 40, dur: 0.5, vol: 0.5 },
  ],
  fire: [
    { w: 'noise', f: 2500, dur: 0.6, vol: 0.45, lp: 0.3, attack: 0.04, curve: 1 },
    { w: 'saw', f: 160, f2: 420, dur: 0.35, vol: 0.18 },
  ],
  rainbow: arp('tri', [784, 988, 1175, 1568, 1976], 0.045, 0.22, 0.25),
  ice: [
    { w: 'noise', f: 16000, dur: 0.12, vol: 0.3, lp: 0.8 },
    { w: 'sin', f: 2600, f2: 1800, dur: 0.1, vol: 0.18 },
  ],
  vine: [
    { w: 'noise', f: 2500, dur: 0.1, vol: 0.35, lp: 0.4 },
    { w: 'tri', f: 300, f2: 150, dur: 0.1, vol: 0.25 },
  ],
  stone: [
    { w: 'noise', f: 1200, dur: 0.25, vol: 0.5, lp: 0.2 },
    { w: 'sin', f: 120, f2: 60, dur: 0.2, vol: 0.4 },
  ],
  rescue: [
    { w: 'sin', f: 1400, f2: 2200, dur: 0.09, vol: 0.28, vib: { rate: 30, depth: 0.05 } },
    { w: 'sin', f: 1700, f2: 2600, dur: 0.12, vol: 0.28, delay: 0.1, vib: { rate: 30, depth: 0.05 } },
  ],
  star: [
    { w: 'tri', f: 1046, dur: 0.12, vol: 0.32, curve: 0.6 },
    { w: 'tri', f: 1568, dur: 0.3, vol: 0.28, delay: 0.08 },
    { w: 'noise', f: 15000, dur: 0.15, vol: 0.08, delay: 0.05 },
  ],
  combo: arp('sq', [659, 784, 1046], 0.06, 0.12, 0.14),
  win: [
    ...arp('tri', [523, 659, 784, 1046], 0.12, 0.2, 0.35),
    { w: 'sq', f: 1319, dur: 0.6, vol: 0.14, delay: 0.48, vib: { rate: 6, depth: 0.02 } },
    { w: 'tri', f: 262, dur: 0.9, vol: 0.3, delay: 0.48 },
    { w: 'sin', f: 784, dur: 0.8, vol: 0.2, delay: 0.48 },
  ],
  lose: [
    { w: 'tri', f: 523, dur: 0.22, vol: 0.32, curve: 0.5 },
    { w: 'tri', f: 466, dur: 0.22, vol: 0.32, delay: 0.22, curve: 0.5 },
    { w: 'tri', f: 415, dur: 0.22, vol: 0.32, delay: 0.44, curve: 0.5 },
    { w: 'tri', f: 392, dur: 0.7, vol: 0.32, delay: 0.66, vib: { rate: 5, depth: 0.03 } },
  ],
  buy: arp('sq', [784, 1046, 1568], 0.07, 0.18, 0.16),
  unlock: [
    ...arp('tri', [523, 659, 784, 1046, 1319], 0.09, 0.2, 0.3),
    { w: 'sin', f: 2093, dur: 0.5, vol: 0.12, delay: 0.45, vib: { rate: 8, depth: 0.02 } },
  ],
  error: [
    { w: 'sq', f: 200, dur: 0.1, vol: 0.2 },
    { w: 'sq', f: 160, dur: 0.14, vol: 0.2, delay: 0.11 },
  ],
  tick: [{ w: 'sin', f: 2000, dur: 0.025, vol: 0.15 }],
};
