import { getLang, t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Scroller } from '@shared/ui/scroller';
import { txt, UI } from '@shared/ui/widgets';
import { renderPostcard } from '../art/landmarks';
import { CITIES } from '../data/cities';
import { cityCompleted } from '../progress';
import { save } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';

/** Postcard album: 3 postcards per city; a completed city also unlocks its card back. */
export class CollectionScene extends BaseScene {
  constructor() {
    super('Collection');
  }

  create(data: { from?: string }): void {
    menuBackground(this);
    topBar(this, t('collection'), () => this.go(data.from ?? 'Menu', {}, 'collection_back'));
    const W = this.W;
    const total = save.data.adv.postcards.length;
    txt(this, W / 2, 210, `${total}/${CITIES.length * 3}  ·  ${t('albumHint')}`, 26, '#e8ecf8', { wordWrap: { width: W - 60 }, strokeThickness: 0 });
    const top = 270;
    const sc = new Scroller(this, 0, top, W, this.H - top);
    const rw = Math.min(W - 40, 1000);
    const pcW = (rw - 80) / 3;
    const pcH = pcW * 0.7;
    const rh = pcH + 150;
    CITIES.forEach((city, ci) => {
      const y = 20 + ci * (rh + 24);
      const g = this.add.graphics();
      const done = cityCompleted(ci);
      g.fillStyle(UI.inkN, 0.9).fillRoundedRect(W / 2 - rw / 2 - 4, y - 4, rw + 8, rh + 8, 26);
      g.fillStyle(done ? 0x2c6e4a : 0x283a63, 1).fillRoundedRect(W / 2 - rw / 2, y, rw, rh, 24);
      sc.content.add(g);
      sc.content.add(txt(this, W / 2 - rw / 2 + 30, y + 46, getLang() === 'en' ? city.en : city.ru, 40, city.accent).setOrigin(0, 0.5));
      sc.content.add(txt(this, W / 2 + rw / 2 - 30, y + 46, done ? `✓ ${t('cityComplete')}` : `${t('levelShort', { n: ci * 20 + 1 })}–${ci * 20 + 20}`, 26, '#ffffff').setOrigin(1, 0.5));
      for (let k = 0; k < 3; k++) {
        const has = save.data.adv.postcards.includes(`${ci}:${k}`);
        const key = `postcard_${ci}:${k}_${has ? 1 : 0}`;
        if (!this.textures.exists(key)) this.textures.addCanvas(key, renderPostcard(city, k, 420, 294, !has));
        const img = this.add.image(W / 2 - rw / 2 + 40 + pcW / 2 + k * (pcW + 0), y + 100 + pcH / 2, key).setDisplaySize(pcW - 10, pcH - 7).setAngle((k - 1) * 2);
        sc.content.add(img);
      }
    });
    sc.setExtent(CITIES.length * (rh + 24) + 60);
    this.setupScene();
  }
}
