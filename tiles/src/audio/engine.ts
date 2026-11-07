/**
 * Web Audio engine: master → (music, sfx) buses. Any active mute reason (ad, hidden tab,
 * platform pause) silences everything and suspends the context so the music sequencer freezes too.
 */
class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  music!: GainNode;
  sfx!: GainNode;
  private musicVol = 0.6;
  private sfxVol = 0.8;
  private reasons = new Set<string>();
  private unlockHandlers: Array<() => void> = [];
  noise!: AudioBuffer;

  /** Create the context lazily on the first user gesture (autoplay policies). */
  installUnlock(): void {
    const unlock = () => {
      this.ensure();
      if (this.ctx && this.ctx.state === 'suspended' && this.reasons.size === 0) void this.ctx.resume();
    };
    for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, unlock, { capture: true });
  }

  onUnlock(fn: () => void): void {
    if (this.ctx) fn();
    else this.unlockHandlers.push(fn);
  }

  private ensure(): void {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    // gentle limiter so stacked sfx never clip
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 6;
    comp.connect(this.master);
    this.music = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    this.music.connect(comp);
    this.sfx.connect(comp);
    this.applyVolumes();
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyMute();
    const hs = this.unlockHandlers;
    this.unlockHandlers = [];
    hs.forEach((h) => h());
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVol = music;
    this.sfxVol = sfx;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // perceptual curve
    this.music.gain.setTargetAtTime(Math.pow(this.musicVol, 1.6) * 0.55, t, 0.05);
    this.sfx.gain.setTargetAtTime(Math.pow(this.sfxVol, 1.6), t, 0.02);
  }

  setMuted(reason: string, on: boolean): void {
    const was = this.reasons.size > 0;
    if (on) this.reasons.add(reason);
    else this.reasons.delete(reason);
    if (was !== this.reasons.size > 0) this.applyMute();
  }

  get muted(): boolean {
    return this.reasons.size > 0;
  }

  private applyMute(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.reasons.size) {
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(0, t);
      void this.ctx.suspend();
    } else {
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(0, t);
      this.master.gain.linearRampToValueAtTime(1, t + 0.25);
      void this.ctx.resume();
    }
  }

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running' && this.reasons.size === 0;
  }
}

export const engine = new AudioEngine();

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** "C#5" → midi */
export function note(n: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
  if (!m) throw new Error('bad note ' + n);
  return 12 * (Number(m[3]) + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

/** Basic voices used by both music and sfx. All take an absolute start time. */
export const voice = {
  tone(dest: AudioNode, t: number, freq: number, dur: number, opt: { type?: OscillatorType; vol?: number; attack?: number; slideTo?: number; detune?: number } = {}) {
    const ctx = engine.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opt.type ?? 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opt.detune) o.detune.value = opt.detune;
    if (opt.slideTo) o.frequency.exponentialRampToValueAtTime(opt.slideTo, t + dur);
    const vol = opt.vol ?? 0.3;
    const a = opt.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  },
  /** Marimba-like mallet: sine + a quickly decaying 4th harmonic. */
  mallet(dest: AudioNode, t: number, freq: number, dur: number, vol = 0.3) {
    voice.tone(dest, t, freq, dur, { vol, attack: 0.003 });
    voice.tone(dest, t, freq * 4, Math.min(0.12, dur), { vol: vol * 0.35, attack: 0.002 });
    voice.tone(dest, t, freq * 2, dur * 0.5, { vol: vol * 0.25, type: 'triangle', attack: 0.003 });
  },
  /** Plucked string: filtered sawtooth with a fast decay (ukulele-ish). */
  pluck(dest: AudioNode, t: number, freq: number, dur: number, vol = 0.12) {
    const ctx = engine.ctx!;
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq * 6, t);
    f.frequency.exponentialRampToValueAtTime(freq * 1.2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  },
  noise(dest: AudioNode, t: number, dur: number, opt: { type?: BiquadFilterType; freq?: number; q?: number; vol?: number; freqTo?: number } = {}) {
    const ctx = engine.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = engine.noise;
    const f = ctx.createBiquadFilter();
    f.type = opt.type ?? 'highpass';
    f.frequency.setValueAtTime(opt.freq ?? 6000, t);
    if (opt.freqTo) f.frequency.exponentialRampToValueAtTime(opt.freqTo, t + dur);
    f.Q.value = opt.q ?? 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opt.vol ?? 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  },
  kick(dest: AudioNode, t: number, vol = 0.5) {
    voice.tone(dest, t, 140, 0.22, { vol, slideTo: 45, attack: 0.002 });
  },
};
