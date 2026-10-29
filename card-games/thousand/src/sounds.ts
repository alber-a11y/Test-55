import { CARD_SFX } from '@shared/audio/cardSfx';
import { bassLine, padLine, rep, type Track } from '@shared/audio/music';
import type { Layer } from '@shared/audio/synth';

export const SFX: Record<string, Layer[]> = {
  ...CARD_SFX,
  slap: [
    { w: 'noise', f: 2600, dur: 0.08, vol: 0.5, lp: 0.25, curve: 3 },
    { w: 'sin', f: 140, f2: 70, dur: 0.09, vol: 0.35 },
  ],
  bid: [
    { w: 'tri', f: 660, dur: 0.07, vol: 0.22 },
    { w: 'tri', f: 880, dur: 0.1, vol: 0.2, delay: 0.06 },
  ],
  pass: [{ w: 'sin', f: 420, f2: 300, dur: 0.14, vol: 0.2 }],
  trick: [
    { w: 'noise', f: 5000, f2: 2200, dur: 0.28, vol: 0.26, lp: 0.4, attack: 0.03 },
    { w: 'sin', f: 260, f2: 160, dur: 0.18, vol: 0.12 },
  ],
  marriage: [
    { w: 'tri', f: 784, dur: 0.18, vol: 0.26 },
    { w: 'tri', f: 988, dur: 0.18, vol: 0.24, delay: 0.1 },
    { w: 'tri', f: 1175, dur: 0.22, vol: 0.24, delay: 0.2 },
    { w: 'sin', f: 1568, dur: 0.6, vol: 0.18, delay: 0.3, vib: { rate: 7, depth: 0.02 } },
    { w: 'sin', f: 523, dur: 0.8, vol: 0.14, delay: 0.3 },
  ],
  trump: [
    { w: 'tri', f: 988, dur: 0.08, vol: 0.22 },
    { w: 'tri', f: 1318, dur: 0.18, vol: 0.2, delay: 0.07 },
  ],
  made: [
    { w: 'tri', f: 659, dur: 0.12, vol: 0.28, curve: 0.5 },
    { w: 'tri', f: 880, dur: 0.12, vol: 0.28, delay: 0.11, curve: 0.5 },
    { w: 'tri', f: 1046, dur: 0.4, vol: 0.28, delay: 0.22 },
  ],
  failed: [
    { w: 'saw', f: 300, f2: 200, dur: 0.35, vol: 0.14, lp: 0.3 },
    { w: 'tri', f: 196, dur: 0.4, vol: 0.2, delay: 0.25 },
  ],
  bolt: [
    { w: 'sq', f: 160, f2: 90, dur: 0.18, vol: 0.18, duty: 0.3 },
    { w: 'noise', f: 1800, dur: 0.12, vol: 0.3, lp: 0.2, delay: 0.02 },
    { w: 'sin', f: 2200, dur: 0.25, vol: 0.08, delay: 0.12, vib: { rate: 30, depth: 0.04 } },
  ],
  barrel: [
    { w: 'sin', f: 180, f2: 120, dur: 0.18, vol: 0.4 },
    { w: 'noise', f: 900, dur: 0.12, vol: 0.25, lp: 0.15 },
    { w: 'sin', f: 170, f2: 110, dur: 0.2, vol: 0.35, delay: 0.2 },
  ],
  samosval: [
    { w: 'noise', f: 600, f2: 200, dur: 0.9, vol: 0.35, lp: 0.1, attack: 0.1, curve: 1 },
    { w: 'saw', f: 90, f2: 55, dur: 0.8, vol: 0.14, lp: 0.2 },
  ],
  whistle: [
    { w: 'sq', f: 554, dur: 0.6, vol: 0.09, duty: 0.4, attack: 0.04, curve: 0.4, lp: 0.25, vib: { rate: 5, depth: 0.01 } },
    { w: 'sq', f: 698, dur: 0.6, vol: 0.08, duty: 0.4, attack: 0.04, curve: 0.4, lp: 0.25 },
    { w: 'noise', f: 7000, dur: 0.6, vol: 0.05, lp: 0.6, attack: 0.05, curve: 0.5 },
  ],
  emote: [{ w: 'sin', f: 700, f2: 1100, dur: 0.12, vol: 0.25 }],
};

/** Railway swing: brushed snare, "chugging" hats and a walking bass. */
const CHUG = 'x . x x x . x x x . x x x . x x';

