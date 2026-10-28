import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { claimDaily, DAILY_REWARDS, dailyAvailable, dailyDay } from '../core/economy';
import { t } from '../core/i18n';
import { ads } from '../platform/AdManager';
import { Button, Modal, toast, txt } from './widgets';

/** Daily gift calendar popup (7-day streak). */
export function showDaily(scene: Phaser.Scene, onDone?: () => void): void {
  const m = new Modal(scene, { w: 640, h: 820, title: t('daily'), titleColor: 'pink', close: true });
  m.onClosed = () => onDone?.();
  const day = dailyDay();
  const avail = dailyAvailable();
  DAILY_REWARDS.forEach((r, i) => {
    const row = Math.floor(i / 4);
    const inRow = row === 0 ? 4 : 3;
    const col = row === 0 ? i : i - 4;
    const x = (col - (inRow - 1) / 2) * 140;
    const y = -230 + row * 200;
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    const isToday = i + 1 === day && avail;
    const past = i + 1 < day || (i + 1 === day && !avail);
    g.fillStyle(0x2a1640, 1).fillRoundedRect(-62, -82, 124, 172, 18);
    g.fillStyle(isToday ? 0x52d273 : past ? 0x8b93a8 : 0xffb547, 1).fillRoundedRect(-58, -78, 116, 164, 16);
    c.add(g);
    c.add(txt(scene, 0, -56, t('day', { n: i + 1 }), 20));
    c.add(scene.add.image(0, 2, r.booster ? `ic_${r.booster}` : 'ic_coins').setDisplaySize(72, 72));
    c.add(txt(scene, 0, 60, `${r.coins}`, 26, '#fff6c8'));
    if (past) c.add(scene.add.image(36, -40, 'ic_check').setDisplaySize(48, 48));
    if (isToday) scene.tweens.add({ targets: c, scale: 1.07, duration: 500, yoyo: true, repeat: -1 });
    m.content.add(c);
  });
  if (!avail) {
    m.content.add(txt(scene, 0, 250, t('comeTomorrow'), 30, '#7a3f16', { stroke: '#fff6dc', strokeThickness: 4 }));
    return;
  }
  let done = false;
  const claim = (mult: number) => {
    if (done) return;
    done = true;
    claimDaily(mult);
    audio.play('unlock');
    toast(scene, t('got'), '#ffe14a');
    m.close();
  };
  const ad = new Button(scene, 0, 200, { w: 420, h: 92, label: `${t('claim')} ${t('claimX2')}`, size: 36, color: 'purple', ad: true });
  ad.onClick(async () => {
    const ok = await ads.rewarded();
    if (ok) claim(2);
    else toast(scene, t('adNoReward'));
  });
  const plain = new Button(scene, 0, 300, { w: 280, h: 72, label: t('claim'), size: 30, color: 'green' });
  plain.onClick(() => claim(1));
  m.content.add([ad, plain]);
}
