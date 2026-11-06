/**
 * Small step sequencer with soft "cozy" instruments (music box, piano, pluck, flute, pad, bass)
 * and a generated reverb. Tracks are token strings, one token per 16th note:
 * "C5" note, "C4+E4+G4" chord, "_" hold previous, "." rest. Drums: "x" hit.
 */

type Inst = 'bell' | 'piano' | 'pluck' | 'flute' | 'pad' | 'bass';

interface Voice {
  inst: Inst;
  notes: string;
  vol: number;
}

export interface Track {
  /** Quarter notes per minute; one token = a 16th. */
  bpm: number;
  voices: Voice[];
  shaker?: string;
  rim?: string;
  kick?: string;
  /** Reverb send 0..1. */
  wet?: number;
}

const NOTE_IDX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteFreq(name: string, transpose = 0): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) return 440;
  let n = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  n += (parseInt(m[3], 10) + 1) * 12 + transpose;
  return 440 * Math.pow(2, (n - 69) / 12);
}

const bars = (...b: string[]) => b.join(' ');
const each = (chords: string[], pattern: (c: string) => string) => chords.map(pattern).join(' ');
const rep = (s: string, n: number) => Array(n).fill(s.trim()).join(' ');

/* ---------- tracks ---------- */

// Home: a gentle waltz in F (12 sixteenths per bar).
const homeChords = ['A3+C4+F4', 'A3+D4+F4', 'Bb3+D4+F4', 'Bb3+C4+E4', 'A3+C4+F4', 'A3+C4+E4', 'Bb3+D4+F4', 'G3+C4+E4'];
const homeBass = ['F2', 'D2', 'Bb1', 'C2', 'F2', 'A1', 'Bb1', 'C2'];

// Level: light, bouncy 4/4 in C.
const levelChords = ['C4+E4+G4', 'A3+C4+E4', 'A3+C4+F4', 'B3+D4+G4', 'C4+E4+G4', 'B3+E4+G4', 'A3+C4+F4', 'B3+D4+G4'];
const levelBass = ['C2', 'A1', 'F2', 'G2', 'C2', 'E2', 'F2', 'G2'];
const hi = (n: string) => n.slice(0, -1) + (parseInt(n.slice(-1), 10) + 1);

// Room: calm piano arpeggios in G.
const roomArps = [
  'G3 B3 D4 G4 B4 G4 D4 B3',
  'E3 G3 B3 E4 G4 E4 B3 G3',
  'C3 E3 G3 C4 E4 C4 G3 E3',
  'D3 F#3 A3 D4 F#4 D4 A3 F#3',
  'G3 B3 D4 G4 B4 G4 D4 B3',
  'B2 D3 F#3 B3 D4 B3 F#3 D3',
  'C3 E3 G3 C4 E4 C4 G3 E3',
  'D3 F#3 A3 D4 F#4 D4 A3 F#3',
];

