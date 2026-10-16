import { MusicPlayer } from './music';
import { renderLayers, SFX } from './synth';

/**
 * Global audio: own WebAudio graph (Phaser audio is disabled).
 * Sound is silenced whenever any "mute reason" is active (ad, hidden tab, pause by platform)
 * or the player turned it off in settings.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private lastPlayed = new Map<string, number>();
  private music: MusicPlayer | null = null;
  private pendingMusic: [string, number] | null = null;
  private reasons = new Set<string>();
  soundOn = true;
  musicOn = true;

  /** Registers the context to be created on the first user gesture (browser autoplay policy). */
  init(): void {
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
    this.sfxBus.gain.value = 0.8;
    this.musicBus.gain.value = 0.55;
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    for (const [k, layers] of Object.entries(SFX)) this.buffers.set(k, renderLayers(this.ctx, layers));
    this.music = new MusicPlayer(this.ctx, this.musicBus);
    if (this.pendingMusic) {
      const [n, t] = this.pendingMusic;
      this.music.play(n, t);
    }
  }

  setMuted(reason: string, muted: boolean): void {
    if (muted) this.reasons.add(reason);
    else this.reasons.delete(reason);
    this.apply();
  }

  isMutedBy(reason: string): boolean {
    return this.reasons.has(reason);
  }

  setSettings(sound: boolean, music: boolean): void {
    this.soundOn = sound;
    this.musicOn = music;
    this.apply();
  }

  private apply(): void {
    if (!this.ctx) return;
    const silent = this.reasons.size > 0;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(silent ? 0 : 1, now);
    this.sfxBus.gain.setValueAtTime(this.soundOn ? 0.8 : 0, now);
    this.musicBus.gain.setValueAtTime(this.musicOn ? 0.55 : 0, now);
    if (silent) {
      if (this.ctx.state === 'running') void this.ctx.suspend();
    } else if (this.ctx.state !== 'running') {
      void this.ctx.resume().catch(() => {});
    }
  }

  play(name: string, opts: { vol?: number; rate?: number; throttleMs?: number } = {}): void {
    if (!this.ctx || !this.soundOn || this.reasons.size > 0 || this.ctx.state !== 'running') return;
    const buf = this.buffers.get(name);
    if (!buf) return;
    const now = performance.now();
    const thr = opts.throttleMs ?? 45;
    if (now - (this.lastPlayed.get(name) ?? 0) < thr) return;
    this.lastPlayed.set(name, now);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = (opts.rate ?? 1) * (0.96 + Math.random() * 0.08);
    const g = this.ctx.createGain();
    g.gain.value = opts.vol ?? 1;
    src.connect(g).connect(this.sfxBus);
    src.start();
  }

  playMusic(name: string, transpose = 0): void {
    this.pendingMusic = [name, transpose];
    this.music?.play(name, transpose);
  }

  stopMusic(): void {
    this.music?.stop();
  }
}

export const audio = new AudioEngine();
