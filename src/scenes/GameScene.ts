import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { pauseHub } from '../core/pause';
import { save } from '../core/save';
import { TILE } from '../data/types';
import { Battle, type InputState } from '../gameplay/battle';
import { buildLevel } from '../gameplay/levels';
import { ads } from '../platform/AdManager';
import { platform } from '../platform/platform';
import type { BoosterId } from '../data/shop';

export class GameScene extends Phaser.Scene {
  battle!: Battle;
  inputState: InputState = { mx: 0, my: 0, aim: { active: false, angle: 0, mag: 0, isSuper: false }, fire: null, superFire: null };
  level = 1;
  boosters: BoosterId[] = [];
  private unsub: (() => void) | null = null;
  private ended = false;

  constructor() {
    super('Game');
  }

  init(data: { level: number; boosters: BoosterId[] }): void {
    this.level = data.level ?? 1;
    this.boosters = data.boosters ?? [];
    this.ended = false;
    this.inputState = { mx: 0, my: 0, aim: { active: false, angle: 0, mag: 0, isSuper: false }, fire: null, superFire: null };
  }

  create(): void {
    const cfg = buildLevel(this.level);
    const heroId = save.data.selectedHero;
    const hs = save.data.heroes[heroId];
    this.cameras.main.setBackgroundColor(cfg.biome.bg);
    this.battle = new Battle(this, cfg, { heroId, skinId: hs.skin, heroLevel: hs.level, boosters: this.boosters });
    const cam = this.cameras.main;
    cam.setBounds(-TILE * 2, -TILE * 2, this.battle.arena.pxW + TILE * 4, this.battle.arena.pxH + TILE * 4);
    cam.startFollow(this.battle.player.root, true, 0.12, 0.12);
    cam.fadeIn(300);

    audio.playMusic('battle', cfg.biome.transpose);
    ads.inGameplay = true;
    platform.gameplayStart();

    this.unsub = pauseHub.subscribe((paused) => {
      if (paused) {
        this.tweens.pauseAll();
        this.time.paused = true;
      } else {
        this.tweens.resumeAll();
        this.time.paused = false;
      }
    });
    this.events.on('battleEnd', (win: boolean) => this.finish(win));
    this.events.once('shutdown', () => {
      this.unsub?.();
      this.unsub = null;
      this.events.off('battleEnd');
      this.events.off('banner');
      this.events.off('playerDown');
      this.events.off('bossSpawn');
      this.events.off('superReady');
      this.events.off('superUsed');
      this.events.off('coin');
      this.battle.destroy();
      this.scene.stop('Hud');
      pauseHub.set('menu', false);
      pauseHub.set('dialog', false);
    });
    this.scene.launch('Hud');
    this.scene.bringToTop('Hud');
  }

  update(_time: number, delta: number): void {
    if (pauseHub.paused || this.ended) return;
    const dt = Math.min(0.05, delta / 1000);
    this.battle.update(dt, this.inputState);
  }

  private finish(win: boolean): void {
    if (this.ended) return;
    this.ended = true;
    ads.inGameplay = false;
    platform.gameplayStop();
    const b = this.battle;
    const parOk = b.time <= b.cfg.parTime;
    const stars = win ? 1 + (b.revives === 0 ? 1 : 0) + (parOk ? 1 : 0) : 0;
    this.cameras.main.fadeOut(350);
    this.time.delayedCall(380, () => {
      this.scene.stop('Hud');
      this.scene.start('Result', {
        win,
        level: this.level,
        coins: Math.round(b.coins * b.coinMult),
        kills: b.kills,
        stars,
        time: b.time,
        parOk,
        noRevive: b.revives === 0,
        coinMult: b.coinMult,
      });
    });
  }
}
