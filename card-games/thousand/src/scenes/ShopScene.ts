import Phaser from 'phaser';
import { audio } from '@shared/audio/audio';
import { renderBack } from '@shared/cards/backs';
import { faceStyle, renderFace } from '@shared/cards/faces';
import { renderTable } from '@shared/cards/tables';
import { getLang, t } from '@shared/core/i18n';
import { formatTime } from '@shared/core/time';
import { BaseScene } from '@shared/ui/base';
import { Scroller } from '@shared/ui/scroller';
import { Button, Pill, toast, txt, UI } from '@shared/ui/widgets';
import { backStyle, BOOSTERS, SKINS, skinKey, tableStyle, type SkinItem, type SkinKind } from '../data/meta';
import { WORLDS } from '../data/route';
import { renderCarriage } from '../art/carriage';
import { faceTex, PLAYER_FACES } from '../art/avatars';
import type { Emotion } from '../art/faces';
import { addBooster, addCoins, adProgress, equip, isEquipped, owns, spendCoins, unlockSkin } from '../progress';
import { save } from '../save';
import { skin } from '../skin';
import { menuBackground } from '../ui/bg';
import { coinBurst, topBar, watchAd } from '../ui/common';

type Tab = 'back' | 'face' | 'table' | 'emote' | 'boosters' | 'coins';
const TABS: Tab[] = ['back', 'face', 'table', 'emote', 'boosters', 'coins'];
const TAB_LABEL: Record<Tab, string> = { back: 'tab_backs', face: 'tab_faces', table: 'tab_tables', emote: 'tab_emotes', boosters: 'tab_boosters', coins: 'tab_coins' };
const FREE_COINS = 150;
const FREE_COINS_CD = 180_000;

export class ShopScene extends BaseScene {
  private pill: Pill | null = null;
  private tab: Tab = 'back';

  constructor() {
    super('Shop');
  }

  create(data: { tab?: Tab; from?: string; scroll?: number; back?: unknown }): void {
    this.tab = data.tab ?? 'back';
    menuBackground(this);
    // Opened from a paused game: `back` holds that game's data so it resumes where it was (no ad on the way back).
    this.pill = topBar(this, t('shop'), () => this.go(data.from ?? 'Menu', data.back ?? {}, data.back ? undefined : 'shop_back'));
    const W = this.W;
    // Tabs
    const tw = Math.min(200, (W - 40) / TABS.length - 10);
    TABS.forEach((tb, i) => {
      const x = W / 2 + (i - (TABS.length - 1) / 2) * (tw + 10);
      new Button(this, x, 220, { w: tw, h: 90, color: tb === this.tab ? 'gold' : 'dark', label: t(TAB_LABEL[tb]), size: 28 }).onClick(() => {
        if (tb !== this.tab) this.scene.restart({ ...data, tab: tb, scroll: 0 });
      });
    });
    const top = 290;
    const sc = new Scroller(this, 0, top, W, this.H - top);
    if (this.tab === 'boosters') this.buildBoosters(sc);
    else if (this.tab === 'coins') this.buildCoins(sc);
    else this.buildSkins(sc, this.tab);
    if (data.scroll) sc.setPos(data.scroll);
    this.events.once('shutdown', () => (data.scroll = sc.position));
    this.sceneData = data;
    this.setupScene();
  }

  private preview(s: SkinItem): string {
    const key = `prev_${s.kind}_${s.id}`;
    if (!this.textures.exists(key)) {
      if (s.kind === 'back') this.textures.addCanvas(key, renderBack(backStyle(s.id)));
      else if (s.kind === 'face') this.textures.addCanvas(key, renderFace(faceStyle(s.id), 1, 13));
      else if (s.kind === 'table') {
        const ts = tableStyle(s.id);
        this.textures.addCanvas(key, ts ? renderTable(ts, 300, 220) : renderCarriage(WORLDS[0], 300, 220));
      } else if (!s.id.startsWith('say_')) return faceTex(this.textures, `me${save.data.avatar}`, PLAYER_FACES[save.data.avatar % PLAYER_FACES.length], s.id as Emotion);
      else return 'i_heart';
    }
    return key;
  }

  private buildSkins(sc: Scroller, kind: SkinKind): void {
    const W = this.W;
    const items = SKINS.filter((s) => s.kind === kind);
    const cols = this.portrait ? 3 : 5;
    const tw = Math.min(320, (W - 60) / cols - 20);
    const th = kind === 'table' || kind === 'emote' ? tw * 1.05 : tw * 1.55;
    items.forEach((s, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = W / 2 + (col - (cols - 1) / 2) * (tw + 20);
      const y = 30 + row * (th + 30) + th / 2;
      sc.content.add(this.tile(s, x, y, tw, th, sc));
    });
    sc.setExtent(Math.ceil(items.length / cols) * (th + 30) + 60);
  }

