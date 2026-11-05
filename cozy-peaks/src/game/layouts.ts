/**
 * Tableau layouts. A layout is data: slots on a half-card grid plus "who covers whom".
 * x is the card centre in card widths, row is the row index from the top. A card is covered
 * by the cards in the next row whose centres are at most half a card away horizontally.
 */
export interface Slot {
  x: number;
  row: number;
}

export interface Layout {
  id: string;
  slots: Slot[];
  /** coveredBy[i] — slots lying on top of slot i. Slot i is open when all of them are removed. */
  coveredBy: number[][];
  /** Width of the layout in card widths (max x − min x + 1). */
  cols: number;
  rows: number;
  /** Slots that are peak tops (no slot above them in the previous row). */
  peakTops: number[];
}

/** Widest bottom row allowed: keeps cards ≥ ~44 CSS px on a 360–390 px wide phone. */
export const MAX_COLS = 8;

export interface PeakSpec {
  /** Centre of the peak top. */
  c: number;
  /** Height in rows. */
  h: number;
}

export function buildLayout(id: string, raw: Slot[]): Layout {
  const minX = Math.min(...raw.map((s) => s.x));
  const minRow = Math.min(...raw.map((s) => s.row));
  const slots = raw
    .map((s) => ({ x: s.x - minX, row: s.row - minRow }))
    .sort((a, b) => a.row - b.row || a.x - b.x);
  const coveredBy = slots.map((s) =>
    slots.map((o, j) => (o.row === s.row + 1 && Math.abs(o.x - s.x) <= 0.51 ? j : -1)).filter((j) => j >= 0),
  );
  const coversSomething = slots.map(() => false);
  coveredBy.forEach((list) => list.forEach((j) => (coversSomething[j] = true)));
  const peakTops = slots
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !slots.some((o) => o.row === s.row - 1 && Math.abs(o.x - s.x) <= 0.51))
    .filter(({ i }) => coveredBy[i].length > 0)
    .map(({ i }) => i);
  return {
    id,
    slots,
    coveredBy,
    cols: Math.max(...slots.map((s) => s.x)) + 1,
    rows: Math.max(...slots.map((s) => s.row)) + 1,
    peakTops,
  };
}

/** Peaks standing on a common bottom row. Heights may differ (like the portrait reference). */
export function peaksLayout(id: string, peaks: PeakSpec[]): Layout {
  const maxH = Math.max(...peaks.map((p) => p.h));
  const seen = new Map<string, Slot>();
  for (const p of peaks) {
    for (let k = 0; k < p.h; k++) {
      const row = maxH - p.h + k;
      for (let j = 0; j <= k; j++) {
        const x = p.c - k / 2 + j;
        seen.set(`${row}:${x}`, { x, row });
      }
    }
  }
  return buildLayout(id, [...seen.values()]);
}

/** Layout sanity: no two cards of a row overlap, width within MAX_COLS. */
export function validLayout(l: Layout): boolean {
  if (l.cols > MAX_COLS) return false;
  for (let i = 0; i < l.slots.length; i++)
    for (let j = i + 1; j < l.slots.length; j++) {
      const a = l.slots[i];
      const b = l.slots[j];
      if (a.row === b.row && Math.abs(a.x - b.x) < 0.99) return false;
    }
  return true;
}

/** Hand-made shapes that are not plain peaks. Rows listed top to bottom as x positions. */
function rowsLayout(id: string, rows: number[][]): Layout {
  return buildLayout(
    id,
    rows.flatMap((xs, row) => xs.map((x) => ({ x, row }))),
  );
}

const range = (a: number, b: number, step = 1) => {
  const out: number[] = [];
  for (let x = a; x <= b + 1e-9; x += step) out.push(x);
  return out;
};

export const SPECIAL_LAYOUTS: Layout[] = [
  // House: roof, walls, wide base.
  rowsLayout('house', [[3.5], [3, 4], [2.5, 3.5, 4.5], [2, 3, 4, 5], [1.5, 2.5, 3.5, 4.5, 5.5], range(1, 6), range(0.5, 6.5)]),
  // Heart.
  rowsLayout('heart', [[1.5, 5.5], [1, 2, 5, 6], [0.5, 1.5, 2.5, 4.5, 5.5, 6.5], range(1, 6), range(1.5, 5.5), [2, 3, 4, 5], [3.5]]),
  // Bridge: two towers joined by a deck.
  rowsLayout('bridge', [[0.5, 6.5], [0, 1, 6, 7], range(0.5, 6.5), [0, 1, 2, 5, 6, 7], [0.5, 1.5, 5.5, 6.5]]),
  // Staircase.
  rowsLayout('stairs', [[0.5], [0, 1], [0.5, 1.5, 2.5], range(0, 3), range(0.5, 4.5), range(0, 5), range(0.5, 6.5)]),
  // Twin hills.
  peaksLayout('twin', [
    { c: 2, h: 5 },
    { c: 5, h: 5 },
  ]),
];

/** Every peaks layout that fits: 2–4 peaks, heights 3–5, a shared bottom row. */
function enumeratePeaks(): Layout[] {
  const out: Layout[] = [];
  const keys = new Set<string>();
  const heights = [3, 4, 5];
  const add = (spec: PeakSpec[]) => {
    const l = peaksLayout(`p_${spec.map((p) => `${p.c}h${p.h}`).join('_')}`, spec);
    if (!validLayout(l) || l.slots.length < 16 || l.slots.length > 30) return;
    // Only one connected bottom row.
    const bottom = l.slots.filter((s) => s.row === l.rows - 1).map((s) => s.x);
    if (Math.max(...bottom) - Math.min(...bottom) + 1 !== bottom.length) return;
    const key = l.slots.map((s) => `${s.row}:${s.x}`).join(',');
    if (keys.has(key)) return;
    keys.add(key);
    out.push(l);
  };
  // Peak bases must share the same half-grid parity: c − h/2 has a fixed fractional part.
  for (const n of [2, 3, 4]) {
    const rec = (spec: PeakSpec[]) => {
      if (spec.length === n) return add(spec);
      for (const h of heights) {
        const prev = spec[spec.length - 1];
        const start = prev ? prev.c + 1.5 : h / 2 - 0.5;
        for (let c = start; c <= MAX_COLS; c += 0.5) {
          if (spec.length && ((c - h / 2) % 1 + 1) % 1 !== ((spec[0].c - spec[0].h / 2) % 1 + 1) % 1) continue;
          if (prev && c - prev.c > 3) break;
          rec([...spec, { c, h }]);
        }
      }
    };
    rec([]);
  }
  return out;
}

export const PEAK_LAYOUTS: Layout[] = enumeratePeaks();

/** The reference look: three equal peaks — the first layout every new player sees. */
export const CLASSIC = peaksLayout('classic', [
  { c: 1.5, h: 4 },
  { c: 3.5, h: 4 },
  { c: 5.5, h: 4 },
]);

export const ALL_LAYOUTS: Layout[] = [CLASSIC, ...SPECIAL_LAYOUTS, ...PEAK_LAYOUTS];

export function layoutById(id: string): Layout | undefined {
  return ALL_LAYOUTS.find((l) => l.id === id);
}
