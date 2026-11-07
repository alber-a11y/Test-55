import type Phaser from 'phaser';
import { engine } from '../audio/engine';

/**
 * Global pause hub. Every reason (ad, hidden tab, platform overlay) mutes audio; while any
 * reason is active the Phaser loop sleeps, freezing scenes, tweens and timers.
 */
let game: Phaser.Game | null = null;
const reasons = new Set<string>();

export function attachPause(g: Phaser.Game): void {
  game = g;
}

export function setPaused(reason: string, on: boolean): void {
  if (on) reasons.add(reason);
  else reasons.delete(reason);
  engine.setMuted(reason, on);
  if (!game) return;
  if (reasons.size) {
    if (game.loop.running) game.loop.sleep();
    game.input.enabled = false;
  } else {
    if (!game.loop.running) {
      game.loop.wake();
      // no giant first frame after a long ad: tweens and timers continue where they stopped
      game.loop.resetDelta();
    }
    game.input.enabled = true;
  }
}
