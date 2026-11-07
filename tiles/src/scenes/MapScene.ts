import Phaser from 'phaser';
import { music } from '../audio/music';
import { BG_IDS } from '../art/backgrounds';
import { buttonTexture, canvasTexture, pillTexture, roundRect } from '../art/textures';
import { t, tItem } from '../core/i18n';
import { store } from '../core/save';
import { isHard } from '../game/difficulty';
import { BTN } from '../data/themes';
import { Button } from '../ui/Button';
import { label } from '../ui/text';
import { CoinCounter } from '../ui/widgets';
import { BaseScene } from './BaseScene';

const SP = 220;
const AHEAD = 40;

/** Endless winding level path. Only nodes near the viewport exist (virtualised), the camera scrolls. */
export class MapScene extends BaseScene {
  private nodes = new Map<number, Phaser.GameObjects.Container>();
  private banners = new Map<number, Phaser.GameObjects.Container>();
  private dragging = false;
  private moved = false;
  private startY = 0;
  private startScroll = 0;
  private velocity = 0;
  private lastY = 0;
  private minScroll = 0;
  private maxScroll = 0;

  constructor() {
    super('Map');
  }

  private worldY(i: number): number {
    return this.H - 420 - (i - 1) * SP;
  }
  private worldX(i: number): number {
    return this.cx + Math.sin(i * 0.8) * 250;
  }

