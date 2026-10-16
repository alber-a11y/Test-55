/**
 * Minimal step sequencer: tracks are written as 16th-note token strings and
 * synthesized live with oscillators, so the game ships with zero audio files.
 * Tokens: note ("C5", "F#4"), chord ("C4+E4+G4"), "." rest, "_" hold, "x" hit (drums).
 */

export interface Track {
  bpm: number;
  lead: string;
  bass: string;
  pad?: string;
  kick: string;
  snare: string;
  hat: string;
  leadVol?: number;
}

const NOTE_IDX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteFreq(name: string, transpose = 0): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) return 440;
  let n = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  n += (parseInt(m[3], 10) + 1) * 12 + transpose;
  return 440 * Math.pow(2, (n - 69) / 12);
}

const rep = (s: string, n: number) => Array(n).fill(s.trim()).join(' ');
const bassLine = (roots: string[], pattern: (r: string, hi: string) => string) =>
  roots
    .map((r) => {
      const oct = parseInt(r.slice(-1), 10);
      const hi = r.slice(0, -1) + (oct + 1);
      return pattern(r, hi);
    })
    .join(' ');

export const TRACKS: Record<string, Track> = {
  menu: {
    bpm: 116,
    lead: [
      'E5 . G5 . C6 . G5 . A5 _ G5 . E5 . D5 .',
      'C5 . E5 . A5 . E5 . G5 _ _ . E5 . C5 .',
      'A4 . C5 . F5 . C5 . E5 _ D5 . C5 . A4 .',
      'B4 . D5 . G5 _ _ . F5 . E5 . D5 . B4 .',
      'E5 . G5 . C6 . G5 . A5 _ G5 . E5 . G5 .',
      'A5 . G5 . E5 . C5 . D5 _ _ . E5 . C5 .',
      'A4 . C5 . F5 . A5 . G5 _ F5 . E5 . D5 .',
      'D5 . E5 . F5 . G5 . C5 _ _ _ . . . .',
    ].join(' '),
    bass: bassLine(['C3', 'A2', 'F2', 'G2', 'C3', 'A2', 'F2', 'G2'], (r, hi) => `${r} . ${hi} . ${r} . ${hi} . ${r} . ${hi} . ${r} . ${hi} .`),
    pad: [
      'C4+E4+G4', 'A3+C4+E4', 'F3+A3+C4', 'G3+B3+D4',
      'C4+E4+G4', 'A3+C4+E4', 'F3+A3+C4', 'G3+B3+D4',
    ].map((c) => `${c} _ _ _ _ _ _ _ ${c} _ _ _ _ _ _ _`).join(' '),
    kick: rep('x . . . x . . . x . . . x . . .', 8),
    snare: rep('. . . . x . . . . . . . x . . .', 8),
    hat: rep('. . x . . . x . . . x . . . x .', 8),
    leadVol: 0.07,
  },
  battle: {
    bpm: 136,
    lead: [
      'A4 . C5 . E5 . A5 . G5 . E5 . C5 . E5 .',
      'F5 _ _ . E5 . C5 . A4 . C5 . F5 . E5 .',
      'E5 . G5 . C6 _ _ . B5 . G5 . E5 . G5 .',
      'D5 . B4 . G4 . B4 . D5 _ G5 _ F5 . D5 .',
      'A4 . C5 . E5 . A5 . G5 . E5 . C5 . E5 .',
      'F5 _ _ . E5 . C5 . A4 . C5 . F5 . A5 .',
      'G5 . E5 . C5 . E5 . G5 _ C6 _ B5 . G5 .',
      'D5 . E5 . F5 . G5 . A5 _ _ _ G5 _ _ _',
    ].join(' '),
    bass: bassLine(['A2', 'F2', 'C3', 'G2', 'A2', 'F2', 'C3', 'G2'], (r, hi) => `${r} . ${r} ${hi} ${r} . ${r} ${hi} ${r} . ${r} ${hi} ${r} . ${r} ${hi}`),
    pad: ['A3+C4+E4', 'F3+A3+C4', 'C4+E4+G4', 'G3+B3+D4']
      .concat(['A3+C4+E4', 'F3+A3+C4', 'C4+E4+G4', 'G3+B3+D4'])
      .map((c) => `${c} _ _ _ _ _ _ _ _ _ _ _ _ _ _ _`)
      .join(' '),
    kick: rep('x . . . x . . x x . . . x . . .', 8),
    snare: rep('. . . . x . . . . . . . x . x .', 8),
    hat: rep('x . x . x . x . x . x . x . x x', 8),
    leadVol: 0.065,
  },
  boss: {
    bpm: 150,
    lead: [
      'E5 . . E5 G5 . E5 . B5 . A5 . G5 . F#5 .',
      'F5 . . F5 A5 . F5 . C6 _ _ . A5 . F5 .',
      'E5 . G5 . B5 . E6 _ _ . D6 . B5 . G5 .',
      'F#5 . A5 . D6 _ _ . C6 . A5 . F#5 . D5 .',
    ].join(' '),
    bass: bassLine(['E2', 'F2', 'E2', 'D2'], (r, hi) => `${r} ${r} ${hi} ${r} ${r} ${r} ${hi} ${r} ${r} ${r} ${hi} ${r} ${r} ${hi} ${r} ${hi}`),
    pad: ['E3+G3+B3', 'F3+A3+C4', 'E3+G3+B3', 'D3+F#3+A3'].map((c) => `${c} _ _ _ _ _ _ _ _ _ _ _ _ _ _ _`).join(' '),
    kick: rep('x . x . x . x . x . x . x . x .', 4),
    snare: rep('. . . . x . . . . . . . x . . x', 4),
    hat: rep('x x x x x x x x x x x x x x x x', 4),
    leadVol: 0.07,
  },
};

