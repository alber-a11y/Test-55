import { engine } from '../audio/engine';
import { setPaused } from '../core/pause';
import { platform } from './platform';

/**
 * Browser-level rules expected by game portals: no context menu / right click, no text selection
 * or dragging, no page zoom or scroll gestures; pause + mute when the tab is hidden.
 */
export function installGuards(): void {
  const prevent = (e: Event) => e.preventDefault();
  document.addEventListener('contextmenu', prevent);
  document.addEventListener('selectstart', prevent);
  document.addEventListener('dragstart', prevent);
  document.addEventListener('gesturestart', prevent as EventListener);
  document.addEventListener('dblclick', prevent);
  // right / middle mouse buttons do nothing in the game
  document.addEventListener('mousedown', (e) => {
    if (e.button !== 0) e.preventDefault();
  });
  document.addEventListener('auxclick', prevent);
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
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
}

/** Pause/mute when the page is hidden or the platform asks for it. */
export function installPauseHooks(): void {
  document.addEventListener('visibilitychange', () => setPaused('hidden', document.hidden));
  window.addEventListener('pagehide', () => setPaused('hidden', true));
  window.addEventListener('pageshow', () => setPaused('hidden', document.hidden));
  window.addEventListener('blur', () => engine.setMuted('blur', true));
  window.addEventListener('focus', () => engine.setMuted('blur', false));
  platform.onPauseChange((paused) => setPaused('platform', paused));
}
