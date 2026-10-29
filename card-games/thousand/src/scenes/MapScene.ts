import Phaser from 'phaser';
import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Button, IconButton, Pill, txt, UI } from '@shared/ui/widgets';
import { faceTex } from '../art/avatars';
import { renderLandscape } from '../art/carriage';
import { hasChest, levelCfg, STATIONS, WORLDS } from '../data/route';
import { save } from '../save';
import { rewardPopup } from '../ui/common';

const STEP = 230;

/** The endless railway line: ten stations per carriage, the tenth is the boss. */
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
    audio.playMusic('menu');
    const cam = this.cameras.main;
    cam.scrollY = this.y(save.data.route.next) - this.H * 0.55;
    this.clamp();
    this.updateVisible();
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
      this.clamp();
      this.updateVisible();
    });
    this.input.on('pointerup', () => (this.dragging = false));
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      cam.scrollY += dy;
      this.clamp();
      this.updateVisible();
    });
    this.buildHud();
    this.setupScene();
  }

  private y(i: number): number {
    return -i * STEP;
  }
  private x(i: number): number {
    return this.W / 2 + Math.sin(i * 0.7) * Math.min(this.W * 0.27, 330);
  }

  private clamp(): void {
    const cam = this.cameras.main;
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, this.y(save.data.route.next + 10) - this.H * 0.3, this.y(0) - this.H + 420);
  }

  update(): void {
    if (!this.dragging && Math.abs(this.vel) > 0.5) {
      this.cameras.main.scrollY += this.vel;
      this.vel *= 0.92;
      this.clamp();
      this.updateVisible();
    }
  }

  private updateVisible(): void {
    const cam = this.cameras.main;
    const top = Math.floor(-cam.scrollY / STEP) + 2;
    const bot = Math.max(0, Math.ceil(-(cam.scrollY + this.H) / STEP) - 2);
    for (let i = bot; i <= top; i++) if (!this.nodes.has(i)) this.nodes.set(i, this.makeNode(i));
    for (const [i, n] of this.nodes)
      if (i < bot - 3 || i > top + 3) {
        n.destroy();
        this.nodes.delete(i);
      }
    const l0 = Math.max(0, Math.floor(bot / STATIONS) - 1);
    const l1 = Math.floor(top / STATIONS) + 1;
    for (let l = l0; l <= l1; l++) if (!this.sections.has(l)) this.sections.set(l, this.makeSection(l));
    for (const [l, objs] of this.sections)
      if (l < l0 - 1 || l > l1 + 1) {
        objs.forEach((o) => o.destroy());
        this.sections.delete(l);
      }
  }

  private makeSection(li: number): Phaser.GameObjects.GameObject[] {
    const wd = WORLDS[li % WORLDS.length];
    const W = this.W;
    const yb = this.y(li * STATIONS) + STEP / 2;
    const yt = this.y((li + 1) * STATIONS) + STEP / 2;
    const key = `mapsec_${wd.id}_${W}`;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, renderLandscape(wd, W, 900));
    const objs: Phaser.GameObjects.GameObject[] = [];
    const g = this.add.graphics().setDepth(-20);
    const c1 = Phaser.Display.Color.HexStringToColor(wd.sky[1]).color;
    const c2 = Phaser.Display.Color.HexStringToColor(wd.wall).color;
    g.fillGradientStyle(c2, c2, c1, c1, 1);
    g.fillRect(0, yt, W, yb - yt);
    objs.push(g);
    objs.push(this.add.image(0, yb, key).setOrigin(0, 1).setDepth(-19).setDisplaySize(W, Math.min(900, yb - yt)).setAlpha(0.9));
    const dim = this.add.rectangle(0, yt, W, yb - yt, 0x0b1026, 0.18).setOrigin(0).setDepth(-18);
    objs.push(dim);
    const lap = Math.floor(li / WORLDS.length);
    const banner = this.add.container(W / 2, yb - 120).setDepth(-5);
    const bg = this.add.graphics();
    bg.fillStyle(UI.inkN, 0.8).fillRoundedRect(-300, -50, 600, 100, 20);
    bg.lineStyle(4, 0xc9a55c, 1).strokeRoundedRect(-292, -42, 584, 84, 16);
    banner.add([bg, txt(this, 0, 0, (getLang() === 'en' ? wd.en : wd.ru) + (lap ? ` ${'★'.repeat(Math.min(lap, 5))}` : ''), 46, wd.accent)]);
    objs.push(banner);
    return objs;
  }

  private makeNode(i: number): Phaser.GameObjects.Container {
    const x = this.x(i);
    const y = this.y(i);
    const c = this.add.container(x, y).setDepth(10);
    const next = save.data.route.next;
    const done = i < next;
    const cur = i === next;
    const cfg = levelCfg(i, getLang());
    // Rails to the next station: two lines with sleepers.
    const nx = this.x(i + 1) - x;
    const ny = this.y(i + 1) - y;
    const len = Math.hypot(nx, ny);
    const ux = nx / len;
    const uy = ny / len;
    const px = -uy * 14;
    const py = ux * 14;
    const g = this.add.graphics();
    g.lineStyle(10, 0x5a3a22, 0.95);
    for (let k = 0; k <= 10; k++) {
      const sx = ux * (len * k) / 10;
      const sy = uy * (len * k) / 10;
      g.lineBetween(sx - px * 1.6, sy - py * 1.6, sx + px * 1.6, sy + py * 1.6);
    }
    g.lineStyle(6, done ? 0xd9a23a : 0x9aa3b8, 1);
    g.lineBetween(-px, -py, nx - px, ny - py);
    g.lineBetween(px, py, nx + px, ny + py);
    c.add(g);
    const r = cfg.boss ? 84 : 64;
    const node = this.add.graphics();
    node.fillStyle(UI.inkN, 1).fillCircle(0, 6, r + 8);
    node.fillStyle(done ? 0x8a6a2a : cur ? 0x1f6b45 : 0x2b3350, 1).fillCircle(0, 6, r);
    node.fillStyle(done ? 0xd9a23a : cur ? 0x3fbf7f : 0x4a5578, 1).fillCircle(0, 0, r);
    node.lineStyle(4, 0xfff3c4, 0.5).strokeCircle(0, 0, r - 8);
    c.add(node);
    if (cfg.boss) {
      const o = cfg.opponents[0];
      c.add(this.add.image(0, 0, faceTex(this.textures, `boss_${cfg.world}`, o.face, done ? 'sad' : 'smug')).setDisplaySize(r * 1.8, r * 1.8));
      c.add(this.add.image(0, -r - 16, 'i_crown').setDisplaySize(80, 80));
    } else if (i > next) c.add(this.add.image(0, 0, 'i_lock').setDisplaySize(r * 0.9, r * 0.9));
    else c.add(txt(this, 0, 0, String((i % STATIONS) + 1), 46, '#ffffff'));
    // Goal icon of the station
    const gi = { score: 'coins', contract: 'ticket', marriage: 'ring', lead: 'podium', race: 'flag', defend: 'shield', tricks: 'cards', barrel: 'barrel', clean: 'bolt' }[cfg.goal.k];
    c.add(this.add.image(r + 34, -r * 0.45, `i_${gi}`).setDisplaySize(56, 56));
    if (cfg.mods.length) c.add(this.add.image(r + 34, r * 0.25, 'i_lightning').setDisplaySize(44, 44));
    if (done) {
      const st = save.data.route.stars[i] ?? 3;
      for (let k = 0; k < 3; k++) c.add(this.add.image((k - 1) * 46, r + 22 - (k === 1 ? 10 : 0), k < st ? 'i_star' : 'i_starEmpty').setDisplaySize(52, 52));
    }
    if (cur) this.tweens.add({ targets: node, scale: 1.08, duration: 700, yoyo: true, repeat: -1 });
    c.setSize(r * 2 + 20, r * 2 + 20);
    if (i <= next) {
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', () => {
        if (this.moved) return;
        audio.play('click');
        this.go('LevelIntro', { idx: i });
      });
    }
    // Chest between this station and the next one
    if (hasChest(i)) this.chest(c, i, nx / 2, ny / 2);
    return c;
  }

  private chest(c: Phaser.GameObjects.Container, i: number, x: number, y: number): void {
    const passed = save.data.route.next > i;
    const claimed = save.data.route.chests.includes(i);
    const ch = this.add.image(x - 120, y, claimed ? 'i_chestOpen' : 'i_chest').setDisplaySize(100, 100);
    if (!passed) ch.setAlpha(0.5);
    c.add(ch);
    if (passed && !claimed) {
      this.tweens.add({ targets: ch, angle: { from: -8, to: 8 }, duration: 260, yoyo: true, repeat: -1 });
      ch.setInteractive({ useHandCursor: true });
      ch.on('pointerup', () => {
        if (this.moved) return;
        save.data.route.chests.push(i);
        save.save();
        const tier = Math.floor(i / STATIONS);
        rewardPopup(this, t('chest'), { coins: 120 + tier * 30, boosters: { [['hint', 'lucky', 'undo', 'xray'][Math.floor(i / 5) % 4]]: 1 } }, () => this.scene.restart(), { x2: 'map_chest_x2' });
      });
    }
  }

  private buildHud(): void {
    const W = this.W;
    const H = this.H;
    const top = this.add.graphics().setScrollFactor(0).setDepth(100);
    top.fillStyle(UI.inkN, 0.7).fillRect(0, 0, W, 160);
    new IconButton(this, 80, 80, 'i_home', 104, 'dark').onClick(() => this.go('Menu', {}, 'map_menu')).setScrollFactor(0).setDepth(101);
    new Pill(this, W / 2 - (this.portrait ? 40 : 0), 80, 'i_medal', save.data.rating, 240).setScrollFactor(0).setDepth(101);
    new Pill(this, W - 170, 80, 'i_coin', save.data.coins, 250).setScrollFactor(0).setDepth(101);
    const bot = this.add.graphics().setScrollFactor(0).setDepth(100);
    bot.fillStyle(UI.inkN, 0.7).fillRect(0, H - 240, W, 240);
    new IconButton(this, 110, H - 130, 'i_crown', 150, 'dark').setScrollFactor(0).setDepth(101).onClick(() => this.go('Rivals', { from: 'Map' }));
    txt(this, 110, H - 40, `${save.data.route.trophies.length}/${WORLDS.length}`, 28, '#ffffff').setScrollFactor(0).setDepth(101);
    const next = save.data.route.next;
    new Button(this, W - (this.portrait ? 270 : 330), H - 130, { w: this.portrait ? 440 : 520, h: 140, color: 'green', label: t('play'), sub: t('stationN', { n: (next % STATIONS) + 1 }), size: 52 })
      .setScrollFactor(0)
      .setDepth(101)
      .onClick(() => this.go('LevelIntro', { idx: next }));
  }
}
