import { CARD_SFX } from '@shared/audio/cardSfx';
import { bassLine, padLine, rep, type Track } from '@shared/audio/music';
import type { Layer } from '@shared/audio/synth';

export const SFX: Record<string, Layer[]> = {
  ...CARD_SFX,
  slap: [
    { w: 'noise', f: 2600, dur: 0.09, vol: 0.55, lp: 0.25, curve: 3 },
    { w: 'sin', f: 130, f2: 60, dur: 0.1, vol: 0.4 },
  ],
  take: [
    { w: 'noise', f: 4000, f2: 1500, dur: 0.35, vol: 0.3, lp: 0.35, attack: 0.04, curve: 1.2 },
    { w: 'sin', f: 300, f2: 180, dur: 0.25, vol: 0.15 },
  ],
  bito: [
    { w: 'noise', f: 5000, f2: 2000, dur: 0.3, vol: 0.28, lp: 0.4, attack: 0.03 },
    { w: 'tri', f: 660, dur: 0.12, vol: 0.18, delay: 0.1 },
  ],
  catch: [
    { w: 'sq', f: 880, dur: 0.08, vol: 0.2, duty: 0.3 },
    { w: 'sq', f: 1320, dur: 0.15, vol: 0.2, delay: 0.08, duty: 0.3 },
    { w: 'noise', f: 6000, dur: 0.1, vol: 0.2, delay: 0.02 },
  ],
  pogony: [
    { w: 'saw', f: 220, f2: 110, dur: 0.5, vol: 0.18, vib: { rate: 6, depth: 0.05 } },
    { w: 'tri', f: 165, dur: 0.6, vol: 0.2, delay: 0.3 },
  ],
  trump: [
    { w: 'tri', f: 988, dur: 0.08, vol: 0.25 },
    { w: 'tri', f: 1318, dur: 0.2, vol: 0.22, delay: 0.07 },
  ],
  emote: [{ w: 'sin', f: 700, f2: 1100, dur: 0.12, vol: 0.25 }],
};

/** Courtyard-guitar style tracks: plucked triangles, waltz and swing grooves. */
export const TRACKS: Record<string, Track> = {
  menu: {
    bpm: 112,
    swing: 0.2,
    leadWave: 'triangle',
    leadVol: 0.085,
    lead: [
      'A4 . . C5 E5 . A5 _ . . G5 . F5 . E5 .',
      'D5 . . F5 A5 . D6 _ . . C6 . B5 . A5 .',
      'G#4 . . B4 E5 . G#5 _ . . F5 . E5 . D5 .',
      'C5 . . E5 A5 _ _ _ . . B4 . C5 . E5 .',
      'A4 . . C5 E5 . A5 _ . . G5 . F5 . E5 .',
      'F5 . . A5 C6 . F6 _ . . E6 . D6 . C6 .',
      'B5 . . A5 G#5 . F5 _ . . E5 . D5 . B4 .',
      'A4 _ _ _ . . E4 . A4 _ _ _ . . . .',
    ].join(' '),
    bass: bassLine(['A2', 'D3', 'E2', 'A2', 'A2', 'F2', 'E2', 'A2'], (r, hi) => `${r} . ${hi} . ${hi} . ${r} . ${hi} . ${hi} . ${r} . ${hi} .`),
    bassWave: 'triangle',
    pad: padLine(['A3+C4+E4', 'D4+F4+A4', 'E3+G#3+B3', 'A3+C4+E4', 'A3+C4+E4', 'F3+A3+C4', 'E3+G#3+B3', 'A3+C4+E4']),
    padWave: 'triangle',
    padVol: 0.03,
    arp: rep('A3 C4 E4 C4 A3 C4 E4 C4 D4 F4 A4 F4 D4 F4 A4 F4 E3 G#3 B3 G#3 E3 G#3 B3 G#3 A3 C4 E4 C4 A3 C4 E4 C4', 2) + ' ' + rep('A3 C4 E4 C4 A3 C4 E4 C4 F3 A3 C4 A3 F3 A3 C4 A3 E3 G#3 B3 G#3 E3 G#3 B3 G#3 A3 C4 E4 C4 A3 C4 E4 C4', 2),
    arpVol: 0.03,
    kick: rep('x . . . . . . . x . . . . . . .', 8),
    snare: rep('. . . . x . . . . . . . x . . .', 8),
    hat: rep('x . x x x . x x x . x x x . x x', 8),
    drumVol: 0.4,
  },
  game: {
    bpm: 92,
    swing: 0.15,
    leadWave: 'sine',
    leadVol: 0.07,
    leadCutoff: 1800,
    lead: [
      'D5 . . F5 A5 _ . . G5 . F5 . E5 _ . .',
      'C5 . . E5 G5 _ . . F5 . E5 . D5 _ . .',
      'A#4 . . D5 F5 _ . . E5 . D5 . C5 _ . .',
      'A4 . . C#5 E5 _ . . G5 . F5 . E5 _ _ _',
    ].join(' '),
    bass: bassLine(['D3', 'C3', 'A#2', 'A2'], (r, hi) => `${r} _ . . ${hi} . . . ${r} _ . . ${hi} . ${r} .`),
    pad: padLine(['D4+F4+A4', 'C4+E4+G4', 'A#3+D4+F4', 'A3+C#4+E4']),
    padWave: 'triangle',
    padVol: 0.028,
    kick: rep('x . . . . . . . . . x . . . . .', 4),
    snare: rep('. . . . . . . . x . . . . . . .', 4),
    hat: rep('x . x x x . x x x . x x x . x x', 4),
    drumVol: 0.35,
  },
  boss: {
    bpm: 128,
    leadWave: 'square',
    leadVol: 0.05,
    leadCutoff: 2200,
    lead: [
      'E5 . E5 . G5 . E5 . D5 . C5 . B4 . C5 .',
      'D5 . D5 . F5 . D5 . C5 . B4 . A4 . B4 .',
      'C5 . C5 . E5 . C5 . B4 . A4 . G#4 . A4 .',
      'B4 . E5 . G#5 . B5 . A5 _ _ _ G#5 _ _ _',
    ].join(' '),
    bass: bassLine(['A2', 'D2', 'A2', 'E2'], (r, hi) => `${r} ${r} ${hi} ${r} ${r} ${r} ${hi} ${r} ${r} ${r} ${hi} ${r} ${r} ${hi} ${r} ${hi}`),
    pad: padLine(['A3+C4+E4', 'D3+F3+A3', 'A3+C4+E4', 'E3+G#3+B3']),
    kick: rep('x . . . x . . . x . . . x . . .', 4),
    snare: rep('. . . . x . . . . . . . x . . x', 4),
    hat: rep('x x x x x x x x x x x x x x x x', 4),
    drumVol: 0.6,
  },
};
