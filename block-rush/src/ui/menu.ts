import { CONFIG } from '../config';
import { t } from '../core/i18n';
import { addCoins, onCoins, save } from '../core/save';
import { todayKey } from '../core/util';
import { THEMES } from '../render/styles';
import { watchAd, type Screen } from './app';
import { btn, h, iconBtn, toast } from './dom';
import { ICONS } from './icons';
import { nav } from './nav';

export function coinChip(): HTMLElement {
  const v = h('b', { text: String(save.coins) });
  const chip = h('div', { class: 'coin-chip' }, [
    h('span', { class: 'coin', html: ICONS.coin }),
    v,
    h('button', {
      class: 'coin-plus',
      html: ICONS.ad,
      title: t('shop.freeCoins', { n: CONFIG.economy.freeCoinsAd }),
      onClick: async () => {
        const ok = await watchAd('free_coins');
        if (ok) {
          addCoins(CONFIG.economy.freeCoinsAd);
          toast(t('toast.coins', { n: CONFIG.economy.freeCoinsAd }), 'good');
        }
      },
    }),
  ]);
  onCoins(() => (v.textContent = String(save.coins)));
  return chip;
}

/** Big "BLOCK RUSH" logo: letters on tilted blocks. */
export function logo(): HTMLElement {
  const colors = THEMES[0].palette;
  const letters = 'BLOCK'.split('').map((ch, i) =>
    h('span', { class: 'logo-tile', style: `--c:${colors[i]};--r:${[-8, 5, -4, 7, -6][i]}deg;animation-delay:${i * 0.08}s`, text: ch }),
  );
  return h('div', { class: 'logo' }, [h('div', { class: 'logo-row' }, letters), h('div', { class: 'logo-rush', text: 'RUSH' })]);
}

export class MenuScreen implements Screen {
  el: HTMLElement;
  music = 'menu' as const;

  constructor() {
    const today = todayKey();
    const chestReady = save.daily.chest !== today;
    const wheelReady = save.daily.wheelFree !== today;
    const tile = (icon: string, label: string, onClick: () => void, dot = false) =>
      h('button', { class: 'menu-tile', onClick }, [
        h('span', { class: 'tile-icon', html: icon }),
        h('span', { class: 'tile-label', text: label }),
        dot ? h('i', { class: 'dot' }) : null,
      ]);
    const bg = h('div', { class: 'menu-bg' });
    for (let i = 0; i < 14; i++) {
      const c = THEMES[i % THEMES.length].palette[i % 8];
      bg.appendChild(
        h('i', {
          style: `left:${(i * 37) % 100}%;--c:${c};animation-delay:${-(i * 1.3)}s;animation-duration:${9 + (i % 5) * 2}s;--s:${14 + (i % 4) * 8}px`,
        }),
      );
    }
    this.el = h('div', { class: 'screen menu-screen' }, [
      bg,
      h('div', { class: 'topbar' }, [coinChip(), h('span', { class: 'grow' }), iconBtn(ICONS.gear, () => nav.settings(), 'top-btn')]),
      logo(),
      h('div', { class: 'menu-main' }, [
        btn(t('menu.levels'), () => void nav.level(save.level), {
          variant: 'green',
          icon: ICONS.play,
          sub: t('menu.levelN', { n: save.level }),
          class: 'btn-huge',
        }),
        btn(t('menu.classic'), () => void nav.classic(), {
          variant: 'blue',
          icon: ICONS.trophy,
          sub: t('menu.best', { n: save.bestClassic }),
          class: 'btn-huge',
        }),
      ]),
      h('div', { class: 'menu-tiles' }, [
        tile(ICONS.map, t('menu.map'), () => nav.map()),
        tile(ICONS.shop, t('menu.shop'), () => nav.shop()),
        tile(ICONS.chest, t('menu.daily'), () => nav.daily(), chestReady),
        tile(ICONS.wheel, t('menu.wheel'), () => nav.wheel(), wheelReady),
      ]),
    ]);
  }
}
