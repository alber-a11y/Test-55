import Phaser from 'phaser';
import { makeCanvas } from '@shared/cards/draw';
import { drawCityScene } from '../art/landmarks';
import type { City } from '../data/cities';
import { skin } from '../skin';

/** Table background + optional city panorama fading into it from the top. */
export function menuBackground(scene: Phaser.Scene, city?: City, bannerH?: number): void {
  const W = scene.scale.width;
  const H = scene.scale.height;
  scene.add.image(0, 0, skin.table(W, H)).setOrigin(0);
  if (city) {
    const bh = bannerH ?? Math.round(H * (H > W ? 0.36 : 0.55));
    const key = `banner_${city.id}_${W}x${bh}`;
    if (!scene.textures.exists(key)) {
      const [cv, c] = makeCanvas(W, bh);
      drawCityScene(c, city, W, bh, { stars: true });
      // Fade bottom into the table
      c.globalCompositeOperation = 'destination-out';
      const g = c.createLinearGradient(0, bh * 0.55, 0, bh);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, bh);
      scene.textures.addCanvas(key, cv);
    }
    scene.add.image(0, 0, key).setOrigin(0).setAlpha(0.95);
  }
  // Floating suit sparkles
  const suits = ['♠', '♥', '♦', '♣'];
  for (let i = 0; i < 10; i++) {
    const s = scene.add
      .text(Phaser.Math.Between(0, W), Phaser.Math.Between(H * 0.3, H), suits[i % 4], { fontFamily: 'Georgia', fontSize: `${Phaser.Math.Between(40, 90)}px`, color: '#ffffff' })
      .setAlpha(0.05)
      .setOrigin(0.5);
    scene.tweens.add({ targets: s, y: s.y - Phaser.Math.Between(80, 200), angle: Phaser.Math.Between(-30, 30), duration: Phaser.Math.Between(5000, 9000), yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
}

/** Title text in a gold serif style. */
export function goldTitle(scene: Phaser.Scene, x: number, y: number, s: string, size: number): Phaser.GameObjects.Text {
  const tx = scene.add
    .text(x, y, s, {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color: '#ffe08a',
      stroke: '#3b2400',
      strokeThickness: Math.round(size / 9),
      shadow: { offsetX: 0, offsetY: 6, color: '#000000', blur: 12, fill: true },
    })
    .setOrigin(0.5);
  tx.setTint(0xfff3c4, 0xfff3c4, 0xffc531, 0xffc531);
  return tx;
}