export const TRACKS: Record<string, Track> = {
  home: {
    bpm: 96,
    wet: 0.35,
    voices: [
      {
        inst: 'bell',
        vol: 0.16,
        notes: bars(
          'A5 _ _ _ C6 _ _ _ A5 _ G5 _',
          'F5 _ _ _ _ _ D5 _ E5 _ F5 _',
          'G5 _ _ _ Bb5 _ _ _ A5 _ G5 _',
          'E5 _ _ _ _ _ _ _ . . . .',
          'A5 _ _ _ C6 _ _ _ D6 _ C6 _',
          'C6 _ _ _ A5 _ _ _ E5 _ A5 _',
          'G5 _ _ _ F5 _ _ _ E5 _ D5 _',
          'E5 _ _ _ G5 _ _ _ F5 _ _ _',
        ),
      },
      { inst: 'piano', vol: 0.07, notes: each(homeChords, (c) => `. . . . ${c} _ _ _ ${c} _ _ _`) },
      { inst: 'bass', vol: 0.2, notes: each(homeBass, (r) => `${r} _ _ _ _ _ _ _ ${hi(r)} _ _ _`) },
      {
        inst: 'flute',
        vol: 0.05,
        notes: bars(rep('. . . . . . . . . . . .', 4), 'F4 _ _ _ _ _ _ _ _ _ _ _', 'E4 _ _ _ _ _ _ _ _ _ _ _', 'D4 _ _ _ _ _ _ _ _ _ _ _', 'C4 _ _ _ _ _ _ _ _ _ _ _'),
      },
    ],
  },
  level: {
    bpm: 104,
    wet: 0.22,
    voices: [
      {
        inst: 'pluck',
        vol: 0.14,
        notes: bars(
          'E5 . G5 . C6 . G5 . A5 . G5 . E5 . D5 .',
          'C5 . E5 . A5 _ _ . G5 . E5 . C5 . . .',
          'F5 . A5 . C6 . A5 . G5 . F5 . E5 . F5 .',
          'D5 . G5 . B5 _ _ . A5 . G5 . F5 . D5 .',
          'E5 . G5 . C6 . E6 . D6 . C6 . B5 . C6 .',
          'B5 . G5 . E5 _ _ . G5 . B5 . E6 . . .',
          'A5 . F5 . C6 . A5 . G5 . A5 . F5 . A5 .',
          'G5 _ _ . D5 . G5 . B4 . D5 . G5 _ _ _',
        ),
      },
      { inst: 'piano', vol: 0.06, notes: each(levelChords, (c) => `. . ${c} _ . . ${c} _ . . ${c} _ . . ${c} _`) },
      { inst: 'bass', vol: 0.22, notes: each(levelBass, (r) => `${r} _ _ . ${hi(r)} . . . ${r} _ _ . ${hi(r)} . ${r} .`) },
    ],
    kick: rep('x . . . . . . . x . . . . . . .', 8),
    rim: rep('. . . . x . . . . . . . x . . .', 8),
    shaker: rep('x . x . x . x . x . x . x . x .', 8),
  },
  room: {
    bpm: 80,
    wet: 0.4,
    voices: [
      { inst: 'piano', vol: 0.09, notes: roomArps.map((a) => `${a} ${a}`).join(' ') },
      {
        inst: 'bell',
        vol: 0.12,
        notes: bars(
          'B5 _ _ _ _ _ _ _ A5 _ _ _ G5 _ _ _',
          'B5 _ _ _ _ _ _ _ D6 _ _ _ B5 _ _ _',
          'C6 _ _ _ B5 _ _ _ A5 _ _ _ G5 _ _ _',
          'A5 _ _ _ _ _ _ _ F#5 _ _ _ . . . .',
          'B5 _ _ _ D6 _ _ _ G6 _ _ _ F#6 _ _ _',
          'D6 _ _ _ _ _ _ _ B5 _ _ _ D6 _ _ _',
          'E6 _ _ _ D6 _ _ _ C6 _ _ _ B5 _ _ _',
          'A5 _ _ _ _ _ _ _ _ _ _ _ . . . .',
        ),
      },
      { inst: 'pad', vol: 0.035, notes: each(['G3+B3+D4', 'E3+G3+B3', 'C3+E3+G3', 'D3+F#3+A3', 'G3+B3+D4', 'B2+D3+F#3', 'C3+E3+G3', 'D3+F#3+A3'], (c) => `${c} ${rep('_', 15)}`) },
      { inst: 'bass', vol: 0.18, notes: each(['G2', 'E2', 'C2', 'D2', 'G2', 'B1', 'C2', 'D2'], (r) => `${r} ${rep('_', 15)}`) },
    ],
  },
};

/* ---------- player ---------- */

interface Step {
  freqs: number[];
  len: number;
}

function parseVoice(src: string, transpose: number): (Step | null)[] {
  const tokens = src.trim().split(/\s+/);
  const steps: (Step | null)[] = tokens.map(() => null);
  let last: Step | null = null;
  tokens.forEach((t, i) => {
    if (t === '_') {
      if (last) last.len += 1;
      return;
    }
    if (t === '.') {
      last = null;
      return;
    }
    const st: Step = { freqs: t.split('+').map((n) => noteFreq(n, transpose)), len: 1 };
    steps[i] = st;
    last = st;
  });
  return steps;
}

/**
 * Smooth room reverb: noise with an exponential decay that is low-passed more and more
 * over time (dark tail, no hiss), with a soft fade-in to avoid a click at the start.
 */
function makeImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const k = 0.5 - 0.42 * t; // low-pass coefficient: brighter early, darker late
    lp += ((Math.random() * 2 - 1) - lp) * k;
    const fadeIn = Math.min(1, i / (sr * 0.01));
    d[i] = lp * Math.exp(-5 * t) * fadeIn;
  }
  // Normalise the impulse energy so the wet level stays predictable.
  let e = 0;
  for (let i = 0; i < len; i++) e += d[i] * d[i];
  const g = 1 / Math.sqrt(e / 400);
  for (let i = 0; i < len; i++) d[i] *= g * 0.05;
  return buf;
}

export class MusicPlayer {
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private parsed: { voices: { v: Voice; steps: (Step | null)[] }[]; shaker: string[]; rim: string[]; kick: string[]; total: number } | null = null;
  private track: Track | null = null;
  private noise: AudioBuffer;
  private dry: GainNode;
  private wet: GainNode;
  current = '';

  constructor(private ctx: BaseAudioContext, out: AudioNode) {
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // Soft limiter on the music bus: chords stacking up never clip.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 12;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.005;
    limiter.release.value = 0.25;
    const master = ctx.createGain();
    master.gain.value = 0.9;
    limiter.connect(master).connect(out);
    this.dry = ctx.createGain();
    this.dry.connect(limiter);
    const verb = ctx.createConvolver();
    verb.normalize = false;
    verb.buffer = makeImpulse(ctx, 2.2);
    const verbTone = ctx.createBiquadFilter();
    verbTone.type = 'lowpass';
    verbTone.frequency.value = 3200;
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.3;
    this.wet.connect(verb).connect(verbTone).connect(limiter);
  }

  private load(name: string, transpose: number): boolean {
    const tr = TRACKS[name];
    if (!tr) return false;
    this.track = tr;
    const voices = tr.voices.map((v) => ({ v, steps: parseVoice(v.notes, transpose) }));
    const split = (s?: string) => (s ? s.trim().split(/\s+/) : []);
    this.parsed = {
      voices,
      shaker: split(tr.shaker),
      rim: split(tr.rim),
      kick: split(tr.kick),
      total: Math.max(...voices.map((v) => v.steps.length)),
    };
    this.wet.gain.value = tr.wet ?? 0.3;
    return true;
  }

  play(name: string, transpose = 0): void {
    const key = `${name}:${transpose}`;
    if (this.current === key && this.timer !== null) return;
    this.stop();
    if (!this.load(name, transpose)) return;
    this.current = key;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.current = '';
  }

