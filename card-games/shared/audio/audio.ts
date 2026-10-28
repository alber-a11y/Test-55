import { MusicPlayer, type Track } from './music';
import { renderLayers, type Layer } from './synth';

/**
 * Global audio: own WebAudio graph (Phaser audio is disabled). Every sound effect is
 * rendered once from synth layers and every music track is sequenced live — no audio files.
 * Sound is silenced whenever any "mute reason" is active (ad, hidden tab, platform pause).
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private lastPlayed = new Map<string, number>();
  private music: MusicPlayer | null = null;
  private wanted: [string, number] | null = null;
  private reasons = new Set<string>();
  private sfx: Record<string, Layer[]> = {};
  private tracks: Record<string, Track> = {};
  /** 0..1 */
  soundVol = 0.8;
  /** 0..1 */
  musicVol = 0.5;

  /** Registers the game's sounds and the context to be created on the first user gesture (autoplay policy). */
  init(sfx: Record<string, Layer[]>, tracks: Record<string, Track>): void {
    this.sfx = sfx;
    this.tracks = tracks;
    const start = () => {
      this.create();
      this.apply();
    };
    for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, start, { passive: true });
  }

  private create(): void {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    for (const [k, layers] of Object.entries(this.sfx)) this.buffers.set(k, renderLayers(this.ctx, layers));
    this.music = new MusicPlayer(this.ctx, this.musicBus, this.tracks);
    this.applyVolumes();
    if (this.wanted) this.playMusic(...this.wanted);
  }

  setMuted(reason: string, muted: boolean): void {
    if (muted) this.reasons.add(reason);
    else this.reasons.delete(reason);
    this.apply();
  }

  /** Volumes 0..1 (0 = off). */
  setVolumes(sound: number, music: number): void {
    this.soundVol = Math.max(0, Math.min(1, sound));
    this.musicVol = Math.max(0, Math.min(1, music));
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.sfxBus.gain.setTargetAtTime(this.soundVol, now, 0.02);
    this.musicBus.gain.setTargetAtTime(this.musicVol * 0.8, now, 0.02);
  }

  private apply(): void {
    if (!this.ctx) return;
    const silent = this.reasons.size > 0;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(silent ? 0 : 1, now);
    this.applyVolumes();
    if (silent) {
      if (this.ctx.state === 'running') void this.ctx.suspend();
    } else if (this.ctx.state !== 'running') {
      void this.ctx.resume().catch(() => {});
    }
  }

  play(name: string, opts: { vol?: number; rate?: number; throttleMs?: number; delay?: number } = {}): void {
    if (!this.ctx || this.soundVol <= 0 || this.reasons.size > 0 || this.ctx.state !== 'running') return;
    const buf = this.buffers.get(name);
    if (!buf) return;
    const now = performance.now();
    const thr = opts.throttleMs ?? 35;
    if (now - (this.lastPlayed.get(name) ?? 0) < thr) return;
    this.lastPlayed.set(name, now);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = (opts.rate ?? 1) * (0.96 + Math.random() * 0.08);
    const g = this.ctx.createGain();
    g.gain.value = opts.vol ?? 1;
    src.connect(g).connect(this.sfxBus);
    src.start(this.ctx.currentTime + (opts.delay ?? 0));
  }

  playMusic(name: string, transpose = 0): void {
    this.wanted = [name, transpose];
    this.music?.play(name, transpose);
  }

  stopMusic(): void {
    this.wanted = null;
    this.music?.stop();
  }
}

export const audio = new AudioEngine();
