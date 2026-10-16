import { audio } from '../audio/audio';
import { econ } from '../core/economy';
import { t } from '../core/i18n';
import { save } from '../core/save';
import { HEROES } from '../data/heroes';
import { COIN_AD_COOLDOWN_MS, COIN_AD_REWARD, SKINS, type SkinDef } from '../data/shop';
import type { HeroDef } from '../data/types';
import { ads } from '../platform/AdManager';
import { background, Button, CoinPill, formatTime, toast, txt, type ColorName } from '../ui/widgets';
import { BaseScene } from './BaseScene';

type Tab = 'heroes' | 'skins' | 'free';
const TABS: Tab[] = ['free', 'heroes', 'skins'];

interface CardBtn {
  label: string;
  color: ColorName;
  icon?: string;
  enabled?: boolean;
  onClick?: () => void | Promise<void>;
}

export class ShopScene extends BaseScene {
  private coins!: CoinPill;

  constructor() {
    super('Shop');
  }

  create(): void {
    this.rebuildOnResize();
    audio.playMusic('menu');
    const W = this.W;
    background(this, 0x8c4bff, 0x2a0f6b);
    this.coins = new CoinPill(this, W - 110, 46, save.data.coins);
    txt(this, 160, 50, t('shop'), 48, '#ffd60a');
    const tab: Tab = this.sceneData.tab ?? 'free';
    const page: number = this.sceneData.page ?? 0;

    const tw = Math.min(190, (W - 330 - 230) / TABS.length - 10);
    TABS.forEach((tb, i) => {
      new Button(this, 320 + tw / 2 + i * (tw + 10), 50, { w: tw, h: 58, color: tb === tab ? 'yellow' : 'dark', label: t(`tab_${tb}`), size: 22 }).onClick(() => {
        this.sceneData.tab = tb;
        this.sceneData.page = 0;
        this.scene.restart(this.sceneData);
      });
    });

    const items = this.items(tab);
    const cols = Math.max(3, Math.min(5, Math.floor((W - 80) / 240)));
    const perPage = cols * 2;
    const pages = Math.max(1, Math.ceil(items.length / perPage));
    const cw = Math.min(230, (W - 80 - (cols - 1) * 16) / cols);
    const ch = 232;
    const x0 = W / 2 - ((cols - 1) * (cw + 16)) / 2;
    items.slice(page * perPage, page * perPage + perPage).forEach((it, i) => {
      const x = x0 + (i % cols) * (cw + 16);
      const y = 116 + ch / 2 + Math.floor(i / cols) * (ch + 14);
      it(x, y, cw, ch);
    });

    if (pages > 1) {
      const prev = new Button(this, W / 2 - 90, 662, { w: 70, h: 60, color: 'blue', icon: 'i_arrow', iconSize: 34 }).onClick(() => {
        this.sceneData.page = Math.max(0, page - 1);
        this.scene.restart(this.sceneData);
      });
      prev.icon!.setFlipX(true);
      prev.setEnabled(page > 0);
      txt(this, W / 2, 662, `${page + 1}/${pages}`, 24);
      new Button(this, W / 2 + 90, 662, { w: 70, h: 60, color: 'blue', icon: 'i_arrow', iconSize: 34 })
        .onClick(() => {
          this.sceneData.page = Math.min(pages - 1, page + 1);
          this.scene.restart(this.sceneData);
        })
        .setEnabled(page < pages - 1);
    }
    new Button(this, 130, 662, { w: 200, h: 66, color: 'red', label: t('back'), size: 26 }).onClick(() => this.scene.start('Menu'));

    // Live cooldown refresh on the free tab.
    if (tab === 'free') {
      const now = Date.now();
      const cooling = save.data.lastCoinAd + COIN_AD_COOLDOWN_MS > now;
      if (cooling) this.time.addEvent({ delay: 1000, loop: true, callback: () => !ads.isBusy && this.scene.restart(this.sceneData) });
    }
  }

  private card(x: number, y: number, w: number, h: number, img: string, imgScale: number, title: string, sub: string, btn: CardBtn, tint = 0x23306b): void {
    const g = this.add.graphics();
    g.fillStyle(0x1b1530, 1).fillRoundedRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, 18);
    g.fillStyle(tint, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    g.fillStyle(0xffffff, 0.07).fillRoundedRect(x - w / 2 + 6, y - h / 2 + 6, w - 12, h * 0.48, 12);
    const im = this.add.image(x, y - 34, img);
    im.setScale(imgScale);
    if (im.displayHeight > h * 0.46) im.setScale((imgScale * h * 0.46) / im.displayHeight);
    txt(this, x, y + 28, title, 20, '#ffffff', { wordWrap: { width: w - 12 } });
    if (sub) txt(this, x, y + 52, sub, 14, '#bde0fe', { wordWrap: { width: w - 12 } });
    const b = new Button(this, x, y + h / 2 - 30, { w: w - 24, h: 46, color: btn.color, label: btn.label, size: 20, icon: btn.icon, iconSize: 32 });
    b.setEnabled(btn.enabled ?? true);
    if (btn.onClick) {
      b.onClick(async () => {
        b.setEnabled(false);
        await btn.onClick!();
        this.coins.set(save.data.coins);
        if (this.scene.isActive()) this.scene.restart(this.sceneData);
      });
    }
  }

