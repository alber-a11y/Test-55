/**
 * Minimal step sequencer: tracks are written as 16th-note token strings and
 * synthesized live with oscillators, so games ship with zero audio files.
 * Tokens: note ("C5", "F#4"), chord ("C4+E4+G4"), "." rest, "_" hold, "x" hit (drums).
 */

export interface Track {
  bpm: number;
  lead: string;
  bass: string;
  pad?: string;
  /** Optional second melodic voice (counter-melody / arpeggio). */
  arp?: string;
  kick: string;
  snare: string;
  hat: string;
  leadVol?: number;
  leadWave?: OscillatorType;
  bassWave?: OscillatorType;
  padWave?: OscillatorType;
  arpWave?: OscillatorType;
  arpVol?: number;
  bassVol?: number;
  padVol?: number;
  drumVol?: number;
  /** 0..0.5 — delays every odd 16th by this fraction of a step (swing feel). */
  swing?: number;
  /** Lead low-pass cutoff (Hz). */
  leadCutoff?: number;
}

const NOTE_IDX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteFreq(name: string, transpose = 0): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) return 440;
  let n = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  n += (parseInt(m[3], 10) + 1) * 12 + transpose;
  return 440 * Math.pow(2, (n - 69) / 12);
}

export const rep = (s: string, n: number): string => Array(n).fill(s.trim()).join(' ');

/** Builds a bass line from chord roots: `pattern(root, rootOctaveUp)` returns 16 tokens per root. */
export const bassLine = (roots: string[], pattern: (r: string, hi: string) => string): string =>
  roots
    .map((r) => {
      const oct = parseInt(r.slice(-1), 10);
      const hi = r.slice(0, -1) + (oct + 1);
      return pattern(r, hi);
    })
    .join(' ');

/** One chord per bar, held for the whole bar. */
export const padLine = (chords: string[]): string => chords.map((c) => `${c} ${rep('_', 15)}`).join(' ');

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

interface Parsed {
  lead: (Step | null)[];
  bass: (Step | null)[];
  pad: (Step | null)[];
  arp: (Step | null)[];
  kick: string[];
  snare: string[];
  hat: string[];
}

export class MusicPlayer {
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private parsed: Parsed | null = null;
  private track: Track | null = null;
  private noise: AudioBuffer;
  current = '';

  constructor(private ctx: BaseAudioContext, private out: AudioNode, private tracks: Record<string, Track>) {
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  private load(name: string, transpose: number): boolean {
    const tr = this.tracks[name];
    if (!tr) return false;
    this.track = tr;
    this.parsed = {
      lead: parseVoice(tr.lead, transpose),
      bass: parseVoice(tr.bass, transpose),
      pad: parseVoice(tr.pad, transpose),
      arp: parseVoice(tr.arp, transpose),
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
      const i = this.step % total;
      const sw = i % 2 === 1 ? (this.track.swing ?? 0) * stepDur : 0;
      this.scheduleStep(i, this.nextTime + sw, stepDur);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private steps(): number {
    return this.parsed!.lead.length || this.parsed!.kick.length;
  }

  private scheduleStep(i: number, t: number, stepDur: number): void {
    const p = this.parsed!;
    const tr = this.track!;
    const lead = p.lead[i];
    if (lead) this.tone(t, lead.freqs, lead.len * stepDur, tr.leadWave ?? 'square', tr.leadVol ?? 0.07, tr.leadCutoff ?? 2600);
    const arp = p.arp[i % (p.arp.length || 1)];
    if (arp) this.tone(t, arp.freqs, arp.len * stepDur, tr.arpWave ?? 'triangle', tr.arpVol ?? 0.04, 3000);
    const bass = p.bass[i % (p.bass.length || 1)];
    if (bass) this.tone(t, bass.freqs, bass.len * stepDur * 0.9, tr.bassWave ?? 'triangle', tr.bassVol ?? 0.22, 1200);
    const pad = p.pad[i % (p.pad.length || 1)];
    if (pad) this.tone(t, pad.freqs, pad.len * stepDur, tr.padWave ?? 'sawtooth', tr.padVol ?? 0.022, 900, 0.08);
    const dv = tr.drumVol ?? 1;
    if (dv > 0) {
      if (p.kick[i % p.kick.length] === 'x') this.kick(t, dv);
      if (p.snare[i % p.snare.length] === 'x') this.snare(t, dv);
      if (p.hat[i % p.hat.length] === 'x') this.hat(t, dv);
    }
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

  private kick(t: number, v: number): void {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.5 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.18);
  }

  private snare(t: number, v: number): void {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    s.connect(f).connect(g).connect(this.out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + 0.15);
  }

  private hat(t: number, v: number): void {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.07 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    s.connect(f).connect(g).connect(this.out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + 0.05);
  }
}