export const TRACKS: Record<string, Track> = {
  menu: {
    bpm: 120,
    swing: 0.22,
    leadWave: 'triangle',
    leadVol: 0.08,
    lead: [
      'F5 . A5 . C6 _ A5 . G5 . F5 . D5 _ . .',
      'E5 . G5 . A#5 _ G5 . F5 . E5 . C5 _ . .',
      'D5 . F5 . A5 _ F5 . E5 . D5 . A4 _ . .',
      'G4 . A4 . A#4 . C5 . E5 _ _ _ . . . .',
      'F5 . A5 . C6 _ A5 . G5 . F5 . D5 _ . .',
      'A#5 . A5 . G5 _ F5 . E5 . G5 . C6 _ . .',
      'A5 . G5 . F5 _ D5 . C5 . A4 . G4 _ . .',
      'F4 _ _ _ . . A4 . C5 . F5 _ _ _ . .',
    ].join(' '),
    bass: bassLine(['F2', 'C3', 'D3', 'C3', 'F2', 'A#2', 'C3', 'F2'], (r, hi) => `${r} . . . ${hi} . . . ${r} . . . ${hi} . . .`),
    bassWave: 'triangle',
    pad: padLine(['F3+A3+C4', 'C4+E4+G4', 'D4+F4+A4', 'C4+E4+A#4', 'F3+A3+C4', 'A#3+D4+F4', 'C4+E4+G4', 'F3+A3+C4']),
    padWave: 'triangle',
    padVol: 0.028,
    kick: rep('x . . . . . . . x . . . . . . .', 8),
    snare: rep('. . . . x . . . . . . . x . . .', 8),
    hat: rep(CHUG, 8),
    drumVol: 0.35,
  },
  game: {
    bpm: 96,
    swing: 0.18,
    leadWave: 'sine',
    leadVol: 0.065,
    leadCutoff: 1800,
    lead: [
      'D5 . . F5 A5 _ . . G5 . F5 . E5 _ . .',
      'C5 . . E5 G5 _ . . F5 . E5 . D5 _ . .',
      'A#4 . . D5 F5 _ . . E5 . D5 . C5 _ . .',
      'A4 . . C#5 E5 _ . . G5 . F5 . E5 _ _ _',
      'D5 . . F5 A5 _ . . C6 . A#5 . A5 _ . .',
      'G5 . . A#5 D6 _ . . C6 . A#5 . A5 _ . .',
      'F5 . E5 . D5 . C#5 . E5 . A4 . C#5 _ . .',
      'D5 _ _ _ . . . . . . . . . . . .',
    ].join(' '),
    bass: bassLine(['D3', 'C3', 'A#2', 'A2', 'D3', 'G2', 'A2', 'D3'], (r, hi) => `${r} . . . ${hi} . . . ${r} . . . ${hi} . ${r} .`),
    pad: padLine(['D4+F4+A4', 'C4+E4+G4', 'A#3+D4+F4', 'A3+C#4+E4', 'D4+F4+A4', 'G3+A#3+D4', 'A3+C#4+E4', 'D4+F4+A4']),
    padWave: 'triangle',
    padVol: 0.026,
    kick: rep('x . . . . . . . x . . . . . . .', 8),
    snare: rep('. . . . . . . . x . . . . . . .', 8),
    hat: rep(CHUG, 8),
    drumVol: 0.3,
  },
  boss: {
    bpm: 132,
    swing: 0.1,
    leadWave: 'square',
    leadVol: 0.045,
    leadCutoff: 2200,
    lead: [
      'E5 . G5 . B5 . G5 . A5 . F#5 . D5 . E5 .',
      'C5 . E5 . G5 . E5 . F#5 . D5 . B4 . D5 .',
      'E5 . G5 . B5 . E6 . D6 . B5 . G5 . A5 .',
      'B5 . A5 . G5 . F#5 . E5 _ _ _ D#5 _ _ _',
    ].join(' '),
    bass: bassLine(['E2', 'C2', 'E2', 'B1'], (r, hi) => `${r} ${r} ${hi} ${r} ${r} ${r} ${hi} ${r} ${r} ${r} ${hi} ${r} ${r} ${hi} ${r} ${hi}`),
    pad: padLine(['E3+G3+B3', 'C3+E3+G3', 'E3+G3+B3', 'B2+D#3+F#3']),
    kick: rep('x . . . x . . . x . . . x . . .', 4),
    snare: rep('. . . . x . . . . . . . x . . x', 4),
    hat: rep('x x x x x x x x x x x x x x x x', 4),
    drumVol: 0.55,
  },
};
