import { drawBlock, drawEmptyCell, drawGem, type Theme } from './styles';

export interface Sprite {
  canvas: HTMLCanvasElement;
  /** Extra margin around the cell (glow), in CSS px. */
  pad: number;
}

/** Pre-rendered cell sprites keyed by theme/color/size — drawImage is much cheaper than paths. */
class SpriteCache {
  private map = new Map<string, Sprite>();
  dpr = 1;

  private make(key: string, size: number, padK: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): Sprite {
    let sp = this.map.get(key);
    if (sp) return sp;
    const pad = Math.ceil(size * padK);
    const c = document.createElement('canvas');
    const px = Math.ceil((size + pad * 2) * this.dpr);
    c.width = c.height = Math.max(1, px);
    const ctx = c.getContext('2d')!;
    ctx.scale(this.dpr, this.dpr);
    ctx.translate(pad, pad);
    draw(ctx, size);
    sp = { canvas: c, pad };
    if (this.map.size > 600) this.map.clear();
    this.map.set(key, sp);
    return sp;
  }

  block(theme: Theme, color: string, size: number): Sprite {
    const s = Math.round(size * 2) / 2;
    return this.make(`b|${theme.id}|${color}|${s}|${this.dpr}`, s, theme.id === 'neon' ? 0.35 : 0, (ctx, sz) =>
      drawBlock(ctx, theme, color, sz),
    );
  }

  empty(theme: Theme, size: number): Sprite {
    const s = Math.round(size * 2) / 2;
    return this.make(`e|${theme.id}|${s}|${this.dpr}`, s, 0, (ctx, sz) => drawEmptyCell(ctx, theme, sz));
  }

  gem(size: number): Sprite {
    const s = Math.round(size * 2) / 2;
    return this.make(`g|${s}|${this.dpr}`, s, 0.3, (ctx, sz) => {
      ctx.translate(sz / 2, sz / 2);
      drawGem(ctx, sz * 0.36);
    });
  }

  clear(): void {
    this.map.clear();
  }
}

export const sprites = new SpriteCache();

export function blit(ctx: CanvasRenderingContext2D, sp: Sprite, x: number, y: number, size: number, scale = 1): void {
  const full = size + sp.pad * 2;
  if (scale === 1) {
    ctx.drawImage(sp.canvas, x - sp.pad, y - sp.pad, full, full);
  } else {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const f = full * scale;
    ctx.drawImage(sp.canvas, cx - f / 2, cy - f / 2, f, f);
  }
}
