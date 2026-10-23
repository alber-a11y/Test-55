import Phaser from 'phaser';
import { audio } from '@shared/audio/audio';
import { t } from '@shared/core/i18n';
import { ads } from '@shared/platform/ads';
import { openModal } from '@shared/ui/modal';
import { Button, IconButton, Pill, toast, txt, UI } from '@shared/ui/widgets';
import type { BaseScene } from '@shared/ui/base';
import { booster, type BoosterId } from '../data/boosters';
import type { Reward } from '../data/meta';
import { grant } from '../progress';
import { save } from '../save';

/** Rewarded ad wrapped with feedback. Calls `onReward` only when the ad was watched. */
export async function watchAd(scene: Phaser.Scene, placement: string, onReward: () => void): Promise<boolean> {
  const ok = await ads.rewarded(placement);
  if (!scene.sys.isActive() && !scene.sys.isPaused()) return ok;
  if (ok) {
    save.data.totals.ads++;
    onReward();
  } else toast(scene, t('adNoReward'), '#ffd166');
  return ok;
}

/** Top bar with back button, title and coin counter. Returns the coin pill for updates. */
export function topBar(scene: BaseScene, title: string, onBack: () => void, opts: { coins?: boolean } = {}): Pill | null {
  const W = scene.scale.width;
  const g = scene.add.graphics().setDepth(50);
  g.fillStyle(UI.inkN, 0.55).fillRect(0, 0, W, 150);
  new IconButton(scene, 80, 78, 'i_back', 104, 'dark').onClick(onBack).setDepth(51);
  txt(scene, W / 2, 78, title, 56, UI.gold).setDepth(51);
  if (opts.coins === false) return null;
  const pill = new Pill(scene, W - 170, 78, 'i_coin', save.data.coins, 250).setDepth(51);
  return pill;
}

export function boosterName(id: BoosterId): string {
  return t(`b_${id}`);
}

/** Row of reward icons (coins, boosters) centered at x,y. */
export function rewardRow(scene: Phaser.Scene, x: number, y: number, r: Reward, size = 110): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const items: [string, string][] = [];
  if (r.coins) items.push(['i_coin', `+${r.coins}`]);
  if (r.boosters) for (const [k, v] of Object.entries(r.boosters)) if (v) items.push([`i_${booster(k as BoosterId).icon}`, `×${v}`]);
  if (r.xp) items.push(['i_star', `+${r.xp} XP`]);
  const step = size * 1.6;
  items.forEach(([icon, label], i) => {
    const ix = (i - (items.length - 1) / 2) * step;
    c.add(scene.add.image(ix, 0, icon).setDisplaySize(size, size));
    c.add(txt(scene, ix, size * 0.62, label, size * 0.36, '#ffffff'));
  });
  return c;
}

/** Modal that shows a reward and grants it on close (optionally with an ×2 rewarded button). */
export function rewardPopup(scene: Phaser.Scene, title: string, r: Reward, onDone?: () => void, opts: { x2?: string; already?: boolean } = {}): void {
  const W = scene.scale.width;
  const m = openModal(scene, title, Math.min(W - 60, 860), 640, undefined, { closable: false, depth: 800 });
  audio.play('chest');
  const cy = m.y + 290;
  const rays = scene.add.image(W / 2, cy - 20, 'i_sparkle').setDisplaySize(380, 380).setAlpha(0.35);
  scene.tweens.add({ targets: rays, angle: 360, duration: 9000, repeat: -1 });
  m.root.add(rays);
  const row = rewardRow(scene, W / 2, cy - 30, r, 130);
  m.root.add(row);
  row.setScale(0.2);
  scene.tweens.add({ targets: row, scale: 1, duration: 380, ease: 'Back.Out' });
  const finish = (mult: number) => {
    if (!opts.already) {
      grant(r);
      if (mult > 1) grant(r);
    } else if (mult > 1) grant(r);
    audio.play('coins');
    m.close();
    onDone?.();
  };
  const by = m.y + m.h - 100;
  if (opts.x2) {
    m.root.add(new Button(scene, W / 2 - 190, by, { w: 330, h: 110, color: 'green', label: t('x2'), size: 36, ad: true }).onClick(() => void watchAd(scene, opts.x2!, () => finish(2))));
    m.root.add(new Button(scene, W / 2 + 190, by, { w: 300, h: 110, color: 'gold', label: t('claim'), size: 38 }).onClick(() => finish(1)));
  } else {
    m.root.add(new Button(scene, W / 2, by, { w: 380, h: 116, color: 'gold', label: t('claim'), size: 40 }).onClick(() => finish(1)));
  }
}

/** Simple yes/no modal. */
export function confirm(scene: Phaser.Scene, message: string, onYes: () => void): void {
  const W = scene.scale.width;
  const m = openModal(scene, t('pause'), Math.min(W - 60, 820), 520, undefined, { depth: 900 });
  m.root.add(txt(scene, W / 2, m.y + 220, message, 40, '#ffffff', { wordWrap: { width: m.w - 100 } }));
  m.root.add(new Button(scene, W / 2 - 170, m.y + m.h - 100, { w: 280, h: 106, color: 'red', label: t('yes'), size: 40 }).onClick(() => {
    m.close();
    onYes();
  }));
  m.root.add(new Button(scene, W / 2 + 170, m.y + m.h - 100, { w: 280, h: 106, color: 'green', label: t('no'), size: 40 }).onClick(() => m.close()));
}

/** Short "coins flew into the counter" effect. */
export function coinBurst(scene: Phaser.Scene, fromX: number, fromY: number, toX: number, toY: number, n = 8): void {
  audio.play('coins');
  for (let i = 0; i < n; i++) {
    const c = scene.add.image(fromX + Phaser.Math.Between(-60, 60), fromY + Phaser.Math.Between(-40, 40), 'i_coin').setDisplaySize(64, 64).setDepth(5000);
    scene.tweens.add({ targets: c, x: toX, y: toY, scale: 0.2, duration: 520 + i * 40, delay: i * 30, ease: 'Cubic.In', onComplete: () => c.destroy() });
  }
}
