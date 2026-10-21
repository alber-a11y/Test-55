import { interstitial, setScreen } from './app';
import { openDaily } from './daily';
import { GameScreen } from './game';
import { MapScreen } from './map';
import { MenuScreen } from './menu';
import { openSettings } from './settings';
import { openShop } from './shop';
import { openWheel } from './wheel';

/** Screen navigation. Every switch into gameplay passes a fullscreen-ad opportunity. */
export const nav = {
  menu(): void {
    setScreen(new MenuScreen());
  },
  map(): void {
    setScreen(new MapScreen());
  },
  async level(n: number): Promise<void> {
    await interstitial('mode_switch');
    setScreen(new GameScreen('levels', n));
  },
  async classic(): Promise<void> {
    await interstitial('mode_switch');
    setScreen(new GameScreen('classic'));
  },
  shop: () => openShop(),
  daily: () => openDaily(),
  wheel: () => openWheel(),
  settings: () => openSettings(),
};
