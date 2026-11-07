import { engine, mtof, note, voice } from './engine';

/**
 * Tiny step sequencer with original cheerful tunes. Every step is an eighth note; a track is
 * 8 bars long and loops. Notes are scheduled ~120 ms ahead on the audio clock, so when the
 * context is suspended (ads, hidden tab) the music simply freezes and resumes in place.
 */
interface Track {
  bpm: number;
  /** One chord per bar: [root, quality]. */
  chords: Array<[string, 'maj' | 'min']>;
  /** 8 tokens per bar: note name, '_' hold, '-' rest. */
  melody: string[];
  lead: 'mallet' | 'pluck' | 'bell';
  strum: string; // 8 chars per bar: x = chord stab
  kick: string;
  snare: string;
  hat: string;
  bass: string; // 8 chars: R = root, F = fifth, O = octave, . = rest
  swing?: number;
}

const TRACKS: Record<string, Track> = {
  menu: {
    bpm: 108,
    chords: [['C', 'maj'], ['G', 'maj'], ['A', 'min'], ['F', 'maj'], ['C', 'maj'], ['G', 'maj'], ['F', 'maj'], ['G', 'maj']],
    melody: [
      'E5 _ G5 _ C6 _ G5 E5',
      'D5 _ G5 _ B5 _ A5 G5',
      'C5 _ E5 _ A5 _ G5 E5',
      'F5 _ A5 _ G5 F5 E5 D5',
      'E5 G5 C6 _ B5 C6 D6 C6',
      'B5 _ G5 _ D5 _ G5 _',
      'A5 _ C6 _ A5 F5 G5 A5',
      'G5 _ _ _ B4 _ D5 _',
    ],
    lead: 'mallet',
    strum: '..x...x.',
    kick: 'x...x...',
    snare: '..x...x.',
    hat: 'x.x.x.x.',
    bass: 'R..FR.F.',
    swing: 0.08,
  },
  game: {
    bpm: 120,
    chords: [['G', 'maj'], ['E', 'min'], ['C', 'maj'], ['D', 'maj'], ['G', 'maj'], ['E', 'min'], ['C', 'maj'], ['D', 'maj']],
    melody: [
      'B4 D5 G5 _ F#5 G5 A5 _',
      'G5 _ E5 _ B4 _ E5 D5',
      'C5 E5 G5 _ A5 G5 E5 _',
      'D5 _ F#5 _ A5 _ F#5 _',
      'B5 _ A5 G5 A5 _ B5 _',
      'G5 _ E5 _ D5 E5 G5 _',
      'E5 _ G5 _ A5 _ G5 E5',
      'A5 _ _ _ D5 E5 F#5 _',
    ],
    lead: 'pluck',
    strum: 'x.xx.xx.',
    kick: 'x..x..x.',
    snare: '..x...x.',
    hat: 'xxxxxxxx',
    bass: 'R.RF.RO.',
    swing: 0.1,
  },
  hard: {
    bpm: 128,
    chords: [['A', 'min'], ['F', 'maj'], ['C', 'maj'], ['G', 'maj'], ['A', 'min'], ['F', 'maj'], ['C', 'maj'], ['G', 'maj']],
    melody: [
      'A4 C5 E5 A5 _ G5 E5 _',
      'F5 _ E5 _ C5 _ A4 _',
      'G4 C5 E5 G5 _ E5 C5 _',
      'B4 _ D5 _ G5 _ D5 _',
      'A5 _ E5 _ A5 B5 C6 _',
      'C6 _ A5 _ F5 _ A5 _',
      'G5 _ E5 C5 E5 _ G5 _',
      'D5 _ G5 _ B5 _ _ _',
    ],
    lead: 'bell',
    strum: 'x.x.x.x.',
    kick: 'x.x.x.x.',
    snare: '..x...xx',
    hat: '.x.x.x.x',
    bass: 'RORORFRO',
  },
};

function chordNotes(root: string, q: 'maj' | 'min'): number[] {
  const r = note(root + '4');
  const base = r > note('A4') ? r - 12 : r;
  return [base, base + (q === 'maj' ? 4 : 3), base + 7];
}

class Music {
  private current: string | null = null;
  private track: Track | null = null;
  private bus: GainNode | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | undefined;
  private loop = 0;
  private melodyNotes: Array<Array<{ m: number; len: number } | null>> = [];

  play(name: keyof typeof TRACKS): void {
    if (this.current === name) return;
    this.current = name;
    engine.onUnlock(() => this.start(name));
  }

  stop(): void {
    this.current = null;
    this.fadeOut();
    this.track = null;
  }

  private fadeOut(): void {
    if (!this.bus || !engine.ctx) return;
    const b = this.bus;
    const t = engine.ctx.currentTime;
    b.gain.setTargetAtTime(0, t, 0.15);
    window.setTimeout(() => b.disconnect(), 1200);
    this.bus = null;
  }

