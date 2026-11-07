import Phaser from 'phaser';
import { iconKey, tileKey } from '../../art/textures';
import type { Tile } from '../../game/types';
import { label } from '../../ui/text';

const COVER_TINT = 0x8f8f9a;

/** One tile sprite: body, picture and optional "?", ice and lock overlays. */
export class TileView extends Phaser.GameObjects.Container {
  readonly tile: Tile;
  shadow: Phaser.GameObjects.Image;
  face: Phaser.GameObjects.Image;
  icon: Phaser.GameObjects.Image;
  private ice?: Phaser.GameObjects.Image;
  private iceTxt?: Phaser.GameObjects.Text;
  private lockC?: Phaser.GameObjects.Container;
  private mystery = false;
  covered = false;
  inTray = false;

  constructor(scene: Phaser.Scene, tile: Tile, private set: string, private skin: string) {
    super(scene, 0, 0);
    this.tile = tile;
    this.shadow = scene.add.image(4, 10, 'tile_shadow').setAlpha(0.55);
    this.face = scene.add.image(0, 0, tileKey(skin));
    this.icon = scene.add.image(0, -7, iconKey(set, tile.type)).setDisplaySize(118, 118);
    this.add([this.shadow, this.face, this.icon]);
    this.shadow.setVisible(tile.z > 0 || tile.stack >= 0);
    if (tile.ice > 0) {
      this.ice = scene.add.image(0, -7, 'ov_ice');
      this.iceTxt = label(scene, 0, -10, String(tile.ice), 78, { stroke: '#2a78b8' });
      this.add([this.ice, this.iceTxt]);
    }
    if (tile.lock >= 0) {
      const c = scene.add.container(0, 0);
      c.add(scene.add.image(0, -7, 'ov_lock'));
      c.add(scene.add.image(36, 30, 'ui_lock').setDisplaySize(64, 64));
      const bub = scene.add.circle(-34, 30, 30, 0xffffff).setStrokeStyle(5, 0x5a6478);
      c.add(bub);
      c.add(scene.add.image(-34, 30, iconKey(set, tile.lock)).setDisplaySize(50, 50));
      this.lockC = c;
      this.add(c);
    }
    this.setInteractive(new Phaser.Geom.Rectangle(-75, -82, 150, 158), Phaser.Geom.Rectangle.Contains);
    scene.add.existing(this);
  }

  setType(type: number): void {
    this.tile.type = type;
    if (!this.mystery) this.icon.setTexture(iconKey(this.set, type)).setDisplaySize(118, 118);
  }

  /** "?" face on/off. Returns true when the picture was just revealed. */
  setMystery(on: boolean, animate = true): boolean {
    if (on === this.mystery) return false;
    this.mystery = on;
    const apply = () => {
      this.face.setTexture(tileKey(this.skin, on));
      if (on) this.icon.setTexture('ui_question').setDisplaySize(96, 96);
      else this.icon.setTexture(iconKey(this.set, this.tile.type)).setDisplaySize(118, 118);
      this.applyTint();
    };
    if (!animate) {
      apply();
      return !on;
    }
    const sx = this.scaleX;
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      duration: 110,
      onComplete: () => {
        apply();
        this.scene.tweens.add({ targets: this, scaleX: sx, duration: 130, ease: 'Back.easeOut' });
      },
    });
    return !on;
  }

  setCovered(c: boolean): void {
    if (c === this.covered) return;
    this.covered = c;
    this.applyTint();
  }

  private applyTint(): void {
    if (this.covered) {
      this.face.setTint(COVER_TINT);
      this.icon.setTint(COVER_TINT);
    } else {
      this.face.clearTint();
      this.icon.clearTint();
    }
  }

  setIce(n: number): void {
    if (!this.ice || !this.iceTxt) return;
    if (n > 0) {
      this.iceTxt.setText(String(n));
      this.scene.tweens.add({ targets: this.iceTxt, scale: 1.4, yoyo: true, duration: 120 });
      return;
    }
    const ice = this.ice;
    const txt = this.iceTxt;
    this.ice = undefined;
    this.iceTxt = undefined;
    this.scene.tweens.add({ targets: [ice, txt], alpha: 0, scale: 1.4, duration: 260, onComplete: () => (ice.destroy(), txt.destroy()) });
  }

  unlock(): void {
    const c = this.lockC;
    if (!c) return;
    this.lockC = undefined;
    this.scene.tweens.add({ targets: c, alpha: 0, scale: 1.3, angle: 10, duration: 300, onComplete: () => c.destroy() });
  }

  get frozen(): boolean {
    return !!this.ice;
  }

  /** Strip board-only decorations before flying into the tray. */
  toTray(): void {
    this.inTray = true;
    this.shadow.setVisible(false);
    this.setCovered(false);
    this.setMystery(false, false);
    this.disableInteractive();
  }

  toBoard(): void {
    this.inTray = false;
    this.shadow.setVisible(this.tile.z > 0 || this.tile.stack >= 0);
    this.setInteractive();
  }

  shake(): void {
    const x = this.x;
    this.scene.tweens.add({ targets: this, x: x + 9, duration: 45, yoyo: true, repeat: 2, onComplete: () => this.setX(x) });
  }
}
