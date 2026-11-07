/**
 * Logical resolution. The content column is always 1080 units wide; the height follows the
 * screen aspect (phones 16:9 … 21:9). On landscape desktops the canvas widens instead, the
 * background fills it and the content column stays centred.
 */
export const COL_W = 1080;

export function computeSize(): { w: number; h: number } {
  const vw = Math.max(1, window.innerWidth);
  const vh = Math.max(1, window.innerHeight);
  const a = vh / vw;
  if (a >= 1.35) return { w: COL_W, h: Math.round(Math.min(2400, COL_W * a)) };
  const h = 1920;
  return { w: Math.round(Math.min(3600, Math.max(COL_W, h / a))), h };
}

export const VERSION = '1.0.0';
