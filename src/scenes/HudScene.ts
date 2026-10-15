import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { t } from '../core/i18n';
import { pauseHub } from '../core/pause';
import { save } from '../core/save';
import { TILE } from '../data/types';
import { ads } from '../platform/AdManager';
import { platform } from '../platform/platform';
import { Button, panel, toast, txt } from '../ui/widgets';
import type { GameScene } from './GameScene';

const STICK_R = 70;

export class HudScene extends Phaser.Scene {
  private gs!: GameScene;
  private waveText!: Phaser.GameObjects.Text;
  private subText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private bossBar!: Phaser.GameObjects.Graphics;
  private bossName!: Phaser.GameObjects.Text;
  private superBtn!: Phaser.GameObjects.Container;
  private superFill!: Phaser.GameObjects.Graphics;
  private atkAmmo?: Phaser.GameObjects.Graphics;
  private stickBase!: Phaser.GameObjects.Image;
  private stickKnob!: Phaser.GameObjects.Image;
  private aimKnob!: Phaser.GameObjects.Image;
  private overlay: Phaser.GameObjects.Container | null = null;
  private touchMode = false;
  private moveId = -1;
  private moveOrigin = { x: 0, y: 0 };
  private atkId = -1;
  private supId = -1;
  private aimVec = { x: 0, y: 0 };
  private mouseLeft = false;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private atkPos = { x: 0, y: 0 };
  private supPos = { x: 0, y: 0 };
  private lastSuperReady = false;

  constructor() {
    super('Hud');
  }

