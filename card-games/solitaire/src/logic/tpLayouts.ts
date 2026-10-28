/**
 * TriPeaks board templates written as ASCII art. Each string is one row; row r sits
 * half a card height below row r-1 and above it in z. A character column is half a
 * card width. 'X' = card. Cards of a later row that overlap a card cover it.
 */
export interface TPSlotPos {
  /** Center x in card widths. */
  x: number;
  /** Center y in card heights. */
  y: number;
  z: number;
}

export interface TPTemplate {
  id: string;
  rows: string[];
  /** First level where this template may appear in procedural levels. */
  minLevel: number;
}

const T = (id: string, minLevel: number, rows: string[]): TPTemplate => ({ id, minLevel, rows });

export const TEMPLATES: TPTemplate[] = [
  T('peaks3', 1, [
    '...X.....X.....X...',
    '..X.X...X.X...X.X..',
    '.X.X.X.X.X.X.X.X.X.',
    'X.X.X.X.X.X.X.X.X.X',
  ]),
  T('pyramid', 1, [
    '.........X.........',
    '........X.X........',
    '.......X.X.X.......',
    '......X.X.X.X......',
    '.....X.X.X.X.X.....',
    '....X.X.X.X.X.X....',
    '...X.X.X.X.X.X.X...',
  ]),
  T('peaks2', 3, [
    '....X.......X......',
    '...X.X.....X.X.....',
    '..X.X.X...X.X.X....',
    '.X.X.X.X.X.X.X.X...',
    'X.X.X.X.X.X.X.X.X..',
  ]),
  T('wall', 5, [
    '.X.X.X.X.X.X.X.X.',
    'X.X.X.X.X.X.X.X.X',
    '.X.X.X.X.X.X.X.X.',
    'X.X.X.X.X.X.X.X.X',
  ]),
  T('diamond', 8, [
    '........X........',
    '.......X.X.......',
    '......X.X.X......',
    '.....X.X.X.X.....',
    '....X.X.X.X.X....',
    '.....X.X.X.X.....',
    '......X.X.X......',
    '.......X.X.......',
  ]),
  T('valley', 10, [
    'X.X.............X.X',
    '.X.X...........X.X.',
    'X.X.X.........X.X.X',
    '.X.X.X.X.X.X.X.X.X.',
    '..X.X.X.X.X.X.X.X..',
  ]),
  T('towers', 12, [
    '.X......X......X.',
    '.X......X......X.',
    'X.X....X.X....X.X',
    '.X......X......X.',
    'X.X....X.X....X.X',
    '.X.X..X.X.X..X.X.',
  ]),
  T('heart', 14, [
    '...X.X.....X.X...',
    '..X.X.X...X.X.X..',
    '.X.X.X.X.X.X.X.X.',
    '..X.X.X.X.X.X.X..',
    '...X.X.X.X.X.X...',
    '.....X.X.X.X.....',
    '.......X.X.......',
  ]),
  T('arrow', 16, [
    '........X........',
    '.......X.X.......',
    '......X.X.X......',
    '.....X.X.X.X.....',
    '....X.X...X.X....',
    '...X.X.....X.X...',
    '..X.X.......X.X..',
  ]),
  T('bridge', 18, [
    'X.X.X.X.X.X.X.X.X',
    '.X.X.X.X.X.X.X.X.',
    'X.X...........X.X',
    '.X.X.........X.X.',
    'X.X.X.......X.X.X',
  ]),
  T('cross', 21, [
    '.X.X.........X.X.',
    '..X.X.......X.X..',
    '...X.X.....X.X...',
    '....X.X.X.X.X....',
    '...X.X.....X.X...',
    '..X.X.......X.X..',
    '.X.X.........X.X.',
  ]),
  T('crown', 24, [
    'X.......X.......X',
    'X.X....X.X....X.X',
    '.X.X..X.X.X..X.X.',
    'X.X.X.X.X.X.X.X.X',
    '.X.X.X.X.X.X.X.X.',
  ]),
  T('peaks4', 27, [
    '..X....X....X....X..',
    '.X.X..X.X..X.X..X.X.',
    'X.X.X.X.X.X.X.X.X.X.',
    '.X.X.X.X.X.X.X.X.X.X',
  ]),
  T('stairs', 30, [
    'X.X................',
    '.X.X.X.............',
    '..X.X.X.X..........',
    '.....X.X.X.X.......',
    '........X.X.X.X....',
    '...........X.X.X.X.',
    '..............X.X.X',
  ]),
  T('twins', 33, [
    '....X.........X....',
    '...X.X.......X.X...',
    '..X.X.X.....X.X.X..',
    '.X.X.X.X...X.X.X.X.',
    'X.X.X.X.X.X.X.X.X.X',
  ]),
  T('ring', 36, [
    '......X.X.X......',
    '....X.X.X.X.X....',
    '...X.X.....X.X...',
    '..X.X.......X.X..',
    '...X.X.....X.X...',
    '....X.X.X.X.X....',
    '......X.X.X......',
  ]),
];

/** Convert a template into slot positions (x in card widths, y in card heights). */
export function templateSlots(t: TPTemplate): TPSlotPos[] {
  const out: TPSlotPos[] = [];
  t.rows.forEach((row, r) => {
    for (let i = 0; i < row.length; i++) if (row[i] === 'X') out.push({ x: i * 0.5, y: r * 0.5, z: r });
  });
  // Normalize so the leftmost/topmost card starts at 0.
  const minX = Math.min(...out.map((s) => s.x));
  for (const s of out) s.x -= minX;
  return out;
}

/** For each slot, the list of slots that cover it. */
export function computeBlockers(slots: TPSlotPos[]): number[][] {
  return slots.map((a) =>
    slots
      .map((b, j) => ({ b, j }))
      .filter(({ b }) => b.z > a.z && Math.abs(b.x - a.x) < 0.99 && Math.abs(b.y - a.y) < 0.99)
      .map(({ j }) => j),
  );
}

/** Slots sharing an edge-ish neighbourhood (ice cracks when a neighbour is played). */
export function computeNeighbours(slots: TPSlotPos[]): number[][] {
  return slots.map((a, i) =>
    slots
      .map((b, j) => ({ b, j }))
      .filter(({ b, j }) => j !== i && Math.abs(b.x - a.x) <= 1.01 && Math.abs(b.y - a.y) <= 0.51)
      .map(({ j }) => j),
  );
}
