import Phaser from 'phaser';

/** Pre-rendered 3D character sheet: rows = 5 facing directions (S, SE, E, NE, N), columns = frames. */
export interface SheetMeta {
  cellW: number;
  cellH: number;
  /** Vertical position of the feet inside a cell (0..1). */
  anchorY: number;
  dirs: number;
  frames: number;
}

interface Manifest {
  sheets: Record<string, SheetMeta>;
  portraits: string[];
}

/** Sheet metadata by texture key, filled by loadSprites(). */
export const SPRITES: Record<string, SheetMeta> = {};

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Load sheets and portraits produced by `npm run sprites` (tools/render-sprites.mjs).
 * Returns the set of texture keys it provided, so SVG fallbacks for them can be skipped.
 */
export async function loadSprites(scene: Phaser.Scene, onProgress: (p: number) => void): Promise<Set<string>> {
  const covered = new Set<string>();
  let manifest: Manifest;
  try {
    const res = await fetch('sprites/manifest.json');
    if (!res.ok) return covered;
    manifest = (await res.json()) as Manifest;
  } catch {
    return covered;
  }
  const jobs: (() => Promise<void>)[] = [];
  for (const [key, meta] of Object.entries(manifest.sheets)) {
    jobs.push(async () => {
      const img = await loadImage(`sprites/${key}.webp`);
      if (!img) return;
      if (scene.textures.exists(key)) scene.textures.remove(key);
      scene.textures.addSpriteSheet(key, img, { frameWidth: meta.cellW, frameHeight: meta.cellH });
      SPRITES[key] = meta;
      covered.add(key);
    });
  }
  for (const key of manifest.portraits) {
    jobs.push(async () => {
      const img = await loadImage(`sprites/${key}.webp`);
      if (!img) return;
      if (scene.textures.exists(key)) scene.textures.remove(key);
      scene.textures.addImage(key, img);
      covered.add(key);
    });
  }
  let done = 0;
  const CONC = 8;
  let next = 0;
  await Promise.all(
    Array.from({ length: CONC }, async () => {
      while (next < jobs.length) {
        const j = jobs[next++];
        await j();
        onProgress(++done / jobs.length);
      }
    }),
  );
  return covered;
}

/** Scale that makes a texture `h` pixels tall (sheets use one frame's height). */
export function scaleToHeight(scene: Phaser.Scene, key: string, h: number): number {
  const meta = SPRITES[key];
  if (meta) return h / meta.cellH;
  const src = scene.textures.get(key).getSourceImage() as { height: number };
  return h / Math.max(1, src.height);
}
