import type Phaser from 'phaser';
import { RANK_LABELS, RANK_LABELS_RU } from '@shared/cards/card';
import { setRankLabels } from '@shared/cards/faces';
import { renderTable } from '@shared/cards/tables';
import { CardTextures } from '@shared/cards/textures';
import { renderLocation } from './art/locations';
import { backStyle, tableStyle } from './data/meta';
import { LOCATIONS } from './data/locations';
import { save } from './save';

/** Durak ranks are 2..14 (Ace = 14); shared faces use 1..13 (Ace = 1). */
export const texRank = (r: number): number => (r === 14 ? 1 : r);

class SkinManager {
  cards!: CardTextures;
  private textures!: Phaser.Textures.TextureManager;

  init(textures: Phaser.Textures.TextureManager): void {
    this.textures = textures;
    this.cards = new CardTextures(textures);
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

  /** Background for a location (or the equipped table style). */
  table(w: number, h: number, loc = 0): string {
    const eq = save.data.equip.table;
    const st = eq === 'loc' ? null : tableStyle(eq);
    const key = st ? `tbl_${st.id}_${w}x${h}` : `loc_${LOCATIONS[loc % LOCATIONS.length].id}_${w}x${h}`;
    if (!this.textures.exists(key)) {
      for (const k of this.textures.getTextureKeys()) if ((k.startsWith('tbl_') || k.startsWith('loc_')) && !k.endsWith(`${w}x${h}`)) this.textures.remove(k);
      this.textures.addCanvas(key, st ? renderTable(st, w, h) : renderLocation(LOCATIONS[loc % LOCATIONS.length], w, h));
    }
    return key;
  }
}

export const skin = new SkinManager();
