export type TrackName = 'menu' | 'levels' | 'classic';

interface Track {
  bpm: number;
  /** Root note (MIDI). */
  root: number;
  /** Chords as semitone offsets from root, one per bar. */
  chords: number[][];
  /** Scale used by the generated melody. */
  scale: number[];
  kick: number[]; // step indices (0..15)
  snare: number[];
  hat: number[];
  swing: number;
  arp: boolean;
  melodyDensity: number;
  padVol: number;
  leadType: OscillatorType;
}

const TRACKS: Record<TrackName, Track> = {
  menu: {
    bpm: 92,
    root: 60,
    chords: [
      [0, 4, 7, 11],
      [-3, 0, 4, 7],
      [-7, -3, 0, 5],
      [-5, -1, 2, 7],
    ],
    scale: [0, 2, 4, 7, 9],
    kick: [0, 8],
    snare: [12],
    hat: [4, 12],
    swing: 0.12,
    arp: true,
    melodyDensity: 0.25,
    padVol: 0.11,
    leadType: 'triangle',
  },
  levels: {
    bpm: 122,
    root: 57,
    chords: [
      [0, 3, 7, 10],
      [-4, 0, 3, 7],
      [3, 7, 10, 14],
      [-2, 2, 5, 9],
    ],
    scale: [0, 3, 5, 7, 10],
    kick: [0, 4, 8, 12],
    snare: [4, 12],
    hat: [2, 6, 10, 14],
    swing: 0,
    arp: true,
    melodyDensity: 0.4,
    padVol: 0.07,
    leadType: 'square',
  },
  classic: {
    bpm: 84,
    root: 53,
    chords: [
      [0, 4, 7, 11],
      [4, 7, 11, 14],
      [5, 9, 12, 16],
      [7, 11, 14, 17],
    ],
    scale: [0, 2, 4, 7, 9],
    kick: [0, 7, 10],
    snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
    swing: 0.2,
    arp: false,
    melodyDensity: 0.3,
    padVol: 0.12,
    leadType: 'sine',
  },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Small generative step sequencer: pad + bass + arp + melody + drums, scheduled ahead of time. */
export class Music {
  private track: Track | null = null;
  private name: TrackName | null = null;
  private step = 0;
  private bar = 0;
  private nextTime = 0;
  private timer = 0;
  private melody: (number | null)[] = [];
  private seed = 1;

  constructor(
    private ctx: AudioContext,
    private out: AudioNode,
    private noiseBuf: AudioBuffer,
  ) {}

  play(name: TrackName): void {
    if (this.name === name && this.timer) return;
    this.name = name;
    this.track = TRACKS[name];
    this.step = 0;
    this.bar = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.seed = Math.floor(Math.random() * 1e9);
    this.makeMelody();
    if (!this.timer) this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stop(): void {
    this.name = null;
    this.track = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = 0;
  }

  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  /** A 2-bar phrase repeated with variation, so the melody feels composed rather than random. */
  private makeMelody(): void {
    const tr = this.track!;
    this.melody = [];
    let idx = 2;
    for (let i = 0; i < 32; i++) {
      if (this.rand() < tr.melodyDensity && i % 2 === 0) {
        idx = Math.max(0, Math.min(tr.scale.length * 2 - 1, idx + Math.floor(this.rand() * 5) - 2));
        const oct = Math.floor(idx / tr.scale.length);
        this.melody.push(tr.scale[idx % tr.scale.length] + 12 * oct);
      } else this.melody.push(null);
    }
  }

  private schedule(): void {
    const tr = this.track;
    if (!tr || this.ctx.state !== 'running') return;
    // After a long suspend, don't try to catch up.
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05;
    const stepDur = 60 / tr.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      const swing = this.step % 2 === 1 ? tr.swing * stepDur : 0;
      this.playStep(tr, this.nextTime + swing, stepDur);
      this.nextTime += stepDur;
      this.step++;
      if (this.step === 16) {
        this.step = 0;
        this.bar++;
        if (this.bar % 8 === 0) this.makeMelody();
      }
    }
  }

  private playStep(tr: Track, t: number, sd: number): void {
    const chord = tr.chords[this.bar % tr.chords.length];
    const s = this.step;
    if (s === 0) {
      for (const n of chord) this.pad(midi(tr.root + n), t, sd * 16, tr.padVol);
    }
    // Bass on chord root.
    if (s % 4 === 0 || (tr.bpm > 110 && s % 4 === 2)) {
      this.bass(midi(tr.root - 24 + chord[0]), t, sd * (tr.bpm > 110 ? 1.6 : 3.5));
    }
    if (tr.arp && s % 2 === 0) {
      const n = chord[(s / 2) % chord.length] + 12;
      this.pluck(midi(tr.root + n), t, sd * 1.8, 0.035, 'triangle');
    }
    const m = this.melody[(this.bar % 2) * 16 + s];
    if (m !== null && m !== undefined && this.bar % 4 !== 3) {
      this.pluck(midi(tr.root + 12 + m), t, sd * 3, 0.05, tr.leadType);
    }
    if (tr.kick.includes(s)) this.kick(t);
    if (tr.snare.includes(s)) this.snare(t);
    if (tr.hat.includes(s)) this.hat(t, s % 4 === 2 ? 0.05 : 0.03);
  }

  private env(t: number, a: number, d: number, vol: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    g.connect(this.out);
    return g;
  }

  private pad(f: number, t: number, dur: number, vol: number): void {
    const g = this.env(t, dur * 0.25, dur * 0.8, vol / 3);
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 1200;
    flt.connect(g);
    for (const det of [-7, 7]) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(flt);
      o.start(t);
      o.stop(t + dur * 1.1);
    }
  }

  private bass(f: number, t: number, dur: number): void {
    const g = this.env(t, 0.01, dur, 0.22);
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private pluck(f: number, t: number, dur: number, vol: number, type: OscillatorType): void {
    const g = this.env(t, 0.005, dur, vol);
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(4000, t);
    flt.frequency.exponentialRampToValueAtTime(600, t + dur);
    flt.connect(g);
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.connect(flt);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private kick(t: number): void {
    const g = this.env(t, 0.002, 0.25, 0.5);
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.3);
  }

  private noiseHit(t: number, dur: number, vol: number, type: BiquadFilterType, freq: number): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.env(t, 0.002, dur, vol);
    src.connect(f);
    f.connect(g);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  private snare(t: number): void {
    this.noiseHit(t, 0.16, 0.12, 'bandpass', 1800);
    const g = this.env(t, 0.002, 0.08, 0.08);
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = 190;
    o.connect(g);
    o.start(t);
    o.stop(t + 0.1);
  }

  private hat(t: number, vol: number): void {
    this.noiseHit(t, 0.04, vol, 'highpass', 7000);
  }
}
