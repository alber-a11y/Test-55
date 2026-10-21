import { t } from '../core/i18n';
import { save } from '../core/save';
import { THEMES } from '../render/styles';
import type { Screen } from './app';
import { h, iconBtn } from './dom';
import { ICONS } from './icons';
import { coinChip } from './menu';
import { nav } from './nav';

/** Endless level path: completed levels with stars, the current one pulsing, a few locked ahead. */
export class MapScreen implements Screen {
  el: HTMLElement;
  music = 'menu' as const;
  private list: HTMLElement;

  constructor() {
    this.list = h('div', { class: 'map-list scroll-y' });
    const top = save.level + 12;
    const path = h('div', { class: 'map-path' });
    for (let n = top; n >= 1; n--) {
      const done = n < save.level;
      const cur = n === save.level;
      const stars = save.stars[n] ?? 0;
      const theme = THEMES[n % THEMES.length];
      const node = h(
        'button',
        {
          class: `map-node ${done ? 'done' : ''} ${cur ? 'current' : ''} ${n > save.level ? 'locked' : ''}`,
          style: `--c:${theme.palette[(n * 3) % 8]};--x:${Math.round(Math.sin(n * 0.9) * 80)}px`,
          onClick: () => {
            if (n <= save.level) void nav.level(n);
          },
        },
        [
          n > save.level ? h('span', { class: 'node-lock', html: ICONS.lock }) : h('span', { class: 'node-num', text: String(n) }),
          done
            ? h(
                'span',
                { class: 'node-stars' },
                [0, 1, 2].map((i) => h('i', { html: i < stars ? ICONS.star : ICONS.starEmpty })),
              )
            : null,
          n % 10 === 0 ? h('span', { class: 'node-flag', html: ICONS.trophy }) : null,
        ],
      );
      path.appendChild(node);
    }
    this.list.appendChild(path);
    this.el = h('div', { class: 'screen map-screen' }, [
      h('div', { class: 'topbar' }, [
        iconBtn(ICONS.back, () => nav.menu(), 'top-btn'),
        h('div', { class: 'top-title', text: t('map.title') }),
        coinChip(),
      ]),
      this.list,
    ]);
  }

  resize(): void {
    requestAnimationFrame(() => {
      const cur = this.list.querySelector('.current') as HTMLElement | null;
      cur?.scrollIntoView({ block: 'center' });
    });
  }
}
