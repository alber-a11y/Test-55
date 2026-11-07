import { store } from '../core/save';
import { engine, mtof, note, voice } from './engine';

export type SfxName =
  | 'tap' | 'place' | 'match' | 'blocked' | 'undo' | 'shuffle' | 'magnet' | 'slot'
  | 'coin' | 'buy' | 'unlock' | 'click' | 'popup' | 'error' | 'star' | 'lose' | 'ice' | 'lockOpen' | 'reveal' | 'combo';

let lastPlay: Record<string, number> = {};

/** Synthesised sound effects. `arg` tunes pitch (combo step, star index…). */
export function sfx(name: SfxName, arg = 0): void {
  if (!engine.ready) return;
  const now = performance.now();
  // de-duplicate bursts of the same effect within one frame
  if (now - (lastPlay[name] ?? 0) < 30) return;
  lastPlay[name] = now;
  const ctx = engine.ctx!;
  const d = engine.sfx;
  const t = ctx.currentTime + 0.005;
  switch (name) {
    case 'tap': {
      const f = 620 + Math.random() * 80;
      voice.tone(d, t, f, 0.09, { type: 'triangle', vol: 0.32, slideTo: f * 1.6 });
      voice.noise(d, t, 0.03, { type: 'bandpass', freq: 3000, vol: 0.08 });
      break;
    }
    case 'place':
      voice.tone(d, t, 300, 0.08, { type: 'sine', vol: 0.35, slideTo: 180 });
      voice.noise(d, t, 0.04, { type: 'lowpass', freq: 1800, vol: 0.12 });
      break;
    case 'match': {
      const base = note('C5') + Math.min(arg, 8) * 2;
      [0, 4, 7, 12].forEach((s, i) => voice.mallet(d, t + i * 0.05, mtof(base + s), 0.35, 0.22));
      voice.noise(d, t, 0.25, { type: 'highpass', freq: 7000, vol: 0.06 });
      break;
    }
    case 'combo':
      [0, 7, 12, 16, 19].forEach((s, i) => voice.tone(d, t + i * 0.045, mtof(note('G5') + s + Math.min(arg, 6)), 0.18, { type: 'square', vol: 0.06 }));
      break;
    case 'blocked':
      voice.tone(d, t, 180, 0.12, { type: 'square', vol: 0.08, slideTo: 140 });
      break;
    case 'undo':
      voice.tone(d, t, 900, 0.22, { type: 'triangle', vol: 0.22, slideTo: 300 });
      voice.noise(d, t, 0.2, { type: 'bandpass', freq: 2500, freqTo: 600, vol: 0.1 });
      break;
    case 'shuffle':
      for (let i = 0; i < 8; i++) voice.noise(d, t + i * 0.045, 0.04, { type: 'bandpass', freq: 2000 + i * 300, vol: 0.12, q: 3 });
      [0, 3, 7, 12].forEach((s, i) => voice.mallet(d, t + 0.36 + i * 0.04, mtof(note('E5') + s), 0.25, 0.15));
      break;
    case 'magnet':
      voice.tone(d, t, 200, 0.45, { type: 'sawtooth', vol: 0.06, slideTo: 1200 });
      voice.tone(d, t, 400, 0.45, { type: 'sine', vol: 0.18, slideTo: 1600 });
      break;
    case 'slot':
      voice.tone(d, t, 400, 0.12, { type: 'square', vol: 0.06, slideTo: 800 });
      voice.mallet(d, t + 0.1, mtof(note('A5')), 0.4, 0.25);
      voice.mallet(d, t + 0.16, mtof(note('E6')), 0.4, 0.2);
      break;
    case 'coin':
      voice.tone(d, t, mtof(note('B5')), 0.08, { type: 'square', vol: 0.07 });
      voice.tone(d, t + 0.07, mtof(note('E6')), 0.3, { type: 'square', vol: 0.07 });
      break;
    case 'buy':
      voice.noise(d, t, 0.15, { type: 'highpass', freq: 5000, vol: 0.12 });
      [note('E6'), note('G6'), note('C7')].forEach((m, i) => voice.tone(d, t + i * 0.06, mtof(m), 0.25, { type: 'square', vol: 0.06 }));
      break;
    case 'unlock':
      [0, 4, 7, 11, 14, 19].forEach((s, i) => voice.mallet(d, t + i * 0.06, mtof(note('C6') + s), 0.5, 0.18));
      break;
    case 'click':
      voice.tone(d, t, 1200, 0.04, { type: 'triangle', vol: 0.18, slideTo: 900 });
      break;
    case 'popup':
      voice.noise(d, t, 0.18, { type: 'bandpass', freq: 600, freqTo: 3000, vol: 0.09, q: 1.5 });
      voice.tone(d, t + 0.05, mtof(note('G5')), 0.12, { type: 'sine', vol: 0.12 });
      break;
    case 'error':
      voice.tone(d, t, 220, 0.12, { type: 'square', vol: 0.07 });
      voice.tone(d, t + 0.13, 180, 0.18, { type: 'square', vol: 0.07 });
      break;
    case 'star':
      voice.mallet(d, t, mtof(note('E6') + arg * 3), 0.6, 0.25);
      voice.noise(d, t, 0.3, { type: 'highpass', freq: 8000, vol: 0.06 });
      break;
    case 'lose':
      [note('G4'), note('F#4'), note('F4'), note('E4')].forEach((m, i) =>
        voice.tone(d, t + i * 0.22, mtof(m), i === 3 ? 0.7 : 0.22, { type: 'triangle', vol: 0.22, slideTo: i === 3 ? mtof(m) * 0.9 : undefined }),
      );
      break;
    case 'ice':
      voice.noise(d, t, 0.25, { type: 'highpass', freq: 4000, vol: 0.2 });
      voice.tone(d, t, 2400, 0.15, { type: 'sine', vol: 0.1, slideTo: 3200 });
      break;
    case 'lockOpen':
      voice.tone(d, t, 1800, 0.05, { type: 'square', vol: 0.06 });
      voice.tone(d, t + 0.06, 1200, 0.05, { type: 'square', vol: 0.06 });
      voice.mallet(d, t + 0.1, mtof(note('A6')), 0.4, 0.15);
      break;
    case 'reveal':
      voice.tone(d, t, mtof(note('D6')), 0.2, { type: 'sine', vol: 0.12, slideTo: mtof(note('A6')) });
      break;
  }
}

export function vibrate(ms = 15): void {
  if (!store.data.settings.vibro) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}

export function resetSfxThrottle(): void {
  lastPlay = {};
}
