import Phaser from 'phaser';
import { audio } from '@shared/audio/audio';
import { makeCanvas } from '@shared/cards/draw';
import { getLang, t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Button, IconButton, Pill, progressBar, txt, UI } from '@shared/ui/widgets';
import { drawCityScene } from '../art/landmarks';
import { CITIES, cityIndexOfLevel, cityOfLevel, lapOfLevel, POSTCARD_AT } from '../data/cities';
import { postcardFor, STAR_CHEST_STEP, totalStars } from '../progress';
import { save } from '../save';
import { rewardPopup } from '../ui/common';

const STEP = 210;
const CITY_LEN = 20;

/** Endless vertical level map. World y of level L is -L*STEP; the camera scrolls. */
export class MapScene extends BaseScene {
  private nodes = new Map<number, Phaser.GameObjects.Container>();
  private sections = new Map<number, Phaser.GameObjects.GameObject[]>();
  private dragging = false;
  private dragStartY = 0;
  private camStartY = 0;
  private vel = 0;
  private lastY = 0;
  private moved = false;

  constructor() {
    super('Map');
  }

  create(): void {
    this.nodes = new Map();
    this.sections = new Map();
    audio.playMusic('map', cityOfLevel(save.data.adv.max).tr);
    const cam = this.cameras.main;
    const cur = save.data.adv.max;
    cam.scrollY = this.levelY(cur) - this.H * 0.55;
    this.clampCam();
    this.updateVisible();

    // Drag / wheel scrolling
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y < 160 || p.y > this.H - 230) return;
      this.dragging = true;
      this.moved = false;
      this.dragStartY = p.y;
      this.lastY = p.y;
      this.camStartY = cam.scrollY;
      this.vel = 0;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      if (Math.abs(p.y - this.dragStartY) > 12) this.moved = true;
      this.vel = this.lastY - p.y;
      this.lastY = p.y;
      cam.scrollY = this.camStartY - (p.y - this.dragStartY);
      this.clampCam();
      this.updateVisible();
    });
    this.input.on('pointerup', () => {
      this.dragging = false;
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      cam.scrollY += dy;
      this.clampCam();
      this.updateVisible();
    });

    this.buildHud();
    this.setupScene();
  }

  private levelY(l: number): number {
    return -l * STEP;
  }

  private levelX(l: number): number {
    const amp = Math.min(this.W * 0.27, 330);
    return this.W / 2 + Math.sin(l * 0.75) * amp;
  }

  private clampCam(): void {
    const cam = this.cameras.main;
    const top = this.levelY(save.data.adv.max + 14) - this.H * 0.3;
    const bottom = this.levelY(1) - this.H + 420;
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, top, bottom);
  }

  update(): void {
    if (!this.dragging && Math.abs(this.vel) > 0.5) {
      this.cameras.main.scrollY += this.vel;
      this.vel *= 0.92;
      this.clampCam();
      this.updateVisible();
    }
  }

  private updateVisible(): void {
    const cam = this.cameras.main;
    const topL = Math.floor(-(cam.scrollY) / STEP) + 2;
    const botL = Math.max(1, Math.ceil(-(cam.scrollY + this.H) / STEP) - 2);
    for (let l = botL; l <= topL; l++) if (!this.nodes.has(l)) this.nodes.set(l, this.makeNode(l));
    for (const [l, n] of this.nodes) {
      if (l < botL - 3 || l > topL + 3) {
        n.destroy();
        this.nodes.delete(l);
      }
    }
    // City sections
    const c0 = Math.max(0, cityIndexOfLevel(botL) - 1);
    const c1 = cityIndexOfLevel(topL) + 1;
    for (let c = c0; c <= c1; c++) if (!this.sections.has(c)) this.sections.set(c, this.makeSection(c));
    for (const [c, objs] of this.sections) {
      if (c < c0 - 1 || c > c1 + 1) {
        objs.forEach((o) => o.destroy());
        this.sections.delete(c);
      }
    }
  }

  /** Background band of one city (20 levels) with panorama and name. */
  private makeSection(ci: number): Phaser.GameObjects.GameObject[] {
    const city = CITIES[ci % CITIES.length];
    const W = this.W;
    const yBottom = this.levelY(ci * CITY_LEN + 1) + STEP / 2;
    const yTop = this.levelY((ci + 1) * CITY_LEN + 1) + STEP / 2;
    const h = yBottom - yTop;
    const objs: Phaser.GameObjects.GameObject[] = [];
    const key = `mapsec_${city.id}_${W}`;
    if (!this.textures.exists(key)) {
      const [cv, c] = makeCanvas(W, 64);
      const g = c.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, city.sky[0]);
      g.addColorStop(1, city.ground);
      c.fillStyle = g;
      c.fillRect(0, 0, W, 64);
      this.textures.addCanvas(key, cv);
    }
    objs.push(this.add.image(0, yTop, key).setOrigin(0).setDisplaySize(W, h).setDepth(-20));
    const pkey = `mappan_${city.id}_${W}`;
    if (!this.textures.exists(pkey)) {
      const [cv, c] = makeCanvas(W, 520);
      drawCityScene(c, city, W, 520, { stars: true });
      this.textures.addCanvas(pkey, cv);
    }
    objs.push(this.add.image(0, yTop, pkey).setOrigin(0).setDepth(-19).setAlpha(0.9));
    // Decorative suit sprinkles
    for (let k = 0; k < 8; k++) {
      const s = this.add.text(((k * 263) % (W - 80)) + 40, yTop + 600 + ((k * 397) % Math.max(1, h - 700)), ['♠', '♥', '♦', '♣'][k % 4], { fontFamily: 'Georgia', fontSize: '70px', color: '#ffffff' }).setAlpha(0.07).setDepth(-18);
      objs.push(s);
    }
    const lap = Math.floor(ci / CITIES.length);
    const name = (getLang() === 'en' ? city.en : city.ru) + (lap > 0 ? ` ${'★'.repeat(Math.min(lap, 5))}` : '');
    const banner = this.add.container(W / 2, yTop + 470).setDepth(-5);
    const g = this.add.graphics();
    g.fillStyle(UI.inkN, 0.75).fillRoundedRect(-260, -50, 520, 100, 50);
    banner.add([g, txt(this, 0, 0, name, 52, city.accent)]);
    objs.push(banner);
    return objs;
  }

  private makeNode(l: number): Phaser.GameObjects.Container {
    const x = this.levelX(l);
    const y = this.levelY(l);
    const c = this.add.container(x, y);
    const max = save.data.adv.max;
    const done = l < max;
    const current = l === max;
    const boss = l % 10 === 0;
    // Path dots to the next level
    const nx = this.levelX(l + 1);
    const ny = this.levelY(l + 1);
    const g = this.add.graphics();
    for (let k = 1; k < 6; k++) {
      const px = (nx - x) * (k / 6);
      const py = (ny - y) * (k / 6);
      g.fillStyle(l < max ? 0xffd166 : 0xffffff, l < max ? 0.9 : 0.35).fillCircle(px, py, 9);
    }
    c.add(g);
    const r = boss ? 78 : 62;
    const col = done ? 0xffc531 : current ? 0x5ad17e : 0x5f6a82;
    const dark = done ? 0xd18a0b : current ? 0x2c9a52 : 0x3a4568;
    const node = this.add.graphics();
    node.fillStyle(UI.inkN, 1).fillCircle(0, 6, r + 8);
    node.fillStyle(dark, 1).fillCircle(0, 6, r);
    node.fillStyle(col, 1).fillCircle(0, 0, r);
    node.fillStyle(0xffffff, 0.25).fillEllipse(-r * 0.3, -r * 0.45, r * 0.8, r * 0.4);
    c.add(node);
    if (l > max) c.add(this.add.image(0, 0, 'i_lock').setDisplaySize(r * 0.9, r * 0.9));
    else c.add(txt(this, 0, 0, String(l), boss ? 50 : 44, '#ffffff'));
    if (boss) c.add(this.add.image(0, -r - 18, 'i_crown').setDisplaySize(84, 84));
    const pos = ((l - 1) % CITY_LEN) + 1;
    if (POSTCARD_AT.includes(pos)) {
      const pc = postcardFor(l);
      const has = pc ? save.data.adv.postcards.includes(pc) : false;
      c.add(this.add.image(r * 0.95, -r * 0.7, 'i_album').setDisplaySize(64, 64).setAlpha(has ? 1 : 0.85));
    }
    if (done) {
      const st = save.data.adv.stars[l] ?? 0;
      for (let k = 0; k < 3; k++) c.add(this.add.image((k - 1) * 46, r + 22 - (k === 1 ? 10 : 0), k < st ? 'i_star' : 'i_starEmpty').setDisplaySize(54, 54));
    }
    if (current) {
      const av = this.add.image(0, -r - 70, this.textures.exists(`avatar_${save.data.avatar}`) ? `avatar_${save.data.avatar}` : 'i_user').setDisplaySize(110, 110);
      c.add(av);
      this.tweens.add({ targets: av, y: av.y - 18, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.tweens.add({ targets: node, scale: 1.08, duration: 700, yoyo: true, repeat: -1 });
    }
    c.setSize(r * 2 + 20, r * 2 + 20);
    if (l <= max) {
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', () => {
        if (this.moved) return;
        audio.play('click');
        this.go('LevelIntro', { level: l });
      });
    }
    c.setDepth(10);
    return c;
  }

  private buildHud(): void {
    const W = this.W;
    const H = this.H;
    const top = this.add.graphics().setScrollFactor(0).setDepth(100);
    top.fillStyle(UI.inkN, 0.7).fillRect(0, 0, W, 160);
    new IconButton(this, 80, 80, 'i_home', 104, 'dark').onClick(() => this.go('Menu', {}, 'map_menu')).setScrollFactor(0).setDepth(101);
    const stars = totalStars();
    new Pill(this, W / 2 - (this.portrait ? 40 : 0), 80, 'i_star', stars, 220).setScrollFactor(0).setDepth(101);
    new Pill(this, W - 170, 80, 'i_coin', save.data.coins, 250).setScrollFactor(0).setDepth(101);

    // Bottom: star chest progress + play button
    const by = H - 120;
    const bot = this.add.graphics().setScrollFactor(0).setDepth(100);
    bot.fillStyle(UI.inkN, 0.7).fillRect(0, H - 240, W, 240);
    const claimed = save.data.adv.starChests;
    const next = (claimed + 1) * STAR_CHEST_STEP;
    const ready = stars >= next;
    const chest = new IconButton(this, 110, by - 10, ready ? 'i_chestOpen' : 'i_chest', 150, ready ? 'gold' : 'dark').setScrollFactor(0).setDepth(101);
    if (ready) {
      chest.setBadge('!');
      this.tweens.add({ targets: chest, angle: { from: -6, to: 6 }, duration: 220, yoyo: true, repeat: -1 });
    }
    chest.onClick(() => {
      if (!ready) return this.toastChest();
      save.data.adv.starChests++;
      save.save();
      rewardPopup(this, t('starChest'), { coins: 200, boosters: { startJoker: 1, plus5: 1, hint: 1 } }, () => this.scene.restart(), { x2: 'star_chest_x2' });
    });
    const pbx = this.portrait ? 300 : 360;
    const prev = claimed * STAR_CHEST_STEP;
    const pb = progressBar(this, 200 + pbx / 2, by + 50, pbx, 30, (stars - prev) / STAR_CHEST_STEP, 0xffc531).setScrollFactor(0).setDepth(101);
    void pb;
    txt(this, 200 + pbx / 2, by + 50, `${Math.min(stars, next)}/${next}`, 26, '#ffffff').setScrollFactor(0).setDepth(102);
    const cur = save.data.adv.max;
    const play = new Button(this, W - (this.portrait ? 270 : 330), by - 10, { w: this.portrait ? 440 : 520, h: 140, color: 'green', label: t('play'), sub: t('levelN', { n: cur }), size: 52 })
      .setScrollFactor(0)
      .setDepth(101);
    play.onClick(() => this.go('LevelIntro', { level: cur }));
    const lap = lapOfLevel(cur);
    void lap;
  }

  private toastChest(): void {
    const W = this.W;
    const tt = txt(this, W / 2, this.H - 300, t('starChest_d', { n: STAR_CHEST_STEP }), 34, '#ffffff').setScrollFactor(0).setDepth(200);
    this.tweens.add({ targets: tt, alpha: 0, delay: 1600, duration: 400, onComplete: () => tt.destroy() });
  }
}