  create(): void {
    this.setup();
    this.nodes = new Map();
    this.banners = new Map();
    music.play('menu');
    this.addBackground();
    const th = this.theme;
    const cur = store.data.level;
    const cam = this.cameras.main;
    this.minScroll = this.worldY(cur + AHEAD) - 300;
    this.maxScroll = 0;
    cam.setScroll(0, Phaser.Math.Clamp(this.worldY(cur) - this.H * 0.55, this.minScroll, this.maxScroll));

    // fixed UI
    const topBar = this.add.image(this.cx, 0, canvasTexture(this.textures, `map_top_${this.W}`, this.W, 200, (g) => {
      const lg = g.createLinearGradient(0, 0, 0, 200);
      lg.addColorStop(0, 'rgba(10,20,50,.45)');
      lg.addColorStop(1, 'rgba(10,20,50,0)');
      g.fillStyle = lg;
      g.fillRect(0, 0, this.W, 200);
    })).setOrigin(0.5, 0).setScrollFactor(0).setDepth(900);
    void topBar;
    new Button(this, this.colX + 90, 96, { w: 120, h: 120, colors: th.primary, icon: 'ui_back', iconSize: 66, onClick: () => this.go('Menu', {}, { hop: true }) }).setScrollFactor(0).setDepth(1000);
    label(this, this.cx - 60, 96, t('map'), 72, { stroke: th.title.stroke }).setScrollFactor(0).setDepth(1000);
    new CoinCounter(this, this.colX + 1080 - 190, 96, () => this.go('Shop', { tab: 'coins' }, { hop: true })).setScrollFactor(0).setDepth(1000);
    const play = new Button(this, this.cx, this.H - 140, { w: 620, h: 160, colors: BTN.green, icon: 'ui_play', text: `${t('play')} · ${cur}`, fontSize: 64, onClick: () => this.go('Game', { level: cur }) });
    play.setScrollFactor(0).setDepth(1000).pulse();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.moved = false;
      this.startY = p.y;
      this.lastY = p.y;
      this.startScroll = cam.scrollY;
      this.velocity = 0;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      if (Math.abs(p.y - this.startY) > 14) this.moved = true;
      if (!this.moved) return;
      this.velocity = this.lastY - p.y;
      this.lastY = p.y;
      cam.scrollY = Phaser.Math.Clamp(this.startScroll - (p.y - this.startY), this.minScroll - 150, this.maxScroll + 150);
    });
    this.input.on('pointerup', () => {
      this.dragging = false;
      this.time.delayedCall(0, () => (this.moved = false));
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.velocity = 0;
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY + dy, this.minScroll, this.maxScroll);
    });
    this.refreshVisible();
  }

  update(): void {
    const cam = this.cameras.main;
    if (!this.dragging) {
      if (Math.abs(this.velocity) > 0.3) {
        cam.scrollY += this.velocity;
        this.velocity *= 0.92;
      }
      const c = Phaser.Math.Clamp(cam.scrollY, this.minScroll, this.maxScroll);
      if (c !== cam.scrollY) {
        cam.scrollY += (c - cam.scrollY) * 0.2;
        this.velocity = 0;
      }
    }
    this.refreshVisible();
  }

  private refreshVisible(): void {
    const top = this.cameras.main.scrollY - 300;
    const bottom = top + this.H + 600;
    const cur = store.data.level;
    const want = new Set<number>();
    for (let i = 1; i <= cur + AHEAD; i++) {
      const y = this.worldY(i);
      if (y < top) break;
      if (y <= bottom) want.add(i);
    }
    for (const [i, n] of this.nodes) if (!want.has(i)) (n.destroy(), this.nodes.delete(i));
    for (const i of want) if (!this.nodes.has(i)) this.nodes.set(i, this.makeNode(i, cur));
    for (const [k, b] of this.banners) if (!want.has(k * 20) && !want.has(k * 20 + 1)) (b.destroy(), this.banners.delete(k));
    for (const i of want) {
      const k = Math.floor((i - 1) / 20);
      if ((i - 1) % 20 === 0 && !this.banners.has(k)) this.banners.set(k, this.makeBanner(k));
    }
  }

  private makeBanner(k: number): Phaser.GameObjects.Container {
    const th = this.theme;
    const y = this.worldY(k * 20 + 1) + SP * 0.5 + 20;
    const c = this.add.container(this.cx, y).setDepth(5);
    const name = `${t('chapter', { n: k + 1 })} · ${tItem(BG_IDS[k % BG_IDS.length])}`;
    const txt = label(this, 0, -4, name, 46, { stroke: th.primary[2] });
    c.add(this.add.image(0, 0, buttonTexture(this.textures, Math.round(Math.min(1000, txt.width + 120)), 96, th.primary, 40)));
    c.add(txt);
    return c;
  }

  private makeNode(i: number, cur: number): Phaser.GameObjects.Container {
    const th = this.theme;
    const x = this.worldX(i);
    const y = this.worldY(i);
    const c = this.add.container(x, y).setDepth(10);
    // dotted path to the next level
    const nx = this.worldX(i + 1);
    const ny = this.worldY(i + 1);
    const dotKey = canvasTexture(this.textures, 'map_dot', 28, 28, (g) => {
      g.fillStyle = 'rgba(0,0,0,.2)';
      g.beginPath();
      g.arc(14, 16, 11, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(14, 13, 11, 0, Math.PI * 2);
      g.fill();
    });
    for (let k = 1; k < 6; k++) {
      const f = k / 6;
      c.add(this.add.image((nx - x) * f, (ny - y) * f, dotKey).setAlpha(i < cur ? 1 : 0.5).setTint(i < cur ? Phaser.Display.Color.HexStringToColor(th.map.path).color : 0xffffff));
    }
    const done = i < cur;
    const current = i === cur;
    const hard = isHard(i);
    const colors: [string, string, string] = current ? BTN.gold : done ? (hard ? BTN.red : th.primary) : BTN.gray;
    const size = current ? 170 : 140;
    const nodeKey = canvasTexture(this.textures, `node_${size}_${colors.join('')}`, size, size + 12, (g) => {
      g.fillStyle = 'rgba(0,0,0,.22)';
      roundRect(g, 2, 12, size - 4, size - 2, size / 2);
      g.fill();
      g.fillStyle = colors[2];
      roundRect(g, 0, 8, size, size - 4, size / 2);
      g.fill();
      const lg = g.createLinearGradient(0, 0, 0, size);
      lg.addColorStop(0, colors[0]);
      lg.addColorStop(1, colors[1]);
      g.fillStyle = lg;
      roundRect(g, 0, 0, size, size - 8, size / 2);
      g.fill();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 7;
      roundRect(g, 4, 4, size - 8, size - 16, size / 2 - 4);
      g.stroke();
    });
    const btn = this.add.image(0, 0, nodeKey);
    c.add(btn);
    if (!done && !current) c.add(this.add.image(0, -4, 'ui_lock').setDisplaySize(70, 70).setAlpha(0.85));
    else c.add(label(this, 0, -6, String(i), current ? 64 : 54, { stroke: colors[2] }));
    if (hard) c.add(this.add.image(size / 2 - 12, -size / 2 + 14, 'ui_fire').setDisplaySize(64, 64));
    if (i % 10 === 0) c.add(this.add.image(i % 20 === 0 ? -150 : 150, -10, 'ui_chest').setDisplaySize(100, 100).setAlpha(done ? 0.45 : 1));
    if (done) {
      const st = store.data.stars[i - 1] ?? 0;
      for (let s = 0; s < 3; s++) c.add(this.add.image((s - 1) * 46, size / 2 + 18 - (s === 1 ? 8 : 0), s < st ? 'ui_star' : 'ui_starEmpty').setDisplaySize(50, 50));
    }
    if (current) {
      this.tweens.add({ targets: btn, scale: 1.08, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut' });
      const tag = this.add.container(0, -size / 2 - 50);
      const tt = label(this, 0, -2, t('play'), 36, { stroke: '#7a4a08' });
      tag.add(this.add.image(0, 0, pillTexture(this.textures, Math.round(tt.width + 50), 60, 'rgba(255,255,255,.95)')));
      tt.setColor('#e07a0a').setStroke('#ffffff', 0);
      tag.add(tt);
      this.tweens.add({ targets: tag, y: tag.y - 12, yoyo: true, repeat: -1, duration: 500 });
      c.add(tag);
    }
    if (done || current) {
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerup', () => {
        if (this.moved) return;
        this.go('Game', { level: i });
      });
    }
    return c;
  }
}
