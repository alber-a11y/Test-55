import type Phaser from 'phaser';
import { CardTextures } from '@shared/cards/textures';
import { renderTable } from '@shared/cards/tables';
import { backStyle, tableStyle } from './data/skins';
import { save } from './save';

/** Equipped card / table looks as textures. */
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
    this.cards.useFace(save.data.equip.face);
    this.cards.useBack(backStyle(save.data.equip.back));
  }

  /** Table background texture for the current size. */
  table(w: number, h: number, id = save.data.equip.table): string {
    const key = `table_${id}_${w}x${h}`;
    if (!this.textures.exists(key)) {
      // Drop other sizes of tables to keep memory low.
      for (const k of this.textures.getTextureKeys()) if (k.startsWith('table_') && k !== key) this.textures.remove(k);
      this.textures.addCanvas(key, renderTable(tableStyle(id), w, h));
    }
    return key;
  }
}

export const skin = new SkinManager();
