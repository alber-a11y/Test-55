/** Ball colors. Index = color id used everywhere in the game logic. */
export interface BallColor {
  key: string;
  /** Mosaic letter. */
  ch: string;
  base: string;
  light: string;
  dark: string;
  /** Hex number for tints / particles. */
  hex: number;
}

export const BALL_COLORS: BallColor[] = [
  { key: 'red', ch: 'R', base: '#ff2d3d', light: '#ffa49a', dark: '#8f0716', hex: 0xff2d3d },
  { key: 'orange', ch: 'O', base: '#ff8a12', light: '#ffd08a', dark: '#9c3f00', hex: 0xff8a12 },
  { key: 'yellow', ch: 'Y', base: '#ffd60a', light: '#fff6b0', dark: '#a87a00', hex: 0xffd60a },
  { key: 'green', ch: 'G', base: '#2fcb3a', light: '#b6f7a0', dark: '#0d6b1a', hex: 0x2fcb3a },
  { key: 'cyan', ch: 'C', base: '#18c8e8', light: '#b0f4ff', dark: '#056a87', hex: 0x18c8e8 },
  { key: 'blue', ch: 'B', base: '#2d55ff', light: '#a9b8ff', dark: '#0c1d8c', hex: 0x2d55ff },
  { key: 'purple', ch: 'P', base: '#9a3dff', light: '#dcb8ff', dark: '#4a0f99', hex: 0x9a3dff },
  { key: 'pink', ch: 'K', base: '#ff47b0', light: '#ffc2e6', dark: '#9c0e60', hex: 0xff47b0 },
];

export const COLOR_COUNT = BALL_COLORS.length;

export const LETTER_TO_COLOR: Record<string, number> = Object.fromEntries(BALL_COLORS.map((c, i) => [c.ch, i]));
