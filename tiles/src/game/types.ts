/**
 * Board coordinates are in half-tile units: a tile at (x, y) occupies [x, x+2) × [y, y+2).
 * A tile on a higher layer (z) that overlaps another one covers it.
 */
export interface Tile {
  id: number;
  x: number;
  y: number;
  z: number;
  /** Icon index inside the equipped icon set. */
  type: number;
  /** "?" tile — its picture stays secret even while it is free. */
  hidden: boolean;
  /** Ice: number of triples the player must collect before this tile can be taken. */
  ice: number;
  /** Lock: opens when a triple of this type is collected (-1 = no lock). */
  lock: number;
  /** Index of the bottom stack this tile belongs to (-1 = regular board tile). */
  stack: number;
}

export interface Level {
  n: number;
  hard: boolean;
  tiles: Tile[];
  /** Distinct tile types used on the board. */
  typeCount: number;
  trayCap: number;
  /** A known winning pick order (tile ids) — used by tests and hints. */
  solution: number[];
}

export const TRAY_CAP = 7;
export const ICONS_PER_SET = 12;

export function overlaps(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
}