  private tile(s: SkinItem, x: number, y: number, w: number, h: number, sc: Scroller): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const eq = isEquipped(s);
    g.fillStyle(UI.inkN, 0.9).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 26);
    g.fillStyle(eq ? 0x2c6e4a : 0x283a63, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 24);
    c.add(g);
    const pv = this.add.image(0, s.kind === 'table' || s.kind === 'emote' ? -h * 0.14 : -h * 0.1, this.preview(s));
    if (s.kind === 'table') pv.setDisplaySize(w - 30, (w - 30) * 0.62);
    else if (s.kind === 'emote') pv.setDisplaySize(w * 0.42, w * 0.42);
    else pv.setDisplaySize(w * 0.55, w * 0.55 * 1.4);
    c.add(pv);
    if (s.kind === 'emote' && s.id.startsWith('say_')) {
      pv.setVisible(false);
      c.add(txt(this, 0, -h * 0.14, t(s.id), 30, '#ffffff', { wordWrap: { width: w - 30 } }));
    }
    const name = txt(this, 0, h / 2 - 115, getLang() === 'en' ? s.en : s.ru, 28, '#ffffff');
    if (name.width > w - 20) name.setScale((w - 20) / name.width);
    c.add(name);
    const by = h / 2 - 50;
    const bw = w - 30;
    const u = s.unlock;
    let btn: Button;
    if (owns(s) && s.kind === 'emote') {
      btn = new Button(this, 0, by, { w: bw, h: 74, color: 'grey', label: '✓', size: 30 });
    } else if (owns(s)) {
      btn = new Button(this, 0, by, { w: bw, h: 74, color: eq ? 'grey' : 'blue', label: eq ? t('equipped') : t('equip'), size: 28 });
      if (!eq) btn.onClick(() => this.doEquip(s));
    } else if (u.t === 'coins') {
      btn = new Button(this, 0, by, { w: bw, h: 74, color: 'gold', label: String(u.price), icon: 'i_coin', iconSize: 48, size: 30 }).onClick(() => {
        if (!spendCoins(u.price)) return toast(this, t('notEnough'), '#ff8a8a');
        audio.play('buy');
        unlockSkin(s);
        this.doEquip(s);
      });
    } else if (u.t === 'ads') {
      const have = save.data.adProgress[skinKey(s)] ?? 0;
      btn = new Button(this, 0, by, { w: bw, h: 74, color: 'green', label: `${have}/${u.n}`, size: 30, ad: true }).onClick(() =>
        watchAd(this, `skin_${s.id}`, () => {
          if (adProgress(skinKey(s), u.n)) {
            unlockSkin(s);
            audio.play('unlock');
            this.doEquip(s);
          } else this.scene.restart(this.sceneData);
        }),
      );
    } else {
      const reason = u.t === 'boss' ? t('unlockBoss', { loc: getLang() === 'en' ? WORLDS[u.world].en : WORLDS[u.world].ru }) : '';
      btn = new Button(this, 0, by, { w: bw, h: 74, color: 'dark', label: '🔒', size: 26 }).onClick(() => toast(this, reason));
      const lt = txt(this, 0, by, reason, 20, '#cfd6e6', { wordWrap: { width: bw - 20 } });
      btn.label?.setVisible(false);
      btn.add(lt);
    }
    btn.hitGuard = (p) => sc.inView(p);
    c.add(btn);
    return c;
  }

  private doEquip(s: SkinItem): void {
    equip(s);
    skin.apply();
    audio.play('unlock');
    this.scene.restart(this.sceneData);
  }

  private buildBoosters(sc: Scroller): void {
    const W = this.W;
    const rw = Math.min(W - 60, 960);
    const rh = 200;
    BOOSTERS.forEach((b, i) => {
      const y = 30 + i * (rh + 24) + rh / 2;
      const c = this.add.container(W / 2, y);
      const g = this.add.graphics();
      g.fillStyle(UI.inkN, 0.9).fillRoundedRect(-rw / 2 - 4, -rh / 2 - 4, rw + 8, rh + 8, 26);
      g.fillStyle(0x283a63, 1).fillRoundedRect(-rw / 2, -rh / 2, rw, rh, 24);
      c.add(g);
      c.add(this.add.image(-rw / 2 + 100, 0, `i_${b.icon}`).setDisplaySize(130, 130));
      c.add(txt(this, -rw / 2 + 190, -40, t(`b_${b.id}`), 36, '#ffffff').setOrigin(0, 0.5));
      c.add(txt(this, -rw / 2 + 190, 20, t(`b_${b.id}_d`), 24, '#cfd6e6', { strokeThickness: 0, wordWrap: { width: rw - 560 } }).setOrigin(0, 0.5));
      c.add(txt(this, -rw / 2 + 190, 66, `×${save.data.boosters[b.id] ?? 0}`, 30, UI.gold).setOrigin(0, 0.5));
      const buy = new Button(this, rw / 2 - 250, 0, { w: 190, h: 100, color: 'gold', label: String(b.price), icon: 'i_coin', iconSize: 52, size: 30 }).onClick(() => {
        if (!spendCoins(b.price)) return toast(this, t('notEnough'), '#ff8a8a');
        addBooster(b.id, 1);
        audio.play('buy');
        this.scene.restart(this.sceneData);
      });
      const ad = new Button(this, rw / 2 - 90, 0, { w: 130, h: 100, color: 'green', label: '+1', size: 32, ad: true }).onClick(() =>
        watchAd(this, `shop_booster_${b.id}`, () => {
          addBooster(b.id, 1);
          audio.play('booster');
          this.scene.restart(this.sceneData);
        }),
      );
      buy.hitGuard = ad.hitGuard = (p) => sc.inView(p);
      c.add([buy, ad]);
      sc.content.add(c);
    });
    sc.setExtent(BOOSTERS.length * (rh + 24) + 60);
  }

  private buildCoins(sc: Scroller): void {
    const W = this.W;
    const rw = Math.min(W - 60, 960);
    const rh = 230;
    const now = Date.now();
    const left = FREE_COINS_CD - (now - save.data.lastCoinAd);
    const rows: { icon: string; title: string; desc: string; btn: () => Button }[] = [
      {
        icon: 'coins',
        title: t('freeCoins'),
        desc: t('freeCoins_d'),
        btn: () => {
          const ready = left <= 0;
          const b = new Button(this, 0, 0, { w: 260, h: 110, color: ready ? 'green' : 'grey', label: ready ? `+${FREE_COINS}` : t('cooldown', { t: formatTime(left) }), size: 32, ad: ready });
          b.onClick(() => {
            if (Date.now() - save.data.lastCoinAd < FREE_COINS_CD) return;
            void watchAd(this, 'shop_coins', () => {
              save.data.lastCoinAd = Date.now();
              addCoins(FREE_COINS);
              coinBurst(this, W / 2, this.H / 2, W - 260, 78);
              this.pill?.set(save.data.coins);
              this.time.delayedCall(700, () => this.scene.restart(this.sceneData));
            });
          });
          return b;
        },
      },
      { icon: 'wheel', title: t('wheel'), desc: t('spinFree'), btn: () => new Button(this, 0, 0, { w: 260, h: 110, color: 'blue', label: t('wheel'), size: 32 }).onClick(() => this.go('Wheel', { from: 'Shop' })) },
      { icon: 'gift', title: t('dailyBonus'), desc: t('dayN', { n: Math.max(1, save.data.daily.day) }), btn: () => new Button(this, 0, 0, { w: 260, h: 110, color: 'blue', label: t('bonus'), size: 32 }).onClick(() => this.go('DailyBonus', { from: 'Shop' })) },
      { icon: 'quests', title: t('questsTitle'), desc: t('questsBonus'), btn: () => new Button(this, 0, 0, { w: 260, h: 110, color: 'blue', label: t('quests'), size: 32 }).onClick(() => this.go('Quests', { from: 'Shop' })) },
    ];
    rows.forEach((r, i) => {
      const y = 30 + i * (rh + 24) + rh / 2;
      const c = this.add.container(W / 2, y);
      const g = this.add.graphics();
      g.fillStyle(UI.inkN, 0.9).fillRoundedRect(-rw / 2 - 4, -rh / 2 - 4, rw + 8, rh + 8, 26);
      g.fillStyle(0x283a63, 1).fillRoundedRect(-rw / 2, -rh / 2, rw, rh, 24);
      c.add(g);
      c.add(this.add.image(-rw / 2 + 110, 0, `i_${r.icon}`).setDisplaySize(150, 150));
      c.add(txt(this, -rw / 2 + 210, -30, r.title, 38, '#ffffff').setOrigin(0, 0.5));
      c.add(txt(this, -rw / 2 + 210, 30, r.desc, 26, '#cfd6e6', { strokeThickness: 0, wordWrap: { width: rw - 520 } }).setOrigin(0, 0.5));
      const b = r.btn();
      b.setPosition(rw / 2 - 160, 0);
      b.hitGuard = (p) => sc.inView(p);
      c.add(b);
      sc.content.add(c);
    });
    sc.setExtent(rows.length * (rh + 24) + 60);
  }
}
