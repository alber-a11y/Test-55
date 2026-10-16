import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { t } from '../core/i18n';
import { Rng } from '../core/rng';
import { save } from '../core/save';
import { BIOMES } from '../data/biomes';
import { BOSS_IDS } from '../data/enemies';
import { Button, CoinPill, txt } from '../ui/widgets';
import { BaseScene } from './BaseScene';

const STEP = 230;
const X0 = 260;

/** Scrollable level map: winding road through biome regions, one node per level. */
export class MapScene extends BaseScene {
  private dragFrom: { x: number; scroll: number } | null = null;
  private dragDist = 0;

  constructor() {
    super('Map');
  }

  private nodePos(i: number): { x: number; y: number } {
    // i is the 0-based level index.
    return { x: X0 + i * STEP, y: this.H * 0.52 + Math.sin(i * 0.95) * 140 + Math.sin(i * 0.37) * 30 };
  }

  create(): void {
    this.rebuildOnResize();
    audio.playMusic('menu');
    const H = this.H;
    const W = this.W;
    const d = save.data;
    const current = d.maxLevel;
    const count = Math.max(current + 12, 25);
    const worldW = X0 + (count - 1) * STEP + X0;
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, H);
    cam.setBackgroundColor('#16206b');

    // ---- biome regions (5 levels each) with ground texture and props
    const rng = new Rng(777);
    for (let r = 0; r * 5 < count; r++) {
      const b = BIOMES[r % BIOMES.length];
      const x1 = r === 0 ? 0 : X0 + (r * 5 - 0.5) * STEP;
      const x2 = X0 + (r * 5 + 4.5) * STEP;
      this.add.tileSprite(x1, 0, x2 - x1, H, `${b.id}_floor0`).setOrigin(0).setDepth(-20);
      this.add.rectangle(x1, 0, 6, H, 0x1b1530, 0.35).setOrigin(0).setDepth(-19);
      // Props scattered away from the road.
      const props = [`${b.id}_bush`, `${b.id}_bush`, `${b.id}_wall`, `${b.id}_crate`, `${b.id}_barrel`];
      for (let k = 0; k < 16; k++) {
        const x = x1 + 40 + rng.next() * (x2 - x1 - 80);
        const y = 110 + rng.next() * (H - 200);
        const near = this.nearRoad(x, y, count);
        if (near < 110) continue;
        const key = rng.pick(props);
        this.add.image(x, y, key).setOrigin(0.5, 1).setScale(0.8 + rng.next() * 0.4).setDepth(y);
      }
      if (rng.chance(0.8)) {
        const wx = x1 + 60 + rng.next() * (x2 - x1 - 160);
        const wy = rng.chance(0.5) ? 140 : H - 120;
        if (this.nearRoad(wx, wy, count) > 140)
          for (let a = 0; a < 3; a++) for (let c2 = 0; c2 < 2; c2++) this.add.image(wx + a * 64, wy + c2 * 64, `${b.id}_water`).setDepth(-15);
      }
      // Biome sign at the start of the region.
      const sx = x1 + 90;
      const sy = 150;
      const sign = this.add.container(sx, sy).setDepth(900);
      const g = this.add.graphics();
      g.fillStyle(0x6c4a2a, 1).fillRect(-6, 0, 12, 60);
      g.fillStyle(0x1b1530, 1).fillRoundedRect(-92, -34, 184, 50, 12);
      g.fillStyle(0xa47148, 1).fillRoundedRect(-88, -30, 176, 42, 10);
      sign.add([g, txt(this, 0, -9, t(`biome_${b.id}`), 20, '#fff3b0')]);
    }

    // ---- road
    const pts = Array.from({ length: count }, (_, i) => {
      const p = this.nodePos(i);
      return new Phaser.Math.Vector2(p.x, p.y);
    });
    pts.unshift(new Phaser.Math.Vector2(0, pts[0].y + 60));
    const curve = new Phaser.Curves.Spline(pts);
    const road = curve.getSpacedPoints(count * 24);
    const g = this.add.graphics().setDepth(-5);
    g.lineStyle(62, 0x1b1530, 1).strokePoints(road);
    g.lineStyle(52, 0xb07a3c, 1).strokePoints(road);
    g.lineStyle(40, 0xf2cf8a, 1).strokePoints(road);
    // Completed part of the road glows golden.
    const doneIdx = Math.round(((current - 1) / (count - 1 + 1)) * road.length);
    if (current > 1) g.lineStyle(14, 0xffd60a, 0.85).strokePoints(road.slice(0, Math.max(2, doneIdx)));
    const dots = this.add.graphics().setDepth(-4);
    road.forEach((p, i) => i % 4 === 0 && i > doneIdx && dots.fillStyle(0xffffff, 0.7).fillCircle(p.x, p.y, 4));

