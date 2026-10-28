import Phaser from 'phaser';
import { makeCanvas } from '@shared/cards/draw';
import { renderLocation } from '../art/locations';
import { LOCATIONS } from '../data/locations';

/** Menu background: a location scene, darkened, with floating suits. */
export function menuBackground(scene: Phaser.Scene, loc = 0): void {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const L = LOCATIONS[loc % LOCATIONS.length];
  const key = `menubg_${L.id}_${W}x${H}`;
  if (!scene.textures.exists(key)) {
    for (const k of scene.textures.getTextureKeys()) if (k.startsWith('menubg_')) scene.textures.remove(k);
    const [cv, c] = makeCanvas(W, H);
    c.drawImage(renderLocation(L, W, H, { table: false }), 0, 0);
    const g = c.createLinearGradient(0, H * 0.25, 0, H);
    g.addColorStop(0, 'rgba(10,6,20,0.25)');
    g.addColorStop(1, 'rgba(10,6,20,0.85)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    scene.textures.addCanvas(key, cv);
  }
  scene.add.image(0, 0, key).setOrigin(0);
  const suits = ['♠', '♥', '♦', '♣'];
  for (let i = 0; i < 10; i++) {
    const s = scene.add
      .text(Phaser.Math.Between(0, W), Phaser.Math.Between(H * 0.3, H), suits[i % 4], { fontFamily: 'Georgia', fontSize: `${Phaser.Math.Between(40, 90)}px`, color: '#ffffff' })
      .setAlpha(0.06)
      .setOrigin(0.5);
    scene.tweens.add({ targets: s, y: s.y - Phaser.Math.Between(80, 200), angle: Phaser.Math.Between(-30, 30), duration: Phaser.Math.Between(5000, 9000), yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
}

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
