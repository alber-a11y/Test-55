import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { artRng } from '../art/canvas';
import { chapterName, t } from '../core/i18n';
import { save } from '../core/save';
import { Button, CoinPill, ribbon, RoundButton, txt } from '../ui/widgets';
import { BaseScene } from './BaseScene';

const SPACING = 150;
const CHAPTER = 25;

/** Ground / river colours per chapter (cycles). */
const CHAPTERS = [
  { ground: 0x4cae4c, ground2: 0x3f9a40, river: 0x3ab8ff, deco: ['d_palm', 'd_bush', 'd_monstera', 'd_flower'] },
  { ground: 0x7fbf5a, ground2: 0xd8c27a, river: 0x2d9cdb, deco: ['d_palm', 'd_rock', 'd_lily', 'd_bush'] },
  { ground: 0x3aa58a, ground2: 0x2f8f78, river: 0x7fe0ff, deco: ['d_rock', 'd_monstera', 'd_bush', 'd_flower'] },
  { ground: 0x1f4a3a, ground2: 0x183d30, river: 0x3a6bd9, deco: ['d_mush', 'd_monstera', 'd_bush', 'd_rock'] },
  { ground: 0xc2a86a, ground2: 0xb0965a, river: 0x3ab8ff, deco: ['d_rock', 'd_palm', 'd_flower', 'd_rock'] },
  { ground: 0x6a8a3a, ground2: 0x5a7a30, river: 0x5fb8a8, deco: ['d_monstera', 'd_lily', 'd_bush', 'd_mush'] },
  { ground: 0x5ab06a, ground2: 0x4aa05a, river: 0xff8ad8, deco: ['d_flower', 'd_bush', 'd_palm', 'd_mush'] },
  { ground: 0xd8b04a, ground2: 0xc89a30, river: 0xffe14a, deco: ['d_palm', 'd_rock', 'd_flower', 'd_monstera'] },
];

export class MapScene extends BaseScene {
  private tiles = new Map<number, Phaser.GameObjects.GameObject[]>();
  private cx = 0;
  private baseY = 0;
  private velocity = 0;
  private dragging = false;
  private lastY = 0;
  private minScroll = 0;
  private maxScroll = 0;

  constructor() {
    super('Map');
  }

  private nodePos(i: number): { x: number; y: number } {
    return { x: this.cx + Math.sin(i * 0.72) * 170 + Math.sin(i * 0.23) * 40, y: this.baseY - (i - 1) * SPACING };
  }

  private chapter(i: number) {
    return CHAPTERS[Math.floor((i - 1) / CHAPTER) % CHAPTERS.length];
  }

