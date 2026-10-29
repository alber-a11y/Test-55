import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Button, IconButton, Pill, txt, UI } from '@shared/ui/widgets';
import { faceTex, PLAYER_FACES } from '../art/avatars';
import { RANKS, rankOf } from '../data/meta';
import { STATIONS, worldOf } from '../data/route';
import { achvClaimable, dailyBonusState, questsReady, refreshDay, wheelFreeAvailable } from '../progress';
import { save } from '../save';
import { skin } from '../skin';
import { goldTitle, menuBackground } from '../ui/bg';

interface ModeCard {
  id: string;
  title: string;
  icon: string;
  color: number;
  onClick: () => void;
}

export class MenuScene extends BaseScene {
  constructor() {
    super('Menu');
  }

  create(): void {
    refreshDay();
    audio.playMusic('menu');
    const W = this.W;
    const H = this.H;
    const next = save.data.route.next;
    const world = Math.floor(next / STATIONS);
    menuBackground(this, world);
    this.playerBadge(30, 30);
    new Pill(this, W - 300, 80, 'i_coin', save.data.coins, 250).setDepth(10);
    new IconButton(this, W - 80, 80, 'i_gear', 104, 'dark').onClick(() => this.go('Settings', { from: 'Menu' }));

    const port = this.portrait;
    const titleY = port ? H * 0.2 : 200;
    // A fan of the four aces behind the title.
    if (port)
      [0, 1, 3, 2].forEach((s, i) => {
        this.add.image(W / 2 + (i - 1.5) * 80, titleY - 170 + Math.abs(i - 1.5) * 12, skin.face(s, 14)).setScale(0.55).setAngle((i - 1.5) * 12).setDepth(1);
      });
    const big = goldTitle(this, W / 2, titleY, '1000', port ? 190 : 150);
    this.tweens.add({ targets: big, scale: 1.04, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    txt(this, W / 2, titleY + (port ? 130 : 105), t('title'), port ? 64 : 52, '#ffffff').setFontFamily('Georgia, serif');
    this.train(port ? titleY + 210 : titleY + 165);

    const playY = port ? H * 0.43 : 470;
    const wd = worldOf(next);
    const play = new Button(this, W / 2, playY, { w: 660, h: 170, color: 'green', label: t('play'), size: 72, sub: `${getLang() === 'en' ? wd.en : wd.ru} · ${t('stationN', { n: (next % STATIONS) + 1 })}` });
    play.onClick(() => this.go('Map'));
    this.tweens.add({ targets: play, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    const modes: ModeCard[] = [
      { id: 'modes', title: t('modes'), icon: 'cards', color: 0x2b3d78, onClick: () => this.go('Modes') },
      { id: 'daily', title: t('daily'), icon: 'calendar', color: 0xa3213a, onClick: () => this.go('Modes', { open: 'daily' }) },
      { id: 'cup', title: t('cup'), icon: 'podium', color: 0x6a5a8c, onClick: () => this.go('Modes', { open: 'cup' }) },
      { id: 'etude', title: t('etude'), icon: 'hint', color: 0x2f6b4f, onClick: () => this.go('Modes', { open: 'etude' }) },
    ];
    if (port) {
      const cw = 470;
      const ch = 210;
      const top = playY + 190;
      modes.forEach((m, i) => this.modeCard(W / 2 + (i % 2 === 0 ? -cw / 2 - 15 : cw / 2 + 15), top + Math.floor(i / 2) * (ch + 28) + ch / 2, cw, ch, m));
    } else {
      const cw = Math.min(380, (W - 120) / 4 - 20);
      modes.forEach((m, i) => this.modeCard(W / 2 + (i - 1.5) * (cw + 24), 700, cw, 220, m));
    }

    const nav: [string, string, string, number][] = [
      ['shop', 'cart', 'Shop', 0],
      ['wheel', 'wheel', 'Wheel', wheelFreeAvailable() ? 1 : 0],
      ['bonus', 'gift', 'DailyBonus', dailyBonusState().can ? 1 : 0],
      ['quests', 'quests', 'Quests', questsReady()],
      ['achievements', 'trophy', 'Achievements', achvClaimable()],
      ['rivals', 'crown', 'Rivals', 0],
      ['leaders', 'podium', 'Leaderboard', 0],
      ['rules', 'rules', 'Rules', 0],
    ];
    const navY = H - (port ? 150 : 110);
    const bw = Math.min(124, (W - 40) / nav.length - 8);
    const g = this.add.graphics();
    g.fillStyle(UI.inkN, 0.6).fillRoundedRect(W / 2 - (nav.length * (bw + 10)) / 2 - 16, navY - bw / 2 - 18, nav.length * (bw + 10) + 32, bw + (port ? 90 : 76), 30);
    nav.forEach(([label, icon, scene, badge], i) => {
      const x = W / 2 + (i - (nav.length - 1) / 2) * (bw + 10);
      const b = new IconButton(this, x, navY, `i_${icon}`, bw, 'dark');
      b.onClick(() => this.go(scene, { from: 'Menu' }));
      if (badge > 0) b.setBadge(String(badge));
      const lb = txt(this, x, navY + bw / 2 + 26, t(label), 24, '#ffffff');
      if (lb.width > bw + 6) lb.setScale((bw + 6) / lb.width);
    });
    this.setupScene();
  }

  /** A little steam train running under the title. */
  private train(y: number): void {
    const W = this.W;
    const c = this.add.container(-260, y).setDepth(2);
    const cars = ['i_train', 'i_ticket', 'i_ticket', 'i_ticket'];
    cars.forEach((k, i) => c.add(this.add.image(-i * 92, 0, k).setDisplaySize(i === 0 ? 110 : 80, i === 0 ? 110 : 80).setFlipX(i === 0)));
    this.add.rectangle(W / 2, y + 52, W, 6, 0xc9a55c, 0.5).setDepth(1);
    this.tweens.add({ targets: c, x: W + 400, duration: 14000, repeat: -1, delay: 600 });
    this.time.addEvent({
      delay: 420,
      loop: true,
      callback: () => {
        const puff = this.add.circle(c.x + 20, y - 50, 16, 0xffffff, 0.5).setDepth(1);
        this.tweens.add({ targets: puff, y: puff.y - 70, x: puff.x - 60, scale: 2.4, alpha: 0, duration: 1400, onComplete: () => puff.destroy() });
      },
    });
  }

  private playerBadge(x: number, y: number): void {
    const s = save.data;
    const g = this.add.graphics();
    g.fillStyle(UI.inkN, 0.65).fillRoundedRect(x, y, 400, 104, 52);
    this.add.image(x + 52, y + 52, faceTex(this.textures, `me${s.avatar}`, PLAYER_FACES[s.avatar % PLAYER_FACES.length])).setDisplaySize(96, 96);
    txt(this, x + 112, y + 34, t('rk_' + RANKS[rankOf(s.rating)].id), 28, UI.gold).setOrigin(0, 0.5);
    txt(this, x + 112, y + 72, `${t('rating')}: ${s.rating} · ${t('lvShort')} ${s.plevel}`, 24, '#ffffff').setOrigin(0, 0.5);
    const z = this.add.zone(x + 200, y + 52, 400, 104).setInteractive({ useHandCursor: true });
    z.on('pointerup', () => this.go('Profile', { from: 'Menu' }));
  }

  private modeCard(x: number, y: number, w: number, h: number, m: ModeCard): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(UI.inkN, 0.9).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 12, 28);
    g.fillStyle(m.color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 26);
    g.lineStyle(3, 0xd9a23a, 0.7).strokeRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 22);
    g.fillStyle(0xffffff, 0.1).fillRoundedRect(-w / 2 + 8, -h / 2 + 6, w - 16, h * 0.3, 18);
    c.add(g);
    c.add(this.add.image(-w / 2 + 90, 0, `i_${m.icon}`).setDisplaySize(118, 118));
    const title = txt(this, -w / 2 + 170, -h * 0.17, m.title, 36, '#ffffff').setOrigin(0, 0.5);
    if (title.width > w - 190) title.setScale((w - 190) / title.width);
    c.add(title);
    const d = this.add
      .text(-w / 2 + 170, -h * 0.17 + 30, t(`${m.id}_d`), { fontFamily: 'Trebuchet MS, Arial', fontSize: '24px', color: '#eef2ff', wordWrap: { width: w - 190, useAdvancedWrap: true } })
      .setOrigin(0, 0);
    const room = h / 2 - 12 - d.y;
    if (d.height > room) d.setScale(room / d.height);
    c.add(d);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => this.tweens.add({ targets: c, scale: 0.96, duration: 60 }));
    c.on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 80 }));
    c.on('pointerup', () => {
      this.tweens.add({ targets: c, scale: 1, duration: 80 });
      audio.play('click');
      m.onClick();
    });
  }
}
