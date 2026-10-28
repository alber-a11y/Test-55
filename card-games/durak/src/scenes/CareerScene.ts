import Phaser from 'phaser';
import { audio } from '@shared/audio/audio';
import { makeCanvas } from '@shared/cards/draw';
import { getLang, t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Button, IconButton, Pill, txt, UI } from '@shared/ui/widgets';
import { faceTex } from '../art/avatars';
import { renderLocation } from '../art/locations';
import { LOCATIONS, TABLES_PER_LOC, tableCfg } from '../data/locations';
import { save } from '../save';

const STEP = 220;

/** Endless career path: 9 tables per location, the 9th is the boss. */
export class CareerScene extends BaseScene {
  private nodes = new Map<number, Phaser.GameObjects.Container>();
  private sections = new Map<number, Phaser.GameObjects.GameObject[]>();
  private dragging = false;
  private dragStartY = 0;
  private camStartY = 0;
  private vel = 0;
  private lastY = 0;
  private moved = false;

  constructor() {
    super('Career');
  }

  create(): void {
    this.nodes = new Map();
    this.sections = new Map();
    audio.playMusic('menu');
    const cam = this.cameras.main;
    cam.scrollY = this.y(save.data.career.next) - this.H * 0.55;
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
    return this.W / 2 + Math.sin(i * 0.8) * Math.min(this.W * 0.27, 320);
  }

