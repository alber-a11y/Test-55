import { MusicPlayer } from './music';
import { renderLayers, SFX } from './synth';

export type MusicName = 'menu' | 'game' | 'game2';

/**
 * Global audio on its own WebAudio graph (Phaser audio is disabled).
 * Everything is synthesized in code. Sound is silenced whenever any "mute
 * reason" is active (ad, hidden tab, platform pause).
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private lastPlayed = new Map<string, number>();
  private music: MusicPlayer | null = null;
  private wanted: MusicName | null = null;
  private reasons = new Set<string>();
  soundVol = 0.85;
  musicVol = 0.6;

  /** The context is created on the first user gesture (browser autoplay policy). */
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
    const comp = this.ctx.createDynamicsCompressor();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.master.connect(comp).connect(this.ctx.destination);
    for (const [k, layers] of Object.entries(SFX)) this.buffers.set(k, renderLayers(this.ctx, layers));
    this.music = new MusicPlayer(this.ctx, this.musicBus);
    this.applyVolumes();
    if (this.wanted) this.music.play(this.wanted);
  }

  setMuted(reason: string, muted: boolean): void {
    if (muted) this.reasons.add(reason);
    else this.reasons.delete(reason);
    this.apply();
  }

  setVolumes(sound: number, music: number): void {
    this.soundVol = Math.max(0, Math.min(1, sound));
    this.musicVol = Math.max(0, Math.min(1, music));
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.sfxBus.gain.setTargetAtTime(this.soundVol, now, 0.02);
    this.musicBus.gain.setTargetAtTime(this.musicVol * 0.55, now, 0.02);
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
    if (now - (this.lastPlayed.get(name) ?? 0) < (opts.throttleMs ?? 35)) return;
    this.lastPlayed.set(name, now);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = (opts.rate ?? 1) * (0.97 + Math.random() * 0.06);
    const g = this.ctx.createGain();
    g.gain.value = opts.vol ?? 1;
    src.connect(g).connect(this.sfxBus);
    src.start();
  }

  playMusic(name: MusicName): void {
    this.wanted = name;
    this.music?.play(name);
  }

  stopMusic(): void {
    this.wanted = null;
    this.music?.stop();
  }
}

export const audio = new AudioEngine();

/** Short vibration on phones (respects the setting). */
export function vibrate(ms: number | number[], enabled: boolean): void {
  if (!enabled) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}
