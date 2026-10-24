import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Button, IconButton, Pill, txt, UI } from '@shared/ui/widgets';
import { faceTex, PLAYER_FACES } from '../art/avatars';
import { LOCATIONS, locOf, TABLES_PER_LOC } from '../data/locations';
import { LEAGUES, leagueOf } from '../data/meta';
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
    const next = save.data.career.next;
    const loc = Math.floor(next / TABLES_PER_LOC) % LOCATIONS.length;
    menuBackground(this, loc);
    this.playerBadge(30, 30);
    new Pill(this, W - 300, 80, 'i_coin', save.data.coins, 250).setDepth(10);
    new IconButton(this, W - 80, 80, 'i_gear', 104, 'dark').onClick(() => this.go('Settings', { from: 'Menu' }));

    const port = this.portrait;
    const titleY = port ? H * 0.19 : 185;
    goldTitle(this, W / 2, titleY, t('title'), port ? 170 : 130);
    txt(this, W / 2, titleY + (port ? 128 : 100), t('subtitle'), port ? 60 : 50, '#ffffff').setFontFamily('Georgia, serif');
    // Fan of aces as decoration
    const aces: [number, number][] = [[0, 14], [1, 14], [3, 14], [2, 14]];
    if (port)
      aces.forEach(([s, r], i) => {
        const img = this.add.image(W / 2 + (i - 1.5) * 70, titleY - 190 + Math.abs(i - 1.5) * 10, skin.face(s, r)).setScale(0.55).setAngle((i - 1.5) * 12);
        img.setDepth(-1);
      });

    const playY = port ? H * 0.38 : 410;
    const L = locOf(next);
    const play = new Button(this, W / 2, playY, { w: 640, h: 170, color: 'green', label: t('play'), size: 72, sub: `${t('career')} · ${getLang() === 'en' ? L.en : L.ru} ${(next % TABLES_PER_LOC) + 1}/${TABLES_PER_LOC}` });
    play.onClick(() => this.go('Career'));
    this.tweens.add({ targets: play, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    const modes: ModeCard[] = [
      { id: 'quick', title: t('quick'), icon: 'lightning', color: 0x2f6fd0, onClick: () => this.go('QuickSetup') },
      { id: 'tournament', title: t('tournament'), icon: 'podium', color: 0x7048c8, onClick: () => this.go('Tournament', { fresh: true }) },
      { id: 'puzzles', title: t('puzzles'), icon: 'hint', color: 0x1c8f8a, onClick: () => this.go('Puzzles') },
      { id: 'dailyTable', title: t('dailyTable'), icon: 'calendar', color: 0xc8323c, onClick: () => this.go('DailyTable') },
    ];
    if (port) {
      const cw = 470;
      const ch = 220;
      const top = playY + 200;
      modes.forEach((m, i) => this.modeCard(W / 2 + (i % 2 === 0 ? -cw / 2 - 15 : cw / 2 + 15), top + Math.floor(i / 2) * (ch + 30) + ch / 2, cw, ch, m));
    } else {
      const cw = Math.min(380, (W - 120) / 4 - 20);
      modes.forEach((m, i) => this.modeCard(W / 2 + (i - 1.5) * (cw + 24), 660, cw, 230, m));
    }

    const nav: [string, string, string, number][] = [
      ['shop', 'cart', 'Shop', 0],
      ['wheel', 'wheel', 'Wheel', wheelFreeAvailable() ? 1 : 0],
      ['bonus', 'gift', 'DailyBonus', dailyBonusState().can ? 1 : 0],
      ['quests', 'quests', 'Quests', questsReady()],
      ['achievements', 'trophy', 'Achievements', achvClaimable()],
      ['trophies', 'crown', 'Trophies', 0],
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
    this.setupScene();
  }

  private playerBadge(x: number, y: number): void {
    const s = save.data;
    const g = this.add.graphics();
    g.fillStyle(UI.inkN, 0.65).fillRoundedRect(x, y, 380, 104, 52);
    this.add.image(x + 52, y + 52, faceTex(this.textures, `me${s.avatar}`, PLAYER_FACES[s.avatar % PLAYER_FACES.length])).setDisplaySize(96, 96);
    const lg = LEAGUES[leagueOf(s.rating)].id;
    txt(this, x + 112, y + 34, t('lg_' + lg), 28, UI.gold).setOrigin(0, 0.5);
    txt(this, x + 112, y + 72, `${t('rating')}: ${s.rating}`, 26, '#ffffff').setOrigin(0, 0.5);
    const z = this.add.zone(x + 190, y + 52, 380, 104).setInteractive({ useHandCursor: true });
    z.on('pointerup', () => this.go('Profile', { from: 'Menu' }));
  }

  private modeCard(x: number, y: number, w: number, h: number, m: ModeCard): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(UI.inkN, 0.9).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 12, 28);
    g.fillStyle(m.color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 26);
    g.fillStyle(0xffffff, 0.12).fillRoundedRect(-w / 2 + 8, -h / 2 + 6, w - 16, h * 0.3, 18);
    c.add(g);
    c.add(this.add.image(-w / 2 + 90, 0, `i_${m.icon}`).setDisplaySize(120, 120));
    const title = txt(this, -w / 2 + 170, -h * 0.17, m.title, 38, '#ffffff').setOrigin(0, 0.5);
    if (title.width > w - 190) title.setScale((w - 190) / title.width);
    c.add(title);
    // Description under the title, shrunk to the space left in the card.
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