  private start(name: string): void {
    if (this.current !== name || !engine.ctx) return;
    this.fadeOut();
    const ctx = engine.ctx;
    this.track = TRACKS[name];
    this.bus = ctx.createGain();
    this.bus.gain.setValueAtTime(0, ctx.currentTime);
    this.bus.gain.setTargetAtTime(1, ctx.currentTime, 0.3);
    this.bus.connect(engine.music);
    this.step = 0;
    this.loop = 0;
    this.nextTime = ctx.currentTime + 0.1;
    this.melodyNotes = this.track.melody.map((bar) => {
      const toks = bar.split(/\s+/);
      const out: Array<{ m: number; len: number } | null> = new Array(8).fill(null);
      toks.forEach((tok, i) => {
        if (tok === '_' || tok === '-') return;
        let len = 1;
        while (toks[i + len] === '_') len++;
        out[i] = { m: note(tok), len };
      });
      return out;
    });
    if (this.timer === undefined) this.timer = window.setInterval(() => this.tick(), 25);
  }

  private tick(): void {
    const ctx = engine.ctx;
    const tr = this.track;
    if (!ctx || !tr || !this.bus || ctx.state !== 'running') return;
    const stepDur = 60 / tr.bpm / 2;
    while (this.nextTime < ctx.currentTime + 0.12) {
      const sw = this.step % 2 === 1 ? (tr.swing ?? 0) * stepDur : 0;
      this.schedule(tr, this.step, this.nextTime + sw, stepDur);
      this.nextTime += stepDur;
      this.step++;
      if (this.step >= tr.chords.length * 8) {
        this.step = 0;
        this.loop++;
      }
    }
  }

  private schedule(tr: Track, step: number, t: number, sd: number): void {
    const bus = this.bus!;
    const bar = Math.floor(step / 8);
    const s = step % 8;
    const [root, q] = tr.chords[bar];
    const chord = chordNotes(root, q);
    // drums
    if (tr.kick[s] === 'x') voice.kick(bus, t, 0.42);
    if (tr.snare[s] === 'x') {
      voice.noise(bus, t, 0.12, { type: 'bandpass', freq: 1800, q: 0.7, vol: 0.16 });
      voice.tone(bus, t, 220, 0.06, { type: 'triangle', vol: 0.08 });
    }
    if (tr.hat[s] === 'x') voice.noise(bus, t, 0.035, { type: 'highpass', freq: 8000, vol: s % 2 ? 0.035 : 0.055 });
    // bass
    const b = tr.bass[s];
    if (b !== '.') {
      const r = chord[0] - 24;
      const m = b === 'R' ? r : b === 'F' ? r + 7 : r + 12;
      voice.tone(bus, t, mtof(m), sd * 1.6, { type: 'triangle', vol: 0.26, attack: 0.01 });
    }
    // chord stabs
    if (tr.strum[s] === 'x') {
      chord.forEach((m, i) => voice.pluck(bus, t + i * 0.012, mtof(m), sd * 1.5, 0.045));
    }
    // melody (the second loop pass adds an octave sparkle)
    const n = this.melodyNotes[bar][s];
    if (n) {
      const dur = n.len * sd * 1.1 + 0.08;
      const f = mtof(n.m);
      if (tr.lead === 'mallet') voice.mallet(bus, t, f, dur + 0.25, 0.2);
      else if (tr.lead === 'pluck') voice.pluck(bus, t, f, dur + 0.15, 0.13);
      else {
        voice.tone(bus, t, f, dur + 0.3, { type: 'triangle', vol: 0.14 });
        voice.tone(bus, t, f * 2, dur, { type: 'sine', vol: 0.05 });
      }
      if (this.loop % 2 === 1) voice.tone(bus, t, f * 2, Math.min(0.3, dur), { type: 'sine', vol: 0.05 });
    }
  }

  /** Short victory fanfare on the sfx bus. */
  jingle(kind: 'win' | 'chest'): void {
    if (!engine.ready) return;
    const ctx = engine.ctx!;
    const d = engine.sfx;
    const t = ctx.currentTime + 0.02;
    const seq = kind === 'win' ? ['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6'] : ['G5', 'C6', 'E6', 'G6'];
    seq.forEach((n, i) => {
      const last = i === seq.length - 1;
      voice.mallet(d, t + i * 0.1, mtof(note(n)), last ? 1.2 : 0.3, 0.24);
      if (last) chordNotes('C', 'maj').forEach((m) => voice.pluck(d, t + i * 0.1, mtof(m + 12), 1.4, 0.06));
    });
    voice.noise(d, t + seq.length * 0.1 - 0.1, 0.8, { type: 'highpass', freq: 9000, vol: 0.05 });
  }
}

export const music = new Music();
