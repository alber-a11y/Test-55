import Phaser from 'phaser';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { ensureBgThumb, ensureIcons, ensureSkin, iconKey, panelTexture, tileKey, trayTexture } from '../art/textures';
import { bus, econ } from '../core/economy';
import { t, tItem, type TKey } from '../core/i18n';
import { BOOSTERS, type BoosterId } from '../core/save';
import { BOOSTER_ICON, BOOSTER_PRICE, ITEMS, PACK_SIZE, packPrice, type ItemKind, type ShopItem } from '../data/catalog';
import { BTN, THEMES } from '../data/themes';
import { AD_CONFIG } from '../platform/ads.config';
import { ads } from '../platform/ads';
import { Button } from '../ui/Button';
import { openDaily } from '../ui/DailyPopup';
import { Popup } from '../ui/Popup';
import { ScrollView } from '../ui/ScrollView';
import { label, plain } from '../ui/text';
import { CoinCounter, flyCoins, toast } from '../ui/widgets';
import { BaseScene } from './BaseScene';

type Tab = 'bg' | 'skin' | 'icons' | 'theme' | 'boosters' | 'coins';
const TABS: Array<[Tab, string, TKey]> = [
  ['bg', 'ui_map', 'tabBg'],
  ['skin', 'ui_star', 'tabSkins'],
  ['icons', 'ui_gift', 'tabIcons'],
  ['theme', 'ui_gear', 'tabThemes'],
  ['boosters', 'ui_magnet', 'tabBoosters'],
  ['coins', 'ui_coin', 'tabCoins'],
];

export class ShopScene extends BaseScene {
  private tab: Tab = 'bg';
  private view!: ScrollView;
  private coins!: CoinCounter;
  private tabBtns: Partial<Record<Tab, Button>> = {};

  constructor() {
    super('Shop');
  }

  create(): void {
    this.setup();
    music.play('menu');
    this.addBackground();
    this.tab = (this.sceneData.tab as Tab) ?? 'bg';
    this.tabBtns = {};
    const th = this.theme;
    const { colX, cx } = this;
    new Button(this, colX + 90, 96, { w: 120, h: 120, colors: th.primary, icon: 'ui_back', iconSize: 66, onClick: () => this.back() });
    label(this, cx - 60, 96, t('shop'), 72, { stroke: th.title.stroke });
    this.coins = new CoinCounter(this, colX + 1080 - 190, 96, () => this.selectTab('coins'));

    TABS.forEach(([id, icon, key], i) => {
      const b = new Button(this, colX + 95 + i * 178, 262, { w: 166, h: 150, colors: id === this.tab ? BTN.gold : th.primary, icon, iconSize: 78, onClick: () => this.selectTab(id) });
      b.icon!.setY(-26);
      const l = label(this, 0, 42, t(key), 28, { stroke: (id === this.tab ? BTN.gold : th.primary)[2] });
      if (l.width > 150) l.setScale(150 / l.width);
      b.add(l);
      this.tabBtns[id] = b;
    });
    this.view = new ScrollView(this, cx, 360, 1080, this.H - 380);
    const onEquip = (kind: string) => {
      if (kind === 'theme') this.scene.restart({ ...this.sceneData, tab: this.tab });
      else if (kind === 'bg') {
        this.children.list.filter((o) => (o as unknown as { depth: number }).depth <= -99).forEach((o) => o.destroy());
        this.addBackground();
      }
    };
    bus.on('equip', onEquip);
    this.events.once('shutdown', () => bus.off('equip', onEquip));
    this.buildTab();
  }

  private selectTab(id: Tab): void {
    if (id === this.tab) return;
    this.sceneData.tab = id;
    this.tab = id;
    const th = this.theme;
    for (const [tid] of TABS) {
      const c = tid === id ? BTN.gold : th.primary;
      this.tabBtns[tid]?.setColors(c);
      (this.tabBtns[tid]?.list[this.tabBtns[tid]!.list.length - 1] as Phaser.GameObjects.Text)?.setStroke(c[2], 5);
    }
    this.buildTab();
  }

