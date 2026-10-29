import type Phaser from 'phaser';
import { RANK_LABELS, RANK_LABELS_RU } from '@shared/cards/card';
import { setRankLabels } from '@shared/cards/faces';
import { renderTable } from '@shared/cards/tables';
import { CardTextures } from '@shared/cards/textures';
import { registerCardStyles } from './art/cards';
import { renderCarriage } from './art/carriage';
import { backStyle, tableStyle } from './data/meta';
import { WORLDS } from './data/route';
import { save } from './save';

/** Thousand ranks are 9..14 (Ace = 14); shared faces use 1..13 (Ace = 1). */
export const texRank = (r: number): number => (r === 14 ? 1 : r);

class SkinManager {
  cards!: CardTextures;
  private textures!: Phaser.Textures.TextureManager;

  init(textures: Phaser.Textures.TextureManager): void {
    registerCardStyles();
    this.textures = textures;
    this.cards = new CardTextures(textures, [1, 9, 10, 11, 12, 13]);
    CardTextures.registerCommon(textures);
    this.apply();
  }

  apply(): void {
    const ru = save.data.settings.ruLetters;
    setRankLabels(ru ? RANK_LABELS_RU : RANK_LABELS);
    this.cards.useFace(save.data.equip.face, ru ? '_ru' : '');
    this.cards.useBack(backStyle(save.data.equip.back));
  }

  face(suit: number, rank: number): string {
    return this.cards.face(suit as 0, texRank(rank));
  }

  /** Table background for a world (or the equipped table style). */
  table(w: number, h: number, world = 0): string {
    const eq = save.data.equip.table;
    const st = eq === 'route' ? null : tableStyle(eq);
    const W = WORLDS[world % WORLDS.length];
    const key = st ? `tbl_${st.id}_${w}x${h}` : `car_${W.id}_${w}x${h}`;
    if (!this.textures.exists(key)) {
      for (const k of this.textures.getTextureKeys()) if ((k.startsWith('tbl_') || k.startsWith('car_')) && !k.endsWith(`${w}x${h}`)) this.textures.remove(k);
      this.textures.addCanvas(key, st ? renderTable(st, w, h) : renderCarriage(W, w, h));
    }
    return key;
  }
}

export const skin = new SkinManager();