  create(): void {
    this.baseCreate();
    this.tiles.clear();
    const { W, H } = this;
    this.cx = W / 2;
    this.baseY = H - 330;
    audio.playMusic('menu');
    const cur = save.data.maxLevel;
    const topLevel = cur + 30;
    this.minScroll = this.nodePos(topLevel).y - H * 0.4;
    this.maxScroll = 0;
    const cam = this.cameras.main;
    cam.setScroll(0, Phaser.Math.Clamp(this.nodePos(cur).y - H * 0.55, this.minScroll, this.maxScroll));

    // Fixed UI.
    const ui = (o: Phaser.GameObjects.GameObject & { setScrollFactor(x: number): unknown; setDepth(d: number): unknown }) => {
      o.setScrollFactor(0);
      o.setDepth(1000);
      return o;
    };
    const top = this.add.graphics();
    top.fillGradientStyle(0x10051f, 0x10051f, 0x10051f, 0x10051f, 0.6, 0.6, 0, 0).fillRect(0, 0, W, 150);
    ui(top);
    ui(new RoundButton(this, Math.max(60, this.cx - 300), 60, 'ic_home', 80, 'blue').onClick(() => this.go('Menu')));
    ui(txt(this, this.cx, 58, t('map'), 44));
    ui(new CoinPill(this, Math.min(W - 110, this.cx + 250), 58, () => this.go('Shop', { from: 'Map', tab: 'coins' })));
    const play = new Button(this, this.cx, H - 90, { w: 400, h: 100, label: t('play'), sub: t('levelN', { n: cur }), size: 44, color: 'green' });
    ui(play);
    play.onClick(() => this.go('Game', { level: cur }));
    this.tweens.add({ targets: play, scale: 1.04, duration: 700, yoyo: true, repeat: -1 });

    // Drag scrolling with inertia.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.lastY = p.y;
      this.velocity = 0;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      const dy = p.y - this.lastY;
      this.lastY = p.y;
      this.scrollBy(-dy);
      this.velocity = -dy;
    });
    this.input.on('pointerup', () => (this.dragging = false));
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.scrollBy(dy * 0.8));
    this.refreshTiles();
  }

  private scrollBy(dy: number): void {
    const cam = this.cameras.main;
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY + dy, this.minScroll, this.maxScroll);
  }

  update(): void {
    if (!this.dragging && Math.abs(this.velocity) > 0.3) {
      this.velocity *= 0.93;
      this.scrollBy(this.velocity);
    }
    this.refreshTiles();
  }

  /** Create tiles for levels in view, destroy far ones. */
  private refreshTiles(): void {
    const cam = this.cameras.main;
    const first = Math.max(1, Math.floor((this.baseY - (cam.scrollY + this.H)) / SPACING) - 2);
    const last = Math.ceil((this.baseY - cam.scrollY) / SPACING) + 3;
    for (const [i, objs] of this.tiles) {
      if (i > 0 && (i < first - 4 || i > last + 4)) {
        objs.forEach((o) => o.destroy());
        this.tiles.delete(i);
      }
    }
    for (let i = first; i <= last; i++) if (!this.tiles.has(i)) this.tiles.set(i, this.buildTile(i));
    // Plain ground below level 1.
    for (let i = -3; i <= 0; i++) {
      if (this.tiles.has(i)) continue;
      const p = this.nodePos(i);
      const g = this.add.graphics().setDepth(0);
      g.fillStyle(CHAPTERS[0].ground, 1).fillRect(0, p.y - SPACING / 2 - 1, this.W, SPACING + 2);
      this.tiles.set(i, [g]);
    }
  }

  private buildTile(i: number): Phaser.GameObjects.GameObject[] {
    const objs: Phaser.GameObjects.GameObject[] = [];
    const ch = this.chapter(i);
    const p = this.nodePos(i);
    const n = this.nodePos(i + 1);
    const rnd = artRng(i * 977);
    const W = this.W;
    // Ground band.
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(i % 2 ? ch.ground : Phaser.Display.Color.ValueToColor(ch.ground).darken(4).color, 1).fillRect(0, p.y - SPACING / 2 - 1, W, SPACING + 2);
    for (let k = 0; k < 6; k++) {
      g.fillStyle(ch.ground2, 0.6).fillEllipse(rnd() * W, p.y - SPACING / 2 + rnd() * SPACING, 60 + rnd() * 120, 20 + rnd() * 30);
    }
    objs.push(g);
    // River segment to the next node.
    const r = this.add.graphics().setDepth(1);
    const mid = { x: (p.x + n.x) / 2 + Math.sin(i) * 30, y: (p.y + n.y) / 2 };
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(p.x, p.y), new Phaser.Math.Vector2(mid.x, mid.y), new Phaser.Math.Vector2(n.x, n.y));
    const pts = curve.getPoints(16);
    r.lineStyle(84, 0x2a1640, 0.25).strokePoints(pts);
    r.lineStyle(70, Phaser.Display.Color.ValueToColor(ch.river).darken(15).color, 1).strokePoints(pts);
    r.lineStyle(52, ch.river, 1).strokePoints(pts);
    r.lineStyle(6, 0xffffff, 0.5);
    for (let k = 2; k < pts.length - 2; k += 4) r.lineBetween(pts[k].x - 10, pts[k].y, pts[k].x + 6, pts[k].y - 2);
    objs.push(r);
    // Decorations on both sides of the river.
    for (let k = 0; k < 3; k++) {
      const side = rnd() < 0.5 ? -1 : 1;
      const dx = 140 + rnd() * 160;
      const x = Phaser.Math.Clamp(p.x + side * dx, 40, W - 40);
      const y = p.y - rnd() * SPACING;
      const key = ch.deco[Math.floor(rnd() * ch.deco.length)];
      const d = this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(2 + y / 100000).setScale(0.6 + rnd() * 0.4);
      if (key === 'd_lily') d.setPosition(mid.x + (rnd() - 0.5) * 20, mid.y);
      objs.push(d);
    }
    // Animals every few levels.
    if (i % 7 === 3) {
      const key = ['capy', 'sloth', 'toucan'][Math.floor(i / 7) % 3];
      const side = p.x > this.cx ? -1 : 1;
      const a = this.add.image(Phaser.Math.Clamp(p.x + side * 220, 90, W - 90), p.y - 40, key).setScale(0.42).setDepth(3);
      this.tweens.add({ targets: a, y: a.y - 8, duration: 900 + rnd() * 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      objs.push(a);
    }
    // Chapter banner.
    if ((i - 1) % CHAPTER === 0) {
      const c = Math.floor((i - 1) / CHAPTER);
      const b = ribbon(this, this.cx, p.y + 88, 460, `${t('chapter', { n: c + 1 })} · ${chapterName(c)}`, 'orange').setDepth(6);
      objs.push(b);
    }
    objs.push(this.buildNode(i, p.x, p.y));
    return objs;
  }

  private buildNode(i: number, x: number, y: number): Phaser.GameObjects.Container {
    const cur = save.data.maxLevel;
    const done = i < cur;
    const isCur = i === cur;
    const boss = i % 10 === 0;
    const c = this.add.container(x, y).setDepth(5);
    const r = isCur ? 50 : boss ? 46 : 38;
    const g = this.add.graphics();
    const col = isCur ? [0x9bff7a, 0x2fa83a] : done ? [0x8fd0ff, 0x2d6bff] : [0xc2c8d6, 0x6b7385];
    g.fillStyle(0x000000, 0.25).fillEllipse(0, r * 0.75, r * 2.1, r * 0.7);
    g.fillStyle(0x2a1640, 1).fillCircle(0, 4, r + 5);
    if (boss) g.fillStyle(0xffc21a, 1).fillCircle(0, 0, r + 4);
    g.fillStyle(col[1], 1).fillCircle(0, 3, r);
    g.fillGradientStyle(col[0], col[0], col[1], col[1], 1).fillCircle(0, 0, r - 4);
    g.fillStyle(0xffffff, 0.35).fillEllipse(-r * 0.15, -r * 0.45, r * 1.1, r * 0.45);
    c.add(g);
    c.add(txt(this, 0, -2, String(i), isCur ? 34 : 28));
    if (!done && !isCur) c.add(this.add.image(r * 0.6, -r * 0.6, 'ic_lock').setDisplaySize(30, 30));
    if (done) {
      const st = save.data.stars[String(i)] ?? 0;
      for (let k = 0; k < 3; k++) c.add(this.add.image((k - 1) * 24, -r - 10 + (k === 1 ? -6 : 0), k < st ? 'ic_star' : 'ic_starEmpty').setDisplaySize(28, 28));
    }
    if (isCur) {
      const head = this.add.image(0, -r - 50, 'capy_head').setScale(0.8);
      c.add(head);
      this.tweens.add({ targets: head, y: head.y - 12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: g, scale: 1.08, duration: 600, yoyo: true, repeat: -1 });
    }
    if (done || isCur) {
      c.setSize(r * 2 + 10, r * 2 + 10).setInteractive({ useHandCursor: true });
      c.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (p.getDistance() > 14) return;
        audio.play('click');
        this.go('Game', { level: i });
      });
    }
    return c;
  }
}
