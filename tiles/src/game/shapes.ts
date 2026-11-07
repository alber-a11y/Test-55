/** Symmetric layer masks in normalized coordinates (u, v ∈ [-1, 1], cell centers). */
export type Shape = (u: number, v: number, c: number, r: number) => boolean;

const heart: Shape = (u, v) => {
  const x = u * 1.25;
  const y = -v * 1.3 + 0.25;
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0.05;
};

export const SHAPES: Record<string, Shape> = {
  rect: () => true,
  diamond: (u, v) => Math.abs(u) + Math.abs(v) <= 1.25,
  circle: (u, v) => u * u + v * v <= 1.45,
  cross: (u, v) => Math.abs(u) < 0.45 || Math.abs(v) < 0.45,
  xshape: (u, v) => Math.abs(Math.abs(u) - Math.abs(v)) < 0.5,
  ring: (u, v) => Math.max(Math.abs(u), Math.abs(v)) > 0.5,
  hourglass: (u, v) => Math.abs(u) <= Math.abs(v) + 0.3,
  bowtie: (u, v) => Math.abs(v) <= Math.abs(u) + 0.3,
  heart,
  pyramid: (u, v) => Math.abs(u) <= (v + 1) / 2 + 0.3,
  arch: (u, v) => !(Math.abs(u) < 0.4 && v > 0.2),
  hshape: (u, v) => Math.abs(u) > 0.55 || Math.abs(v) < 0.35,
  columns: (_u, _v, c) => c % 2 === 0,
  stripes: (_u, _v, _c, r) => r % 2 === 0,
  checker: (_u, _v, c, r) => (c + r) % 2 === 0,
  corners: (u, v) => !(Math.abs(u) < 0.4 || Math.abs(v) < 0.4) || (Math.abs(u) < 0.3 && Math.abs(v) < 0.3),
  tee: (u, v) => v < -0.4 || Math.abs(u) < 0.4,
  vase: (u, v) => Math.abs(u) <= 0.35 + 0.6 * Math.abs(Math.sin((v + 1) * 1.6)),
};

export const BASE_SHAPES = ['rect', 'diamond', 'circle', 'cross', 'xshape', 'ring', 'hourglass', 'bowtie', 'heart', 'pyramid', 'arch', 'hshape', 'corners', 'tee', 'vase'];
export const UPPER_SHAPES = ['rect', 'rect', 'diamond', 'circle', 'cross', 'xshape', 'ring', 'columns', 'stripes', 'checker', 'hourglass', 'bowtie', 'heart'];
