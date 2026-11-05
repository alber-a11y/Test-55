import { audio } from '../audio/audio';
import { cardBack } from '../art/cards';
import { frameSvg, heroPortrait } from '../art/heroes';
import { BOOSTER_ICON, icon } from '../art/icons';
import { bonusThumb, itemThumb, roomPreview } from '../art/rooms';
import { formatTime, t, tr } from '../core/i18n';
import { save } from '../core/save';
import { boosterDef } from '../meta/boosters';
import { adProgress, boosterCount, cooldownLeft, isRoomUnlocked, itemOwned } from '../meta/economy';
import { heroById } from '../meta/heroes';
import { roomById } from '../meta/rooms';
import { SHOP, type ShopItem, type ShopTab } from '../meta/shop';
import { h, svgEl } from '../ui/dom';
import { buyCoins, chestModal, livesModal, rulesModal, settingsModal, watchFor } from '../ui/dialogs';
import { hud } from '../ui/hud';
import { go, register, type Screen } from '../ui/router';
import { button, iconEl, priceButton, toast } from '../ui/widgets';
import { roomState } from './common';

const TABS: { id: ShopTab; key: string; icon: Parameters<typeof iconEl>[0] }[] = [
  { id: 'boosters', key: 'boostersTab', icon: 'wand' },
  { id: 'decor', key: 'decorTab', icon: 'brush' },
  { id: 'skins', key: 'skinsTab', icon: 'sparkle' },
  { id: 'extras', key: 'extrasTab', icon: 'coin' },
];

function itemVisual(item: ShopItem): HTMLElement {
  const g = item.grant;
  switch (g.kind) {
    case 'booster':
      return h('div', { class: 'si-vis booster-ball' }, iconEl(BOOSTER_ICON[g.id]), h('div', { class: 'si-count', text: `×${g.count}` }));
    case 'boosterPack':
      return h('div', { class: 'si-vis si-pack' }, ...Object.keys(g.items).slice(0, 4).map((id) => iconEl(BOOSTER_ICON[id])));
    case 'coins':
      return h('div', { class: 'si-vis si-big' }, svgEl(icon('coin')), h('div', { class: 'si-count', text: `+${g.amount}` }));
    case 'livesRefill':
      return h('div', { class: 'si-vis si-big' }, svgEl(icon('heart')));
    case 'infiniteLives':
      return h('div', { class: 'si-vis si-big' }, svgEl(icon('heart')), h('div', { class: 'si-count', text: '∞' }));
    case 'cardBack':
      return h('div', { class: 'si-vis si-back', html: cardBack(g.id) });
    case 'frame':
      return h('div', { class: 'si-vis si-frame' }, h('div', { class: 'svgwrap', html: heroPortrait(heroById(save.data.hero)) }), h('div', { class: 'svgwrap si-frame-ring', html: frameSvg(g.id) }));
    case 'premiumVariant':
      return h('div', { class: 'si-vis si-thumb', html: itemThumb(g.room, g.task, 3) });
    case 'bonusDecor':
      return h('div', { class: 'si-vis si-thumb', html: bonusThumb(g.room, g.item) });
  }
}

register('shop', (p: { tab?: ShopTab }): Screen => {
  let tab: ShopTab = p.tab ?? 'boosters';
  const el = h('div', { class: 'scr-shop' });
  const room = roomById(save.data.room);
  el.append(h('div', { class: 'bg-room blur', html: roomPreview(room.id, roomState(room)) }));
  el.append(hud({ lives: livesModal, coins: () => ((tab = 'extras'), render()), chest: () => chestModal(), info: rulesModal, settings: () => settingsModal() }));
  const tabsEl = h('div', { class: 'shop-tabs' });
  const grid = h('div', { class: 'shop-grid' });
  const panelEl = h('div', { class: 'panel shop-panel' }, tabsEl, grid);
  el.append(h('div', { class: 'shop-head' }, h('div', { class: 'ribbon' }, h('span', { text: t('shop') }))), panelEl, button(t('home'), { variant: 'cream', icon: 'house', cls: 'shop-home', onClick: () => void go('home', {}, 'to_home') }));

  const card = (item: ShopItem): HTMLElement => {
    const owned = item.once && itemOwned(item);
    const cd = cooldownLeft(item.id);
    const g = item.grant;
    let sub = '';
    if (g.kind === 'booster') sub = `${tr(boosterDef(g.id).desc)} · ${t('owned')}: ${boosterCount(g.id)}`;
    if (g.kind === 'premiumVariant' || g.kind === 'bonusDecor') sub = tr(roomById(g.room).name);
    let action: HTMLElement;
    if (owned && (g.kind === 'cardBack' || g.kind === 'frame')) {
      const using = g.kind === 'cardBack' ? save.data.cardBack === g.id : save.data.frame === g.id;
      action = button(using ? t('inUse') : t('use'), {
        small: true,
        variant: using ? 'cream' : 'green',
        disabled: using,
        onClick: () => {
          if (g.kind === 'cardBack') save.data.cardBack = g.id;
          else save.data.frame = g.id;
          save.commit();
          render();
        },
      });
    } else if (owned) {
      action = h('div', { class: 'si-owned' }, iconEl('check'), h('span', { text: g.kind === 'bonusDecor' ? t('placed') : t('owned') }));
    } else if (cd > 0) {
      action = h('div', { class: 'si-cd' }, iconEl('clock'), h('span', { text: formatTime(cd) }));
    } else {
      action = priceButton(item.price, adProgress(item.id), async () => {
        if ((g.kind === 'premiumVariant' || g.kind === 'bonusDecor') && !isRoomUnlocked(roomById(g.room))) return toast(t('locked'));
        if ('coins' in item.price) buyCoins(item);
        else await watchFor(item, `shop_${item.tab}`);
        render();
      });
    }
    return h(
      'div',
      { class: `shop-item ${owned ? 'owned' : ''}` },
      item.badge ? h('div', { class: `si-badge si-${item.badge}`, text: item.badge === 'hit' ? 'HIT' : item.badge === 'best' ? 'BEST' : 'NEW' }) : null,
      itemVisual(item),
      h('div', { class: 'si-name', text: tr(item.name) }),
      sub ? h('div', { class: 'si-sub', text: sub }) : null,
      action,
    );
  };

  const section = (title: string, items: ShopItem[]) => {
    if (!items.length) return;
    grid.append(h('div', { class: 'shop-section', text: title }));
    items.forEach((i) => grid.append(card(i)));
  };

  function render(): void {
    tabsEl.replaceChildren(
      ...TABS.map((tb) =>
        h('button', { class: `shop-tab ${tb.id === tab ? 'on' : ''}`, onclick: () => (audio.play('click'), (tab = tb.id), render()) }, iconEl(tb.icon), h('span', { text: t(tb.key) })),
      ),
    );
    grid.replaceChildren();
    const items = SHOP.filter((s) => s.tab === tab);
    if (tab === 'skins') {
      section(t('cardBacks'), items.filter((i) => i.grant.kind === 'cardBack'));
      section(t('frames'), items.filter((i) => i.grant.kind === 'frame'));
    } else if (tab === 'decor') {
      section(t('bonusDecor'), items.filter((i) => i.grant.kind === 'bonusDecor'));
      section(t('premiumDecor'), items.filter((i) => i.grant.kind === 'premiumVariant'));
    } else items.forEach((i) => grid.append(card(i)));
  }
  render();
  const iv = window.setInterval(() => {
    if (!el.isConnected) return clearInterval(iv);
    if (grid.querySelector('.si-cd')) render();
  }, 1000);
  return { el, music: 'home', destroy: () => clearInterval(iv) };
});