  create(): void {
    this.gs = this.scene.get('Game') as GameScene;
    const W = this.scale.width;
    const H = this.scale.height;
    this.touchMode = this.sys.game.device.input.touch && !this.sys.game.device.os.desktop;
    this.moveId = this.atkId = this.supId = -1;
    this.overlay = null;

    // Top bar.
    new Button(this, 52, 48, { w: 68, h: 62, color: 'dark', icon: 'i_pause', iconSize: 36 }).onClick(() => this.openPause());
    this.waveText = txt(this, W / 2, 36, '', 30, '#ffd166');
    this.subText = txt(this, W / 2, 72, '', 18, '#ffffff');
    const cg = this.add.graphics();
    cg.fillStyle(0x1b1530, 0.7).fillRoundedRect(W - 170, 24, 150, 46, 23);
    this.add.image(W - 160, 47, 'i_coin').setDisplaySize(50, 50);
    this.coinText = txt(this, W - 80, 47, '0', 26, '#ffe066');
    this.bossBar = this.add.graphics();
    this.bossName = txt(this, W / 2, 100, '', 22, '#ff8fa3').setVisible(false);

    // Super button.
    this.supPos = this.touchMode ? { x: W - 300, y: H - 90 } : { x: W - 90, y: H - 90 };
    this.superFill = this.add.graphics();
    const supIcon = this.add.image(0, 0, 'i_super').setDisplaySize(70, 70);
    this.superBtn = this.add.container(this.supPos.x, this.supPos.y, [this.superFill, supIcon]);
    if (!this.touchMode) this.superBtn.add(txt(this, 0, 52, 'SPACE / RMB', 13, '#ffffff'));

    // Touch controls.
    this.stickBase = this.add.image(0, 0, 'ring').setDisplaySize(STICK_R * 2.2, STICK_R * 2.2).setAlpha(0).setTint(0xffffff);
    this.stickKnob = this.add.image(0, 0, 'disc').setDisplaySize(64, 64).setAlpha(0).setTint(0xffffff);
    this.aimKnob = this.add.image(0, 0, 'disc').setDisplaySize(60, 60).setAlpha(0).setTint(0xff5a5f);
    if (this.touchMode) {
      this.atkPos = { x: W - 150, y: H - 190 };
      this.atkAmmo = this.add.graphics();
      const ring = this.add.image(0, 0, 'disc').setDisplaySize(150, 150).setTint(0xff5a5f).setAlpha(0.55);
      const icon = this.add.image(0, 0, 'aim_arrow').setDisplaySize(56, 56);
      this.add.container(this.atkPos.x, this.atkPos.y, [ring, this.atkAmmo, icon]);
      this.stickBase.setPosition(170, H - 160).setAlpha(0.25);
      this.stickKnob.setPosition(170, H - 160).setAlpha(0.35);
    }

    // Keyboard.
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E,ESC,P') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-SPACE', () => this.requestSuperFromMouse());
    kb.on('keydown-E', () => this.requestSuperFromMouse());
    kb.on('keydown-ESC', () => (this.overlay ? this.closeOverlay() : this.openPause()));
    kb.on('keydown-P', () => (this.overlay ? null : this.openPause()));

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.onUp(p));

    // Battle events.
    const ev = this.gs.events;
    const onBanner = (text: string, color: string) => this.banner(text, color);
    const onDown = (canRevive: boolean) => this.showRevive(canRevive);
    const onBoss = (name: string) => {
      this.bossName.setText(name).setVisible(true);
    };
    ev.on('banner', onBanner);
    ev.on('playerDown', onDown);
    ev.on('bossSpawn', onBoss);
    this.events.once('shutdown', () => {
      ev.off('banner', onBanner);
      ev.off('playerDown', onDown);
      ev.off('bossSpawn', onBoss);
    });

    // Tutorial hints on first levels.
    if (this.gs.level <= 2) {
      const lines = this.touchMode ? [t('tutBush')] : [t('tutMove'), t('tutAim'), t('tutSuper'), t('tutBush')];
      const hint = txt(this, W / 2, H - 40 - lines.length * 14, lines.join('\n'), 18, '#ffffff', { lineSpacing: 4 });
      this.tweens.add({ targets: hint, alpha: 0, delay: 9000, duration: 800, onComplete: () => hint.destroy() });
    }
    this.banner(t('levelN', { n: this.gs.level }), '#ffffff');

    // Resize: rebuild HUD.
    const onResize = () => this.scene.restart();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));

    // Restore overlays after a rebuild.
    const b = this.gs.battle;
    if (b.state === 'dead' && pauseHub.has('dialog')) this.showRevive(b.revives === 0);
    else if (pauseHub.has('menu')) {
      pauseHub.set('menu', false);
      this.openPause();
    }
  }

  /* ---------------------------------------------------------------- input */

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.overlay || pauseHub.paused) return;
    const W = this.scale.width;
    if (p.wasTouch && !this.touchMode) {
      // Touch on a desktop-classified device: switch on the fly.
      this.touchMode = true;
      this.scene.restart();
      return;
    }
    if (this.touchMode) {
      if (Math.hypot(p.x - this.atkPos.x, p.y - this.atkPos.y) < 100 && this.atkId < 0) {
        this.atkId = p.id;
        this.aimVec = { x: 0, y: 0 };
        this.aimKnob.setPosition(this.atkPos.x, this.atkPos.y).setAlpha(0.9).setTint(0xff5a5f);
      } else if (Math.hypot(p.x - this.supPos.x, p.y - this.supPos.y) < 75 && this.supId < 0) {
        if (this.gs.battle.player.superCharge < 1) return;
        this.supId = p.id;
        this.aimVec = { x: 0, y: 0 };
        this.aimKnob.setPosition(this.supPos.x, this.supPos.y).setAlpha(0.9).setTint(0xffd60a);
      } else if (p.x < W * 0.5 && this.moveId < 0) {
        this.moveId = p.id;
        this.moveOrigin = { x: p.x, y: p.y };
        this.stickBase.setPosition(p.x, p.y).setAlpha(0.5);
        this.stickKnob.setPosition(p.x, p.y).setAlpha(0.8);
      }
      return;
    }
    // Desktop mouse.
    if (p.rightButtonDown()) this.requestSuperFromMouse();
    else if (p.leftButtonDown()) this.mouseLeft = true;
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.touchMode) return;
    if (p.id === this.moveId) {
      const dx = p.x - this.moveOrigin.x;
      const dy = p.y - this.moveOrigin.y;
      const len = Math.hypot(dx, dy);
      const k = len > STICK_R ? STICK_R / len : 1;
      this.stickKnob.setPosition(this.moveOrigin.x + dx * k, this.moveOrigin.y + dy * k);
    } else if (p.id === this.atkId || p.id === this.supId) {
      const o = p.id === this.atkId ? this.atkPos : this.supPos;
      const dx = p.x - o.x;
      const dy = p.y - o.y;
      const len = Math.hypot(dx, dy);
      const k = len > STICK_R ? STICK_R / len : 1;
      this.aimVec = { x: dx, y: dy };
      this.aimKnob.setPosition(o.x + dx * k, o.y + dy * k);
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const inp = this.gs.inputState;
    if (!this.touchMode) {
      if (!p.leftButtonDown()) this.mouseLeft = false;
      return;
    }
    if (p.id === this.moveId) {
      this.moveId = -1;
      const H = this.scale.height;
      this.stickBase.setPosition(170, H - 160).setAlpha(0.25);
      this.stickKnob.setPosition(170, H - 160).setAlpha(0.35);
    } else if (p.id === this.atkId || p.id === this.supId) {
      const isSuper = p.id === this.supId;
      const len = Math.hypot(this.aimVec.x, this.aimVec.y);
      const req = len < 22 ? { angle: null, mag: 1 } : { angle: Math.atan2(this.aimVec.y, this.aimVec.x), mag: Math.min(1, len / STICK_R) };
      if (isSuper) inp.superFire = req;
      else inp.fire = req;
      if (isSuper) this.supId = -1;
      else this.atkId = -1;
      this.aimKnob.setAlpha(0);
      inp.aim.active = false;
    }
  }

  private mouseAim(): { angle: number; mag: number; superMag: number } {
    const b = this.gs.battle;
    const ptr = this.input.activePointer;
    const wp = this.gs.cameras.main.getWorldPoint(ptr.x, ptr.y);
    const p = b.player;
    const angle = Math.atan2(wp.y - p.y, wp.x - p.x);
    const d = Math.hypot(wp.x - p.x, wp.y - p.y);
    return { angle, mag: Math.min(1, d / (p.attack.range * TILE)), superMag: Math.min(1, d / Math.max(1, b.heroDef.super.range * TILE)) };
  }

  private requestSuperFromMouse(): void {
    if (this.overlay || pauseHub.paused) return;
    const inp = this.gs.inputState;
    if (this.touchMode) {
      inp.superFire = { angle: null, mag: 1 };
      return;
    }
    const a = this.mouseAim();
    inp.superFire = { angle: a.angle, mag: a.superMag };
  }

  /* ---------------------------------------------------------------- frame */

  update(): void {
    const b = this.gs.battle;
    if (!b) return;
    const inp = this.gs.inputState;
    const W = this.scale.width;

    // Movement.
    let mx = 0;
    let my = 0;
    const k = this.keys;
    if (k.A.isDown || k.LEFT.isDown) mx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) mx += 1;
    if (k.W.isDown || k.UP.isDown) my -= 1;
    if (k.S.isDown || k.DOWN.isDown) my += 1;
    if (this.moveId >= 0) {
      mx = (this.stickKnob.x - this.moveOrigin.x) / STICK_R;
      my = (this.stickKnob.y - this.moveOrigin.y) / STICK_R;
    }
    inp.mx = mx;
    inp.my = my;

    // Aim.
    if (this.overlay) {
      inp.aim.active = false;
      this.mouseLeft = false;
    } else if (this.touchMode) {
      if (this.atkId >= 0 || this.supId >= 0) {
        const len = Math.hypot(this.aimVec.x, this.aimVec.y);
        inp.aim = { active: len >= 22, angle: Math.atan2(this.aimVec.y, this.aimVec.x), mag: Math.min(1, len / STICK_R), isSuper: this.supId >= 0 };
      } else inp.aim.active = false;
    } else if (b.player.alive) {
      const a = this.mouseAim();
      const superHeld = this.input.activePointer.rightButtonDown();
      inp.aim = { active: true, angle: a.angle, mag: superHeld ? a.superMag : a.mag, isSuper: superHeld };
      if (this.mouseLeft && this.input.activePointer.leftButtonDown()) inp.fire = { angle: a.angle, mag: a.mag };
      else this.mouseLeft = false;
    }

    // Texts.
    const enemies = b.units.filter((u) => u.alive && u.team === 1).length;
    if (b.boss && b.boss.alive) {
      this.waveText.setText(t('boss'));
      this.subText.setText('');
      const w = Math.min(560, W * 0.45);
      const x = W / 2 - w / 2;
      const pct = b.boss.hp / b.boss.maxHp;
      this.bossBar.clear();
      this.bossBar.fillStyle(0x1b1530, 0.9).fillRoundedRect(x - 4, 60, w + 8, 26, 10);
      this.bossBar.fillStyle(0xff3b4e, 1).fillRoundedRect(x, 64, Math.max(4, w * pct), 18, 7);
      this.bossBar.fillStyle(0xffffff, 0.3).fillRoundedRect(x, 64, Math.max(4, w * pct), 6, 3);
      this.bossName.setY(104);
    } else {
      this.bossBar.clear();
      this.bossName.setVisible(false);
      if (b.waveIdx >= 0 && b.state !== 'won') {
        this.waveText.setText(t('wave', { n: b.waveIdx + 1, m: b.cfg.waves.length }));
        this.subText.setText(enemies > 0 ? t('enemiesLeft', { n: enemies }) : '');
      } else this.waveText.setText('');
    }
    this.coinText.setText(String(Math.round(b.coins * b.coinMult)));

    // Super button.
    const ch = b.player.superCharge;
    const g = this.superFill;
    g.clear();
    g.fillStyle(0x1b1530, 0.7).fillCircle(0, 0, 54);
    g.lineStyle(10, 0x5c4a00, 1).strokeCircle(0, 0, 46);
    g.lineStyle(10, 0xffd60a, 1);
    g.beginPath();
    g.arc(0, 0, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ch);
    g.strokePath();
    const ready = ch >= 1;
    this.superBtn.setAlpha(ready ? 1 : 0.65);
    if (ready && !this.lastSuperReady) this.tweens.add({ targets: this.superBtn, scale: { from: 1.3, to: 1 }, duration: 300, ease: 'Back.Out' });
    if (ready) this.superBtn.setScale(1 + Math.sin(this.time.now / 150) * 0.04);
    this.lastSuperReady = ready;

    // Attack button ammo ring.
    if (this.atkAmmo) {
      const p = b.player;
      const a = this.atkAmmo;
      a.clear();
      for (let i = 0; i < 3; i++) {
        const start = -Math.PI / 2 + (i * Math.PI * 2) / 3 + 0.08;
        const len = (Math.PI * 2) / 3 - 0.16;
        let f = 0;
        if (i < p.ammo) f = 1;
        else if (i === p.ammo) f = p.reloadTimer / p.attack.reload;
        a.lineStyle(9, 0x1b1530, 0.8);
        a.beginPath();
        a.arc(0, 0, 82, start, start + len);
        a.strokePath();
        if (f > 0) {
          a.lineStyle(7, f >= 1 ? 0xffa62b : 0xb36b1e, 1);
          a.beginPath();
          a.arc(0, 0, 82, start, start + len * f);
          a.strokePath();
        }
      }
    }
  }

  /* ---------------------------------------------------------------- overlays */

  banner(text: string, color: string): void {
    const W = this.scale.width;
    const b = txt(this, W / 2, 220, text, 58, color).setScale(0).setDepth(50);
    this.tweens.add({
      targets: b, scale: 1, duration: 300, ease: 'Back.Out',
      onComplete: () => this.tweens.add({ targets: b, alpha: 0, y: 190, delay: 900, duration: 300, onComplete: () => b.destroy() }),
    });
  }

  private dim(): Phaser.GameObjects.Container {
    const W = this.scale.width;
    const H = this.scale.height;
    const c = this.add.container(0, 0).setDepth(100);
    const bg = this.add.rectangle(0, 0, W, H, 0x0a0820, 0.7).setOrigin(0).setInteractive();
    c.add(bg);
    this.overlay = c;
    this.aimKnob.setAlpha(0);
    this.moveId = this.atkId = this.supId = -1;
    return c;
  }

  private closeOverlay(): void {
    if (!this.overlay) return;
    this.overlay.destroy();
    this.overlay = null;
    if (pauseHub.has('menu')) {
      pauseHub.set('menu', false);
      ads.inGameplay = true;
      platform.gameplayStart();
    }
  }

  private openPause(): void {
    if (this.overlay || this.gs.battle.state === 'dead') return;
    pauseHub.set('menu', true);
    ads.inGameplay = false;
    platform.gameplayStop();
    const W = this.scale.width;
    const c = this.dim();
    c.add(panel(this, W / 2 - 220, 140, 440, 440, 0x2b2f55));
    c.add(txt(this, W / 2, 190, t('pause'), 48, '#ffd60a'));
    const d = save.data;
    const toggle = (y: number, label: () => string, fn: () => void) => {
      const btn = new Button(this, W / 2, y, { w: 320, h: 66, color: 'blue', label: label(), size: 26 }).onClick(() => {
        fn();
        btn.setLabel(label());
      });
      c.add(btn);
    };
    toggle(290, () => `${t('sound')}: ${d.settings.sound ? 'ON' : 'OFF'}`, () => {
      d.settings.sound = !d.settings.sound;
      audio.setSettings(d.settings.sound, d.settings.music);
      save.save();
    });
    toggle(370, () => `${t('music')}: ${d.settings.music ? 'ON' : 'OFF'}`, () => {
      d.settings.music = !d.settings.music;
      audio.setSettings(d.settings.sound, d.settings.music);
      save.save();
    });
    c.add(new Button(this, W / 2, 460, { w: 320, h: 76, color: 'green', label: t('resume'), size: 32 }).onClick(() => this.closeOverlay()));
    c.add(
      new Button(this, W / 2, 540, { w: 220, h: 54, color: 'red', label: t('giveUp'), size: 22 }).onClick(() => {
        this.closeOverlay();
        this.gs.battle.giveUp();
      }),
    );
  }

  private showRevive(canRevive: boolean): void {
    if (this.overlay) this.overlay.destroy();
    this.overlay = null;
    pauseHub.set('dialog', true);
    const W = this.scale.width;
    const c = this.dim();
    c.add(panel(this, W / 2 - 240, 170, 480, 360, 0x4a1f3d));
    c.add(this.add.image(W / 2, 250, 'i_skull').setDisplaySize(90, 90));
    c.add(txt(this, W / 2, 330, t('revivePrompt'), 34, '#ffffff'));
    if (canRevive) {
      const rb = new Button(this, W / 2, 410, { w: 340, h: 84, color: 'purple', label: t('revive'), size: 32, icon: 'i_ad', iconSize: 50 }).onClick(async () => {
        rb.setEnabled(false);
        const ok = await ads.rewarded();
        if (ok) {
          this.closeDialog();
          this.gs.battle.revive();
        } else {
          rb.setEnabled(true);
          toast(this, t('adNoReward'), '#ff8fa3');
        }
      });
      c.add(rb);
      this.tweens.add({ targets: rb, scale: 1.05, yoyo: true, repeat: -1, duration: 500 });
    }
    c.add(
      new Button(this, W / 2, canRevive ? 490 : 430, { w: 240, h: 60, color: 'red', label: t('giveUp'), size: 24 }).onClick(() => {
        this.closeDialog();
        this.gs.battle.giveUp();
      }),
    );
  }

  private closeDialog(): void {
    pauseHub.set('dialog', false);
    this.overlay?.destroy();
    this.overlay = null;
  }
}
