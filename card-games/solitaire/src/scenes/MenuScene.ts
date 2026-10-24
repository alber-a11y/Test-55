import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Button, IconButton, Pill, txt, UI } from '@shared/ui/widgets';
import { cityOfLevel, CITIES } from '../data/cities';
import { xpForLevel } from '../data/meta';
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
    const lvl = save.data.adv.max;
    const city = cityOfLevel(lvl);
    menuBackground(this, city);

    // Top bar: player level + coins + settings
    this.playerBadge(30, 30);
    new Pill(this, W - 300, 80, 'i_coin', save.data.coins, 250).setDepth(10);
    new IconButton(this, W - 80, 80, 'i_gear', 104, 'dark').onClick(() => this.go('Settings', { from: 'Menu' }));

    const port = this.portrait;
    const titleY = port ? H * 0.2 : 190;
    goldTitle(this, W / 2, titleY, t('title'), port ? 150 : 120);
    txt(this, W / 2, titleY + (port ? 110 : 95), t('subtitle'), port ? 60 : 50, '#ffffff').setFontFamily('Georgia, serif');

    // Main play button
    const playY = port ? H * 0.37 : 420;
    const play = new Button(this, W / 2, playY, { w: 620, h: 170, color: 'green', label: t('play'), size: 72, sub: `${t('levelN', { n: lvl })} · ${getLang() === 'en' ? city.en : city.ru}` });
    play.onClick(() => this.go('Map'));
    this.tweens.add({ targets: play, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Resume classic game
    let modesTop = playY + 140;
    if (save.data.resume) {
      // Portrait: under PLAY (mode cards move down). Landscape: beside PLAY so it never hides behind the cards.
      const r = save.data.resume as { mode: string };
      const label = `${t('resume')}: ${t(r.mode)}`;
      if (port) {
        new Button(this, W / 2, playY + 160, { w: 620, h: 90, color: 'blue', label, size: 32 }).onClick(() => this.go('Classic', { resume: true }));
        modesTop += 110;
      } else {
        const rb = new Button(this, W / 2 + 310 + 40 + 170, playY, { w: 340, h: 120, color: 'blue', label: t('resume'), sub: t(r.mode), size: 30 }).onClick(() => this.go('Classic', { resume: true }));
        if (rb.label && rb.label.width > 320) rb.label.setScale(320 / rb.label.width);
      }
    }

    // Mode cards
    const modes: ModeCard[] = [
      { id: 'klondike', title: t('klondike'), icon: 'cards', color: 0x2f6fd0, onClick: () => this.go('ModeSetup', { mode: 'klondike' }) },
      { id: 'spider', title: t('spider'), icon: 'cards', color: 0x7048c8, onClick: () => this.go('ModeSetup', { mode: 'spider' }) },
      { id: 'freecell', title: t('freecell'), icon: 'cards', color: 0x1c8f8a, onClick: () => this.go('ModeSetup', { mode: 'freecell' }) },
      { id: 'blitz', title: t('blitz'), icon: 'timer', color: 0xd9700f, onClick: () => this.go('ModeSetup', { mode: 'blitz' }) },
      { id: 'daily', title: t('daily'), icon: 'calendar', color: 0xc8323c, onClick: () => this.go('Daily') },
    ];
    if (port) {
      const cw = 470;
      const ch = 210;
      const top = modesTop + 60;
      modes.forEach((m, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const last = i === modes.length - 1 && modes.length % 2 === 1;
        const x = last ? W / 2 : W / 2 + (col === 0 ? -cw / 2 - 15 : cw / 2 + 15);
        this.modeCard(x, top + row * (ch + 30) + ch / 2, last ? cw * 2 + 30 : cw, ch, m);
      });
    } else {
      const cw = Math.min(330, (W - 120) / 5 - 20);
      const ch = 230;
      const y = 650;
      modes.forEach((m, i) => this.modeCard(W / 2 + (i - 2) * (cw + 24), y, cw, ch, m));
    }

    // Bottom navigation
    const nav: [string, string, string, number][] = [
      ['shop', 'cart', 'Shop', 0],
      ['wheel', 'wheel', 'Wheel', wheelFreeAvailable() ? 1 : 0],
      ['bonus', 'gift', 'DailyBonus', dailyBonusState().can ? 1 : 0],
      ['quests', 'quests', 'Quests', questsReady()],
      ['achievements', 'trophy', 'Achievements', achvClaimable()],
      ['collection', 'album', 'Collection', 0],
      ['leaders', 'podium', 'Leaderboard', 0],
      ['rules', 'rules', 'Rules', 0],
    ];
    const navY = H - (port ? 150 : 120);
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

    // Light-up ad-free hint for first-time players
    if (!save.data.tutorial.menu) {
      save.data.tutorial.menu = true;
      save.save();
    }
    this.setupScene();
  }

  private playerBadge(x: number, y: number): void {
    const s = save.data;
    const g = this.add.graphics();
    g.fillStyle(UI.inkN, 0.6).fillRoundedRect(x, y, 330, 100, 50);
    const av = this.add.image(x + 50, y + 50, `avatar_${s.avatar}`).setDisplaySize(92, 92);
    if (!this.textures.exists(`avatar_${s.avatar}`)) av.setTexture('i_user').setDisplaySize(80, 80);
    txt(this, x + 200, y + 32, `${t('playerLevel')} ${s.plevel}`, 26, '#ffffff');
    const p = s.xp / xpForLevel(s.plevel);
    g.fillStyle(0x34466e, 1).fillRoundedRect(x + 110, y + 58, 200, 22, 11);
    g.fillStyle(0x5ad17e, 1).fillRoundedRect(x + 110, y + 58, Math.max(22, 200 * p), 22, 11);
    const z = this.add.zone(x + 165, y + 50, 330, 100).setInteractive({ useHandCursor: true });
    z.on('pointerup', () => this.go('Profile', { from: 'Menu' }));
  }

  private modeCard(x: number, y: number, w: number, h: number, m: ModeCard): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(UI.inkN, 0.9).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 12, 28);
    g.fillStyle(m.color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 26);
    g.fillStyle(0xffffff, 0.12).fillRoundedRect(-w / 2 + 8, -h / 2 + 6, w - 16, h * 0.3, 18);
    c.add(g);
    // Mini fan of cards as illustration
    const faces = m.id === 'spider' ? [[0, 13], [0, 12], [0, 11]] : m.id === 'freecell' ? [[1, 1], [0, 2], [2, 3]] : m.id === 'blitz' ? [[3, 7], [1, 8], [2, 9]] : m.id === 'daily' ? [[1, 12], [2, 1], [0, 13]] : [[1, 13], [3, 12], [2, 1]];
    const small = h > 220 ? 0.4 : 0.36;
    const vertical = w < 400;
    const fx = vertical ? 0 : w > 600 ? -w / 2 + 120 : -w / 2 + 92;
    const fy = vertical ? -16 : 6;
    faces.forEach(([s, r], i) => {
      const img = this.add.image(fx + (i - 1) * 34, fy, skin.cards.face(s as 0, r)).setScale(small).setAngle((i - 1) * 12);
      c.add(img);
    });
    const tx = vertical ? 0 : fx + 90;
    const title = vertical ? txt(this, 0, h / 2 - 36, m.title, 34, '#ffffff') : txt(this, tx, -h * 0.16, m.title, w > 400 ? 42 : 34, '#ffffff').setOrigin(0, 0.5);
    const maxW = vertical ? w - 30 : w / 2 - tx - 20;
    if (title.width > maxW) title.setScale(maxW / title.width);
    c.add(title);
    if (w > 400) {
      const d = this.add
        .text(tx, h * 0.1, t(`${m.id}_d`), { fontFamily: 'Trebuchet MS, Arial', fontSize: '26px', color: '#eef2ff', wordWrap: { width: w / 2 - tx - 20, useAdvancedWrap: true } })
        .setOrigin(0, 0.5);
      c.add(d);
    }
    c.add(this.add.image(w / 2 - 40, -h / 2 + 40, `i_${m.icon}`).setDisplaySize(56, 56));
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => this.tweens.add({ targets: c, scale: 0.96, duration: 60 }));
    c.on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 80 }));
    c.on('pointerup', () => {
      this.tweens.add({ targets: c, scale: 1, duration: 80 });
      audio.play('click');
      m.onClick();
    });
    void CITIES;
  }
}
