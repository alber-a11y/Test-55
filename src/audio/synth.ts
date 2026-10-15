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

export const SFX: Record<string, Layer[]> = {
  click: [{ w: 'sq', f: 900, f2: 1300, dur: 0.05, vol: 0.25 }],
  shoot: [
    { w: 'sq', f: 760, f2: 240, dur: 0.12, vol: 0.28, duty: 0.3 },
    { w: 'noise', f: 9000, dur: 0.05, vol: 0.2 },
  ],
  shotgun: [
    { w: 'noise', f: 6000, dur: 0.28, vol: 0.6, lp: 0.35, curve: 2.5 },
    { w: 'sq', f: 220, f2: 70, dur: 0.16, vol: 0.3 },
  ],
  laser: [
    { w: 'saw', f: 1400, f2: 180, dur: 0.45, vol: 0.3, vib: { rate: 30, depth: 0.08 } },
    { w: 'sin', f: 300, f2: 80, dur: 0.3, vol: 0.3 },
  ],
  throw: [{ w: 'sin', f: 280, f2: 700, dur: 0.16, vol: 0.35 }],
  explosion: [
    { w: 'noise', f: 4000, dur: 0.7, vol: 0.8, lp: 0.12, curve: 2 },
    { w: 'sin', f: 130, f2: 35, dur: 0.55, vol: 0.6 },
  ],
  hit: [
    { w: 'noise', f: 7000, dur: 0.06, vol: 0.35 },
    { w: 'sq', f: 320, f2: 150, dur: 0.07, vol: 0.2 },
  ],
  hurt: [
    { w: 'sq', f: 420, f2: 110, dur: 0.2, vol: 0.3, duty: 0.25 },
    { w: 'noise', f: 3000, dur: 0.08, vol: 0.25 },
  ],
  enemyDie: [
    { w: 'sq', f: 640, f2: 70, dur: 0.35, vol: 0.28 },
    { w: 'noise', f: 2500, dur: 0.25, vol: 0.3, lp: 0.3 },
  ],
  coin: [
    { w: 'sq', f: 988, dur: 0.07, vol: 0.2, curve: 0.5 },
    { w: 'sq', f: 1319, dur: 0.22, vol: 0.2, delay: 0.07 },
  ],
  heal: [{ w: 'tri', f: 523, f2: 1046, dur: 0.35, vol: 0.4, vib: { rate: 12, depth: 0.04 } }],
  superReady: [
    { w: 'tri', f: 523, dur: 0.07, vol: 0.35, curve: 0.5 },
    { w: 'tri', f: 659, dur: 0.07, vol: 0.35, delay: 0.06, curve: 0.5 },
    { w: 'tri', f: 784, dur: 0.07, vol: 0.35, delay: 0.12, curve: 0.5 },
    { w: 'tri', f: 1046, dur: 0.25, vol: 0.35, delay: 0.18 },
  ],
  super: [
    { w: 'saw', f: 180, f2: 950, dur: 0.32, vol: 0.3 },
    { w: 'noise', f: 5000, dur: 0.3, vol: 0.3, lp: 0.4 },
  ],
  zap: [
    { w: 'saw', f: 1600, f2: 300, dur: 0.18, vol: 0.3, vib: { rate: 60, depth: 0.3 } },
    { w: 'noise', f: 12000, dur: 0.1, vol: 0.2 },
  ],
  slash: [
    { w: 'noise', f: 14000, dur: 0.12, vol: 0.35, lp: 0.7 },
    { w: 'sin', f: 900, f2: 300, dur: 0.1, vol: 0.2 },
  ],
  flame: [{ w: 'noise', f: 3000, dur: 0.25, vol: 0.35, lp: 0.45, attack: 0.03, curve: 1 }],
  stun: [{ w: 'sq', f: 1200, dur: 0.4, vol: 0.18, vib: { rate: 16, depth: 0.25 } }],
  dash: [
    { w: 'noise', f: 8000, dur: 0.2, vol: 0.3, lp: 0.5 },
    { w: 'sin', f: 200, f2: 820, dur: 0.18, vol: 0.3 },
  ],
  teleport: [{ w: 'sin', f: 1600, f2: 200, dur: 0.3, vol: 0.35, vib: { rate: 25, depth: 0.15 } }],
  wave: [
    { w: 'sq', f: 440, dur: 0.18, vol: 0.25, curve: 0.6 },
    { w: 'sq', f: 554, dur: 0.18, vol: 0.25, delay: 0.18, curve: 0.6 },
    { w: 'sq', f: 659, dur: 0.3, vol: 0.25, delay: 0.36 },
  ],
  bossRoar: [
    { w: 'saw', f: 95, f2: 45, dur: 1.1, vol: 0.5, vib: { rate: 9, depth: 0.12 }, attack: 0.08, curve: 1 },
    { w: 'noise', f: 1500, dur: 1.0, vol: 0.4, lp: 0.15, attack: 0.1, curve: 1 },
  ],
  buy: [
    { w: 'sq', f: 784, dur: 0.07, vol: 0.2, curve: 0.5 },
    { w: 'sq', f: 1046, dur: 0.07, vol: 0.2, delay: 0.07, curve: 0.5 },
    { w: 'sq', f: 1568, dur: 0.25, vol: 0.2, delay: 0.14 },
  ],
  unlock: [
    { w: 'tri', f: 523, dur: 0.12, vol: 0.35, curve: 0.4 },
    { w: 'tri', f: 659, dur: 0.12, vol: 0.35, delay: 0.12, curve: 0.4 },
    { w: 'tri', f: 784, dur: 0.12, vol: 0.35, delay: 0.24, curve: 0.4 },
    { w: 'sq', f: 1046, dur: 0.5, vol: 0.22, delay: 0.36, vib: { rate: 7, depth: 0.02 } },
  ],
  victory: [
    { w: 'sq', f: 523, dur: 0.14, vol: 0.22, curve: 0.4 },
    { w: 'sq', f: 659, dur: 0.14, vol: 0.22, delay: 0.14, curve: 0.4 },
    { w: 'sq', f: 784, dur: 0.14, vol: 0.22, delay: 0.28, curve: 0.4 },
    { w: 'sq', f: 1046, dur: 0.6, vol: 0.22, delay: 0.42, vib: { rate: 6, depth: 0.02 } },
    { w: 'tri', f: 262, dur: 1.0, vol: 0.3, delay: 0.42 },
  ],
  defeat: [
    { w: 'sq', f: 392, dur: 0.22, vol: 0.22, curve: 0.5 },
    { w: 'sq', f: 330, dur: 0.22, vol: 0.22, delay: 0.22, curve: 0.5 },
    { w: 'sq', f: 262, dur: 0.22, vol: 0.22, delay: 0.44, curve: 0.5 },
    { w: 'sq', f: 196, dur: 0.7, vol: 0.22, delay: 0.66, vib: { rate: 5, depth: 0.03 } },
  ],
  error: [
    { w: 'sq', f: 200, dur: 0.1, vol: 0.25 },
    { w: 'sq', f: 160, dur: 0.14, vol: 0.25, delay: 0.11 },
  ],
  pickup: [{ w: 'sin', f: 800, f2: 1700, dur: 0.12, vol: 0.35 }],
  crate: [
    { w: 'noise', f: 3500, dur: 0.3, vol: 0.5, lp: 0.25 },
    { w: 'sq', f: 160, f2: 60, dur: 0.18, vol: 0.25 },
  ],
  spawn: [{ w: 'sin', f: 200, f2: 900, dur: 0.35, vol: 0.25, vib: { rate: 20, depth: 0.1 } }],
  revive: [
    { w: 'tri', f: 392, f2: 1568, dur: 0.6, vol: 0.4 },
    { w: 'sin', f: 784, f2: 1568, dur: 0.6, vol: 0.2, delay: 0.1 },
  ],
};