interface Step {
  freqs: number[];
  len: number;
}

function parseVoice(src: string | undefined, transpose: number): (Step | null)[] {
  if (!src) return [];
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

export class MusicPlayer {
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private parsed: { lead: (Step | null)[]; bass: (Step | null)[]; pad: (Step | null)[]; kick: string[]; snare: string[]; hat: string[] } | null =
    null;
  private track: Track | null = null;
  private noise: AudioBuffer;
  current = '';

  constructor(private ctx: BaseAudioContext, private out: AudioNode) {
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  private load(name: string, transpose: number): boolean {
    const tr = TRACKS[name];
    if (!tr) return false;
    this.track = tr;
    this.parsed = {
      lead: parseVoice(tr.lead, transpose),
      bass: parseVoice(tr.bass, transpose),
      pad: parseVoice(tr.pad, transpose),
      kick: tr.kick.split(/\s+/),
      snare: tr.snare.split(/\s+/),
      hat: tr.hat.split(/\s+/),
    };
    return true;
  }

  play(name: string, transpose = 0): void {
    const key = `${name}:${transpose}`;
    if (this.current === key && this.timer !== null) return;
    this.stop();
    if (!this.load(name, transpose)) return;
    this.current = key;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
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
      // Context suspended (muted / ad) — keep the clock in sync so we do not burst on resume.
      this.nextTime = this.ctx.currentTime + 0.05;
      return;
    }
    const stepDur = 60 / this.track.bpm / 4;
    const total = this.steps();
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.02;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.scheduleStep(this.step % total, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private steps(): number {
    return this.parsed!.lead.length || this.parsed!.kick.length;
  }

  private scheduleStep(i: number, t: number, stepDur: number): void {
    const p = this.parsed!;
    {
      const lead = p.lead[i];
      if (lead) this.tone(t, lead.freqs, lead.len * stepDur, 'square', this.track!.leadVol ?? 0.07, 2600);
      const bass = p.bass[i % (p.bass.length || 1)];
      if (bass) this.tone(t, bass.freqs, bass.len * stepDur * 0.9, 'triangle', 0.22, 1200);
      const pad = p.pad[i % (p.pad.length || 1)];
      if (pad) this.tone(t, pad.freqs, pad.len * stepDur, 'sawtooth', 0.022, 900, 0.08);
      if (p.kick[i % p.kick.length] === 'x') this.kick(t);
      if (p.snare[i % p.snare.length] === 'x') this.snare(t);
      if (p.hat[i % p.hat.length] === 'x') this.hat(t);
    }
  }

  /**
   * Schedule `loops` full repetitions of a track starting at t=0 (offline export).
   * Returns the duration of the scheduled music in seconds.
   */
  scheduleLoops(name: string, loops: number): number {
    if (!this.load(name, 0)) return 0;
    const stepDur = 60 / this.track!.bpm / 4;
    const total = this.steps();
    for (let k = 0; k < loops * total; k++) this.scheduleStep(k % total, k * stepDur, stepDur);
    return loops * total * stepDur;
  }

  /** Seconds in one loop of a track. */
  static loopSeconds(name: string): number {
    const tr = TRACKS[name];
    return (tr.lead.trim().split(/\s+/).length * 60) / tr.bpm / 4;
  }

  private tone(t: number, freqs: number[], dur: number, type: OscillatorType, vol: number, cutoff: number, attack = 0.005): void {
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur + 0.04);
    f.connect(g).connect(this.out);
    for (const fr of freqs) {
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.value = fr;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.06);
    }
  }

  private kick(t: number): void {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.18);
  }

  private snare(t: number): void {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    s.connect(f).connect(g).connect(this.out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + 0.15);
  }

  private hat(t: number): void {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    s.connect(f).connect(g).connect(this.out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + 0.05);
  }
}
