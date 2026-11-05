import { audio } from '../audio/audio';
import { ads } from '../platform/AdManager';
import { clear } from './dom';
import { stage } from './stage';
import { closeAllModals } from './widgets';

export interface Screen {
  el: HTMLElement;
  music?: 'home' | 'level' | 'room';
  destroy?: () => void;
  resize?: () => void;
}

type Factory = (params: any) => Screen | Promise<Screen>;

const screens: Record<string, Factory> = {};
let current: { name: string; screen: Screen } | null = null;
let busy = false;

export function register(name: string, f: Factory): void {
  screens[name] = f;
}

export function currentScreen(): string {
  return current?.name ?? '';
}

/**
 * Switch screens. `ad` names the interstitial placement tried during the transition
 * (the AdManager decides whether one is actually shown).
 */
export async function go(name: string, params: unknown = {}, ad: string | null = null): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    closeAllModals();
    document.querySelectorAll('#fx .hero-say').forEach((e) => e.remove());
    const root = document.getElementById('screens')!;
    if (current) {
      current.screen.destroy?.();
      current.screen.el.classList.add('screen-out');
    }
    ads.setGameplay(false);
    if (ad) await ads.interstitial(ad);
    const scr = await screens[name](params);
    clear(root);
    scr.el.classList.add('screen', 'screen-in');
    root.append(scr.el);
    current = { name, screen: scr };
    if (scr.music) audio.playMusic(scr.music);
    scr.resize?.();
  } finally {
    busy = false;
  }
}

stage.onResize(() => current?.screen.resize?.());
