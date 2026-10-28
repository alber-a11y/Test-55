/**
 * Board geometry. Game logic lives on a flat "table" plane:
 *  u — across the lane (0..LANE_W), v — forward from the board front (v grows away from the player).
 * Everything is drawn through a perspective projection, so the lane recedes like in the references.
 */
export const COLS = 17;
export const LANE_W = 660;
export const R = LANE_W / (COLS * 2);
export const ROW_H = R * Math.sqrt(3);

/** Column (world) width the playfield is designed for. */
export const COL_W = 720;
export const COL_H = 1280;

/** Projection: y = HORIZON + K * s, x = CX + (u - LANE_W/2) * s, s = D / (D + v). */
const D = 2600;
const K = 2210;
const HORIZON = -1450;
const CX = COL_W / 2;

/** v where the nearest board row rests. */
export const V_FRONT = 0;
/** Launcher position on the plane. */
export const V_LAUNCH = -345;
export const U_LAUNCH = LANE_W / 2;
/** Rollers disappear past this v (below the screen). */
export const V_GONE = -620;

export function scaleAt(v: number): number {
  return D / (D + Math.max(v, -D * 0.6));
}

export function project(u: number, v: number): { x: number; y: number; s: number } {
  const s = scaleAt(v);
  return { x: CX + (u - LANE_W / 2) * s, y: HORIZON + K * s, s };
}

export function unproject(x: number, y: number): { u: number; v: number } {
  const s = Math.max(0.05, (y - HORIZON) / K);
  return { u: (x - CX) / s + LANE_W / 2, v: D / s - D };
}

/** Screen-space lift of a sphere's center above its contact point. */
export function lift(s: number): number {
  return R * s * 0.72;
}

/** Number of cells in a row (odd rows are shifted by R and one shorter). */
export function rowLen(r: number): number {
  return r % 2 === 0 ? COLS : COLS - 1;
}

export function cellU(r: number, c: number): number {
  return R + c * 2 * R + (r % 2 === 1 ? R : 0);
}

export const NEIGHBORS_EVEN: [number, number][] = [
  [0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0],
];
export const NEIGHBORS_ODD: [number, number][] = [
  [0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1],
];