  private buildTab(): void {
    this.view.content.removeAll(true);
    this.view.scrollTo(0);
    if (this.tab === 'boosters') return this.buildBoosters();
    if (this.tab === 'coins') return this.buildCoins();
    const items = ITEMS.filter((i) => i.kind === (this.tab as ItemKind));
    const cw = 500;
    const ch = 600;
    items.forEach((it, i) => {
      const x = (i % 2 === 0 ? -1 : 1) * (cw / 2 + 14);
      const y = Math.floor(i / 2) * (ch + 30) + ch / 2 + 20;
      this.view.content.add(this.card(it, x, y, cw, ch));
    });
    this.view.setContentHeight(Math.ceil(items.length / 2) * (ch + 30) + 60);
  }

  private card(it: ShopItem, x: number, y: number, w: number, h: number): Phaser.GameObjects.Container {
    const th = this.theme;
    const c = this.add.container(x, y);
    const owned = econ.owns(it.id);
    const equipped = econ.equipped(it.kind) === it.id;
    c.add(this.add.image(0, 0, panelTexture(this.textures, w, h, th.panel.top, th.panel.bottom, equipped ? '#3db82f' : th.panel.border, 40, 8)));
    const prev = this.add.container(0, -90);
    c.add(prev);
    void this.preview(it, prev);
    c.add(plain(this, 0, 110, tItem(it.id), 40, th.panel.text, { weight: '900' }));
    if (it.ads && !owned) {
      const rib = label(this, 0, -h / 2 + 30, t('exclusive'), 30, { stroke: '#8a1a6a' });
      const bg = this.add.image(0, -h / 2 + 30, panelTexture(this.textures, Math.round(rib.width + 60), 56, '#ff7ad8', '#c03aa8', '#ffffff', 28, 4));
      c.add([bg, rib]);
    }
    let btn: Button;
    const by = h / 2 - 95;
    if (equipped) {
      btn = new Button(this, 0, by, { w: 400, h: 120, colors: BTN.green, icon: 'ui_check', text: t('selected'), fontSize: 44, onClick: () => undefined, guard: this.view.guard, silent: true });
      btn.disableInteractive();
    } else if (owned) {
      btn = new Button(this, 0, by, { w: 400, h: 120, colors: th.primary, text: t('select'), fontSize: 48, guard: this.view.guard, onClick: () => this.equip(it) });
    } else if (it.ads) {
      const need = it.ads ?? AD_CONFIG.uniqueItemViews;
      btn = new Button(this, 0, by, { w: 400, h: 120, colors: BTN.gold, icon: 'ui_ad', text: t('adViews', { a: econ.adProgress(it.id), b: need }), fontSize: 50, guard: this.view.guard, onClick: () => this.watchFor(it) });
      btn.pulse();
    } else {
      btn = new Button(this, 0, by, { w: 400, h: 120, colors: econ.coins >= it.price ? BTN.green : BTN.gray, icon: 'ui_coin', text: String(it.price), fontSize: 50, guard: this.view.guard, onClick: () => this.buy(it) });
    }
    c.add(btn);
    return c;
  }

