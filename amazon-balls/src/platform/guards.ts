import { audio } from '../audio/audio';
import { pauseHub } from '../core/pause';
import { platform } from './platform';

/**
 * Browser-level rules common to game portals: no context menu / right click,
 * no text selection or drag, no page scroll or zoom gestures; pause and mute
 * when the tab is hidden or the platform asks to pause.
 */
export function installGuards(): void {
  const prevent = (e: Event) => e.preventDefault();
  document.addEventListener('contextmenu', prevent);
  document.addEventListener('selectstart', prevent);
  document.addEventListener('dragstart', prevent);
  document.addEventListener('gesturestart', prevent as EventListener);
  document.addEventListener('dblclick', prevent);
  // Right / middle mouse buttons never reach the game.
  const blockAux = (e: MouseEvent) => {
    if (e.button !== 0) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  };
  window.addEventListener('mousedown', blockAux, true);
  window.addEventListener('auxclick', blockAux, true);
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  document.addEventListener(
    'touchmove',
    (e) => {
      if ((e as TouchEvent).touches.length > 1 || e.target instanceof HTMLCanvasElement) e.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) e.preventDefault();
    },
    { passive: false },
  );
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(e.key)) e.preventDefault();
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0', 's', 'p'].includes(e.key)) e.preventDefault();
  });

  const setHidden = (hidden: boolean) => {
    pauseHub.set('hidden', hidden);
    audio.setMuted('hidden', hidden);
  };
  document.addEventListener('visibilitychange', () => setHidden(document.hidden));
  window.addEventListener('blur', () => audio.setMuted('blur', true));
  window.addEventListener('focus', () => audio.setMuted('blur', false));
  window.addEventListener('pagehide', () => setHidden(true));
  window.addEventListener('pageshow', () => setHidden(document.hidden));

  platform.onPauseChange((paused) => {
    pauseHub.set('platform', paused);
    audio.setMuted('platform', paused);
  });
}
