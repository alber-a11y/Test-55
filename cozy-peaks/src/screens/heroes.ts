import { audio } from '../audio/audio';
import { heroPortrait } from '../art/heroes';
import { roomSvg } from '../art/rooms';
import { track } from '../core/analytics';
import { setGender, t, tr } from '../core/i18n';
import { save } from '../core/save';
import { HEROES } from '../meta/heroes';
import { h } from '../ui/dom';
import { heroSays } from '../ui/dialogs';
import { go, register, type Screen } from '../ui/router';
import { button } from '../ui/widgets';

register('heroes', (p: { change?: boolean }): Screen => {
  const el = h('div', { class: 'scr-heroes' });
  el.append(h('div', { class: 'bg-room blur', html: roomSvg('garden', { tasks: {}, bonus: [], stage: 0 }) }));
  const head = h('div', { class: 'heroes-head' }, h('div', { class: 'game-title', text: t('title') }), h('div', { class: 'game-sub', text: t('subtitle') }), h('div', { class: 'heroes-q', text: t('chooseHeroSub') }));
  const grid = h('div', { class: 'hero-grid' });
  for (const hero of HEROES) {
    const sel = save.data.hero === hero.id;
    grid.append(
      h(
        'div',
        { class: `panel hero-card ${sel ? 'sel' : ''}` },
        h('div', { class: 'hero-face', html: heroPortrait(hero) }),
        h('div', { class: 'hero-name', text: tr(hero.name) }),
        h('div', { class: 'hero-bio', text: tr(hero.bio) }),
        button(t('choose'), {
          small: true,
          onClick: () => {
            save.data.hero = hero.id;
            setGender(hero.gender);
            save.commit();
            audio.play('unlock');
            track('hero_selected', { id: hero.id });
            if (p.change || save.data.wins > 0) {
              void go('home');
              return;
            }
            void go('home').then(() => {
              const key = hero.age === 'young' ? 'introYoung' : hero.age === 'senior' ? 'introSenior' : 'introAdult';
              heroSays(key, 'happy', 4200);
              setTimeout(() => document.querySelector('.scr-home') && heroSays('hello', 'wow', 4200), 4500);
            });
          },
        }),
      ),
    );
  }
  el.append(head, grid);
  return { el, music: 'home' };
});