  private async preview(it: ShopItem, c: Phaser.GameObjects.Container): Promise<void> {
    const tm = this.textures;
    const eq = { set: econ.equipped('icons'), skin: econ.equipped('skin') };
    if (it.kind === 'bg') {
      const key = await ensureBgThumb(tm, it.id);
      if (!c.scene) return;
      c.add(this.add.image(0, 0, key));
      c.add(this.add.rectangle(0, 0, 420, 320).setStrokeStyle(8, 0xffffff));
      return;
    }
    if (it.kind === 'skin') {
      await Promise.all([ensureSkin(tm, it.id), ensureIcons(tm, eq.set, [0, 3, 6])]);
      if (!c.scene) return;
      [0, 3, 6].forEach((ic, i) => {
        const tc = this.add.container((i - 1) * 140, i === 1 ? -30 : 10);
        tc.add(this.add.image(0, 0, tileKey(it.id)));
        tc.add(this.add.image(0, -7, iconKey(eq.set, ic)).setDisplaySize(118, 118));
        tc.setScale(0.85).setAngle((i - 1) * 8);
        c.add(tc);
      });
      return;
    }
    if (it.kind === 'icons') {
      const ids = [0, 1, 2, 3, 4, 5];
      await Promise.all([ensureIcons(tm, it.id, ids), ensureSkin(tm, eq.skin)]);
      if (!c.scene) return;
      ids.forEach((ic, i) => {
        const tc = this.add.container(((i % 3) - 1) * 128, Math.floor(i / 3) * 140 - 70);
        tc.add(this.add.image(0, 0, tileKey(eq.skin)));
        tc.add(this.add.image(0, -7, iconKey(it.id, ic)).setDisplaySize(118, 118));
        tc.setScale(0.78);
        c.add(tc);
      });
      return;
    }
    if (it.kind === 'theme') {
      const th = THEMES[it.id];
      c.add(this.add.image(0, -40, trayTexture(tm, 420, 110, 4, 96, th.tray)).setScale(1));
      c.add(new Button(this, -100, 90, { w: 170, h: 100, colors: th.primary, icon: 'ui_play', iconSize: 56, onClick: () => undefined }).setScale(0.9).disableInteractive());
      c.add(this.add.image(100, 92, panelTexture(tm, 180, 100, th.panel.top, th.panel.bottom, th.panel.border, 26, 6)));
    }
  }

  private equip(it: ShopItem): void {
    econ.equip(it.id);
    sfx('unlock');
    if (it.kind !== 'theme') this.buildTab();
  }

  private buy(it: ShopItem): void {
    if (!econ.spend(it.price)) {
      sfx('error');
      this.notEnough();
      return;
    }
    sfx('buy');
    econ.grant(it.id);
    toast(this, t('unlocked'));
    this.equip(it);
  }

  private async watchFor(it: ShopItem): Promise<void> {
    const ok = await ads.rewarded('shop_' + it.id);
    if (!ok) return toast(this, t('adFailed'));
    const unlocked = econ.addAdProgress(it.id);
    if (unlocked) {
      toast(this, t('unlocked'));
      this.equip(it);
    } else {
      sfx('coin');
      this.buildTab();
    }
  }

  private notEnough(): void {
    const th = this.theme;
    const p = new Popup(this, { w: 820, h: 620, title: t('notEnough'), theme: th, closable: true, backdropCloses: true });
    p.content.add(this.add.image(0, -120, 'ui_coin').setDisplaySize(170, 170));
    p.content.add(plain(this, 0, 30, t('notEnoughText', { n: AD_CONFIG.freeCoinsAmount }), 44, th.panel.text, { wrap: 680 }));
    const b = new Button(this, 0, 180, { w: 480, h: 140, colors: BTN.gold, icon: 'ui_ad', text: t('getCoins'), fontSize: 54, onClick: async () => {
      if (econ.freeCoinsLeft() <= 0) return toast(this, t('freeCoinsDone'));
      if (!(await ads.rewarded('coins_not_enough'))) return toast(this, t('adFailed'));
      p.close(() => this.grantFreeCoins());
    } });
    b.pulse();
    p.content.add(b);
  }

  private grantFreeCoins(): void {
    const amount = econ.takeFreeCoins();
    flyCoins(this, { x: this.cx, y: this.H / 2 }, this.coins.iconPos(), amount, () => this.buildTab());
  }

