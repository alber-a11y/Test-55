/**
 * Live tropical step sequencer: marimba, steel drum, plucked bass and latin
 * percussion synthesized with oscillators — the game ships no audio files.
 * Melody tokens: note ("C5", "Bb4"), "." rest, "_" hold. Drum tokens: "x" hit,
 * "o" soft hit, "h"/"l" high/low conga, "." rest.
 */

type Instrument = 'marimba' | 'steel' | 'pluck';

interface Track {
  bpm: number;
  lead: string;
  leadInst: Instrument;
  chords: string[];
  /** 16-step chord stab pattern ("x" = hit). */
  stab: string;
  /** 16-step bass pattern: "r" root, "f" fifth, "o" octave, "." rest. */
  bass: string;
  kick: string;
  conga: string;
  shaker: string;
  clave: string;
}

const NOTE_IDX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function midi(name: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) return 69;
  return NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
}

const freq = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Chord name like "C", "Am", "Bb", "F#m" → midi notes (root around octave 3). */
function chordNotes(ch: string): number[] {
  const m = /^([A-G])(#|b)?(m?)$/.exec(ch)!;
  const root = midi(`${m[1]}${m[2] ?? ''}3`);
  const third = m[3] ? 3 : 4;
  return [root, root + third, root + 7];
}

const TRACKS: Record<string, Track> = {
  menu: {
    bpm: 108,
    leadInst: 'steel',
    lead: [
      'E5 . G5 . C6 . . A5 G5 . E5 . G5 . . .',
      'A5 . . G5 E5 . C5 . D5 . E5 . . . . .',
      'F5 . A5 . C6 . . A5 G5 . F5 . A5 . . .',
      'G5 . . F5 D5 . B4 . D5 . G5 . . . . .',
      'E5 . G5 . C6 . . D6 E6 . D6 . C6 . . .',
      'A5 . . C6 A5 . E5 . G5 . A5 . . . . .',
      'F5 . E5 . D5 . F5 . A5 . G5 . F5 . D5 .',
      'G5 . . . B5 . . . C6 _ _ _ . . . .',
    ].join(' '),
    chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'],
    stab: '. . x . . x . x . . x . . x . .',
    bass: 'r . . f . . r . o . . f . . r .',
    kick: 'x . . . . . . . x . . . . . . .',
    conga: 'l . . h h . l . l . h . h . h h',
    shaker: 'x o o x o o x o x o o x o o x o',
    clave: 'x . . x . . x . . . x . x . . .',
  },
  game: {
    bpm: 120,
    leadInst: 'marimba',
    lead: [
      'A5 . C6 . A5 . F5 . G5 . A5 . . . C6 .',
      'D6 . C6 . A5 . F5 . D5 . F5 . A5 . . .',
      'Bb5 . A5 . G5 . F5 . D5 . F5 . G5 . . .',
      'E5 . G5 . C6 . . . Bb5 . A5 . G5 . . .',
      'A5 . C6 . F6 . . . E6 . D6 . C6 . A5 .',
      'D6 . . . A5 . . . F5 . A5 . D6 . . .',
      'D6 . C6 . Bb5 . A5 . G5 . A5 . Bb5 . C6 .',
      'E6 . . . C6 . . . F6 _ _ _ . . . .',
    ].join(' '),
    chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C'],
    stab: '. . x . x . . x . . x . x . . x',
    bass: 'r . . r . . f . r . . r . . o .',
    kick: 'x . . . x . . . x . . . x . . .',
    conga: 'h . l l h . l . h . l l h . l h',
    shaker: 'x o x o x o x o x o x o x o x o',
    clave: 'x . . x . . x . . . x . x . . .',
  },
  game2: {
    bpm: 126,
    leadInst: 'steel',
    lead: [
      'B5 B5 . D6 . B5 . G5 A5 . B5 . . G5 . .',
      'E5 . G5 . B5 . . E6 D6 . B5 . G5 . . .',
      'C6 C6 . E6 . C6 . G5 A5 . C6 . . A5 . .',
      'D6 . . F#5 A5 . D6 . C6 . A5 . F#5 . . .',
      'G5 . B5 . D6 . G6 . F#6 . D6 . B5 . . .',
      'E6 . D6 . B5 . G5 . E5 . G5 . B5 . . .',
      'C6 . B5 . A5 . G5 . A5 . B5 . C6 . D6 .',
      'F#6 . . . A5 . . . G5 _ _ _ . . . .',
    ].join(' '),
    chords: ['G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'D'],
    stab: 'x . . x . . x . . x . . x . x .',
    bass: 'r . r . f . r . r . r . o . f .',
    kick: 'x . . . x . . . x . . . x . x .',
    conga: 'l . h . h l h . l . h . h l h h',
    shaker: 'x o o x x o o x x o o x x o x o',
    clave: '. . x . x . . . x . . x . . x .',
  },
};

interface Step {
  note: number;
  len: number;
}

function parseLead(src: string): (Step | null)[] {
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
    last = { note: midi(t), len: 1 };
    steps[i] = last;
  });
  return steps;
}

const pat = (s: string) => s.trim().split(/\s+/);

export class MusicPlayer {
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private track: Track | null = null;
  private lead: (Step | null)[] = [];
  private noise: AudioBuffer;
  private bus: GainNode;
  current = '';

