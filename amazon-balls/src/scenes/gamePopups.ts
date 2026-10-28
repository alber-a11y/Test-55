import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { ballKey } from '../art/balls';
import { addBooster, addCoins, boosterCount, coins, equipped, spend } from '../core/economy';
import { t } from '../core/i18n';
import { save } from '../core/save';
import { PRE_LEVEL, type PreBooster } from '../data/boosters';
import { ads } from '../platform/AdManager';
import { AD_CONFIG } from '../platform/ads.config';
import { Button, Modal, RoundButton, toast, txt } from '../ui/widgets';
import type { GameScene } from './GameScene';

function goalLine(scene: GameScene): string {
  const g = scene.def.goal;
  if (g.type === 'rescue') return t('goal_rescue', { n: g.count });
  if (g.type === 'collect') return t('goal_collect', { n: g.count });
  return t('goal_clear');
}

/** Goal card used by several popups. */
function goalCard(scene: GameScene, m: Modal, y: number, w = 520): void {
  const g = scene.add.graphics();
  g.fillStyle(0xc98a3a, 0.35).fillRoundedRect(-w / 2, y - 62, w, 124, 24);
  m.content.add(g);
  const goal = scene.def.goal;
  if (goal.type === 'rescue') {
    const n = goal.count;
    for (let i = 0; i < n; i++) {
      const img = scene.add.image(-((n - 1) * 46) / 2 + i * 46, y - 18, `sp_animal_${i % 5}`).setDisplaySize(56, 56);
      m.content.add(img);
      scene.tweens.add({ targets: img, y: img.y - 6, duration: 500 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  } else {
    const key = goal.type === 'collect' ? ballKey(equipped('balls'), goal.color) : 'ic_target';
    m.content.add(scene.add.image(0, y - 18, key).setDisplaySize(66, 66));
  }
  m.content.add(txt(scene, 0, y + 34, goalLine(scene), 30, '#ffffff'));
}

export function showIntro(scene: GameScene): void {
  const m = new Modal(scene, { w: 640, h: 760, title: t('levelBig', { n: scene.level }), close: true });
  m.onClosed = null;
  let started = false;
  const closeBtn = m.content.list.find((o) => o instanceof RoundButton) as RoundButton | undefined;
  closeBtn?.onClick(() => {
    if (started) return;
    started = true;
    m.close();
    scene.leave('Map');
  });
  let y = -250;
  if (scene.def.boss) {
    const b = txt(scene, 0, y, `★ ${t('boss')} ★`, 32, '#ffe14a');
    m.content.add(b);
    scene.tweens.add({ targets: b, scale: 1.08, duration: 600, yoyo: true, repeat: -1 });
    y += 40;
  }
  goalCard(scene, m, y + 70);
  m.content.add(txt(scene, 0, y + 175, t('preBoosters'), 28, '#7a3f16', { stroke: '#fff6dc', strokeThickness: 4 }));
  const chosen = new Set<PreBooster>();
  PRE_LEVEL.forEach((id, i) => {
    const x = (i - 1) * 180;
    const slot = scene.add.container(x, y + 290);
    const bg = scene.add.graphics();
    const draw = () => {
      bg.clear();
      bg.fillStyle(0x2a1640, 1).fillRoundedRect(-76, -76, 152, 170, 24);
      bg.fillStyle(chosen.has(id) ? 0x52d273 : 0x8a4dff, 1).fillRoundedRect(-72, -72, 144, 162, 20);
      bg.fillStyle(0xffffff, 0.2).fillRoundedRect(-64, -66, 128, 22, 10);
    };
    draw();
    const icon = scene.add.image(0, -14, `ic_${id}`).setDisplaySize(96, 96);
    const name = txt(scene, 0, 60, t(`b_${id}`), 19, '#ffffff', { wordWrap: { width: 140 } });
    const badge = txt(scene, 50, -56, '', 24, '#ffffff');
    const check = scene.add.image(-46, -50, 'ic_check').setDisplaySize(46, 46).setVisible(false);
    const refresh = () => {
      const n = boosterCount(id);
      badge.setText(n > 0 ? String(n) : '▶');
      badge.setColor(n > 0 ? '#ffffff' : '#ffe14a');
      check.setVisible(chosen.has(id));
      draw();
    };
    refresh();
    slot.add([bg, icon, name, badge, check]);
    slot.setSize(152, 170).setInteractive({ useHandCursor: true });
    slot.on('pointerup', async () => {
      audio.play('click', { vol: 0.6 });
      if (chosen.has(id)) chosen.delete(id);
      else if (boosterCount(id) > 0) chosen.add(id);
      else {
        const ok = await ads.rewarded();
        if (!ok) return toast(scene, t('adNoReward'));
        addBooster(id, 1);
        chosen.add(id);
        audio.play('unlock', { vol: 0.6 });
      }
      refresh();
      scene.tweens.add({ targets: slot, scale: { from: 1.1, to: 1 }, duration: 160 });
    });
    m.content.add(slot);
  });
  const play = new Button(scene, 0, 300, { w: 380, h: 100, label: t('play'), size: 46, color: 'green' });
  scene.tweens.add({ targets: play, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  play.onClick(() => {
    if (started) return;
    started = true;
    m.close();
    scene.startLevel([...chosen]);
  });
  m.content.add(play);
}

export function showPause(scene: GameScene, onResume: () => void): void {
  const m = new Modal(scene, { w: 600, h: 860, title: t('pause'), titleColor: 'blue' });
  const resume = new Button(scene, 0, -270, { w: 420, h: 92, label: t('resume'), size: 38, color: 'green', icon: 'ic_play', iconSize: 50 });
  resume.onClick(() => {
    m.close();
    onResume();
  });
  const restart = new Button(scene, 0, -160, { w: 420, h: 84, label: t('restart'), size: 32, color: 'orange', icon: 'ic_restart', iconSize: 48 });
  restart.onClick(() => {
    m.close();
    scene.leave('Game', { level: scene.level }, 'restart');
  });
  const map = new Button(scene, 0, -60, { w: 420, h: 84, label: t('map'), size: 32, color: 'blue', icon: 'ic_map', iconSize: 52 });
  map.onClick(() => {
    m.close();
    scene.leave('Map');
  });
  const menu = new Button(scene, 0, 40, { w: 420, h: 84, label: t('mainMenu'), size: 32, color: 'blue', icon: 'ic_home', iconSize: 48 });
  menu.onClick(() => {
    m.close();
    scene.leave('Menu');
  });
  const shop = new Button(scene, -108, 148, { w: 204, h: 84, label: t('shop'), size: 26, color: 'pink', icon: 'ic_shop', iconSize: 48 });
  shop.onClick(() => scene.openOverlay('Shop'));
  const settings = new Button(scene, 108, 148, { w: 204, h: 84, label: t('settings'), size: 22, color: 'purple', icon: 'ic_gear', iconSize: 48 });
  settings.onClick(() => scene.openOverlay('Settings'));
  m.content.add([resume, restart, map, menu, shop, settings]);
  // Quick sound toggles.
  const mkToggle = (x: number, icon: string, get: () => number, set: (v: number) => void) => {
    const b = new RoundButton(scene, x, 270, icon, 80, 'orange');
    const cross = scene.add.image(0, 0, 'ic_close').setDisplaySize(44, 44);
    b.add(cross);
    const refresh = () => {
      cross.setVisible(get() <= 0);
      b.icon.setAlpha(get() > 0 ? 1 : 0.5);
    };
    refresh();
    b.onClick(() => {
      set(get() > 0 ? 0 : 0.7);
      audio.setVolumes(save.data.settings.soundVol, save.data.settings.musicVol);
      save.save();
      refresh();
    });
    m.content.add(b);
  };
  mkToggle(-70, 'ic_music', () => save.data.settings.musicVol, (v) => (save.data.settings.musicVol = v));
  mkToggle(70, 'ic_sound', () => save.data.settings.soundVol, (v) => (save.data.settings.soundVol = v));
}

export function showVictory(scene: GameScene, stars: number): void {
  const m = new Modal(scene, { w: 640, h: 860, title: t('victory'), titleColor: 'green' });
  // Capybara cheering.
  const capy = scene.add.image(0, -250, 'capy').setDisplaySize(210, 189);
  m.content.add(capy);
  scene.tweens.add({ targets: capy, y: -262, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  // Stars.
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 130;
    const y = i === 1 ? -110 : -90;
    m.content.add(scene.add.image(x, y, 'ic_starEmpty').setDisplaySize(i === 1 ? 120 : 100, i === 1 ? 120 : 100));
    if (i < stars) {
      const s = scene.add.image(x, y, 'ic_star').setDisplaySize(10, 10).setAlpha(0);
      m.content.add(s);
      scene.tweens.add({
        targets: s,
        displayWidth: i === 1 ? 124 : 104,
        displayHeight: i === 1 ? 124 : 104,
        alpha: 1,
        delay: 350 + i * 300,
        duration: 320,
        ease: 'Back.out',
        onStart: () => audio.play('star', { rate: 1 + i * 0.12 }),
      });
    }
  }
  const base = scene.baseReward();
  m.content.add(txt(scene, 0, -2, `${t('coinsEarned')}: +${scene.levelCoins}`, 24, '#7a3f16', { stroke: '#fff6dc', strokeThickness: 4 }));
  m.content.add(scene.add.image(-60, 60, 'ic_coin').setDisplaySize(70, 70));
  m.content.add(txt(scene, 30, 58, `+${base}`, 54, '#ffe14a'));
  // Multiplier needle.
  const mults = AD_CONFIG.winMultipliers;
  const barW = 500;
  const segW = barW / mults.length;
  const bar = scene.add.graphics();
  const segCols = [0x52d273, 0xffb547, 0xff4fb4, 0xffb547, 0x52d273];
  bar.fillStyle(0x2a1640, 1).fillRoundedRect(-barW / 2 - 6, 118, barW + 12, 66, 18);
  mults.forEach((mu, i) => {
    bar.fillStyle(segCols[i % segCols.length], 1).fillRect(-barW / 2 + i * segW + 2, 124, segW - 4, 54);
    m.content.add(txt(scene, -barW / 2 + i * segW + segW / 2, 150, `×${mu}`, 28));
  });
  m.content.addAt(bar, m.content.list.length - mults.length);
  const needle = scene.add.triangle(0, 112, -14, -18, 14, -18, 0, 10, 0xffffff).setStrokeStyle(4, 0x2a1640);
  m.content.add(needle);
  let pos = 0;
  let dir = 1;
  let stopped = false;
  const mult = () => mults[Math.min(mults.length - 1, Math.floor((pos * barW) / segW))];
  const adBtn = new Button(scene, 0, 262, { w: 440, h: 96, label: t('claimX', { n: mult() }), size: 38, color: 'purple', ad: true });
  const plainBtn = new Button(scene, 0, 362, { w: 300, h: 72, label: t('claim'), size: 28, color: 'green' });
  const ticker = scene.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      if (stopped) return;
      const prev = mult();
      pos += dir * 0.018;
      if (pos >= 0.999 || pos <= 0) dir = -dir;
      pos = Phaser.Math.Clamp(pos, 0, 0.999);
      needle.x = -barW / 2 + pos * barW;
      if (mult() !== prev) {
        adBtn.setLabel(t('claimX', { n: mult() }));
        audio.play('tick', { vol: 0.3 });
      }
    },
  });
  let done = false;
  const finish = (k: number, rewarded: boolean) => {
    if (done) return;
    done = true;
    ticker.remove();
    addCoins(base * k);
    scene.completeLevel(stars);
    audio.play('coin');
    scene.usedRewardedForWin = rewarded;
    for (let i = 0; i < 8; i++) {
      const c = scene.add.image(m.content.x - 60, m.content.y + 60, 'ic_coin').setDepth(6000).setDisplaySize(44, 44);
      scene.tweens.add({ targets: c, x: m.content.x + 220, y: m.content.y - 400, delay: i * 50, duration: 520, ease: 'Cubic.in', onComplete: () => c.destroy() });
    }
    scene.time.delayedCall(700, () => {
      m.close();
      scene.leave('Game', { level: scene.level + 1 }, 'win');
    });
  };
  adBtn.onClick(async () => {
    if (done) return;
    stopped = true;
    const k = mult();
    const ok = await ads.rewarded();
    if (ok) finish(k, true);
    else {
      toast(scene, t('adNoReward'));
      stopped = false;
    }
  });
  plainBtn.onClick(() => finish(1, false));
  const mapBtn = new RoundButton(scene, -250, 362, 'ic_map', 72, 'blue');
  mapBtn.onClick(() => {
    if (done) return;
    done = true;
    ticker.remove();
    addCoins(base);
    scene.completeLevel(stars);
    m.close();
    scene.leave('Map', {}, 'win');
  });
  m.content.add([adBtn, plainBtn, mapBtn]);
}

export function showOutOfShots(scene: GameScene): void {
  const m = new Modal(scene, { w: 620, h: 720, title: t('outOfShots'), titleColor: 'orange' });
  const g = scene.def.goal;
  const prog =
    g.type === 'rescue' ? scene.progress.rescued / g.count : g.type === 'collect' ? scene.progress.collected / g.count : 1 - scene.board.count() / scene.initialCount;
  m.content.add(scene.add.image(0, -205, 'sloth').setDisplaySize(170, 196));
  if (prog >= 0.6) m.content.add(txt(scene, 0, -85, t('almost'), 30, '#ff3d5a', { stroke: '#fff6dc', strokeThickness: 5 }));
  goalCard(scene, m, 10, 500);
  const shots = AD_CONFIG.continueShots;
  let y = 130;
  if (scene.continues < AD_CONFIG.maxContinues) {
    const ad = new Button(scene, 0, y, { w: 440, h: 96, label: t('continueShots', { n: shots }), size: 36, color: 'purple', ad: true });
    ad.onClick(async () => {
      const ok = await ads.rewarded();
      if (!ok) return toast(scene, t('adNoReward'));
      m.close();
      scene.continueWith(shots);
    });
    m.content.add(ad);
    y += 104;
  }
  const price = 250 * (scene.continues + 1);
  const buy = new Button(scene, 0, y, { w: 400, h: 80, label: `${t('continueShots', { n: shots })}`, sub: `${price}`, size: 28, color: 'orange', icon: 'ic_coin', iconSize: 52 });
  buy.onClick(() => {
    if (!spend(price)) {
      audio.play('error');
      return toast(scene, t('notEnough'));
    }
    audio.play('buy');
    m.close();
    scene.continueWith(shots);
  });
  if (coins() < price) buy.setAlpha(0.7);
  m.content.add(buy);
  const give = new Button(scene, 0, y + 92, { w: 240, h: 64, label: t('giveUp'), size: 24, color: 'red' });
  give.onClick(() => {
    m.close();
    scene.giveUp();
  });
  m.content.add(give);
}

export function showDefeat(scene: GameScene): void {
  const m = new Modal(scene, { w: 620, h: 720, title: t('failed'), titleColor: 'red' });
  const capy = scene.add.image(0, -170, 'capy_blink').setDisplaySize(230, 207);
  m.content.add(capy);
  scene.tweens.add({ targets: capy, angle: { from: -3, to: 3 }, duration: 900, yoyo: true, repeat: -1 });
  m.content.add(txt(scene, 0, -30, t('tryAgain'), 26, '#7a3f16', { stroke: '#fff6dc', strokeThickness: 4, wordWrap: { width: 520 } }));
  m.content.add(txt(scene, 0, 20, `${t('coinsEarned')}: +${scene.levelCoins}`, 24, '#7a3f16', { stroke: '#fff6dc', strokeThickness: 4 }));
  const retry = new Button(scene, 0, 110, { w: 420, h: 96, label: t('retry'), size: 40, color: 'green', icon: 'ic_restart', iconSize: 52 });
  retry.onClick(() => {
    m.close();
    scene.leave('Game', { level: scene.level }, 'lose');
  });
  m.content.add(retry);
  const items: [string, string, () => void][] = [
    ['ic_map', t('map'), () => scene.leave('Map', {}, 'lose')],
    ['ic_home', t('menu'), () => scene.leave('Menu', {}, 'lose')],
    ['ic_shop', t('shop'), () => scene.openOverlay('Shop')],
    ['ic_gear', t('settings'), () => scene.openOverlay('Settings')],
  ];
  items.forEach(([icon, label, fn], i) => {
    const b = new RoundButton(scene, (i - 1.5) * 130, 250, icon, 84, i < 2 ? 'blue' : 'orange', label);
    b.onClick(() => {
      if (i < 2) m.close();
      fn();
    });
    m.content.add(b);
  });
}