  private buildBoosters(): void {
    const th = this.theme;
    const names: Record<BoosterId, [TKey, TKey]> = {
      undo: ['boosterUndo', 'boosterUndoDesc'],
      magnet: ['boosterMagnet', 'boosterMagnetDesc'],
      shuffle: ['boosterShuffle', 'boosterShuffleDesc'],
      slot: ['boosterSlot', 'boosterSlotDesc'],
    };
    const rowH = 420;
    BOOSTERS.forEach((id, i) => {
      const c = this.add.container(0, i * (rowH + 24) + rowH / 2 + 20);
      c.add(this.add.image(0, 0, panelTexture(this.textures, 1030, rowH, th.panel.top, th.panel.bottom, th.panel.border, 40, 8)));
      c.add(this.add.image(-390, -60, BOOSTER_ICON[id]).setDisplaySize(170, 170));
      const cnt = label(this, -390, 50, `×${econ.boosters(id)}`, 48, { stroke: th.primary[2] });
      c.add(cnt);
      c.add(plain(this, -270, -90, t(names[id][0]), 52, th.panel.text, { originX: 0, weight: '900' }));
      c.add(plain(this, -270, -20, t(names[id][1]), 36, th.panel.sub, { originX: 0, wrap: 700 }));
      const price = BOOSTER_PRICE[id];
      const buy = (n: number, cost: number) => {
        if (!econ.spend(cost)) {
          sfx('error');
          return this.notEnough();
        }
        sfx('buy');
        econ.addBooster(id, n);
        cnt.setText(`×${econ.boosters(id)}`);
        this.tweens.add({ targets: cnt, scale: 1.3, yoyo: true, duration: 150 });
      };
      c.add(new Button(this, -310, 130, { w: 300, h: 120, colors: BTN.green, icon: 'ui_coin', text: `${price}`, fontSize: 46, guard: this.view.guard, onClick: () => buy(1, price) }));
      const pack = new Button(this, 10, 130, { w: 300, h: 120, colors: BTN.purple, icon: 'ui_coin', text: `${packPrice(id)}`, fontSize: 46, guard: this.view.guard, onClick: () => buy(PACK_SIZE, packPrice(id)) });
      pack.add(label(this, 0, -76, t('pack5'), 30, { stroke: '#4a2a8a' }));
      c.add(pack);
      const ad = new Button(this, 330, 130, { w: 300, h: 120, colors: BTN.gold, icon: 'ui_ad', text: '+1', fontSize: 50, guard: this.view.guard, onClick: async () => {
        if (!(await ads.rewarded('shop_booster_' + id))) return toast(this, t('adFailed'));
        econ.addBooster(id, 1);
        sfx('unlock');
        cnt.setText(`×${econ.boosters(id)}`);
      } });
      c.add(ad);
      this.view.content.add(c);
    });
    this.view.setContentHeight(BOOSTERS.length * (rowH + 24) + 60);
  }

  private buildCoins(): void {
    const th = this.theme;
    const mk = (y: number, icon: string, title: string, sub: string, btn: Button) => {
      const c = this.add.container(0, y);
      c.add(this.add.image(0, 0, panelTexture(this.textures, 1030, 380, th.panel.top, th.panel.bottom, th.panel.border, 40, 8)));
      c.add(this.add.image(-370, -20, icon).setDisplaySize(200, 200));
      c.add(plain(this, -230, -80, title, 54, th.panel.text, { originX: 0, weight: '900' }));
      c.add(plain(this, -230, -10, sub, 38, th.panel.sub, { originX: 0, wrap: 680 }));
      btn.setPosition(150, 110);
      c.add(btn);
      this.view.content.add(c);
    };
    const left = econ.freeCoinsLeft();
    const freeBtn = new Button(this, 0, 0, { w: 460, h: 130, colors: left > 0 ? BTN.gold : BTN.gray, icon: 'ui_ad', text: `+${AD_CONFIG.freeCoinsAmount}`, fontSize: 54, guard: this.view.guard, onClick: async () => {
      if (econ.freeCoinsLeft() <= 0) return toast(this, t('freeCoinsDone'));
      if (!(await ads.rewarded('free_coins'))) return toast(this, t('adFailed'));
      this.grantFreeCoins();
    } });
    if (left > 0) freeBtn.pulse();
    mk(210, 'ui_coin', t('freeCoins'), left > 0 ? t('freeCoinsLeft', { n: left }) : t('freeCoinsDone'), freeBtn);
    const dailyBtn = new Button(this, 0, 0, { w: 460, h: 130, colors: econ.dailyAvailable() ? BTN.green : th.primary, icon: 'ui_gift', text: t('gift'), fontSize: 50, guard: this.view.guard, onClick: () => openDaily(this, this.coins) });
    mk(620, 'ui_gift', t('daily'), econ.dailyAvailable() ? '' : t('dailyClaimed'), dailyBtn);
    this.view.setContentHeight(860);
  }
}