  constructor(private ctx: BaseAudioContext, out: AudioNode) {
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.9;
    this.bus.connect(out);
  }

  play(name: string): void {
    if (this.current === name && this.timer !== null) return;
    this.stop();
    const tr = TRACKS[name];
    if (!tr) return;
    this.track = tr;
    this.lead = parseLead(tr.lead);
    this.current = name;
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
    if (!this.track) return;
    if (this.ctx.state !== 'running') {
      // Context suspended (muted / ad) — keep the clock in sync so we do not burst on resume.
      this.nextTime = this.ctx.currentTime + 0.05;
      return;
    }
    const stepDur = 60 / this.track.bpm / 4;
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.02;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.scheduleStep(this.step % this.lead.length, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private scheduleStep(i: number, t: number, stepDur: number): void {
    const tr = this.track!;
    const s16 = i % 16;
    const bar = Math.floor(i / 16) % tr.chords.length;
    const chord = chordNotes(tr.chords[bar]);
    // Light swing on off-beat 16ths gives the calypso feel.
    const tt = s16 % 2 === 1 ? t + stepDur * 0.12 : t;

    const lead = this.lead[i];
    if (lead) this.instrument(tr.leadInst, tt, lead.note, lead.len * stepDur, 0.16);

    if (pat(tr.stab)[s16] === 'x') {
      for (const n of chord) this.instrument('marimba', tt, n + 12, stepDur * 1.5, 0.05);
    }
    const b = pat(tr.bass)[s16];
    if (b !== '.') {
      const root = chord[0] - 12;
      const n = b === 'f' ? root + 7 : b === 'o' ? root + 12 : root;
      this.bass(tt, n, stepDur * 1.8);
    }
    const k = pat(tr.kick)[s16];
    if (k === 'x') this.kick(t);
    const c = pat(tr.conga)[s16];
    if (c === 'h' || c === 'l') this.conga(tt, c === 'h');
    const sh = pat(tr.shaker)[s16];
    if (sh !== '.') this.shaker(tt, sh === 'x' ? 0.06 : 0.03);
    if (pat(tr.clave)[s16] === 'x') this.clave(tt);
  }

  private env(t: number, peak: number, decay: number, attack = 0.003): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(this.bus);
    return g;
  }

  private osc(type: OscillatorType, f: number, t: number, dur: number, dest: AudioNode): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  private instrument(inst: Instrument, t: number, note: number, dur: number, vol: number): void {
    const f = freq(note);
    if (inst === 'marimba') {
      const decay = Math.min(0.6, 0.18 + dur);
      this.osc('sine', f, t, decay, this.env(t, vol, decay));
      this.osc('sine', f * 4, t, 0.08, this.env(t, vol * 0.35, 0.06));
      this.osc('sine', f * 10, t, 0.03, this.env(t, vol * 0.08, 0.02));
    } else if (inst === 'steel') {
      const decay = Math.min(1.0, 0.35 + dur);
      const g = this.env(t, vol * 0.8, decay, 0.004);
      const o1 = this.osc('sine', f, t, decay, g);
      o1.frequency.setValueAtTime(f * 1.012, t);
      o1.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      this.osc('sine', f * 2.0, t, decay * 0.6, this.env(t, vol * 0.4, decay * 0.6));
      this.osc('sine', f * 3.01, t, decay * 0.35, this.env(t, vol * 0.15, decay * 0.35));
      this.osc('triangle', f * 0.5, t, 0.1, this.env(t, vol * 0.15, 0.08));
    } else {
      const fl = this.ctx.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.setValueAtTime(3000, t);
      fl.frequency.exponentialRampToValueAtTime(500, t + 0.2);
      fl.connect(this.env(t, vol * 0.6, 0.3));
      this.osc('sawtooth', f, t, 0.3, fl);
    }
  }

  private bass(t: number, note: number, dur: number): void {
    const f = freq(note);
    const fl = this.ctx.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.setValueAtTime(900, t);
    fl.frequency.exponentialRampToValueAtTime(220, t + dur);
    fl.connect(this.env(t, 0.32, dur, 0.005));
    this.osc('triangle', f, t, dur, fl);
    this.osc('sine', f, t, dur, this.env(t, 0.2, dur));
  }

  private kick(t: number): void {
    const g = this.env(t, 0.45, 0.18, 0.002);
    const o = this.osc('sine', 120, t, 0.2, g);
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
  }

  private conga(t: number, high: boolean): void {
    const f0 = high ? 330 : 220;
    const g = this.env(t, high ? 0.2 : 0.24, 0.16, 0.002);
    const o = this.osc('sine', f0, t, 0.18, g);
    o.frequency.setValueAtTime(f0 * 1.25, t);
    o.frequency.exponentialRampToValueAtTime(f0, t + 0.03);
  }

  private noiseHit(t: number, type: BiquadFilterType, f: number, vol: number, dur: number): void {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const fl = this.ctx.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = f;
    s.connect(fl).connect(this.env(t, vol, dur, 0.004));
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  private shaker(t: number, vol: number): void {
    this.noiseHit(t, 'highpass', 7000, vol, 0.05);
  }

  private clave(t: number): void {
    this.osc('sine', 2500, t, 0.05, this.env(t, 0.09, 0.04, 0.001));
  }
}
