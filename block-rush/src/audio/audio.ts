import { Music, type TrackName } from './music';

export type Sfx =
  | 'click'
  | 'pick'
  | 'place'
  | 'invalid'
  | 'clear'
  | 'gem'
  | 'bomb'
  | 'rocket'
  | 'hammer'
  | 'booster'
  | 'tick'
  | 'win'
  | 'lose'
  | 'coin'
  | 'combo'
  | 'whoosh'
  | 'freeze'
  | 'spin';

/**
 * All sound is synthesized with Web Audio: no files, no licenses.
 * master ─┬─ music bus
 *         └─ sfx bus
 * Muting is a set of reasons (ad, hidden tab, blur, platform); any reason silences and suspends
 * the AudioContext, so music scheduling also stops.
 */
class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  sfxBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private muteReasons = new Set<string>();
  private music: Music | null = null;
  private wantTrack: TrackName | null = null;
  musicVol = 0.6;
  sfxVol = 0.8;
  musicOn = true;
  sfxOn = true;

  /** Must be called from a user gesture (browsers block autoplay). */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      comp.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.connect(comp);
      this.sfxBus.connect(comp);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.music = new Music(this.ctx, this.musicBus, this.noiseBuf);
      this.applyVolumes();
      this.applyMute();
      if (this.wantTrack) this.music.play(this.wantTrack);
    }
    if (this.ctx.state === 'suspended' && !this.muteReasons.size) void this.ctx.resume();
  }

  setMuted(reason: string, on: boolean): void {
    if (on) this.muteReasons.add(reason);
    else this.muteReasons.delete(reason);
    this.applyMute();
  }

  private applyMute(): void {
    if (!this.ctx) return;
    const muted = this.muteReasons.size > 0;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0 : 1, now, 0.03);
    if (muted) {
      // Let the fade finish, then stop the clock entirely.
      window.setTimeout(() => {
        if (this.muteReasons.size && this.ctx?.state === 'running') void this.ctx.suspend();
      }, 120);
    } else if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    this.musicBus.gain.value = this.musicOn ? this.musicVol * 0.55 : 0;
    this.sfxBus.gain.value = this.sfxOn ? this.sfxVol : 0;
  }

  playMusic(track: TrackName | null): void {
    this.wantTrack = track;
    if (!this.music) return;
    if (track) this.music.play(track);
    else this.music.stop();
  }

  // ---------- synth primitives ----------

  private get live(): boolean {
    return !!this.ctx && this.sfxOn && this.ctx.state === 'running';
  }

  tone(
    freq: number,
    dur: number,
    opts: {
      type?: OscillatorType;
      vol?: number;
      when?: number;
      attack?: number;
      slideTo?: number;
      filter?: number;
      detune?: number;
    } = {},
  ): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + (opts.when ?? 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    const vol = opts.vol ?? 0.3;
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node: AudioNode = o;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      o.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(
    dur: number,
    opts: { vol?: number; when?: number; type?: BiquadFilterType; freq?: number; freqTo?: number; q?: number } = {},
  ): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + (opts.when ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'lowpass';
    f.frequency.setValueAtTime(opts.freq ?? 2000, t);
    if (opts.freqTo) f.frequency.exponentialRampToValueAtTime(opts.freqTo, t + dur);
    f.Q.value = opts.q ?? 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol ?? 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  // ---------- sound effects ----------

  play(name: Sfx, p: { combo?: number; size?: number; lines?: number } = {}): void {
    if (!this.live) return;
    const combo = p.combo ?? 0;
    switch (name) {
      case 'click':
        this.tone(880, 0.06, { type: 'triangle', vol: 0.18 });
        this.tone(1320, 0.05, { type: 'sine', vol: 0.08, when: 0.02 });
        break;
      case 'pick':
        this.tone(520, 0.09, { type: 'triangle', vol: 0.18, slideTo: 760 });
        break;
      case 'place': {
        const f = 300 - (p.size ?? 3) * 18;
        this.tone(f, 0.16, { type: 'sine', vol: 0.45, slideTo: f * 0.55 });
        this.noise(0.06, { vol: 0.18, freq: 1800, type: 'bandpass', q: 1.2 });
        this.tone(f * 2.5, 0.05, { type: 'triangle', vol: 0.08 });
        break;
      }
      case 'invalid':
        this.tone(180, 0.18, { type: 'square', vol: 0.08, slideTo: 120, filter: 900 });
        break;
      case 'clear': {
        // Pentatonic run, higher with every combo step.
        const base = 523.25 * Math.pow(2, Math.min(combo, 10) / 12);
        const steps = [0, 2, 4, 7, 9, 12];
        const n = 3 + Math.min(3, p.lines ?? 1);
        for (let i = 0; i < n; i++) {
          const f = base * Math.pow(2, steps[i % steps.length] / 12);
          this.tone(f, 0.22, { type: 'triangle', vol: 0.16, when: i * 0.045 });
          this.tone(f * 2, 0.12, { type: 'sine', vol: 0.05, when: i * 0.045 + 0.01 });
        }
        this.noise(0.5, { vol: 0.22, type: 'highpass', freq: 3000, when: 0.02 });
        this.noise(0.35, { vol: 0.25, type: 'lowpass', freq: 900, freqTo: 200 });
        break;
      }
      case 'combo':
        [0, 4, 7, 12].forEach((s, i) =>
          this.tone(659 * Math.pow(2, s / 12), 0.3, { type: 'sawtooth', vol: 0.06, when: i * 0.06, filter: 3000 }),
        );
        break;
      case 'gem':
        this.tone(1568, 0.25, { type: 'sine', vol: 0.2 });
        this.tone(2093, 0.3, { type: 'sine', vol: 0.15, when: 0.07 });
        this.tone(3136, 0.35, { type: 'triangle', vol: 0.06, when: 0.12 });
        break;
      case 'bomb':
        this.tone(120, 0.6, { type: 'sine', vol: 0.6, slideTo: 35 });
        this.noise(0.7, { vol: 0.5, freq: 1600, freqTo: 120 });
        break;
      case 'rocket':
        this.noise(0.5, { vol: 0.35, type: 'bandpass', freq: 600, freqTo: 4000, q: 2 });
        this.tone(200, 0.45, { type: 'sawtooth', vol: 0.07, slideTo: 900, filter: 2000 });
        break;
      case 'hammer':
        this.tone(160, 0.12, { type: 'square', vol: 0.15, slideTo: 80, filter: 1200 });
        this.noise(0.12, { vol: 0.35, freq: 2500, type: 'bandpass' });
        break;
      case 'booster':
        [0, 7, 12, 19].forEach((s, i) =>
          this.tone(440 * Math.pow(2, s / 12), 0.25, { type: 'triangle', vol: 0.14, when: i * 0.05 }),
        );
        break;
      case 'freeze':
        for (let i = 0; i < 6; i++) this.tone(2000 + i * 300, 0.3, { type: 'sine', vol: 0.06, when: i * 0.04 });
        this.noise(0.6, { vol: 0.12, type: 'highpass', freq: 5000 });
        break;
      case 'tick':
        this.tone(1200, 0.04, { type: 'square', vol: 0.06, filter: 3000 });
        break;
      case 'win':
        [0, 4, 7, 12, 16, 19, 24].forEach((s, i) =>
          this.tone(392 * Math.pow(2, s / 12), 0.45, { type: 'triangle', vol: 0.16, when: i * 0.08 }),
        );
        this.tone(392 * 4, 0.9, { type: 'sine', vol: 0.08, when: 0.6 });
        break;
      case 'lose':
        [0, -3, -7, -12].forEach((s, i) =>
          this.tone(330 * Math.pow(2, s / 12), 0.4, { type: 'triangle', vol: 0.16, when: i * 0.16, slideTo: 300 * Math.pow(2, s / 12) }),
        );
        break;
      case 'coin':
        this.tone(1318, 0.08, { type: 'square', vol: 0.07, filter: 4000 });
        this.tone(1760, 0.2, { type: 'square', vol: 0.07, when: 0.07, filter: 4000 });
        break;
      case 'whoosh':
        this.noise(0.3, { vol: 0.2, type: 'bandpass', freq: 400, freqTo: 2400, q: 1.5 });
        break;
      case 'spin':
        this.tone(900, 0.03, { type: 'triangle', vol: 0.08 });
        break;
    }
  }

  vibrate(ms: number): void {
    if (this.vibroOn && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch {
        /* ignore */
      }
    }
  }
  vibroOn = true;
}

export const audio = new AudioEngine();
