import { audio } from '../audio/audio';
import { pauseHub } from '../core/pause';
import { platform } from './platform';

/**
 * Browser-level rules common to game portals (Yandex Games moderation checklist):
 * no context menu, no text selection / drag, no page scroll or zoom gestures,
 * pause + mute when the tab is hidden, the window loses focus or the platform asks to pause.
 */
export function installGuards(): void {
  const prevent = (e: Event) => e.preventDefault();
  document.addEventListener('contextmenu', prevent);
  document.addEventListener('selectstart', prevent);
  document.addEventListener('dragstart', prevent);
  document.addEventListener('gesturestart', prevent as EventListener);
  document.addEventListener('gesturechange', prevent as EventListener);
  document.addEventListener('dblclick', prevent);
  document.addEventListener(
    'touchmove',
    (e) => {
      const te = e as TouchEvent;
      // Allow horizontal swipe on scrollable strips (booster bar, lists); block everything else.
      const scroller = (e.target as HTMLElement | null)?.closest?.('.scroll-x, .scroll-y');
      if (te.touches.length > 1 || !scroller) e.preventDefault();
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
  window.addEventListener('pagehide', () => setHidden(true));
  window.addEventListener('pageshow', () => setHidden(document.hidden));
  window.addEventListener('blur', () => {
    pauseHub.set('blur', true);
    audio.setMuted('blur', true);
  });
  window.addEventListener('focus', () => {
    pauseHub.set('blur', false);
    audio.setMuted('blur', false);
  });

  platform.onPauseChange((paused) => {
    pauseHub.set('platform', paused);
    audio.setMuted('platform', paused);
  });
}
