import { audio } from '../audio/audio';
import { CONFIG } from '../config';
import { t } from '../core/i18n';
import { addBooster, addCoins, boosterCount, spendCoins } from '../core/save';
import { BOOSTERS, boosterDesc, boosterName } from '../game/boosters';
import { watchAd } from './app';
import { btn, h, openModal, toast } from './dom';
import { boosterIcon, ICONS } from './icons';
import { coinChip } from './menu';

export function openShop(): void {
  const rows = BOOSTERS.map((b) => {
    const count = h('span', { class: 'shop-count', text: `×${boosterCount(b.id)}` });
    const refresh = () => (count.textContent = `×${boosterCount(b.id)}`);
    return h('div', { class: 'shop-row' }, [
      h('span', { class: 'shop-icon', html: boosterIcon(b.id) }),
      h('span', { class: 'shop-info' }, [h('b', { text: t(boosterName(b.id)) }), h('small', { text: t(boosterDesc(b.id)) })]),
      count,
      h('span', { class: 'shop-btns' }, [
        btn(
          String(b.price),
          () => {
            if (!spendCoins(b.price)) {
              toast(t('shop.noCoins'), 'bad');
              audio.play('invalid');
              return;
            }
            addBooster(b.id, 1);
            audio.play('coin');
            toast(t('shop.bought', { name: t(boosterName(b.id)) }), 'good');
            refresh();
          },
          { variant: 'gold', small: true, icon: ICONS.coin },
        ),
        btn(
          `+${b.adAmount}`,
          async () => {
            if (await watchAd(`shop_${b.id}`)) {
              addBooster(b.id, b.adAmount);
              audio.play('booster');
              toast(t('booster.got', { name: t(boosterName(b.id)) }), 'good');
              refresh();
            }
          },
          { variant: 'green', small: true, ad: true },
        ),
      ]),
    ]);
  });
  openModal(
    [
      h('div', { class: 'shop-top' }, [
        coinChip(),
        btn(
          t('shop.freeCoins', { n: CONFIG.economy.freeCoinsAd }),
          async () => {
            if (await watchAd('shop_coins')) {
              addCoins(CONFIG.economy.freeCoinsAd);
              audio.play('coin');
            }
          },
          { variant: 'green', small: true, ad: true },
        ),
      ]),
      h('div', { class: 'shop-list scroll-y' }, rows),
    ],
    { title: t('shop.title'), closable: true, class: 'shop-modal' },
  );
}