  private items(tab: Tab): ((x: number, y: number, w: number, h: number) => void)[] {
    switch (tab) {
      case 'heroes':
        return HEROES.filter((h) => h.unlock.type !== 'start').map((h) => (x, y, w, hh) => this.heroItem(h, x, y, w, hh));
      case 'skins':
        return SKINS.filter((s) => s.price.type !== 'free').map((s) => (x, y, w, hh) => this.skinItem(s, x, y, w, hh));
      case 'free':
      default:
        return [
          (x, y, w, hh) => {
            const left = save.data.lastCoinAd + COIN_AD_COOLDOWN_MS - Date.now();
            this.card(x, y, w, hh, 'i_coin', 1.6, t('coinsForAd', { n: COIN_AD_REWARD }), '', {
              label: left > 0 ? t('cooldown', { t: formatTime(left) }) : t('getFree'),
              color: 'purple',
              icon: left > 0 ? undefined : 'i_ad',
              enabled: left <= 0,
              onClick: async () => {
                const ok = await ads.rewarded();
                if (ok) {
                  econ.add(COIN_AD_REWARD);
                  save.data.lastCoinAd = Date.now();
                  save.save();
                  audio.play('buy');
                  toast(this, t('coinsGot', { n: COIN_AD_REWARD }), '#ffe066');
                } else toast(this, t('adNoReward'), '#ff8fa3');
              },
            }, 0x4a2a8c);
          },
          ...HEROES.filter((h) => h.unlock.type === 'ads' && !econ.ownsHero(h.id)).map((h) => (x: number, y: number, w: number, hh: number) => this.heroItem(h, x, y, w, hh)),
        ];
    }
  }

  private heroItem(h: HeroDef, x: number, y: number, w: number, hh: number): void {
    const owned = econ.ownsHero(h.id);
    const u = h.unlock;
    const title = t(`hero_${h.id}`);
    const sub = t(`role_${h.role}`);
    if (owned) return this.card(x, y, w, hh, `heroBig_${h.id}_0`, 0.4, title, sub, { label: t('owned'), color: 'grey', enabled: false });
    if (u.type === 'coins')
      return this.card(x, y, w, hh, `heroBig_${h.id}_0`, 0.4, title, sub, {
        label: `${u.price}`, color: 'orange', icon: 'i_coin',
        onClick: () => {
          if (econ.buyHero(h.id)) {
            audio.play('unlock');
            toast(this, `${t('newHero')} ${title}`, '#80ed99');
          } else toast(this, t('notEnough'), '#ff8fa3');
        },
      });
    if (u.type === 'ads') {
      const key = `hero:${h.id}`;
      return this.card(x, y, w, hh, `heroBig_${h.id}_0`, 0.4, title, sub, {
        label: t('watchAd', { n: econ.adProgress(key), m: u.count }), color: 'purple', icon: 'i_ad',
        onClick: async () => {
          const r = await econ.watchFor(key, u.count);
          if (r === 'done') {
            econ.grantHero(h.id);
            audio.play('unlock');
            toast(this, `${t('newHero')} ${title}`, '#80ed99');
          } else if (r === 'fail') toast(this, t('adNoReward'), '#ff8fa3');
        },
      }, 0x4a2a8c);
    }
    if (u.type === 'level') return this.card(x, y, w, hh, `heroBig_${h.id}_0`, 0.4, title, sub, { label: t('unlockAtLevel', { n: u.level }), color: 'grey', enabled: false });
  }

  private skinItem(s: SkinDef, x: number, y: number, w: number, hh: number): void {
    const owned = econ.ownsSkin(s.id);
    const equipped = save.data.heroes[s.hero].skin === s.id;
    const heroOwned = econ.ownsHero(s.hero);
    const title = t(s.nameKey);
    const sub = t(`hero_${s.hero}`);
    const img = `heroBig_${s.id}`;
    if (owned) {
      return this.card(x, y, w, hh, img, 0.4, title, sub, {
        label: equipped ? t('equipped') : t('equip'), color: equipped ? 'grey' : 'green', enabled: !equipped && heroOwned,
        onClick: () => econ.equipSkin(s.id),
      });
    }
    if (s.price.type === 'coins') {
      const price = s.price.price;
      return this.card(x, y, w, hh, img, 0.4, title, sub, {
        label: `${price}`, color: 'orange', icon: 'i_coin',
        onClick: () => {
          if (econ.buySkin(s.id)) {
            audio.play('unlock');
            if (heroOwned) econ.equipSkin(s.id);
          } else toast(this, t('notEnough'), '#ff8fa3');
        },
      });
    }
    if (s.price.type === 'ads') {
      const key = `skin:${s.id}`;
      const need = s.price.count;
      return this.card(x, y, w, hh, img, 0.4, title, sub, {
        label: t('watchAd', { n: econ.adProgress(key), m: need }), color: 'purple', icon: 'i_ad',
        onClick: async () => {
          const r = await econ.watchFor(key, need);
          if (r === 'done') {
            econ.grantSkin(s.id);
            if (heroOwned) econ.equipSkin(s.id);
            audio.play('unlock');
            toast(this, t('unlocked'), '#80ed99');
          } else if (r === 'fail') toast(this, t('adNoReward'), '#ff8fa3');
        },
      }, 0x4a2a8c);
    }
  }
}