  private clamp(): void {
    const cam = this.cameras.main;
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, this.y(save.data.career.next + 10) - this.H * 0.3, this.y(0) - this.H + 420);
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
    const l0 = Math.max(0, Math.floor(bot / TABLES_PER_LOC) - 1);
    const l1 = Math.floor(top / TABLES_PER_LOC) + 1;
    for (let l = l0; l <= l1; l++) if (!this.sections.has(l)) this.sections.set(l, this.makeSection(l));
    for (const [l, objs] of this.sections)
      if (l < l0 - 1 || l > l1 + 1) {
        objs.forEach((o) => o.destroy());
        this.sections.delete(l);
      }
  }

  private makeSection(li: number): Phaser.GameObjects.GameObject[] {
    const L = LOCATIONS[li % LOCATIONS.length];
    const W = this.W;
    const yb = this.y(li * TABLES_PER_LOC) + STEP / 2;
    const yt = this.y((li + 1) * TABLES_PER_LOC) + STEP / 2;
    const key = `carsec_${L.id}_${W}`;
    if (!this.textures.exists(key)) {
      const [cv, c] = makeCanvas(W, 600);
      c.drawImage(renderLocation(L, W, 1200, { table: false }), 0, 0, W, 1200, 0, 0, W, 600);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(0, 0, W, 600);
      this.textures.addCanvas(key, cv);
    }
    const objs: Phaser.GameObjects.GameObject[] = [];
    const g = this.add.graphics().setDepth(-20);
    g.fillGradientStyle(Phaser.Display.Color.HexStringToColor(L.c1).color, Phaser.Display.Color.HexStringToColor(L.c1).color, Phaser.Display.Color.HexStringToColor(L.c2).color, Phaser.Display.Color.HexStringToColor(L.c2).color, 1);
    g.fillRect(0, yt, W, yb - yt);
    objs.push(g);
    objs.push(this.add.image(0, yb, key).setOrigin(0, 1).setDepth(-19).setDisplaySize(W, Math.min(600, yb - yt)));
    const lap = Math.floor(li / LOCATIONS.length);
    const banner = this.add.container(W / 2, yb - 520).setDepth(-5);
    const bg = this.add.graphics();
    bg.fillStyle(UI.inkN, 0.75).fillRoundedRect(-280, -50, 560, 100, 50);
    banner.add([bg, txt(this, 0, 0, (getLang() === 'en' ? L.en : L.ru) + (lap ? ` ${'★'.repeat(Math.min(lap, 5))}` : ''), 52, L.accent)]);
    objs.push(banner);
    return objs;
  }

  private makeNode(i: number): Phaser.GameObjects.Container {
    const x = this.x(i);
    const y = this.y(i);
    const c = this.add.container(x, y).setDepth(10);
    const next = save.data.career.next;
    const done = i < next;
    const cur = i === next;
    const cfg = tableCfg(i, getLang());
    const nx = this.x(i + 1);
    const ny = this.y(i + 1);
    const g = this.add.graphics();
    for (let k = 1; k < 6; k++) g.fillStyle(done ? 0xffd166 : 0xffffff, done ? 0.9 : 0.35).fillCircle(((nx - x) * k) / 6, ((ny - y) * k) / 6, 9);
    c.add(g);
    const r = cfg.boss ? 84 : 64;
    const node = this.add.graphics();
    node.fillStyle(UI.inkN, 1).fillCircle(0, 6, r + 8);
    node.fillStyle(done ? 0xd18a0b : cur ? 0x2c9a52 : 0x3a4568, 1).fillCircle(0, 6, r);
    node.fillStyle(done ? 0xffc531 : cur ? 0x5ad17e : 0x5f6a82, 1).fillCircle(0, 0, r);
    c.add(node);
    if (cfg.boss) {
      const o = cfg.opponents[0];
      c.add(this.add.image(0, 0, faceTex(this.textures, `boss_${cfg.loc}`, o.face, i < next ? 'sad' : 'smug')).setDisplaySize(r * 1.8, r * 1.8));
      c.add(this.add.image(0, -r - 16, 'i_crown').setDisplaySize(80, 80));
    } else if (i > next) c.add(this.add.image(0, 0, 'i_lock').setDisplaySize(r * 0.9, r * 0.9));
    else c.add(txt(this, 0, 0, String((i % TABLES_PER_LOC) + 1), 46, '#ffffff'));
    // Rules chips: player count, transfer, cheating, teams
    const chips: string[] = [];
    if (cfg.rules.players > 2) chips.push('user');
    if (cfg.rules.transfer) chips.push('shuffle');
    if (cfg.rules.cheat) chips.push('hand');
    if (cfg.rules.teams) chips.push('heart');
    chips.forEach((ic, k) => {
      c.add(this.add.image(r + 30 + k * 50, -r * 0.55, `i_${ic}`).setDisplaySize(44, 44));
      if (ic === 'user') c.add(txt(this, r + 30, -r * 0.55 + 24, String(cfg.rules.players), 22, '#ffffff'));
    });
    if (done) {
      const st = save.data.career.stars[i] ?? 3;
      for (let k = 0; k < 3; k++) c.add(this.add.image((k - 1) * 46, r + 22 - (k === 1 ? 10 : 0), k < st ? 'i_star' : 'i_starEmpty').setDisplaySize(52, 52));
    }
    if (cur) this.tweens.add({ targets: node, scale: 1.08, duration: 700, yoyo: true, repeat: -1 });
    c.setSize(r * 2 + 20, r * 2 + 20);
    if (i <= next) {
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', () => {
        if (this.moved) return;
        audio.play('click');
        this.go('TableIntro', { idx: i });
      });
    }
    return c;
  }

  private buildHud(): void {
    const W = this.W;
    const H = this.H;
    const top = this.add.graphics().setScrollFactor(0).setDepth(100);
    top.fillStyle(UI.inkN, 0.7).fillRect(0, 0, W, 160);
    new IconButton(this, 80, 80, 'i_home', 104, 'dark').onClick(() => this.go('Menu', {}, 'career_menu')).setScrollFactor(0).setDepth(101);
    new Pill(this, W / 2 - (this.portrait ? 40 : 0), 80, 'i_medal', save.data.rating, 240).setScrollFactor(0).setDepth(101);
    new Pill(this, W - 170, 80, 'i_coin', save.data.coins, 250).setScrollFactor(0).setDepth(101);
    const bot = this.add.graphics().setScrollFactor(0).setDepth(100);
    bot.fillStyle(UI.inkN, 0.7).fillRect(0, H - 240, W, 240);
    new IconButton(this, 110, H - 130, 'i_crown', 150, 'dark').setScrollFactor(0).setDepth(101).onClick(() => this.go('Trophies', { from: 'Career' }));
    txt(this, 110, H - 40, `${save.data.career.trophies.length}/${LOCATIONS.length}`, 28, '#ffffff').setScrollFactor(0).setDepth(101);
    const next = save.data.career.next;
    new Button(this, W - (this.portrait ? 270 : 330), H - 130, { w: this.portrait ? 440 : 520, h: 140, color: 'green', label: t('play'), sub: t('tableN', { n: (next % TABLES_PER_LOC) + 1 }), size: 52 })
      .setScrollFactor(0)
      .setDepth(101)
      .onClick(() => this.go('TableIntro', { idx: next }));
  }
}
