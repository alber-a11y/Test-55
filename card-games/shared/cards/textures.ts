import type Phaser from 'phaser';
import { backKey, faceKey, type Suit } from './card';
import { renderBack, type BackStyle } from './backs';
import { makeCanvas, roundRect } from './draw';
import { CARD_TH, CARD_TW, faceStyle, renderFace, renderWild } from './faces';

/** Keeps the textures of the currently equipped face / back styles in the texture manager. */
export class CardTextures {
  private faceId = '';
  private backId = '';

  constructor(private textures: Phaser.Textures.TextureManager, private ranks: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) {}

  /** (Re)generate faces of style `id` — keys "face_<id><variant>_<suit>_<rank>". */
  useFace(id: string, variant = ''): void {
    const kid = id + variant;
    if (this.faceId === kid) return;
    this.faceId = kid;
    const st = faceStyle(id);
    for (let s = 0; s < 4; s++)
      for (const r of this.ranks) {
        const key = faceKey(kid, s as Suit, r);
        if (!this.textures.exists(key)) this.textures.addCanvas(key, renderFace(st, s as Suit, r));
      }
    const wk = `wild_${kid}`;
    if (!this.textures.exists(wk)) this.textures.addCanvas(wk, renderWild(st));
  }

  useBack(st: BackStyle): void {
    if (this.backId === st.id) return;
    this.backId = st.id;
    const key = backKey(st.id);
    if (!this.textures.exists(key)) this.textures.addCanvas(key, renderBack(st));
  }

  face(suit: Suit, rank: number): string {
    return faceKey(this.faceId, suit, rank);
  }
  get back(): string {
    return backKey(this.backId);
  }
  get wild(): string {
    return `wild_${this.faceId}`;
  }
  get faceStyleId(): string {
    return this.faceId;
  }

  /** Shared helper textures: soft shadow, highlight glow, empty slot outline. */
  static registerCommon(textures: Phaser.Textures.TextureManager): void {
    if (!textures.exists('card_shadow')) {
      const pad = 24;
      const [cv, ctx] = makeCanvas(CARD_TW + pad * 2, CARD_TH + pad * 2);
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 18;
      roundRect(ctx, pad, pad, CARD_TW, CARD_TH, CARD_TW * 0.075);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fill();
      textures.addCanvas('card_shadow', cv);
    }
    if (!textures.exists('card_glow')) {
      const pad = 24;
      const [cv, ctx] = makeCanvas(CARD_TW + pad * 2, CARD_TH + pad * 2);
      ctx.shadowColor = 'rgba(255,214,90,1)';
      ctx.shadowBlur = 22;
      roundRect(ctx, pad, pad, CARD_TW, CARD_TH, CARD_TW * 0.075);
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(255,226,120,1)';
      ctx.stroke();
      textures.addCanvas('card_glow', cv);
    }
    if (!textures.exists('card_slot')) {
      const [cv, ctx] = makeCanvas(CARD_TW, CARD_TH);
      roundRect(ctx, 4, 4, CARD_TW - 8, CARD_TH - 8, CARD_TW * 0.075);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.setLineDash([16, 10]);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.stroke();
      textures.addCanvas('card_slot', cv);
    }
  }
}

/** Shadow / glow textures have padding around the card: scale factor relative to card size. */
export const PAD_SCALE_X = (CARD_TW + 48) / CARD_TW;
export const PAD_SCALE_Y = (CARD_TH + 48) / CARD_TH;
