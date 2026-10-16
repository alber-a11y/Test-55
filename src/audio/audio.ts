import { MusicPlayer } from './music';
import { renderLayers, SFX } from './synth';

/** Music slots: each loads `audio/music_<name>.mp3`; falls back to the built-in synth track. */
export const MUSIC_SLOTS = ['menu', 'battle', 'boss'] as const;

/**
 * Global audio: own WebAudio graph (Phaser audio is disabled).
 * Every sound effect and music track is loaded from `public/audio/*.mp3` when present
 * (drop your own files there to replace them); otherwise it is synthesized in code.
 * Sound is silenced whenever any "mute reason" is active (ad, hidden tab, platform pause).
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private musicBuffers = new Map<string, AudioBuffer>();
  private lastPlayed = new Map<string, number>();
  private synthMusic: MusicPlayer | null = null;
  private fileMusic: AudioBufferSourceNode | null = null;
  private fileMusicName = '';
  private wanted: [string, number] | null = null;
  private reasons = new Set<string>();
  /** 0..1 */
  soundVol = 0.8;
  /** 0..1 */
  musicVol = 0.6;

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
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    // Synth fallbacks first (instant), then real files replace them as they arrive.
    for (const [k, layers] of Object.entries(SFX)) this.buffers.set(k, renderLayers(this.ctx, layers));
    this.synthMusic = new MusicPlayer(this.ctx, this.musicBus);
    this.applyVolumes();
    if (this.wanted) this.playMusic(...this.wanted);
    void this.loadFiles();
  }

  private async loadFile(url: string): Promise<AudioBuffer | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.arrayBuffer();
      return await this.ctx!.decodeAudioData(data);
    } catch {
      return null;
    }
  }

  private async loadFiles(): Promise<void> {
    await Promise.all([
      ...MUSIC_SLOTS.map(async (m) => {
        const buf = await this.loadFile(`audio/music_${m}.mp3`);
        if (!buf) return;
        this.musicBuffers.set(m, buf);
        if (this.wanted?.[0] === m) this.playMusic(...this.wanted);
      }),
      ...Object.keys(SFX).map(async (s) => {
        const buf = await this.loadFile(`audio/sfx_${s}.mp3`);
        if (buf) this.buffers.set(s, buf);
      }),
    ]);
  }

  setMuted(reason: string, muted: boolean): void {
    if (muted) this.reasons.add(reason);
    else this.reasons.delete(reason);
    this.apply();
  }

  isMutedBy(reason: string): boolean {
    return this.reasons.has(reason);
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

  play(name: string, opts: { vol?: number; rate?: number; throttleMs?: number } = {}): void {
    if (!this.ctx || this.soundVol <= 0 || this.reasons.size > 0 || this.ctx.state !== 'running') return;
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
    this.wanted = [name, transpose];
    if (!this.ctx) return;
    const file = this.musicBuffers.get(name);
    if (file) {
      this.synthMusic?.stop();
      if (this.fileMusicName === name && this.fileMusic) return;
      this.stopFileMusic();
      const src = this.ctx.createBufferSource();
      src.buffer = file;
      src.loop = true;
      src.connect(this.musicBus);
      src.start();
      this.fileMusic = src;
      this.fileMusicName = name;
    } else {
      this.stopFileMusic();
      this.synthMusic?.play(name, transpose);
    }
  }

  private stopFileMusic(): void {
    try {
      this.fileMusic?.stop();
    } catch {
      /* already stopped */
    }
    this.fileMusic?.disconnect();
    this.fileMusic = null;
    this.fileMusicName = '';
  }

  stopMusic(): void {
    this.wanted = null;
    this.synthMusic?.stop();
    this.stopFileMusic();
  }
}

export const audio = new AudioEngine();