    // ---- level nodes
    for (let i = 0; i < count; i++) {
      const lvl = i + 1;
      const p = this.nodePos(i);
      const state = lvl < current ? 'done' : lvl === current ? 'current' : 'locked';
      const node = this.add.container(p.x, p.y).setDepth(1000 + p.y);
      const ng = this.add.graphics();
      const r = state === 'current' ? 50 : 40;
      const fill = state === 'done' ? 0x52d273 : state === 'current' ? 0xffd60a : 0x8d99ae;
      const dark = state === 'done' ? 0x2f9e4f : state === 'current' ? 0xe0a800 : 0x5c677d;
      ng.fillStyle(0x000000, 0.25).fillEllipse(0, r * 0.75, r * 2.2, r * 0.8);
      ng.fillStyle(0x1b1530, 1).fillCircle(0, 0, r + 5);
      ng.fillStyle(dark, 1).fillCircle(0, 4, r);
      ng.fillStyle(fill, 1).fillCircle(0, 0, r - 2);
      ng.fillStyle(0xffffff, 0.3).fillEllipse(-r * 0.25, -r * 0.45, r * 0.9, r * 0.4);
      node.add(ng);
      if (state === 'locked') {
        node.add(this.add.image(0, -2, 'i_lock').setDisplaySize(44, 44));
        node.add(txt(this, 0, r + 4, String(lvl), 18, '#dee2e6'));
      } else {
        node.add(txt(this, 0, 0, String(lvl), state === 'current' ? 38 : 30, '#ffffff'));
      }
      if (state === 'done') {
        const st = d.stars[String(lvl)] ?? 0;
        for (let k = 0; k < 3; k++) node.add(this.add.image(-30 + k * 30, r + 10 - (k === 1 ? 6 : 0), k < st ? 'i_star' : 'i_star_empty').setDisplaySize(30, 30));
      }
      if ((lvl - 1) % 5 === 4 || state === 'current') {
        // Boss marker: every region finale and the current level.
        const bi = this.add.image(r * 0.9, -r * 0.9, `bossBig_${BOSS_IDS[(lvl - 1) % BOSS_IDS.length]}`);
        bi.setScale(46 / bi.height);
        node.add(bi);
      }
      if (state === 'current') {
        const ring = this.add.image(p.x, p.y, 'ring').setTint(0xffd60a).setDepth(999 + p.y).setDisplaySize(140, 140);
        this.tweens.add({ targets: ring, scale: ring.scale * 1.25, alpha: { from: 0.9, to: 0 }, duration: 1100, repeat: -1 });
        this.tweens.add({ targets: node, scale: 1.08, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.InOut' });
      }
      if (state !== 'locked') {
        const zone = this.add.zone(p.x, p.y, r * 2 + 20, r * 2 + 20).setInteractive({ useHandCursor: true }).setDepth(5000);
        zone.on('pointerup', () => {
          if (this.dragDist > 12) return;
          audio.play('click', { vol: 0.5 });
          d.level = lvl;
          save.save();
          this.scene.start('Prep', { level: lvl });
        });
      }
    }

    // ---- selected hero standing by the current level
    const cp = this.nodePos(current - 1);
    const hs = d.heroes[d.selectedHero];
    const hero = this.add.image(cp.x - 120, cp.y + 24, `heroBig_${hs.skin}`).setOrigin(0.5, 1).setDepth(1001 + cp.y + 40);
    hero.setScale(150 / hero.height);
    this.add.image(cp.x - 120, cp.y + 22, 'shadow').setDisplaySize(90, 26).setDepth(1000 + cp.y);
    this.tweens.add({ targets: hero, y: cp.y + 16, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.InOut' });
    hero.setInteractive({ useHandCursor: true }).on('pointerup', () => this.dragDist <= 12 && this.scene.start('Heroes', { back: 'Map' }));

    // ---- camera: start centred on the current level; drag / wheel to scroll
    cam.scrollX = Phaser.Math.Clamp(cp.x - W / 2, 0, Math.max(0, worldW - W));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragFrom = { x: p.x, scroll: cam.scrollX };
      this.dragDist = 0;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragFrom || !p.isDown) return;
      const dx = p.x - this.dragFrom.x;
      this.dragDist = Math.max(this.dragDist, Math.abs(dx));
      cam.scrollX = this.dragFrom.scroll - dx;
    });
    this.input.on('pointerup', () => {
      this.dragFrom = null;
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, dx: number, dy: number) => {
      cam.scrollX += (Math.abs(dx) > Math.abs(dy) ? dx : dy) * 0.8;
    });

    // ---- fixed UI
    const ui = (o: Phaser.GameObjects.GameObject & { setScrollFactor(x: number): unknown; setDepth(d: number): unknown }) => {
      o.setScrollFactor(0);
      o.setDepth(10000);
      return o;
    };
    const bar = this.add.graphics();
    bar.fillStyle(0x16206b, 0.85).fillRect(0, 0, W, 92);
    bar.fillStyle(0x1b1530, 1).fillRect(0, 92, W, 5);
    ui(bar);
    ui(txt(this, W / 2, 46, t('levelMapTitle'), 42, '#ffd60a'));
    ui(new CoinPill(this, W - 110, 46, d.coins));
    ui(new Button(this, 110, 46, { w: 180, h: 62, color: 'red', label: t('back'), size: 26 }).onClick(() => this.scene.start('Menu')));
    const play = new Button(this, W - 190, H - 70, { w: 320, h: 100, color: 'yellow', label: t('play'), size: 44, sub: t('levelN', { n: current }) }).onClick(() => {
      if (this.dragDist > 12) return;
      d.level = current;
      save.save();
      this.scene.start('Prep', { level: current });
    });
    ui(play);
    this.tweens.add({ targets: play, scale: 1.04, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
  }

  /** Distance from a point to the nearest level node (cheap proxy for the road). */
  private nearRoad(x: number, y: number, count: number): number {
    let best = 1e9;
    const i0 = Math.max(0, Math.floor((x - X0) / STEP) - 1);
    for (let i = i0; i < Math.min(count, i0 + 3); i++) {
      const a = this.nodePos(i);
      const b = this.nodePos(Math.min(count - 1, i + 1));
      for (let k = 0; k <= 8; k++) {
        const px = a.x + ((b.x - a.x) * k) / 8;
        const py = a.y + ((b.y - a.y) * k) / 8;
        best = Math.min(best, Math.hypot(px - x, py - y));
      }
    }
    return best;
  }
}
