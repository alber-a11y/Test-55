import { audio } from '../audio/audio';
import { CONFIG } from '../config';
import { t } from '../core/i18n';
import { fxRng } from '../core/rng';
import { addBooster, addCoins, persist, save } from '../core/save';
import { todayKey } from '../core/util';
import { BOOSTERS, boosterName, type BoosterId } from '../game/boosters';
import { watchAd } from './app';
import { btn, h, openModal } from './dom';
import { boosterIcon, ICONS } from './icons';

export interface Prize {
  coins: number;
  boosters: BoosterId[];
}

export function prizeView(p: Prize): HTMLElement {
  return h('div', { class: 'prize' }, [
    p.coins ? h('div', { class: 'prize-item' }, [h('span', { html: ICONS.coin }), h('b', { text: `+${p.coins}` })]) : null,
    ...p.boosters.map((id) => h('div', { class: 'prize-item', title: t(boosterName(id)) }, [h('span', { html: boosterIcon(id) }), h('b', { text: '+1' })])),
  ]);
}

export function grantPrize(p: Prize): void {
  if (p.coins) addCoins(p.coins);
  for (const id of p.boosters) addBooster(id, 1);
}

export function openDaily(): void {
  const today = todayKey();
  if (save.daily.chest === today) {
    openModal(
      [h('div', { class: 'big-icon chest-closed', html: ICONS.chest }), h('p', { class: 'modal-text', text: t('daily.done') })],
      { title: t('daily.title'), closable: true },
    );
    return;
  }
  const chest = h('div', { class: 'big-icon chest-shake', html: ICONS.chest });
  const body = h('div', { class: 'daily-body' }, [chest]);
  const buttons = h('div', { class: 'modal-buttons' });
  const m = openModal([body, buttons], { title: t('daily.title'), closable: true });
  buttons.appendChild(
    btn(
      t('daily.open'),
      () => {
        const e = CONFIG.economy;
        const n = fxRng.int(1, 2);
        const prize: Prize = {
          coins: fxRng.int(e.dailyMin, e.dailyMax),
          boosters: Array.from({ length: n }, () => fxRng.pick(BOOSTERS).id),
        };
        save.daily.chest = today;
        persist(true);
        grantPrize(prize);
        audio.play('win');
        chest.classList.remove('chest-shake');
        chest.classList.add('chest-open');
        body.appendChild(prizeView(prize));
        buttons.innerHTML = '';
        let dbl: HTMLButtonElement;
        buttons.append(
          (dbl = btn(
            t('daily.double'),
            async () => {
              if (await watchAd('daily_double')) {
                grantPrize(prize);
                audio.play('coin');
                dbl.disabled = true;
                body.querySelectorAll('.prize-item b').forEach((b) => {
                  const v = parseInt((b.textContent || '+0').slice(1), 10);
                  b.textContent = `+${v * 2}`;
                });
              }
            },
            { variant: 'gold', ad: true },
          )),
          btn(t('daily.take'), () => m.close(), { variant: 'green' }),
        );
      },
      { variant: 'green' },
    ),
  );
}