  private tick(): void {
    if (!this.track || !this.parsed) return;
    if (this.ctx.state !== 'running') {
      this.nextTime = this.ctx.currentTime + 0.05;
      return;
    }
    const stepDur = 60 / this.track.bpm / 4;
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.02;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      this.scheduleStep(this.step % this.parsed.total, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private scheduleStep(i: number, t: number, stepDur: number): void {
    const p = this.parsed!;
    for (const { v, steps } of p.voices) {
      const st = steps[i % steps.length];
      if (st) for (const f of st.freqs) this.note(v.inst, t, f, st.len * stepDur, v.vol);
    }
    const hit = (arr: string[]) => arr.length > 0 && arr[i % arr.length] === 'x';
    if (hit(p.shaker)) this.shaker(t);
    if (hit(p.rim)) this.rim(t);
    if (hit(p.kick)) this.kick(t);
  }

  /** Offline export: schedule `loops` repetitions from t=0. Returns the duration. */
  scheduleLoops(name: string, loops: number): number {
    if (!this.load(name, 0)) return 0;
    const stepDur = 60 / this.track!.bpm / 4;
    const total = this.parsed!.total;
    for (let k = 0; k < loops * total; k++) this.scheduleStep(k % total, k * stepDur, stepDur);
    return loops * total * stepDur;
  }

  static loopSeconds(name: string): number {
    const tr = TRACKS[name];
    const total = Math.max(...tr.voices.map((v) => v.notes.trim().split(/\s+/).length));
    return (total * 60) / tr.bpm / 4;
  }

  private osc(type: OscillatorType, f: number, t: number, end: number, dest: AudioNode, detune = 0): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    o.connect(dest);
    o.start(t);
    o.stop(end);
    return o;
  }

  private note(inst: Inst, t: number, f: number, dur: number, vol: number): void {
    const g = this.ctx.createGain();
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.connect(g);
    g.connect(this.dry);
    g.connect(this.wet);
    const env = g.gain;
    env.setValueAtTime(0, t);
    switch (inst) {
      case 'bell': {
        // Music box: sine + inharmonic partial, long ring.
        filt.frequency.value = 6000;
        env.linearRampToValueAtTime(vol, t + 0.004);
        env.exponentialRampToValueAtTime(0.0005, t + 1.4);
        this.osc('sine', f, t, t + 1.5, filt);
        // The inharmonic partial fades out on its own before it stops (no click).
        const g2 = this.ctx.createGain();
        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(0.12, t + 0.004);
        g2.gain.exponentialRampToValueAtTime(0.0003, t + 0.5);
        g2.connect(filt);
        this.osc('sine', f * 2.76, t, t + 0.6, g2);
        break;
      }
      case 'piano': {
        filt.frequency.value = 2200;
        const end = t + Math.max(0.5, dur) + 0.5;
        env.linearRampToValueAtTime(vol, t + 0.006);
        env.exponentialRampToValueAtTime(vol * 0.35, t + 0.25);
        env.exponentialRampToValueAtTime(0.0005, end);
        this.osc('triangle', f, t, end + 0.05, filt);
        const g2 = this.ctx.createGain();
        g2.gain.value = 0.3;
        g2.connect(filt);
        this.osc('sine', f * 2, t, end + 0.05, g2);
        break;
      }
      case 'pluck': {
        filt.frequency.setValueAtTime(3200, t);
        filt.frequency.exponentialRampToValueAtTime(700, t + 0.3);
        env.linearRampToValueAtTime(vol, t + 0.003);
        env.exponentialRampToValueAtTime(0.0005, t + 0.45 + dur * 0.5);
        this.osc('triangle', f, t, t + 0.5 + dur, filt);
        this.osc('sine', f, t, t + 0.5 + dur, filt, 6);
        break;
      }
      case 'flute': {
        filt.frequency.value = 2400;
        env.linearRampToValueAtTime(vol, t + 0.08);
        env.setValueAtTime(vol, t + dur * 0.8);
        env.exponentialRampToValueAtTime(0.0005, t + dur + 0.2);
        const o = this.osc('sine', f, t, t + dur + 0.25, filt);
        const lfo = this.ctx.createOscillator();
        const lg = this.ctx.createGain();
        lfo.frequency.value = 5;
        lg.gain.value = f * 0.006;
        lfo.connect(lg).connect(o.frequency);
        lfo.start(t);
        lfo.stop(t + dur + 0.25);
        break;
      }
      case 'pad': {
        filt.frequency.value = 800;
        env.linearRampToValueAtTime(vol, t + 0.6);
        env.setValueAtTime(vol, t + Math.max(0.6, dur - 0.2));
        env.exponentialRampToValueAtTime(0.0005, t + dur + 0.8);
        this.osc('triangle', f, t, t + dur + 0.9, filt, -5);
        this.osc('triangle', f, t, t + dur + 0.9, filt, 5);
        break;
      }
      case 'bass': {
        filt.frequency.value = 900;
        env.linearRampToValueAtTime(vol, t + 0.01);
        env.exponentialRampToValueAtTime(vol * 0.5, t + 0.2);
        env.exponentialRampToValueAtTime(0.0005, t + dur * 0.95 + 0.1);
        this.osc('sine', f, t, t + dur + 0.15, filt);
        const g2 = this.ctx.createGain();
        g2.gain.value = 0.35;
        g2.connect(filt);
        this.osc('triangle', f * 2, t, t + dur + 0.15, g2);
        break;
      }
    }
  }

  private noiseHit(t: number, type: BiquadFilterType, freq: number, vol: number, decay: number): void {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + decay);
    s.connect(f).connect(g);
    g.connect(this.dry);
    s.start(t, Math.random() * 0.5);
    s.stop(t + decay + 0.02);
  }

  private shaker(t: number): void {
    this.noiseHit(t, 'highpass', 6500, 0.035, 0.06);
  }
  private rim(t: number): void {
    this.noiseHit(t, 'bandpass', 2200, 0.08, 0.05);
  }
  private kick(t: number): void {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.18);
    o.connect(g).connect(this.dry);
    o.start(t);
    o.stop(t + 0.2);
  }
}
