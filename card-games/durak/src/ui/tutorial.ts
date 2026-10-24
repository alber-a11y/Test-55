import Phaser from 'phaser';
import { t } from '@shared/core/i18n';
import { Button, UI } from '@shared/ui/widgets';

/** Speech-bubble tip with an optional pointing hand; closes on OK. */
export function showTip(scene: Phaser.Scene, text: string, point?: { x: number; y: number }, onDone?: () => void): Phaser.GameObjects.Container {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const c = scene.add.container(0, 0).setDepth(3000);
  const dim = scene.add.rectangle(0, 0, W, H, UI.dim, 0.45).setOrigin(0).setInteractive();
  c.add(dim);
  const bw = Math.min(W - 80, 900);
  const by = point && point.y > H * 0.55 ? H * 0.3 : H * 0.62;
  const body = scene.add
    .text(W / 2, by, text, { fontFamily: 'Trebuchet MS, Arial', fontSize: '40px', fontStyle: 'bold', color: '#1a1426', align: 'center', wordWrap: { width: bw - 80, useAdvancedWrap: true }, lineSpacing: 8 })
    .setOrigin(0.5);
  const bh = body.height + 190;
  const g = scene.add.graphics();
  g.fillStyle(UI.inkN, 1).fillRoundedRect(W / 2 - bw / 2 - 5, by - body.height / 2 - 55, bw + 10, bh + 10, 36);
  g.fillStyle(0xfff6e0, 1).fillRoundedRect(W / 2 - bw / 2, by - body.height / 2 - 50, bw, bh, 32);
  c.add([g, body]);
  const ok = new Button(scene, W / 2, by + body.height / 2 + 70, { w: 260, h: 96, color: 'green', label: t('ok'), size: 40 });
  c.add(ok);
  let hand: Phaser.GameObjects.Image | null = null;
  if (point) {
    const ring = scene.add.circle(point.x, point.y, 90, 0xffffff, 0).setStrokeStyle(8, 0xffd166, 1);
    c.add(ring);
    scene.tweens.add({ targets: ring, scale: { from: 0.7, to: 1.2 }, alpha: { from: 1, to: 0.2 }, duration: 800, repeat: -1 });
    hand = scene.add.image(point.x + 40, point.y + 70, 'i_hand').setDisplaySize(130, 130).setAngle(-20);
    c.add(hand);
    scene.tweens.add({ targets: hand, y: hand.y + 26, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
  ok.onClick(() => {
    c.destroy();
    onDone?.();
  });
  return c;
}
